// ============= models/User.ts =============
import mongoose, { Schema, Document } from 'mongoose';

export interface IUser extends Document {
  _id: string;
  name: string;
  email: string;
  password?: string;
  image?: string;
  emailVerified?: Date;
  role: 'user' | 'admin' | 'moderator';
  plan: 'free' | 'premium' | 'enterprise';
  
  // Subscription info
  subscription?: {
    stripeCustomerId?: string;
    stripeSubscriptionId?: string;
    stripePriceId?: string;
    stripeCurrentPeriodEnd?: Date;
    status: 'active' | 'inactive' | 'canceled' | 'past_due';
  };
  
  // Usage tracking (synced with URL and Analytics models)
  usage: {
    linksCount: number;        // Total links created (sync with URL count)
    clicksCount: number;       // Total clicks received (sync with Analytics)
    monthlyLinks: number;      // Current month links (resets monthly)
    monthlyClicks: number;     // Current month clicks (resets monthly)
    resetDate: Date;           // When monthly counters reset
    lastUpdated: Date;         // Last sync timestamp
  };
  
  // User preferences
  preferences: {
    defaultDomain?: string;    // Default domain for new links
    customDomain?: string;     // User's custom domain
    timezone: string;          // User timezone for analytics
    language: string;          // UI language
    dateFormat: string;        // Date display format
    notifications: {
      email: boolean;
      marketing: boolean;
      security: boolean;
      analytics: boolean;      // Weekly/monthly reports
    };
    privacy: {
      publicProfile: boolean;
      shareAnalytics: boolean;
    };
  };
  
  // Team association
  team?: {
    teamId: mongoose.Types.ObjectId;
    role: 'owner' | 'admin' | 'member' | 'viewer';
    joinedAt: Date;
  };
  
  // Security & activity
  security: {
    twoFactorEnabled: boolean;
    twoFactorSecret?: string;
    loginAttempts: number;
    lockedUntil?: Date;
    lastPasswordChange?: Date;
    ipWhitelist: string[];
  };
  
  // Timestamps and status
  createdAt: Date;
  updatedAt: Date;
  lastLoginAt?: Date;
  lastActiveAt?: Date;
  isActive: boolean;
  isEmailVerified: boolean;
  isDeleted: boolean;
  deletedAt?: Date;
}

const UserSchema = new Schema<IUser>({
  name: { 
    type: String, 
    required: true, 
    trim: true,
    maxlength: 100 
  },
  email: { 
    type: String, 
    required: true, 
    unique: true, 
    lowercase: true,
    trim: true,
    index: true
  },
  password: { 
    type: String,
    minlength: 6
  },
  image: { type: String },
  emailVerified: { type: Date },
  role: { 
    type: String, 
    enum: ['user', 'admin', 'moderator'], 
    default: 'user',
    index: true
  },
  plan: { 
    type: String, 
    enum: ['free', 'premium', 'enterprise'], 
    default: 'free',
    index: true
  },
  
  subscription: {
    stripeCustomerId: { type: String, index: true },
    stripeSubscriptionId: { type: String, index: true },
    stripePriceId: { type: String },
    stripeCurrentPeriodEnd: { type: Date },
    status: { 
      type: String, 
      enum: ['active', 'inactive', 'canceled', 'past_due'],
      default: 'inactive'
    }
  },
  
  usage: {
    linksCount: { type: Number, default: 0, min: 0 },
    clicksCount: { type: Number, default: 0, min: 0 },
    monthlyLinks: { type: Number, default: 0, min: 0 },
    monthlyClicks: { type: Number, default: 0, min: 0 },
    resetDate: { type: Date, default: Date.now },
    lastUpdated: { type: Date, default: Date.now }
  },
  
  preferences: {
    defaultDomain: { type: String },
    customDomain: { type: String },
    timezone: { type: String, default: 'UTC' },
    language: { type: String, default: 'en' },
    dateFormat: { type: String, default: 'MM/DD/YYYY' },
    notifications: {
      email: { type: Boolean, default: true },
      marketing: { type: Boolean, default: false },
      security: { type: Boolean, default: true },
      analytics: { type: Boolean, default: true }
    },
    privacy: {
      publicProfile: { type: Boolean, default: false },
      shareAnalytics: { type: Boolean, default: false }
    }
  },
  
  team: {
    teamId: { type: Schema.Types.ObjectId, ref: 'Team' },
    role: { 
      type: String, 
      enum: ['owner', 'admin', 'member', 'viewer'] 
    },
    joinedAt: { type: Date }
  },
  
  security: {
    twoFactorEnabled: { type: Boolean, default: false },
    twoFactorSecret: { type: String },
    loginAttempts: { type: Number, default: 0 },
    lockedUntil: { type: Date },
    lastPasswordChange: { type: Date },
    ipWhitelist: [{ type: String }]
  },
  
  lastLoginAt: { type: Date },
  lastActiveAt: { type: Date },
  isActive: { type: Boolean, default: true, index: true },
  isEmailVerified: { type: Boolean, default: false },
  isDeleted: { type: Boolean, default: false, index: true },
  deletedAt: { type: Date }
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Indexes for performance
UserSchema.index({ email: 1, isDeleted: 1 });
UserSchema.index({ plan: 1, isActive: 1 });
UserSchema.index({ 'team.teamId': 1 });
UserSchema.index({ createdAt: -1 });

// Virtual for plan limits
UserSchema.virtual('planLimits').get(function() {
  const limits = {
    free: { links: 5, clicks: 1000, customDomain: false, analytics: false },
    premium: { links: -1, clicks: -1, customDomain: true, analytics: true },
    enterprise: { links: -1, clicks: -1, customDomain: true, analytics: true }
  };
  return limits[this.plan];
});

export const User = mongoose.models.User || mongoose.model<IUser>('User', UserSchema);
