// ============= app/api/client/dashboard/stats/route.ts =============
import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { connectDB } from '@/lib/mongodb';
import { User } from '@/models/User';
import { URL } from '@/models/URL';
import { Analytics } from '@/models/Analytics';

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

    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

    // Get comprehensive dashboard stats
    const [urlStats, clickStats, monthlyStats] = await Promise.all([
      // URL statistics
      URL.aggregate([
        { $match: { userId: user._id, isDeleted: false } },
        {
          $group: {
            _id: null,
            totalUrls: { $sum: 1 },
            activeUrls: { $sum: { $cond: ['$isActive', 1, 0] } },
            totalClicks: { $sum: '$clicks.total' },
            averageClicksPerUrl: { $avg: '$clicks.total' }
          }
        }
      ]),

      // Click statistics from Analytics
      Analytics.aggregate([
        { 
          $lookup: {
            from: 'urls',
            localField: 'shortCode',
            foreignField: 'shortCode',
            as: 'url'
          }
        },
        { $unwind: '$url' },
        { $match: { 'url.userId': user._id, 'url.isDeleted': false } },
        {
          $group: {
            _id: null,
            totalClicks: { $sum: 1 },
            uniqueClicks: { $addToSet: '$hashedIp' }
          }
        },
        {
          $project: {
            totalClicks: 1,
            uniqueClicks: { $size: '$uniqueClicks' }
          }
        }
      ]),

      // Monthly statistics
      Promise.all([
        URL.countDocuments({
          userId: user._id,
          isDeleted: false,
          createdAt: { $gte: startOfMonth }
        }),
        Analytics.aggregate([
          { 
            $lookup: {
              from: 'urls',
              localField: 'shortCode',
              foreignField: 'shortCode',
              as: 'url'
            }
          },
          { $unwind: '$url' },
          { 
            $match: { 
              'url.userId': user._id, 
              'url.isDeleted': false,
              timestamp: { $gte: startOfMonth }
            } 
          },
          {
            $group: {
              _id: null,
              count: { $sum: 1 }
            }
          }
        ])
      ])
    ]);

    const stats = {
      totalUrls: urlStats[0]?.totalUrls || 0,
      activeUrls: urlStats[0]?.activeUrls || 0,
      totalClicks: clickStats[0]?.totalClicks || urlStats[0]?.totalClicks || 0,
      uniqueClicks: clickStats[0]?.uniqueClicks || 0,
      averageClicksPerUrl: Math.round(urlStats[0]?.averageClicksPerUrl || 0),
      urlsThisMonth: monthlyStats[0] || 0,
      clicksThisMonth: monthlyStats[1][0]?.count || 0
    };

    return NextResponse.json({
      success: true,
      data: stats
    });

  } catch (error) {
    console.error('Dashboard stats error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

