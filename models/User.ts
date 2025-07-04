import mongoose, { Schema, Document } from 'mongoose';
import * as bcrypt from 'bcryptjs';

export interface IUser extends Document {
  _id: string;
  name: string;
  email: string;
  password?: string;
  image?: string;
  emailVerified?: Date;
  role: 'user' | 'admin' | 'moderator';
  plan: 'free' | 'premium' | 'enterprise';
  
  subscription: {
    stripeCustomerId?: string;
    stripeSubscriptionId?: string;
    stripePriceId?: string;
    stripeCurrentPeriodEnd?: Date;
    status: 'active' | 'inactive' | 'canceled' | 'past_due';
  };
  
  usage: {
    linksCount: number;
    clicksCount: number;
    monthlyLinks: number;
    monthlyClicks: number;
    resetDate: Date;
    lastUpdated: Date;
  };
  
  preferences: {
    defaultDomain?: string;
    customDomain?: string;
    timezone: string;
    language: string;
    dateFormat: string;
    notifications: {
      email: boolean;
      marketing: boolean;
      security: boolean;
      analytics: boolean;
    };
    privacy: {
      publicProfile: boolean;
      shareAnalytics: boolean;
    };
  };
  
  team?: {
    teamId: mongoose.Types.ObjectId;
    role: 'owner' | 'admin' | 'member' | 'viewer';
    joinedAt: Date;
  };
  
  security: {
    twoFactorEnabled: boolean;
    twoFactorSecret?: string;
    loginAttempts: number;
    lockedUntil?: Date;
    lastPasswordChange?: Date;
    ipWhitelist: string[];
  };
  
  createdAt: Date;
  updatedAt: Date;
  lastLoginAt?: Date;
  lastActiveAt?: Date;
  isActive: boolean;
  isEmailVerified: boolean;
  isDeleted: boolean;
  deletedAt?: Date;
  
  // Methods
  comparePassword(candidatePassword: string): Promise<boolean>;
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
    trim: true
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
    default: 'user'
  },
  plan: { 
    type: String, 
    enum: ['free', 'premium', 'enterprise'], 
    default: 'free'
  },
  
  subscription: {
    stripeCustomerId: { type: String },
    stripeSubscriptionId: { type: String },
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
  
  isActive: { type: Boolean, default: true },
  isEmailVerified: { type: Boolean, default: false },
  lastLoginAt: { type: Date },
  lastActiveAt: { type: Date },
  isDeleted: { type: Boolean, default: false },
  deletedAt: { type: Date }
}, {
  timestamps: true
});

// Indexes - NO DUPLICATES
UserSchema.index({ email: 1 }, { unique: true });
UserSchema.index({ role: 1, plan: 1 });
UserSchema.index({ 'subscription.stripeCustomerId': 1 });
UserSchema.index({ isDeleted: 1, isActive: 1 });
UserSchema.index({ 'team.teamId': 1 });

// Pre-save middleware for password hashing
UserSchema.pre('save', async function(next) {
  if (!this.isModified('password')) return next();
  
  try {
    this.password = await bcrypt.hash(this.password!, 10);
    next();
  } catch (error) {
    next(error as Error);
  }
});

// Instance method for password comparison
UserSchema.methods.comparePassword = async function(candidatePassword: string): Promise<boolean> {
  if (!this.password) return false;
  return bcrypt.compare(candidatePassword, this.password);
};

export const User = mongoose.models.User || mongoose.model<IUser>('User', UserSchema);

