// ============= app/api/auth/session/route.ts =============
import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { connectDB } from '@/lib/mongodb';
import { User } from '@/models/User';

export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.id) {
      return NextResponse.json({ 
        authenticated: false,
        user: null 
      });
    }

    await connectDB();

    // Get fresh user data
    const user = await User.findById(session.user.id)
      .select('-password -security.twoFactorSecret')
      .populate('team.teamId', 'name slug');

    if (!user || user.isDeleted || !user.isActive) {
      return NextResponse.json({ 
        authenticated: false,
        user: null 
      });
    }

    // Update last active timestamp
    user.lastActiveAt = new Date();
    await user.save();

    return NextResponse.json({
      authenticated: true,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        image: user.image,
        role: user.role,
        plan: user.plan,
        emailVerified: user.emailVerified,
        isActive: user.isActive,
        team: user.team,
        usage: user.usage,
        preferences: user.preferences,
        createdAt: user.createdAt,
        lastLoginAt: user.lastLoginAt
      }
    });

  } catch (error) {
    console.error('Session check error:', error);
    return NextResponse.json({ 
      authenticated: false,
      user: null 
    });
  }
}