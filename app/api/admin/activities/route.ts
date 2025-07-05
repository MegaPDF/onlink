import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { connectDB } from '@/lib/mongodb';
import { AuditLog } from '@/models/AuditLog';
import { User } from '@/models/User';
import { authOptions } from '@/lib/auth';

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

    const { searchParams } = req.nextUrl;
    const limit = parseInt(searchParams.get('limit') || '5');

    // Get recent activities from audit logs
    const activities = await AuditLog.find({})
      .sort({ timestamp: -1 })
      .limit(limit)
      .lean();

    return NextResponse.json({
      success: true,
      data: activities
    });

  } catch (error) {
    console.error('Admin activities error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}