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
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
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
import { LoadingSpinner } from "@/components/ui/loading-spinner";
import {
  User,
  Settings,
  Bell,
  Shield,
  Globe,
  Key,
  Trash2,
  Save,
  Crown,
  Mail,
  Lock,
  Eye,
  EyeOff,
  Upload,
  Download,
  Smartphone,
  Monitor,
} from "lucide-react";
import Link from "next/link";

interface UserSettings {
  profile: {
    name: string;
    email: string;
    avatar?: string;
    bio?: string;
    timezone: string;
    language: string;
  };
  preferences: {
    defaultDomain: string;
    defaultFolder?: string;
    autoGenerateQR: boolean;
    trackClicks: boolean;
    showClickPreview: boolean;
    emailNotifications: boolean;
    browserNotifications: boolean;
    weeklyReports: boolean;
  };
  security: {
    twoFactorEnabled: boolean;
    lastPasswordChange: string;
    activeSessions: number;
  };
  domains: {
    custom: string[];
    verified: string[];
  };
}

export default function SettingsPage() {
  const { user } = useAuth();
  const toast = useToast();
  
  const [settings, setSettings] = useState<UserSettings | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [activeTab, setActiveTab] = useState("profile");
  const [showPasswordDialog, setShowPasswordDialog] = useState(false);
  const [passwords, setPasswords] = useState({
    current: "",
    new: "",
    confirm: "",
  });
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);

  useEffect(() => {
    fetchSettings();
  }, []);

  const fetchSettings = async () => {
    try {
      setLoading(true);
      const response = await fetch("/api/client/settings");
      const result = await response.json();

      if (response.ok) {
        setSettings(result.data);
      } else {
        toast.error(result.error || "Failed to fetch settings");
      }
    } catch (error) {
      console.error("Failed to fetch settings:", error);
      toast.error("Failed to fetch settings");
    } finally {
      setLoading(false);
    }
  };

  const updateSettings = async (section: keyof UserSettings, data: any) => {
    try {
      setSaving(true);
      const response = await fetch("/api/client/settings", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ section, data }),
      });

      const result = await response.json();

      if (response.ok) {
        setSettings(result.data);
        toast.success("Settings updated successfully");
        
        // Update auth context if profile changed
        // Optionally, trigger a refetch or update here if your auth context supports it
      } else {
        toast.error(result.error || "Failed to update settings");
      }
    } catch (error) {
      console.error("Failed to update settings:", error);
      toast.error("Failed to update settings");
    } finally {
      setSaving(false);
    }
  };

  const changePassword = async () => {
    if (passwords.new !== passwords.confirm) {
      toast.error("New passwords don't match");
      return;
    }

    try {
      const response = await fetch("/api/client/auth/change-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          currentPassword: passwords.current,
          newPassword: passwords.new,
        }),
      });

      const result = await response.json();

      if (response.ok) {
        toast.success("Password changed successfully");
        setShowPasswordDialog(false);
        setPasswords({ current: "", new: "", confirm: "" });
      } else {
        toast.error(result.error || "Failed to change password");
      }
    } catch (error) {
      toast.error("Failed to change password");
    }
  };

  const exportData = async () => {
    try {
      const response = await fetch("/api/client/export/all-data");
      if (response.ok) {
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `linkly-data-${new Date().toISOString().split("T")[0]}.zip`;
        a.click();
        window.URL.revokeObjectURL(url);
        toast.success("Data export started");
      } else {
        toast.error("Failed to export data");
      }
    } catch (error) {
      toast.error("Failed to export data");
    }
  };

  const deleteAccount = async () => {
    try {
      const response = await fetch("/api/client/auth/delete-account", {
        method: "DELETE",
      });

      if (response.ok) {
        toast.success("Account deletion initiated. You will be logged out.");
        // Redirect to home page after a delay
        setTimeout(() => {
          window.location.href = "/";
        }, 2000);
      } else {
        const result = await response.json();
        toast.error(result.error || "Failed to delete account");
      }
    } catch (error) {
      toast.error("Failed to delete account");
    }
  };

  if (loading || !settings) {
    return (
      <div className="container mx-auto py-6 px-4">
        <div className="flex items-center justify-center min-h-96">
          <LoadingSpinner size="lg" />
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-6 px-4 max-w-4xl">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold">Settings</h1>
          <p className="text-muted-foreground">
            Manage your account settings and preferences
          </p>
        </div>
        <div className="flex gap-2">
          {user?.plan !== "free" && (
            <Button variant="outline" onClick={exportData}>
              <Download className="h-4 w-4 mr-2" />
              Export Data
            </Button>
          )}
        </div>
      </div>

      {/* Settings Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="profile">Profile</TabsTrigger>
          <TabsTrigger value="preferences">Preferences</TabsTrigger>
          <TabsTrigger value="security">Security</TabsTrigger>
          <TabsTrigger value="billing">Billing</TabsTrigger>
        </TabsList>

        {/* Profile Tab */}
        <TabsContent value="profile" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <User className="h-4 w-4" />
                Profile Information
              </CardTitle>
              <CardDescription>
                Update your personal information and profile settings
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="name">Full Name</Label>
                  <Input
                    id="name"
                    value={settings.profile.name}
                    onChange={(e) =>
                      setSettings({
                        ...settings,
                        profile: { ...settings.profile, name: e.target.value },
                      })
                    }
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="email">Email Address</Label>
                  <Input
                    id="email"
                    type="email"
                    value={settings.profile.email}
                    onChange={(e) =>
                      setSettings({
                        ...settings,
                        profile: { ...settings.profile, email: e.target.value },
                      })
                    }
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="bio">Bio</Label>
                <Textarea
                  id="bio"
                  placeholder="Tell us about yourself..."
                  value={settings.profile.bio || ""}
                  onChange={(e) =>
                    setSettings({
                      ...settings,
                      profile: { ...settings.profile, bio: e.target.value },
                    })
                  }
                />
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="timezone">Timezone</Label>
                  <Select
                    value={settings.profile.timezone}
                    onValueChange={(value) =>
                      setSettings({
                        ...settings,
                        profile: { ...settings.profile, timezone: value },
                      })
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="UTC">UTC</SelectItem>
                      <SelectItem value="America/New_York">Eastern Time</SelectItem>
                      <SelectItem value="America/Chicago">Central Time</SelectItem>
                      <SelectItem value="America/Denver">Mountain Time</SelectItem>
                      <SelectItem value="America/Los_Angeles">Pacific Time</SelectItem>
                      <SelectItem value="Europe/London">London</SelectItem>
                      <SelectItem value="Europe/Paris">Paris</SelectItem>
                      <SelectItem value="Asia/Tokyo">Tokyo</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="language">Language</Label>
                  <Select
                    value={settings.profile.language}
                    onValueChange={(value) =>
                      setSettings({
                        ...settings,
                        profile: { ...settings.profile, language: value },
                      })
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="en">English</SelectItem>
                      <SelectItem value="es">Spanish</SelectItem>
                      <SelectItem value="fr">French</SelectItem>
                      <SelectItem value="de">German</SelectItem>
                      <SelectItem value="it">Italian</SelectItem>
                      <SelectItem value="pt">Portuguese</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="flex justify-end">
                <Button
                  onClick={() => updateSettings("profile", settings.profile)}
                  disabled={saving}
                >
                  {saving ? (
                    <LoadingSpinner size="sm" className="mr-2" />
                  ) : (
                    <Save className="h-4 w-4 mr-2" />
                  )}
                  Save Changes
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Preferences Tab */}
        <TabsContent value="preferences" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Settings className="h-4 w-4" />
                Default Settings
              </CardTitle>
              <CardDescription>
                Configure default options for new links
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-2">
                <Label htmlFor="defaultDomain">Default Domain</Label>
                <Select
                  value={settings.preferences.defaultDomain}
                  onValueChange={(value) =>
                    setSettings({
                      ...settings,
                      preferences: { ...settings.preferences, defaultDomain: value },
                    })
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="linkly.to">linkly.to</SelectItem>
                    {settings.domains.verified.map((domain) => (
                      <SelectItem key={domain} value={domain}>
                        {domain}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label>Auto-generate QR Codes</Label>
                    <p className="text-sm text-muted-foreground">
                      Automatically create QR codes for new links
                    </p>
                  </div>
                  <Switch
                    checked={settings.preferences.autoGenerateQR}
                    onCheckedChange={(checked) =>
                      setSettings({
                        ...settings,
                        preferences: { ...settings.preferences, autoGenerateQR: checked },
                      })
                    }
                  />
                </div>

                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label>Track Clicks</Label>
                    <p className="text-sm text-muted-foreground">
                      Collect analytics data for your links
                    </p>
                  </div>
                  <Switch
                    checked={settings.preferences.trackClicks}
                    onCheckedChange={(checked) =>
                      setSettings({
                        ...settings,
                        preferences: { ...settings.preferences, trackClicks: checked },
                      })
                    }
                  />
                </div>

                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label>Show Click Preview</Label>
                    <p className="text-sm text-muted-foreground">
                      Show preview page before redirecting
                    </p>
                  </div>
                  <Switch
                    checked={settings.preferences.showClickPreview}
                    onCheckedChange={(checked) =>
                      setSettings({
                        ...settings,
                        preferences: { ...settings.preferences, showClickPreview: checked },
                      })
                    }
                  />
                </div>
              </div>

              <div className="flex justify-end">
                <Button
                  onClick={() => updateSettings("preferences", settings.preferences)}
                  disabled={saving}
                >
                  {saving ? (
                    <LoadingSpinner size="sm" className="mr-2" />
                  ) : (
                    <Save className="h-4 w-4 mr-2" />
                  )}
                  Save Preferences
                </Button>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Bell className="h-4 w-4" />
                Notifications
              </CardTitle>
              <CardDescription>
                Choose how you want to be notified
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label>Email Notifications</Label>
                  <p className="text-sm text-muted-foreground">
                    Receive important updates via email
                  </p>
                </div>
                <Switch
                  checked={settings.preferences.emailNotifications}
                  onCheckedChange={(checked) =>
                    setSettings({
                      ...settings,
                      preferences: { ...settings.preferences, emailNotifications: checked },
                    })
                  }
                />
              </div>

              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label>Browser Notifications</Label>
                  <p className="text-sm text-muted-foreground">
                    Show notifications in your browser
                  </p>
                </div>
                <Switch
                  checked={settings.preferences.browserNotifications}
                  onCheckedChange={(checked) =>
                    setSettings({
                      ...settings,
                      preferences: { ...settings.preferences, browserNotifications: checked },
                    })
                  }
                />
              </div>

              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label>Weekly Reports</Label>
                  <p className="text-sm text-muted-foreground">
                    Get weekly analytics summaries
                  </p>
                </div>
                <Switch
                  checked={settings.preferences.weeklyReports}
                  onCheckedChange={(checked) =>
                    setSettings({
                      ...settings,
                      preferences: { ...settings.preferences, weeklyReports: checked },
                    })
                  }
                />
              </div>

              <div className="flex justify-end">
                <Button
                  onClick={() => updateSettings("preferences", settings.preferences)}
                  disabled={saving}
                >
                  {saving ? (
                    <LoadingSpinner size="sm" className="mr-2" />
                  ) : (
                    <Save className="h-4 w-4 mr-2" />
                  )}
                  Save Notifications
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Security Tab */}
        <TabsContent value="security" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Shield className="h-4 w-4" />
                Security Settings
              </CardTitle>
              <CardDescription>
                Manage your account security and authentication
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="flex items-center justify-between p-4 border rounded-lg">
                <div className="space-y-1">
                  <h4 className="font-medium">Password</h4>
                  <p className="text-sm text-muted-foreground">
                    Last changed: {new Date(settings.security.lastPasswordChange).toLocaleDateString()}
                  </p>
                </div>
                <Dialog open={showPasswordDialog} onOpenChange={setShowPasswordDialog}>
                  <DialogTrigger asChild>
                    <Button variant="outline">
                      <Lock className="h-4 w-4 mr-2" />
                      Change Password
                    </Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>Change Password</DialogTitle>
                      <DialogDescription>
                        Enter your current password and choose a new one
                      </DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4">
                      <div className="space-y-2">
                        <Label htmlFor="current">Current Password</Label>
                        <Input
                          id="current"
                          type="password"
                          value={passwords.current}
                          onChange={(e) =>
                            setPasswords({ ...passwords, current: e.target.value })
                          }
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="new">New Password</Label>
                        <Input
                          id="new"
                          type="password"
                          value={passwords.new}
                          onChange={(e) =>
                            setPasswords({ ...passwords, new: e.target.value })
                          }
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="confirm">Confirm New Password</Label>
                        <Input
                          id="confirm"
                          type="password"
                          value={passwords.confirm}
                          onChange={(e) =>
                            setPasswords({ ...passwords, confirm: e.target.value })
                          }
                        />
                      </div>
                    </div>
                    <DialogFooter>
                      <Button variant="outline" onClick={() => setShowPasswordDialog(false)}>
                        Cancel
                      </Button>
                      <Button onClick={changePassword}>Change Password</Button>
                    </DialogFooter>
                  </DialogContent>
                </Dialog>
              </div>

              <div className="flex items-center justify-between p-4 border rounded-lg">
                <div className="space-y-1">
                  <h4 className="font-medium">Two-Factor Authentication</h4>
                  <p className="text-sm text-muted-foreground">
                    {settings.security.twoFactorEnabled
                      ? "Enabled - Extra security for your account"
                      : "Disabled - Add an extra layer of security"}
                  </p>
                </div>
                <Button
                  variant={settings.security.twoFactorEnabled ? "destructive" : "default"}
                  onClick={() => {
                    // Toggle 2FA (implement this functionality)
                    toast.info("Two-factor authentication feature coming soon");
                  }}
                >
                  {settings.security.twoFactorEnabled ? "Disable 2FA" : "Enable 2FA"}
                </Button>
              </div>

              <div className="flex items-center justify-between p-4 border rounded-lg">
                <div className="space-y-1">
                  <h4 className="font-medium">Active Sessions</h4>
                  <p className="text-sm text-muted-foreground">
                    You have {settings.security.activeSessions} active sessions
                  </p>
                </div>
                <Button variant="outline">
                  <Monitor className="h-4 w-4 mr-2" />
                  Manage Sessions
                </Button>
              </div>
            </CardContent>
          </Card>

          <Card className="border-red-200">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-red-600">
                <Trash2 className="h-4 w-4" />
                Danger Zone
              </CardTitle>
              <CardDescription>
                Irreversible actions that will permanently affect your account
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-between p-4 border border-red-200 rounded-lg">
                <div className="space-y-1">
                  <h4 className="font-medium text-red-600">Delete Account</h4>
                  <p className="text-sm text-muted-foreground">
                    Permanently delete your account and all data
                  </p>
                </div>
                <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
                  <AlertDialogTrigger asChild>
                    <Button variant="destructive">Delete Account</Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>Delete Account</AlertDialogTitle>
                      <AlertDialogDescription>
                        This action cannot be undone. This will permanently delete your
                        account and remove all your data from our servers.
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>Cancel</AlertDialogCancel>
                      <AlertDialogAction
                        onClick={deleteAccount}
                        className="bg-red-600 hover:bg-red-700"
                      >
                        Yes, delete my account
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Billing Tab */}
        <TabsContent value="billing" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Crown className="h-4 w-4" />
                Subscription & Billing
              </CardTitle>
              <CardDescription>
                Manage your subscription and billing information
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="flex items-center justify-between p-4 border rounded-lg">
                <div className="space-y-1">
                  <h4 className="font-medium">Current Plan</h4>
                  <div className="flex items-center gap-2">
                    <Badge variant={user?.plan === "free" ? "secondary" : "default"}>
                      {user?.plan?.toUpperCase() || "FREE"}
                    </Badge>
                    {user?.plan === "free" && (
                      <span className="text-sm text-muted-foreground">
                        5 links per month
                      </span>
                    )}
                  </div>
                </div>
                <Link href="/dashboard/billing">
                  <Button>
                    {user?.plan === "free" ? "Upgrade Plan" : "Manage Billing"}
                  </Button>
                </Link>
              </div>

              {user?.plan === "free" && (
                <div className="p-6 bg-primary/5 rounded-lg border border-primary/20">
                  <div className="flex items-center gap-4 mb-4">
                    <Crown className="h-8 w-8 text-primary" />
                    <div>
                      <h3 className="font-semibold">Upgrade to Premium</h3>
                      <p className="text-sm text-muted-foreground">
                        Unlock unlimited links, advanced analytics, and more
                      </p>
                    </div>
                  </div>
                  <div className="grid gap-3 mb-4">
                    <div className="flex items-center gap-2 text-sm">
                      <span className="w-2 h-2 bg-primary rounded-full"></span>
                      Unlimited shortened links
                    </div>
                    <div className="flex items-center gap-2 text-sm">
                      <span className="w-2 h-2 bg-primary rounded-full"></span>
                      Advanced analytics and insights
                    </div>
                    <div className="flex items-center gap-2 text-sm">
                      <span className="w-2 h-2 bg-primary rounded-full"></span>
                      Custom domains and branding
                    </div>
                    <div className="flex items-center gap-2 text-sm">
                      <span className="w-2 h-2 bg-primary rounded-full"></span>
                      QR code generation
                    </div>
                    <div className="flex items-center gap-2 text-sm">
                      <span className="w-2 h-2 bg-primary rounded-full"></span>
                      Priority customer support
                    </div>
                  </div>
                  <Link href="/dashboard/billing">
                    <Button className="w-full">
                      Start Free Trial
                    </Button>
                  </Link>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}