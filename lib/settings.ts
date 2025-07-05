
import { Settings } from '@/models/Settings';
import type { Settings as SettingsType } from '@/types/settings';
import { connectDB } from './mongodb';

class SettingsService {
  private static cache: SettingsType | null = null;
  private static cacheExpiry: Date | null = null;
  private static readonly CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

  static async getSettings(): Promise<SettingsType> {
    // Return cached settings if still valid
    if (this.cache && this.cacheExpiry && new Date() < this.cacheExpiry) {
      return this.cache ?? this.getFallbackSettings();
    }

    try {
      await connectDB();
      
      let settings = await Settings.findOne({}).select('-system.smtp.password -system.integrations.stripe.secretKey -system.integrations.stripe.webhookSecret -system.integrations.google.clientSecret -system.integrations.facebook.appSecret');
      
      // If no settings exist, create default settings
      if (!settings) {
        return this.getFallbackSettings();
        settings = new Settings({
          lastModifiedBy: 'system'
        });
        await settings.save();
      }

      // Cache the settings
      this.cache = settings ? settings.toObject() : this.getFallbackSettings();
      this.cacheExpiry = new Date(Date.now() + this.CACHE_DURATION);
      
      return this.cache ?? this.getFallbackSettings();
    } catch (error) {
      console.error('Error fetching settings:', error);
      
      // Return fallback settings if database fails
      return this.getFallbackSettings();
    }
  }

  static async getAppName(): Promise<string> {
    const settings = await this.getSettings();
    return settings?.system?.appName || 'ShortLink';
  }

  static async getAppDescription(): Promise<string> {
    const settings = await this.getSettings();
    return settings?.system?.appDescription || 'Professional URL shortening service with advanced features';
  }

  static async getAppUrl(): Promise<string> {
    const settings = await this.getSettings();
    return settings?.system?.appUrl || process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000';
  }

  static async getSupportEmail(): Promise<string> {
    const settings = await this.getSettings();
    return settings?.system?.supportEmail || 'support@shortlink.local';
  }

  static async getFeatures(): Promise<SettingsType['features']> {
    const settings = await this.getSettings();
    return settings?.features || this.getFallbackSettings().features;
  }

  static async getDefaultLimits(): Promise<SettingsType['defaultLimits']> {
    const settings = await this.getSettings();
    return settings?.defaultLimits || this.getFallbackSettings().defaultLimits;
  }

  static async isFeatureEnabled(feature: keyof SettingsType['features']): Promise<boolean> {
    const features = await this.getFeatures();
    return features?.[feature] || false;
  }

  static async isMaintenanceMode(): Promise<boolean> {
    const features = await this.getFeatures();
    return features?.maintenanceMode || false;
  }

  // Clear cache when settings are updated
  static clearCache() {
    this.cache = null;
    this.cacheExpiry = null;
  }

  private static getFallbackSettings(): SettingsType {
    return {
      _id: 'fallback',
      system: {
        appName: 'ShortLink',
        appDescription: 'Professional URL shortening service with advanced features',
        appUrl: process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000',
        supportEmail: 'support@shortlink.local',
        smtp: {
          host: '',
          port: 587,
          secure: false,
          username: '',
          password: '',
          fromName: 'ShortLink',
          fromEmail: 'noreply@shortlink.local'
        },
        security: {
          enforceSSL: false,
          maxLoginAttempts: 5,
          lockoutDuration: 15,
          sessionTimeout: 24,
          passwordMinLength: 8,
          requireEmailVerification: false,
          enableTwoFactor: false
        },
        rateLimiting: {
          enabled: true,
          windowMs: 15 * 60 * 1000,
          maxRequests: 100,
          skipSuccessfulRequests: true
        },
        uploads: {
          maxFileSize: 10 * 1024 * 1024, // 10MB
          allowedImageTypes: ['image/jpeg', 'image/png', 'image/gif', 'image/webp'],
          allowedDocumentTypes: ['application/pdf', 'text/plain'],
          storageProvider: 'local'
        },
        analytics: {
          enableGoogleAnalytics: false,
          enableCustomAnalytics: true,
          retentionDays: 365
        },
        integrations: {
          stripe: {
            enabled: false
          },
          google: {
            enabled: false
          },
          facebook: {
            enabled: false
          }
        }
      },
      features: {
        enableSignup: true,
        enableTeams: true,
        enableCustomDomains: true,
        enableQRCodes: true,
        enableBulkOperations: true,
        enableAPIAccess: true,
        enableWhiteLabel: false,
        maintenanceMode: false,
      },
      defaultLimits: {
        free: {
          linksPerMonth: 10,
          clicksPerMonth: 1000,
          customDomains: 0,
          analytics: false,
        },
        premium: {
          linksPerMonth: -1,
          clicksPerMonth: -1,
          customDomains: 3,
          analytics: true,
        },
        enterprise: {
          linksPerMonth: -1,
          clicksPerMonth: -1,
          customDomains: -1,
          analytics: true,
        },
      },
      createdAt: new Date(),
      updatedAt: new Date(),
      lastModifiedBy: 'system'
    };
  }
}

export default SettingsService;