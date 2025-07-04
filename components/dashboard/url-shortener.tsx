// ============= components/dashboard/url-shortener.tsx =============
"use client";

import React, { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useAuth } from "@/hooks/use-auth";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Link,
  Copy,
  QrCode,
  Settings,
  Globe,
  Calendar,
  Zap,
  Crown,
  Eye,
  EyeOff,
} from "lucide-react";

const urlSchema = z.object({
  originalUrl: z.string().url("Please enter a valid URL"),
  customSlug: z.string().optional(),
  title: z.string().optional(),
  description: z.string().optional(),
  tags: z.string().optional(),
  folderId: z.string().optional(),
  expiresAt: z.string().optional(),
  clickLimit: z.number().optional(),
  isPasswordProtected: z.boolean(),
  password: z.string().optional(),
});

type UrlFormData = z.infer<typeof urlSchema>;

interface UrlShortenerProps {
  folders?: Array<{ id: string; name: string; color?: string }>;
  onSuccess?: (data: any) => void;
}

export function UrlShortener({ folders = [], onSuccess }: UrlShortenerProps) {
  const { user } = useAuth();
  const toast = useToast();
  const [isLoading, setIsLoading] = useState(false);
  const [shortenedUrl, setShortenedUrl] = useState<any>(null);
  const [showAdvanced, setShowAdvanced] = useState(false);

  const form = useForm<UrlFormData>({
    resolver: zodResolver(urlSchema),
    defaultValues: {
      isPasswordProtected: false,
    },
  });

  const handleSubmit = async (data: UrlFormData) => {
    setIsLoading(true);

    try {
      const payload = {
        ...data,
        tags: data.tags ? data.tags.split(",").map((tag) => tag.trim()) : [],
        clickLimit: data.clickLimit ? Number(data.clickLimit) : undefined,
      };

      const response = await fetch("/api/client/shorten", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const result = await response.json();

      if (!response.ok) {
        if (result.upgradeRequired) {
          toast.error(result.error, {
            action: {
              label: "Upgrade",
              onClick: () => (window.location.href = "/dashboard/billing"),
            },
          });
          return;
        }
        throw new Error(result.error);
      }

      setShortenedUrl(result.data);
      form.reset();
      toast.success("URL shortened successfully!");
      onSuccess?.(result.data);
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Failed to shorten URL"
      );
    } finally {
      setIsLoading(false);
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast.copySuccess();
  };

  const downloadQRCode = () => {
    if (shortenedUrl?.qrCode?.url) {
      const link = document.createElement("a");
      link.href = shortenedUrl.qrCode.url;
      link.download = `qr-${shortenedUrl.shortCode}.png`;
      link.click();
    }
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Link className="h-5 w-5" />
            Shorten URL
          </CardTitle>
          <CardDescription>
            Create a short link with optional custom settings
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form
            onSubmit={form.handleSubmit(handleSubmit)}
            className="space-y-4"
          >
            {/* URL Input */}
            <div className="space-y-2">
              <Label htmlFor="originalUrl">Enter your long URL *</Label>
              <Input
                id="originalUrl"
                placeholder="https://example.com/very-long-url"
                {...form.register("originalUrl")}
                className="text-lg"
              />
              {form.formState.errors.originalUrl && (
                <p className="text-sm text-red-600">
                  {form.formState.errors.originalUrl.message}
                </p>
              )}
            </div>

            {/* Basic Options */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="customSlug">Custom Slug (Optional)</Label>
                <Input
                  id="customSlug"
                  placeholder="my-custom-link"
                  {...form.register("customSlug")}
                />
                {user?.plan === "free" && (
                  <p className="text-xs text-muted-foreground flex items-center gap-1">
                    <Crown className="h-3 w-3" />
                    Custom slugs available in Premium
                  </p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="folderId">Folder (Optional)</Label>
                <Select
                  onValueChange={(value) => form.setValue("folderId", value)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select folder" />
                  </SelectTrigger>
                  <SelectContent>
                    {folders.map((folder) => (
                      <SelectItem key={folder.id} value={folder.id}>
                        <div className="flex items-center gap-2">
                          <div
                            className="w-3 h-3 rounded-full"
                            style={{
                              backgroundColor: folder.color || "#3B82F6",
                            }}
                          />
                          {folder.name}
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Advanced Options Toggle */}
            <div className="flex items-center space-x-2">
              <Switch
                id="advanced"
                checked={showAdvanced}
                onCheckedChange={setShowAdvanced}
              />
              <Label htmlFor="advanced">Advanced Options</Label>
            </div>

            {/* Advanced Options */}
            {showAdvanced && (
              <Tabs defaultValue="metadata" className="w-full">
                <TabsList className="grid w-full grid-cols-3">
                  <TabsTrigger value="metadata">Metadata</TabsTrigger>
                  <TabsTrigger value="access">Access Control</TabsTrigger>
                  <TabsTrigger value="tracking">Tracking</TabsTrigger>
                </TabsList>

                <TabsContent value="metadata" className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="title">Title</Label>
                    <Input
                      id="title"
                      placeholder="My Awesome Link"
                      {...form.register("title")}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="description">Description</Label>
                    <Textarea
                      id="description"
                      placeholder="Brief description of this link"
                      {...form.register("description")}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="tags">Tags (comma-separated)</Label>
                    <Input
                      id="tags"
                      placeholder="marketing, campaign, social"
                      {...form.register("tags")}
                    />
                  </div>
                </TabsContent>

                <TabsContent value="access" className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="expiresAt">Expiration Date</Label>
                    <Input
                      id="expiresAt"
                      type="datetime-local"
                      {...form.register("expiresAt")}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="clickLimit">Click Limit</Label>
                    <Input
                      id="clickLimit"
                      type="number"
                      placeholder="100"
                      {...form.register("clickLimit", { valueAsNumber: true })}
                    />
                  </div>
                  <div className="flex items-center space-x-2">
                    <Switch
                      id="password-protected"
                      {...form.register("isPasswordProtected")}
                    />
                    <Label htmlFor="password-protected">
                      Password Protection
                    </Label>
                  </div>
                  {form.watch("isPasswordProtected") && (
                    <div className="space-y-2">
                      <Label htmlFor="password">Password</Label>
                      <Input
                        id="password"
                        type="password"
                        placeholder="Enter password"
                        {...form.register("password")}
                      />
                    </div>
                  )}
                </TabsContent>

                <TabsContent value="tracking" className="space-y-4">
                  <p className="text-sm text-muted-foreground">
                    UTM parameters and advanced tracking options will be
                    available in the next update.
                  </p>
                </TabsContent>
              </Tabs>
            )}

            <Button type="submit" disabled={isLoading} className="w-full">
              {isLoading ? (
                <div className="flex items-center gap-2">
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  Shortening...
                </div>
              ) : (
                <>
                  <Zap className="mr-2 h-4 w-4" />
                  Shorten URL
                </>
              )}
            </Button>
          </form>
        </CardContent>
      </Card>

      {/* Result Card */}
      {shortenedUrl && (
        <Card className="border-green-200 bg-green-50 dark:border-green-800 dark:bg-green-950">
          <CardHeader>
            <CardTitle className="text-green-800 dark:text-green-200">
              URL Shortened Successfully!
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center gap-2 p-3 bg-white dark:bg-gray-900 rounded-lg border">
              <Link className="h-4 w-4 text-green-600" />
              <span className="flex-1 font-mono text-sm">
                {shortenedUrl.shortUrl}
              </span>
              <Button
                size="sm"
                variant="outline"
                onClick={() => copyToClipboard(shortenedUrl.shortUrl)}
              >
                <Copy className="h-3 w-3" />
              </Button>
            </div>

            {shortenedUrl.qrCode && (
              <div className="flex items-center justify-between p-3 bg-white dark:bg-gray-900 rounded-lg border">
                <div className="flex items-center gap-3">
                  <QrCode className="h-4 w-4" />
                  <span className="text-sm">QR Code generated</span>
                </div>
                <Button size="sm" variant="outline" onClick={downloadQRCode}>
                  Download
                </Button>
              </div>
            )}

            <div className="flex flex-wrap gap-2">
              {shortenedUrl.title && (
                <Badge variant="secondary">{shortenedUrl.title}</Badge>
              )}
              {shortenedUrl.tags?.map((tag: string) => (
                <Badge key={tag} variant="outline">
                  #{tag}
                </Badge>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
