import mongoose, { Schema, Document } from 'mongoose';
export interface IURL extends Document {
  _id: string;
  originalUrl: string;
  shortCode: string;
  customSlug?: string;
  
  // Ownership and organization
  userId: mongoose.Types.ObjectId;
  teamId?: mongoose.Types.ObjectId;
  folderId?: mongoose.Types.ObjectId;
  
  // Metadata
  title?: string;
  description?: string;
  tags: string[];
  favicon?: string;
  
  // Domain and branding
  domain: string;
  customDomain?: string;
  
  // QR Code
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
  
  // Access control
  isActive: boolean;
  isPublic: boolean;
  isPasswordProtected: boolean;
  password?: string;
  
  // Restrictions and limits
  expiresAt?: Date;
  clickLimit?: number;
  geoRestrictions?: {
    type: 'allow' | 'block';
    countries: string[];
  };
  deviceRestrictions?: {
    mobile: boolean;
    desktop: boolean;
    tablet: boolean;
  };
  timeRestrictions?: {
    enabled: boolean;
    schedule: {
      day: number; // 0-6 (Sunday-Saturday)
      startTime: string; // HH:MM
      endTime: string; // HH:MM
    }[];
  };
  
  // UTM and tracking
  utmParameters?: {
    source?: string;
    medium?: string;
    campaign?: string;
    term?: string;
    content?: string;
  };
  
  // Click statistics (synced with Analytics model)
  clicks: {
    total: number;
    unique: number;
    today: number;
    thisWeek: number;
    thisMonth: number;
    lastUpdated: Date;
  };
  
  // Quick analytics cache (synced from Analytics model)
  analyticsCache: {
    topCountries: { country: string; count: number }[];
    topReferrers: { referrer: string; count: number }[];
    topDevices: { device: string; count: number }[];
    lastSyncAt: Date;
  };
  
  // Status and timestamps
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
    maxlength: 2048
  },
  shortCode: { 
    type: String, 
    required: true, 
    unique: true,
    index: true,
    maxlength: 20
  },
  customSlug: { 
    type: String, 
    unique: true, 
    sparse: true,
    maxlength: 50
  },
  
  userId: { 
    type: Schema.Types.ObjectId, 
    ref: 'User', 
    required: true,
    index: true
  },
  teamId: { 
    type: Schema.Types.ObjectId, 
    ref: 'Team',
    index: true
  },
  folderId: { 
    type: Schema.Types.ObjectId, 
    ref: 'Folder',
    index: true
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
    required: true,
    index: true
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
  
  isActive: { type: Boolean, default: true, index: true },
  isPublic: { type: Boolean, default: true },
  isPasswordProtected: { type: Boolean, default: false },
  password: { type: String },
  
  expiresAt: { type: Date, index: true },
  clickLimit: { type: Number, min: 0 },
  geoRestrictions: {
    type: { type: String, enum: ['allow', 'block'] },
    countries: [{ type: String, length: 2 }] // ISO country codes
  },
  deviceRestrictions: {
    mobile: { type: Boolean, default: true },
    desktop: { type: Boolean, default: true },
    tablet: { type: Boolean, default: true }
  },
  timeRestrictions: {
    enabled: { type: Boolean, default: false },
    schedule: [{
      day: { type: Number, min: 0, max: 6 },
      startTime: { type: String },
      endTime: { type: String }
    }]
  },
  
  utmParameters: {
    source: { type: String, maxlength: 100 },
    medium: { type: String, maxlength: 100 },
    campaign: { type: String, maxlength: 100 },
    term: { type: String, maxlength: 100 },
    content: { type: String, maxlength: 100 }
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
      count: { type: Number }
    }],
    topReferrers: [{
      referrer: { type: String },
      count: { type: Number }
    }],
    topDevices: [{
      device: { type: String },
      count: { type: Number }
    }],
    lastSyncAt: { type: Date, default: Date.now }
  },
  
  lastClickAt: { type: Date },
  isDeleted: { type: Boolean, default: false, index: true },
  deletedAt: { type: Date }
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Compound indexes for performance
URLSchema.index({ userId: 1, isDeleted: 1, isActive: 1 });
URLSchema.index({ teamId: 1, isDeleted: 1 });
URLSchema.index({ folderId: 1, isDeleted: 1 });
URLSchema.index({ domain: 1, shortCode: 1 });
URLSchema.index({ expiresAt: 1, isActive: 1 });
URLSchema.index({ createdAt: -1 });
URLSchema.index({ tags: 1 });

// Virtual for full short URL
URLSchema.virtual('shortUrl').get(function() {
  const baseUrl = this.customDomain || this.domain;
  return `${baseUrl}/${this.customSlug || this.shortCode}`;
});

// Virtual for click rate
URLSchema.virtual('clickRate').get(function() {
  const daysSinceCreated = Math.max(1, Math.floor((Date.now() - this.createdAt.getTime()) / (1000 * 60 * 60 * 24)));
  return Math.round(this.clicks.total / daysSinceCreated * 100) / 100;
});

export const URL = mongoose.models.URL || mongoose.model<IURL>('URL', URLSchema);
