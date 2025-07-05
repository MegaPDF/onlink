import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { connectDB } from '@/lib/mongodb';
import { User } from '@/models/User';
import { authOptions } from '@/lib/auth';
import StripeService from '@/lib/stripe';
export async function POST(request: NextRequest) {
  try {
    await connectDB();
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get user to find Stripe customer ID
    const user = await User.findById(session.user.id);
    if (!user?.subscription?.stripeCustomerId) {
      return NextResponse.json({ 
        error: 'No billing account found. Please create a subscription first.' 
      }, { status: 404 });
    }

    // Handle empty request body
    let body: { returnUrl?: string } = {};
    try {
      body = await request.json();
    } catch {
      // Empty body is fine
    }

    const returnUrl = body.returnUrl || `${process.env.NEXTAUTH_URL}/dashboard/billing`;

    // Create billing portal session
    const portalSession = await StripeService.createPortalSession(
      user.subscription.stripeCustomerId,
      returnUrl
    );

    return NextResponse.json({
      success: true,
      data: {
        url: portalSession.url
      }
    });

  } catch (error) {
    console.error('POST billing portal error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}