// ============= lib/data-sync-manager.ts =============
import mongoose from 'mongoose';
import { User } from '@/models/User';
import { URL } from '@/models/URL';
import { Folder } from '@/models/Folder';
import { Team } from '@/models/Team';
import { Domain } from '@/models/Domain';
import { Analytics } from '@/models/Analytics';
import { AuditLog } from '@/models/AuditLog';

export class DataSyncManager {
  
  /**
   * Sync user usage stats from URL and Analytics collections
   */
  static async syncUserUsage(userId: string | mongoose.Types.ObjectId) {
    try {
      const userObjectId = typeof userId === 'string' ? new mongoose.Types.ObjectId(userId) : userId;

      // Get URL statistics for user
      const urlStats = await URL.aggregate([
        { 
          $match: { 
            userId: userObjectId, 
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

      // Get analytics statistics (for more accurate click counting)
      const analyticsStats = await Analytics.aggregate([
        { 
          $lookup: {
            from: 'urls',
            localField: 'urlId',
            foreignField: '_id',
            as: 'url'
          }
        },
        { 
          $match: { 
            'url.userId': userObjectId,
            'bot.isBot': false
          } 
        },
        { 
          $group: { 
            _id: null, 
            totalClicks: { $sum: 1 },
            uniqueClicks: { $addToSet: '$hashedIp' }
          } 
        }
      ]);

      // Calculate monthly stats
      const currentMonth = new Date();
      currentMonth.setDate(1);
      currentMonth.setHours(0, 0, 0, 0);

      const monthlyStats = await URL.aggregate([
        { 
          $match: { 
            userId: userObjectId, 
            isDeleted: false,
            createdAt: { $gte: currentMonth }
          } 
        },
        { 
          $group: { 
            _id: null, 
            monthlyLinks: { $sum: 1 }
          } 
        }
      ]);

      const monthlyClicksStats = await Analytics.aggregate([
        { 
          $lookup: {
            from: 'urls',
            localField: 'urlId',
            foreignField: '_id',
            as: 'url'
          }
        },
        { 
          $match: { 
            'url.userId': userObjectId,
            'bot.isBot': false,
            timestamp: { $gte: currentMonth }
          } 
        },
        { 
          $group: { 
            _id: null, 
            monthlyClicks: { $sum: 1 }
          } 
        }
      ]);

      const stats = {
        linksCount: urlStats[0]?.totalLinks || 0,
        clicksCount: analyticsStats[0]?.totalClicks || urlStats[0]?.totalClicks || 0,
        monthlyLinks: monthlyStats[0]?.monthlyLinks || 0,
        monthlyClicks: monthlyClicksStats[0]?.monthlyClicks || 0,
        uniqueClicks: analyticsStats[0]?.uniqueClicks?.length || 0
      };

      // Update user document
      await User.findByIdAndUpdate(userObjectId, {
        'usage.linksCount': stats.linksCount,
        'usage.clicksCount': stats.clicksCount,
        'usage.monthlyLinks': stats.monthlyLinks,
        'usage.monthlyClicks': stats.monthlyClicks,
        'usage.lastUpdated': new Date()
      });

      return stats;
    } catch (error) {
      console.error('Error syncing user usage:', error);
      throw error;
    }
  }

  /**
   * Sync folder stats from URL collection
   */
  static async syncFolderStats(folderId: string | mongoose.Types.ObjectId) {
    try {
      const folderObjectId = typeof folderId === 'string' ? new mongoose.Types.ObjectId(folderId) : folderId;

      const stats = await URL.aggregate([
        { 
          $match: { 
            folderId: folderObjectId, 
            isDeleted: false 
          } 
        },
        { 
          $group: { 
            _id: null, 
            urlCount: { $sum: 1 },
            totalClicks: { $sum: '$clicks.total' }
          } 
        }
      ]);

      const folderStats = {
        urlCount: stats[0]?.urlCount || 0,
        totalClicks: stats[0]?.totalClicks || 0
      };

      await Folder.findByIdAndUpdate(folderObjectId, {
        'stats.urlCount': folderStats.urlCount,
        'stats.totalClicks': folderStats.totalClicks,
        'stats.lastUpdated': new Date()
      });

      return folderStats;
    } catch (error) {
      console.error('Error syncing folder stats:', error);
      throw error;
    }
  }

  /**
   * Sync team usage from member activities
   */
  static async syncTeamUsage(teamId: string | mongoose.Types.ObjectId) {
    try {
      const teamObjectId = typeof teamId === 'string' ? new mongoose.Types.ObjectId(teamId) : teamId;

      const [memberStats, urlStats] = await Promise.all([
        User.countDocuments({ 
          'team.teamId': teamObjectId, 
          isDeleted: false 
        }),
        URL.aggregate([
          { 
            $match: { 
              teamId: teamObjectId, 
              isDeleted: false 
            } 
          },
          { 
            $group: { 
              _id: null, 
              linksCount: { $sum: 1 },
              clicksCount: { $sum: '$clicks.total' }
            } 
          }
        ])
      ]);

      // Calculate storage used (rough estimate based on URL count and analytics data)
      const storageStats = await this.calculateTeamStorageUsage(teamObjectId);

      const teamStats = {
        membersCount: memberStats,
        linksCount: urlStats[0]?.linksCount || 0,
        clicksCount: urlStats[0]?.clicksCount || 0,
        storageUsed: storageStats
      };

      await Team.findByIdAndUpdate(teamObjectId, {
        'usage.membersCount': teamStats.membersCount,
        'usage.linksCount': teamStats.linksCount,
        'usage.clicksCount': teamStats.clicksCount,
        'usage.storageUsed': teamStats.storageUsed,
        'usage.lastUpdated': new Date()
      });

      return teamStats;
    } catch (error) {
      console.error('Error syncing team usage:', error);
      throw error;
    }
  }

  /**
   * Sync domain usage from URL collection
   */
  static async syncDomainUsage(domain: string) {
    try {
      const stats = await URL.aggregate([
        { 
          $match: { 
            domain: domain, 
            isDeleted: false 
          } 
        },
        { 
          $group: { 
            _id: null, 
            linksCount: { $sum: 1 },
            clicksCount: { $sum: '$clicks.total' }
          } 
        }
      ]);

      // Calculate bandwidth usage (rough estimate)
      const bandwidthStats = await this.calculateDomainBandwidth(domain);

      const domainStats = {
        linksCount: stats[0]?.linksCount || 0,
        clicksCount: stats[0]?.clicksCount || 0,
        bandwidthUsed: bandwidthStats
      };

      await Domain.findOneAndUpdate(
        { domain: domain },
        {
          'usage.linksCount': domainStats.linksCount,
          'usage.clicksCount': domainStats.clicksCount,
          'usage.bandwidthUsed': domainStats.bandwidthUsed,
          'usage.lastUpdated': new Date()
        }
      );

      return domainStats;
    } catch (error) {
      console.error('Error syncing domain usage:', error);
      throw error;
    }
  }

  /**
   * Update URL click statistics from Analytics data
   */
  static async updateURLClickStats(shortCode: string) {
    try {
      const now = new Date();
      const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      const thisWeek = new Date(today.getTime() - (7 * 24 * 60 * 60 * 1000));
      const thisMonth = new Date(now.getFullYear(), now.getMonth(), 1);

      const [totalStats, uniqueStats, todayStats, weekStats, monthStats] = await Promise.all([
        // Total clicks (excluding bots)
        Analytics.countDocuments({ 
          shortCode, 
          'bot.isBot': false 
        }),
        
        // Unique clicks (by hashed IP)
        Analytics.distinct('hashedIp', { 
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

      const clickStats = {
        total: totalStats,
        unique: uniqueStats,
        today: todayStats,
        thisWeek: weekStats,
        thisMonth: monthStats,
        lastUpdated: now
      };

      await URL.findOneAndUpdate(
        { shortCode },
        { 
          clicks: clickStats,
          lastClickAt: now
        }
      );

      return clickStats;
    } catch (error) {
      console.error('Error updating URL click stats:', error);
      throw error;
    }
  }

  /**
   * Update URL analytics cache from Analytics data
   */
  static async updateURLAnalyticsCache(shortCode: string) {
    try {
      const [topCountries, topReferrers, topDevices] = await Promise.all([
        // Top 5 countries
        Analytics.aggregate([
          { 
            $match: { 
              shortCode, 
              'bot.isBot': false, 
              countryCode: { $exists: true, $ne: null } 
            } 
          },
          { 
            $group: { 
              _id: '$countryCode', 
              count: { $sum: 1 } 
            } 
          },
          { $sort: { count: -1 } },
          { $limit: 5 },
          { 
            $project: { 
              country: '$_id', 
              count: 1, 
              _id: 0 
            } 
          }
        ]),
        
        // Top 5 referrers
        Analytics.aggregate([
          { 
            $match: { 
              shortCode, 
              'bot.isBot': false, 
              'referrer.domain': { $exists: true, $ne: null } 
            } 
          },
          { 
            $group: { 
              _id: '$referrer.domain', 
              count: { $sum: 1 } 
            } 
          },
          { $sort: { count: -1 } },
          { $limit: 5 },
          { 
            $project: { 
              referrer: '$_id', 
              count: 1, 
              _id: 0 
            } 
          }
        ]),
        
        // Top 5 devices
        Analytics.aggregate([
          { 
            $match: { 
              shortCode, 
              'bot.isBot': false 
            } 
          },
          { 
            $group: { 
              _id: '$device.type', 
              count: { $sum: 1 } 
            } 
          },
          { $sort: { count: -1 } },
          { $limit: 5 },
          { 
            $project: { 
              device: '$_id', 
              count: 1, 
              _id: 0 
            } 
          }
        ])
      ]);

      const analyticsCache = {
        topCountries,
        topReferrers, 
        topDevices,
        lastSyncAt: new Date()
      };

      await URL.findOneAndUpdate(
        { shortCode },
        { analyticsCache }
      );

      return analyticsCache;
    } catch (error) {
      console.error('Error updating URL analytics cache:', error);
      throw error;
    }
  }

  /**
   * Reset monthly usage counters (run this monthly via cron job)
   */
  static async resetMonthlyUsage() {
    try {
      const now = new Date();
      const firstOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

      // Reset user monthly counters
      const userUpdateResult = await User.updateMany(
        { 'usage.resetDate': { $lt: firstOfMonth } },
        { 
          'usage.monthlyLinks': 0,
          'usage.monthlyClicks': 0,
          'usage.resetDate': now
        }
      );

      console.log(`Reset monthly usage for ${userUpdateResult.modifiedCount} users`);

      return { 
        message: 'Monthly usage counters reset successfully',
        usersUpdated: userUpdateResult.modifiedCount
      };
    } catch (error) {
      console.error('Error resetting monthly usage:', error);
      throw error;
    }
  }

  /**
   * Comprehensive sync for a user (all related data)
   */
  static async syncUserData(userId: string | mongoose.Types.ObjectId) {
    try {
      const userObjectId = typeof userId === 'string' ? new mongoose.Types.ObjectId(userId) : userId;
      
      const user = await User.findById(userObjectId).populate('team.teamId');
      if (!user) throw new Error('User not found');

      // Sync user usage
      const userStats = await this.syncUserUsage(userObjectId);

      // Sync user's folders
      const userFolders = await Folder.find({ 
        userId: userObjectId, 
        isDeleted: false 
      });
      
      for (const folder of userFolders) {
        await this.syncFolderStats(folder._id);
      }

      // Sync team usage if user is part of a team
      if (user.team?.teamId) {
        await this.syncTeamUsage(user.team.teamId);
      }

      // Update user's URLs analytics cache
      const userUrls = await URL.find({ 
        userId: userObjectId, 
        isDeleted: false 
      }).select('shortCode');
      
      for (const url of userUrls) {
        await this.updateURLClickStats(url.shortCode);
        await this.updateURLAnalyticsCache(url.shortCode);
      }

      return {
        message: 'User data synced successfully',
        stats: userStats,
        foldersUpdated: userFolders.length,
        urlsUpdated: userUrls.length
      };
    } catch (error) {
      console.error('Error syncing user data:', error);
      throw error;
    }
  }

  /**
   * Sync all system data (use carefully - can be resource intensive)
   */
  static async syncAllData() {
    try {
      console.log('Starting full system data sync...');

      // Get all active users
     const users = await User.find({ 
  isDeleted: { $ne: true } // or isDeleted: false
});

      console.log(`Syncing data for ${users.length} users...`);

      // Sync users in batches to avoid overwhelming the database
      const batchSize = 10;
      for (let i = 0; i < users.length; i += batchSize) {
        const batch = users.slice(i, i + batchSize);
        
        await Promise.all(
          batch.map(user => this.syncUserUsage(user._id))
        );

        // Small delay between batches
        await new Promise(resolve => setTimeout(resolve, 100));
      }

      // Sync all teams
      const teams = await Team.find({ 
        isDeleted: false, 
        isActive: true 
      }).select('_id');

      console.log(`Syncing data for ${teams.length} teams...`);

      for (const team of teams) {
        await this.syncTeamUsage(team._id);
      }

      // Sync all domains
      const domains = await Domain.find({ 
        isDeleted: false, 
        isActive: true 
      }).select('domain');

      console.log(`Syncing data for ${domains.length} domains...`);

      for (const domain of domains) {
        await this.syncDomainUsage(domain.domain);
      }

      // Reset monthly counters if it's a new month
      await this.resetMonthlyUsage();

      console.log('Full system data sync completed successfully');

      return {
        message: 'Full system sync completed',
        usersSynced: users.length,
        teamsSynced: teams.length,
        domainsSynced: domains.length
      };
    } catch (error) {
      console.error('Error during full system sync:', error);
      throw error;
    }
  }

  /**
   * Clean up old analytics data (run this periodically)
   */
  static async cleanupOldAnalytics(retentionDays: number = 365) {
    try {
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - retentionDays);

      const deleteResult = await Analytics.deleteMany({
        timestamp: { $lt: cutoffDate },
        'processed.isProcessed': true
      });

      console.log(`Cleaned up ${deleteResult.deletedCount} old analytics records`);

      return {
        message: 'Analytics cleanup completed',
        recordsDeleted: deleteResult.deletedCount
      };
    } catch (error) {
      console.error('Error cleaning up analytics:', error);
      throw error;
    }
  }

  /**
   * Calculate team storage usage (rough estimate)
   */
  private static async calculateTeamStorageUsage(teamId: mongoose.Types.ObjectId): Promise<number> {
    try {
      // Estimate based on URL count, analytics records, and other data
      const [urlCount, analyticsCount] = await Promise.all([
        URL.countDocuments({ teamId, isDeleted: false }),
        Analytics.aggregate([
          {
            $lookup: {
              from: 'urls',
              localField: 'urlId',
              foreignField: '_id',
              as: 'url'
            }
          },
          {
            $match: { 'url.teamId': teamId }
          },
          {
            $count: 'total'
          }
        ])
      ]);

      // Rough estimate: 1KB per URL + 0.5KB per analytics record
      const estimatedStorage = (urlCount * 1024) + (analyticsCount[0]?.total || 0) * 512;
      
      return estimatedStorage;
    } catch (error) {
      console.error('Error calculating team storage:', error);
      return 0;
    }
  }

  /**
   * Calculate domain bandwidth usage (rough estimate)
   */
  private static async calculateDomainBandwidth(domain: string): Promise<number> {
    try {
      // Get click count for the domain in the last 30 days
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

      const clickCount = await Analytics.aggregate([
        {
          $lookup: {
            from: 'urls',
            localField: 'urlId',
            foreignField: '_id',
            as: 'url'
          }
        },
        {
          $match: {
            'url.domain': domain,
            timestamp: { $gte: thirtyDaysAgo }
          }
        },
        {
          $count: 'total'
        }
      ]);

      // Rough estimate: 2KB per redirect
      const estimatedBandwidth = (clickCount[0]?.total || 0) * 2048;
      
      return estimatedBandwidth;
    } catch (error) {
      console.error('Error calculating domain bandwidth:', error);
      return 0;
    }
  }

  /**
   * Get sync status for monitoring
   */
  static async getSyncStatus() {
    try {
      const [usersSynced, teamsSynced, urlsNeedingSync] = await Promise.all([
        User.countDocuments({
          'usage.lastUpdated': {
            $gte: new Date(Date.now() - 24 * 60 * 60 * 1000) // Last 24 hours
          }
        }),
        Team.countDocuments({
          'usage.lastUpdated': {
            $gte: new Date(Date.now() - 24 * 60 * 60 * 1000)
          }
        }),
        URL.countDocuments({
          'clicks.lastUpdated': {
            $lt: new Date(Date.now() - 60 * 60 * 1000) // More than 1 hour old
          },
          isDeleted: false
        })
      ]);

      return {
        usersSyncedRecently: usersSynced,
        teamsSyncedRecently: teamsSynced,
        urlsNeedingSync,
        lastCheck: new Date()
      };
    } catch (error) {
      console.error('Error getting sync status:', error);
      throw error;
    }
  }
}

// Export for use in other modules
export default DataSyncManager;