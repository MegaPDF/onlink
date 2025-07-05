"use client";

import React, { useState, useEffect } from "react";
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
  Folder,
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
  defaultFolderId?: string; // NEW: Default folder to select
  onSuccess?: (data: any) => void;
}

export function UrlShortener({
  folders = [],
  defaultFolderId = "",
  onSuccess,
}: UrlShortenerProps) {
  const { user } = useAuth();
  const toast = useToast();
  const [isLoading, setIsLoading] = useState(false);
  const [shortenedUrl, setShortenedUrl] = useState<any>(null);
  const [showAdvanced, setShowAdvanced] = useState(false);

  const form = useForm<UrlFormData>({
    resolver: zodResolver(urlSchema),
    defaultValues: {
      isPasswordProtected: false,
      folderId: defaultFolderId, // Set default folder
    },
  });

  // Update folder selection when defaultFolderId changes
  useEffect(() => {
    if (defaultFolderId !== undefined) {
      form.setValue("folderId", defaultFolderId);
    }
  }, [defaultFolderId, form]);

  const handleSubmit = async (data: UrlFormData) => {
    setIsLoading(true);

    try {
      console.log("🚀 Creating link with data:", data); // Debug log

      const payload = {
        ...data,
        tags: data.tags ? data.tags.split(",").map((tag) => tag.trim()) : [],
        clickLimit: data.clickLimit ? Number(data.clickLimit) : undefined,
        expiresAt: data.expiresAt || undefined,
        folderId: data.folderId || undefined, // Ensure empty string becomes undefined
      };

      console.log("📤 Sending payload:", payload); // Debug log

      const response = await fetch("/api/client/shorten", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      });

      const result = await response.json();
      console.log("📡 API Response:", response.status, result); // Debug log

      if (response.ok) {
        setShortenedUrl(result.data);
        form.reset({
          isPasswordProtected: false,
          folderId: defaultFolderId, // Reset to default folder
        });
        toast.success("Link created successfully!");
        onSuccess?.(result.data);
      } else {
        console.error("❌ API Error:", result);
        toast.error(result.error || "Failed to create link");
      }
    } catch (error) {
      console.error("💥 Network Error:", error);
      toast.error("Failed to create link. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast.success("Copied to clipboard!");
  };

  const generateQRCode = () => {
    if (!shortenedUrl) return;
    // TODO: Implement QR code generation
    toast.info("QR Code generation coming soon!");
  };

  return (
    <div className="space-y-6">
      {/* Debug Info */}
      <div className="text-xs text-muted-foreground bg-muted p-2 rounded">
        <strong>Debug:</strong> defaultFolderId = "{defaultFolderId}", folders
        count = {folders.length}
      </div>

      {/* Show success result */}
      {shortenedUrl && (
        <Card className="border-green-200 bg-green-50">
          <CardHeader>
            <CardTitle className="text-green-800 flex items-center gap-2">
              <Link className="h-5 w-5" />
              Link Created Successfully!
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center gap-2">
              <Input
                value={shortenedUrl.shortUrl}
                readOnly
                className="bg-white"
              />
              <Button
                size="sm"
                onClick={() => copyToClipboard(shortenedUrl.shortUrl)}
              >
                <Copy className="h-4 w-4" />
              </Button>
              <Button size="sm" variant="outline" onClick={generateQRCode}>
                <QrCode className="h-4 w-4" />
              </Button>
            </div>
            <div className="text-sm text-green-700">
              <div>Original: {shortenedUrl.originalUrl}</div>
              {shortenedUrl.folder && (
                <div className="flex items-center gap-1 mt-1">
                  <Folder className="h-3 w-3" />
                  Folder: {shortenedUrl.folder.name}
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Form */}
      <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-6">
        {/* Basic Fields */}
        <div className="space-y-4">
          <div>
            <Label htmlFor="originalUrl">URL to Shorten *</Label>
            <Input
              id="originalUrl"
              placeholder="https://example.com/very-long-url"
              {...form.register("originalUrl")}
              className="mt-1"
            />
            {form.formState.errors.originalUrl && (
              <p className="text-sm text-red-600 mt-1">
                {form.formState.errors.originalUrl.message}
              </p>
            )}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="customSlug">Custom Alias (Optional)</Label>
              <Input
                id="customSlug"
                placeholder="my-custom-link"
                {...form.register("customSlug")}
                className="mt-1"
              />
              <p className="text-xs text-muted-foreground mt-1">
                Leave empty for auto-generated
              </p>
            </div>

            <div>
              <Label htmlFor="folderId">Folder</Label>
              <Select
                value={form.watch("folderId") || ""}
                onValueChange={(value) =>
                  form.setValue("folderId", value === "none" ? "" : value)
                }
              >
                <SelectTrigger className="mt-1">
                  <SelectValue placeholder="Select folder (optional)" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">
                    <div className="flex items-center gap-2">
                      <div className="w-3 h-3 rounded-full bg-gray-300" />
                      No Folder (Uncategorized)
                    </div>
                  </SelectItem>
                  {folders.map((folder) => (
                    <SelectItem key={folder.id} value={folder.id}>
                      <div className="flex items-center gap-2">
                        <div
                          className="w-3 h-3 rounded-full"
                          style={{ backgroundColor: folder.color || "#3B82F6" }}
                        />
                        {folder.name}
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {defaultFolderId && (
                <p className="text-xs text-blue-600 mt-1">
                  Pre-selected based on current folder
                </p>
              )}
            </div>
          </div>
        </div>

        {/* Advanced Options Toggle */}
        <div className="flex items-center gap-2">
          <Button
            type="button"
            variant="outline"
            onClick={() => setShowAdvanced(!showAdvanced)}
            className="flex items-center gap-2"
          >
            <Settings className="h-4 w-4" />
            {showAdvanced ? "Hide" : "Show"} Advanced Options
          </Button>
        </div>

        {/* Advanced Fields */}
        {showAdvanced && (
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Advanced Options</CardTitle>
              <CardDescription>
                Configure additional settings for your link
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="title">Title</Label>
                  <Input
                    id="title"
                    placeholder="Link title"
                    {...form.register("title")}
                    className="mt-1"
                  />
                </div>

                <div>
                  <Label htmlFor="tags">Tags</Label>
                  <Input
                    id="tags"
                    placeholder="marketing, campaign, social"
                    {...form.register("tags")}
                    className="mt-1"
                  />
                  <p className="text-xs text-muted-foreground mt-1">
                    Separate with commas
                  </p>
                </div>
              </div>

              <div>
                <Label htmlFor="description">Description</Label>
                <Textarea
                  id="description"
                  placeholder="Optional description for this link"
                  {...form.register("description")}
                  className="mt-1"
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="expiresAt">Expires At</Label>
                  <Input
                    id="expiresAt"
                    type="datetime-local"
                    {...form.register("expiresAt")}
                    className="mt-1"
                  />
                </div>

                <div>
                  <Label htmlFor="clickLimit">Click Limit</Label>
                  <Input
                    id="clickLimit"
                    type="number"
                    placeholder="Unlimited"
                    {...form.register("clickLimit", { valueAsNumber: true })}
                    className="mt-1"
                  />
                </div>
              </div>

              {/* Password Protection */}
              <div className="space-y-3">
                <div className="flex items-center space-x-2">
                  <Switch
                    checked={form.watch("isPasswordProtected")}
                    onCheckedChange={(checked) =>
                      form.setValue("isPasswordProtected", checked)
                    }
                  />
                  <Label>Password Protection</Label>
                </div>

                {form.watch("isPasswordProtected") && (
                  <div>
                    <Label htmlFor="password">Password</Label>
                    <Input
                      id="password"
                      type="password"
                      placeholder="Enter password"
                      {...form.register("password")}
                      className="mt-1"
                    />
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Submit Button */}
        <Button type="submit" disabled={isLoading} className="w-full" size="lg">
          {isLoading ? (
            <>
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2" />
              Creating Link...
            </>
          ) : (
            <>
              <Zap className="h-4 w-4 mr-2" />
              Create Short Link
            </>
          )}
        </Button>
      </form>
    </div>
  );
}
