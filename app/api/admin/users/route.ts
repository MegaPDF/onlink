// ============= app/api/admin/users/route.ts =============
import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { connectDB } from '@/lib/mongodb';
import { User } from '@/models/User';
import { Team } from '@/models/Team';
import { URL } from '@/models/URL';
import { AuditLog } from '@/models/AuditLog';
import { SecurityService } from '@/lib/security';
import { EmailService } from '@/lib/email';
import { z } from 'zod';

// Get all users with pagination and filters
export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    await connectDB();

    // Check admin permissions
    const currentUser = await User.findById(session.user.id);
    if (currentUser?.role !== 'admin') {
      await SecurityService.logSecurityEvent(
        session.user.id,
        'unauthorized_admin_access',
        {
          ip: req.headers.get('x-forwarded-for') || '127.0.0.1',
          userAgent: req.headers.get('user-agent') || ''
        },
        { success: false, error: 'Insufficient permissions' }
      );
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const { searchParams } = new URL(req.url);
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '10');
    const search = searchParams.get('search') || '';
    const role = searchParams.get('role') || '';
    const plan = searchParams.get('plan') || '';
    const status = searchParams.get('status') || '';
    const sortBy = searchParams.get('sortBy') || 'createdAt';
    const sortOrder = searchParams.get('sortOrder') || 'desc';

    // Build filter query
    const filter: any = { isDeleted: false };
    
    if (search) {
      filter.$or = [
        { name: { $regex: search, $options: 'i' } },
        { email: { $regex: search, $options: 'i' } }
      ];
    }
    
    if (role) filter.role = role;
    if (plan) filter.plan = plan;
    if (status === 'active') filter.isActive = true;
    if (status === 'inactive') filter.isActive = false;

    // Execute queries
    const [users, totalUsers] = await Promise.all([
      User.find(filter)
        .select('-password -security.twoFactorSecret')
        .populate('team.teamId', 'name slug')
        .sort({ [sortBy]: sortOrder === 'desc' ? -1 : 1 })
        .skip((page - 1) * limit)
        .limit(limit),
      User.countDocuments(filter)
    ]);

    // Get user statistics
    const stats = await User.aggregate([
      { $match: { isDeleted: false } },
      {
        $group: {
          _id: null,
          totalUsers: { $sum: 1 },
          activeUsers: { $sum: { $cond: ['$isActive', 1, 0] } },
          freeUsers: { $sum: { $cond: [{ $eq: ['$plan', 'free'] }, 1, 0] } },
          premiumUsers: { $sum: { $cond: [{ $eq: ['$plan', 'premium'] }, 1, 0] } },
          enterpriseUsers: { $sum: { $cond: [{ $eq: ['$plan', 'enterprise'] }, 1, 0] } }
        }
      }
    ]);

    return NextResponse.json({
      success: true,
      data: {
        users,
        pagination: {
          page,
          limit,
          total: totalUsers,
          totalPages: Math.ceil(totalUsers / limit),
          hasNextPage: page < Math.ceil(totalUsers / limit),
          hasPrevPage: page > 1
        },
        stats: stats[0] || {
          totalUsers: 0,
          activeUsers: 0,
          freeUsers: 0,
          premiumUsers: 0,
          enterpriseUsers: 0
        }
      }
    });

  } catch (error) {
    console.error('Admin users GET error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// Update user (admin action)
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

    const { userId, updates } = await req.json();

    // Validate updates
    const UpdateUserSchema = z.object({
      name: z.string().min(1).max(100).optional(),
      email: z.string().email().optional(),
      role: z.enum(['user', 'admin', 'moderator']).optional(),
      plan: z.enum(['free', 'premium', 'enterprise']).optional(),
      isActive: z.boolean().optional(),
      preferences: z.object({
        notifications: z.object({
          email: z.boolean().optional(),
          marketing: z.boolean().optional(),
          security: z.boolean().optional(),
          analytics: z.boolean().optional()
        }).optional()
      }).optional()
    });

    const validatedUpdates = UpdateUserSchema.parse(updates);

    // Get original user for audit log
    const originalUser = await User.findById(userId);
    if (!originalUser) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    // Prevent self-demotion
    if (userId === session.user.id && validatedUpdates.role && validatedUpdates.role !== 'admin') {
      return NextResponse.json({ error: 'Cannot change your own admin role' }, { status: 400 });
    }

    // Update user
    const updatedUser = await User.findByIdAndUpdate(
      userId,
      { $set: validatedUpdates },
      { new: true, runValidators: true }
    ).select('-password -security.twoFactorSecret');

    // Create audit log
    const changes = Object.keys(validatedUpdates).map(field => ({
      field,
      oldValue: (originalUser as any)[field],
      newValue: (updatedUser as any)[field]
    }));

    await SecurityService.logSecurityEvent(
      session.user.id,
      'update_user',
      {
        ip: req.headers.get('x-forwarded-for') || '127.0.0.1',
        userAgent: req.headers.get('user-agent') || ''
      },
      { success: true }
    );

    const auditLog = new AuditLog({
      userId: session.user.id,
      userEmail: currentUser.email,
      userName: currentUser.name,
      action: 'update_user',
      resource: 'user',
      resourceId: userId,
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
        factors: ['admin_action', 'user_modification'],
        score: 60
      }
    });

    await auditLog.save();

    return NextResponse.json({
      success: true,
      message: 'User updated successfully',
      data: updatedUser
    });

  } catch (error) {
    console.error('Admin user update error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// Delete user (admin action)
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
    const userId = searchParams.get('userId');

    if (!userId) {
      return NextResponse.json({ error: 'User ID is required' }, { status: 400 });
    }

    // Prevent self-deletion
    if (userId === session.user.id) {
      return NextResponse.json({ error: 'Cannot delete your own account' }, { status: 400 });
    }

    const userToDelete = await User.findById(userId);
    if (!userToDelete) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    // Soft delete user
    await User.findByIdAndUpdate(userId, {
      isDeleted: true,
      deletedAt: new Date(),
      isActive: false
    });

    // Soft delete user's URLs
    await URL.updateMany(
      { userId, isDeleted: false },
      { isDeleted: true, deletedAt: new Date() }
    );

    // Log deletion
    await SecurityService.logSecurityEvent(
      session.user.id,
      'delete_user',
      {
        ip: req.headers.get('x-forwarded-for') || '127.0.0.1',
        userAgent: req.headers.get('user-agent') || ''
      },
      { success: true }
    );

    return NextResponse.json({
      success: true,
      message: 'User deleted successfully'
    });

  } catch (error) {
    console.error('Admin user delete error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}