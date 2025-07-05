// app/api/client/billing/payment-methods/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { User } from '@/models/User';
import Stripe from 'stripe';
import { connectDB } from '@/lib/mongodb';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
});

export async function GET(request: NextRequest) {
  try {
    await connectDB();
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get user to find Stripe customer ID
    const user = await User.findById(session.user.id);
    if (!user?.stripeCustomerId) {
      return NextResponse.json({
        success: true,
        data: [],
        message: 'No payment methods found'
      });
    }

    try {
      // Fetch payment methods from Stripe
      const paymentMethods = await stripe.paymentMethods.list({
        customer: user.stripeCustomerId,
        type: 'card'
      });

      // Get customer to find default payment method
      const customer = await stripe.customers.retrieve(user.stripeCustomerId) as Stripe.Customer;
      const defaultPaymentMethodId = customer.invoice_settings?.default_payment_method;

      // Transform Stripe payment methods to our format
      const transformedPaymentMethods = paymentMethods.data.map(pm => ({
        id: pm.id,
        type: pm.type as 'card' | 'bank_account',
        card: pm.card ? {
          brand: pm.card.brand,
          last4: pm.card.last4,
          expMonth: pm.card.exp_month,
          expYear: pm.card.exp_year
        } : undefined,
        isDefault: pm.id === defaultPaymentMethodId
      }));

      return NextResponse.json({
        success: true,
        data: transformedPaymentMethods
      });

    } catch (stripeError) {
      console.error('Stripe error fetching payment methods:', stripeError);
      
      // If customer doesn't exist in Stripe, return empty array
      if (stripeError instanceof Error && stripeError.message.includes('No such customer')) {
        return NextResponse.json({
          success: true,
          data: [],
          message: 'No payment methods found'
        });
      }
      
      throw stripeError;
    }

  } catch (error) {
    console.error('GET payment methods error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    await connectDB();
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { paymentMethodId, setAsDefault = false } = body;

    if (!paymentMethodId) {
      return NextResponse.json({ 
        error: 'Payment method ID is required' 
      }, { status: 400 });
    }

    // Get user to find Stripe customer ID
    const user = await User.findById(session.user.id);
    if (!user?.stripeCustomerId) {
      return NextResponse.json({ error: 'Customer not found' }, { status: 404 });
    }

    // Attach payment method to customer
    await stripe.paymentMethods.attach(paymentMethodId, {
      customer: user.stripeCustomerId
    });

    // Set as default if requested
    if (setAsDefault) {
      await stripe.customers.update(user.stripeCustomerId, {
        invoice_settings: {
          default_payment_method: paymentMethodId
        }
      });
    }

    // Fetch updated payment method
    const paymentMethod = await stripe.paymentMethods.retrieve(paymentMethodId);

    const transformedPaymentMethod = {
      id: paymentMethod.id,
      type: paymentMethod.type as 'card' | 'bank_account',
      card: paymentMethod.card ? {
        brand: paymentMethod.card.brand,
        last4: paymentMethod.card.last4,
        expMonth: paymentMethod.card.exp_month,
        expYear: paymentMethod.card.exp_year
      } : undefined,
      isDefault: setAsDefault
    };

    return NextResponse.json({
      success: true,
      data: transformedPaymentMethod,
      message: 'Payment method added successfully'
    });

  } catch (error) {
    console.error('POST payment method error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  try {
    await connectDB();
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { paymentMethodId } = body;

    if (!paymentMethodId) {
      return NextResponse.json({ 
        error: 'Payment method ID is required' 
      }, { status: 400 });
    }

    // Detach payment method from customer
    await stripe.paymentMethods.detach(paymentMethodId);

    return NextResponse.json({
      success: true,
      message: 'Payment method removed successfully'
    });

  } catch (error) {
    console.error('DELETE payment method error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}