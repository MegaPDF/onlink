import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { connectDB } from '@/lib/mongodb';
import { User } from '@/models/User';
import { URL } from '@/models/URL';
import { Folder } from '@/models/Folder';

// Get individual folder
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ folderId: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    await connectDB();

    // FIXED: Await params before using its properties
    const { folderId } = await params;

    const folder = await Folder.findOne({
      _id: folderId,
      userId: session.user.id,
      isDeleted: false
    });

    if (!folder) {
      return NextResponse.json({ error: 'Folder not found' }, { status: 404 });
    }

    // Get folder stats
    const stats = await URL.aggregate([
      {
        $match: {
          folderId: folder._id,
          userId: session.user.id,
          isDeleted: false
        }
      },
      {
        $group: {
          _id: null,
          urlCount: { $sum: 1 },
          totalClicks: { $sum: '$clicks.total' }
        }
      }
    ]);

    const folderWithStats = {
      ...folder.toObject(),
      stats: {
        urlCount: stats[0]?.urlCount || 0,
        totalClicks: stats[0]?.totalClicks || 0,
        lastUpdated: new Date()
      }
    };

    return NextResponse.json({
      success: true,
      data: folderWithStats
    });

  } catch (error) {
    console.error('Folder fetch error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// Update individual folder
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ folderId: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    await connectDB();

    // FIXED: Await params before using its properties
    const { folderId } = await params;
    const updates = await req.json();

    const folder = await Folder.findOne({
      _id: folderId,
      userId: session.user.id,
      isDeleted: false
    });

    if (!folder) {
      return NextResponse.json({ error: 'Folder not found' }, { status: 404 });
    }

    // Validate updates
    const allowedUpdates = ['name', 'description', 'color', 'icon'];
    const updateData: any = {};

    for (const [key, value] of Object.entries(updates)) {
      if (allowedUpdates.includes(key)) {
        updateData[key] = value;
      }
    }

    // Check name uniqueness if updating name
    if (updateData.name && updateData.name !== folder.name) {
      const existingFolder = await Folder.findOne({
        name: updateData.name,
        userId: session.user.id,
        isDeleted: false,
        _id: { $ne: folderId }
      });

      if (existingFolder) {
        return NextResponse.json({ 
          error: 'Folder with this name already exists' 
        }, { status: 400 });
      }
    }

    const updatedFolder = await Folder.findByIdAndUpdate(
      folderId,
      { $set: updateData },
      { new: true, runValidators: true }
    );

    return NextResponse.json({
      success: true,
      message: 'Folder updated successfully',
      data: updatedFolder
    });

  } catch (error) {
    console.error('Folder update error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// Delete individual folder

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ folderId: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    await connectDB();

    const { folderId } = await params;
    const moveToFolder = req.nextUrl.searchParams.get('moveToFolder');

    const folder = await Folder.findOne({
      _id: folderId,
      userId: session.user.id,
      isDeleted: false
    });

    if (!folder) {
      return NextResponse.json({ error: 'Folder not found' }, { status: 404 });
    }

    console.log('🗑️ HARD DELETE: Permanently removing folder from database:', folder.name);

    // Handle URLs in this folder
    if (moveToFolder && moveToFolder !== 'null') {
      // Move URLs to another specific folder
      await URL.updateMany(
        { folderId, isDeleted: false },
        { folderId: moveToFolder }
      );
      console.log(`✅ Moved URLs to folder: ${moveToFolder}`);
    } else {
      // Move URLs to root (uncategorized)
      await URL.updateMany(
        { folderId, isDeleted: false },
        { $unset: { folderId: 1 } }
      );
      console.log('✅ Moved URLs to uncategorized');
    }

    // Delete child folders recursively (HARD DELETE)
    await hardDeleteChildFolders(folderId, session.user.id);

    // FIXED: Actually delete the folder from database (not just mark as deleted)
    await Folder.findByIdAndDelete(folderId);
    console.log('✅ Folder PERMANENTLY DELETED from database:', folder.name);

    return NextResponse.json({
      success: true,
      message: 'Folder permanently deleted from database'
    });

  } catch (error) {
    console.error('Folder delete error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// Helper function for hard deleting child folders
async function hardDeleteChildFolders(parentId: string, userId: string) {
  const childFolders = await Folder.find({
    parentId,
    userId,
    isDeleted: false
  });

  console.log(`Found ${childFolders.length} child folders to delete`);

  for (const child of childFolders) {
    console.log(`🗑️ Deleting child folder: ${child.name}`);
    
    // Recursively delete grandchildren
    await hardDeleteChildFolders(child._id.toString(), userId);
    
    // Move URLs in this child folder to uncategorized
    await URL.updateMany(
      { folderId: child._id, isDeleted: false },
      { $unset: { folderId: 1 } }
    );
    
    // FIXED: Actually delete child folder from database
    await Folder.findByIdAndDelete(child._id);
    console.log(`✅ Child folder PERMANENTLY DELETED: ${child.name}`);
  }
}