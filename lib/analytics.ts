// ============= lib/analytics.ts =============
import geoip from 'geoip-lite';
import { Analytics } from '@/models/Analytics';
import { URL as URLModel } from '@/models/URL';
import { nanoid } from 'nanoid';
import { hashData, parseUserAgent } from './utils';

export class AnalyticsTracker {
  
  static async trackClick(
    shortCode: string,
    request: Request,
    additionalData: {
      isQRClick?: boolean;
      qrSource?: 'image' | 'pdf' | 'print';
    } = {}
  ) {
    try {
      // Extract request data
      const ip = this.getClientIP(request);
      const userAgent = request.headers.get('user-agent') || '';
      const referrer = request.headers.get('referer') || '';
      const doNotTrack = request.headers.get('dnt') === '1';
      
      // Get URL document
      const urlDoc = await URLModel.findOne({ shortCode, isDeleted: false });
      if (!urlDoc) {
        throw new Error('URL not found');
      }
      
      // Parse user agent
      const deviceInfo = parseUserAgent(userAgent);
      
      // Get geographic data
      const geoData = geoip.lookup(ip);
      
      // Parse referrer
      const referrerData = this.parseReferrer(referrer);
      
      // Create analytics record
      const analyticsData = new Analytics({
        urlId: urlDoc._id,
        shortCode,
        clickId: nanoid(16),
        timestamp: new Date(),
        
        ip,
        hashedIp: hashData(ip),
        userAgent,
        fingerprint: hashData(ip + userAgent),
        
        country: geoData?.country || undefined,
        countryCode: geoData?.country?.toLowerCase() || undefined,
        region: geoData?.region || undefined,
        city: geoData?.city || undefined,
        latitude: geoData?.ll?.[0] || undefined,
        longitude: geoData?.ll?.[1] || undefined,
        timezone: geoData?.timezone || undefined,
        
        device: {
          type: deviceInfo.deviceType as any,
          os: deviceInfo.os,
          browser: deviceInfo.browser
        },
        
        referrer: referrerData,
        
        technical: {
          protocol: 'https',
          method: 'GET',
          statusCode: 302,
          responseTime: 0,
          redirectCount: 1
        },
        
        qrCode: {
          isQRClick: additionalData.isQRClick || false,
          qrSource: additionalData.qrSource
        },
        
        bot: {
          isBot: deviceInfo.isBot,
          botName: deviceInfo.isBot ? this.detectBotName(userAgent) : undefined
        },
        
        privacy: {
          doNotTrack
        },
        
        processed: {
          isProcessed: false
        }
      });
      
      await analyticsData.save();
      
      // Update URL click statistics in background
      setImmediate(() => {
        this.updateURLClickStats(shortCode);
      });
      
      return analyticsData;
    } catch (error) {
      console.error('Analytics tracking error:', error);
      throw error;
    }
  }
  
  private static getClientIP(request: Request): string {
    const forwardedFor = request.headers.get('x-forwarded-for');
    const realIP = request.headers.get('x-real-ip');
    const cfConnectingIP = request.headers.get('cf-connecting-ip');
    
    if (cfConnectingIP) return cfConnectingIP;
    if (realIP) return realIP;
    if (forwardedFor) {
      return forwardedFor.split(',')[0].trim();
    }
    
    return '127.0.0.1';
  }
  
  private static parseReferrer(referrer: string) {
    if (!referrer) {
      return {
        source: 'direct' as const,
        domain: undefined
      };
    }
    
    try {
      const url = new URL(referrer);
      const domain = url.hostname;
      
      // Detect source type
      let source: 'direct' | 'social' | 'search' | 'email' | 'ads' | 'referral' = 'referral';
      
      if (this.isSocialMedia(domain)) source = 'social';
      else if (this.isSearchEngine(domain)) source = 'search';
      else if (this.isEmailProvider(domain)) source = 'email';
      
      return {
        url: referrer,
        domain,
        source
      };
    } catch {
      return {
        source: 'direct' as const,
        domain: undefined
      };
    }
  }
  
  private static isSocialMedia(domain: string): boolean {
    const socialDomains = [
      'facebook.com', 'twitter.com', 'instagram.com', 'linkedin.com',
      'youtube.com', 'tiktok.com', 'pinterest.com', 'reddit.com',
      'snapchat.com', 'telegram.org', 'whatsapp.com'
    ];
    return socialDomains.some(social => domain.includes(social));
  }
  
  private static isSearchEngine(domain: string): boolean {
    const searchEngines = [
      'google.com', 'bing.com', 'yahoo.com', 'duckduckgo.com',
      'baidu.com', 'yandex.com', 'ask.com'
    ];
    return searchEngines.some(search => domain.includes(search));
  }
  
  private static isEmailProvider(domain: string): boolean {
    const emailProviders = [
      'gmail.com', 'outlook.com', 'yahoo.com', 'hotmail.com',
      'icloud.com', 'aol.com'
    ];
    return emailProviders.some(email => domain.includes(email));
  }
  
  private static detectBotName(userAgent: string): string | undefined {
    const botPatterns = [
      { pattern: /googlebot/i, name: 'Googlebot' },
      { pattern: /bingbot/i, name: 'Bingbot' },
      { pattern: /slurp/i, name: 'Yahoo Slurp' },
      { pattern: /duckduckbot/i, name: 'DuckDuckBot' },
      { pattern: /baiduspider/i, name: 'Baidu Spider' },
      { pattern: /yandexbot/i, name: 'YandexBot' },
      { pattern: /facebookexternalhit/i, name: 'Facebook Bot' },
      { pattern: /twitterbot/i, name: 'TwitterBot' },
      { pattern: /linkedinbot/i, name: 'LinkedInBot' }
    ];
    
    for (const bot of botPatterns) {
      if (bot.pattern.test(userAgent)) {
        return bot.name;
      }
    }
    
    return undefined;
  }
  
  private static async updateURLClickStats(shortCode: string) {
    try {
      const now = new Date();
      const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      const thisWeek = new Date(today.getTime() - (7 * 24 * 60 * 60 * 1000));
      const thisMonth = new Date(now.getFullYear(), now.getMonth(), 1);

      const [totalStats, uniqueStats, todayStats, weekStats, monthStats] = await Promise.all([
        Analytics.countDocuments({ shortCode, 'bot.isBot': false }),
        Analytics.distinct('hashedIp', { shortCode, 'bot.isBot': false }).then(ips => ips.length),
        Analytics.countDocuments({ 
          shortCode, 
          'bot.isBot': false,
          timestamp: { $gte: today }
        }),
        Analytics.countDocuments({ 
          shortCode, 
          'bot.isBot': false,
          timestamp: { $gte: thisWeek }
        }),
        Analytics.countDocuments({ 
          shortCode, 
          'bot.isBot': false,
          timestamp: { $gte: thisMonth }
        })
      ]);

      await URLModel.findOneAndUpdate(
        { shortCode },
        { 
          'clicks.total': totalStats,
          'clicks.unique': uniqueStats,
          'clicks.today': todayStats,
          'clicks.thisWeek': weekStats,
          'clicks.thisMonth': monthStats,
          'clicks.lastUpdated': now,
          lastClickAt: now
        }
      );
    } catch (error) {
      console.error('Error updating URL click stats:', error);
    }
  }
  
  static async getAnalytics(shortCode: string, dateRange?: { start: Date; end: Date }) {
    const matchQuery: any = { shortCode, 'bot.isBot': false };
    
    if (dateRange) {
      matchQuery.timestamp = {
        $gte: dateRange.start,
        $lte: dateRange.end
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
}