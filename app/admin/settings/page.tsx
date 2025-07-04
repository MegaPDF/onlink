// ============= app/admin/settings/page.tsx =============
"use client";

import React, { useState, useEffect } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { LoadingSpinner } from "@/components/ui/loading-spinner";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Separator } from "@/components/ui/separator";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { toast } from "sonner";
import {
  Settings,
  Mail,
  Shield,
  Database,
  Globe,
  Save,
  RefreshCw,
  Eye,
  EyeOff,
  AlertTriangle,
} from "lucide-react";

interface AdminSettings {
  _id?: string;
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
  lastModifiedBy?: string;
  createdAt?: string;
  updatedAt?: string;
}

const defaultSettings: AdminSettings = {
  system: {
    appName: "OnLink",
    appDescription: "Professional URL shortening service",
    appUrl: "http://localhost:3000",
    supportEmail: "support@onlink.local",
    smtp: {
      host: "",
      port: 587,
      secure: false,
      username: "",
      password: "",
      fromName: "OnLink",
      fromEmail: "noreply@onlink.local",
    },
    security: {
      enforceSSL: false,
      maxLoginAttempts: 5,
      lockoutDuration: 15,
      sessionTimeout: 24,
      passwordMinLength: 8,
      requireEmailVerification: false,
      enableTwoFactor: false,
    },
    analytics: {
      provider: "internal",
      trackingCode: "",
      enableCustomAnalytics: true,
      retentionDays: 365,
    },
    integrations: {
      stripe: {
        enabled: false,
        publicKey: "",
        secretKey: "",
        webhookSecret: "",
      },
      google: {
        enabled: false,
        clientId: "",
        clientSecret: "",
      },
      facebook: {
        enabled: false,
        appId: "",
        appSecret: "",
      },
    },
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

export default function AdminSettingsPage() {
  const [settings, setSettings] = useState<AdminSettings>(defaultSettings);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [showPasswords, setShowPasswords] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchSettings();
  }, []);

  const fetchSettings = async () => {
    try {
      setLoading(true);
      setError(null);

      const response = await fetch("/api/admin/settings");
      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || "Failed to fetch settings");
      }

      // Merge with default settings to ensure all fields exist
      const mergedSettings = {
        ...defaultSettings,
        ...result.data,
        system: {
          ...defaultSettings.system,
          ...result.data?.system,
          smtp: {
            ...defaultSettings.system.smtp,
            ...result.data?.system?.smtp,
          },
          security: {
            ...defaultSettings.system.security,
            ...result.data?.system?.security,
          },
          analytics: {
            ...defaultSettings.system.analytics,
            ...result.data?.system?.analytics,
          },
          integrations: {
            ...defaultSettings.system.integrations,
            ...result.data?.system?.integrations,
            stripe: {
              ...defaultSettings.system.integrations.stripe,
              ...result.data?.system?.integrations?.stripe,
            },
            google: {
              ...defaultSettings.system.integrations.google,
              ...result.data?.system?.integrations?.google,
            },
            facebook: {
              ...defaultSettings.system.integrations.facebook,
              ...result.data?.system?.integrations?.facebook,
            },
          },
        },
        features: {
          ...defaultSettings.features,
          ...result.data?.features,
        },
        defaultLimits: {
          ...defaultSettings.defaultLimits,
          ...result.data?.defaultLimits,
          free: {
            ...defaultSettings.defaultLimits.free,
            ...result.data?.defaultLimits?.free,
          },
          premium: {
            ...defaultSettings.defaultLimits.premium,
            ...result.data?.defaultLimits?.premium,
          },
          enterprise: {
            ...defaultSettings.defaultLimits.enterprise,
            ...result.data?.defaultLimits?.enterprise,
          },
        },
      };

      setSettings(mergedSettings);
    } catch (error: any) {
      console.error("Error fetching settings:", error);
      setError(error.message || "Failed to load settings");
      toast.error("Failed to load settings");
    } finally {
      setLoading(false);
    }
  };

  const saveSettings = async () => {
    try {
      setSaving(true);
      setError(null);

      const response = await fetch("/api/admin/settings", {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(settings),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || "Failed to save settings");
      }

      toast.success("Settings saved successfully!");
    } catch (error: any) {
      console.error("Error saving settings:", error);
      setError(error.message || "Failed to save settings");
      toast.error("Failed to save settings");
    } finally {
      setSaving(false);
    }
  };

  const updateSettings = (path: string, value: any) => {
    setSettings((prev) => {
      const newSettings = { ...prev };
      const keys = path.split(".");
      let current: any = newSettings;

      for (let i = 0; i < keys.length - 1; i++) {
        if (!current[keys[i]]) {
          current[keys[i]] = {};
        }
        current = current[keys[i]];
      }

      current[keys[keys.length - 1]] = value;
      return newSettings;
    });
  };

  if (loading) {
    return (
      <div className="container mx-auto py-6 px-4">
        <div className="flex items-center justify-center min-h-96">
          <LoadingSpinner size="lg" />
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="container mx-auto py-6 px-4">
        <div className="text-center">
          <AlertTriangle className="h-12 w-12 text-red-500 mx-auto mb-4" />
          <h2 className="text-xl font-semibold mb-2">Error Loading Settings</h2>
          <p className="text-muted-foreground mb-4">{error}</p>
          <Button onClick={fetchSettings}>
            <RefreshCw className="h-4 w-4 mr-2" />
            Try Again
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-6 px-4 max-w-4xl">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold">System Settings</h1>
          <p className="text-muted-foreground">
            Configure system-wide settings and preferences
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={fetchSettings} disabled={loading}>
            <RefreshCw className="h-4 w-4 mr-2" />
            Refresh
          </Button>
          <Button onClick={saveSettings} disabled={saving}>
            <Save className="h-4 w-4 mr-2" />
            {saving ? "Saving..." : "Save Changes"}
          </Button>
        </div>
      </div>

      <Tabs defaultValue="general" className="space-y-6">
        <TabsList className="grid w-full grid-cols-6">
          <TabsTrigger value="general">General</TabsTrigger>
          <TabsTrigger value="email">Email</TabsTrigger>
          <TabsTrigger value="security">Security</TabsTrigger>
          <TabsTrigger value="features">Features</TabsTrigger>
          <TabsTrigger value="limits">Limits</TabsTrigger>
          <TabsTrigger value="integrations">Integrations</TabsTrigger>
        </TabsList>

        {/* General Settings */}
        <TabsContent value="general">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Settings className="h-5 w-5" />
                General Settings
              </CardTitle>
              <CardDescription>
                Basic application configuration and branding
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="appName">Application Name</Label>
                  <Input
                    id="appName"
                    value={settings.system.appName}
                    onChange={(e) =>
                      updateSettings("system.appName", e.target.value)
                    }
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="supportEmail">Support Email</Label>
                  <Input
                    id="supportEmail"
                    type="email"
                    value={settings.system.supportEmail}
                    onChange={(e) =>
                      updateSettings("system.supportEmail", e.target.value)
                    }
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="appDescription">Application Description</Label>
                <Textarea
                  id="appDescription"
                  value={settings.system.appDescription}
                  onChange={(e) =>
                    updateSettings("system.appDescription", e.target.value)
                  }
                  rows={3}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="appUrl">Application URL</Label>
                <Input
                  id="appUrl"
                  type="url"
                  value={settings.system.appUrl}
                  onChange={(e) =>
                    updateSettings("system.appUrl", e.target.value)
                  }
                />
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Email Settings */}
        <TabsContent value="email">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Mail className="h-5 w-5" />
                Email Configuration
              </CardTitle>
              <CardDescription>
                Configure SMTP settings for sending emails
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="smtpHost">SMTP Host</Label>
                  <Input
                    id="smtpHost"
                    value={settings.system.smtp.host}
                    onChange={(e) =>
                      updateSettings("system.smtp.host", e.target.value)
                    }
                    placeholder="smtp.gmail.com"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="smtpPort">SMTP Port</Label>
                  <Input
                    id="smtpPort"
                    type="number"
                    value={settings.system.smtp.port}
                    onChange={(e) =>
                      updateSettings(
                        "system.smtp.port",
                        parseInt(e.target.value)
                      )
                    }
                  />
                </div>
              </div>

              <div className="flex items-center space-x-2">
                <Switch
                  id="smtpSecure"
                  checked={settings.system.smtp.secure}
                  onCheckedChange={(checked) =>
                    updateSettings("system.smtp.secure", checked)
                  }
                />
                <Label htmlFor="smtpSecure">Use SSL/TLS</Label>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="smtpUsername">Username</Label>
                  <Input
                    id="smtpUsername"
                    value={settings.system.smtp.username}
                    onChange={(e) =>
                      updateSettings("system.smtp.username", e.target.value)
                    }
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="smtpPassword">Password</Label>
                  <div className="relative">
                    <Input
                      id="smtpPassword"
                      type={showPasswords ? "text" : "password"}
                      value={settings.system.smtp.password}
                      onChange={(e) =>
                        updateSettings("system.smtp.password", e.target.value)
                      }
                    />
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="absolute right-2 top-1/2 -translate-y-1/2"
                      onClick={() => setShowPasswords(!showPasswords)}
                    >
                      {showPasswords ? (
                        <EyeOff className="h-4 w-4" />
                      ) : (
                        <Eye className="h-4 w-4" />
                      )}
                    </Button>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="fromName">From Name</Label>
                  <Input
                    id="fromName"
                    value={settings.system.smtp.fromName}
                    onChange={(e) =>
                      updateSettings("system.smtp.fromName", e.target.value)
                    }
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="fromEmail">From Email</Label>
                  <Input
                    id="fromEmail"
                    type="email"
                    value={settings.system.smtp.fromEmail}
                    onChange={(e) =>
                      updateSettings("system.smtp.fromEmail", e.target.value)
                    }
                  />
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Security Settings */}
        <TabsContent value="security">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Shield className="h-5 w-5" />
                Security Settings
              </CardTitle>
              <CardDescription>
                Configure security policies and authentication
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="maxLoginAttempts">Max Login Attempts</Label>
                  <Input
                    id="maxLoginAttempts"
                    type="number"
                    min="1"
                    max="10"
                    value={settings.system.security.maxLoginAttempts}
                    onChange={(e) =>
                      updateSettings(
                        "system.security.maxLoginAttempts",
                        parseInt(e.target.value)
                      )
                    }
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="lockoutDuration">
                    Lockout Duration (minutes)
                  </Label>
                  <Input
                    id="lockoutDuration"
                    type="number"
                    min="5"
                    max="1440"
                    value={settings.system.security.lockoutDuration}
                    onChange={(e) =>
                      updateSettings(
                        "system.security.lockoutDuration",
                        parseInt(e.target.value)
                      )
                    }
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="sessionTimeout">
                    Session Timeout (hours)
                  </Label>
                  <Input
                    id="sessionTimeout"
                    type="number"
                    min="1"
                    max="168"
                    value={settings.system.security.sessionTimeout}
                    onChange={(e) =>
                      updateSettings(
                        "system.security.sessionTimeout",
                        parseInt(e.target.value)
                      )
                    }
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="passwordMinLength">Min Password Length</Label>
                  <Input
                    id="passwordMinLength"
                    type="number"
                    min="6"
                    max="32"
                    value={settings.system.security.passwordMinLength}
                    onChange={(e) =>
                      updateSettings(
                        "system.security.passwordMinLength",
                        parseInt(e.target.value)
                      )
                    }
                  />
                </div>
              </div>

              <div className="space-y-4">
                <div className="flex items-center space-x-2">
                  <Switch
                    id="enforceSSL"
                    checked={settings.system.security.enforceSSL}
                    onCheckedChange={(checked) =>
                      updateSettings("system.security.enforceSSL", checked)
                    }
                  />
                  <Label htmlFor="enforceSSL">Enforce SSL/HTTPS</Label>
                </div>

                <div className="flex items-center space-x-2">
                  <Switch
                    id="requireEmailVerification"
                    checked={settings.system.security.requireEmailVerification}
                    onCheckedChange={(checked) =>
                      updateSettings(
                        "system.security.requireEmailVerification",
                        checked
                      )
                    }
                  />
                  <Label htmlFor="requireEmailVerification">
                    Require Email Verification
                  </Label>
                </div>

                <div className="flex items-center space-x-2">
                  <Switch
                    id="enableTwoFactor"
                    checked={settings.system.security.enableTwoFactor}
                    onCheckedChange={(checked) =>
                      updateSettings("system.security.enableTwoFactor", checked)
                    }
                  />
                  <Label htmlFor="enableTwoFactor">
                    Enable Two-Factor Authentication
                  </Label>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Features Settings */}
        <TabsContent value="features">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Database className="h-5 w-5" />
                Platform Features
              </CardTitle>
              <CardDescription>
                Enable or disable platform features
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="flex items-center space-x-2">
                  <Switch
                    id="enableSignup"
                    checked={settings.features.enableSignup}
                    onCheckedChange={(checked) =>
                      updateSettings("features.enableSignup", checked)
                    }
                  />
                  <Label htmlFor="enableSignup">Enable User Registration</Label>
                </div>

                <div className="flex items-center space-x-2">
                  <Switch
                    id="enableTeams"
                    checked={settings.features.enableTeams}
                    onCheckedChange={(checked) =>
                      updateSettings("features.enableTeams", checked)
                    }
                  />
                  <Label htmlFor="enableTeams">Enable Teams</Label>
                </div>

                <div className="flex items-center space-x-2">
                  <Switch
                    id="enableCustomDomains"
                    checked={settings.features.enableCustomDomains}
                    onCheckedChange={(checked) =>
                      updateSettings("features.enableCustomDomains", checked)
                    }
                  />
                  <Label htmlFor="enableCustomDomains">
                    Enable Custom Domains
                  </Label>
                </div>

                <div className="flex items-center space-x-2">
                  <Switch
                    id="enableQRCodes"
                    checked={settings.features.enableQRCodes}
                    onCheckedChange={(checked) =>
                      updateSettings("features.enableQRCodes", checked)
                    }
                  />
                  <Label htmlFor="enableQRCodes">Enable QR Codes</Label>
                </div>

                <div className="flex items-center space-x-2">
                  <Switch
                    id="enableBulkOperations"
                    checked={settings.features.enableBulkOperations}
                    onCheckedChange={(checked) =>
                      updateSettings("features.enableBulkOperations", checked)
                    }
                  />
                  <Label htmlFor="enableBulkOperations">
                    Enable Bulk Operations
                  </Label>
                </div>

                <div className="flex items-center space-x-2">
                  <Switch
                    id="enableAPIAccess"
                    checked={settings.features.enableAPIAccess}
                    onCheckedChange={(checked) =>
                      updateSettings("features.enableAPIAccess", checked)
                    }
                  />
                  <Label htmlFor="enableAPIAccess">Enable API Access</Label>
                </div>

                <div className="flex items-center space-x-2">
                  <Switch
                    id="enableWhiteLabel"
                    checked={settings.features.enableWhiteLabel}
                    onCheckedChange={(checked) =>
                      updateSettings("features.enableWhiteLabel", checked)
                    }
                  />
                  <Label htmlFor="enableWhiteLabel">Enable White Label</Label>
                </div>

                <div className="flex items-center space-x-2">
                  <Switch
                    id="maintenanceMode"
                    checked={settings.features.maintenanceMode}
                    onCheckedChange={(checked) =>
                      updateSettings("features.maintenanceMode", checked)
                    }
                  />
                  <Label htmlFor="maintenanceMode">Maintenance Mode</Label>
                </div>
              </div>

              {settings.features.maintenanceMode && (
                <Alert>
                  <AlertTriangle className="h-4 w-4" />
                  <AlertDescription>
                    Maintenance mode is enabled. Only administrators can access
                    the platform.
                  </AlertDescription>
                </Alert>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Plan Limits */}
        <TabsContent value="limits">
          <div className="space-y-6">
            {Object.entries(settings.defaultLimits).map(([plan, limits]) => (
              <Card key={plan}>
                <CardHeader>
                  <CardTitle className="capitalize">
                    {plan} Plan Limits
                  </CardTitle>
                  <CardDescription>
                    Default limits for {plan} plan users
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Links Per Month</Label>
                      <Input
                        type="number"
                        value={limits.linksPerMonth}
                        onChange={(e) =>
                          updateSettings(
                            `defaultLimits.${plan}.linksPerMonth`,
                            parseInt(e.target.value)
                          )
                        }
                        placeholder="-1 for unlimited"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Clicks Per Month</Label>
                      <Input
                        type="number"
                        value={limits.clicksPerMonth}
                        onChange={(e) =>
                          updateSettings(
                            `defaultLimits.${plan}.clicksPerMonth`,
                            parseInt(e.target.value)
                          )
                        }
                        placeholder="-1 for unlimited"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Custom Domains</Label>
                      <Input
                        type="number"
                        value={limits.customDomains}
                        onChange={(e) =>
                          updateSettings(
                            `defaultLimits.${plan}.customDomains`,
                            parseInt(e.target.value)
                          )
                        }
                        placeholder="-1 for unlimited"
                      />
                    </div>
                    <div className="flex items-center space-x-2">
                      <Switch
                        checked={limits.analytics}
                        onCheckedChange={(checked) =>
                          updateSettings(
                            `defaultLimits.${plan}.analytics`,
                            checked
                          )
                        }
                      />
                      <Label>Analytics Access</Label>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        {/* Integrations */}
        <TabsContent value="integrations">
          <div className="space-y-6">
            {/* Stripe Integration */}
            <Card>
              <CardHeader>
                <CardTitle>Stripe Integration</CardTitle>
                <CardDescription>
                  Configure Stripe for payment processing
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center space-x-2">
                  <Switch
                    checked={settings.system.integrations.stripe.enabled}
                    onCheckedChange={(checked) =>
                      updateSettings(
                        "system.integrations.stripe.enabled",
                        checked
                      )
                    }
                  />
                  <Label>Enable Stripe</Label>
                </div>

                {settings.system.integrations.stripe.enabled && (
                  <div className="grid grid-cols-1 gap-4">
                    <div className="space-y-2">
                      <Label>Publishable Key</Label>
                      <Input
                        value={
                          settings.system.integrations.stripe.publicKey || ""
                        }
                        onChange={(e) =>
                          updateSettings(
                            "system.integrations.stripe.publicKey",
                            e.target.value
                          )
                        }
                        placeholder="pk_..."
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Secret Key</Label>
                      <Input
                        type={showPasswords ? "text" : "password"}
                        value={
                          settings.system.integrations.stripe.secretKey || ""
                        }
                        onChange={(e) =>
                          updateSettings(
                            "system.integrations.stripe.secretKey",
                            e.target.value
                          )
                        }
                        placeholder="sk_..."
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Webhook Secret</Label>
                      <Input
                        type={showPasswords ? "text" : "password"}
                        value={
                          settings.system.integrations.stripe.webhookSecret ||
                          ""
                        }
                        onChange={(e) =>
                          updateSettings(
                            "system.integrations.stripe.webhookSecret",
                            e.target.value
                          )
                        }
                        placeholder="whsec_..."
                      />
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Google Integration */}
            <Card>
              <CardHeader>
                <CardTitle>Google OAuth</CardTitle>
                <CardDescription>
                  Configure Google OAuth for social login
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center space-x-2">
                  <Switch
                    checked={settings.system.integrations.google.enabled}
                    onCheckedChange={(checked) =>
                      updateSettings(
                        "system.integrations.google.enabled",
                        checked
                      )
                    }
                  />
                  <Label>Enable Google OAuth</Label>
                </div>

                {settings.system.integrations.google.enabled && (
                  <div className="grid grid-cols-1 gap-4">
                    <div className="space-y-2">
                      <Label>Client ID</Label>
                      <Input
                        value={
                          settings.system.integrations.google.clientId || ""
                        }
                        onChange={(e) =>
                          updateSettings(
                            "system.integrations.google.clientId",
                            e.target.value
                          )
                        }
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Client Secret</Label>
                      <Input
                        type={showPasswords ? "text" : "password"}
                        value={
                          settings.system.integrations.google.clientSecret || ""
                        }
                        onChange={(e) =>
                          updateSettings(
                            "system.integrations.google.clientSecret",
                            e.target.value
                          )
                        }
                      />
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
