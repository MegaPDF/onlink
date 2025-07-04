// ============= app/api/auth/change-password/route.ts =============
import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { connectDB } from '@/lib/mongodb';
import { User } from '@/models/User';
import { SecurityService } from '@/lib/security';
import { z } from 'zod';
import { EmailService } from '@/lib/email';

const ChangePasswordSchema = z.object({
  currentPassword: z.string().min(1, 'Current password is required'),
  newPassword: z.string()
    .min(8, 'Password must be at least 8 characters')
    .regex(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/, 'Password must contain uppercase, lowercase, and number'),
  confirmPassword: z.string()
}).refine(data => data.newPassword === data.confirmPassword, {
  message: "Passwords don't match",
  path: ["confirmPassword"]
});

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    await connectDB();

    const body = await req.json();
    const validatedData = ChangePasswordSchema.parse(body);

    const user = await User.findById(session.user.id);
    if (!user || !user.password) {
      return NextResponse.json({ 
        error: 'User not found or using OAuth login' 
      }, { status: 404 });
    }

    // Verify current password
    const isCurrentPasswordValid = await SecurityService.verifyPassword(
      validatedData.currentPassword,
      user.password
    );

    if (!isCurrentPasswordValid) {
      // Log failed attempt
      await SecurityService.logSecurityEvent(
        user._id.toString(),
        'password_change_failed',
        {
          ip: req.headers.get('x-forwarded-for') || '127.0.0.1',
          userAgent: req.headers.get('user-agent') || 'Unknown'
        },
        { success: false, error: 'Invalid current password' }
      );

      return NextResponse.json({ 
        error: 'Current password is incorrect' 
      }, { status: 400 });
    }

    // Check new password strength
    const passwordStrength = SecurityService.checkPasswordStrength(validatedData.newPassword);
    if (passwordStrength.score < 4) {
      return NextResponse.json({ 
        error: 'New password is too weak',
        feedback: passwordStrength.feedback 
      }, { status: 400 });
    }

    // Check if new password is different from current
    const isSamePassword = await SecurityService.verifyPassword(
      validatedData.newPassword,
      user.password
    );

    if (isSamePassword) {
      return NextResponse.json({ 
        error: 'New password must be different from current password' 
      }, { status: 400 });
    }

    // Hash new password
    const hashedPassword = await SecurityService.hashPassword(validatedData.newPassword);

    // Update password
    user.password = hashedPassword;
    user.security.lastPasswordChange = new Date();
    await user.save();

    // Log successful password change
    await SecurityService.logSecurityEvent(
      user._id.toString(),
      'password_changed',
      {
        ip: req.headers.get('x-forwarded-for') || '127.0.0.1',
        userAgent: req.headers.get('user-agent') || 'Unknown'
      },
      { success: true }
    );

    // Send confirmation email
    try {
      await EmailService.sendPasswordChangeConfirmation(user.email, user.name);
    } catch (emailError) {
      console.error('Failed to send password change confirmation:', emailError);
    }

    return NextResponse.json({
      success: true,
      message: 'Password changed successfully!'
    });

  } catch (error) {
    console.error('Change password error:', error);
    
    if (error === 'ZodError') {
      return NextResponse.json({ 
        error: 'Invalid input data',
        details: error 
      }, { status: 400 });
    }

    return NextResponse.json({ 
      error: 'Internal server error' 
    }, { status: 500 });
  }
}
