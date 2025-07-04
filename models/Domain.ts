import mongoose, { Schema, Document } from 'mongoose';

export interface IDomain extends Document {
  _id: string;
  domain: string;
  subdomain?: string;
  
  userId?: mongoose.Types.ObjectId;
  teamId?: mongoose.Types.ObjectId;
  
  type: 'system' | 'custom' | 'subdomain';
  isCustom: boolean;
  isVerified: boolean;
  isActive: boolean;
  sslEnabled: boolean;
  
  verificationCode?: string;
  verificationMethod: 'dns' | 'file' | 'meta';
  dnsRecords: {
    type: 'A' | 'CNAME' | 'TXT';
    name: string;
    value: string;
    verified: boolean;
    verifiedAt?: Date;
  }[];
  
  ssl: {
    provider: 'letsencrypt' | 'cloudflare' | 'custom';
    issuer?: string;
    validFrom?: Date;
    validTo?: Date;
    autoRenew: boolean;
  };
  
  settings: {
    redirectType: 301 | 302;
    forceHttps: boolean;
    enableCompression: boolean;
    cacheControl: string;
    branding?: {
      logo?: string;
      favicon?: string;
      customCss?: string;
      metaTitle?: string;
      metaDescription?: string;
      customFooter?: string;
    };
    security: {
      enableCaptcha: boolean;
      ipWhitelist: string[];
      ipBlacklist: string[];
      rateLimiting: {
        enabled: boolean;
        requestsPerMinute: number;
      };
    };
  };
  
  usage: {
    linksCount: number;
    clicksCount: number;
    bandwidthUsed: number;
    lastUpdated: Date;
  };
  
  lastUsedAt?: Date;
  isDeleted: boolean;
  deletedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

const DomainSchema = new Schema<IDomain>({
  domain: { 
    type: String, 
    required: true, 
    lowercase: true,
    trim: true,
    validate: {
      validator: function(v: string) {
        return /^(localhost:\d+|[a-z0-9.-]+\.[a-z]{2,})$/i.test(v);
      },
      message: 'Invalid domain format'
    }
  },
  subdomain: { 
    type: String,
    lowercase: true,
    trim: true
  },
  
  userId: { type: Schema.Types.ObjectId, ref: 'User' },
  teamId: { type: Schema.Types.ObjectId, ref: 'Team' },
  
  type: { 
    type: String, 
    enum: ['system', 'custom', 'subdomain'], 
    required: true
  },
  isCustom: { type: Boolean, default: false },
  isVerified: { type: Boolean, default: false },
  isActive: { type: Boolean, default: false },
  sslEnabled: { type: Boolean, default: false },
  
  verificationCode: { type: String },
  verificationMethod: { 
    type: String, 
    enum: ['dns', 'file', 'meta'], 
    default: 'dns' 
  },
  dnsRecords: [{
    type: { type: String, enum: ['A', 'CNAME', 'TXT'], required: true },
    name: { type: String, required: true },
    value: { type: String, required: true },
    verified: { type: Boolean, default: false },
    verifiedAt: { type: Date }
  }],
  
  ssl: {
    provider: { 
      type: String, 
      enum: ['letsencrypt', 'cloudflare', 'custom'], 
      default: 'letsencrypt' 
    },
    issuer: { type: String },
    validFrom: { type: Date },
    validTo: { type: Date },
    autoRenew: { type: Boolean, default: true }
  },
  
  settings: {
    redirectType: { type: Number, enum: [301, 302], default: 301 },
    forceHttps: { type: Boolean, default: true },
    enableCompression: { type: Boolean, default: true },
    cacheControl: { type: String, default: 'public, max-age=3600' },
    branding: {
      logo: { type: String },
      favicon: { type: String },
      customCss: { type: String },
      metaTitle: { type: String },
      metaDescription: { type: String },
      customFooter: { type: String }
    },
    security: {
      enableCaptcha: { type: Boolean, default: false },
      ipWhitelist: [{ type: String }],
      ipBlacklist: [{ type: String }],
      rateLimiting: {
        enabled: { type: Boolean, default: true },
        requestsPerMinute: { type: Number, default: 60 }
      }
    }
  },
  
  usage: {
    linksCount: { type: Number, default: 0, min: 0 },
    clicksCount: { type: Number, default: 0, min: 0 },
    bandwidthUsed: { type: Number, default: 0, min: 0 },
    lastUpdated: { type: Date, default: Date.now }
  },
  
  lastUsedAt: { type: Date },
  isDeleted: { type: Boolean, default: false },
  deletedAt: { type: Date }
}, {
  timestamps: true
});

// Clean indexes - no duplicates
DomainSchema.index({ domain: 1 }, { unique: true });
DomainSchema.index({ userId: 1, isDeleted: 1 });
DomainSchema.index({ teamId: 1, isDeleted: 1 });
DomainSchema.index({ type: 1, isActive: 1 });
DomainSchema.index({ isVerified: 1, isActive: 1 });

export const Domain = mongoose.models.Domain || mongoose.model<IDomain>('Domain', DomainSchema);
