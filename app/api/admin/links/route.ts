import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { connectDB } from '@/lib/mongodb';
import { URL as URLModel } from '@/models/URL';
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

    // Use Next.js 15 pattern for searchParams
    const page = parseInt(req.nextUrl.searchParams.get('page') || '1');
    const limit = parseInt(req.nextUrl.searchParams.get('limit') || '20');
    const search = req.nextUrl.searchParams.get('search') || '';
    const userId = req.nextUrl.searchParams.get('userId') || '';
    const domain = req.nextUrl.searchParams.get('domain') || '';
    const status = req.nextUrl.searchParams.get('status') || '';
    const sortBy = req.nextUrl.searchParams.get('sortBy') || 'createdAt';
    const sortOrder = req.nextUrl.searchParams.get('sortOrder') || 'desc';

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
      URLModel.find(filter)
        .populate('userId', 'name email')
        .populate('folderId', 'name')
        .sort({ [sortBy]: sortOrder === 'desc' ? -1 : 1 })
        .skip((page - 1) * limit)
        .limit(limit),
      URLModel.countDocuments(filter)
    ]);

    // Get link statistics
    const stats = await URLModel.aggregate([
      { $match: { isDeleted: false } },
      {
        $group: {
          _id: null,
          totalLinks: { $sum: 1 },
          activeLinks: { $sum: { $cond: ['$isActive', 1, 0] } },
          totalClicks: { $sum: '$clicks.count' },
          expiredLinks: {
            $sum: {
              $cond: [
                { $and: [{ $ne: ['$expiresAt', null] }, { $lt: ['$expiresAt', new Date()] }] },
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
          totalLinks: 0,
          activeLinks: 0,
          totalClicks: 0,
          expiredLinks: 0
        }
      }
    });

  } catch (error) {
    console.error('Admin links GET error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// Update link (admin action)
export async function PUT(req: NextRequest) {
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

    const linkId = req.nextUrl.searchParams.get('linkId');

    if (!linkId) {
      return NextResponse.json({ error: 'Link ID is required' }, { status: 400 });
    }

    const body = await req.json();
    const { isActive, title, originalUrl, expiresAt } = body;

    const originalLink = await URLModel.findById(linkId);
    if (!originalLink) {
      return NextResponse.json({ error: 'Link not found' }, { status: 404 });
    }

    // Prepare update object
    const updateData: any = {};
    if (typeof isActive === 'boolean') updateData.isActive = isActive;
    if (title) updateData.title = title;
    if (originalUrl) updateData.originalUrl = originalUrl;
    if (expiresAt) updateData.expiresAt = new Date(expiresAt);

    const updatedLink = await URLModel.findByIdAndUpdate(
      linkId,
      updateData,
      { new: true, runValidators: true }
    ).populate('userId', 'name email');

    // Track changes for audit log
    const changes = Object.keys(updateData).map(field => ({
      field,
      oldValue: (originalLink as any)[field],
      newValue: (updatedLink as any)[field]
    }));

    const auditLog = new AuditLog({
      userId: session.user.id,
      userEmail: currentUser.email,
      userName: currentUser.name,
      action: 'update_link',
      resource: 'url',
      resourceId: linkId,
      details: {
        method: 'PUT',
        changes
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
        factors: ['admin_action', 'link_modification'],
        score: 50
      }
    });

    await auditLog.save();

    return NextResponse.json({
      success: true,
      message: 'Link updated successfully',
      data: updatedLink
    });

  } catch (error) {
    console.error('Admin link update error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// Delete link (admin action)
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

    const linkId = req.nextUrl.searchParams.get('linkId');

    if (!linkId) {
      return NextResponse.json({ error: 'Link ID is required' }, { status: 400 });
    }

    const linkToDelete = await URLModel.findById(linkId);
    if (!linkToDelete) {
      return NextResponse.json({ error: 'Link not found' }, { status: 404 });
    }

    // Soft delete link
    await URLModel.findByIdAndUpdate(linkId, {
      isDeleted: true,
      deletedAt: new Date(),
      isActive: false
    });

    // Delete associated analytics
    await Analytics.deleteMany({ linkId });

    const auditLog = new AuditLog({
      userId: session.user.id,
      userEmail: currentUser.email,
      userName: currentUser.name,
      action: 'delete_link',
      resource: 'url',
      resourceId: linkId,
      details: {
        method: 'DELETE',
        changes: [
          { field: 'isDeleted', oldValue: false, newValue: true },
          { field: 'isActive', oldValue: linkToDelete.isActive, newValue: false }
        ]
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
        level: 'high',
        factors: ['admin_action', 'data_deletion'],
        score: 75
      }
    });

    await auditLog.save();

    return NextResponse.json({
      success: true,
      message: 'Link deleted successfully'
    });

  } catch (error) {
    console.error('Admin link delete error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}