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
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
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
  User,
  Settings,
  Bell,
  Shield,
  Key,
  Trash2,
  Save,
  Eye,
  EyeOff,
  Upload,
  Globe,
  Mail,
  Smartphone,
  Lock,
  AlertTriangle,
  Download,
} from "lucide-react";

interface UserSettings {
  profile: {
    name: string;
    email: string;
    image?: string;
    bio?: string;
    website?: string;
    location?: string;
  };
  preferences: {
    emailNotifications: boolean;
    securityAlerts: boolean;
    marketingEmails: boolean;
    linkExpiration: number; // days
    defaultPrivacy: "public" | "private";
    theme: "light" | "dark" | "system";
  };
  security: {
    twoFactorEnabled: boolean;
    lastPasswordChange: string;
    activeSessions: number;
  };
}

export default function SettingsPage() {
  const { user } = useAuth();
  const toast = useToast();
  const [settings, setSettings] = useState<UserSettings | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [passwordForm, setPasswordForm] = useState({
    currentPassword: "",
    newPassword: "",
    confirmPassword: "",
  });

  useEffect(() => {
    fetchSettings();
  }, []);

  const fetchSettings = async () => {
    try {
      const response = await fetch("/api/client/user/settings");
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

  const handleSaveProfile = async () => {
    if (!settings) return;

    setSaving(true);
    try {
      const response = await fetch("/api/client/user/profile", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(settings.profile),
      });

      if (response.ok) {
        toast.success("Profile updated successfully!");
        // Optionally, you may want to refetch user data here if needed
      } else {
        throw new Error("Failed to update profile");
      }
    } catch (error) {
      toast.error("Failed to update profile");
    } finally {
      setSaving(false);
    }
  };

  const handleSavePreferences = async () => {
    if (!settings) return;

    setSaving(true);
    try {
      const response = await fetch("/api/client/user/preferences", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(settings.preferences),
      });

      if (response.ok) {
        toast.success("Preferences updated successfully!");
      } else {
        throw new Error("Failed to update preferences");
      }
    } catch (error) {
      toast.error("Failed to update preferences");
    } finally {
      setSaving(false);
    }
  };

  const handleChangePassword = async () => {
    if (passwordForm.newPassword !== passwordForm.confirmPassword) {
      toast.error("New passwords do not match");
      return;
    }

    setSaving(true);
    try {
      const response = await fetch("/api/client/user/password", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          currentPassword: passwordForm.currentPassword,
          newPassword: passwordForm.newPassword,
        }),
      });

      if (response.ok) {
        toast.success("Password changed successfully!");
        setPasswordForm({
          currentPassword: "",
          newPassword: "",
          confirmPassword: "",
        });
      } else {
        const result = await response.json();
        throw new Error(result.error || "Failed to change password");
      }
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Failed to change password"
      );
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteAccount = async () => {
    try {
      const response = await fetch("/api/client/user/delete", {
        method: "DELETE",
      });

      if (response.ok) {
        window.location.href = "/";
      } else {
        throw new Error("Failed to delete account");
      }
    } catch (error) {
      toast.error("Failed to delete account");
    }
  };

  const handleImageUpload = async (
    event: React.ChangeEvent<HTMLInputElement>
  ) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const formData = new FormData();
    formData.append("image", file);

    try {
      const response = await fetch("/api/client/user/upload-image", {
        method: "POST",
        body: formData,
      });

      if (response.ok) {
        const result = await response.json();
        setSettings((prev) =>
          prev
            ? {
                ...prev,
                profile: { ...prev.profile, image: result.data.imageUrl },
              }
            : null
        );
        toast.success("Profile image updated!");
      }
    } catch (error) {
      toast.error("Failed to upload image");
    }
  };

  if (loading || !settings) {
    return (
      <div className="space-y-6">
        <div className="h-8 bg-muted animate-pulse rounded" />
        <div className="grid gap-6">
          {Array.from({ length: 3 }).map((_, i) => (
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

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Settings</h1>
        <p className="text-muted-foreground">
          Manage your account settings and preferences
        </p>
      </div>

      <Tabs defaultValue="profile" className="space-y-6">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="profile">Profile</TabsTrigger>
          <TabsTrigger value="preferences">Preferences</TabsTrigger>
          <TabsTrigger value="security">Security</TabsTrigger>
          <TabsTrigger value="danger">Danger Zone</TabsTrigger>
        </TabsList>

        <TabsContent value="profile">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <User className="h-5 w-5" />
                Profile Information
              </CardTitle>
              <CardDescription>
                Update your personal information and profile details
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Profile Image */}
              <div className="flex items-center gap-4">
                <Avatar className="h-20 w-20">
                  <AvatarImage src={settings.profile.image} />
                  <AvatarFallback className="text-lg">
                    {settings.profile.name?.charAt(0)?.toUpperCase() || "U"}
                  </AvatarFallback>
                </Avatar>
                <div>
                  <Label htmlFor="profile-image" className="cursor-pointer">
                    <Button variant="outline" size="sm" asChild>
                      <span>
                        <Upload className="mr-2 h-4 w-4" />
                        Change Photo
                      </span>
                    </Button>
                  </Label>
                  <input
                    id="profile-image"
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={handleImageUpload}
                  />
                  <p className="text-xs text-muted-foreground mt-1">
                    JPG, PNG or GIF. Max 2MB.
                  </p>
                </div>
              </div>

              {/* Profile Fields */}
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="name">Full Name</Label>
                  <Input
                    id="name"
                    value={settings.profile.name}
                    onChange={(e) =>
                      setSettings((prev) =>
                        prev
                          ? {
                              ...prev,
                              profile: {
                                ...prev.profile,
                                name: e.target.value,
                              },
                            }
                          : null
                      )
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
                      setSettings((prev) =>
                        prev
                          ? {
                              ...prev,
                              profile: {
                                ...prev.profile,
                                email: e.target.value,
                              },
                            }
                          : null
                      )
                    }
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="website">Website</Label>
                  <Input
                    id="website"
                    type="url"
                    placeholder="https://yourwebsite.com"
                    value={settings.profile.website || ""}
                    onChange={(e) =>
                      setSettings((prev) =>
                        prev
                          ? {
                              ...prev,
                              profile: {
                                ...prev.profile,
                                website: e.target.value,
                              },
                            }
                          : null
                      )
                    }
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="location">Location</Label>
                  <Input
                    id="location"
                    placeholder="City, Country"
                    value={settings.profile.location || ""}
                    onChange={(e) =>
                      setSettings((prev) =>
                        prev
                          ? {
                              ...prev,
                              profile: {
                                ...prev.profile,
                                location: e.target.value,
                              },
                            }
                          : null
                      )
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
                    setSettings((prev) =>
                      prev
                        ? {
                            ...prev,
                            profile: { ...prev.profile, bio: e.target.value },
                          }
                        : null
                    )
                  }
                />
              </div>

              <Button onClick={handleSaveProfile} disabled={saving}>
                <Save className="mr-2 h-4 w-4" />
                {saving ? "Saving..." : "Save Profile"}
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="preferences">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Settings className="h-5 w-5" />
                Preferences
              </CardTitle>
              <CardDescription>
                Customize your experience and default settings
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Notifications */}
              <div className="space-y-4">
                <h3 className="text-lg font-medium">Notifications</h3>
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <Label htmlFor="email-notifications">
                        Email Notifications
                      </Label>
                      <p className="text-sm text-muted-foreground">
                        Receive notifications about link activity
                      </p>
                    </div>
                    <Switch
                      id="email-notifications"
                      checked={settings.preferences.emailNotifications}
                      onCheckedChange={(checked) =>
                        setSettings((prev) =>
                          prev
                            ? {
                                ...prev,
                                preferences: {
                                  ...prev.preferences,
                                  emailNotifications: checked,
                                },
                              }
                            : null
                        )
                      }
                    />
                  </div>

                  <div className="flex items-center justify-between">
                    <div>
                      <Label htmlFor="security-alerts">Security Alerts</Label>
                      <p className="text-sm text-muted-foreground">
                        Get notified about security events
                      </p>
                    </div>
                    <Switch
                      id="security-alerts"
                      checked={settings.preferences.securityAlerts}
                      onCheckedChange={(checked) =>
                        setSettings((prev) =>
                          prev
                            ? {
                                ...prev,
                                preferences: {
                                  ...prev.preferences,
                                  securityAlerts: checked,
                                },
                              }
                            : null
                        )
                      }
                    />
                  </div>

                  <div className="flex items-center justify-between">
                    <div>
                      <Label htmlFor="marketing-emails">Marketing Emails</Label>
                      <p className="text-sm text-muted-foreground">
                        Receive updates about new features and tips
                      </p>
                    </div>
                    <Switch
                      id="marketing-emails"
                      checked={settings.preferences.marketingEmails}
                      onCheckedChange={(checked) =>
                        setSettings((prev) =>
                          prev
                            ? {
                                ...prev,
                                preferences: {
                                  ...prev.preferences,
                                  marketingEmails: checked,
                                },
                              }
                            : null
                        )
                      }
                    />
                  </div>
                </div>
              </div>

              <Separator />

              {/* Default Settings */}
              <div className="space-y-4">
                <h3 className="text-lg font-medium">Default Settings</h3>
                <div className="grid gap-4 md:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="link-expiration">
                      Default Link Expiration (days)
                    </Label>
                    <Input
                      id="link-expiration"
                      type="number"
                      min="1"
                      max="365"
                      value={settings.preferences.linkExpiration}
                      onChange={(e) =>
                        setSettings((prev) =>
                          prev
                            ? {
                                ...prev,
                                preferences: {
                                  ...prev.preferences,
                                  linkExpiration:
                                    parseInt(e.target.value) || 30,
                                },
                              }
                            : null
                        )
                      }
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="default-privacy">Default Privacy</Label>
                    <select
                      id="default-privacy"
                      className="w-full h-10 px-3 border border-input bg-background rounded-md"
                      value={settings.preferences.defaultPrivacy}
                      onChange={(e) =>
                        setSettings((prev) =>
                          prev
                            ? {
                                ...prev,
                                preferences: {
                                  ...prev.preferences,
                                  defaultPrivacy: e.target.value as
                                    | "public"
                                    | "private",
                                },
                              }
                            : null
                        )
                      }
                    >
                      <option value="public">Public</option>
                      <option value="private">Private</option>
                    </select>
                  </div>
                </div>
              </div>

              <Button onClick={handleSavePreferences} disabled={saving}>
                <Save className="mr-2 h-4 w-4" />
                {saving ? "Saving..." : "Save Preferences"}
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="security">
          <div className="space-y-6">
            {/* Security Overview */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Shield className="h-5 w-5" />
                  Security Overview
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid gap-4 md:grid-cols-3">
                  <div className="p-4 border rounded-lg">
                    <div className="flex items-center gap-2 mb-2">
                      <Key className="h-4 w-4" />
                      <span className="text-sm font-medium">Password</span>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      Last changed:{" "}
                      {new Date(
                        settings.security.lastPasswordChange
                      ).toLocaleDateString()}
                    </p>
                  </div>

                  <div className="p-4 border rounded-lg">
                    <div className="flex items-center gap-2 mb-2">
                      <Smartphone className="h-4 w-4" />
                      <span className="text-sm font-medium">
                        Two-Factor Auth
                      </span>
                    </div>
                    <Badge
                      variant={
                        settings.security.twoFactorEnabled
                          ? "default"
                          : "secondary"
                      }
                    >
                      {settings.security.twoFactorEnabled
                        ? "Enabled"
                        : "Disabled"}
                    </Badge>
                  </div>

                  <div className="p-4 border rounded-lg">
                    <div className="flex items-center gap-2 mb-2">
                      <Globe className="h-4 w-4" />
                      <span className="text-sm font-medium">
                        Active Sessions
                      </span>
                    </div>
                    <p className="text-sm">
                      {settings.security.activeSessions} sessions
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Change Password */}
            <Card>
              <CardHeader>
                <CardTitle>Change Password</CardTitle>
                <CardDescription>
                  Update your password to keep your account secure
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="current-password">Current Password</Label>
                  <div className="relative">
                    <Input
                      id="current-password"
                      type={showPassword ? "text" : "password"}
                      value={passwordForm.currentPassword}
                      onChange={(e) =>
                        setPasswordForm((prev) => ({
                          ...prev,
                          currentPassword: e.target.value,
                        }))
                      }
                    />
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="absolute right-0 top-0 h-full px-3"
                      onClick={() => setShowPassword(!showPassword)}
                    >
                      {showPassword ? (
                        <EyeOff className="h-4 w-4" />
                      ) : (
                        <Eye className="h-4 w-4" />
                      )}
                    </Button>
                  </div>
                </div>

                <div className="grid gap-4 md:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="new-password">New Password</Label>
                    <Input
                      id="new-password"
                      type="password"
                      value={passwordForm.newPassword}
                      onChange={(e) =>
                        setPasswordForm((prev) => ({
                          ...prev,
                          newPassword: e.target.value,
                        }))
                      }
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="confirm-password">
                      Confirm New Password
                    </Label>
                    <Input
                      id="confirm-password"
                      type="password"
                      value={passwordForm.confirmPassword}
                      onChange={(e) =>
                        setPasswordForm((prev) => ({
                          ...prev,
                          confirmPassword: e.target.value,
                        }))
                      }
                    />
                  </div>
                </div>

                <Button
                  onClick={handleChangePassword}
                  disabled={
                    saving ||
                    !passwordForm.currentPassword ||
                    !passwordForm.newPassword
                  }
                >
                  <Lock className="mr-2 h-4 w-4" />
                  {saving ? "Updating..." : "Update Password"}
                </Button>
              </CardContent>
            </Card>

            {/* Two-Factor Authentication */}
            <Card>
              <CardHeader>
                <CardTitle>Two-Factor Authentication</CardTitle>
                <CardDescription>
                  Add an extra layer of security to your account
                </CardDescription>
              </CardHeader>
              <CardContent>
                {settings.security.twoFactorEnabled ? (
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-medium text-green-600">
                        Two-factor authentication is enabled
                      </p>
                      <p className="text-sm text-muted-foreground">
                        Your account is protected with two-factor authentication
                      </p>
                    </div>
                    <Button variant="outline">Disable 2FA</Button>
                  </div>
                ) : (
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-medium">
                        Two-factor authentication is disabled
                      </p>
                      <p className="text-sm text-muted-foreground">
                        Secure your account with two-factor authentication
                      </p>
                    </div>
                    <Button>
                      <Smartphone className="mr-2 h-4 w-4" />
                      Enable 2FA
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="danger">
          <Card className="border-red-200 dark:border-red-800">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-red-600">
                <AlertTriangle className="h-5 w-5" />
                Danger Zone
              </CardTitle>
              <CardDescription>
                Irreversible and destructive actions
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Delete Account */}
              <div className="border border-red-200 dark:border-red-800 rounded-lg p-4">
                <div className="flex items-start justify-between">
                  <div>
                    <h3 className="font-medium text-red-600">Delete Account</h3>
                    <p className="text-sm text-muted-foreground mt-1">
                      Permanently delete your account and all associated data.
                      This action cannot be undone.
                    </p>
                    <ul className="text-xs text-muted-foreground mt-2 list-disc list-inside">
                      <li>All your links will be permanently deleted</li>
                      <li>Analytics data will be lost</li>
                      <li>Team memberships will be revoked</li>
                      <li>Custom domains will be released</li>
                    </ul>
                  </div>

                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button variant="destructive" size="sm">
                        <Trash2 className="mr-2 h-4 w-4" />
                        Delete Account
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>
                          Are you absolutely sure?
                        </AlertDialogTitle>
                        <AlertDialogDescription>
                          This action cannot be undone. This will permanently
                          delete your account and remove all your data from our
                          servers.
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction
                          onClick={handleDeleteAccount}
                          className="bg-red-600 hover:bg-red-700"
                        >
                          Yes, delete my account
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                </div>
              </div>

              {/* Export Data */}
              <div className="border rounded-lg p-4">
                <div className="flex items-start justify-between">
                  <div>
                    <h3 className="font-medium">Export Your Data</h3>
                    <p className="text-sm text-muted-foreground mt-1">
                      Download a copy of all your data before deleting your
                      account.
                    </p>
                  </div>

                  <Button variant="outline" size="sm">
                    <Download className="mr-2 h-4 w-4" />
                    Export Data
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
