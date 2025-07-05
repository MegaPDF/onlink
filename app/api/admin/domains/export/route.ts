import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { connectDB } from '@/lib/mongodb';
import { Domain } from '@/models/Domain';
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

    // Fetch all domains (not deleted)
    const domains = await Domain.find({ isDeleted: { $ne: true } })
      .populate('userId', 'name email')
      .lean();

    // Generate CSV content
    const csvHeader = [
      'Domain',
      'Type',
      'Status',
      'Verified',
      'Owner',
      'Owner Email',
      'Links Count',
      'Clicks Count',
      'SSL Status',
      'SSL Expires',
      'Created At',
      'Last Used'
    ].join(',');

    const csvRows = domains.map(domain => [
      domain.domain,
      domain.type,
      domain.isActive ? 'Active' : 'Inactive',
      domain.isVerified ? 'Yes' : 'No',
      domain.userId?.name || 'System',
      domain.userId?.email || 'system@domain.local',
      domain.usage?.linksCount || 0,
      domain.usage?.clicksCount || 0,
      domain.ssl?.status || 'No SSL',
      domain.ssl?.validTo ? new Date(domain.ssl.validTo).toISOString().split('T')[0] : 'N/A',
      new Date(domain.createdAt).toISOString().split('T')[0],
      domain.lastUsedAt ? new Date(domain.lastUsedAt).toISOString().split('T')[0] : 'Never'
    ].join(','));

    const csvContent = [csvHeader, ...csvRows].join('\n');

    return new Response(csvContent, {
      status: 200,
      headers: {
        'Content-Type': 'text/csv',
        'Content-Disposition': `attachment; filename="domains-export-${new Date().toISOString().split('T')[0]}.csv"`
      }
    });

  } catch (error) {
    console.error('Domain export error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}