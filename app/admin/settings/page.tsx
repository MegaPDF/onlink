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
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
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
import {
  Settings,
  Save,
  RefreshCw,
  Database,
  Mail,
  Shield,
  Globe,
  Zap,
  AlertTriangle,
  CheckCircle,
  Upload,
  Download,
  Eye,
  EyeOff,
  Server,
  Lock,
  Key,
  Bell,
  Users,
  CreditCard,
  FileText,
  Trash2,
  BarChart3,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface SystemSettings {
  general: {
    siteName: string;
    siteDescription: string;
    siteUrl: string;
    supportEmail: string;
    timezone: string;
    language: string;
    maintenance: boolean;
    registrationEnabled: boolean;
    defaultPlan: string;
  };
  email: {
    provider: "smtp" | "sendgrid" | "mailgun" | "ses";
    smtp: {
      host: string;
      port: number;
      secure: boolean;
      username: string;
      password: string;
      fromEmail: string;
      fromName: string;
    };
    sendgrid: {
      apiKey: string;
      fromEmail: string;
      fromName: string;
    };
    templates: {
      welcome: string;
      passwordReset: string;
      verification: string;
    };
  };
  security: {
    rateLimiting: {
      enabled: boolean;
      requests: number;
      windowMs: number;
    };
    cors: {
      enabled: boolean;
      origins: string[];
    };
    csrf: {
      enabled: boolean;
    };
    encryption: {
      algorithm: string;
      keyRotationDays: number;
    };
    sessions: {
      maxAge: number;
      secure: boolean;
      httpOnly: boolean;
    };
  };
  integrations: {
    stripe: {
      enabled: boolean;
      publicKey: string;
      secretKey: string;
      webhookSecret: string;
    };
    analytics: {
      googleAnalytics: {
        enabled: boolean;
        trackingId: string;
      };
      plausible: {
        enabled: boolean;
        domain: string;
      };
    };
    storage: {
      provider: "local" | "s3" | "cloudinary";
      s3: {
        bucket: string;
        region: string;
        accessKey: string;
        secretKey: string;
      };
    };
  };
  limits: {
    free: {
      linksPerMonth: number;
      clicksPerMonth: number;
      folders: number;
      customDomains: number;
    };
    premium: {
      linksPerMonth: number;
      clicksPerMonth: number;
      folders: number;
      customDomains: number;
    };
    team: {
      linksPerMonth: number;
      clicksPerMonth: number;
      folders: number;
      customDomains: number;
      teamMembers: number;
    };
  };
}

export default function AdminSettingsPage() {
  const toast = useToast();
  const [settings, setSettings] = useState<SystemSettings | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [showPasswords, setShowPasswords] = useState(false);
  const [testingEmail, setTestingEmail] = useState(false);

  useEffect(() => {
    fetchSettings();
  }, []);

  const fetchSettings = async () => {
    try {
      const response = await fetch("/api/admin/settings");
      if (response.ok) {
        const data = await response.json();
        setSettings(data.data);
      }
    } catch (error) {
      console.error("Failed to fetch settings:", error);
    } finally {
      setLoading(false);
    }
  };

  const saveSettings = async (section?: keyof SystemSettings) => {
    if (!settings) return;

    setSaving(true);
    try {
      const payload = section ? { [section]: settings[section] } : settings;

      const response = await fetch("/api/admin/settings", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (response.ok) {
        toast.success(
          `${
            section
              ? section.charAt(0).toUpperCase() + section.slice(1)
              : "Settings"
          } saved successfully`
        );
      } else {
        const result = await response.json();
        throw new Error(result.error);
      }
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Failed to save settings"
      );
    } finally {
      setSaving(false);
    }
  };

  const testEmailSettings = async () => {
    setTestingEmail(true);
    try {
      const response = await fetch("/api/admin/settings/test-email", {
        method: "POST",
      });

      if (response.ok) {
        toast.success("Test email sent successfully");
      } else {
        const result = await response.json();
        throw new Error(result.error);
      }
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Failed to send test email"
      );
    } finally {
      setTestingEmail(false);
    }
  };

  const exportSettings = async () => {
    try {
      const response = await fetch("/api/admin/settings/export");
      if (response.ok) {
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = "system-settings.json";
        a.click();
        window.URL.revokeObjectURL(url);
      }
    } catch (error) {
      toast.error("Failed to export settings");
    }
  };

  const importSettings = async (file: File) => {
    try {
      const formData = new FormData();
      formData.append("file", file);

      const response = await fetch("/api/admin/settings/import", {
        method: "POST",
        body: formData,
      });

      if (response.ok) {
        toast.success("Settings imported successfully");
        fetchSettings();
      } else {
        const result = await response.json();
        throw new Error(result.error);
      }
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Failed to import settings"
      );
    }
  };

  const resetToDefaults = async () => {
    try {
      const response = await fetch("/api/admin/settings/reset", {
        method: "POST",
      });

      if (response.ok) {
        toast.success("Settings reset to defaults");
        fetchSettings();
      } else {
        throw new Error("Failed to reset settings");
      }
    } catch (error) {
      toast.error("Failed to reset settings");
    }
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="h-8 bg-muted animate-pulse rounded" />
        <div className="grid gap-6">
          {Array.from({ length: 4 }).map((_, i) => (
            <Card key={i}>
              <CardContent className="p-6">
                <div className="h-32 bg-muted animate-pulse rounded" />
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  if (!settings) {
    return (
      <div className="text-center py-12">
        <AlertTriangle className="mx-auto h-12 w-12 text-red-600 mb-4" />
        <h3 className="text-lg font-semibold mb-2">Failed to Load Settings</h3>
        <p className="text-muted-foreground mb-4">
          There was an error loading the system settings.
        </p>
        <Button onClick={fetchSettings}>
          <RefreshCw className="mr-2 h-4 w-4" />
          Retry
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">System Settings</h1>
          <p className="text-muted-foreground">
            Configure system-wide settings and integrations
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button variant="outline" onClick={exportSettings}>
            <Download className="mr-2 h-4 w-4" />
            Export
          </Button>

          <input
            type="file"
            accept=".json"
            className="hidden"
            id="import-settings"
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) importSettings(file);
            }}
          />
          <Button variant="outline" asChild>
            <label htmlFor="import-settings">
              <Upload className="mr-2 h-4 w-4" />
              Import
            </label>
          </Button>

          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button variant="outline">
                <RefreshCw className="mr-2 h-4 w-4" />
                Reset
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Reset to Defaults</AlertDialogTitle>
                <AlertDialogDescription>
                  This will reset all settings to their default values. This
                  action cannot be undone.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction onClick={resetToDefaults}>
                  Reset Settings
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>
      </div>

      <Tabs defaultValue="general" className="space-y-6">
        <TabsList className="grid w-full grid-cols-5">
          <TabsTrigger value="general">General</TabsTrigger>
          <TabsTrigger value="email">Email</TabsTrigger>
          <TabsTrigger value="security">Security</TabsTrigger>
          <TabsTrigger value="integrations">Integrations</TabsTrigger>
          <TabsTrigger value="limits">Plan Limits</TabsTrigger>
        </TabsList>

        <TabsContent value="general">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Globe className="h-5 w-5" />
                General Settings
              </CardTitle>
              <CardDescription>
                Basic site configuration and preferences
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="site-name">Site Name</Label>
                  <Input
                    id="site-name"
                    value={settings.general.siteName}
                    onChange={(e) =>
                      setSettings((prev) =>
                        prev
                          ? {
                              ...prev,
                              general: {
                                ...prev.general,
                                siteName: e.target.value,
                              },
                            }
                          : null
                      )
                    }
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="site-url">Site URL</Label>
                  <Input
                    id="site-url"
                    value={settings.general.siteUrl}
                    onChange={(e) =>
                      setSettings((prev) =>
                        prev
                          ? {
                              ...prev,
                              general: {
                                ...prev.general,
                                siteUrl: e.target.value,
                              },
                            }
                          : null
                      )
                    }
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="support-email">Support Email</Label>
                  <Input
                    id="support-email"
                    type="email"
                    value={settings.general.supportEmail}
                    onChange={(e) =>
                      setSettings((prev) =>
                        prev
                          ? {
                              ...prev,
                              general: {
                                ...prev.general,
                                supportEmail: e.target.value,
                              },
                            }
                          : null
                      )
                    }
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="default-plan">Default Plan</Label>
                  <Select
                    value={settings.general.defaultPlan}
                    onValueChange={(value) =>
                      setSettings((prev) =>
                        prev
                          ? {
                              ...prev,
                              general: { ...prev.general, defaultPlan: value },
                            }
                          : null
                      )
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="free">Free</SelectItem>
                      <SelectItem value="premium">Premium</SelectItem>
                      <SelectItem value="team">Team</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="site-description">Site Description</Label>
                <Textarea
                  id="site-description"
                  value={settings.general.siteDescription}
                  onChange={(e) =>
                    setSettings((prev) =>
                      prev
                        ? {
                            ...prev,
                            general: {
                              ...prev.general,
                              siteDescription: e.target.value,
                            },
                          }
                        : null
                    )
                  }
                />
              </div>

              <Separator />

              <div className="space-y-4">
                <h3 className="text-lg font-medium">System Toggles</h3>

                <div className="flex items-center justify-between">
                  <div>
                    <Label htmlFor="maintenance-mode">Maintenance Mode</Label>
                    <p className="text-sm text-muted-foreground">
                      Enable to temporarily disable public access
                    </p>
                  </div>
                  <Switch
                    id="maintenance-mode"
                    checked={settings.general.maintenance}
                    onCheckedChange={(checked) =>
                      setSettings((prev) =>
                        prev
                          ? {
                              ...prev,
                              general: {
                                ...prev.general,
                                maintenance: checked,
                              },
                            }
                          : null
                      )
                    }
                  />
                </div>

                <div className="flex items-center justify-between">
                  <div>
                    <Label htmlFor="registration-enabled">
                      User Registration
                    </Label>
                    <p className="text-sm text-muted-foreground">
                      Allow new users to register accounts
                    </p>
                  </div>
                  <Switch
                    id="registration-enabled"
                    checked={settings.general.registrationEnabled}
                    onCheckedChange={(checked) =>
                      setSettings((prev) =>
                        prev
                          ? {
                              ...prev,
                              general: {
                                ...prev.general,
                                registrationEnabled: checked,
                              },
                            }
                          : null
                      )
                    }
                  />
                </div>
              </div>

              <Button onClick={() => saveSettings("general")} disabled={saving}>
                <Save className="mr-2 h-4 w-4" />
                {saving ? "Saving..." : "Save General Settings"}
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="email">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Mail className="h-5 w-5" />
                Email Configuration
              </CardTitle>
              <CardDescription>
                Configure email providers and templates
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label>Email Provider</Label>
                  <Select
                    value={settings.email.provider}
                    onValueChange={(value: any) =>
                      setSettings((prev) =>
                        prev
                          ? {
                              ...prev,
                              email: { ...prev.email, provider: value },
                            }
                          : null
                      )
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="smtp">SMTP</SelectItem>
                      <SelectItem value="sendgrid">SendGrid</SelectItem>
                      <SelectItem value="mailgun">Mailgun</SelectItem>
                      <SelectItem value="ses">Amazon SES</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {settings.email.provider === "smtp" && (
                  <div className="space-y-4 p-4 border rounded-lg">
                    <h4 className="font-medium">SMTP Configuration</h4>
                    <div className="grid gap-4 md:grid-cols-2">
                      <div className="space-y-2">
                        <Label>Host</Label>
                        <Input
                          value={settings.email.smtp.host}
                          onChange={(e) =>
                            setSettings((prev) =>
                              prev
                                ? {
                                    ...prev,
                                    email: {
                                      ...prev.email,
                                      smtp: {
                                        ...prev.email.smtp,
                                        host: e.target.value,
                                      },
                                    },
                                  }
                                : null
                            )
                          }
                        />
                      </div>

                      <div className="space-y-2">
                        <Label>Port</Label>
                        <Input
                          type="number"
                          value={settings.email.smtp.port}
                          onChange={(e) =>
                            setSettings((prev) =>
                              prev
                                ? {
                                    ...prev,
                                    email: {
                                      ...prev.email,
                                      smtp: {
                                        ...prev.email.smtp,
                                        port: parseInt(e.target.value) || 587,
                                      },
                                    },
                                  }
                                : null
                            )
                          }
                        />
                      </div>

                      <div className="space-y-2">
                        <Label>Username</Label>
                        <Input
                          value={settings.email.smtp.username}
                          onChange={(e) =>
                            setSettings((prev) =>
                              prev
                                ? {
                                    ...prev,
                                    email: {
                                      ...prev.email,
                                      smtp: {
                                        ...prev.email.smtp,
                                        username: e.target.value,
                                      },
                                    },
                                  }
                                : null
                            )
                          }
                        />
                      </div>

                      <div className="space-y-2">
                        <Label>Password</Label>
                        <div className="relative">
                          <Input
                            type={showPasswords ? "text" : "password"}
                            value={settings.email.smtp.password}
                            onChange={(e) =>
                              setSettings((prev) =>
                                prev
                                  ? {
                                      ...prev,
                                      email: {
                                        ...prev.email,
                                        smtp: {
                                          ...prev.email.smtp,
                                          password: e.target.value,
                                        },
                                      },
                                    }
                                  : null
                              )
                            }
                          />
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            className="absolute right-0 top-0 h-full px-3"
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

                      <div className="space-y-2">
                        <Label>From Email</Label>
                        <Input
                          type="email"
                          value={settings.email.smtp.fromEmail}
                          onChange={(e) =>
                            setSettings((prev) =>
                              prev
                                ? {
                                    ...prev,
                                    email: {
                                      ...prev.email,
                                      smtp: {
                                        ...prev.email.smtp,
                                        fromEmail: e.target.value,
                                      },
                                    },
                                  }
                                : null
                            )
                          }
                        />
                      </div>

                      <div className="space-y-2">
                        <Label>From Name</Label>
                        <Input
                          value={settings.email.smtp.fromName}
                          onChange={(e) =>
                            setSettings((prev) =>
                              prev
                                ? {
                                    ...prev,
                                    email: {
                                      ...prev.email,
                                      smtp: {
                                        ...prev.email.smtp,
                                        fromName: e.target.value,
                                      },
                                    },
                                  }
                                : null
                            )
                          }
                        />
                      </div>
                    </div>

                    <div className="flex items-center space-x-2">
                      <Switch
                        id="smtp-secure"
                        checked={settings.email.smtp.secure}
                        onCheckedChange={(checked) =>
                          setSettings((prev) =>
                            prev
                              ? {
                                  ...prev,
                                  email: {
                                    ...prev.email,
                                    smtp: {
                                      ...prev.email.smtp,
                                      secure: checked,
                                    },
                                  },
                                }
                              : null
                          )
                        }
                      />
                      <Label htmlFor="smtp-secure">Use SSL/TLS</Label>
                    </div>
                  </div>
                )}

                <div className="flex gap-2">
                  <Button
                    onClick={() => saveSettings("email")}
                    disabled={saving}
                  >
                    <Save className="mr-2 h-4 w-4" />
                    {saving ? "Saving..." : "Save Email Settings"}
                  </Button>

                  <Button
                    variant="outline"
                    onClick={testEmailSettings}
                    disabled={testingEmail}
                  >
                    <Mail className="mr-2 h-4 w-4" />
                    {testingEmail ? "Sending..." : "Test Email"}
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="security">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Shield className="h-5 w-5" />
                Security Settings
              </CardTitle>
              <CardDescription>
                Configure security policies and protections
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Rate Limiting */}
              <div className="space-y-4">
                <h3 className="text-lg font-medium">Rate Limiting</h3>

                <div className="flex items-center justify-between">
                  <div>
                    <Label>Enable Rate Limiting</Label>
                    <p className="text-sm text-muted-foreground">
                      Protect against abuse and DDoS attacks
                    </p>
                  </div>
                  <Switch
                    checked={settings.security.rateLimiting.enabled}
                    onCheckedChange={(checked) =>
                      setSettings((prev) =>
                        prev
                          ? {
                              ...prev,
                              security: {
                                ...prev.security,
                                rateLimiting: {
                                  ...prev.security.rateLimiting,
                                  enabled: checked,
                                },
                              },
                            }
                          : null
                      )
                    }
                  />
                </div>

                {settings.security.rateLimiting.enabled && (
                  <div className="grid gap-4 md:grid-cols-2 p-4 border rounded-lg">
                    <div className="space-y-2">
                      <Label>Requests per Window</Label>
                      <Input
                        type="number"
                        value={settings.security.rateLimiting.requests}
                        onChange={(e) =>
                          setSettings((prev) =>
                            prev
                              ? {
                                  ...prev,
                                  security: {
                                    ...prev.security,
                                    rateLimiting: {
                                      ...prev.security.rateLimiting,
                                      requests: parseInt(e.target.value) || 100,
                                    },
                                  },
                                }
                              : null
                          )
                        }
                      />
                    </div>

                    <div className="space-y-2">
                      <Label>Window (milliseconds)</Label>
                      <Input
                        type="number"
                        value={settings.security.rateLimiting.windowMs}
                        onChange={(e) =>
                          setSettings((prev) =>
                            prev
                              ? {
                                  ...prev,
                                  security: {
                                    ...prev.security,
                                    rateLimiting: {
                                      ...prev.security.rateLimiting,
                                      windowMs:
                                        parseInt(e.target.value) || 900000,
                                    },
                                  },
                                }
                              : null
                          )
                        }
                      />
                    </div>
                  </div>
                )}
              </div>

              <Separator />

              {/* CORS */}
              <div className="space-y-4">
                <h3 className="text-lg font-medium">CORS Configuration</h3>

                <div className="flex items-center justify-between">
                  <div>
                    <Label>Enable CORS</Label>
                    <p className="text-sm text-muted-foreground">
                      Control cross-origin resource sharing
                    </p>
                  </div>
                  <Switch
                    checked={settings.security.cors.enabled}
                    onCheckedChange={(checked) =>
                      setSettings((prev) =>
                        prev
                          ? {
                              ...prev,
                              security: {
                                ...prev.security,
                                cors: {
                                  ...prev.security.cors,
                                  enabled: checked,
                                },
                              },
                            }
                          : null
                      )
                    }
                  />
                </div>

                {settings.security.cors.enabled && (
                  <div className="space-y-2">
                    <Label>Allowed Origins (one per line)</Label>
                    <Textarea
                      value={settings.security.cors.origins.join("\n")}
                      onChange={(e) =>
                        setSettings((prev) =>
                          prev
                            ? {
                                ...prev,
                                security: {
                                  ...prev.security,
                                  cors: {
                                    ...prev.security.cors,
                                    origins: e.target.value
                                      .split("\n")
                                      .filter((o) => o.trim()),
                                  },
                                },
                              }
                            : null
                        )
                      }
                      placeholder="https://example.com&#10;https://app.example.com"
                    />
                  </div>
                )}
              </div>

              <Button
                onClick={() => saveSettings("security")}
                disabled={saving}
              >
                <Save className="mr-2 h-4 w-4" />
                {saving ? "Saving..." : "Save Security Settings"}
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="integrations">
          <div className="space-y-6">
            {/* Stripe */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <CreditCard className="h-5 w-5" />
                  Stripe Integration
                </CardTitle>
                <CardDescription>
                  Configure Stripe for payment processing
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <Label>Enable Stripe</Label>
                    <p className="text-sm text-muted-foreground">
                      Enable payment processing with Stripe
                    </p>
                  </div>
                  <Switch
                    checked={settings.integrations.stripe.enabled}
                    onCheckedChange={(checked) =>
                      setSettings((prev) =>
                        prev
                          ? {
                              ...prev,
                              integrations: {
                                ...prev.integrations,
                                stripe: {
                                  ...prev.integrations.stripe,
                                  enabled: checked,
                                },
                              },
                            }
                          : null
                      )
                    }
                  />
                </div>

                {settings.integrations.stripe.enabled && (
                  <div className="grid gap-4 md:grid-cols-2">
                    <div className="space-y-2">
                      <Label>Publishable Key</Label>
                      <Input
                        value={settings.integrations.stripe.publicKey}
                        onChange={(e) =>
                          setSettings((prev) =>
                            prev
                              ? {
                                  ...prev,
                                  integrations: {
                                    ...prev.integrations,
                                    stripe: {
                                      ...prev.integrations.stripe,
                                      publicKey: e.target.value,
                                    },
                                  },
                                }
                              : null
                          )
                        }
                      />
                    </div>

                    <div className="space-y-2">
                      <Label>Secret Key</Label>
                      <div className="relative">
                        <Input
                          type={showPasswords ? "text" : "password"}
                          value={settings.integrations.stripe.secretKey}
                          onChange={(e) =>
                            setSettings((prev) =>
                              prev
                                ? {
                                    ...prev,
                                    integrations: {
                                      ...prev.integrations,
                                      stripe: {
                                        ...prev.integrations.stripe,
                                        secretKey: e.target.value,
                                      },
                                    },
                                  }
                                : null
                            )
                          }
                        />
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          className="absolute right-0 top-0 h-full px-3"
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

                    <div className="space-y-2 md:col-span-2">
                      <Label>Webhook Secret</Label>
                      <Input
                        type={showPasswords ? "text" : "password"}
                        value={settings.integrations.stripe.webhookSecret}
                        onChange={(e) =>
                          setSettings((prev) =>
                            prev
                              ? {
                                  ...prev,
                                  integrations: {
                                    ...prev.integrations,
                                    stripe: {
                                      ...prev.integrations.stripe,
                                      webhookSecret: e.target.value,
                                    },
                                  },
                                }
                              : null
                          )
                        }
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
                  <BarChart3 className="h-5 w-5" />
                  Analytics Integration
                </CardTitle>
                <CardDescription>Configure analytics providers</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* Google Analytics */}
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <Label>Google Analytics</Label>
                      <p className="text-sm text-muted-foreground">
                        Track website analytics with Google Analytics
                      </p>
                    </div>
                    <Switch
                      checked={
                        settings.integrations.analytics.googleAnalytics.enabled
                      }
                      onCheckedChange={(checked) =>
                        setSettings((prev) =>
                          prev
                            ? {
                                ...prev,
                                integrations: {
                                  ...prev.integrations,
                                  analytics: {
                                    ...prev.integrations.analytics,
                                    googleAnalytics: {
                                      ...prev.integrations.analytics
                                        .googleAnalytics,
                                      enabled: checked,
                                    },
                                  },
                                },
                              }
                            : null
                        )
                      }
                    />
                  </div>

                  {settings.integrations.analytics.googleAnalytics.enabled && (
                    <div className="space-y-2">
                      <Label>Tracking ID</Label>
                      <Input
                        placeholder="G-XXXXXXXXXX"
                        value={
                          settings.integrations.analytics.googleAnalytics
                            .trackingId
                        }
                        onChange={(e) =>
                          setSettings((prev) =>
                            prev
                              ? {
                                  ...prev,
                                  integrations: {
                                    ...prev.integrations,
                                    analytics: {
                                      ...prev.integrations.analytics,
                                      googleAnalytics: {
                                        ...prev.integrations.analytics
                                          .googleAnalytics,
                                        trackingId: e.target.value,
                                      },
                                    },
                                  },
                                }
                              : null
                          )
                        }
                      />
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="limits">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Users className="h-5 w-5" />
                Plan Limits
              </CardTitle>
              <CardDescription>
                Configure usage limits for different subscription plans
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {Object.entries(settings.limits).map(([planName, limits]) => (
                <div key={planName} className="space-y-4 p-4 border rounded-lg">
                  <h3 className="text-lg font-medium capitalize">
                    {planName} Plan
                  </h3>

                  <div className="grid gap-4 md:grid-cols-2">
                    <div className="space-y-2">
                      <Label>Links per Month</Label>
                      <Input
                        type="number"
                        value={
                          limits.linksPerMonth === -1
                            ? ""
                            : limits.linksPerMonth
                        }
                        placeholder="Unlimited"
                        onChange={(e) => {
                          const value =
                            e.target.value === ""
                              ? -1
                              : parseInt(e.target.value) || 0;
                          setSettings((prev) =>
                            prev
                              ? {
                                  ...prev,
                                  limits: {
                                    ...prev.limits,
                                    [planName]: {
                                      ...limits,
                                      linksPerMonth: value,
                                    },
                                  },
                                }
                              : null
                          );
                        }}
                      />
                    </div>

                    <div className="space-y-2">
                      <Label>Folders</Label>
                      <Input
                        type="number"
                        value={limits.folders === -1 ? "" : limits.folders}
                        placeholder="Unlimited"
                        onChange={(e) => {
                          const value =
                            e.target.value === ""
                              ? -1
                              : parseInt(e.target.value) || 0;
                          setSettings((prev) =>
                            prev
                              ? {
                                  ...prev,
                                  limits: {
                                    ...prev.limits,
                                    [planName]: { ...limits, folders: value },
                                  },
                                }
                              : null
                          );
                        }}
                      />
                    </div>

                    <div className="space-y-2">
                      <Label>Custom Domains</Label>
                      <Input
                        type="number"
                        value={
                          limits.customDomains === -1
                            ? ""
                            : limits.customDomains
                        }
                        placeholder="Unlimited"
                        onChange={(e) => {
                          const value =
                            e.target.value === ""
                              ? -1
                              : parseInt(e.target.value) || 0;
                          setSettings((prev) =>
                            prev
                              ? {
                                  ...prev,
                                  limits: {
                                    ...prev.limits,
                                    [planName]: {
                                      ...limits,
                                      customDomains: value,
                                    },
                                  },
                                }
                              : null
                          );
                        }}
                      />
                    </div>

                    {planName === "team" && (
                      <div className="space-y-2">
                        <Label>Team Members</Label>
                        <Input
                          type="number"
                          value={
                            limits.teamMembers === -1 ? "" : limits.teamMembers
                          }
                          placeholder="Unlimited"
                          onChange={(e) => {
                            const value =
                              e.target.value === ""
                                ? -1
                                : parseInt(e.target.value) || 0;
                            setSettings((prev) =>
                              prev
                                ? {
                                    ...prev,
                                    limits: {
                                      ...prev.limits,
                                      [planName]: {
                                        ...limits,
                                        teamMembers: value,
                                      },
                                    },
                                  }
                                : null
                            );
                          }}
                        />
                      </div>
                    )}
                  </div>
                </div>
              ))}

              <Button onClick={() => saveSettings("limits")} disabled={saving}>
                <Save className="mr-2 h-4 w-4" />
                {saving ? "Saving..." : "Save Plan Limits"}
              </Button>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
