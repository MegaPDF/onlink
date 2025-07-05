"use client";

import React, { useState, useEffect } from "react";
import { useAuth } from "@/hooks/use-auth";
import { useToast } from "@/hooks/use-toast";
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
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  Settings,
  Mail,
  Shield,
  Database,
  Users,
  Globe,
  CreditCard,
  Crown,
  Save,
  RefreshCw,
  AlertTriangle,
  Loader2,
  Eye,
  EyeOff,
} from "lucide-react";

interface AdminSettings {
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
        publicKey: string;
        secretKey: string;
        webhookSecret: string;
      };
      google: {
        enabled: boolean;
        clientId: string;
        clientSecret: string;
      };
      facebook: {
        enabled: boolean;
        appId: string;
        appSecret: string;
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
  pricing?: {
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
  pricing: {
    free: {
      name: "Free",
      description: "Perfect for personal use",
      price: { monthly: 0, yearly: 0 },
      stripePriceIds: { monthly: "", yearly: "" },
      popular: false,
    },
    premium: {
      name: "Premium",
      description: "For professionals and small businesses",
      price: { monthly: 999, yearly: 9999 },
      stripePriceIds: {
        monthly: "price_premium_monthly",
        yearly: "price_premium_yearly",
      },
      popular: true,
      badge: "Most Popular",
    },
    enterprise: {
      name: "Enterprise",
      description: "For large organizations",
      price: { monthly: 4999, yearly: 49999 },
      stripePriceIds: {
        monthly: "price_enterprise_monthly",
        yearly: "price_enterprise_yearly",
      },
      popular: false,
    },
  },
};

export default function AdminSettingsPage() {
  const { user } = useAuth();
  const toast = useToast();
  const [settings, setSettings] = useState<AdminSettings>(defaultSettings);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [unsavedChanges, setUnsavedChanges] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showPasswords, setShowPasswords] = useState({
    smtpPassword: false,
    stripeSecret: false,
    webhookSecret: false,
  });

  // Load settings on component mount
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
        throw new Error(result.error || "Failed to load settings");
      }

      // Merge with defaults to ensure all fields exist
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
        pricing: {
          ...defaultSettings.pricing,
          ...result.data?.pricing,
          free: {
            ...defaultSettings.pricing!.free,
            ...result.data?.pricing?.free,
          },
          premium: {
            ...defaultSettings.pricing!.premium,
            ...result.data?.pricing?.premium,
          },
          enterprise: {
            ...defaultSettings.pricing!.enterprise,
            ...result.data?.pricing?.enterprise,
          },
        },
      };

      setSettings(mergedSettings);
      setUnsavedChanges(false);
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
      setUnsavedChanges(false);
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
      let current = newSettings as any;

      for (let i = 0; i < keys.length - 1; i++) {
        if (!current[keys[i]]) current[keys[i]] = {};
        current = current[keys[i]];
      }

      current[keys[keys.length - 1]] = value;
      setUnsavedChanges(true);
      return newSettings;
    });
  };

  const getPlanColor = (plan: string) => {
    switch (plan) {
      case "free":
        return "text-gray-600 bg-gray-100";
      case "premium":
        return "text-blue-600 bg-blue-100";
      case "enterprise":
        return "text-purple-600 bg-purple-100";
      default:
        return "text-gray-600 bg-gray-100";
    }
  };

  const getPlanIcon = (plan: string) => {
    switch (plan) {
      case "free":
        return <Users className="h-4 w-4" />;
      case "premium":
        return <Crown className="h-4 w-4" />;
      case "enterprise":
        return <Shield className="h-4 w-4" />;
      default:
        return <Users className="h-4 w-4" />;
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  return (
    <div className="container mx-auto py-6 px-4 max-w-6xl">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">System Settings</h1>
            <p className="text-muted-foreground">
              Configure application settings, features, and integrations
            </p>
          </div>
          <div className="flex items-center gap-2">
            {unsavedChanges && (
              <Badge variant="outline" className="text-orange-600">
                Unsaved Changes
              </Badge>
            )}
            <Button
              onClick={saveSettings}
              disabled={saving || !unsavedChanges}
              className="flex items-center gap-2"
            >
              {saving ? (
                <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <Save className="h-4 w-4 mr-2" />
              )}
              {saving ? "Saving..." : "Save Changes"}
            </Button>
          </div>
        </div>
      </div>

      <Tabs defaultValue="general" className="space-y-6">
        <TabsList className="grid w-full grid-cols-7">
          <TabsTrigger value="general" className="flex items-center gap-2">
            <Settings className="h-4 w-4" />
            <span className="hidden sm:inline">General</span>
          </TabsTrigger>
          <TabsTrigger value="email" className="flex items-center gap-2">
            <Mail className="h-4 w-4" />
            <span className="hidden sm:inline">Email</span>
          </TabsTrigger>
          <TabsTrigger value="security" className="flex items-center gap-2">
            <Shield className="h-4 w-4" />
            <span className="hidden sm:inline">Security</span>
          </TabsTrigger>
          <TabsTrigger value="features" className="flex items-center gap-2">
            <Database className="h-4 w-4" />
            <span className="hidden sm:inline">Features</span>
          </TabsTrigger>
          <TabsTrigger value="limits" className="flex items-center gap-2">
            <Users className="h-4 w-4" />
            <span className="hidden sm:inline">Limits</span>
          </TabsTrigger>
          <TabsTrigger value="pricing" className="flex items-center gap-2">
            <CreditCard className="h-4 w-4" />
            <span className="hidden sm:inline">Pricing</span>
          </TabsTrigger>
          <TabsTrigger value="integrations" className="flex items-center gap-2">
            <Globe className="h-4 w-4" />
            <span className="hidden sm:inline">Integrations</span>
          </TabsTrigger>
        </TabsList>

        {/* General Settings */}
        <TabsContent value="general" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Settings className="h-5 w-5" />
                Application Configuration
              </CardTitle>
              <CardDescription>
                Basic application settings and branding configuration
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <Label>Application Name</Label>
                  <Input
                    value={settings.system.appName}
                    onChange={(e) =>
                      updateSettings("system.appName", e.target.value)
                    }
                    placeholder="OnLink"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Application URL</Label>
                  <Input
                    value={settings.system.appUrl}
                    onChange={(e) =>
                      updateSettings("system.appUrl", e.target.value)
                    }
                    placeholder="https://onlink.com"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label>Application Description</Label>
                <Textarea
                  value={settings.system.appDescription}
                  onChange={(e) =>
                    updateSettings("system.appDescription", e.target.value)
                  }
                  placeholder="Professional URL shortening service"
                />
              </div>

              <div className="space-y-2">
                <Label>Support Email</Label>
                <Input
                  type="email"
                  value={settings.system.supportEmail}
                  onChange={(e) =>
                    updateSettings("system.supportEmail", e.target.value)
                  }
                  placeholder="support@onlink.com"
                />
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Email Settings */}
        <TabsContent value="email" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Mail className="h-5 w-5" />
                SMTP Configuration
              </CardTitle>
              <CardDescription>
                Configure SMTP settings for sending emails
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <Label>SMTP Host</Label>
                  <Input
                    value={settings.system.smtp.host}
                    onChange={(e) =>
                      updateSettings("system.smtp.host", e.target.value)
                    }
                    placeholder="smtp.gmail.com"
                  />
                </div>
                <div className="space-y-2">
                  <Label>SMTP Port</Label>
                  <Input
                    type="number"
                    value={settings.system.smtp.port}
                    onChange={(e) =>
                      updateSettings(
                        "system.smtp.port",
                        parseInt(e.target.value)
                      )
                    }
                    placeholder="587"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <Label>Username</Label>
                  <Input
                    value={settings.system.smtp.username}
                    onChange={(e) =>
                      updateSettings("system.smtp.username", e.target.value)
                    }
                    placeholder="your-email@gmail.com"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Password</Label>
                  <div className="relative">
                    <Input
                      type={showPasswords.smtpPassword ? "text" : "password"}
                      value={settings.system.smtp.password}
                      onChange={(e) =>
                        updateSettings("system.smtp.password", e.target.value)
                      }
                      placeholder="••••••••"
                    />
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="absolute right-0 top-0 h-full px-3"
                      onClick={() =>
                        setShowPasswords((prev) => ({
                          ...prev,
                          smtpPassword: !prev.smtpPassword,
                        }))
                      }
                    >
                      {showPasswords.smtpPassword ? (
                        <EyeOff className="h-4 w-4" />
                      ) : (
                        <Eye className="h-4 w-4" />
                      )}
                    </Button>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <Label>From Name</Label>
                  <Input
                    value={settings.system.smtp.fromName}
                    onChange={(e) =>
                      updateSettings("system.smtp.fromName", e.target.value)
                    }
                    placeholder="OnLink"
                  />
                </div>
                <div className="space-y-2">
                  <Label>From Email</Label>
                  <Input
                    type="email"
                    value={settings.system.smtp.fromEmail}
                    onChange={(e) =>
                      updateSettings("system.smtp.fromEmail", e.target.value)
                    }
                    placeholder="noreply@onlink.com"
                  />
                </div>
              </div>

              <div className="flex items-center space-x-2">
                <Switch
                  checked={settings.system.smtp.secure}
                  onCheckedChange={(checked) =>
                    updateSettings("system.smtp.secure", checked)
                  }
                />
                <Label>Use SSL/TLS</Label>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Security Settings */}
        <TabsContent value="security" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Shield className="h-5 w-5" />
                Security Configuration
              </CardTitle>
              <CardDescription>
                Configure security settings and authentication options
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <Label>Max Login Attempts</Label>
                  <Input
                    type="number"
                    value={settings.system.security.maxLoginAttempts}
                    onChange={(e) =>
                      updateSettings(
                        "system.security.maxLoginAttempts",
                        parseInt(e.target.value)
                      )
                    }
                    placeholder="5"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Lockout Duration (minutes)</Label>
                  <Input
                    type="number"
                    value={settings.system.security.lockoutDuration}
                    onChange={(e) =>
                      updateSettings(
                        "system.security.lockoutDuration",
                        parseInt(e.target.value)
                      )
                    }
                    placeholder="15"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <Label>Session Timeout (hours)</Label>
                  <Input
                    type="number"
                    value={settings.system.security.sessionTimeout}
                    onChange={(e) =>
                      updateSettings(
                        "system.security.sessionTimeout",
                        parseInt(e.target.value)
                      )
                    }
                    placeholder="24"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Minimum Password Length</Label>
                  <Input
                    type="number"
                    value={settings.system.security.passwordMinLength}
                    onChange={(e) =>
                      updateSettings(
                        "system.security.passwordMinLength",
                        parseInt(e.target.value)
                      )
                    }
                    placeholder="8"
                  />
                </div>
              </div>

              <div className="space-y-4">
                <div className="flex items-center space-x-2">
                  <Switch
                    checked={settings.system.security.enforceSSL}
                    onCheckedChange={(checked) =>
                      updateSettings("system.security.enforceSSL", checked)
                    }
                  />
                  <Label>Enforce SSL/HTTPS</Label>
                </div>

                <div className="flex items-center space-x-2">
                  <Switch
                    checked={settings.system.security.requireEmailVerification}
                    onCheckedChange={(checked) =>
                      updateSettings(
                        "system.security.requireEmailVerification",
                        checked
                      )
                    }
                  />
                  <Label>Require Email Verification</Label>
                </div>

                <div className="flex items-center space-x-2">
                  <Switch
                    checked={settings.system.security.enableTwoFactor}
                    onCheckedChange={(checked) =>
                      updateSettings("system.security.enableTwoFactor", checked)
                    }
                  />
                  <Label>Enable Two-Factor Authentication</Label>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Features Settings */}
        <TabsContent value="features" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Database className="h-5 w-5" />
                Feature Configuration
              </CardTitle>
              <CardDescription>
                Enable or disable application features
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="flex items-center space-x-2">
                  <Switch
                    checked={settings.features.enableSignup}
                    onCheckedChange={(checked) =>
                      updateSettings("features.enableSignup", checked)
                    }
                  />
                  <Label>Enable User Registration</Label>
                </div>

                <div className="flex items-center space-x-2">
                  <Switch
                    checked={settings.features.enableTeams}
                    onCheckedChange={(checked) =>
                      updateSettings("features.enableTeams", checked)
                    }
                  />
                  <Label>Enable Team Features</Label>
                </div>

                <div className="flex items-center space-x-2">
                  <Switch
                    checked={settings.features.enableCustomDomains}
                    onCheckedChange={(checked) =>
                      updateSettings("features.enableCustomDomains", checked)
                    }
                  />
                  <Label>Enable Custom Domains</Label>
                </div>

                <div className="flex items-center space-x-2">
                  <Switch
                    checked={settings.features.enableQRCodes}
                    onCheckedChange={(checked) =>
                      updateSettings("features.enableQRCodes", checked)
                    }
                  />
                  <Label>Enable QR Code Generation</Label>
                </div>

                <div className="flex items-center space-x-2">
                  <Switch
                    checked={settings.features.enableBulkOperations}
                    onCheckedChange={(checked) =>
                      updateSettings("features.enableBulkOperations", checked)
                    }
                  />
                  <Label>Enable Bulk Operations</Label>
                </div>

                <div className="flex items-center space-x-2">
                  <Switch
                    checked={settings.features.enableAPIAccess}
                    onCheckedChange={(checked) =>
                      updateSettings("features.enableAPIAccess", checked)
                    }
                  />
                  <Label>Enable API Access</Label>
                </div>

                <div className="flex items-center space-x-2">
                  <Switch
                    checked={settings.features.enableWhiteLabel}
                    onCheckedChange={(checked) =>
                      updateSettings("features.enableWhiteLabel", checked)
                    }
                  />
                  <Label>Enable White Label</Label>
                </div>
              </div>

              <div className="pt-4 border-t">
                <div className="flex items-center space-x-2">
                  <Switch
                    checked={settings.features.maintenanceMode}
                    onCheckedChange={(checked) =>
                      updateSettings("features.maintenanceMode", checked)
                    }
                  />
                  <Label>Maintenance Mode</Label>
                </div>

                {settings.features.maintenanceMode && (
                  <Alert className="mt-4">
                    <AlertTriangle className="h-4 w-4" />
                    <AlertDescription>
                      Maintenance mode is enabled. Regular users will see a
                      maintenance page.
                    </AlertDescription>
                  </Alert>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Plan Limits */}
        <TabsContent value="limits" className="space-y-6">
          {Object.entries(settings.defaultLimits).map(([plan, limits]) => (
            <Card key={plan}>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <div className={`p-2 rounded-lg ${getPlanColor(plan)}`}>
                    {getPlanIcon(plan)}
                  </div>
                  <span className="capitalize">{plan} Plan Limits</span>
                  <Badge variant="outline" className={getPlanColor(plan)}>
                    {plan}
                  </Badge>
                </CardTitle>
                <CardDescription>
                  Configure default usage limits for {plan} plan subscribers
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
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
                    <p className="text-xs text-muted-foreground">
                      Use -1 for unlimited links
                    </p>
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
                    <p className="text-xs text-muted-foreground">
                      Use -1 for unlimited clicks
                    </p>
                  </div>
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
                    <p className="text-xs text-muted-foreground">
                      Use -1 for unlimited domains
                    </p>
                  </div>
                </div>

                <div className="flex items-center space-x-2">
                  <Switch
                    checked={limits.analytics}
                    onCheckedChange={(checked) =>
                      updateSettings(`defaultLimits.${plan}.analytics`, checked)
                    }
                  />
                  <Label>Analytics Access</Label>
                </div>
              </CardContent>
            </Card>
          ))}
        </TabsContent>

        {/* Pricing Configuration */}
        <TabsContent value="pricing" className="space-y-6">
          {Object.entries(settings.pricing || {}).map(([plan, pricing]) => (
            <Card key={plan}>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <div className={`p-2 rounded-lg ${getPlanColor(plan)}`}>
                    {getPlanIcon(plan)}
                  </div>
                  <span className="capitalize">{plan} Plan Pricing</span>
                  <Badge variant="outline" className={getPlanColor(plan)}>
                    {plan}
                  </Badge>
                </CardTitle>
                <CardDescription>
                  Configure pricing and Stripe integration for {plan} plan
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <Label>Plan Name</Label>
                    <Input
                      value={pricing.name}
                      onChange={(e) =>
                        updateSettings(`pricing.${plan}.name`, e.target.value)
                      }
                      placeholder={plan}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Description</Label>
                    <Input
                      value={pricing.description}
                      onChange={(e) =>
                        updateSettings(
                          `pricing.${plan}.description`,
                          e.target.value
                        )
                      }
                      placeholder="Plan description"
                    />
                  </div>
                </div>

                {plan !== "free" && (
                  <>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div className="space-y-2">
                        <Label>Monthly Price (in cents)</Label>
                        <Input
                          type="number"
                          value={pricing.price.monthly}
                          onChange={(e) =>
                            updateSettings(
                              `pricing.${plan}.price.monthly`,
                              parseInt(e.target.value)
                            )
                          }
                          placeholder="999"
                        />
                        <p className="text-xs text-muted-foreground">
                          Enter amount in cents (999 = $9.99)
                        </p>
                      </div>
                      <div className="space-y-2">
                        <Label>Yearly Price (in cents)</Label>
                        <Input
                          type="number"
                          value={pricing.price.yearly}
                          onChange={(e) =>
                            updateSettings(
                              `pricing.${plan}.price.yearly`,
                              parseInt(e.target.value)
                            )
                          }
                          placeholder="9999"
                        />
                        <p className="text-xs text-muted-foreground">
                          Enter amount in cents (9999 = $99.99)
                        </p>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div className="space-y-2">
                        <Label>Stripe Monthly Price ID</Label>
                        <Input
                          value={pricing.stripePriceIds.monthly}
                          onChange={(e) =>
                            updateSettings(
                              `pricing.${plan}.stripePriceIds.monthly`,
                              e.target.value
                            )
                          }
                          placeholder={`price_${plan}_monthly`}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>Stripe Yearly Price ID</Label>
                        <Input
                          value={pricing.stripePriceIds.yearly}
                          onChange={(e) =>
                            updateSettings(
                              `pricing.${plan}.stripePriceIds.yearly`,
                              e.target.value
                            )
                          }
                          placeholder={`price_${plan}_yearly`}
                        />
                      </div>
                    </div>
                  </>
                )}

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="flex items-center space-x-2">
                    <Switch
                      checked={pricing.popular || false}
                      onCheckedChange={(checked) =>
                        updateSettings(`pricing.${plan}.popular`, checked)
                      }
                    />
                    <Label>Mark as Popular</Label>
                  </div>
                  <div className="space-y-2">
                    <Label>Badge Text (optional)</Label>
                    <Input
                      value={pricing.badge || ""}
                      onChange={(e) =>
                        updateSettings(`pricing.${plan}.badge`, e.target.value)
                      }
                      placeholder="Most Popular"
                    />
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </TabsContent>

        {/* Integrations */}
        <TabsContent value="integrations" className="space-y-6">
          {/* Stripe Integration */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <CreditCard className="h-5 w-5" />
                Stripe Payment Processing
              </CardTitle>
              <CardDescription>
                Configure Stripe for subscription billing and payments
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
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
                <Label>Enable Stripe Integration</Label>
              </div>

              {settings.system.integrations.stripe.enabled && (
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label>Publishable Key</Label>
                    <Input
                      value={settings.system.integrations.stripe.publicKey}
                      onChange={(e) =>
                        updateSettings(
                          "system.integrations.stripe.publicKey",
                          e.target.value
                        )
                      }
                      placeholder="pk_test_..."
                    />
                  </div>

                  <div className="space-y-2">
                    <Label>Secret Key</Label>
                    <div className="relative">
                      <Input
                        type={showPasswords.stripeSecret ? "text" : "password"}
                        value={settings.system.integrations.stripe.secretKey}
                        onChange={(e) =>
                          updateSettings(
                            "system.integrations.stripe.secretKey",
                            e.target.value
                          )
                        }
                        placeholder="sk_test_..."
                      />
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="absolute right-0 top-0 h-full px-3"
                        onClick={() =>
                          setShowPasswords((prev) => ({
                            ...prev,
                            stripeSecret: !prev.stripeSecret,
                          }))
                        }
                      >
                        {showPasswords.stripeSecret ? (
                          <EyeOff className="h-4 w-4" />
                        ) : (
                          <Eye className="h-4 w-4" />
                        )}
                      </Button>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label>Webhook Secret</Label>
                    <div className="relative">
                      <Input
                        type={showPasswords.webhookSecret ? "text" : "password"}
                        value={
                          settings.system.integrations.stripe.webhookSecret
                        }
                        onChange={(e) =>
                          updateSettings(
                            "system.integrations.stripe.webhookSecret",
                            e.target.value
                          )
                        }
                        placeholder="whsec_..."
                      />
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="absolute right-0 top-0 h-full px-3"
                        onClick={() =>
                          setShowPasswords((prev) => ({
                            ...prev,
                            webhookSecret: !prev.webhookSecret,
                          }))
                        }
                      >
                        {showPasswords.webhookSecret ? (
                          <EyeOff className="h-4 w-4" />
                        ) : (
                          <Eye className="h-4 w-4" />
                        )}
                      </Button>
                    </div>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Google Integration */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Globe className="h-5 w-5" />
                Google OAuth Integration
              </CardTitle>
              <CardDescription>
                Configure Google OAuth for social login
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
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
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label>Client ID</Label>
                    <Input
                      value={settings.system.integrations.google.clientId}
                      onChange={(e) =>
                        updateSettings(
                          "system.integrations.google.clientId",
                          e.target.value
                        )
                      }
                      placeholder="Google OAuth Client ID"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label>Client Secret</Label>
                    <Input
                      type="password"
                      value={settings.system.integrations.google.clientSecret}
                      onChange={(e) =>
                        updateSettings(
                          "system.integrations.google.clientSecret",
                          e.target.value
                        )
                      }
                      placeholder="Google OAuth Client Secret"
                    />
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
