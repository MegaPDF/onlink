
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
  { params }: { params: { folderId: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    await connectDB();

    const { folderId } = params;

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
      ...folder,
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
  { params }: { params: { folderId: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    await connectDB();

    const { folderId } = params;
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
  { params }: { params: { folderId: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    await connectDB();

    const { folderId } = params;
    const moveToFolder = req.nextUrl.searchParams.get('moveToFolder'); // Optional: move URLs to another folder

    const folder = await Folder.findOne({
      _id: folderId,
      userId: session.user.id,
      isDeleted: false
    });

    if (!folder) {
      return NextResponse.json({ error: 'Folder not found' }, { status: 404 });
    }

    // Check if folder has URLs
    const urlCount = await URL.countDocuments({
      folderId,
      isDeleted: false
    });

    if (urlCount > 0) {
      if (moveToFolder && moveToFolder !== 'null') {
        // Move URLs to specified folder
        await URL.updateMany(
          { folderId, isDeleted: false },
          { folderId: moveToFolder }
        );
      } else {
        // Move URLs to root (no folder)
        await URL.updateMany(
          { folderId, isDeleted: false },
          { $unset: { folderId: 1 } }
        );
      }
    }

    // Delete child folders recursively
    await deleteChildFolders(folderId, session.user.id);

    // Soft delete the folder
    await Folder.findByIdAndUpdate(folderId, {
      isDeleted: true,
      deletedAt: new Date()
    });

    return NextResponse.json({
      success: true,
      message: 'Folder deleted successfully'
    });

  } catch (error) {
    console.error('Folder delete error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

async function deleteChildFolders(parentId: string, userId: string) {
  const childFolders = await Folder.find({
    parentId,
    userId,
    isDeleted: false
  });

  for (const child of childFolders) {
    // Recursively delete children
    await deleteChildFolders(child._id.toString(), userId);
    
    // Move URLs to root
    await URL.updateMany(
      { folderId: child._id, isDeleted: false },
      { $unset: { folderId: 1 } }
    );
    
    // Delete folder
    await Folder.findByIdAndUpdate(child._id, {
      isDeleted: true,
      deletedAt: new Date()
    });
  }
}