import mongoose, { Schema, Document } from 'mongoose';

export interface IAnalytics extends Document {
  _id: string;
  urlId: mongoose.Types.ObjectId;
  shortCode: string;
  
  timestamp: Date;
  
  visitor: {
    ip: string;
    hashedIp: string;
    userAgent: string;
    acceptLanguage?: string;
    sessionId?: string;
  };
  
  location: {
    country?: string;
    countryCode?: string;
    region?: string;
    city?: string;
    latitude?: number;
    longitude?: number;
    timezone?: string;
  };
  
  device: {
    type: 'desktop' | 'mobile' | 'tablet' | 'bot';
    os: string;
    osVersion?: string;
    browser: string;
    browserVersion?: string;
    viewport?: {
      width: number;
      height: number;
    };
  };
  
  referrer: {
    url?: string;
    domain?: string;
    type: 'direct' | 'search' | 'social' | 'email' | 'ads' | 'referral' | 'unknown';
    utm?: {
      source?: string;
      medium?: string;
      campaign?: string;
      term?: string;
      content?: string;
    };
  };
  
  bot: {
    isBot: boolean;
    botName?: string;
    botType?: 'search' | 'social' | 'monitoring' | 'security' | 'unknown';
  };
}

const AnalyticsSchema = new Schema<IAnalytics>({
  urlId: { type: Schema.Types.ObjectId, ref: 'URL', required: true, index: true },
  shortCode: { type: String, required: true, index: true },
  
  timestamp: { type: Date, default: Date.now, index: true },
  
  visitor: {
    ip: { type: String, required: true },
    hashedIp: { type: String, required: true, index: true },
    userAgent: { type: String, required: true },
    acceptLanguage: { type: String },
    sessionId: { type: String, index: true }
  },
  
  location: {
    country: { type: String, index: true },
    countryCode: { type: String, index: true },
    region: { type: String },
    city: { type: String },
    latitude: { type: Number },
    longitude: { type: Number },
    timezone: { type: String }
  },
  
  device: {
    type: { type: String, enum: ['desktop', 'mobile', 'tablet', 'bot'], required: true, index: true },
    os: { type: String, required: true, index: true },
    osVersion: { type: String },
    browser: { type: String, required: true, index: true },
    browserVersion: { type: String },
    viewport: {
      width: { type: Number },
      height: { type: Number }
    }
  },
  
  referrer: {
    url: { type: String },
    domain: { type: String, index: true },
    type: { type: String, enum: ['direct', 'search', 'social', 'email', 'ads', 'referral', 'unknown'], required: true, index: true },
    utm: {
      source: { type: String },
      medium: { type: String },
      campaign: { type: String },
      term: { type: String },
      content: { type: String }
    }
  },
  
  bot: {
    isBot: { type: Boolean, default: false, index: true },
    botName: { type: String },
    botType: { type: String, enum: ['search', 'social', 'monitoring', 'security', 'unknown'] }
  }
}, {
  timestamps: false // We use our own timestamp field
});

// Indexes
AnalyticsSchema.index({ urlId: 1, timestamp: 1 });
AnalyticsSchema.index({ timestamp: 1 });
AnalyticsSchema.index({ 'location.country': 1 });
AnalyticsSchema.index({ 'device.type': 1 });
AnalyticsSchema.index({ 'referrer.type': 1 });
AnalyticsSchema.index({ 'bot.isBot': 1 });

export const Analytics = mongoose.models.Analytics || mongoose.model<IAnalytics>('Analytics', AnalyticsSchema);
