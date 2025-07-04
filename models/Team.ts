import mongoose, { Schema, Document } from 'mongoose';

export interface ITeam extends Document {
  _id: string;
  name: string;
  description?: string;
  slug: string;
  logo?: string;
  
  ownerId: mongoose.Types.ObjectId;
  
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
    invitedBy?: mongoose.Types.ObjectId;
    status: 'active' | 'pending' | 'suspended';
  }[];
  
  plan: 'team' | 'enterprise';
  billing: {
    stripeCustomerId?: string;
    stripeSubscriptionId?: string;
    stripePriceId?: string;
    billingEmail: string;
    billingAddress?: {
      line1?: string;
      line2?: string;
      city?: string;
      state?: string;
      postal_code?: string;
      country?: string;
    };
  };
  
  settings: {
    defaultDomain?: string;
    customDomains: string[];
    allowCustomDomains: boolean;
    requireApproval: boolean;
    maxMembers: number;
    linkRetention: number;
    enforceSSO: boolean;
    allowGuestLinks: boolean;
    branding?: {
      primaryColor?: string;
      logo?: string;
      customCss?: string;
    };
  };
  
  usage: {
    linksCount: number;
    clicksCount: number;
    membersCount: number;
    storageUsed: number;
    lastUpdated: Date;
  };
  
  limits: {
    maxMembers: number;
    maxLinks: number;
    maxClicks: number;
    maxStorage: number;
    customDomains: number;
  };
  
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
    lowercase: true,
    match: /^[a-z0-9-]+$/
  },
  logo: { type: String },
  
  ownerId: { 
    type: Schema.Types.ObjectId, 
    ref: 'User', 
    required: true
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
    default: 'team'
  },
  
  billing: {
    stripeCustomerId: { type: String },
    stripeSubscriptionId: { type: String },
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
    maxLinks: { type: Number, default: -1 },
    maxClicks: { type: Number, default: -1 },
    maxStorage: { type: Number, default: 10737418240 }, // 10GB
    customDomains: { type: Number, default: 3 }
  },
  
  isActive: { type: Boolean, default: true },
  isDeleted: { type: Boolean, default: false },
  deletedAt: { type: Date }
}, {
  timestamps: true
});

// Clean indexes
TeamSchema.index({ slug: 1 }, { unique: true });
TeamSchema.index({ ownerId: 1 });
TeamSchema.index({ 'members.userId': 1 });
TeamSchema.index({ plan: 1, isActive: 1 });
TeamSchema.index({ isDeleted: 1 });

export const Team = mongoose.models.Team || mongoose.model<ITeam>('Team', TeamSchema);
