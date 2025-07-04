// ============= types/billing.ts =============
export interface Subscription {
  _id: string;
  stripeSubscriptionId: string;
  stripeCustomerId: string;
  stripePriceId: string;
  stripeProductId: string;
  
  userId?: string;
  teamId?: string;
  
  plan: 'free' | 'premium' | 'enterprise' | 'team';
  status: 'active' | 'inactive' | 'canceled' | 'past_due' | 'unpaid' | 'trialing';
  interval: 'month' | 'year';
  
  amount: number;
  currency: string;
  
  currentPeriodStart: Date;
  currentPeriodEnd: Date;
  trialStart?: Date;
  trialEnd?: Date;
  
  features: {
    maxLinks: number;
    maxClicks: number;
    customDomains: number;
    teamMembers: number;
    analytics: boolean;
    qrCodes: boolean;
    bulkOperations: boolean;
    apiAccess: boolean;
    prioritySupport: boolean;
    whiteLabel: boolean;
  };
  
  addOns: {
    id: string;
    name: string;
    stripePriceId: string;
    amount: number;
    quantity: number;
  }[];
  
  paymentHistory: {
    stripeInvoiceId: string;
    amount: number;
    currency: string;
    status: 'paid' | 'pending' | 'failed';
    paidAt?: Date;
    dueDate: Date;
    url?: string;
  }[];
  
  cancelAt?: Date;
  canceledAt?: Date;
  cancellationReason?: string;
  
  createdAt: Date;
  updatedAt: Date;
}

export interface PlanFeatures {
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
}

export interface PricingPlan {
  id: string;
  name: string;
  description: string;
  price: {
    monthly: number;
    yearly: number;
  };
  stripePriceIds: {
    monthly: string;
    yearly: string;
  };
  features: PlanFeatures;
  popular?: boolean;
  badge?: string;
}

export interface Invoice {
  id: string;
  stripeInvoiceId: string;
  amount: number;
  currency: string;
  status: 'paid' | 'pending' | 'failed' | 'draft';
  description?: string;
  paidAt?: Date;
  dueDate: Date;
  url?: string;
  downloadUrl?: string;
  items: {
    description: string;
    amount: number;
    quantity: number;
  }[];
}

export interface PaymentMethod {
  id: string;
  type: 'card' | 'bank_account';
  card?: {
    brand: string;
    last4: string;
    expMonth: number;
    expYear: number;
  };
  isDefault: boolean;
}

export interface BillingInfo {
  email: string;
  name: string;
  address?: {
    line1: string;
    line2?: string;
    city: string;
    state: string;
    postal_code: string;
    country: string;
  };
  taxId?: string;
}

export interface CreateSubscriptionRequest {
  priceId: string;
  paymentMethodId?: string;
  billingInfo: BillingInfo;
  addOns?: string[];
}

export interface UpdateSubscriptionRequest {
  priceId?: string;
  addOns?: string[];
  billingInfo?: BillingInfo;
}

export interface CancelSubscriptionRequest {
  reason: string;
  feedback?: string;
  cancelImmediately?: boolean;
}

export interface BillingStats {
  totalRevenue: number;
  monthlyRecurringRevenue: number;
  annualRecurringRevenue: number;
  activeSubscriptions: number;
  trialSubscriptions: number;
  canceledSubscriptions: number;
  churnRate: number;
  averageRevenuePerUser: number;
  revenueByPlan: {
    [planName: string]: number;
  };
}
