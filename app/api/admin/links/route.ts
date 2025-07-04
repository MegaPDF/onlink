// ============= app/api/admin/links/route.ts =============
import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { connectDB } from '@/lib/mongodb';
import { URL } from '@/models/URL';
import { User } from '@/models/User';
import { Analytics } from '@/models/Analytics';
import { AuditLog } from '@/models/AuditLog';

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
    const search = searchParams.get('search') || '';
    const userId = searchParams.get('userId') || '';
    const domain = searchParams.get('domain') || '';
    const status = searchParams.get('status') || '';
    const sortBy = searchParams.get('sortBy') || 'createdAt';
    const sortOrder = searchParams.get('sortOrder') || 'desc';

    // Build filter
    const filter: any = { isDeleted: false };
    
    if (search) {
      filter.$or = [
        { originalUrl: { $regex: search, $options: 'i' } },
        { shortCode: { $regex: search, $options: 'i' } },
        { title: { $regex: search, $options: 'i' } }
      ];
    }
    
    if (userId) filter.userId = userId;
    if (domain) filter.domain = domain;
    if (status === 'active') filter.isActive = true;
    if (status === 'inactive') filter.isActive = false;
    if (status === 'expired') filter.expiresAt = { $lt: new Date() };

    // Execute queries
    const [urls, totalUrls] = await Promise.all([
      URL.find(filter)
        .populate('userId', 'name email')
        .populate('folderId', 'name')
        .sort({ [sortBy]: sortOrder === 'desc' ? -1 : 1 })
        .skip((page - 1) * limit)
        .limit(limit),
      URL.countDocuments(filter)
    ]);

    // Get URL statistics
    const stats = await URL.aggregate([
      { $match: { isDeleted: false } },
      {
        $group: {
          _id: null,
          totalUrls: { $sum: 1 },
          activeUrls: { $sum: { $cond: ['$isActive', 1, 0] } },
          totalClicks: { $sum: '$clicks.total' },
          urlsToday: {
            $sum: {
              $cond: [
                { $gte: ['$createdAt', new Date(new Date().setHours(0, 0, 0, 0))] },
                1,
                0
              ]
            }
          }
        }
      }
    ]);

    return NextResponse.json({
      success: true,
      data: {
        urls,
        pagination: {
          page,
          limit,
          total: totalUrls,
          totalPages: Math.ceil(totalUrls / limit),
          hasNextPage: page < Math.ceil(totalUrls / limit),
          hasPrevPage: page > 1
        },
        stats: stats[0] || {
          totalUrls: 0,
          activeUrls: 0,
          totalClicks: 0,
          urlsToday: 0
        }
      }
    });

  } catch (error) {
    console.error('Admin links GET error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// Delete URL (admin action)
export async function DELETE(req: NextRequest) {
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
    const urlId = searchParams.get('urlId');

    if (!urlId) {
      return NextResponse.json({ error: 'URL ID is required' }, { status: 400 });
    }

    const urlToDelete = await URL.findById(urlId);
    if (!urlToDelete) {
      return NextResponse.json({ error: 'URL not found' }, { status: 404 });
    }

    // Soft delete URL
    await URL.findByIdAndUpdate(urlId, {
      isDeleted: true,
      deletedAt: new Date(),
      isActive: false
    });

    // Update user's link count
    await User.findByIdAndUpdate(urlToDelete.userId, {
      $inc: { 'usage.linksCount': -1 },
      'usage.lastUpdated': new Date()
    });

    // Log deletion
    const auditLog = new AuditLog({
      userId: session.user.id,
      userEmail: currentUser.email,
      userName: currentUser.name,
      action: 'delete_url',
      resource: 'url',
      resourceId: urlId,
      details: {
        method: 'DELETE',
        metadata: {
          originalUrl: urlToDelete.originalUrl,
          shortCode: urlToDelete.shortCode
        }
      },
      context: {
        ip: req.headers.get('x-forwarded-for') || '127.0.0.1',
        userAgent: req.headers.get('user-agent') || ''
      },
      result: {
        success: true,
        statusCode: 200
      },
      risk: {
        level: 'medium',
        factors: ['admin_action', 'data_deletion'],
        score: 50
      }
    });

    await auditLog.save();

    return NextResponse.json({
      success: true,
      message: 'URL deleted successfully'
    });

  } catch (error) {
    console.error('Admin URL delete error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
