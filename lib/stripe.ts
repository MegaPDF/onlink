// ============= lib/stripe.ts =============
import Stripe from 'stripe';
import { Subscription } from '@/models/Subscription';
import { User } from '@/models/User';
import { Team } from '@/models/Team';

if (!process.env.STRIPE_SECRET_KEY) {
  throw new Error('STRIPE_SECRET_KEY is required');
}

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
});

export class StripeService {
  
  // Create customer
  static async createCustomer(email: string, name: string, metadata: Record<string, string> = {}) {
    return stripe.customers.create({
      email,
      name,
      metadata
    });
  }
  
  // Create subscription
  static async createSubscription(
    customerId: string,
    priceId: string,
    metadata: Record<string, string> = {}
  ) {
    return stripe.subscriptions.create({
      customer: customerId,
      items: [{ price: priceId }],
      payment_behavior: 'default_incomplete',
      payment_settings: { save_default_payment_method: 'on_subscription' },
      expand: ['latest_invoice.payment_intent'],
      metadata
    });
  }
  
  // Update subscription
  static async updateSubscription(subscriptionId: string, priceId: string) {
    const subscription = await stripe.subscriptions.retrieve(subscriptionId);
    
    return stripe.subscriptions.update(subscriptionId, {
      items: [{
        id: subscription.items.data[0].id,
        price: priceId
      }],
      proration_behavior: 'create_prorations'
    });
  }
  
  // Cancel subscription
  static async cancelSubscription(subscriptionId: string, immediately: boolean = false) {
    if (immediately) {
      return stripe.subscriptions.cancel(subscriptionId);
    } else {
      return stripe.subscriptions.update(subscriptionId, {
        cancel_at_period_end: true
      });
    }
  }
  
  // Create checkout session
  static async createCheckoutSession(
    customerId: string,
    priceId: string,
    successUrl: string,
    cancelUrl: string,
    metadata: Record<string, string> = {}
  ) {
    return stripe.checkout.sessions.create({
      customer: customerId,
      payment_method_types: ['card'],
      line_items: [{
        price: priceId,
        quantity: 1
      }],
      mode: 'subscription',
      success_url: successUrl,
      cancel_url: cancelUrl,
      metadata
    });
  }
  
  // Create portal session
  static async createPortalSession(customerId: string, returnUrl: string) {
    return stripe.billingPortal.sessions.create({
      customer: customerId,
      return_url: returnUrl
    });
  }
  
  // Get customer invoices
  static async getCustomerInvoices(customerId: string, limit: number = 10) {
    return stripe.invoices.list({
      customer: customerId,
      limit,
      expand: ['data.payment_intent']
    });
  }
  
  // Handle webhook events
  static async handleWebhook(body: string, signature: string) {
    const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET!;
    
    try {
      const event = stripe.webhooks.constructEvent(body, signature, webhookSecret);
      
      switch (event.type) {
        case 'customer.subscription.created':
          await this.handleSubscriptionCreated(event.data.object as Stripe.Subscription);
          break;
          
        case 'customer.subscription.updated':
          await this.handleSubscriptionUpdated(event.data.object as Stripe.Subscription);
          break;
          
        case 'customer.subscription.deleted':
          await this.handleSubscriptionDeleted(event.data.object as Stripe.Subscription);
          break;
          
        case 'invoice.payment_succeeded':
          await this.handlePaymentSucceeded(event.data.object as Stripe.Invoice);
          break;
          
        case 'invoice.payment_failed':
          await this.handlePaymentFailed(event.data.object as Stripe.Invoice);
          break;
          
        default:
          console.log(`Unhandled event type: ${event.type}`);
      }
      
      return { received: true };
    } catch (error) {
      console.error('Webhook error:', error);
      throw error;
    }
  }
  
  private static async handleSubscriptionCreated(subscription: Stripe.Subscription) {
    const customer = await stripe.customers.retrieve(subscription.customer as string);
    
    if (customer.deleted) return;
    
    // Find user by email
    const user = await User.findOne({ email: customer.email });
    if (!user) return;
    
    // Create subscription record
    const subscriptionDoc = new Subscription({
      stripeSubscriptionId: subscription.id,
      stripeCustomerId: subscription.customer,
      stripePriceId: subscription.items.data[0].price.id,
      stripeProductId: subscription.items.data[0].price.product as string,
      userId: user._id,
      plan: this.getPlanFromPriceId(subscription.items.data[0].price.id),
      status: subscription.status as any,
      interval: subscription.items.data[0].price.recurring?.interval as any,
      amount: subscription.items.data[0].price.unit_amount || 0,
      currency: subscription.items.data[0].price.currency,
      currentPeriodStart: new Date((subscription as any).current_period_start * 1000),
      currentPeriodEnd: new Date((subscription as any).current_period_end * 1000),
      features: this.getPlanFeatures(subscription.items.data[0].price.id)
    });
    
    await subscriptionDoc.save();
    
    // Update user subscription info
    user.subscription = {
      stripeCustomerId: subscription.customer as string,
      stripeSubscriptionId: subscription.id,
      stripePriceId: subscription.items.data[0].price.id,
      stripeCurrentPeriodEnd: new Date((subscription as any).current_period_end * 1000),
      status: subscription.status as any
    };
    user.plan = this.getPlanFromPriceId(subscription.items.data[0].price.id);
    
    await user.save();
  }
  
  private static async handleSubscriptionUpdated(subscription: Stripe.Subscription) {
    await Subscription.findOneAndUpdate(
      { stripeSubscriptionId: subscription.id },
      {
        status: subscription.status,
        stripePriceId: subscription.items.data[0].price.id,
        amount: subscription.items.data[0].price.unit_amount || 0,
        currentPeriodStart: new Date((subscription as any).current_period_start * 1000),
        currentPeriodEnd: new Date((subscription as any).current_period_end * 1000),
        features: this.getPlanFeatures(subscription.items.data[0].price.id)
      }
    );
    
    // Update user
    await User.findOneAndUpdate(
      { 'subscription.stripeSubscriptionId': subscription.id },
      {
        'subscription.status': subscription.status,
        'subscription.stripePriceId': subscription.items.data[0].price.id,
        'subscription.stripeCurrentPeriodEnd': new Date((subscription as any).current_period_end * 1000),
        plan: this.getPlanFromPriceId(subscription.items.data[0].price.id)
      }
    );
  }
  
  private static async handleSubscriptionDeleted(subscription: Stripe.Subscription) {
    await Subscription.findOneAndUpdate(
      { stripeSubscriptionId: subscription.id },
      {
        status: 'canceled',
        canceledAt: new Date()
      }
    );
    
    // Downgrade user to free plan
    await User.findOneAndUpdate(
      { 'subscription.stripeSubscriptionId': subscription.id },
      {
        plan: 'free',
        'subscription.status': 'canceled'
      }
    );
  }
  
  private static async handlePaymentSucceeded(invoice: Stripe.Invoice) {
    const subscription = await Subscription.findOne({
      stripeSubscriptionId: invoice.subscription
    });
    
    if (subscription) {
      subscription.paymentHistory.push({
        stripeInvoiceId: invoice.id,
        amount: invoice.amount_paid,
        currency: invoice.currency,
        status: 'paid',
        paidAt: new Date(invoice.status_transitions.paid_at! * 1000),
        dueDate: new Date(invoice.due_date! * 1000),
        url: invoice.hosted_invoice_url || undefined
      });
      
      await subscription.save();
    }
  }
  
  private static async handlePaymentFailed(invoice: Stripe.Invoice) {
    const subscription = await Subscription.findOne({
      stripeSubscriptionId: invoice.subscription
    });
    
    if (subscription) {
      subscription.paymentHistory.push({
        stripeInvoiceId: invoice.id,
        amount: invoice.amount_due,
        currency: invoice.currency,
        status: 'failed',
        dueDate: new Date(invoice.due_date! * 1000)
      });
      
      await subscription.save();
    }
  }
  
  private static getPlanFromPriceId(priceId: string): 'free' | 'premium' | 'enterprise' | 'team' {
    // Map price IDs to plans - configure these in your Stripe dashboard
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
  
  private static getPlanFeatures(priceId: string) {
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
  
  // Get pricing plans
  static getPricingPlans() {
    return [
      {
        id: 'free',
        name: 'Free',
        description: 'Perfect for personal use',
        price: { monthly: 0, yearly: 0 },
        stripePriceIds: { monthly: '', yearly: '' },
        features: {
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
        }
      },
      {
        id: 'premium',
        name: 'Premium',
        description: 'For professionals and small businesses',
        price: { monthly: 999, yearly: 9999 }, // in cents
        stripePriceIds: { 
          monthly: 'price_premium_monthly', 
          yearly: 'price_premium_yearly' 
        },
        features: {
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
        popular: true
      },
      {
        id: 'enterprise',
        name: 'Enterprise',
        description: 'For large organizations',
        price: { monthly: 4999, yearly: 49999 },
        stripePriceIds: { 
          monthly: 'price_enterprise_monthly', 
          yearly: 'price_enterprise_yearly' 
        },
        features: {
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
      }
    ];
  }
}

export { stripe };
export default StripeService;