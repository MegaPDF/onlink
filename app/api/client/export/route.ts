// ============= app/api/client/export/route.ts =============
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

    const format = req.nextUrl.searchParams.get('format') || 'csv';
    const type = req.nextUrl.searchParams.get('type') || 'urls';
    const startDateRaw = req.nextUrl.searchParams.get('startDate');
    const endDateRaw = req.nextUrl.searchParams.get('endDate');
    const startDate = startDateRaw === null ? undefined : startDateRaw;
    const endDate = endDateRaw === null ? undefined : endDateRaw;

    if (format === 'csv') {
      if (type === 'urls') {
        return await exportUrlsCSV(user._id, startDate, endDate);
      } else if (type === 'analytics') {
        return await exportAnalyticsCSV(user._id, startDate, endDate);
      }
    }

    return NextResponse.json({ error: 'Invalid export format or type' }, { status: 400 });

  } catch (error) {
    console.error('Export error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

async function exportUrlsCSV(userId: string, startDate?: string, endDate?: string) {
  const filter: any = { userId, isDeleted: false };
  
  if (startDate && endDate) {
    filter.createdAt = {
      $gte: new Date(startDate),
      $lte: new Date(endDate)
    };
  }

  const urls = await URL.find(filter)
    .populate('folderId', 'name')
    .sort({ createdAt: -1 })
    .lean();

  // Create CSV content
  const csvHeaders = [
    'Original URL',
    'Short URL', 
    'Short Code',
    'Title',
    'Description',
    'Tags',
    'Folder',
    'Total Clicks',
    'Unique Clicks',
    'Active',
    'Created At',
    'Expires At'
  ];

  const csvRows = urls.map(url => [
    `"${url.originalUrl}"`,
    `"${process.env.NEXT_PUBLIC_BASE_URL}/${url.shortCode}"`,
    url.shortCode,
    `"${url.title || ''}"`,
    `"${url.description || ''}"`,
    `"${url.tags.join(', ')}"`,
    `"${(url.folderId as any)?.name || 'Uncategorized'}"`,
    url.clicks.total,
    url.clicks.unique,
    url.isActive ? 'Yes' : 'No',
    url.createdAt.toISOString(),
    url.expiresAt ? url.expiresAt.toISOString() : ''
  ]);

  const csvContent = [
    csvHeaders.join(','),
    ...csvRows.map(row => row.join(','))
  ].join('\n');

  return new NextResponse(csvContent, {
    headers: {
      'Content-Type': 'text/csv',
      'Content-Disposition': `attachment; filename="urls-export-${Date.now()}.csv"`
    }
  });
}

async function exportAnalyticsCSV(userId: string, startDate?: string, endDate?: string) {
  const dateFilter: any = {};
  
  if (startDate && endDate) {
    dateFilter.timestamp = {
      $gte: new Date(startDate),
      $lte: new Date(endDate)
    };
  }

  // Get user's URLs
  const userUrls = await URL.find({ userId, isDeleted: false }).select('_id shortCode originalUrl title');
  const urlIds = userUrls.map(url => url._id);

  if (urlIds.length === 0) {
    const csvContent = 'No data available for export\n';
    return new NextResponse(csvContent, {
      headers: {
        'Content-Type': 'text/csv',
        'Content-Disposition': `attachment; filename="analytics-export-${Date.now()}.csv"`
      }
    });
  }

  // Get analytics data
  const analytics = await Analytics.find({
    urlId: { $in: urlIds },
    'bot.isBot': false,
    ...dateFilter
  })
  .populate('urlId', 'shortCode originalUrl title')
  .sort({ timestamp: -1 })
  .limit(10000) // Limit to prevent memory issues
  .lean();

  // Create CSV content
  const csvHeaders = [
    'URL Title',
    'Short Code',
    'Original URL',
    'Timestamp',
    'Country',
    'City',
    'Device Type',
    'Browser',
    'OS',
    'Referrer Domain',
    'Referrer Source'
  ];

  const csvRows = analytics.map(record => [
    `"${(record.urlId as any)?.title || ''}"`,
    (record.urlId as any)?.shortCode || '',
    `"${(record.urlId as any)?.originalUrl || ''}"`,
    record.timestamp.toISOString(),
    record.country || '',
    record.city || '',
    record.device.type,
    record.device.browser,
    record.device.os,
    record.referrer.domain || 'Direct',
    record.referrer.source
  ]);

  const csvContent = [
    csvHeaders.join(','),
    ...csvRows.map(row => row.join(','))
  ].join('\n');

  return new NextResponse(csvContent, {
    headers: {
      'Content-Type': 'text/csv',
      'Content-Disposition': `attachment; filename="analytics-export-${Date.now()}.csv"`
    }
  });
}
