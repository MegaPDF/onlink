// ============= app/api/webhook/stripe/route.ts =============
import { NextRequest, NextResponse } from 'next/server';
import { headers } from 'next/headers';
import { connectDB } from '@/lib/mongodb';
import StripeService, { stripe } from '@/lib/stripe';
import { User } from '@/models/User';
import { Team } from '@/models/Team';
import { Subscription } from '@/models/Subscription';
import { AuditLog } from '@/models/AuditLog';

export async function POST(req: NextRequest) {
  try {
    await connectDB();

    const body = await req.text();
    const signature = (await headers()).get('stripe-signature');

    if (!signature) {
      console.error('Missing Stripe signature');
      return NextResponse.json({ error: 'Missing signature' }, { status: 400 });
    }

    // Verify webhook signature and handle event
    const result = await StripeService.handleWebhook(body, signature);

    if (result.received) {
      return NextResponse.json({ received: true });
    } else {
      return NextResponse.json({ error: 'Webhook processing failed' }, { status: 400 });
    }

  } catch (error) {
    console.error('Stripe webhook error:', error);
    
    // Log webhook errors for debugging
    try {
      const auditLog = new AuditLog({
        action: 'stripe_webhook_error',
        resource: 'webhook',
        details: {
          method: 'POST',
          endpoint: '/api/webhook/stripe',
          metadata: {
            error: error instanceof Error ? error.message : 'Unknown error'
          }
        },
        context: {
          ip: req.headers.get('x-forwarded-for') || '127.0.0.1',
          userAgent: req.headers.get('user-agent') || 'Stripe-Webhook'
        },
        result: {
          success: false,
          statusCode: 500,
          error: error instanceof Error ? error.message : 'Unknown error'
        },
        risk: {
          level: 'medium',
          factors: ['webhook_error'],
          score: 50
        }
      });

      await auditLog.save();
    } catch (logError) {
      console.error('Failed to log webhook error:', logError);
    }

    return NextResponse.json({ 
      error: 'Webhook handler failed' 
    }, { status: 400 });
  }
}

// Handle specific Stripe events with enhanced logging and error handling
export class EnhancedStripeWebhookHandler {
  
  static async handleSubscriptionCreated(subscription: any) {
    try {
      console.log('Processing subscription.created:', subscription.id);
      
      const customer = await stripe.customers.retrieve(subscription.customer);
      
      if (!customer || customer.deleted) {
        throw new Error('Customer not found or deleted');
      }

      // Find user by email
      const user = await User.findOne({ 
        email: (customer as any).email,
        isDeleted: false 
      });

      if (!user) {
        console.warn(`User not found for subscription ${subscription.id}, email: ${(customer as any).email}`);
        return;
      }

      // Create subscription record
      const subscriptionDoc = new Subscription({
        stripeSubscriptionId: subscription.id,
        stripeCustomerId: subscription.customer,
        stripePriceId: subscription.items.data[0].price.id,
        stripeProductId: subscription.items.data[0].price.product,
        userId: user._id,
        plan: this.getPlanFromPriceId(subscription.items.data[0].price.id),
        status: subscription.status,
        interval: subscription.items.data[0].price.recurring?.interval || 'month',
        amount: subscription.items.data[0].price.unit_amount || 0,
        currency: subscription.items.data[0].price.currency,
        currentPeriodStart: new Date(subscription.current_period_start * 1000),
        currentPeriodEnd: new Date(subscription.current_period_end * 1000),
        trialStart: subscription.trial_start ? new Date(subscription.trial_start * 1000) : undefined,
        trialEnd: subscription.trial_end ? new Date(subscription.trial_end * 1000) : undefined,
        features: this.getPlanFeatures(subscription.items.data[0].price.id),
        addOns: [],
        paymentHistory: []
      });

      await subscriptionDoc.save();

      // Update user
      const planType = this.getPlanFromPriceId(subscription.items.data[0].price.id);
      user.plan = planType;
      user.subscription = {
        stripeCustomerId: subscription.customer,
        stripeSubscriptionId: subscription.id,
        stripePriceId: subscription.items.data[0].price.id,
        stripeCurrentPeriodEnd: new Date(subscription.current_period_end * 1000),
        status: subscription.status
      };

      await user.save();

      // Log successful subscription creation
        await this.logWebhookEvent(
        'subscription_created',
        subscription.id,
        { success: true },
        user._id.toString()
      );

      console.log(`Subscription created successfully for user ${user.email}`);

    } catch (error) {
      console.error('Error handling subscription.created:', error);
      await this.logWebhookEvent(
        'subscription_created_error',
        subscription.id,
        { success: false, error: error instanceof Error ? error.message : 'Unknown error' }
      );
      throw error;
    }
  }

  static async handleSubscriptionUpdated(subscription: any) {
    try {
      console.log('Processing subscription.updated:', subscription.id);

      const subscriptionDoc = await Subscription.findOne({
        stripeSubscriptionId: subscription.id
      });

      if (!subscriptionDoc) {
        console.warn(`Subscription document not found: ${subscription.id}`);
        return;
      }

      // Update subscription
      const planType = this.getPlanFromPriceId(subscription.items.data[0].price.id);
      
      subscriptionDoc.status = subscription.status;
      subscriptionDoc.stripePriceId = subscription.items.data[0].price.id;
      subscriptionDoc.plan = planType;
      subscriptionDoc.amount = subscription.items.data[0].price.unit_amount || 0;
      subscriptionDoc.interval = subscription.items.data[0].price.recurring?.interval || 'month';
      subscriptionDoc.currentPeriodStart = new Date(subscription.current_period_start * 1000);
      subscriptionDoc.currentPeriodEnd = new Date(subscription.current_period_end * 1000);
      subscriptionDoc.features = this.getPlanFeatures(subscription.items.data[0].price.id);

      if (subscription.cancel_at) {
        subscriptionDoc.cancelAt = new Date(subscription.cancel_at * 1000);
      }
      if (subscription.canceled_at) {
        subscriptionDoc.canceledAt = new Date(subscription.canceled_at * 1000);
      }

      await subscriptionDoc.save();

      // Update user
      if (subscriptionDoc.userId) {
        await User.findByIdAndUpdate(subscriptionDoc.userId, {
          plan: planType,
          'subscription.status': subscription.status,
          'subscription.stripePriceId': subscription.items.data[0].price.id,
          'subscription.stripeCurrentPeriodEnd': new Date(subscription.current_period_end * 1000)
        });
      }

      // Update team if team subscription
      if (subscriptionDoc.teamId) {
        await Team.findByIdAndUpdate(subscriptionDoc.teamId, {
          plan: planType,
          'billing.stripeSubscriptionId': subscription.id,
          'billing.stripePriceId': subscription.items.data[0].price.id
        });
      }

      await this.logWebhookEvent(
        'subscription_updated',
        subscription.id,
        { success: true },
        subscriptionDoc.userId?.toString()
      );
      console.log(`Subscription updated successfully: ${subscription.id}`);

    } catch (error) {
      console.error('Error handling subscription.updated:', error);
      await this.logWebhookEvent(
        'subscription_updated_error',
        subscription.id,
        { success: false, error: error instanceof Error ? error.message : 'Unknown error' }
      );
    }
  }

  static async handleSubscriptionDeleted(subscription: any) {
    try {
      console.log('Processing subscription.deleted:', subscription.id);

      const subscriptionDoc = await Subscription.findOne({
        stripeSubscriptionId: subscription.id
      });

      if (!subscriptionDoc) {
        console.warn(`Subscription document not found: ${subscription.id}`);
        return;
      }

      // Update subscription status
      subscriptionDoc.status = 'canceled';
      subscriptionDoc.canceledAt = new Date();
      await subscriptionDoc.save();

      // Downgrade user to free plan
      if (subscriptionDoc.userId) {
        await User.findByIdAndUpdate(subscriptionDoc.userId, {
          plan: 'free',
          'subscription.status': 'canceled'
        });
      }

      // Update team plan
      if (subscriptionDoc.teamId) {
        await Team.findByIdAndUpdate(subscriptionDoc.teamId, {
          plan: 'team', // Default team plan
          'billing.stripeSubscriptionId': null
        });
      }

      await this.logWebhookEvent(
        'subscription_deleted',
        subscription.id,
        { success: true },
        subscriptionDoc.userId?.toString()
      );

    } catch (error) {
      console.error('Error handling subscription.deleted:', error);
      await this.logWebhookEvent(
        'subscription_deleted_error',
        subscription.id,
        { success: false, error: error instanceof Error ? error.message : 'Unknown error' }
      );
      throw error;
    }
  }

  static async handleInvoicePaymentSucceeded(invoice: any) {
    try {
      console.log('Processing invoice.payment_succeeded:', invoice.id);

      if (!invoice.subscription) {
        console.log('Invoice not associated with subscription, skipping');
        return;
      }

      const subscription = await Subscription.findOne({
        stripeSubscriptionId: invoice.subscription
      });

      if (!subscription) {
        console.warn(`Subscription not found for invoice: ${invoice.id}`);
        return;
      }

      // Add payment to history
      subscription.paymentHistory.push({
        stripeInvoiceId: invoice.id,
        amount: invoice.amount_paid,
        currency: invoice.currency,
        status: 'paid',
        paidAt: new Date(invoice.status_transitions.paid_at * 1000),
        dueDate: new Date(invoice.due_date * 1000),
        url: invoice.hosted_invoice_url
      });

      await subscription.save();

      await this.logWebhookEvent(
        'invoice_payment_succeeded',
        invoice.id,
        { success: true, amount: invoice.amount_paid },
        subscription.userId?.toString()
      );

      console.log(`Payment recorded successfully for invoice: ${invoice.id}`);

    } catch (error) {
      console.error('Error handling invoice.payment_succeeded:', error);
      await this.logWebhookEvent(
        'invoice_payment_succeeded_error',
        invoice.id,
        { success: false, error: error instanceof Error ? error.message : 'Unknown error' }
      );
      throw error;
    }
  }

  static async handleInvoicePaymentFailed(invoice: any) {
    try {
      console.log('Processing invoice.payment_failed:', invoice.id);

      if (!invoice.subscription) {
        console.log('Invoice not associated with subscription, skipping');
        return;
      }

      const subscription = await Subscription.findOne({
        stripeSubscriptionId: invoice.subscription
      });

      if (!subscription) {
        console.warn(`Subscription not found for invoice: ${invoice.id}`);
        return;
      }

      // Add failed payment to history
      subscription.paymentHistory.push({
        stripeInvoiceId: invoice.id,
        amount: invoice.amount_due,
        currency: invoice.currency,
        status: 'failed',
        dueDate: new Date(invoice.due_date * 1000)
      });

      await subscription.save();

      // Update user/team if payment failed
      if (subscription.userId) {
        const user = await User.findById(subscription.userId);
        if (user) {
          // Could implement grace period logic here
          console.log(`Payment failed for user: ${user.email}`);
        }
      }

        await this.logWebhookEvent(
        'invoice_payment_failed',
        invoice.id,
        { success: true, amount: invoice.amount_due },
        subscription.userId?.toString()
      );

      console.log(`Failed payment recorded for invoice: ${invoice.id}`);

    } catch (error) {
      console.error('Error handling invoice.payment_failed:', error);
      await this.logWebhookEvent(
        'invoice_payment_failed_error',
        invoice.id,
        { success: false, error: error instanceof Error ? error.message : 'Unknown error' }
      );
      throw error;
    }
  }

  static getPlanFromPriceId(priceId: string): 'free' | 'premium' | 'enterprise' | 'team' {
    const priceMap: Record<string, any> = {
      'price_premium_monthly': 'premium',
      'price_premium_yearly': 'premium',
      'price_enterprise_monthly': 'enterprise',
      'price_enterprise_yearly': 'enterprise',
      'price_team_monthly': 'team',
      'price_team_yearly': 'team'
    };
    
    return priceMap[priceId] || 'free';
  }

  static getPlanFeatures(priceId: string) {
    const plan = this.getPlanFromPriceId(priceId);
    
    const features = {
      free: {
        maxLinks: 5,
        maxClicks: 1000,
        customDomains: 0,
        teamMembers: 1,
        analytics: false,
        qrCodes: false,
        bulkOperations: false,
        apiAccess: false,
        prioritySupport: false,
        whiteLabel: false
      },
      premium: {
        maxLinks: -1,
        maxClicks: -1,
        customDomains: 3,
        teamMembers: 1,
        analytics: true,
        qrCodes: true,
        bulkOperations: true,
        apiAccess: true,
        prioritySupport: false,
        whiteLabel: false
      },
      team: {
        maxLinks: -1,
        maxClicks: -1,
        customDomains: 5,
        teamMembers: 10,
        analytics: true,
        qrCodes: true,
        bulkOperations: true,
        apiAccess: true,
        prioritySupport: true,
        whiteLabel: false
      },
      enterprise: {
        maxLinks: -1,
        maxClicks: -1,
        customDomains: -1,
        teamMembers: -1,
        analytics: true,
        qrCodes: true,
        bulkOperations: true,
        apiAccess: true,
        prioritySupport: true,
        whiteLabel: true
      }
    };
    
    return features[plan];
  }

  static async logWebhookEvent(
    action: string,
    resourceId: string,
    result: { success: boolean; error?: string; amount?: number },
    userId?: string
  ) {
    try {
      const auditLog = new AuditLog({
        userId: userId ? new mongoose.Types.ObjectId(userId) : undefined,
        action,
        resource: 'webhook',
        resourceId,
        details: {
          method: 'POST',
          endpoint: '/api/webhook/stripe',
          metadata: {
            amount: result.amount,
            error: result.error
          }
        },
        context: {
          ip: '127.0.0.1',
          userAgent: 'Stripe-Webhook'
        },
        result: {
          success: result.success,
          statusCode: result.success ? 200 : 500,
          error: result.error
        },
        risk: {
          level: 'low',
          factors: ['webhook_event'],
          score: 10
        }
      });

      await auditLog.save();
    } catch (error) {
      console.error('Failed to log webhook event:', error);
    }
  }
}