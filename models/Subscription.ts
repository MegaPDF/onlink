// ============= models/Subscription.ts =============
import mongoose, { Schema, Document } from 'mongoose';
export interface ISubscription extends Document {
  _id: string;
  
  // Stripe integration
  stripeSubscriptionId: string;
  stripeCustomerId: string;
  stripePriceId: string;
  stripeProductId: string;
  
  // Ownership
  userId?: mongoose.Types.ObjectId;
  teamId?: mongoose.Types.ObjectId;
  
  // Subscription details
  plan: 'free' | 'premium' | 'enterprise' | 'team';
  status: 'active' | 'inactive' | 'canceled' | 'past_due' | 'unpaid' | 'trialing';
  interval: 'month' | 'year';
  
  // Pricing
  amount: number; // In cents
  currency: string;
  
  // Billing periods
  currentPeriodStart: Date;
  currentPeriodEnd: Date;
  trialStart?: Date;
  trialEnd?: Date;
  
  // Features and limits
  features: {
    maxLinks: number; // -1 for unlimited
    maxClicks: number; // -1 for unlimited
    customDomains: number;
    teamMembers: number;
    analytics: boolean;
    qrCodes: boolean;
    bulkOperations: boolean;
    apiAccess: boolean;
    prioritySupport: boolean;
    whiteLabel: boolean;
  };
  
  // Add-ons
  addOns: {
    id: string;
    name: string;
    stripePriceId: string;
    amount: number;
    quantity: number;
  }[];
  
  // Payment history
  paymentHistory: {
    stripeInvoiceId: string;
    amount: number;
    currency: string;
    status: 'paid' | 'pending' | 'failed';
    paidAt?: Date;
    dueDate: Date;
    url?: string;
  }[];
  
  // Cancellation
  cancelAt?: Date;
  canceledAt?: Date;
  cancellationReason?: string;
  
  // Timestamps
  createdAt: Date;
  updatedAt: Date;
}

const SubscriptionSchema = new Schema<ISubscription>({
  stripeSubscriptionId: { 
    type: String, 
    required: true, 
    unique: true,
    index: true
  },
  stripeCustomerId: { 
    type: String, 
    required: true,
    index: true
  },
  stripePriceId: { type: String, required: true },
  stripeProductId: { type: String, required: true },
  
  userId: { 
    type: Schema.Types.ObjectId, 
    ref: 'User',
    index: true
  },
  teamId: { 
    type: Schema.Types.ObjectId, 
    ref: 'Team',
    index: true
  },
  
  plan: { 
    type: String, 
    enum: ['free', 'premium', 'enterprise', 'team'], 
    required: true,
    index: true
  },
  status: { 
    type: String, 
    enum: ['active', 'inactive', 'canceled', 'past_due', 'unpaid', 'trialing'], 
    required: true,
    index: true
  },
  interval: { 
    type: String, 
    enum: ['month', 'year'], 
    required: true 
  },
  
  amount: { type: Number, required: true, min: 0 },
  currency: { type: String, required: true, default: 'usd' },
  
  currentPeriodStart: { type: Date, required: true },
  currentPeriodEnd: { type: Date, required: true, index: true },
  trialStart: { type: Date },
  trialEnd: { type: Date },
  
  features: {
    maxLinks: { type: Number, default: -1 },
    maxClicks: { type: Number, default: -1 },
    customDomains: { type: Number, default: 0 },
    teamMembers: { type: Number, default: 1 },
    analytics: { type: Boolean, default: false },
    qrCodes: { type: Boolean, default: false },
    bulkOperations: { type: Boolean, default: false },
    apiAccess: { type: Boolean, default: false },
    prioritySupport: { type: Boolean, default: false },
    whiteLabel: { type: Boolean, default: false }
  },
  
  addOns: [{
    id: { type: String, required: true },
    name: { type: String, required: true },
    stripePriceId: { type: String, required: true },
    amount: { type: Number, required: true },
    quantity: { type: Number, default: 1 }
  }],
  
  paymentHistory: [{
    stripeInvoiceId: { type: String, required: true },
    amount: { type: Number, required: true },
    currency: { type: String, required: true },
    status: { type: String, enum: ['paid', 'pending', 'failed'], required: true },
    paidAt: { type: Date },
    dueDate: { type: Date, required: true },
    url: { type: String }
  }],
  
  cancelAt: { type: Date },
  canceledAt: { type: Date },
  cancellationReason: { type: String }
}, {
  timestamps: true
});

// Indexes
SubscriptionSchema.index({ userId: 1, status: 1 });
SubscriptionSchema.index({ teamId: 1, status: 1 });
SubscriptionSchema.index({ currentPeriodEnd: 1, status: 1 });

export const Subscription = mongoose.models.Subscription || mongoose.model<ISubscription>('Subscription', SubscriptionSchema);
