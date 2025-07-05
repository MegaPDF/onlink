// ============= app/api/auth/signup/route.ts =============
import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '@/lib/mongodb';
import { User } from '@/models/User';
import { SecurityService } from '@/lib/security';
import { EmailService } from '@/lib/email';
import { SignupSchema } from '@/lib/validations';
import { generateSecureToken } from '@/lib/utils';
import { AuditLog } from '@/models/AuditLog';

export async function POST(req: NextRequest) {
  try {
    await connectDB();

    const body = await req.json();
    const validatedData = SignupSchema.parse(body);

    // Check if user already exists
    const existingUser = await User.findOne({ 
      email: validatedData.email.toLowerCase(),
      isDeleted: false 
    });

    if (existingUser) {
      // Log failed signup attempt
      await logSignupAttempt(validatedData.email, req, false, 'Email already exists');
      return NextResponse.json({ 
        error: 'An account with this email already exists' 
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

    // Hash password
    const hashedPassword = await SecurityService.hashPassword(validatedData.password);
    
    // Generate email verification token
    const verificationToken = generateSecureToken(32);
    const verificationExpires = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours

    // Create new user
    const newUser = new User({
      name: validatedData.name.trim(),
      email: validatedData.email.toLowerCase().trim(),
      password: hashedPassword,
      plan: 'free',
      role: 'user',
      isActive: true,
      isEmailVerified: false,
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
      
      // Default preferences
      preferences: {
        timezone: 'UTC',
        language: 'en',
        dateFormat: 'MM/DD/YYYY',
        notifications: {
          email: true,
          marketing: false,
          security: true,
          analytics: true
        },
        privacy: {
          publicProfile: false,
          shareAnalytics: false
        }
      },
      
      // Security settings
      security: {
        twoFactorEnabled: false,
        loginAttempts: 0,
        ipWhitelist: []
      },
      
      // Verification
      emailVerificationToken: verificationToken,
      emailVerificationExpires: verificationExpires
    });

    await newUser.save();

    // Send verification email
    try {
      await EmailService.sendVerificationEmail(
        newUser.email,
        newUser.name,
        verificationToken
      );
    } catch (emailError) {
      console.error('Failed to send verification email:', emailError);
      // Don't fail signup if email fails, but log it
    }

    // Send welcome email
    try {
      await EmailService.sendWelcomeEmail(newUser.email, newUser.name);
    } catch (emailError) {
      console.error('Failed to send welcome email:', emailError);
    }

    // Log successful signup
    await logSignupAttempt(newUser.email, req, true);

    return NextResponse.json({
      success: true,
      message: 'Account created successfully! Please check your email to verify your account.',
      data: {
        userId: newUser._id,
        email: newUser.email,
        name: newUser.name,
        emailVerificationRequired: true
      }
    });

  } catch (error) {
    console.error('Signup error:', error);
    
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

// Helper function to log signup attempts
async function logSignupAttempt(
  email: string,
  req: NextRequest,
  success: boolean,
  failureReason?: string
) {
  try {
    const ip = req.headers.get('x-forwarded-for') || req.headers.get('x-real-ip') || '127.0.0.1';
    const userAgent = req.headers.get('user-agent') || 'Unknown';

    const auditLog = new AuditLog({
      userEmail: email,
      action: success ? 'signup_success' : 'signup_failed',
      resource: 'auth',
      details: {
        method: 'POST',
        endpoint: '/api/auth/signup',
        metadata: { failureReason }
      },
      context: {
        ip: Array.isArray(ip) ? ip[0] : ip,
        userAgent
      },
      result: {
        success,
        statusCode: success ? 201 : 400,
        error: failureReason
      },
      risk: {
        level: success ? 'low' : 'medium',
        factors: success ? [] : ['failed_signup'],
        score: success ? 10 : 40
      }
    });

    await auditLog.save();
  } catch (error) {
    console.error('Error logging signup attempt:', error);
  }
}