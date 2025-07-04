// ============= app/api/auth/verify-email/route.ts =============
import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '@/lib/mongodb';
import { User } from '@/models/User';
import { AuditLog } from '@/models/AuditLog';
import { EmailService } from '@/lib/email';
import { generateSecureToken } from '@/lib/utils';

export async function POST(req: NextRequest) {
  try {
    await connectDB();

    const { token } = await req.json();

    if (!token) {
      return NextResponse.json({ 
        error: 'Verification token is required' 
      }, { status: 400 });
    }

    // Find user with verification token
    const user = await User.findOne({
      emailVerificationToken: token,
      emailVerificationExpires: { $gt: new Date() },
      isDeleted: false
    });

    if (!user) {
      return NextResponse.json({ 
        error: 'Invalid or expired verification token' 
      }, { status: 400 });
    }

    // Verify email
    user.isEmailVerified = true;
    user.emailVerified = new Date();
    user.emailVerificationToken = undefined;
    user.emailVerificationExpires = undefined;

    await user.save();

    // Log verification
    const auditLog = new AuditLog({
      userId: user._id,
      userEmail: user.email,
      userName: user.name,
      action: 'email_verified',
      resource: 'auth',
      details: {
        method: 'POST',
        endpoint: '/api/auth/verify-email'
      },
      context: {
        ip: req.headers.get('x-forwarded-for') || '127.0.0.1',
        userAgent: req.headers.get('user-agent') || 'Unknown'
      },
      result: {
        success: true,
        statusCode: 200
      },
      risk: {
        level: 'low',
        factors: ['email_verification'],
        score: 10
      }
    });

    await auditLog.save();

    return NextResponse.json({
      success: true,
      message: 'Email verified successfully! You can now log in.'
    });

  } catch (error) {
    console.error('Email verification error:', error);
    return NextResponse.json({ 
      error: 'Internal server error' 
    }, { status: 500 });
  }
}

// Resend verification email
export async function PUT(req: NextRequest) {
  try {
    await connectDB();

    const { email } = await req.json();

    if (!email) {
      return NextResponse.json({ 
        error: 'Email is required' 
      }, { status: 400 });
    }

    const user = await User.findOne({
      email: email.toLowerCase(),
      isDeleted: false,
      isEmailVerified: false
    });

    if (!user) {
      return NextResponse.json({ 
        error: 'User not found or email already verified' 
      }, { status: 404 });
    }

    // Generate new verification token
    const verificationToken = generateSecureToken(32);
    const verificationExpires = new Date(Date.now() + 24 * 60 * 60 * 1000);

    user.emailVerificationToken = verificationToken;
    user.emailVerificationExpires = verificationExpires;
    await user.save();

    // Send verification email
    await EmailService.sendVerificationEmail(
      user.email,
      user.name,
      verificationToken
    );

    return NextResponse.json({
      success: true,
      message: 'Verification email sent successfully!'
    });

  } catch (error) {
    console.error('Resend verification error:', error);
    return NextResponse.json({ 
      error: 'Internal server error' 
    }, { status: 500 });
  }
}