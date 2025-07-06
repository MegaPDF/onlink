// models/URL.ts (Updated to support anonymous users)
import mongoose, { Schema, Document } from 'mongoose';

export interface IURL extends Document {
  _id: string;
  originalUrl: string;
  shortCode: string;
  customSlug?: string;
  
  // Make userId optional for anonymous users
  userId?: mongoose.Types.ObjectId | null;
  teamId?: mongoose.Types.ObjectId;
  folderId?: mongoose.Types.ObjectId;
  
  title?: string;
  description?: string;
  tags: string[];
  favicon?: string;
  
  domain: string;
  customDomain?: string;
  
  qrCode?: {
    url: string;
    downloadUrl?: string;
    style?: {
      size: number;
      color: string;
      backgroundColor: string;
      logo?: string;
    };
  };
  
  isActive: boolean;
  isPublic: boolean;
  isPasswordProtected: boolean;
  password?: string;
  
  expiresAt?: Date;
  clickLimit?: number;
  geoRestrictions?: {
    allowedCountries?: string[];
    blockedCountries?: string[];
  };
  deviceRestrictions?: {
    mobile: boolean;
    desktop: boolean;
    tablet: boolean;
  };
  timeRestrictions?: {
    enabled: boolean;
    schedule: {
      day: number;
      startTime: string;
      endTime: string;
    }[];
  };
  
  utmParameters?: {
    source?: string;
    medium?: string;
    campaign?: string;
    term?: string;
    content?: string;
  };
  
  clicks: {
    total: number;
    unique: number;
    today: number;
    thisWeek: number;
    thisMonth: number;
    lastUpdated: Date;
  };
  
  analyticsCache: {
    topCountries: { country: string; count: number }[];
    topReferrers: { referrer: string; count: number }[];
    topDevices: { device: string; count: number }[];
    lastSyncAt: Date;
  };
  
  // Add fields for anonymous support
  isAnonymous?: boolean;
  createdBy?: string; // 'anonymous' | 'user' | 'api'
  
  createdAt: Date;
  updatedAt: Date;
  lastClickAt?: Date;
  isDeleted: boolean;
  deletedAt?: Date;
}

const URLSchema = new Schema<IURL>({
  originalUrl: { 
    type: String, 
    required: true,
    validate: {
      validator: function(v: string) {
        try {
          // More permissive URL validation for anonymous users
          let url = v;
          if (!url.match(/^https?:\/\//i)) {
            url = 'https://' + url;
          }
          const parsed = new URL(url);
          
          // Basic checks
          if (!parsed.hostname || parsed.hostname.length < 2) {
            return false;
          }
          
          // Allow HTTP and HTTPS only
          if (!['http:', 'https:'].includes(parsed.protocol)) {
            return false;
          }
          
          return true;
        } catch {
          return false;
        }
      },
      message: 'Invalid URL format'
    }
  },
  shortCode: { 
    type: String, 
    required: true, 
    unique: true,
    index: true,
    match: /^[a-zA-Z0-9_-]+$/
  },
  customSlug: { 
    type: String,
    unique: true,
    sparse: true,
    match: /^[a-zA-Z0-9_-]+$/
  },
  
  // Make userId optional for anonymous users
  userId: { 
    type: Schema.Types.ObjectId, 
    ref: 'User',
    required: false, // Changed from true to false
    default: null
  },
  teamId: { 
    type: Schema.Types.ObjectId, 
    ref: 'Team'
  },
  folderId: { 
    type: Schema.Types.ObjectId, 
    ref: 'Folder'
  },
  
  title: { 
    type: String, 
    maxlength: 200,
    trim: true
  },
  description: { 
    type: String, 
    maxlength: 500,
    trim: true
  },
  tags: [{ 
    type: String, 
    maxlength: 50,
    trim: true
  }],
  favicon: { type: String },
  
  domain: { 
    type: String, 
    required: true
  },
  customDomain: { type: String },
  
  qrCode: {
    url: { type: String },
    downloadUrl: { type: String },
    style: {
      size: { type: Number, default: 200 },
      color: { type: String, default: '#000000' },
      backgroundColor: { type: String, default: '#FFFFFF' },
      logo: { type: String }
    }
  },
  
  isActive: { type: Boolean, default: true },
  isPublic: { type: Boolean, default: true },
  isPasswordProtected: { type: Boolean, default: false },
  password: { type: String },
  
  expiresAt: { type: Date },
  clickLimit: { type: Number, min: 0 },
  
  geoRestrictions: {
    allowedCountries: [{ type: String }],
    blockedCountries: [{ type: String }]
  },
  
  deviceRestrictions: {
    mobile: { type: Boolean, default: true },
    desktop: { type: Boolean, default: true },
    tablet: { type: Boolean, default: true }
  },
  
  timeRestrictions: {
    enabled: { type: Boolean, default: false },
    schedule: [{
      day: { type: Number, min: 0, max: 6 }, // 0 = Sunday
      startTime: { type: String },
      endTime: { type: String }
    }]
  },
  
  utmParameters: {
    source: { type: String },
    medium: { type: String },
    campaign: { type: String },
    term: { type: String },
    content: { type: String }
  },
  
  clicks: {
    total: { type: Number, default: 0, min: 0 },
    unique: { type: Number, default: 0, min: 0 },
    today: { type: Number, default: 0, min: 0 },
    thisWeek: { type: Number, default: 0, min: 0 },
    thisMonth: { type: Number, default: 0, min: 0 },
    lastUpdated: { type: Date, default: Date.now }
  },
  
  analyticsCache: {
    topCountries: [{ 
      country: { type: String },
      count: { type: Number, min: 0 }
    }],
    topReferrers: [{ 
      referrer: { type: String },
      count: { type: Number, min: 0 }
    }],
    topDevices: [{ 
      device: { type: String },
      count: { type: Number, min: 0 }
    }],
    lastSyncAt: { type: Date, default: Date.now }
  },
  
  // New fields for anonymous support
  isAnonymous: { type: Boolean, default: false },
  createdBy: { 
    type: String, 
    enum: ['anonymous', 'user', 'api'],
    default: 'user'
  },
  
  lastClickAt: { type: Date },
  isDeleted: { type: Boolean, default: false },
  deletedAt: { type: Date }
}, {
  timestamps: true
});

// Indexes
URLSchema.index({ userId: 1, isDeleted: 1 });
URLSchema.index({ teamId: 1, isDeleted: 1 });
URLSchema.index({ folderId: 1, isDeleted: 1 });
URLSchema.index({ shortCode: 1, isDeleted: 1 });
URLSchema.index({ customSlug: 1, isDeleted: 1 });
URLSchema.index({ isPublic: 1, isActive: 1 });
URLSchema.index({ createdAt: -1 });

// TTL index for automatic deletion of anonymous URLs after 30 days
URLSchema.index({ 
  expiresAt: 1 
}, { 
  expireAfterSeconds: 0  // MongoDB will delete documents when expiresAt date is reached
});

// Additional indexes for anonymous support
URLSchema.index({ isAnonymous: 1, createdAt: -1 });

// Compound indexes
URLSchema.index({ userId: 1, createdAt: -1 });
URLSchema.index({ isAnonymous: 1, expiresAt: 1 });

export const URL = mongoose.models.URL || mongoose.model<IURL>('URL', URLSchema);