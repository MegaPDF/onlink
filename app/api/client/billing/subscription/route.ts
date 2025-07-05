import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { Subscription } from '@/models/Subscription';
import { User } from '@/models/User';
import { StripeService } from '@/lib/stripe';
import { connectDB } from '@/lib/mongodb';

// GET - Fetch user's subscription
export async function GET(request: NextRequest) {
  try {
    await connectDB();
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get user details first
    const user = await User.findById(session.user.id);
    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    // For free plan users, return null subscription but indicate they're active
    if (user.plan === 'free') {
      return NextResponse.json({
        success: true,
        data: null,
        message: 'User is on free plan',
        userPlan: user.plan,
        isActive: true
      });
    }

    // For paid plans, fetch the subscription
    const subscription = await Subscription.findOne({
      userId: session.user.id
    }).select('-__v');

    if (!subscription) {
      return NextResponse.json({
        success: true,
        data: null,
        message: 'No active subscription found',
        userPlan: user.plan,
        isActive: false
      });
    }

    return NextResponse.json({
      success: true,
      data: subscription,
      userPlan: user.plan,
      isActive: subscription.status === 'active'
    });

  } catch (error) {
    console.error('GET subscription error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// POST - Create new subscription
export async function POST(request: NextRequest) {
  try {
    await connectDB();
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { priceId, billingInfo, addOns = [] } = body;

    if (!priceId || !billingInfo) {
      return NextResponse.json({ 
        error: 'Price ID and billing info are required' 
      }, { status: 400 });
    }

    // Check if user already has active subscription
    const existingSubscription = await Subscription.findOne({
      userId: session.user.id,
      status: { $in: ['active', 'trialing'] }
    });

    if (existingSubscription) {
      return NextResponse.json({ 
        error: 'User already has an active subscription' 
      }, { status: 400 });
    }

    // Get user details
    const user = await User.findById(session.user.id);
    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    // Create or get Stripe customer
    let stripeCustomerId = user.subscription?.stripeCustomerId;
    
    if (!stripeCustomerId) {
      const customer = await StripeService.createCustomer(
        billingInfo.email,
        billingInfo.name,
        { userId: session.user.id }
      );
      stripeCustomerId = customer.id;
      
      // Update user with Stripe customer ID
      await User.findByIdAndUpdate(session.user.id, {
        'subscription.stripeCustomerId': customer.id
      });
    }

    // Create checkout session for subscription
    const checkoutSession = await StripeService.createCheckoutSession(
      stripeCustomerId,
      priceId,
      `${process.env.NEXTAUTH_URL}/dashboard/billing?success=true`,
      `${process.env.NEXTAUTH_URL}/dashboard/billing?canceled=true`,
      {
        userId: session.user.id,
        priceId: priceId
      }
    );

    return NextResponse.json({
      success: true,
      data: {
        checkoutUrl: checkoutSession.url,
        sessionId: checkoutSession.id
      }
    });

  } catch (error) {
    console.error('POST subscription error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// PUT - Update existing subscription
export async function PUT(request: NextRequest) {
  try {
    await connectDB();
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { priceId, addOns, billingInfo } = body;

    // Find user's subscription
    const subscription = await Subscription.findOne({
      userId: session.user.id,
      status: { $in: ['active', 'trialing'] }
    });

    if (!subscription) {
      return NextResponse.json({ 
        error: 'No active subscription found' 
      }, { status: 404 });
    }

    // Update subscription in Stripe
    if (priceId && priceId !== subscription.stripePriceId) {
      await StripeService.updateSubscription(
        subscription.stripeSubscriptionId,
        priceId
      );
    }

    // Update subscription in database
    const updateData: any = {};
    if (priceId) updateData.stripePriceId = priceId;
    if (addOns) updateData.addOns = addOns;
    
    const updatedSubscription = await Subscription.findByIdAndUpdate(
      subscription._id,
      updateData,
      { new: true }
    );

    return NextResponse.json({
      success: true,
      data: updatedSubscription,
      message: 'Subscription updated successfully'
    });

  } catch (error) {
    console.error('PUT subscription error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// DELETE - Cancel subscription
export async function DELETE(request: NextRequest) {
  try {
    await connectDB();
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { reason, feedback, cancelImmediately = false } = body;

    // Find user's subscription
    const subscription = await Subscription.findOne({
      userId: session.user.id,
      status: { $in: ['active', 'trialing'] }
    });

    if (!subscription) {
      return NextResponse.json({ 
        error: 'No active subscription found' 
      }, { status: 404 });
    }

    // Cancel subscription in Stripe
    await StripeService.cancelSubscription(
      subscription.stripeSubscriptionId,
      cancelImmediately
    );

    // Update subscription in database
    const updateData: any = {
      cancellationReason: reason,
      canceledAt: new Date()
    };

    if (cancelImmediately) {
      updateData.status = 'canceled';
    }

    const updatedSubscription = await Subscription.findByIdAndUpdate(
      subscription._id,
      updateData,
      { new: true }
    );

    return NextResponse.json({
      success: true,
      data: updatedSubscription,
      message: cancelImmediately ? 
        'Subscription canceled immediately' : 
        'Subscription will be canceled at the end of the current period'
    });

  } catch (error) {
    console.error('DELETE subscription error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}