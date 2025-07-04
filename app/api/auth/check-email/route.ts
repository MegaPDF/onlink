// ============= app/api/auth/check-email/route.ts =============
import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '@/lib/mongodb';
import { User } from '@/models/User';
import { z } from 'zod';

const CheckEmailSchema = z.object({
  email: z.string().email('Invalid email address')
});

export async function POST(req: NextRequest) {
  try {
    await connectDB();

    const body = await req.json();
    const { email } = CheckEmailSchema.parse(body);

    const existingUser = await User.findOne({
      email: email.toLowerCase(),
      isDeleted: false
    });

    return NextResponse.json({
      success: true,
      data: {
        exists: !!existingUser,
        verified: existingUser?.isEmailVerified || false
      }
    });

  } catch (error) {
    console.error('Check email error:', error);
    
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
