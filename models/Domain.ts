// ============= models/Domain.ts =============
import mongoose, { Schema, Document } from 'mongoose';
export interface IDomain extends Document {
  _id: string;
  domain: string;
  subdomain?: string; // For subdomains like 'app.example.com'
  
  // Ownership
  userId?: mongoose.Types.ObjectId;
  teamId?: mongoose.Types.ObjectId;
  
  // Domain type and status
  type: 'system' | 'custom' | 'subdomain';
  isCustom: boolean;
  isVerified: boolean;
  isActive: boolean;
  sslEnabled: boolean;
  
  // Verification
  verificationCode?: string;
  verificationMethod: 'dns' | 'file' | 'meta';
  dnsRecords: {
    type: 'A' | 'CNAME' | 'TXT';
    name: string;
    value: string;
    verified: boolean;
    verifiedAt?: Date;
  }[];
  
  // SSL Certificate
  ssl: {
    provider: 'letsencrypt' | 'cloudflare' | 'custom';
    issuer?: string;
    validFrom?: Date;
    validTo?: Date;
    autoRenew: boolean;
  };
  
  // Domain settings
  settings: {
    redirectType: 301 | 302;
    forceHttps: boolean;
    enableCompression: boolean;
    cacheControl: string;
    branding: {
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
  
  // Usage statistics (synced with URL model)
  usage: {
    linksCount: number;
    clicksCount: number;
    bandwidthUsed: number; // In bytes
    lastUpdated: Date;
  };
  
  // Timestamps and status
  createdAt: Date;
  updatedAt: Date;
  lastUsedAt?: Date;
  isDeleted: boolean;
  deletedAt?: Date;
}

const DomainSchema = new Schema<IDomain>({
  domain: { 
    type: String, 
    required: true, 
    unique: true,
    lowercase: true,
    trim: true,
    index: true,
    validate: {
      validator: function(v: string) {
        return /^[a-z0-9.-]+\.[a-z]{2,}$/.test(v);
      },
      message: 'Invalid domain format'
    }
  },
  subdomain: { 
    type: String,
    lowercase: true,
    trim: true
  },
  
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
  
  type: { 
    type: String, 
    enum: ['system', 'custom', 'subdomain'], 
    required: true,
    index: true
  },
  isCustom: { type: Boolean, default: false, index: true },
  isVerified: { type: Boolean, default: false, index: true },
  isActive: { type: Boolean, default: false, index: true },
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
  isDeleted: { type: Boolean, default: false, index: true },
  deletedAt: { type: Date }
}, {
  timestamps: true
});

// Indexes
DomainSchema.index({ userId: 1, isDeleted: 1 });
DomainSchema.index({ teamId: 1, isDeleted: 1 });
DomainSchema.index({ type: 1, isActive: 1 });
DomainSchema.index({ isVerified: 1, isActive: 1 });

export const Domain = mongoose.models.Domain || mongoose.model<IDomain>('Domain', DomainSchema);
