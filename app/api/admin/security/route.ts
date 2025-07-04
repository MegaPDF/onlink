// ============= app/api/admin/security/route.ts =============
import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { connectDB } from '@/lib/mongodb';
import { AuditLog } from '@/models/AuditLog';
import { User } from '@/models/User';

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
    const limit = parseInt(searchParams.get('limit') || '50');
    const riskLevel = searchParams.get('riskLevel') || '';
    const action = searchParams.get('action') || '';
    const userId = searchParams.get('userId') || '';
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');

    // Build filter
    const filter: any = {};
    
    if (riskLevel) filter['risk.level'] = riskLevel;
    if (action) filter.action = action;
    if (userId) filter.userId = userId;
    
    if (startDate && endDate) {
      filter.timestamp = {
        $gte: new Date(startDate),
        $lte: new Date(endDate)
      };
    }

    // Get audit logs
    const [auditLogs, totalLogs] = await Promise.all([
      AuditLog.find(filter)
        .populate('userId', 'name email')
        .sort({ timestamp: -1 })
        .skip((page - 1) * limit)
        .limit(limit),
      AuditLog.countDocuments(filter)
    ]);

    // Get security statistics
    const [riskStats, actionStats, failedLogins] = await Promise.all([
      // Risk level distribution
      AuditLog.aggregate([
        {
          $match: {
            timestamp: { $gte: new Date(Date.now() - 24 * 60 * 60 * 1000) }
          }
        },
        {
          $group: {
            _id: '$risk.level',
            count: { $sum: 1 }
          }
        }
      ]),
      
      // Top actions
      AuditLog.aggregate([
        {
          $match: {
            timestamp: { $gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) }
          }
        },
        {
          $group: {
            _id: '$action',
            count: { $sum: 1 }
          }
        },
        { $sort: { count: -1 } },
        { $limit: 10 }
      ]),
      
      // Failed login attempts
      AuditLog.countDocuments({
        action: 'login_failed',
        timestamp: { $gte: new Date(Date.now() - 24 * 60 * 60 * 1000) }
      })
    ]);

    // Recent suspicious activities
    const suspiciousActivities = await AuditLog.find({
      'risk.level': { $in: ['high', 'critical'] },
      timestamp: { $gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) }
    })
    .populate('userId', 'name email')
    .sort({ timestamp: -1 })
    .limit(10);

    return NextResponse.json({
      success: true,
      data: {
        auditLogs,
        pagination: {
          page,
          limit,
          total: totalLogs,
          totalPages: Math.ceil(totalLogs / limit),
          hasNextPage: page < Math.ceil(totalLogs / limit),
          hasPrevPage: page > 1
        },
        stats: {
          riskLevels: riskStats,
          topActions: actionStats,
          failedLoginsToday: failedLogins,
          suspiciousActivities
        }
      }
    });

  } catch (error) {
    console.error('Admin security GET error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}