import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { connectDB } from '@/lib/mongodb';
import { URL as URLModel } from '@/models/URL';
import { User } from '@/models/User';
import { Analytics } from '@/models/Analytics';

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

    // Use Next.js 15 pattern for searchParams
    const reportType = req.nextUrl.searchParams.get('type') || 'overview';
    const startDate = req.nextUrl.searchParams.get('startDate');
    const endDate = req.nextUrl.searchParams.get('endDate');

    // Date filter
    const dateFilter: any = {};
    if (startDate && endDate) {
      dateFilter.$gte = new Date(startDate);
      dateFilter.$lte = new Date(endDate);
    } else {
      // Default to last 30 days
      dateFilter.$gte = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    }

    switch (reportType) {
      case 'overview':
        // Comprehensive overview report
        const [urlReport, userReport, clickReport] = await Promise.all([
          URLModel.aggregate([
            { $match: { createdAt: dateFilter, isDeleted: false } },
            {
              $group: {
                _id: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } },
                count: { $sum: 1 },
                clicks: { $sum: '$clicks.total' }
              }
            },
            { $sort: { _id: 1 } }
          ]),

          User.aggregate([
            { $match: { createdAt: dateFilter, isDeleted: false } },
            {
              $group: {
                _id: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } },
                count: { $sum: 1 }
              }
            },
            { $sort: { _id: 1 } }
          ]),

          Analytics.aggregate([
            { $match: { timestamp: dateFilter } },
            {
              $group: {
                _id: { $dateToString: { format: '%Y-%m-%d', date: '$timestamp' } },
                clicks: { $sum: 1 },
                uniqueVisitors: { $addToSet: '$ip' }
              }
            },
            {
              $project: {
                _id: 1,
                clicks: 1,
                uniqueVisitors: { $size: '$uniqueVisitors' }
              }
            },
            { $sort: { _id: 1 } }
          ])
        ]);

        return NextResponse.json({
          success: true,
          data: {
            urlCreation: urlReport,
            userRegistration: userReport,
            clickActivity: clickReport,
            reportPeriod: {
              startDate: dateFilter.$gte,
              endDate: dateFilter.$lte || new Date()
            }
          }
        });

      case 'users':
        // Detailed user report
        const userDetailReport = await User.aggregate([
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
            userRegistrations: userDetailReport,
            reportPeriod: {
              startDate: dateFilter.$gte,
              endDate: dateFilter.$lte || new Date()
            }
          }
        });

      case 'clicks':
        // Detailed click report
        const clickDetailReport = await Analytics.aggregate([
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
            clickAnalytics: clickDetailReport,
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
