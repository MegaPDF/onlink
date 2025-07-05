// ============= app/api/admin/users/route.ts =============
import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { connectDB } from '@/lib/mongodb';
import { User } from '@/models/User';
import { Team } from '@/models/Team';
import { URL as URLModel } from '@/models/URL';
import { AuditLog } from '@/models/AuditLog';
import { SecurityService } from '@/lib/security';
import { EmailService } from '@/lib/email';
import { z } from 'zod';
import bcrypt from 'bcryptjs';
import { generateSecureToken } from '@/lib/utils';
import { Analytics } from '@/models/Analytics';
import { Folder } from '@/models/Folder';

// Validation schemas
const createUserSchema = z.object({
  name: z.string().min(1, 'Name is required').max(100, 'Name too long'),
  email: z.string().email('Invalid email address'),
  role: z.enum(['user', 'admin', 'moderator']).default('user'),
  plan: z.enum(['free', 'premium', 'enterprise']).default('free'),
  isActive: z.boolean().default(true),
  isEmailVerified: z.boolean().default(false),
  sendWelcomeEmail: z.boolean().default(true),
  temporaryPassword: z.string().min(8, 'Password must be at least 8 characters').optional()
});

const updateUserSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  email: z.string().email().optional(),
  role: z.enum(['user', 'admin', 'moderator']).optional(),
  plan: z.enum(['free', 'premium', 'enterprise']).optional(),
  isActive: z.boolean().optional(),
  isEmailVerified: z.boolean().optional()
});

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

    // Parse query parameters
    const page = parseInt(req.nextUrl.searchParams.get('page') || '1');
    const limit = parseInt(req.nextUrl.searchParams.get('limit') || '10');
    const search = req.nextUrl.searchParams.get('search') || '';
    const role = req.nextUrl.searchParams.get('role') || '';
    const plan = req.nextUrl.searchParams.get('plan') || '';
    const status = req.nextUrl.searchParams.get('status') || '';
    const sortBy = req.nextUrl.searchParams.get('sortBy') || 'createdAt';
    const sortOrder = req.nextUrl.searchParams.get('sortOrder') || 'desc';

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
          inactiveUsers: { $sum: { $cond: [{ $eq: ['$isActive', false] }, 1, 0] } },
          freeUsers: { $sum: { $cond: [{ $eq: ['$plan', 'free'] }, 1, 0] } },
          premiumUsers: { $sum: { $cond: [{ $eq: ['$plan', 'premium'] }, 1, 0] } },
          enterpriseUsers: { $sum: { $cond: [{ $eq: ['$plan', 'enterprise'] }, 1, 0] } },
          adminUsers: { $sum: { $cond: [{ $eq: ['$role', 'admin'] }, 1, 0] } },
          moderatorUsers: { $sum: { $cond: [{ $eq: ['$role', 'moderator'] }, 1, 0] } }
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
          inactiveUsers: 0,
          freeUsers: 0,
          premiumUsers: 0,
          enterpriseUsers: 0,
          adminUsers: 0,
          moderatorUsers: 0
        }
      }
    });

  } catch (error) {
    console.error('Admin users GET error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// Create new user (admin action)
export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    await connectDB();

    // Check admin permissions
    const currentUser = await User.findById(session.user.id);
    if (currentUser?.role !== 'admin') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const body = await req.json();
    const validatedData = createUserSchema.parse(body);

    // Check if email already exists
    const existingUser = await User.findOne({ 
      email: validatedData.email,
      isDeleted: false 
    });

    if (existingUser) {
      return NextResponse.json({ 
        error: 'A user with this email already exists' 
      }, { status: 400 });
    }

    // Generate temporary password if not provided
    const tempPassword = validatedData.temporaryPassword || generateSecureToken(12);
    const hashedPassword = await bcrypt.hash(tempPassword, 12);

    // Generate email verification token
    const emailVerificationToken = generateSecureToken(32);
    const emailVerificationExpires = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours

    // Create new user
    const newUser = new User({
      name: validatedData.name,
      email: validatedData.email,
      password: hashedPassword,
      role: validatedData.role,
      plan: validatedData.plan,
      isActive: validatedData.isActive,
      isEmailVerified: validatedData.isEmailVerified,
      emailVerificationToken: validatedData.isEmailVerified ? undefined : emailVerificationToken,
      emailVerificationExpires: validatedData.isEmailVerified ? undefined : emailVerificationExpires,
      createdBy: session.user.id,
      subscription: {
         status: 'active' 
       },
      usage: {
        linksCount: 0,
        clicksCount: 0,
        monthlyLinks: 0,
        monthlyClicks: 0,
        resetDate: new Date(),
        lastUpdated: new Date()
      },
      preferences: {
        timezone: 'UTC',
        language: 'en',
        dateFormat: 'MM/dd/yyyy',
        timeFormat: '12h',
        notifications: {
          email: true,
          browser: true,
          marketing: false
        }
      },
      security: {
        loginAttempts: 0,
        lockedUntil: null,
        lastLoginIP: null,
        lastLoginAt: null,
        twoFactorEnabled: false,
        backupCodes: []
      }
    });

    await newUser.save();

    // Send welcome email if requested
    if (validatedData.sendWelcomeEmail) {
      try {
        if (validatedData.isEmailVerified) {
          // Send welcome email with temporary password
          await EmailService.sendWelcomeEmail(
            validatedData.email,
            validatedData.name
          );
        } else {
          // Send email verification
          await EmailService.sendVerificationEmail(
            validatedData.email,
            validatedData.name,
            emailVerificationToken
          );
        }
      } catch (emailError) {
        console.error('Failed to send welcome email:', emailError);
        // Don't fail user creation if email fails
      }
    }

    // Log user creation
    await SecurityService.logSecurityEvent(
      session.user.id,
      'create_user',
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
      action: 'create_user',
      resource: 'user',
      resourceId: newUser._id.toString(),
      details: {
        method: 'POST',
        changes: [
          { field: 'name', newValue: validatedData.name },
          { field: 'email', newValue: validatedData.email },
          { field: 'role', newValue: validatedData.role },
          { field: 'plan', newValue: validatedData.plan },
          { field: 'isActive', newValue: validatedData.isActive }
        ]
      },
      context: {
        ip: req.headers.get('x-forwarded-for') || '127.0.0.1',
        userAgent: req.headers.get('user-agent') || ''
      },
      result: {
        success: true,
        statusCode: 201
      },
      risk: {
        level: 'medium',
        factors: ['admin_action', 'user_creation'],
        score: 60
      }
    });

    await auditLog.save();

    // Return user without sensitive data
    const responseUser = {
      _id: newUser._id,
      name: newUser.name,
      email: newUser.email,
      role: newUser.role,
      plan: newUser.plan,
      isActive: newUser.isActive,
      isEmailVerified: newUser.isEmailVerified,
      createdAt: newUser.createdAt,
      temporaryPassword: validatedData.sendWelcomeEmail ? tempPassword : undefined
    };

    return NextResponse.json({
      success: true,
      message: 'User created successfully',
      data: responseUser
    }, { status: 201 });

  } catch (error) {
    console.error('Admin user creation error:', error);
    
    if (error instanceof z.ZodError) {
      return NextResponse.json({ 
        error: 'Validation failed',
        details: error.errors 
      }, { status: 400 });
    }

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

    const userId = req.nextUrl.searchParams.get('userId');
    if (!userId) {
      return NextResponse.json({ error: 'User ID is required' }, { status: 400 });
    }

    const body = await req.json();
    const validatedUpdates = updateUserSchema.parse(body);

    // Check if email is being changed and if it's already taken
    if (validatedUpdates.email) {
      const existingUser = await User.findOne({ 
        email: validatedUpdates.email, 
        _id: { $ne: userId },
        isDeleted: false
      });
      if (existingUser) {
        return NextResponse.json({ error: 'Email already in use' }, { status: 400 });
      }
    }

    const originalUser = await User.findById(userId);
    if (!originalUser || originalUser.isDeleted) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    // Prevent admin from deactivating themselves
    if (userId === session.user.id && validatedUpdates.isActive === false) {
      return NextResponse.json({ 
        error: 'You cannot deactivate your own account' 
      }, { status: 400 });
    }

    // Update user with status change tracking
    const updateData: any = { ...validatedUpdates };
    
    // Track status changes
    if (validatedUpdates.isActive !== undefined && validatedUpdates.isActive !== originalUser.isActive) {
      updateData.statusChangedAt = new Date();
      updateData.statusChangedBy = session.user.id;
    }

    const updatedUser = await User.findByIdAndUpdate(
      userId,
      updateData,
      { new: true, runValidators: true }
    ).select('-password -security.twoFactorSecret');

    // Track changes for audit log
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
      action: validatedUpdates.isActive !== undefined ? 'update_user_status' : 'update_user',
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
    
    if (error instanceof z.ZodError) {
      return NextResponse.json({ 
        error: 'Validation failed',
        details: error.errors 
      }, { status: 400 });
    }

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

    const userId = req.nextUrl.searchParams.get('userId');
    
    if (!userId) {
      return NextResponse.json({ error: 'User ID is required' }, { status: 400 });
    }

    // Prevent self-deletion
    if (userId === session.user.id) {
      return NextResponse.json({ error: 'Cannot delete your own account' }, { status: 400 });
    }

    const userToDelete = await User.findById(userId);
    if (!userToDelete || userToDelete.isDeleted) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    console.log('🗑️ HARD DELETE: Permanently removing user and all data:', userToDelete.email);

    // STEP 1: Get all user's URLs for analytics cleanup
    const userUrls = await URLModel.find({ userId });
    console.log(`Found ${userUrls.length} URLs belonging to user`);

    // STEP 2: Delete all analytics for user's URLs
    let analyticsDeleted = 0;
    for (const url of userUrls) {
      const result = await Analytics.deleteMany({ shortCode: url.shortCode });
      analyticsDeleted += result.deletedCount;
    }
    console.log(`✅ Deleted ${analyticsDeleted} analytics records`);

    // STEP 3: Delete all user's URLs
    const urlsDeleted = await URLModel.deleteMany({ userId });
    console.log(`✅ Deleted ${urlsDeleted.deletedCount} URLs`);

    // STEP 4: Delete all user's folders
    const foldersDeleted = await Folder.deleteMany({ userId });
    console.log(`✅ Deleted ${foldersDeleted.deletedCount} folders`);

    // STEP 5: Delete user's sessions (if you have a Session model)
    

    // STEP 6: Delete audit logs related to this user (optional - you might want to keep for legal reasons)
    const auditLogsDeleted = await AuditLog.deleteMany({ 
      $or: [
        { userId },
        { resourceId: userId }
      ]
    });
    console.log(`✅ Deleted ${auditLogsDeleted.deletedCount} audit logs`);

    // STEP 7: FIXED - Actually delete the user from database
    await User.findByIdAndDelete(userId);
    console.log('✅ User PERMANENTLY DELETED from database:', userToDelete.email);

    // STEP 8: Create final audit log (before user deletion)
    const auditLog = new AuditLog({
      userId: session.user.id,
      userEmail: currentUser.email,
      userName: currentUser.name,
      action: 'hard_delete_user',
      resource: 'user',
      resourceId: userId,
      details: {
        method: 'DELETE',
        type: 'permanent',
        userEmail: userToDelete.email,
        userName: userToDelete.name,
        deletedData: {
          urls: urlsDeleted.deletedCount,
          folders: foldersDeleted.deletedCount,
          analytics: analyticsDeleted,
          auditLogs: auditLogsDeleted.deletedCount
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
        level: 'critical',
        factors: ['admin_action', 'permanent_user_deletion', 'data_loss'],
        score: 95
      }
    });

    await auditLog.save();

    return NextResponse.json({
      success: true,
      message: `User and all associated data permanently deleted from database`,
      deletedData: {
        urls: urlsDeleted.deletedCount,
        folders: foldersDeleted.deletedCount,
        analytics: analyticsDeleted,
        auditLogs: auditLogsDeleted.deletedCount
      }
    });

  } catch (error) {
    console.error('Admin user delete error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}