import mongoose, { Schema, Document } from 'mongoose';

export interface IURL extends Document {
  _id: string;
  originalUrl: string;
  shortCode: string;
  customSlug?: string;
  
  userId: mongoose.Types.ObjectId;
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
    trim: true,
    maxlength: 2048
  },
  shortCode: { 
    type: String, 
    required: true, 
    match: /^[a-zA-Z0-9_-]+$/,
    maxlength: 20
  },
  customSlug: { 
    type: String,
    match: /^[a-zA-Z0-9_-]+$/,
    maxlength: 50
  },
  
  userId: { 
    type: Schema.Types.ObjectId, 
    ref: 'User', 
    required: true
  },
  teamId: { type: Schema.Types.ObjectId, ref: 'Team' },
  folderId: { type: Schema.Types.ObjectId, ref: 'Folder' },
  
  title: { 
    type: String,
    trim: true,
    maxlength: 200
  },
  description: { 
    type: String,
    trim: true,
    maxlength: 500
  },
  tags: [{ 
    type: String,
    trim: true,
    maxlength: 50
  }],
  favicon: { type: String },
  
  domain: { type: String, required: true },
  customDomain: { type: String },
  
  qrCode: {
    url: { type: String },
    downloadUrl: { type: String },
    style: {
      size: { type: Number, default: 200, min: 100, max: 1000 },
      color: { type: String, default: '#000000' },
      backgroundColor: { type: String, default: '#FFFFFF' },
      logo: { type: String }
    }
  },
  
  isActive: { type: Boolean, default: true },
  isPublic: { type: Boolean, default: true },
  isPasswordProtected: { type: Boolean, default: false },
  password: { type: String, select: false },
  
  expiresAt: { type: Date },
  clickLimit: { type: Number, min: 1 },
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
      startTime: { type: String, match: /^([01]?[0-9]|2[0-3]):[0-5][0-9]$/ },
      endTime: { type: String, match: /^([01]?[0-9]|2[0-3]):[0-5][0-9]$/ }
    }]
  },
  
  utmParameters: {
    source: { type: String, trim: true },
    medium: { type: String, trim: true },
    campaign: { type: String, trim: true },
    term: { type: String, trim: true },
    content: { type: String, trim: true }
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
  isDeleted: { type: Boolean, default: false },
  deletedAt: { type: Date }
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Indexes - Clean, no duplicates
URLSchema.index({ shortCode: 1 }, { unique: true });
URLSchema.index({ userId: 1, isDeleted: 1, isActive: 1 });
URLSchema.index({ teamId: 1, isDeleted: 1 });
URLSchema.index({ folderId: 1, isDeleted: 1 });
URLSchema.index({ domain: 1, shortCode: 1 });
URLSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });
URLSchema.index({ createdAt: -1 });
URLSchema.index({ tags: 1 });
URLSchema.index({ 'clicks.total': -1 });

// Virtual for full short URL
URLSchema.virtual('shortUrl').get(function() {
  const baseUrl = this.customDomain || this.domain;
  return `https://${baseUrl}/${this.customSlug || this.shortCode}`;
});

// Virtual for click rate
URLSchema.virtual('clickRate').get(function() {
  const daysSinceCreated = Math.max(1, Math.floor((Date.now() - this.createdAt.getTime()) / (1000 * 60 * 60 * 24)));
  return Math.round(this.clicks.total / daysSinceCreated * 100) / 100;
});

export const URL = mongoose.models.URL || mongoose.model<IURL>('URL', URLSchema);
