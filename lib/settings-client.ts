
import { Settings } from '@/types/settings';

// Client-side app settings (subset of full Settings for performance)
export interface AppSettings {
  appName: string;
  appDescription: string;
  appUrl: string;
  supportEmail: string;
  features: Settings['features'];
  defaultLimits: Settings['defaultLimits'];
}

// Extend Window interface
declare global {
  interface Window {
    __APP_SETTINGS__?: AppSettings;
  }
}

class ClientSettings {
  private static settings: AppSettings | null = null;
  private static loading = false;
  private static callbacks: Array<(settings: AppSettings) => void> = [];

  static getSettings(): AppSettings {
    // Return cached settings if available
    if (this.settings) {
      return this.settings;
    }

    // Try to get from window (set by server)
    if (typeof window !== 'undefined' && window.__APP_SETTINGS__) {
      this.settings = window.__APP_SETTINGS__;
      return this.settings;
    }

    // Return fallback immediately using your types structure
    return {
      appName: 'OnLink',
      appDescription: 'Professional URL shortening service',
      appUrl: 'http://localhost:3000',
      supportEmail: 'support@onlink.local',
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
          linksPerMonth: 5,
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
    };
  }

  // Convenient getter methods with proper typing
  static getAppName(): string {
    return this.getSettings().appName;
  }

  static getAppDescription(): string {
    return this.getSettings().appDescription;
  }

  static getAppUrl(): string {
    return this.getSettings().appUrl;
  }

  static getSupportEmail(): string {
    return this.getSettings().supportEmail;
  }

  static getFeatures(): Settings['features'] {
    return this.getSettings().features;
  }

  static getDefaultLimits(): Settings['defaultLimits'] {
    return this.getSettings().defaultLimits;
  }

  static isFeatureEnabled(feature: keyof Settings['features']): boolean {
    const features = this.getFeatures();
    return features?.[feature] || false;
  }

  static isMaintenanceMode(): boolean {
    return this.getFeatures()?.maintenanceMode || false;
  }

  static async loadSettings(): Promise<AppSettings> {
    if (this.loading || this.settings) return this.settings || this.getSettings();
    
    this.loading = true;
    
    try {
      const response = await fetch('/api/settings');
      const result = await response.json();
      
      if (result.success && result.data) {
        const settingsData: Settings = result.data;
        
        this.settings = {
          appName: settingsData.system.appName,
          appDescription: settingsData.system.appDescription,
          appUrl: settingsData.system.appUrl,
          supportEmail: settingsData.system.supportEmail,
          features: settingsData.features,
          defaultLimits: settingsData.defaultLimits,
        };
        
        // Update window object for SSR compatibility
        if (typeof window !== 'undefined') {
          window.__APP_SETTINGS__ = this.settings;
        }
        
        // Notify all subscribers
        this.callbacks.forEach(callback => callback(this.settings!));
        this.callbacks = [];
      }
    } catch (error) {
      console.error('Failed to load settings:', error);
    } finally {
      this.loading = false;
    }
    
    return this.settings || this.getSettings();
  }

  static subscribe(callback: (settings: AppSettings) => void) {
    if (this.settings) {
      callback(this.settings);
    } else {
      this.callbacks.push(callback);
      // Auto-load if not already loading
      if (!this.loading) {
        this.loadSettings();
      }
    }
  }

  static clearCache() {
    this.settings = null;
    if (typeof window !== 'undefined') {
      delete window.__APP_SETTINGS__;
    }
  }
}


export default ClientSettings;

// ===================================================================
// USAGE EXAMPLES
// ===================================================================

// 1. In Components
/*
import { useAppSettings } from '@/lib/settings-client';

export function Header() {
  const settings = useAppSettings();
  
  return (
    <header>
      <h1>{settings.appName}</h1>
      {settings.features.enableSignup && (
        <a href="/signup">Sign Up</a>
      )}
    </header>
  );
}
*/

// 2. In API Routes - Use server-side service instead
/*
import SettingsService from '@/lib/settings';

export async function GET() {
  const appName = await SettingsService.getAppName();
  const isMaintenanceMode = await SettingsService.isMaintenanceMode();
  
  if (isMaintenanceMode) {
    return Response.json({ error: 'Maintenance mode' }, { status: 503 });
  }
  
  return Response.json({ message: `Welcome to ${appName}` });
}
*/

// 3. In Admin Settings - Clear cache after save
/*
import ClientSettings from '@/lib/settings-client';

const saveSettings = async () => {
  try {
    // Save settings...
    const response = await fetch('/api/admin/settings', {
      method: 'PUT',
      body: JSON.stringify(settings),
    });
    
    if (response.ok) {
      // Clear cache and reload fresh data
      ClientSettings.clearCache();
      await ClientSettings.loadSettings();
      toast.success('Settings saved!');
    }
  } catch (error) {
    toast.error('Failed to save settings');
  }
};
*/