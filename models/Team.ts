// ============= models/Team.ts =============
import mongoose, { Schema, Document } from 'mongoose';
export interface ITeam extends Document {
  _id: string;
  name: string;
  description?: string;
  slug: string; // Unique team identifier
  logo?: string;
  
  // Ownership
  ownerId: mongoose.Types.ObjectId;
  
  // Members with roles
  members: {
    userId: mongoose.Types.ObjectId;
    role: 'owner' | 'admin' | 'member' | 'viewer';
    permissions: {
      createLinks: boolean;
      editLinks: boolean;
      deleteLinks: boolean;
      viewAnalytics: boolean;
      manageTeam: boolean;
      manageBilling: boolean;
    };
    joinedAt: Date;
    invitedBy: mongoose.Types.ObjectId;
    status: 'active' | 'pending' | 'suspended';
  }[];
  
  // Plan and billing
  plan: 'team' | 'enterprise';
  billing: {
    stripeCustomerId?: string;
    stripeSubscriptionId?: string;
    stripePriceId?: string;
    billingEmail: string;
    billingAddress?: {
      line1: string;
      line2?: string;
      city: string;
      state: string;
      postal_code: string;
      country: string;
    };
  };
  
  // Team settings
  settings: {
    defaultDomain?: string;
    customDomains: string[];
    allowCustomDomains: boolean;
    requireApproval: boolean;
    maxMembers: number;
    linkRetention: number; // Days to keep deleted links
    enforceSSO: boolean;
    allowGuestLinks: boolean;
    branding: {
      primaryColor?: string;
      logo?: string;
      customCss?: string;
    };
  };
  
  // Usage tracking (synced with User and URL models)
  usage: {
    linksCount: number;
    clicksCount: number;
    membersCount: number;
    storageUsed: number; // In bytes
    lastUpdated: Date;
  };
  
  // Limits based on plan
  limits: {
    maxMembers: number;
    maxLinks: number;
    maxClicks: number;
    maxStorage: number;
    customDomains: number;
  };
  
  // Status and timestamps
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
  isDeleted: boolean;
  deletedAt?: Date;
}

const TeamSchema = new Schema<ITeam>({
  name: { 
    type: String, 
    required: true,
    maxlength: 100,
    trim: true
  },
  description: { 
    type: String, 
    maxlength: 500,
    trim: true
  },
  slug: { 
    type: String, 
    required: true, 
    unique: true,
    lowercase: true,
    match: /^[a-z0-9-]+$/,
    index: true
  },
  logo: { type: String },
  
  ownerId: { 
    type: Schema.Types.ObjectId, 
    ref: 'User', 
    required: true,
    index: true
  },
  
  members: [{
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    role: { 
      type: String, 
      enum: ['owner', 'admin', 'member', 'viewer'], 
      required: true 
    },
    permissions: {
      createLinks: { type: Boolean, default: true },
      editLinks: { type: Boolean, default: true },
      deleteLinks: { type: Boolean, default: false },
      viewAnalytics: { type: Boolean, default: true },
      manageTeam: { type: Boolean, default: false },
      manageBilling: { type: Boolean, default: false }
    },
    joinedAt: { type: Date, default: Date.now },
    invitedBy: { type: Schema.Types.ObjectId, ref: 'User' },
    status: { 
      type: String, 
      enum: ['active', 'pending', 'suspended'], 
      default: 'pending' 
    }
  }],
  
  plan: { 
    type: String, 
    enum: ['team', 'enterprise'], 
    default: 'team',
    index: true
  },
  billing: {
    stripeCustomerId: { type: String, index: true },
    stripeSubscriptionId: { type: String, index: true },
    stripePriceId: { type: String },
    billingEmail: { type: String, required: true },
    billingAddress: {
      line1: { type: String },
      line2: { type: String },
      city: { type: String },
      state: { type: String },
      postal_code: { type: String },
      country: { type: String }
    }
  },
  
  settings: {
    defaultDomain: { type: String },
    customDomains: [{ type: String }],
    allowCustomDomains: { type: Boolean, default: false },
    requireApproval: { type: Boolean, default: false },
    maxMembers: { type: Number, default: 10 },
    linkRetention: { type: Number, default: 30 },
    enforceSSO: { type: Boolean, default: false },
    allowGuestLinks: { type: Boolean, default: true },
    branding: {
      primaryColor: { type: String, default: '#3B82F6' },
      logo: { type: String },
      customCss: { type: String }
    }
  },
  
  usage: {
    linksCount: { type: Number, default: 0, min: 0 },
    clicksCount: { type: Number, default: 0, min: 0 },
    membersCount: { type: Number, default: 1, min: 1 },
    storageUsed: { type: Number, default: 0, min: 0 },
    lastUpdated: { type: Date, default: Date.now }
  },
  
  limits: {
    maxMembers: { type: Number, default: 10 },
    maxLinks: { type: Number, default: 1000 },
    maxClicks: { type: Number, default: 10000 },
    maxStorage: { type: Number, default: 1000000000 }, // 1GB
    customDomains: { type: Number, default: 1 }
  },
  
  isActive: { type: Boolean, default: true, index: true },
  isDeleted: { type: Boolean, default: false, index: true },
  deletedAt: { type: Date }
}, {
  timestamps: true
});

// Indexes
TeamSchema.index({ ownerId: 1, isDeleted: 1 });
TeamSchema.index({ 'members.userId': 1 });
TeamSchema.index({ plan: 1, isActive: 1 });

export const Team = mongoose.models.Team || mongoose.model<ITeam>('Team', TeamSchema);
