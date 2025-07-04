// ============= models/Analytics.ts =============
import mongoose, { Schema, Document } from 'mongoose';
export interface IAnalytics extends Document {
  _id: string;
  
  // Reference to the shortened URL
  urlId: mongoose.Types.ObjectId;
  shortCode: string;
  
  // Click details
  clickId: string; // Unique identifier for this click
  timestamp: Date;
  
  // User information
  ip: string;
  hashedIp: string; // For privacy compliance
  userAgent: string;
  fingerprint?: string; // Browser fingerprint for unique visitor tracking
  
  // Geographic data
  country?: string;
  countryCode?: string;
  region?: string;
  city?: string;
  latitude?: number;
  longitude?: number;
  timezone?: string;
  
  // Device information
  device: {
    type: 'mobile' | 'tablet' | 'desktop' | 'bot';
    brand?: string;
    model?: string;
    os: string;
    osVersion?: string;
    browser: string;
    browserVersion?: string;
    engine?: string;
    cpu?: string;
  };
  
  // Referrer information
  referrer: {
    url?: string;
    domain?: string;
    source: 'direct' | 'social' | 'search' | 'email' | 'ads' | 'referral' | 'unknown';
    medium?: string;
    campaign?: string;
    term?: string;
    content?: string;
  };
  
  // UTM parameters (if present in original URL)
  utm: {
    source?: string;
    medium?: string;
    campaign?: string;
    term?: string;
    content?: string;
  };
  
  // Technical details
  technical: {
    protocol: 'http' | 'https';
    method: 'GET' | 'POST';
    statusCode: number;
    responseTime: number; // in milliseconds
    redirectCount: number;
  };
  
  // QR Code specific (if clicked via QR)
  qrCode: {
    isQRClick: boolean;
    qrSource?: 'image' | 'pdf' | 'print';
  };
  
  // Bot detection
  bot: {
    isBot: boolean;
    botName?: string;
    botType?: 'search' | 'social' | 'monitoring' | 'other';
  };
  
  // Privacy and compliance
  privacy: {
    doNotTrack: boolean;
    gdprConsent?: boolean;
    ccpaOptOut?: boolean;
  };
  
  // Processed flags (for data pipeline)
  processed: {
    isProcessed: boolean;
    processedAt?: Date;
    aggregatedAt?: Date;
  };
}

const AnalyticsSchema = new Schema<IAnalytics>({
  urlId: { 
    type: Schema.Types.ObjectId, 
    ref: 'URL', 
    required: true,
    index: true
  },
  shortCode: { 
    type: String, 
    required: true,
    index: true
  },
  
  clickId: { 
    type: String, 
    required: true, 
    unique: true,
    index: true
  },
  timestamp: { 
    type: Date, 
    default: Date.now, 
    index: true 
  },
  
  ip: { type: String, required: true },
  hashedIp: { type: String, required: true, index: true },
  userAgent: { type: String, required: true },
  fingerprint: { type: String, index: true },
  
  country: { type: String, index: true },
  countryCode: { type: String, length: 2, index: true },
  region: { type: String },
  city: { type: String },
  latitude: { type: Number },
  longitude: { type: Number },
  timezone: { type: String },
  
  device: {
    type: { 
      type: String, 
      enum: ['mobile', 'tablet', 'desktop', 'bot'], 
      required: true,
      index: true
    },
    brand: { type: String },
    model: { type: String },
    os: { type: String, required: true, index: true },
    osVersion: { type: String },
    browser: { type: String, required: true, index: true },
    browserVersion: { type: String },
    engine: { type: String },
    cpu: { type: String }
  },
  
  referrer: {
    url: { type: String },
    domain: { type: String, index: true },
    source: { 
      type: String, 
      enum: ['direct', 'social', 'search', 'email', 'ads', 'referral', 'unknown'], 
      required: true,
      index: true
    },
    medium: { type: String },
    campaign: { type: String, index: true },
    term: { type: String },
    content: { type: String }
  },
  
  utm: {
    source: { type: String, index: true },
    medium: { type: String, index: true },
    campaign: { type: String, index: true },
    term: { type: String },
    content: { type: String }
  },
  
  technical: {
    protocol: { type: String, enum: ['http', 'https'], default: 'https' },
    method: { type: String, enum: ['GET', 'POST'], default: 'GET' },
    statusCode: { type: Number, default: 302 },
    responseTime: { type: Number, default: 0 },
    redirectCount: { type: Number, default: 1 }
  },
  
  qrCode: {
    isQRClick: { type: Boolean, default: false, index: true },
    qrSource: { type: String, enum: ['image', 'pdf', 'print'] }
  },
  
  bot: {
    isBot: { type: Boolean, default: false, index: true },
    botName: { type: String },
    botType: { type: String, enum: ['search', 'social', 'monitoring', 'other'] }
  },
  
  privacy: {
    doNotTrack: { type: Boolean, default: false },
    gdprConsent: { type: Boolean },
    ccpaOptOut: { type: Boolean }
  },
  
  processed: {
    isProcessed: { type: Boolean, default: false, index: true },
    processedAt: { type: Date },
    aggregatedAt: { type: Date }
  }
}, {
  timestamps: false, // We use custom timestamp field
  collection: 'analytics' // Explicit collection name
});

// Time-based indexes for efficient querying
AnalyticsSchema.index({ timestamp: -1 });
AnalyticsSchema.index({ urlId: 1, timestamp: -1 });
AnalyticsSchema.index({ shortCode: 1, timestamp: -1 });
AnalyticsSchema.index({ timestamp: 1, 'processed.isProcessed': 1 });

// Compound indexes for common queries
AnalyticsSchema.index({ urlId: 1, countryCode: 1, timestamp: -1 });
AnalyticsSchema.index({ urlId: 1, 'device.type': 1, timestamp: -1 });
AnalyticsSchema.index({ urlId: 1, 'referrer.source': 1, timestamp: -1 });

// TTL index for data retention (optional - based on settings)
AnalyticsSchema.index({ timestamp: 1 }, { expireAfterSeconds: 31536000 }); // 1 year

export const Analytics = mongoose.models.Analytics || mongoose.model<IAnalytics>('Analytics', AnalyticsSchema);
