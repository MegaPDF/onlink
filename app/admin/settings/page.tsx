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
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Separator } from "@/components/ui/separator";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
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
  CheckCircle2,
  Info,
  Zap,
  Crown,
  Users,
  CreditCard,
  Key,
  Monitor,
  Activity,
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
  const [unsavedChanges, setUnsavedChanges] = useState(false);

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
      let current: any = newSettings;

      for (let i = 0; i < keys.length - 1; i++) {
        if (!current[keys[i]]) {
          current[keys[i]] = {};
        }
        current = current[keys[i]];
      }

      current[keys[keys.length - 1]] = value;
      setUnsavedChanges(true);
      return newSettings;
    });
  };

  const getPlanIcon = (plan: string) => {
    switch (plan) {
      case "free":
        return <Users className="h-4 w-4" />;
      case "premium":
        return <Zap className="h-4 w-4" />;
      case "enterprise":
        return <Crown className="h-4 w-4" />;
      default:
        return <Users className="h-4 w-4" />;
    }
  };

  const getPlanColor = (plan: string) => {
    switch (plan) {
      case "free":
        return "text-gray-600 bg-gray-100 dark:text-gray-400 dark:bg-gray-800";
      case "premium":
        return "text-blue-600 bg-blue-100 dark:text-blue-400 dark:bg-blue-900";
      case "enterprise":
        return "text-purple-600 bg-purple-100 dark:text-purple-400 dark:bg-purple-900";
      default:
        return "text-gray-600 bg-gray-100 dark:text-gray-400 dark:bg-gray-800";
    }
  };

  if (loading) {
    return (
      <div className="container mx-auto py-8 px-4 lg:px-8">
        <div className="flex items-center justify-center min-h-96">
          <div className="flex flex-col items-center gap-4">
            <RefreshCw className="h-8 w-8 animate-spin text-primary" />
            <p className="text-sm text-muted-foreground">Loading settings...</p>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="container mx-auto py-8 px-4 lg:px-8">
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
    <TooltipProvider>
      <div className="container mx-auto py-8 px-4 lg:px-8 max-w-6xl">
        {/* Page Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <h1 className="text-3xl font-bold tracking-tight">
                System Settings
              </h1>
              <p className="text-muted-foreground">
                Configure system-wide settings and platform preferences
              </p>
            </div>
            <div className="flex items-center gap-3">
              {unsavedChanges && (
                <Badge
                  variant="secondary"
                  className="text-orange-600 bg-orange-100 dark:text-orange-400 dark:bg-orange-900"
                >
                  <AlertTriangle className="h-3 w-3 mr-1" />
                  Unsaved Changes
                </Badge>
              )}
              <Button
                variant="outline"
                onClick={fetchSettings}
                disabled={loading}
              >
                <RefreshCw className="h-4 w-4 mr-2" />
                Refresh
              </Button>
              <Button
                onClick={saveSettings}
                disabled={saving || !unsavedChanges}
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
          <TabsList className="grid w-full grid-cols-6">
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
            <TabsTrigger
              value="integrations"
              className="flex items-center gap-2"
            >
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
                    <Label htmlFor="appName">Application Name</Label>
                    <Input
                      id="appName"
                      value={settings.system.appName}
                      onChange={(e) =>
                        updateSettings("system.appName", e.target.value)
                      }
                      placeholder="Enter application name"
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
                      placeholder="support@example.com"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="appDescription">
                    Application Description
                  </Label>
                  <Textarea
                    id="appDescription"
                    value={settings.system.appDescription}
                    onChange={(e) =>
                      updateSettings("system.appDescription", e.target.value)
                    }
                    rows={3}
                    placeholder="Describe your application"
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
                    placeholder="https://example.com"
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
                  Configure email delivery settings for notifications and
                  communications
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
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
                    <Select
                      value={settings.system.smtp.port.toString()}
                      onValueChange={(value) =>
                        updateSettings("system.smtp.port", parseInt(value))
                      }
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="25">25 (Standard)</SelectItem>
                        <SelectItem value="465">465 (SSL)</SelectItem>
                        <SelectItem value="587">587 (TLS)</SelectItem>
                        <SelectItem value="2525">2525 (Alternative)</SelectItem>
                      </SelectContent>
                    </Select>
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
                  <Label
                    htmlFor="smtpSecure"
                    className="flex items-center gap-2"
                  >
                    Use SSL/TLS
                    <Tooltip>
                      <TooltipTrigger>
                        <Info className="h-4 w-4 text-muted-foreground" />
                      </TooltipTrigger>
                      <TooltipContent>
                        <p>Enable secure connection for email delivery</p>
                      </TooltipContent>
                    </Tooltip>
                  </Label>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <Label htmlFor="smtpUsername">Username</Label>
                    <Input
                      id="smtpUsername"
                      value={settings.system.smtp.username}
                      onChange={(e) =>
                        updateSettings("system.smtp.username", e.target.value)
                      }
                      placeholder="your-email@gmail.com"
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
                        placeholder="Enter SMTP password"
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

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <Label htmlFor="fromName">From Name</Label>
                    <Input
                      id="fromName"
                      value={settings.system.smtp.fromName}
                      onChange={(e) =>
                        updateSettings("system.smtp.fromName", e.target.value)
                      }
                      placeholder="Your App Name"
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
                      placeholder="noreply@yourapp.com"
                    />
                  </div>
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
                  Security Policies
                </CardTitle>
                <CardDescription>
                  Configure authentication and security settings
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
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
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <Label htmlFor="passwordMinLength">
                      Min Password Length
                    </Label>
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

                <Separator />

                <div className="space-y-4">
                  <h4 className="text-sm font-medium">Security Features</h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="flex items-center space-x-2">
                      <Switch
                        id="enforceSSL"
                        checked={settings.system.security.enforceSSL}
                        onCheckedChange={(checked) =>
                          updateSettings("system.security.enforceSSL", checked)
                        }
                      />
                      <Label
                        htmlFor="enforceSSL"
                        className="flex items-center gap-2"
                      >
                        Enforce SSL/HTTPS
                        <Tooltip>
                          <TooltipTrigger>
                            <Info className="h-4 w-4 text-muted-foreground" />
                          </TooltipTrigger>
                          <TooltipContent>
                            <p>Force all connections to use HTTPS</p>
                          </TooltipContent>
                        </Tooltip>
                      </Label>
                    </div>

                    <div className="flex items-center space-x-2">
                      <Switch
                        id="requireEmailVerification"
                        checked={
                          settings.system.security.requireEmailVerification
                        }
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
                          updateSettings(
                            "system.security.enableTwoFactor",
                            checked
                          )
                        }
                      />
                      <Label htmlFor="enableTwoFactor">
                        Enable Two-Factor Authentication
                      </Label>
                    </div>
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
                  Platform Features
                </CardTitle>
                <CardDescription>
                  Enable or disable platform functionality
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-4">
                    <h4 className="text-sm font-medium">Core Features</h4>
                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-2">
                          <Switch
                            id="enableSignup"
                            checked={settings.features.enableSignup}
                            onCheckedChange={(checked) =>
                              updateSettings("features.enableSignup", checked)
                            }
                          />
                          <Label htmlFor="enableSignup">
                            User Registration
                          </Label>
                        </div>
                        <Badge variant="outline" className="text-xs">
                          Core
                        </Badge>
                      </div>

                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-2">
                          <Switch
                            id="enableTeams"
                            checked={settings.features.enableTeams}
                            onCheckedChange={(checked) =>
                              updateSettings("features.enableTeams", checked)
                            }
                          />
                          <Label htmlFor="enableTeams">Teams</Label>
                        </div>
                        <Badge variant="outline" className="text-xs">
                          Premium
                        </Badge>
                      </div>

                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-2">
                          <Switch
                            id="enableAPIAccess"
                            checked={settings.features.enableAPIAccess}
                            onCheckedChange={(checked) =>
                              updateSettings(
                                "features.enableAPIAccess",
                                checked
                              )
                            }
                          />
                          <Label htmlFor="enableAPIAccess">API Access</Label>
                        </div>
                        <Badge variant="outline" className="text-xs">
                          Premium
                        </Badge>
                      </div>

                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-2">
                          <Switch
                            id="enableCustomDomains"
                            checked={settings.features.enableCustomDomains}
                            onCheckedChange={(checked) =>
                              updateSettings(
                                "features.enableCustomDomains",
                                checked
                              )
                            }
                          />
                          <Label htmlFor="enableCustomDomains">
                            Custom Domains
                          </Label>
                        </div>
                        <Badge variant="outline" className="text-xs">
                          Premium
                        </Badge>
                      </div>
                    </div>
                  </div>

                  <div className="space-y-4">
                    <h4 className="text-sm font-medium">Advanced Features</h4>
                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-2">
                          <Switch
                            id="enableQRCodes"
                            checked={settings.features.enableQRCodes}
                            onCheckedChange={(checked) =>
                              updateSettings("features.enableQRCodes", checked)
                            }
                          />
                          <Label htmlFor="enableQRCodes">QR Codes</Label>
                        </div>
                        <Badge variant="outline" className="text-xs">
                          Premium
                        </Badge>
                      </div>

                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-2">
                          <Switch
                            id="enableBulkOperations"
                            checked={settings.features.enableBulkOperations}
                            onCheckedChange={(checked) =>
                              updateSettings(
                                "features.enableBulkOperations",
                                checked
                              )
                            }
                          />
                          <Label htmlFor="enableBulkOperations">
                            Bulk Operations
                          </Label>
                        </div>
                        <Badge variant="outline" className="text-xs">
                          Premium
                        </Badge>
                      </div>

                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-2">
                          <Switch
                            id="enableWhiteLabel"
                            checked={settings.features.enableWhiteLabel}
                            onCheckedChange={(checked) =>
                              updateSettings(
                                "features.enableWhiteLabel",
                                checked
                              )
                            }
                          />
                          <Label htmlFor="enableWhiteLabel">White Label</Label>
                        </div>
                        <Badge variant="outline" className="text-xs">
                          Enterprise
                        </Badge>
                      </div>
                    </div>
                  </div>
                </div>

                <Separator />

                <div className="space-y-4">
                  <h4 className="text-sm font-medium">System Controls</h4>
                  <div className="flex items-center space-x-2">
                    <Switch
                      id="maintenanceMode"
                      checked={settings.features.maintenanceMode}
                      onCheckedChange={(checked) =>
                        updateSettings("features.maintenanceMode", checked)
                      }
                    />
                    <Label
                      htmlFor="maintenanceMode"
                      className="flex items-center gap-2"
                    >
                      Maintenance Mode
                      <Tooltip>
                        <TooltipTrigger>
                          <Info className="h-4 w-4 text-muted-foreground" />
                        </TooltipTrigger>
                        <TooltipContent>
                          <p>Only administrators can access the platform</p>
                        </TooltipContent>
                      </Tooltip>
                    </Label>
                  </div>

                  {settings.features.maintenanceMode && (
                    <Alert>
                      <AlertTriangle className="h-4 w-4" />
                      <AlertDescription>
                        <strong>Maintenance mode is active.</strong> Only
                        administrators can access the platform. Regular users
                        will see a maintenance page.
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
                        updateSettings(
                          `defaultLimits.${plan}.analytics`,
                          checked
                        )
                      }
                    />
                    <Label>Analytics Access</Label>
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
                  <Label className="flex items-center gap-2">
                    Enable Stripe Integration
                    {settings.system.integrations.stripe.enabled && (
                      <Badge
                        variant="outline"
                        className="text-green-600 bg-green-100 dark:text-green-400 dark:bg-green-900"
                      >
                        <CheckCircle2 className="h-3 w-3 mr-1" />
                        Active
                      </Badge>
                    )}
                  </Label>
                </div>

                {settings.system.integrations.stripe.enabled && (
                  <div className="space-y-4 pl-6 border-l-2 border-muted">
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
                        placeholder="pk_test_..."
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
                        placeholder="sk_test_..."
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

            {/* Google OAuth */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Globe className="h-5 w-5" />
                  Google OAuth
                </CardTitle>
                <CardDescription>
                  Enable social login with Google accounts
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
                  <Label className="flex items-center gap-2">
                    Enable Google OAuth
                    {settings.system.integrations.google.enabled && (
                      <Badge
                        variant="outline"
                        className="text-green-600 bg-green-100 dark:text-green-400 dark:bg-green-900"
                      >
                        <CheckCircle2 className="h-3 w-3 mr-1" />
                        Active
                      </Badge>
                    )}
                  </Label>
                </div>

                {settings.system.integrations.google.enabled && (
                  <div className="space-y-4 pl-6 border-l-2 border-muted">
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
                        placeholder="Your Google OAuth Client ID"
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
                        placeholder="Your Google OAuth Client Secret"
                      />
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Analytics */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Activity className="h-5 w-5" />
                  Analytics Configuration
                </CardTitle>
                <CardDescription>
                  Configure analytics tracking and data retention
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <Label>Analytics Provider</Label>
                    <Select
                      value={settings.system.analytics.provider}
                      onValueChange={(value) =>
                        updateSettings("system.analytics.provider", value)
                      }
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="internal">
                          Internal Analytics
                        </SelectItem>
                        <SelectItem value="google">Google Analytics</SelectItem>
                        <SelectItem value="custom">Custom Provider</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Data Retention (days)</Label>
                    <Input
                      type="number"
                      min="1"
                      max="3650"
                      value={settings.system.analytics.retentionDays}
                      onChange={(e) =>
                        updateSettings(
                          "system.analytics.retentionDays",
                          parseInt(e.target.value)
                        )
                      }
                    />
                  </div>
                </div>

                {settings.system.analytics.provider !== "internal" && (
                  <div className="space-y-2">
                    <Label>Tracking Code / ID</Label>
                    <Textarea
                      value={settings.system.analytics.trackingCode}
                      onChange={(e) =>
                        updateSettings(
                          "system.analytics.trackingCode",
                          e.target.value
                        )
                      }
                      placeholder="Enter your analytics tracking code or ID"
                      rows={2}
                    />
                  </div>
                )}

                <div className="flex items-center space-x-2">
                  <Switch
                    checked={settings.system.analytics.enableCustomAnalytics}
                    onCheckedChange={(checked) =>
                      updateSettings(
                        "system.analytics.enableCustomAnalytics",
                        checked
                      )
                    }
                  />
                  <Label>Enable Custom Analytics</Label>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </TooltipProvider>
  );
}
