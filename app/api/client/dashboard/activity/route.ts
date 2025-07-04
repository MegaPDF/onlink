
import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { connectDB } from '@/lib/mongodb';
import { User } from '@/models/User';
import { AuditLog } from '@/models/AuditLog';

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

    // Get recent activity from audit logs
    const recentActivity = await AuditLog.find({
      userId: user._id
    })
    .sort({ timestamp: -1 })
    .limit(10)
    .select('action resource details.metadata timestamp result.success');

    // Transform activity data for frontend
    const formattedActivity = recentActivity.map(log => ({
      _id: log._id,
      type: log.action,
      description: formatActivityDescription(log),
      timestamp: log.timestamp,
      success: log.result.success,
      metadata: log.details.metadata
    }));

    return NextResponse.json({
      success: true,
      data: formattedActivity
    });

  } catch (error) {
    console.error('Dashboard activity error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

function formatActivityDescription(log: any): string {
  const { action, resource, details } = log;
  
  switch (action) {
    case 'create_url':
      return `Created short link for ${details.metadata?.originalUrl || 'a URL'}`;
    case 'click_url':
      return `Short link ${details.metadata?.shortCode} was clicked`;
    case 'update_url':
      return `Updated short link ${details.metadata?.shortCode}`;
    case 'delete_url':
      return `Deleted short link ${details.metadata?.shortCode}`;
    case 'create_folder':
      return `Created folder "${details.metadata?.name}"`;
    case 'login':
      return 'Signed in to account';
    case 'update_profile':
      return 'Updated profile information';
    case 'upgrade_plan':
      return `Upgraded to ${details.metadata?.plan} plan`;
    default:
      return `Performed ${action} on ${resource}`;
  }
}