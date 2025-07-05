// ============= lib/analytics.ts (COMPLETE TRACKING SYSTEM) =============
import { Analytics } from '@/models/Analytics';
import { URL as URLModel } from '@/models/URL';
import { ensureDate } from './utils';
import * as crypto from 'crypto';

export class AnalyticsTracker {
  static async getAnalytics(shortCode: string, dateRange?: { start: Date | string; end: Date | string }) {
    const matchQuery: any = { shortCode, 'bot.isBot': false };
    
    if (dateRange) {
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
      Analytics.distinct('visitor.hashedIp', matchQuery).then(ips => ips.length),
      
      Analytics.aggregate([
        { $match: matchQuery },
        { $group: { _id: '$location.countryCode', count: { $sum: 1 } } },
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

  /**
   * Complete click tracking with uniqueness detection
   */
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
      console.log('📊 Starting click tracking for shortCode:', data.shortCode);

      // Find the URL
      const url = await URLModel.findOne({ shortCode: data.shortCode, isDeleted: false });
      if (!url) {
        console.error('❌ URL not found for shortCode:', data.shortCode);
        throw new Error('URL not found');
      }

      // Create unique identifiers
      const hashedIp = crypto.createHash('sha256').update(data.ip || '127.0.0.1').digest('hex');
      const deviceFingerprint = this.generateDeviceFingerprint(data.userAgent, data.ip);
      const sessionId = this.generateSessionId(hashedIp, data.userAgent);

      // Check if this is a unique click
      const uniquenessCheck = await this.checkClickUniqueness({
        shortCode: data.shortCode,
        hashedIp,
        deviceFingerprint,
        sessionId,
        userAgent: data.userAgent
      });

      console.log('🔍 Uniqueness check result:', uniquenessCheck);

      // Skip recording if this is likely a reload
      if (!uniquenessCheck.shouldRecord) {
        console.log('⏭️ Skipping click recording:', uniquenessCheck.reason);
        return null;
      }

      // Parse device and referrer information
      const deviceInfo = this.parseUserAgent(data.userAgent);
      const referrerInfo = this.parseReferrer(data.referrer);
      const botInfo = this.detectBot(data.userAgent);

      // Create analytics record
      const analytics = new Analytics({
        urlId: url._id,
        shortCode: data.shortCode,
        timestamp: new Date(),
        
        visitor: {
          ip: data.ip || '127.0.0.1',
          hashedIp,
          userAgent: data.userAgent || 'Unknown',
          acceptLanguage: undefined,
          sessionId
        },
        
        location: {
          country: data.country || undefined,
          countryCode: data.country ? data.country.substring(0, 2).toUpperCase() : undefined,
          region: undefined,
          city: data.city || undefined,
          latitude: undefined,
          longitude: undefined,
          timezone: undefined
        },
        
        device: {
          type: deviceInfo.deviceType,
          os: deviceInfo.os,
          osVersion: deviceInfo.osVersion,
          browser: deviceInfo.browser,
          browserVersion: deviceInfo.browserVersion,
          viewport: undefined
        },
        
        referrer: {
          url: data.referrer || undefined,
          domain: referrerInfo.domain || undefined,
          type: referrerInfo.type,
          utm: referrerInfo.utm
        },
        
        bot: {
          isBot: botInfo.isBot,
          botName: botInfo.botName,
          botType: botInfo.botType
        }
      });

      // Save analytics record
      await analytics.save();
      console.log('✅ Analytics record saved');

      // Update URL statistics based on uniqueness
      await this.updateURLStatistics(url._id, uniquenessCheck, botInfo.isBot);

      // Update user usage statistics
      if (!botInfo.isBot && uniquenessCheck.shouldRecord) {
        await this.updateUserUsageStatistics(url.userId);
      }

      console.log('✅ Click tracking completed successfully');
      return analytics;

    } catch (error) {
      console.error('❌ Error in click tracking:', error);
      return null;
    }
  }

  /**
   * Check if this click should be counted (prevents reload spam)
   */
  private static async checkClickUniqueness(params: {
    shortCode: string;
    hashedIp: string;
    deviceFingerprint: string;
    sessionId: string;
    userAgent: string;
  }): Promise<{
    shouldRecord: boolean;
    isUniqueVisitor: boolean;
    isNewSession: boolean;
    isUniqueToday: boolean;
    lastClickTime?: Date;
    clickCount: number;
    reason: string;
  }> {
    const now = new Date();
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const reloadTimeoutMs = 60 * 1000; // 1 minute to prevent reload spam
    const sessionTimeoutMs = 30 * 60 * 1000; // 30 minutes for session

    // Check for any previous clicks from this visitor
    const previousClicks = await Analytics.find({
      shortCode: params.shortCode,
      'visitor.hashedIp': params.hashedIp,
      'bot.isBot': false
    }).sort({ timestamp: -1 }).limit(10);

    // Check for very recent clicks (within 1 minute) - likely reloads
    const veryRecentClick = previousClicks.find(click => 
      (now.getTime() - click.timestamp.getTime()) < reloadTimeoutMs
    );

    if (veryRecentClick) {
      return {
        shouldRecord: false,
        isUniqueVisitor: false,
        isNewSession: false,
        isUniqueToday: false,
        lastClickTime: veryRecentClick.timestamp,
        clickCount: previousClicks.length,
        reason: `Reload detected - last click was ${Math.round((now.getTime() - veryRecentClick.timestamp.getTime()) / 1000)} seconds ago`
      };
    }

    // Determine uniqueness for legitimate clicks
    const isUniqueVisitor = previousClicks.length === 0;
    
    // Check for recent session (within 30 minutes)
    const recentSessionClick = previousClicks.find(click => 
      (now.getTime() - click.timestamp.getTime()) < sessionTimeoutMs
    );
    const isNewSession = !recentSessionClick;

    // Check if unique today
    const todayClicks = previousClicks.filter(click => 
      click.timestamp >= todayStart
    );
    const isUniqueToday = todayClicks.length === 0;

    return {
      shouldRecord: true,
      isUniqueVisitor,
      isNewSession,
      isUniqueToday,
      lastClickTime: previousClicks[0]?.timestamp,
      clickCount: previousClicks.length,
      reason: isUniqueVisitor ? 'New unique visitor' : 
              isNewSession ? 'New session' : 
              isUniqueToday ? 'First visit today' : 'Return visitor'
    };
  }

  /**
   * Update URL statistics based on actual analytics data (not increments)
   */
  private static async updateURLStatistics(
    urlId: string, 
    uniquenessCheck: any, 
    isBot: boolean
  ) {
    if (isBot) {
      console.log('🤖 Bot detected, skipping statistics update');
      return;
    }

    try {
      // Get the shortCode for this URL
      const url = await URLModel.findById(urlId);
      if (!url) {
        console.error('URL not found for statistics update');
        return;
      }

      const shortCode = url.shortCode;
      console.log('📊 Updating statistics for shortCode:', shortCode);

      // Calculate actual counts from analytics data
      const now = new Date();
      const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      const thisWeek = new Date(today.getTime() - (7 * 24 * 60 * 60 * 1000));
      const thisMonth = new Date(now.getFullYear(), now.getMonth(), 1);

      const [totalClicks, uniqueClicks, todayClicks, weekClicks, monthClicks] = await Promise.all([
        // Total clicks (excluding bots)
        Analytics.countDocuments({ 
          shortCode, 
          'bot.isBot': false 
        }),
        
        // Unique clicks (by unique hashed IP)
        Analytics.distinct('visitor.hashedIp', { 
          shortCode, 
          'bot.isBot': false 
        }).then(ips => ips.length),
        
        // Today's clicks
        Analytics.countDocuments({ 
          shortCode, 
          'bot.isBot': false,
          timestamp: { $gte: today }
        }),
        
        // This week's clicks  
        Analytics.countDocuments({ 
          shortCode, 
          'bot.isBot': false,
          timestamp: { $gte: thisWeek }
        }),
        
        // This month's clicks
        Analytics.countDocuments({ 
          shortCode, 
          'bot.isBot': false,
          timestamp: { $gte: thisMonth }
        })
      ]);

      // Update URL with actual calculated values
      const updateData = {
        'clicks.total': totalClicks,
        'clicks.unique': uniqueClicks,
        'clicks.today': todayClicks,
        'clicks.thisWeek': weekClicks,
        'clicks.thisMonth': monthClicks,
        'clicks.lastUpdated': now,
        lastClickAt: now
      };

      await URLModel.findByIdAndUpdate(urlId, updateData);
      
      console.log('📈 URL statistics updated:', {
        total: totalClicks,
        unique: uniqueClicks,
        today: todayClicks,
        week: weekClicks,
        month: monthClicks
      });

    } catch (error) {
      console.error('❌ Error updating URL statistics:', error);
    }
  }

  /**
   * Update user usage statistics from their URLs' analytics
   */
  private static async updateUserUsageStatistics(userId: string) {
    try {
      console.log('👤 Updating user usage statistics for:', userId);

      const now = new Date();
      const thisMonth = new Date(now.getFullYear(), now.getMonth(), 1);

      // Import User and Analytics models
      const { User } = await import('@/models/User');

      // Calculate user's total statistics from all their URLs
      const userStats = await URLModel.aggregate([
        { 
          $match: { 
            userId: new (await import('mongoose')).Types.ObjectId(userId),
            isDeleted: false 
          } 
        },
        {
          $group: {
            _id: null,
            totalLinks: { $sum: 1 },
            totalClicks: { $sum: '$clicks.total' }
          }
        }
      ]);

      // Calculate monthly clicks from analytics
      const monthlyClicksStats = await Analytics.aggregate([
        {
          $lookup: {
            from: 'urls',
            localField: 'shortCode',
            foreignField: 'shortCode',
            as: 'url'
          }
        },
        {
          $match: {
            'url.userId': new (await import('mongoose')).Types.ObjectId(userId),
            'bot.isBot': false,
            timestamp: { $gte: thisMonth }
          }
        },
        {
          $group: {
            _id: null,
            monthlyClicks: { $sum: 1 }
          }
        }
      ]);

      const stats = userStats[0] || { totalLinks: 0, totalClicks: 0 };
      const monthlyStats = monthlyClicksStats[0] || { monthlyClicks: 0 };

      // Update user document
      await User.findByIdAndUpdate(userId, {
        'usage.linksCount': stats.totalLinks,
        'usage.clicksCount': stats.totalClicks,
        'usage.monthlyClicks': monthlyStats.monthlyClicks,
        'usage.lastUpdated': now
      });

      console.log('✅ User usage updated:', {
        userId,
        totalLinks: stats.totalLinks,
        totalClicks: stats.totalClicks,
        monthlyClicks: monthlyStats.monthlyClicks
      });

    } catch (error) {
      console.error('❌ Error updating user usage statistics:', error);
    }
  }

  /**
   * Generate device fingerprint for better uniqueness detection
   */
  private static generateDeviceFingerprint(userAgent: string, ip: string): string {
    const data = `${userAgent}-${ip}`;
    return crypto.createHash('md5').update(data).digest('hex');
  }

  /**
   * Generate session ID
   */
  private static generateSessionId(hashedIp: string, userAgent: string): string {
    const timestamp = Math.floor(Date.now() / (30 * 60 * 1000)); // 30-minute sessions
    const data = `${hashedIp}-${userAgent}-${timestamp}`;
    return crypto.createHash('md5').update(data).digest('hex');
  }

  /**
   * Enhanced user agent parsing
   */
  static parseUserAgent(userAgent: string) {
    const ua = userAgent.toLowerCase();
    
    // Device type detection
    let deviceType: 'desktop' | 'mobile' | 'tablet' | 'bot' = 'desktop';
    if (/mobile|iphone|ipod|android.*mobile|windows phone|blackberry|opera mini|opera mobi/.test(ua)) {
      deviceType = 'mobile';
    } else if (/ipad|android(?!.*mobile)|tablet|kindle|silk/.test(ua)) {
      deviceType = 'tablet';
    } else if (/bot|crawler|spider|crawling/i.test(ua)) {
      deviceType = 'bot';
    }

    // Browser detection with version
    let browser = 'Unknown';
    let browserVersion = '';
    
    if (ua.includes('chrome')) {
      browser = 'Chrome';
      const match = ua.match(/chrome\/([\d.]+)/);
      browserVersion = match ? match[1] : '';
    } else if (ua.includes('firefox')) {
      browser = 'Firefox';
      const match = ua.match(/firefox\/([\d.]+)/);
      browserVersion = match ? match[1] : '';
    } else if (ua.includes('safari') && !ua.includes('chrome')) {
      browser = 'Safari';
      const match = ua.match(/version\/([\d.]+)/);
      browserVersion = match ? match[1] : '';
    } else if (ua.includes('edge')) {
      browser = 'Edge';
      const match = ua.match(/edge\/([\d.]+)/);
      browserVersion = match ? match[1] : '';
    } else if (ua.includes('opera')) {
      browser = 'Opera';
      const match = ua.match(/opera\/([\d.]+)/);
      browserVersion = match ? match[1] : '';
    }

    // OS detection with version
    let os = 'Unknown';
    let osVersion = '';
    
    if (ua.includes('windows')) {
      os = 'Windows';
      if (ua.includes('windows nt 10')) osVersion = '10';
      else if (ua.includes('windows nt 6.3')) osVersion = '8.1';
      else if (ua.includes('windows nt 6.2')) osVersion = '8';
      else if (ua.includes('windows nt 6.1')) osVersion = '7';
    } else if (ua.includes('mac')) {
      os = 'macOS';
      const match = ua.match(/mac os x ([\d_.]+)/);
      osVersion = match ? match[1].replace(/_/g, '.') : '';
    } else if (ua.includes('linux')) {
      os = 'Linux';
    } else if (ua.includes('android')) {
      os = 'Android';
      const match = ua.match(/android ([\d.]+)/);
      osVersion = match ? match[1] : '';
    } else if (ua.includes('ios')) {
      os = 'iOS';
      const match = ua.match(/os ([\d_]+)/);
      osVersion = match ? match[1].replace(/_/g, '.') : '';
    }

    return {
      deviceType,
      browser,
      browserVersion,
      os,
      osVersion,
      raw: userAgent
    };
  }

  /**
   * Parse referrer information
   */
  private static parseReferrer(referrer?: string) {
    if (!referrer) {
      return {
        domain: undefined,
        type: 'direct' as const,
        utm: undefined
      };
    }

    try {
      const url = new URL(referrer);
      const domain = url.hostname;
      
      // Extract UTM parameters
      const utm = {
        source: url.searchParams.get('utm_source') || undefined,
        medium: url.searchParams.get('utm_medium') || undefined,
        campaign: url.searchParams.get('utm_campaign') || undefined,
        term: url.searchParams.get('utm_term') || undefined,
        content: url.searchParams.get('utm_content') || undefined
      };

      // Determine referrer type
      let type: 'direct' | 'search' | 'social' | 'email' | 'ads' | 'referral' | 'unknown' = 'referral';
      
      if (domain.includes('google') || domain.includes('bing') || domain.includes('yahoo') || domain.includes('duckduckgo')) {
        type = 'search';
      } else if (domain.includes('facebook') || domain.includes('twitter') || domain.includes('instagram') || 
                 domain.includes('linkedin') || domain.includes('youtube') || domain.includes('tiktok')) {
        type = 'social';
      } else if (utm.medium === 'email' || domain.includes('mail')) {
        type = 'email';
      } else if (utm.medium === 'cpc' || utm.medium === 'ppc' || utm.source?.includes('ads')) {
        type = 'ads';
      }

      return { domain, type, utm };
    } catch {
      return {
        domain: undefined,
        type: 'unknown' as const,
        utm: undefined
      };
    }
  }

  /**
   * Bot detection
   */
  private static detectBot(userAgent: string) {
    const ua = userAgent.toLowerCase();
    
    const botPatterns = [
      { pattern: /googlebot/i, name: 'Googlebot', type: 'search' },
      { pattern: /bingbot/i, name: 'Bingbot', type: 'search' },
      { pattern: /slurp/i, name: 'Yahoo Slurp', type: 'search' },
      { pattern: /facebookexternalhit/i, name: 'Facebook Bot', type: 'social' },
      { pattern: /twitterbot/i, name: 'Twitterbot', type: 'social' },
      { pattern: /linkedinbot/i, name: 'LinkedInBot', type: 'social' },
      { pattern: /bot|crawler|spider|crawling/i, name: 'Generic Bot', type: 'unknown' }
    ];

    for (const bot of botPatterns) {
      if (bot.pattern.test(ua)) {
        return {
          isBot: true,
          botName: bot.name,
          botType: bot.type as any
        };
      }
    }

    return {
      isBot: false,
      botName: undefined,
      botType: undefined
    };
  }

  /**
   * Reset daily counters (run this daily via cron job)
   */
  static async resetDailyCounters() {
    await URLModel.updateMany(
      {},
      { $set: { 'clicks.today': 0 } }
    );
  }

  /**
   * Reset weekly counters (run this weekly via cron job)
   */
  static async resetWeeklyCounters() {
    await URLModel.updateMany(
      {},
      { $set: { 'clicks.thisWeek': 0 } }
    );
  }

  /**
   * Reset monthly counters (run this monthly via cron job)
   */
  static async resetMonthlyCounters() {
    await URLModel.updateMany(
      {},
      { $set: { 'clicks.thisMonth': 0 } }
    );
  }

  /**
   * Sync URL statistics with actual analytics data (fix discrepancies)
   */
  static async syncURLStatistics(shortCode?: string) {
    try {
      console.log('🔄 Syncing URL statistics with analytics data...');
      
      const query = shortCode ? { shortCode, isDeleted: false } : { isDeleted: false };
      const urls = await URLModel.find(query).select('_id shortCode');
      
      console.log(`📊 Found ${urls.length} URLs to sync`);
      
      for (const url of urls) {
        const now = new Date();
        const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        const thisWeek = new Date(today.getTime() - (7 * 24 * 60 * 60 * 1000));
        const thisMonth = new Date(now.getFullYear(), now.getMonth(), 1);

        const [totalClicks, uniqueClicks, todayClicks, weekClicks, monthClicks] = await Promise.all([
          Analytics.countDocuments({ 
            shortCode: url.shortCode, 
            'bot.isBot': false 
          }),
          
          Analytics.distinct('visitor.hashedIp', { 
            shortCode: url.shortCode, 
            'bot.isBot': false 
          }).then(ips => ips.length),
          
          Analytics.countDocuments({ 
            shortCode: url.shortCode, 
            'bot.isBot': false,
            timestamp: { $gte: today }
          }),
          
          Analytics.countDocuments({ 
            shortCode: url.shortCode, 
            'bot.isBot': false,
            timestamp: { $gte: thisWeek }
          }),
          
          Analytics.countDocuments({ 
            shortCode: url.shortCode, 
            'bot.isBot': false,
            timestamp: { $gte: thisMonth }
          })
        ]);

        await URLModel.findByIdAndUpdate(url._id, {
          'clicks.total': totalClicks,
          'clicks.unique': uniqueClicks,
          'clicks.today': todayClicks,
          'clicks.thisWeek': weekClicks,
          'clicks.thisMonth': monthClicks,
          'clicks.lastUpdated': now
        });

        console.log(`✅ Synced ${url.shortCode}: ${totalClicks} total, ${uniqueClicks} unique`);
      }
      
      console.log('✅ URL statistics sync completed');
    } catch (error) {
      console.error('❌ Error syncing URL statistics:', error);
      throw error;
    }
  }

  /**
   * Sync user usage statistics from their URLs and analytics
   */
  static async syncUserUsageStatistics(userId?: string) {
    try {
      console.log('🔄 Syncing user usage statistics...');
      
      const { User } = await import('@/models/User');
      
      const query = userId ? { _id: userId, isDeleted: false } : { isDeleted: false };
      const users = await User.find(query).select('_id name email');
      
      console.log(`👥 Found ${users.length} users to sync`);
      
      for (const user of users) {
        await this.updateUserUsageStatistics(user._id.toString());
      }
      
      console.log('✅ User usage statistics sync completed');
    } catch (error) {
      console.error('❌ Error syncing user usage statistics:', error);
      throw error;
    }
  }
}