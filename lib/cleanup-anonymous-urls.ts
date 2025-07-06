import { connectDB } from '@/lib/mongodb';
import { URL } from '@/models/URL';
import { Analytics } from '@/models/Analytics';

export class AnonymousURLCleanup {
  /**
   * Clean up expired anonymous URLs and their analytics
   */
  static async cleanupExpiredAnonymousUrls(): Promise<{
    deletedUrls: number;
    deletedAnalytics: number;
  }> {
    try {
      await connectDB();

      const now = new Date();

      // Find expired anonymous URLs
      const expiredUrls = await URL.find({
        isAnonymous: true,
        $or: [
          { expiresAt: { $lt: now } },
          { 
            // Also clean up anonymous URLs older than 90 days without expiration
            createdAt: { $lt: new Date(Date.now() - 90 * 24 * 60 * 60 * 1000) },
            expiresAt: { $exists: false }
          }
        ],
        isDeleted: false
      }).select('_id shortCode');

      if (expiredUrls.length === 0) {
        return { deletedUrls: 0, deletedAnalytics: 0 };
      }

      const urlIds = expiredUrls.map(url => url._id);
      const shortCodes = expiredUrls.map(url => url.shortCode);

      // Soft delete the URLs
      const urlDeleteResult = await URL.updateMany(
        { _id: { $in: urlIds } },
        { 
          $set: { 
            isDeleted: true, 
            deletedAt: now,
            isActive: false
          } 
        }
      );

      // Delete associated analytics
      const analyticsDeleteResult = await Analytics.deleteMany({
        shortCode: { $in: shortCodes }
      });

      console.log(`🧹 Cleaned up ${urlDeleteResult.modifiedCount} expired anonymous URLs`);
      console.log(`📊 Deleted ${analyticsDeleteResult.deletedCount} analytics records`);

      return {
        deletedUrls: urlDeleteResult.modifiedCount,
        deletedAnalytics: analyticsDeleteResult.deletedCount
      };

    } catch (error) {
      console.error('Error cleaning up anonymous URLs:', error);
      throw error;
    }
  }

  /**
   * Get statistics about anonymous URLs
   */
  static async getAnonymousUrlStats() {
    try {
      await connectDB();

      const stats = await URL.aggregate([
        {
          $match: { isAnonymous: true }
        },
        {
          $group: {
            _id: null,
            total: { $sum: 1 },
            active: {
              $sum: {
                $cond: [
                  { 
                    $and: [
                      { $eq: ['$isActive', true] },
                      { $eq: ['$isDeleted', false] },
                      {
                        $or: [
                          { $eq: ['$expiresAt', null] },
                          { $gt: ['$expiresAt', new Date()] }
                        ]
                      }
                    ]
                  },
                  1,
                  0
                ]
              }
            },
            expired: {
              $sum: {
                $cond: [
                  {
                    $and: [
                      { $ne: ['$expiresAt', null] },
                      { $lt: ['$expiresAt', new Date()] }
                    ]
                  },
                  1,
                  0
                ]
              }
            },
            deleted: {
              $sum: {
                $cond: ['$isDeleted', 1, 0]
              }
            },
            totalClicks: { $sum: '$clicks.total' }
          }
        }
      ]);

      return stats[0] || {
        total: 0,
        active: 0,
        expired: 0,
        deleted: 0,
        totalClicks: 0
      };

    } catch (error) {
      console.error('Error getting anonymous URL stats:', error);
      throw error;
    }
  }
}