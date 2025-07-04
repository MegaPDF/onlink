// ============= app/api/admin/billing/route.ts =============
import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { connectDB } from '@/lib/mongodb';
import { Subscription } from '@/models/Subscription';
import { User } from '@/models/User';
import { Team } from '@/models/Team';
import StripeService from '@/lib/stripe';

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
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '20');
    const plan = searchParams.get('plan') || '';
    const status = searchParams.get('status') || '';

    // Build filter
    const filter: any = {};
    if (plan) filter.plan = plan;
    if (status) filter.status = status;

    // Get subscriptions with user/team data
    const [subscriptions, totalSubscriptions] = await Promise.all([
      Subscription.find(filter)
        .populate('userId', 'name email')
        .populate('teamId', 'name slug')
        .sort({ createdAt: -1 })
        .skip((page - 1) * limit)
        .limit(limit),
      Subscription.countDocuments(filter)
    ]);

    // Calculate revenue statistics
    const revenueStats = await Subscription.aggregate([
      { $match: { status: 'active' } },
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
          totalActive: { $sum: 1 }
        }
      }
    ]);

    // Get subscription statistics by plan
    const planStats = await Subscription.aggregate([
      {
        $group: {
          _id: '$plan',
          count: { $sum: 1 },
          revenue: { $sum: '$amount' },
          activeCount: {
            $sum: { $cond: [{ $eq: ['$status', 'active'] }, 1, 0] }
          }
        }
      }
    ]);

    return NextResponse.json({
      success: true,
      data: {
        subscriptions,
        pagination: {
          page,
          limit,
          total: totalSubscriptions,
          totalPages: Math.ceil(totalSubscriptions / limit),
          hasNextPage: page < Math.ceil(totalSubscriptions / limit),
          hasPrevPage: page > 1
        },
        stats: {
          revenue: revenueStats[0] || { totalMRR: 0, totalARR: 0, totalActive: 0 },
          plans: planStats
        }
      }
    });

  } catch (error) {
    console.error('Admin billing GET error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}