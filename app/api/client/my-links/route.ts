
import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { connectDB } from '@/lib/mongodb';
import { User } from '@/models/User';
import { URL } from '@/models/URL';
import { Folder } from '@/models/Folder';
import mongoose from 'mongoose';

export async function PUT(req: NextRequest) {
  const session = await mongoose.startSession();
  
  try {
    const userSession = await getServerSession(authOptions);
    if (!userSession?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    await connectDB();
    session.startTransaction();

    const { urlIds, updates } = await req.json();

    if (!Array.isArray(urlIds) || urlIds.length === 0) {
      await session.abortTransaction();
      return NextResponse.json({ error: 'URL IDs array is required' }, { status: 400 });
    }

    // Verify all URLs belong to the user
    const urls = await URL.find({
      _id: { $in: urlIds },
      userId: userSession.user.id,
      isDeleted: false
    }).session(session);

    if (urls.length !== urlIds.length) {
      await session.abortTransaction();
      return NextResponse.json({ error: 'Some URLs not found or access denied' }, { status: 404 });
    }

    // Update URLs
    const result = await URL.updateMany(
      {
        _id: { $in: urlIds },
        userId: userSession.user.id,
        isDeleted: false
      },
      {
        ...updates,
        updatedAt: new Date()
      }
    ).session(session);

    await session.commitTransaction();

    return NextResponse.json({
      success: true,
      message: `${result.modifiedCount} URLs updated successfully`,
      data: { modifiedCount: result.modifiedCount }
    });

  } catch (error) {
    if (session.inTransaction()) {
      await session.abortTransaction();
    }
    
    console.error('Bulk update error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  } finally {
    await session.endSession();
  }
}

export async function DELETE(req: NextRequest) {
  const session = await mongoose.startSession();
  
  try {
    const userSession = await getServerSession(authOptions);
    if (!userSession?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    await connectDB();
    session.startTransaction();

    const { urlIds } = await req.json();

    if (!Array.isArray(urlIds) || urlIds.length === 0) {
      await session.abortTransaction();
      return NextResponse.json({ error: 'URL IDs array is required' }, { status: 400 });
    }

    // Verify all URLs belong to the user
    const urls = await URL.find({
      _id: { $in: urlIds },
      userId: userSession.user.id,
      isDeleted: false
    }).session(session);

    if (urls.length !== urlIds.length) {
      await session.abortTransaction();
      return NextResponse.json({ error: 'Some URLs not found or access denied' }, { status: 404 });
    }

    // Soft delete URLs
    const result = await URL.updateMany(
      {
        _id: { $in: urlIds },
        userId: userSession.user.id,
        isDeleted: false
      },
      {
        isDeleted: true,
        deletedAt: new Date(),
        isActive: false
      }
    ).session(session);

    // Update user usage
    await User.findByIdAndUpdate(
      userSession.user.id,
      {
        $inc: { 'usage.linksCount': -result.modifiedCount },
        'usage.lastUpdated': new Date()
      }
    ).session(session);

    // Update folder stats
    const urlsWithFolders = urls.filter(url => url.folderId);
    for (const url of urlsWithFolders) {
      await Folder.findByIdAndUpdate(
        url.folderId,
        {
          $inc: { 'stats.urlCount': -1 },
          'stats.lastUpdated': new Date()
        }
      ).session(session);
    }

    await session.commitTransaction();

    return NextResponse.json({
      success: true,
      message: `${result.modifiedCount} URLs deleted successfully`,
      data: { deletedCount: result.modifiedCount }
    });

  } catch (error) {
    if (session.inTransaction()) {
      await session.abortTransaction();
    }
    
    console.error('Bulk delete error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  } finally {
    await session.endSession();
  }
}