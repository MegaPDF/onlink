// ============= app/api/admin/reports/route.ts =============
import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { connectDB } from '@/lib/mongodb';
import { User } from '@/models/User';
import { URL } from '@/models/URL';
import { Analytics } from '@/models/Analytics';
import { Subscription } from '@/models/Subscription';

export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    await connectDB();

    const currentUser = await User.findById(session.user.id);
    if (currentUser?.role !== 'admin') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const { searchParams } = new URL(req.url);
    const reportType = searchParams.get('type') || 'overview';
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');

    const dateFilter = startDate && endDate ? {
      $gte: new Date(startDate),
      $lte: new Date(endDate)
    } : {
      $gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) // Last 30 days
    };

    switch (reportType) {
      case 'overview':
        // System overview report
        const [userStats, urlStats, clickStats, revenueStats] = await Promise.all([
          // User statistics
          User.aggregate([
            {
              $group: {
                _id: null,
                totalUsers: { $sum: 1 },
                activeUsers: { $sum: { $cond: ['$isActive', 1, 0] } },
                newUsers: {
                  $sum: {
                    $cond: [
                      { $gte: ['$createdAt', dateFilter.$gte] },
                      1,
                      0
                    ]
                  }
                },
                usersByPlan: {
                  $push: {
                    plan: '$plan',
                    count: 1
                  }
                }
              }
            }
          ]),
          
          // URL statistics
          URL.aggregate([
            {
              $group: {
                _id: null,
                totalUrls: { $sum: 1 },
                activeUrls: { $sum: { $cond: ['$isActive', 1, 0] } },
                newUrls: {
                  $sum: {
                    $cond: [
                      { $gte: ['$createdAt', dateFilter.$gte] },
                      1,
                      0
                    ]
                  }
                }
              }
            }
          ]),
          
          // Click statistics
          Analytics.aggregate([
            {
              $match: {
                timestamp: dateFilter,
                'bot.isBot': false
              }
            },
            {
              $group: {
                _id: null,
                totalClicks: { $sum: 1 },
                uniqueClicks: { $addToSet: '$hashedIp' },
                clicksByDay: {
                  $push: {
                    date: { $dateToString: { format: '%Y-%m-%d', date: '$timestamp' } },
                    count: 1
                  }
                }
              }
            }
          ]),
          
          // Revenue statistics
          Subscription.aggregate([
            {
              $match: { status: 'active' }
            },
            {
              $group: {
                _id: null,
                totalMRR: {
                  $sum: {
                    $cond: [
                      { $eq: ['$interval', 'month'] },
                      '$amount',
                      { $divide: ['$amount', 12] }
                    ]
                  }
                },
                totalARR: {
                  $sum: {
                    $cond: [
                      { $eq: ['$interval', 'year'] },
                      '$amount',
                      { $multiply: ['$amount', 12] }
                    ]
                  }
                },
                subscriptionsByPlan: {
                  $push: {
                    plan: '$plan',
                    amount: '$amount'
                  }
                }
              }
            }
          ])
        ]);

        return NextResponse.json({
          success: true,
          data: {
            users: userStats[0] || {},
            urls: urlStats[0] || {},
            clicks: clickStats[0] || {},
            revenue: revenueStats[0] || {},
            reportPeriod: {
              startDate: dateFilter.$gte,
              endDate: dateFilter.$lte || new Date()
            }
          }
        });

      case 'users':
        // Detailed user report
        const userReport = await User.aggregate([
          {
            $match: {
              createdAt: dateFilter,
              isDeleted: false
            }
          },
          {
            $group: {
              _id: {
                date: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } },
                plan: '$plan'
              },
              count: { $sum: 1 }
            }
          },
          { $sort: { '_id.date': 1 } }
        ]);

        return NextResponse.json({
          success: true,
          data: {
            userRegistrations: userReport,
            reportPeriod: {
              startDate: dateFilter.$gte,
              endDate: dateFilter.$lte || new Date()
            }
          }
        });

      case 'clicks':
        // Detailed click report
        const clickReport = await Analytics.aggregate([
          {
            $match: {
              timestamp: dateFilter,
              'bot.isBot': false
            }
          },
          {
            $group: {
              _id: {
                date: { $dateToString: { format: '%Y-%m-%d', date: '$timestamp' } },
                country: '$countryCode',
                device: '$device.type'
              },
              count: { $sum: 1 }
            }
          },
          { $sort: { '_id.date': 1 } }
        ]);

        return NextResponse.json({
          success: true,
          data: {
            clickAnalytics: clickReport,
            reportPeriod: {
              startDate: dateFilter.$gte,
              endDate: dateFilter.$lte || new Date()
            }
          }
        });

      default:
        return NextResponse.json({ error: 'Invalid report type' }, { status: 400 });
    }

  } catch (error) {
    console.error('Admin reports GET error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
