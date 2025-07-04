// ============= app/api/client/my-links/route.ts =============
import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { connectDB } from '@/lib/mongodb';
import { User } from '@/models/User';
import { URL } from '@/models/URL';
import { Folder } from '@/models/Folder';

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

    const { searchParams } = new URL(req.url);
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '10');
    const search = searchParams.get('search') || '';
    const folderId = searchParams.get('folderId') || '';
    const tag = searchParams.get('tag') || '';
    const status = searchParams.get('status') || '';
    const sortBy = searchParams.get('sortBy') || 'createdAt';
    const sortOrder = searchParams.get('sortOrder') || 'desc';

    // Build filter
    const filter: any = { 
      userId: user._id, 
      isDeleted: false 
    };

    if (search) {
      filter.$or = [
        { originalUrl: { $regex: search, $options: 'i' } },
        { shortCode: { $regex: search, $options: 'i' } },
        { title: { $regex: search, $options: 'i' } }
      ];
    }

    if (folderId === 'null' || folderId === 'none') {
      filter.folderId = null;
    } else if (folderId) {
      filter.folderId = folderId;
    }

    if (tag) {
      filter.tags = tag;
    }

    if (status === 'active') filter.isActive = true;
    if (status === 'inactive') filter.isActive = false;
    if (status === 'expired') filter.expiresAt = { $lt: new Date() };

    // Execute queries
    const [urls, totalUrls, folders] = await Promise.all([
      URL.find(filter)
        .populate('folderId', 'name color')
        .sort({ [sortBy]: sortOrder === 'desc' ? -1 : 1 })
        .skip((page - 1) * limit)
        .limit(limit),
      URL.countDocuments(filter),
      Folder.find({ userId: user._id, isDeleted: false })
        .select('name color stats')
        .sort({ name: 1 })
    ]);

    // Get user's tags
    const userTags = await URL.aggregate([
      { $match: { userId: user._id, isDeleted: false } },
      { $unwind: '$tags' },
      { $group: { _id: '$tags', count: { $sum: 1 } } },
      { $sort: { count: -1, _id: 1 } },
      { $limit: 50 }
    ]);

    // Calculate quick stats
    const quickStats = await URL.aggregate([
      { $match: { userId: user._id, isDeleted: false } },
      {
        $group: {
          _id: null,
          totalUrls: { $sum: 1 },
          totalClicks: { $sum: '$clicks.total' },
          activeUrls: { $sum: { $cond: ['$isActive', 1, 0] } },
          urlsThisMonth: {
            $sum: {
              $cond: [
                { 
                  $gte: [
                    '$createdAt', 
                    new Date(new Date().getFullYear(), new Date().getMonth(), 1)
                  ] 
                },
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
        folders,
        tags: userTags.map(tag => ({ name: tag._id, count: tag.count })),
        stats: quickStats[0] || {
          totalUrls: 0,
          totalClicks: 0,
          activeUrls: 0,
          urlsThisMonth: 0
        }
      }
    });

  } catch (error) {
    console.error('My links GET error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// Update URL
export async function PUT(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    await connectDB();

    const { urlId, updates } = await req.json();

    const url = await URL.findOne({
      _id: urlId,
      userId: session.user.id,
      isDeleted: false
    });

    if (!url) {
      return NextResponse.json({ error: 'URL not found' }, { status: 404 });
    }

    // Validate updates
    const allowedUpdates = [
      'title', 'description', 'tags', 'folderId', 'isActive',
      'expiresAt', 'clickLimit', 'isPasswordProtected', 'password'
    ];

    const updateData: any = {};
    for (const [key, value] of Object.entries(updates)) {
      if (allowedUpdates.includes(key)) {
        updateData[key] = value;
      }
    }

    // Validate folder ownership if updating folderId
    if (updateData.folderId) {
      const folder = await Folder.findOne({
        _id: updateData.folderId,
        userId: session.user.id,
        isDeleted: false
      });

      if (!folder) {
        return NextResponse.json({ 
          error: 'Folder not found or access denied' 
        }, { status: 404 });
      }
    }

    const updatedUrl = await URL.findByIdAndUpdate(
      urlId,
      { $set: updateData },
      { new: true, runValidators: true }
    ).populate('folderId', 'name color');

    return NextResponse.json({
      success: true,
      message: 'URL updated successfully',
      data: updatedUrl
    });

  } catch (error) {
    console.error('URL update error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// Delete URL
export async function DELETE(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    await connectDB();

    const { searchParams } = new URL(req.url);
    const urlId = searchParams.get('urlId');

    if (!urlId) {
      return NextResponse.json({ error: 'URL ID is required' }, { status: 400 });
    }

    const url = await URL.findOne({
      _id: urlId,
      userId: session.user.id,
      isDeleted: false
    });

    if (!url) {
      return NextResponse.json({ error: 'URL not found' }, { status: 404 });
    }

    // Soft delete
    await URL.findByIdAndUpdate(urlId, {
      isDeleted: true,
      deletedAt: new Date(),
      isActive: false
    });

    // Update user usage
    await User.findByIdAndUpdate(session.user.id, {
      $inc: { 'usage.linksCount': -1 },
      'usage.lastUpdated': new Date()
    });

    // Update folder stats
    if (url.folderId) {
      await Folder.findByIdAndUpdate(url.folderId, {
        $inc: { 'stats.urlCount': -1 },
        'stats.lastUpdated': new Date()
      });
    }

    return NextResponse.json({
      success: true,
      message: 'URL deleted successfully'
    });

  } catch (error) {
    console.error('URL delete error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}