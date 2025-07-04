// ============= app/api/auth/reset-password/route.ts =============
import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '@/lib/mongodb';
import { User } from '@/models/User';
import { SecurityService } from '@/lib/security';
import { ResetPasswordSchema } from '@/lib/validations';
import { EmailService } from '@/lib/email';

export async function POST(req: NextRequest) {
  try {
    await connectDB();

    const body = await req.json();
    const validatedData = ResetPasswordSchema.parse(body);

    // Find user with valid reset token
    const user = await User.findOne({
      passwordResetToken: validatedData.token,
      passwordResetExpires: { $gt: new Date() },
      isDeleted: false
    });

    if (!user) {
      return NextResponse.json({ 
        error: 'Invalid or expired reset token' 
      }, { status: 400 });
    }

    // Check password strength
    const passwordStrength = SecurityService.checkPasswordStrength(validatedData.password);
    if (passwordStrength.score < 4) {
      return NextResponse.json({ 
        error: 'Password is too weak',
        feedback: passwordStrength.feedback 
      }, { status: 400 });
    }

    // Hash new password
    const hashedPassword = await SecurityService.hashPassword(validatedData.password);

    // Update user password
    user.password = hashedPassword;
    user.passwordResetToken = undefined;
    user.passwordResetExpires = undefined;
    user.security.lastPasswordChange = new Date();
    user.security.loginAttempts = 0; // Reset login attempts
    user.security.lockedUntil = undefined; // Unlock account if locked

    await user.save();

    // Log password reset
    await SecurityService.logSecurityEvent(
      user._id.toString(),
      'password_reset_completed',
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
      message: 'Password reset successfully! You can now log in with your new password.'
    });

  } catch (error) {
    console.error('Reset password error:', error);
    
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
