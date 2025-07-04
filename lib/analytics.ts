import { Analytics } from '@/models/Analytics';
import { URL as URLModel } from '@/models/URL';
import { ensureDate } from './utils';

export class AnalyticsTracker {
  static async getAnalytics(shortCode: string, dateRange?: { start: Date | string; end: Date | string }) {
    const matchQuery: any = { shortCode, 'bot.isBot': false };
    
    if (dateRange) {
      // Ensure dates are properly converted
      const startDate = ensureDate(dateRange.start);
      const endDate = ensureDate(dateRange.end);
      
      matchQuery.timestamp = {
        $gte: startDate,
        $lte: endDate
      };
    }
    
    const [
      totalClicks,
      uniqueClicks,
      countryStats,
      deviceStats,
      browserStats,
      referrerStats,
      dailyStats
    ] = await Promise.all([
      Analytics.countDocuments(matchQuery),
      Analytics.distinct('hashedIp', matchQuery).then(ips => ips.length),
      
      Analytics.aggregate([
        { $match: matchQuery },
        { $group: { _id: '$countryCode', count: { $sum: 1 } } },
        { $sort: { count: -1 } },
        { $limit: 10 }
      ]),
      
      Analytics.aggregate([
        { $match: matchQuery },
        { $group: { _id: '$device.type', count: { $sum: 1 } } },
        { $sort: { count: -1 } }
      ]),
      
      Analytics.aggregate([
        { $match: matchQuery },
        { $group: { _id: '$device.browser', count: { $sum: 1 } } },
        { $sort: { count: -1 } },
        { $limit: 10 }
      ]),
      
      Analytics.aggregate([
        { $match: matchQuery },
        { $group: { _id: '$referrer.domain', count: { $sum: 1 } } },
        { $sort: { count: -1 } },
        { $limit: 10 }
      ]),
      
      Analytics.aggregate([
        { $match: matchQuery },
        {
          $group: {
            _id: {
              $dateToString: { format: '%Y-%m-%d', date: '$timestamp' }
            },
            count: { $sum: 1 }
          }
        },
        { $sort: { _id: 1 } }
      ])
    ]);
    
    return {
      totalClicks,
      uniqueClicks,
      geography: countryStats.map((item: any) => ({
        country: item._id,
        count: item.count
      })),
      devices: deviceStats.map((item: any) => ({
        type: item._id,
        count: item.count
      })),
      browsers: browserStats.map((item: any) => ({
        browser: item._id,
        count: item.count
      })),
      referrers: referrerStats.map((item: any) => ({
        domain: item._id || 'Direct',
        count: item.count
      })),
      dailyStats: dailyStats.map((item: any) => ({
        date: item._id,
        clicks: item.count
      }))
    };
  }

  static async recordClick(data: {
    shortCode: string;
    ip: string;
    userAgent: string;
    referrer?: string;
    country?: string;
    city?: string;
    device?: any;
  }) {
    try {
      // Find the URL
      const url = await URLModel.findOne({ shortCode: data.shortCode, isDeleted: false });
      if (!url) {
        throw new Error('URL not found');
      }

      // Create analytics record with proper date
      const analytics = new Analytics({
        urlId: url._id,
        shortCode: data.shortCode,
        timestamp: new Date(), // Always use current date
        ip: data.ip,
        hashedIp: require('crypto').createHash('sha256').update(data.ip).digest('hex'),
        userAgent: data.userAgent,
        referrer: {
          url: data.referrer || '',
          domain: data.referrer ? new URL(data.referrer).hostname : '',
          source: data.referrer ? 'external' : 'direct'
        },
        country: data.country || 'Unknown',
        city: data.city || 'Unknown',
        device: data.device || {
          type: 'unknown',
          browser: 'unknown',
          os: 'unknown'
        },
        bot: {
          isBot: false // You might want to add bot detection logic here
        }
      });

      await analytics.save();

      // Update URL click count
      await URLModel.findByIdAndUpdate(url._id, {
        $inc: { 'clicks.total': 1 },
        'clicks.lastUpdated': new Date()
      });

      return analytics;
    } catch (error) {
      console.error('Error recording click:', error);
      throw error;
    }
  }
}