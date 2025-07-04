// ============= app/api/client/folders/route.ts =============
import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { connectDB } from '@/lib/mongodb';
import { User } from '@/models/User';
import { URL } from '@/models/URL';
import { CreateFolderSchema } from '@/lib/validations';
import { Folder } from '@/models/Folder';
// Fixed app/api/client/folders/route.ts GET method

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

    // Get user's folders with stats
    const folders = await Folder.find({
      userId: user._id,
      isDeleted: false
    })
    .sort({ name: 1 })
    .lean();

    // Get URL counts for each folder
    const folderStats = await URL.aggregate([
      {
        $match: {
          userId: user._id,
          isDeleted: false,
          folderId: { $ne: null }
        }
      },
      {
        $group: {
          _id: '$folderId',
          urlCount: { $sum: 1 },
          totalClicks: { $sum: '$clicks.total' }
        }
      }
    ]);

    // Merge stats with folders - UNCOMMENTED AND FIXED
    const foldersWithStats = folders.map(folder => {
      const stats = folderStats.find(stat => 
        stat._id.toString() === folder.id.toString()
      );
      
      return {
        ...folder,
        stats: {
          urlCount: stats?.urlCount || 0,
          totalClicks: stats?.totalClicks || 0,
          lastUpdated: new Date()
        }
      };
    });

    // Get uncategorized URLs count
    const uncategorizedCount = await URL.countDocuments({
      userId: user._id,
      folderId: null,
      isDeleted: false
    });

    return NextResponse.json({
      success: true,
      data: {
        folders: foldersWithStats,
        uncategorizedCount
      }
    });

  } catch (error) {
    console.error('Folders GET error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// ALSO NEED TO FIX THE CREATE FOLDER VALIDATION ISSUE
export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    await connectDB();

    const body = await req.json();
    
    // Fix the parentId null issue
    if (body.parentId === null || body.parentId === "" || body.parentId === undefined) {
      delete body.parentId;
    }

    const validatedData = CreateFolderSchema.parse(body);

    const user = await User.findById(session.user.id);
    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    // Check if folder name already exists for user
    const existingFolder = await Folder.findOne({
      name: validatedData.name,
      userId: user._id,
      isDeleted: false
    });

    if (existingFolder) {
      return NextResponse.json({ 
        error: 'Folder with this name already exists' 
      }, { status: 400 });
    }

    // Validate parent folder if provided
    let path = validatedData.name;
    let level = 0;

    if (validatedData.parentId) {
      const parentFolder = await Folder.findOne({
        _id: validatedData.parentId,
        userId: user._id,
        isDeleted: false
      });

      if (!parentFolder) {
        return NextResponse.json({ 
          error: 'Parent folder not found' 
        }, { status: 404 });
      }

      // Prevent deep nesting (max 5 levels)
      if (parentFolder.level >= 4) {
        return NextResponse.json({ 
          error: 'Maximum folder nesting level reached' 
        }, { status: 400 });
      }

      path = `${parentFolder.path}/${validatedData.name}`;
      level = parentFolder.level + 1;
    }

    const newFolder = new Folder({
      name: validatedData.name,
      description: validatedData.description,
      color: validatedData.color,
      icon: validatedData.icon,
      userId: user._id,
      teamId: user.team?.teamId,
      parentId: validatedData.parentId || null, // Explicitly set to null if undefined
      path,
      level,
      isShared: false,
      stats: {
        urlCount: 0,
        totalClicks: 0,
        lastUpdated: new Date()
      }
    });

    await newFolder.save();

    return NextResponse.json({
      success: true,
      message: 'Folder created successfully',
      data: newFolder
    });

  } catch (error) {
    console.error('Folder creation error:', error);
    
    if (error === 'ZodError') {
      return NextResponse.json({ 
        error: 'Invalid input data',
        details: error
      }, { status: 400 });
    }

    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// Update folder
export async function PUT(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    await connectDB();

    const { folderId, updates } = await req.json();

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

// Delete folder
export async function DELETE(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    await connectDB();

    const folderId = req.nextUrl.searchParams.get('folderId');
    const moveToFolder = req.nextUrl.searchParams.get('moveToFolder'); // Optional: move URLs to another folder

    if (!folderId) {
      return NextResponse.json({ error: 'Folder ID is required' }, { status: 400 });
    }

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
      if (moveToFolder) {
        // Move URLs to specified folder
        await URL.updateMany(
          { folderId, isDeleted: false },
          { folderId: moveToFolder === 'null' ? null : moveToFolder }
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