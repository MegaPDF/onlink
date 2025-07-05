// models/Settings.ts - Complete Settings Model
import mongoose, { Schema, Document } from 'mongoose';

export interface ISettings extends Document {
  _id: string;
  
  system: {
    appName: string;
    appDescription: string;
    appUrl: string;
    supportEmail: string;
    
    smtp: {
      host: string;
      port: number;
      secure: boolean;
      username: string;
      password: string;
      fromName: string;
      fromEmail: string;
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
    
    analytics: {
      provider: string;
      trackingCode: string;
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
  
  pricing: {
    free: {
      name: string;
      description: string;
      price: { monthly: number; yearly: number };
      stripePriceIds: { monthly: string; yearly: string };
      popular?: boolean;
      badge?: string;
    };
    premium: {
      name: string;
      description: string;
      price: { monthly: number; yearly: number };
      stripePriceIds: { monthly: string; yearly: string };
      popular?: boolean;
      badge?: string;
    };
    enterprise: {
      name: string;
      description: string;
      price: { monthly: number; yearly: number };
      stripePriceIds: { monthly: string; yearly: string };
      popular?: boolean;
      badge?: string;
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
  lastModifiedBy: string;
}

const SettingsSchema = new Schema<ISettings>({
  system: {
    appName: { type: String, required: true, default: 'OnLink' },
    appDescription: { type: String, required: true, default: 'Professional URL shortening service' },
    appUrl: { type: String, required: true, default: 'http://localhost:3000' },
    supportEmail: { type: String, required: true, default: 'support@onlink.local' },
    
    smtp: {
      host: { type: String, default: '' },
      port: { type: Number, default: 587 },
      secure: { type: Boolean, default: false },
      username: { type: String, default: '' },
      password: { type: String, default: '' },
      fromName: { type: String, default: 'OnLink' },
      fromEmail: { type: String, default: 'noreply@onlink.local' }
    },
    
    security: {
      enforceSSL: { type: Boolean, default: false },
      maxLoginAttempts: { type: Number, default: 5 },
      lockoutDuration: { type: Number, default: 15 },
      sessionTimeout: { type: Number, default: 24 },
      passwordMinLength: { type: Number, default: 8 },
      requireEmailVerification: { type: Boolean, default: false },
      enableTwoFactor: { type: Boolean, default: false }
    },
    
    analytics: {
      provider: { type: String, default: 'internal' },
      trackingCode: { type: String, default: '' },
      enableCustomAnalytics: { type: Boolean, default: true },
      retentionDays: { type: Number, default: 365 }
    },
    
    integrations: {
      stripe: {
        enabled: { type: Boolean, default: false },
        publicKey: { type: String, default: '' },
        secretKey: { type: String, default: '', select: false },
        webhookSecret: { type: String, default: '', select: false }
      },
      google: {
        enabled: { type: Boolean, default: false },
        clientId: { type: String, default: '' },
        clientSecret: { type: String, default: '', select: false }
      },
      facebook: {
        enabled: { type: Boolean, default: false },
        appId: { type: String, default: '' },
        appSecret: { type: String, default: '', select: false }
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
  
  pricing: {
    free: {
      name: { type: String, default: 'Free' },
      description: { type: String, default: 'Perfect for personal use' },
      price: {
        monthly: { type: Number, default: 0 },
        yearly: { type: Number, default: 0 }
      },
      stripePriceIds: {
        monthly: { type: String, default: '' },
        yearly: { type: String, default: '' }
      },
      popular: { type: Boolean, default: false },
      badge: { type: String }
    },
    premium: {
      name: { type: String, default: 'Premium' },
      description: { type: String, default: 'For professionals and small businesses' },
      price: {
        monthly: { type: Number, default: 999 },
        yearly: { type: Number, default: 9999 }
      },
      stripePriceIds: {
        monthly: { type: String, default: 'price_premium_monthly' },
        yearly: { type: String, default: 'price_premium_yearly' }
      },
      popular: { type: Boolean, default: true },
      badge: { type: String, default: 'Most Popular' }
    },
    enterprise: {
      name: { type: String, default: 'Enterprise' },
      description: { type: String, default: 'For large organizations' },
      price: {
        monthly: { type: Number, default: 4999 },
        yearly: { type: Number, default: 49999 }
      },
      stripePriceIds: {
        monthly: { type: String, default: 'price_enterprise_monthly' },
        yearly: { type: String, default: 'price_enterprise_yearly' }
      },
      popular: { type: Boolean, default: false },
      badge: { type: String }
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
  
  lastModifiedBy: { type: String, required: true }
}, {
  timestamps: true
});

export const Settings = mongoose.models.Settings || mongoose.model<ISettings>('Settings', SettingsSchema);