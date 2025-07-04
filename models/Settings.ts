import mongoose, { Schema, Document } from 'mongoose';

export interface ISettings extends Document {
  _id: string;
  
  system: {
    appName: string;
    appDescription: string;
    appUrl: string;
    supportEmail: string;
    
    smtp: {
      host?: string;
      port: number;
      secure: boolean;
      username?: string;
      password?: string;
      fromName: string;
      fromEmail?: string;
    };
    
    security: {
      enforceSSL: boolean;
      maxLoginAttempts: number;
      lockoutDuration: number;
      sessionTimeout: number;
      passwordMinLength: number;
      requireEmailVerification: boolean;
      enableTwoFactor: boolean;
    };
    
    rateLimiting: {
      enabled: boolean;
      windowMs: number;
      maxRequests: number;
      skipSuccessfulRequests: boolean;
    };
    
    uploads: {
      maxFileSize: number;
      allowedImageTypes: string[];
      allowedDocumentTypes: string[];
      storageProvider: 'local' | 's3' | 'cloudinary';
      s3Config?: {
        bucket: string;
        region: string;
        accessKeyId: string;
        secretAccessKey: string;
      };
    };
    
    analytics: {
      enableGoogleAnalytics: boolean;
      googleAnalyticsId?: string;
      enableCustomAnalytics: boolean;
      retentionDays: number;
    };
    
    integrations: {
      stripe: {
        enabled: boolean;
        publicKey?: string;
        secretKey?: string;
        webhookSecret?: string;
      };
      google: {
        enabled: boolean;
        clientId?: string;
        clientSecret?: string;
      };
      facebook: {
        enabled: boolean;
        appId?: string;
        appSecret?: string;
      };
    };
  };
  
  defaultLimits: {
    free: {
      linksPerMonth: number;
      clicksPerMonth: number;
      customDomains: number;
      analytics: boolean;
    };
    premium: {
      linksPerMonth: number;
      clicksPerMonth: number;
      customDomains: number;
      analytics: boolean;
    };
    enterprise: {
      linksPerMonth: number;
      clicksPerMonth: number;
      customDomains: number;
      analytics: boolean;
    };
  };
  
  features: {
    enableSignup: boolean;
    enableTeams: boolean;
    enableCustomDomains: boolean;
    enableQRCodes: boolean;
    enableBulkOperations: boolean;
    enableAPIAccess: boolean;
    enableWhiteLabel: boolean;
    maintenanceMode: boolean;
  };
  
  createdAt: Date;
  updatedAt: Date;
  lastModifiedBy: mongoose.Types.ObjectId;
}

const SettingsSchema = new Schema<ISettings>({
  system: {
    appName: { type: String, default: 'URL Shortener' },
    appDescription: { type: String, default: 'Professional URL shortening service' },
    appUrl: { type: String, default: 'http://localhost:3000' },
    supportEmail: { type: String, default: 'support@example.com' },
    
    smtp: {
      host: { type: String },
      port: { type: Number, default: 587 },
      secure: { type: Boolean, default: false },
      username: { type: String },
      password: { type: String, select: false },
      fromName: { type: String, default: 'URL Shortener' },
      fromEmail: { type: String }
    },
    
    security: {
      enforceSSL: { type: Boolean, default: true },
      maxLoginAttempts: { type: Number, default: 5 },
      lockoutDuration: { type: Number, default: 15 },
      sessionTimeout: { type: Number, default: 1440 },
      passwordMinLength: { type: Number, default: 8 },
      requireEmailVerification: { type: Boolean, default: true },
      enableTwoFactor: { type: Boolean, default: false }
    },
    
    rateLimiting: {
      enabled: { type: Boolean, default: true },
      windowMs: { type: Number, default: 900000 },
      maxRequests: { type: Number, default: 100 },
      skipSuccessfulRequests: { type: Boolean, default: false }
    },
    
    uploads: {
      maxFileSize: { type: Number, default: 5242880 },
      allowedImageTypes: [{ type: String, default: ['jpg', 'jpeg', 'png', 'gif', 'webp'] }],
      allowedDocumentTypes: [{ type: String, default: ['pdf', 'doc', 'docx'] }],
      storageProvider: { type: String, enum: ['local', 's3', 'cloudinary'], default: 'local' },
      s3Config: {
        bucket: { type: String },
        region: { type: String },
        accessKeyId: { type: String },
        secretAccessKey: { type: String, select: false }
      }
    },
    
    analytics: {
      enableGoogleAnalytics: { type: Boolean, default: false },
      googleAnalyticsId: { type: String },
      enableCustomAnalytics: { type: Boolean, default: true },
      retentionDays: { type: Number, default: 365 }
    },
    
    integrations: {
      stripe: {
        enabled: { type: Boolean, default: false },
        publicKey: { type: String },
        secretKey: { type: String, select: false },
        webhookSecret: { type: String, select: false }
      },
      google: {
        enabled: { type: Boolean, default: false },
        clientId: { type: String },
        clientSecret: { type: String, select: false }
      },
      facebook: {
        enabled: { type: Boolean, default: false },
        appId: { type: String },
        appSecret: { type: String, select: false }
      }
    }
  },
  
  defaultLimits: {
    free: {
      linksPerMonth: { type: Number, default: 5 },
      clicksPerMonth: { type: Number, default: 1000 },
      customDomains: { type: Number, default: 0 },
      analytics: { type: Boolean, default: false }
    },
    premium: {
      linksPerMonth: { type: Number, default: -1 },
      clicksPerMonth: { type: Number, default: -1 },
      customDomains: { type: Number, default: 3 },
      analytics: { type: Boolean, default: true }
    },
    enterprise: {
      linksPerMonth: { type: Number, default: -1 },
      clicksPerMonth: { type: Number, default: -1 },
      customDomains: { type: Number, default: -1 },
      analytics: { type: Boolean, default: true }
    }
  },
  
  features: {
    enableSignup: { type: Boolean, default: true },
    enableTeams: { type: Boolean, default: true },
    enableCustomDomains: { type: Boolean, default: true },
    enableQRCodes: { type: Boolean, default: true },
    enableBulkOperations: { type: Boolean, default: true },
    enableAPIAccess: { type: Boolean, default: true },
    enableWhiteLabel: { type: Boolean, default: false },
    maintenanceMode: { type: Boolean, default: false }
  },
  
  lastModifiedBy: { 
    type: Schema.Types.ObjectId, 
    ref: 'User', 
    required: true 
  }
}, {
  timestamps: true
});

export const Settings = mongoose.models.Settings || mongoose.model<ISettings>('Settings', SettingsSchema);