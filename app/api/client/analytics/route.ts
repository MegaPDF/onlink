import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { connectDB } from '@/lib/mongodb';
import { User } from '@/models/User';
import { URL as URLModel } from '@/models/URL'; // Rename the import
import { AnalyticsTracker } from '@/lib/analytics';
import { UsageMonitor } from '@/lib/usage-monitor';

export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    await connectDB();

    const user = await User.findById(session.user.id);
    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    // Check analytics access
    const canAccess = await UsageMonitor.canAccessAnalytics(user._id);
    if (!canAccess) {
      return NextResponse.json({ 
        error: 'Analytics feature requires premium plan',
        upgradeRequired: true 
      }, { status: 403 });
    }

    // Use Next.js 15 pattern for searchParams
    const shortCode = req.nextUrl.searchParams.get('shortCode');
    const startDate = req.nextUrl.searchParams.get('startDate');
    const endDate = req.nextUrl.searchParams.get('endDate');

    let dateRange;
    if (startDate && endDate) {
      dateRange = {
        start: new Date(startDate),
        end: new Date(endDate)
      };
    }

    if (shortCode) {
      // Get analytics for specific URL
      const url = await URLModel.findOne({ // Use renamed import
        shortCode,
        userId: user._id,
        isDeleted: false
      });

      if (!url) {
        return NextResponse.json({ error: 'URL not found' }, { status: 404 });
      }

      const analytics = await AnalyticsTracker.getAnalytics(shortCode, dateRange);

      return NextResponse.json({
        success: true,
        data: {
          url: {
            id: url._id,
            originalUrl: url.originalUrl,
            shortCode: url.shortCode,
            title: url.title,
            createdAt: url.createdAt
          },
          analytics
        }
      });
    } else {
      // Get analytics for all user URLs
      const userUrls = await URLModel.find({ // Use renamed import
        userId: user._id,
        isDeleted: false
      }).select('shortCode originalUrl title clicks createdAt');

      // Get aggregated analytics
      const totalStats = await URLModel.aggregate([ // Use renamed import
        { $match: { userId: user._id, isDeleted: false } },
        {
          $group: {
            _id: null,
            totalClicks: { $sum: '$clicks.total' },
            totalUrls: { $sum: 1 },
            averageClicks: { $avg: '$clicks.total' }
          }
        }
      ]);

      // Get top performing URLs
      const topUrls = await URLModel.find({ // Use renamed import
        userId: user._id,
        isDeleted: false
      })
      .sort({ 'clicks.total': -1 })
      .limit(10)
      .select('shortCode originalUrl title clicks');

      return NextResponse.json({
        success: true,
        data: {
          summary: totalStats[0] || { totalClicks: 0, totalUrls: 0, averageClicks: 0 },
          topUrls,
          recentUrls: userUrls.slice(0, 5)
        }
      });
    }

  } catch (error) {
    console.error('Analytics GET error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}