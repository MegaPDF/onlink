// ============= app/api/client/my-links/route.ts =============
import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { connectDB } from '@/lib/mongodb';
import { User } from '@/models/User';
import { URL } from '@/models/URL';
import { Folder } from '@/models/Folder';
import { z } from 'zod';

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

    // Use Next.js 15 pattern for searchParams
    const page = parseInt(req.nextUrl.searchParams.get('page') || '1');
    const limit = Math.min(parseInt(req.nextUrl.searchParams.get('limit') || '10'), 100); // Cap at 100
    const search = req.nextUrl.searchParams.get('search') || '';
    const folderId = req.nextUrl.searchParams.get('folderId') || '';
    const tag = req.nextUrl.searchParams.get('tag') || '';
    const status = req.nextUrl.searchParams.get('status') || '';
    const sortBy = req.nextUrl.searchParams.get('sortBy') || 'createdAt';
    const sortOrder = req.nextUrl.searchParams.get('sortOrder') || 'desc';

    // Build filter
    const filter: any = { 
      userId: user._id, 
      isDeleted: false 
    };

    if (search) {
      filter.$or = [
        { originalUrl: { $regex: search, $options: 'i' } },
        { shortCode: { $regex: search, $options: 'i' } },
        { title: { $regex: search, $options: 'i' } },
        { description: { $regex: search, $options: 'i' } }
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

    // Validate sort parameters
    const allowedSortFields = ['createdAt', 'updatedAt', 'clicks.total', 'title', 'originalUrl'];
    const validSortBy = allowedSortFields.includes(sortBy) ? sortBy : 'createdAt';
    const validSortOrder = ['asc', 'desc'].includes(sortOrder) ? sortOrder : 'desc';

    // Execute queries with proper pagination
    const skip = Math.max(0, (page - 1) * limit);
    const [urls, totalUrls, folders] = await Promise.all([
      URL.find(filter)
        .populate('folderId', 'name color')
        .sort({ [validSortBy]: validSortOrder === 'desc' ? -1 : 1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      URL.countDocuments(filter),
      Folder.find({ 
        userId: user._id, 
        isDeleted: false 
      }).select('name color').lean()
    ]);

    // Get user's most used tags
    const popularTags = await URL.aggregate([
      { $match: { userId: user._id, isDeleted: false } },
      { $unwind: '$tags' },
      { $group: { _id: '$tags', count: { $sum: 1 } } },
      { $sort: { count: -1 } },
      { $limit: 20 }
    ]);

    // Calculate additional stats
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const thisWeek = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    const thisMonth = new Date(now.getFullYear(), now.getMonth(), 1);

    const [todayUrls, weekUrls, monthUrls] = await Promise.all([
      URL.countDocuments({ userId: user._id, isDeleted: false, createdAt: { $gte: today } }),
      URL.countDocuments({ userId: user._id, isDeleted: false, createdAt: { $gte: thisWeek } }),
      URL.countDocuments({ userId: user._id, isDeleted: false, createdAt: { $gte: thisMonth } })
    ]);

    // Calculate pagination
    const totalPages = Math.ceil(totalUrls / limit);

    return NextResponse.json({
      success: true,
      data: {
        urls: urls.map(url => ({
          ...url,
          shortUrl: `${process.env.NEXT_PUBLIC_BASE_URL}/${url.shortCode}`
        })),
        folders,
        tags: popularTags.map(tag => ({ name: tag._id, count: tag.count })),
        pagination: {
          page,
          limit,
          total: totalUrls,
          totalPages,
          hasNextPage: page < totalPages,
          hasPrevPage: page > 1
        },
        stats: {
          totalUrls,
          activeUrls: urls.filter(url => url.isActive).length,
          urlsToday: todayUrls,
          urlsThisWeek: weekUrls,
          urlsThisMonth: monthUrls
        }
      }
    });

  } catch (error) {
    console.error('My links GET error:', error);
    return NextResponse.json({ 
      error: 'Internal server error',
      details: process.env.NODE_ENV === 'development' ? error : undefined
    }, { status: 500 });
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

    // Validate updates with schema
    const UpdateSchema = z.object({
      title: z.string().max(200).optional(),
      description: z.string().max(500).optional(),
      tags: z.array(z.string().max(50)).max(10).optional(),
      folderId: z.string().regex(/^[0-9a-fA-F]{24}$/).nullable().optional(),
      isActive: z.boolean().optional(),
      expiresAt: z.string().datetime().nullable().optional(),
      clickLimit: z.number().positive().nullable().optional(),
      isPasswordProtected: z.boolean().optional(),
      password: z.string().min(4).max(128).optional()
    });

    let validatedUpdates;
    try {
      validatedUpdates = UpdateSchema.parse(updates);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return NextResponse.json({ 
          error: 'Validation failed',
          details: error.errors.map(err => ({
            field: err.path.join('.'),
            message: err.message
          }))
        }, { status: 400 });
      }
      throw error;
    }

    // Validate folder ownership if updating folderId
    if (validatedUpdates.folderId) {
      const folder = await Folder.findOne({
        _id: validatedUpdates.folderId,
        userId: session.user.id,
        isDeleted: false
      });

      if (!folder) {
        return NextResponse.json({ 
          error: 'Folder not found or access denied' 
        }, { status: 404 });
      }
    }

    // Handle password protection logic
    if (validatedUpdates.isPasswordProtected && !validatedUpdates.password) {
      return NextResponse.json({ 
        error: 'Password is required when password protection is enabled' 
      }, { status: 400 });
    }

    const updateData: any = { ...validatedUpdates };
    
    // Convert expiresAt string to Date
    if (updateData.expiresAt) {
      updateData.expiresAt = new Date(updateData.expiresAt);
    }

    const updatedUrl = await URL.findByIdAndUpdate(
      urlId,
      { $set: updateData },
      { new: true, runValidators: true }
    ).populate('folderId', 'name color');

    return NextResponse.json({
      success: true,
      message: 'URL updated successfully',
      data: {
        ...updatedUrl.toObject(),
        shortUrl: `${process.env.NEXT_PUBLIC_BASE_URL}/${updatedUrl.shortCode}`
      }
    });

  } catch (error) {
    console.error('URL update error:', error);
    return NextResponse.json({ 
      error: 'Internal server error',
      details: process.env.NODE_ENV === 'development' ? error : undefined
    }, { status: 500 });
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

    // Use Next.js 15 pattern for searchParams
    const urlId = req.nextUrl.searchParams.get('urlId');

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

    // Store folder ID for stats update
    const folderId = url.folderId;

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

    // Update folder stats if URL was in a folder
    if (folderId) {
      await Folder.findByIdAndUpdate(folderId, {
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
    return NextResponse.json({ 
      error: 'Internal server error',
      details: process.env.NODE_ENV === 'development' ? error : undefined
    }, { status: 500 });
  }
}