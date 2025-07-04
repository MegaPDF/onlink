// ============= app/api/auth/forgot-password/route.ts =============
import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '@/lib/mongodb';
import { User } from '@/models/User';
import { EmailService } from '@/lib/email';
import { SecurityService } from '@/lib/security';
import { ForgotPasswordSchema } from '@/lib/validations';
import { generateSecureToken } from '@/lib/utils';

export async function POST(req: NextRequest) {
  try {
    await connectDB();

    const body = await req.json();
    const { email } = ForgotPasswordSchema.parse(body);

    // Rate limiting for password reset requests
    const ip = req.headers.get('x-forwarded-for') || '127.0.0.1';
    const rateLimit = SecurityService.checkRateLimit(`password-reset:${ip}`, 3, 15 * 60 * 1000); // 3 attempts per 15 minutes

    if (!rateLimit.allowed) {
      return NextResponse.json({ 
        error: 'Too many password reset requests. Please try again later.',
        retryAfter: Math.ceil((rateLimit.resetTime - Date.now()) / 1000)
      }, { status: 429 });
    }

    const user = await User.findOne({
      email: email.toLowerCase(),
      isDeleted: false,
      isActive: true
    });

    // Always return success to prevent email enumeration
    const successResponse = {
      success: true,
      message: 'If an account with that email exists, we have sent a password reset link.'
    };

    if (!user) {
      // Log failed attempt but still return success
      await SecurityService.logSecurityEvent(
        'unknown',
        'password_reset_attempt',
        {
          ip: Array.isArray(ip) ? ip[0] : ip,
          userAgent: req.headers.get('user-agent') || 'Unknown'
        },
        { success: false, error: 'User not found' }
      );

      return NextResponse.json(successResponse);
    }

    // Check if user has recent reset token (prevent spam)
    if (user.passwordResetExpires && user.passwordResetExpires > new Date()) {
      return NextResponse.json(successResponse);
    }

    // Generate reset token
    const resetToken = generateSecureToken(32);
    const resetExpires = new Date(Date.now() + 60 * 60 * 1000); // 1 hour

    user.passwordResetToken = resetToken;
    user.passwordResetExpires = resetExpires;
    await user.save();

    // Send password reset email
    try {
      await EmailService.sendPasswordResetEmail(user.email, resetToken);
    } catch (emailError) {
      console.error('Failed to send password reset email:', emailError);
      return NextResponse.json({ 
        error: 'Failed to send password reset email. Please try again.' 
      }, { status: 500 });
    }

    // Log successful reset request
    await SecurityService.logSecurityEvent(
      user._id.toString(),
      'password_reset_requested',
      {
        ip: Array.isArray(ip) ? ip[0] : ip,
        userAgent: req.headers.get('user-agent') || 'Unknown'
      },
      { success: true }
    );

    return NextResponse.json(successResponse);

  } catch (error) {
    console.error('Forgot password error:', error);
    
    if (error === 'ZodError') {
      return NextResponse.json({ 
        error: 'Invalid email address' 
      }, { status: 400 });
    }

    return NextResponse.json({ 
      error: 'Internal server error' 
    }, { status: 500 });
  }
}
