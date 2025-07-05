// app/dashboard/qr-codes/page.tsx
"use client";

import React, { useState, useEffect } from "react";
import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { toast } from "sonner";
import {
  QrCode,
  Download,
  Eye,
  Settings,
  Palette,
  RefreshCw,
  Search,
  Filter,
  Grid,
  List,
  Copy,
  ExternalLink,
  Trash2,
  Plus,
} from "lucide-react";
import { Checkbox } from "@/components/ui/checkbox";

interface URL {
  _id: string;
  originalUrl: string;
  shortCode: string;
  title?: string;
  description?: string;
  qrCode?: {
    url: string;
    style: {
      size: number;
      color: string;
      backgroundColor: string;
      logo?: string;
    };
  };
  clicks: {
    total: number;
  };
  createdAt: string;
}

interface QRCodeStyle {
  size: number;
  color: string;
  backgroundColor: string;
  format: "png" | "svg";
  // Advanced design options
  dotStyle: "square" | "circle" | "rounded" | "diamond" | "star" | "heart";
  cornerStyle:
    | "square"
    | "circle"
    | "rounded"
    | "extra-rounded"
    | "dot"
    | "square-rounded";
  cornerDotStyle: "square" | "circle" | "rounded";
  gradient?: {
    enabled: boolean;
    type: "linear" | "radial" | "conic";
    colors: string[];
    direction?: number;
    centerX?: number;
    centerY?: number;
  };
  border?: {
    enabled: boolean;
    width: number;
    color: string;
    style: "solid" | "dashed" | "dotted" | "double";
    radius: number;
  };
  shadow?: {
    enabled: boolean;
    blur: number;
    offsetX: number;
    offsetY: number;
    color: string;
    opacity: number;
  };
  logo?: {
    enabled: boolean;
    url?: string;
    size?: number;
    margin?: number;
    shape?: "square" | "circle" | "rounded";
    border?: boolean;
    borderColor?: string;
    borderWidth?: number;
  };
  pattern:
    | "standard"
    | "dots"
    | "rounded"
    | "extra-rounded"
    | "classy"
    | "classy-rounded"
    | "fluid"
    | "japanese";
  errorCorrection: "L" | "M" | "Q" | "H";
  margin: number;
  opacity: number;
  rotation: number;
  backgroundImage?: {
    enabled: boolean;
    url?: string;
    opacity?: number;
    blendMode?: "normal" | "multiply" | "overlay" | "soft-light";
  };
  animation?: {
    enabled: boolean;
    type: "none" | "pulse" | "rotate" | "glow" | "bounce";
    duration: number;
  };
}

export default function QRCodesPage() {
  const { user } = useAuth();
  const [urls, setUrls] = useState<URL[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");
  const [selectedUrl, setSelectedUrl] = useState<URL | null>(null);
  const [customizeDialogOpen, setCustomizeDialogOpen] = useState(false);
  const [previewDialogOpen, setPreviewDialogOpen] = useState(false);
  const [generatingQR, setGeneratingQR] = useState<string | null>(null);
  const [downloadingQR, setDownloadingQR] = useState<string | null>(null);

  const [qrStyle, setQrStyle] = useState<QRCodeStyle>({
    size: 200,
    color: "#000000",
    backgroundColor: "#FFFFFF",
    format: "png",
    dotStyle: "square",
    cornerStyle: "square",
    cornerDotStyle: "square",
    gradient: {
      enabled: false,
      type: "linear",
      colors: ["#000000", "#333333"],
      direction: 45,
      centerX: 50,
      centerY: 50,
    },
    border: {
      enabled: false,
      width: 4,
      color: "#000000",
      style: "solid",
      radius: 0,
    },
    shadow: {
      enabled: false,
      blur: 10,
      offsetX: 0,
      offsetY: 4,
      color: "#000000",
      opacity: 0.25,
    },
    logo: {
      enabled: false,
      size: 20,
      margin: 10,
      shape: "square",
      border: false,
      borderColor: "#FFFFFF",
      borderWidth: 2,
    },
    pattern: "standard",
    errorCorrection: "M",
    margin: 4,
    opacity: 1,
    rotation: 0,
    backgroundImage: {
      enabled: false,
      opacity: 0.1,
      blendMode: "overlay",
    },
    animation: {
      enabled: false,
      type: "none",
      duration: 2,
    },
  });

  // Fetch URLs with QR codes
  const fetchUrls = async () => {
    try {
      setLoading(true);
      const response = await fetch("/api/client/my-links");

      if (!response.ok) {
        throw new Error("Failed to fetch URLs");
      }

      const data = await response.json();
      setUrls(data.data?.urls || data.data || []);
    } catch (error) {
      console.error("Error fetching URLs:", error);
      toast.error("Failed to load your URLs");
    } finally {
      setLoading(false);
    }
  };

  // Generate or update QR code
  const generateQRCode = async (
    url: URL,
    customStyle?: Partial<QRCodeStyle>
  ) => {
    try {
      setGeneratingQR(url.shortCode);

      const style = customStyle ? { ...qrStyle, ...customStyle } : qrStyle;

      // Only send the properties that the current QRCodeSchema expects
      const requestData = {
        shortCode: url.shortCode,
        size: style.size,
        color: style.color,
        backgroundColor: style.backgroundColor,
        format: style.format,
        // Convert our complex logo object to just the URL string that the schema expects
        logo:
          style.logo?.enabled && style.logo?.url ? style.logo.url : undefined,
      };

      const response = await fetch("/api/client/qrcode", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(requestData),
      });

      if (!response.ok) {
        throw new Error("Failed to generate QR code");
      }

      const data = await response.json();

      // Update the URL in state
      setUrls((prev) =>
        prev.map((u) =>
          u.shortCode === url.shortCode ? { ...u, qrCode: data.data.qrCode } : u
        )
      );

      toast.success("QR code generated successfully");
    } catch (error) {
      console.error("Error generating QR code:", error);
      toast.error("Failed to generate QR code");
    } finally {
      setGeneratingQR(null);
    }
  };

  // Download QR code
  const downloadQRCode = async (url: URL, format: "png" | "svg" = "png") => {
    try {
      setDownloadingQR(url.shortCode);

      const response = await fetch(
        `/api/client/qrcode?shortCode=${url.shortCode}&format=${format}`,
        {
          method: "PUT",
        }
      );

      if (!response.ok) {
        throw new Error("Failed to download QR code");
      }

      // Create download link
      const blob = await response.blob();
      const downloadUrl = window.URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = downloadUrl;
      link.download = `qrcode-${url.shortCode}.${format}`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(downloadUrl);

      toast.success(`QR code downloaded as ${format.toUpperCase()}`);
    } catch (error) {
      console.error("Error downloading QR code:", error);
      toast.error("Failed to download QR code");
    } finally {
      setDownloadingQR(null);
    }
  };

  // Copy short URL to clipboard
  const copyToClipboard = (shortCode: string) => {
    const shortUrl = `${window.location.origin}/${shortCode}`;
    navigator.clipboard.writeText(shortUrl);
    toast.success("Short URL copied to clipboard");
  };

  // Filter URLs based on search
  const filteredUrls = Array.isArray(urls)
    ? urls.filter(
        (url) =>
          url.title?.toLowerCase().includes(searchTerm.toLowerCase()) ||
          url.originalUrl.toLowerCase().includes(searchTerm.toLowerCase()) ||
          url.shortCode.toLowerCase().includes(searchTerm.toLowerCase())
      )
    : [];

  useEffect(() => {
    fetchUrls();
  }, []);

  const QRCodeCard = ({ url }: { url: URL }) => (
    <Card className="group hover:shadow-md transition-shadow">
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <div className="flex-1 min-w-0">
            <CardTitle className="text-sm font-medium truncate">
              {url.title || url.originalUrl}
            </CardTitle>
            <CardDescription className="text-xs">
              /{url.shortCode} • {url.clicks?.total || 0} clicks
            </CardDescription>
          </div>
          <Badge
            variant={url.qrCode ? "default" : "secondary"}
            className="ml-2"
          >
            {url.qrCode ? "Generated" : "No QR"}
          </Badge>
        </div>
      </CardHeader>

      <CardContent className="pt-0">
        <div className="space-y-3">
          {/* QR Code Preview */}
          <div className="flex justify-center p-4 bg-gray-50 rounded-lg">
            {url.qrCode ? (
              <img
                src={url.qrCode.url}
                alt={`QR Code for ${url.shortCode}`}
                className="w-24 h-24 cursor-pointer hover:scale-105 transition-transform"
                onClick={() => {
                  setSelectedUrl(url);
                  setPreviewDialogOpen(true);
                }}
              />
            ) : (
              <div className="w-24 h-24 bg-gray-200 rounded flex items-center justify-center">
                <QrCode className="w-8 h-8 text-gray-400" />
              </div>
            )}
          </div>

          {/* Actions */}
          <div className="flex gap-2">
            {url.qrCode ? (
              <>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => {
                    setSelectedUrl(url);
                    setPreviewDialogOpen(true);
                  }}
                  className="flex-1"
                >
                  <Eye className="w-3 h-3 mr-1" />
                  View
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => downloadQRCode(url)}
                  disabled={downloadingQR === url.shortCode}
                  className="flex-1"
                >
                  <Download className="w-3 h-3 mr-1" />
                  {downloadingQR === url.shortCode
                    ? "Downloading..."
                    : "Download"}
                </Button>
              </>
            ) : (
              <Button
                size="sm"
                onClick={() => generateQRCode(url)}
                disabled={generatingQR === url.shortCode}
                className="w-full"
              >
                <Plus className="w-3 h-3 mr-1" />
                {generatingQR === url.shortCode
                  ? "Generating..."
                  : "Generate QR"}
              </Button>
            )}
          </div>

          {url.qrCode && (
            <Button
              size="sm"
              variant="ghost"
              onClick={() => {
                setSelectedUrl(url);
                setQrStyle({
                  size: url.qrCode?.style.size || 200,
                  color: url.qrCode?.style.color || "#000000",
                  backgroundColor:
                    url.qrCode?.style.backgroundColor || "#FFFFFF",
                  format: "png",
                  dotStyle: "square",
                  cornerStyle: "square",
                  cornerDotStyle: "square",
                  gradient: {
                    enabled: false,
                    type: "linear",
                    colors: ["#000000", "#333333"],
                    direction: 45,
                    centerX: 50,
                    centerY: 50,
                  },
                  border: {
                    enabled: false,
                    width: 4,
                    color: "#000000",
                    style: "solid",
                    radius: 0,
                  },
                  shadow: {
                    enabled: false,
                    blur: 10,
                    offsetX: 0,
                    offsetY: 4,
                    color: "#000000",
                    opacity: 0.25,
                  },
                  logo: {
                    enabled: false,
                    size: 20,
                    margin: 10,
                    shape: "square",
                    border: false,
                    borderColor: "#FFFFFF",
                    borderWidth: 2,
                  },
                  pattern: "standard",
                  errorCorrection: "M",
                  margin: 4,
                  opacity: 1,
                  rotation: 0,
                  backgroundImage: {
                    enabled: false,
                    opacity: 0.1,
                    blendMode: "overlay",
                  },
                  animation: {
                    enabled: false,
                    type: "none",
                    duration: 2,
                  },
                });
                setCustomizeDialogOpen(true);
              }}
              className="w-full"
            >
              <Settings className="w-3 h-3 mr-1" />
              Customize
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );

  const QRCodeListItem = ({ url }: { url: URL }) => (
    <Card>
      <CardContent className="p-4">
        <div className="flex items-center gap-4">
          {/* QR Code Thumbnail */}
          <div className="flex-shrink-0">
            {url.qrCode ? (
              <img
                src={url.qrCode.url}
                alt={`QR Code for ${url.shortCode}`}
                className="w-12 h-12 cursor-pointer hover:scale-105 transition-transform"
                onClick={() => {
                  setSelectedUrl(url);
                  setPreviewDialogOpen(true);
                }}
              />
            ) : (
              <div className="w-12 h-12 bg-gray-200 rounded flex items-center justify-center">
                <QrCode className="w-4 h-4 text-gray-400" />
              </div>
            )}
          </div>

          {/* URL Info */}
          <div className="flex-1 min-w-0">
            <h3 className="font-medium truncate">
              {url.title || url.originalUrl}
            </h3>
            <div className="flex items-center gap-2 text-sm text-gray-500">
              <span>/{url.shortCode}</span>
              <span>•</span>
              <span>{url.clicks?.total || 0} clicks</span>
              <Badge
                variant={url.qrCode ? "default" : "secondary"}
                className="ml-2"
              >
                {url.qrCode ? "Generated" : "No QR"}
              </Badge>
            </div>
          </div>

          {/* Actions */}
          <div className="flex items-center gap-2">
            <Button
              size="sm"
              variant="ghost"
              onClick={() => copyToClipboard(url.shortCode)}
            >
              <Copy className="w-4 h-4" />
            </Button>

            {url.qrCode ? (
              <>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => {
                    setSelectedUrl(url);
                    setPreviewDialogOpen(true);
                  }}
                >
                  <Eye className="w-4 h-4" />
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => downloadQRCode(url)}
                  disabled={downloadingQR === url.shortCode}
                >
                  <Download className="w-4 h-4" />
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => {
                    setSelectedUrl(url);
                    setQrStyle({
                      size: url.qrCode?.style.size || 200,
                      color: url.qrCode?.style.color || "#000000",
                      backgroundColor:
                        url.qrCode?.style.backgroundColor || "#FFFFFF",
                      format: "png",
                      dotStyle: "square",
                      cornerStyle: "square",
                      cornerDotStyle: "square",
                      pattern: "standard",
                      errorCorrection: "M",
                      margin: 4,
                      opacity: 1,
                      rotation: 0,
                      gradient: {
                        enabled: false,
                        type: "linear",
                        colors: ["#000000", "#333333"],
                        direction: 45,
                        centerX: 50,
                        centerY: 50,
                      },
                      border: {
                        enabled: false,
                        width: 4,
                        color: "#000000",
                        style: "solid",
                        radius: 0,
                      },
                      shadow: {
                        enabled: false,
                        blur: 10,
                        offsetX: 0,
                        offsetY: 4,
                        color: "#000000",
                        opacity: 0.25,
                      },
                      backgroundImage: {
                        enabled: false,
                        opacity: 0.1,
                        blendMode: "overlay",
                      },
                      animation: {
                        enabled: false,
                        type: "none",
                        duration: 2,
                      },
                      logo: {
                        enabled: false,
                        size: 20,
                        margin: 10,
                        shape: "square",
                        border: false,
                        borderColor: "#FFFFFF",
                        borderWidth: 2,
                      },
                    });
                    setCustomizeDialogOpen(true);
                  }}
                >
                  <Settings className="w-4 h-4" />
                </Button>
              </>
            ) : (
              <Button
                size="sm"
                onClick={() => generateQRCode(url)}
                disabled={generatingQR === url.shortCode}
              >
                <Plus className="w-4 h-4 mr-1" />
                {generatingQR === url.shortCode ? "Generating..." : "Generate"}
              </Button>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <RefreshCw className="w-8 h-8 animate-spin mx-auto mb-4" />
          <p>Loading your QR codes...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-2xl font-bold">QR Codes</h1>
          <p className="text-gray-600">
            Generate and manage QR codes for your shortened URLs
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setViewMode(viewMode === "grid" ? "list" : "grid")}
          >
            {viewMode === "grid" ? (
              <List className="w-4 h-4" />
            ) : (
              <Grid className="w-4 h-4" />
            )}
          </Button>
        </div>
      </div>

      {/* Search and Filters */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-col gap-4 md:flex-row md:items-center">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
              <Input
                placeholder="Search by title, URL, or short code..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="text-2xl font-bold">
              {Array.isArray(urls) ? urls.length : 0}
            </div>
            <p className="text-sm text-gray-600">Total URLs</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="text-2xl font-bold">
              {Array.isArray(urls)
                ? urls.filter((url) => url.qrCode).length
                : 0}
            </div>
            <p className="text-sm text-gray-600">With QR Codes</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="text-2xl font-bold">
              {Array.isArray(urls)
                ? urls.filter((url) => !url.qrCode).length
                : 0}
            </div>
            <p className="text-sm text-gray-600">Without QR Codes</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="text-2xl font-bold">
              {Array.isArray(urls)
                ? urls.reduce((sum, url) => sum + (url.clicks?.total || 0), 0)
                : 0}
            </div>
            <p className="text-sm text-gray-600">Total Clicks</p>
          </CardContent>
        </Card>
      </div>

      {/* URLs List */}
      {filteredUrls.length === 0 ? (
        <Card>
          <CardContent className="p-8 text-center">
            <QrCode className="w-12 h-12 mx-auto mb-4 text-gray-400" />
            <h3 className="text-lg font-medium mb-2">No URLs found</h3>
            <p className="text-gray-600 mb-4">
              {searchTerm
                ? "No URLs match your search criteria"
                : "Create some shortened URLs to generate QR codes"}
            </p>
            {!searchTerm && (
              <Button asChild>
                <a href="/dashboard/links">Create Your First Link</a>
              </Button>
            )}
          </CardContent>
        </Card>
      ) : (
        <div
          className={
            viewMode === "grid"
              ? "grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4"
              : "space-y-4"
          }
        >
          {filteredUrls.map((url) =>
            viewMode === "grid" ? (
              <QRCodeCard key={url._id} url={url} />
            ) : (
              <QRCodeListItem key={url._id} url={url} />
            )
          )}
        </div>
      )}

      {/* Customize QR Code Dialog */}
      <Dialog open={customizeDialogOpen} onOpenChange={setCustomizeDialogOpen}>
        <DialogContent className="max-w max-h-[95vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-xl">
              🎨 Custom QR Code Designer
            </DialogTitle>
            <DialogDescription>
              Create a unique QR code design for /{selectedUrl?.shortCode}
            </DialogDescription>
          </DialogHeader>

          <div className="grid grid-cols-1 xl:grid-cols-3 gap-8">
            {/* Left Side - Customization Options */}
            <div className="xl:col-span-2 space-y-6">
              <Tabs defaultValue="basic" className="w-full">
                <TabsList className="grid w-full grid-cols-6 text-xs">
                  <TabsTrigger value="basic">Basic</TabsTrigger>
                  <TabsTrigger value="style">Style</TabsTrigger>
                  <TabsTrigger value="colors">Colors</TabsTrigger>
                  <TabsTrigger value="effects">Effects</TabsTrigger>
                  <TabsTrigger value="logo">Logo</TabsTrigger>
                  <TabsTrigger value="advanced">Advanced</TabsTrigger>
                </TabsList>

                {/* Basic Settings */}
                <TabsContent value="basic" className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="size">Size (px)</Label>
                      <Select
                        value={qrStyle.size.toString()}
                        onValueChange={(value) =>
                          setQrStyle((prev) => ({
                            ...prev,
                            size: parseInt(value),
                          }))
                        }
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="150">150px</SelectItem>
                          <SelectItem value="200">200px</SelectItem>
                          <SelectItem value="250">250px</SelectItem>
                          <SelectItem value="300">300px</SelectItem>
                          <SelectItem value="400">400px</SelectItem>
                          <SelectItem value="500">500px</SelectItem>
                          <SelectItem value="600">600px</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div>
                      <Label htmlFor="format">Format</Label>
                      <Select
                        value={qrStyle.format}
                        onValueChange={(value: "png" | "svg") =>
                          setQrStyle((prev) => ({ ...prev, format: value }))
                        }
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="png">PNG</SelectItem>
                          <SelectItem value="svg">SVG</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="margin">Margin</Label>
                      <Select
                        value={qrStyle.margin.toString()}
                        onValueChange={(value) =>
                          setQrStyle((prev) => ({
                            ...prev,
                            margin: parseInt(value),
                          }))
                        }
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="0">No margin</SelectItem>
                          <SelectItem value="2">Small</SelectItem>
                          <SelectItem value="4">Medium</SelectItem>
                          <SelectItem value="6">Large</SelectItem>
                          <SelectItem value="8">Extra Large</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div>
                      <Label htmlFor="errorCorrection">Error Correction</Label>
                      <Select
                        value={qrStyle.errorCorrection}
                        onValueChange={(value: "L" | "M" | "Q" | "H") =>
                          setQrStyle((prev) => ({
                            ...prev,
                            errorCorrection: value,
                          }))
                        }
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="L">Low (~7%)</SelectItem>
                          <SelectItem value="M">Medium (~15%)</SelectItem>
                          <SelectItem value="Q">Quartile (~25%)</SelectItem>
                          <SelectItem value="H">High (~30%)</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                </TabsContent>

                {/* Style Settings */}
                <TabsContent value="style" className="space-y-4">
                  <div>
                    <Label htmlFor="pattern">QR Pattern Style</Label>
                    <Select
                      value={qrStyle.pattern}
                      onValueChange={(value: any) =>
                        setQrStyle((prev) => ({ ...prev, pattern: value }))
                      }
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="standard">Standard</SelectItem>
                        <SelectItem value="dots">Dots</SelectItem>
                        <SelectItem value="rounded">Rounded</SelectItem>
                        <SelectItem value="extra-rounded">
                          Extra Rounded
                        </SelectItem>
                        <SelectItem value="classy">Classy</SelectItem>
                        <SelectItem value="classy-rounded">
                          Classy Rounded
                        </SelectItem>
                        <SelectItem value="fluid">Fluid</SelectItem>
                        <SelectItem value="japanese">Japanese Style</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="grid grid-cols-3 gap-4">
                    <div>
                      <Label htmlFor="dotStyle">Dot Style</Label>
                      <Select
                        value={qrStyle.dotStyle}
                        onValueChange={(value: any) =>
                          setQrStyle((prev) => ({ ...prev, dotStyle: value }))
                        }
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="square">Square</SelectItem>
                          <SelectItem value="circle">Circle</SelectItem>
                          <SelectItem value="rounded">Rounded</SelectItem>
                          <SelectItem value="diamond">Diamond</SelectItem>
                          <SelectItem value="star">Star</SelectItem>
                          <SelectItem value="heart">Heart</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div>
                      <Label htmlFor="cornerStyle">Corner Style</Label>
                      <Select
                        value={qrStyle.cornerStyle}
                        onValueChange={(value: any) =>
                          setQrStyle((prev) => ({
                            ...prev,
                            cornerStyle: value,
                          }))
                        }
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="square">Square</SelectItem>
                          <SelectItem value="circle">Circle</SelectItem>
                          <SelectItem value="rounded">Rounded</SelectItem>
                          <SelectItem value="extra-rounded">
                            Extra Rounded
                          </SelectItem>
                          <SelectItem value="dot">Dot</SelectItem>
                          <SelectItem value="square-rounded">
                            Square Rounded
                          </SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div>
                      <Label htmlFor="cornerDotStyle">Corner Dot</Label>
                      <Select
                        value={qrStyle.cornerDotStyle}
                        onValueChange={(value: any) =>
                          setQrStyle((prev) => ({
                            ...prev,
                            cornerDotStyle: value,
                          }))
                        }
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="square">Square</SelectItem>
                          <SelectItem value="circle">Circle</SelectItem>
                          <SelectItem value="rounded">Rounded</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  <div>
                    <Label>Rotation (degrees)</Label>
                    <Input
                      type="range"
                      min="0"
                      max="360"
                      value={qrStyle.rotation}
                      onChange={(e) =>
                        setQrStyle((prev) => ({
                          ...prev,
                          rotation: parseInt(e.target.value),
                        }))
                      }
                      className="w-full"
                    />
                    <div className="text-sm text-gray-500 mt-1">
                      {qrStyle.rotation}°
                    </div>
                  </div>
                </TabsContent>

                {/* Color Settings */}
                <TabsContent value="colors" className="space-y-4">
                  <div className="space-y-4">
                    <div>
                      <div className="flex items-center space-x-2 mb-2">
                        <Checkbox
                          id="gradient"
                          checked={qrStyle.gradient?.enabled}
                          onCheckedChange={(checked) =>
                            setQrStyle((prev) => ({
                              ...prev,
                              gradient: {
                                ...prev.gradient!,
                                enabled: !!checked,
                              },
                            }))
                          }
                        />
                        <Label htmlFor="gradient">Enable Gradient</Label>
                      </div>
                    </div>

                    {!qrStyle.gradient?.enabled ? (
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <Label htmlFor="color">Foreground Color</Label>
                          <div className="flex gap-2">
                            <Input
                              type="color"
                              value={qrStyle.color}
                              onChange={(e) =>
                                setQrStyle((prev) => ({
                                  ...prev,
                                  color: e.target.value,
                                }))
                              }
                              className="h-10 w-20"
                            />
                            <Input
                              type="text"
                              value={qrStyle.color}
                              onChange={(e) =>
                                setQrStyle((prev) => ({
                                  ...prev,
                                  color: e.target.value,
                                }))
                              }
                              className="flex-1"
                              placeholder="#000000"
                            />
                          </div>
                        </div>

                        <div>
                          <Label htmlFor="backgroundColor">
                            Background Color
                          </Label>
                          <div className="flex gap-2">
                            <Input
                              type="color"
                              value={qrStyle.backgroundColor}
                              onChange={(e) =>
                                setQrStyle((prev) => ({
                                  ...prev,
                                  backgroundColor: e.target.value,
                                }))
                              }
                              className="h-10 w-20"
                            />
                            <Input
                              type="text"
                              value={qrStyle.backgroundColor}
                              onChange={(e) =>
                                setQrStyle((prev) => ({
                                  ...prev,
                                  backgroundColor: e.target.value,
                                }))
                              }
                              className="flex-1"
                              placeholder="#FFFFFF"
                            />
                          </div>
                        </div>
                      </div>
                    ) : (
                      <div className="space-y-4">
                        <div>
                          <Label>Gradient Type</Label>
                          <Select
                            value={qrStyle.gradient?.type}
                            onValueChange={(value: any) =>
                              setQrStyle((prev) => ({
                                ...prev,
                                gradient: { ...prev.gradient!, type: value },
                              }))
                            }
                          >
                            <SelectTrigger>
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="linear">Linear</SelectItem>
                              <SelectItem value="radial">Radial</SelectItem>
                              <SelectItem value="conic">Conic</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>

                        <div className="grid grid-cols-3 gap-2">
                          <div>
                            <Label>Color 1</Label>
                            <Input
                              type="color"
                              value={qrStyle.gradient?.colors[0] || "#000000"}
                              onChange={(e) =>
                                setQrStyle((prev) => ({
                                  ...prev,
                                  gradient: {
                                    ...prev.gradient!,
                                    colors: [
                                      e.target.value,
                                      prev.gradient?.colors[1] || "#333333",
                                      prev.gradient?.colors[2] || "#666666",
                                    ],
                                  },
                                }))
                              }
                              className="h-10"
                            />
                          </div>

                          <div>
                            <Label>Color 2</Label>
                            <Input
                              type="color"
                              value={qrStyle.gradient?.colors[1] || "#333333"}
                              onChange={(e) =>
                                setQrStyle((prev) => ({
                                  ...prev,
                                  gradient: {
                                    ...prev.gradient!,
                                    colors: [
                                      prev.gradient?.colors[0] || "#000000",
                                      e.target.value,
                                      prev.gradient?.colors[2] || "#666666",
                                    ],
                                  },
                                }))
                              }
                              className="h-10"
                            />
                          </div>

                          <div>
                            <Label>Color 3</Label>
                            <Input
                              type="color"
                              value={qrStyle.gradient?.colors[2] || "#666666"}
                              onChange={(e) =>
                                setQrStyle((prev) => ({
                                  ...prev,
                                  gradient: {
                                    ...prev.gradient!,
                                    colors: [
                                      prev.gradient?.colors[0] || "#000000",
                                      prev.gradient?.colors[1] || "#333333",
                                      e.target.value,
                                    ],
                                  },
                                }))
                              }
                              className="h-10"
                            />
                          </div>
                        </div>

                        {qrStyle.gradient?.type === "linear" && (
                          <div>
                            <Label>Direction (degrees)</Label>
                            <Input
                              type="range"
                              min="0"
                              max="360"
                              value={qrStyle.gradient?.direction || 45}
                              onChange={(e) =>
                                setQrStyle((prev) => ({
                                  ...prev,
                                  gradient: {
                                    ...prev.gradient!,
                                    direction: parseInt(e.target.value),
                                  },
                                }))
                              }
                              className="w-full"
                            />
                            <div className="text-sm text-gray-500 mt-1">
                              {qrStyle.gradient?.direction || 45}°
                            </div>
                          </div>
                        )}

                        {qrStyle.gradient?.type === "radial" && (
                          <div className="grid grid-cols-2 gap-4">
                            <div>
                              <Label>Center X (%)</Label>
                              <Input
                                type="range"
                                min="0"
                                max="100"
                                value={qrStyle.gradient?.centerX || 50}
                                onChange={(e) =>
                                  setQrStyle((prev) => ({
                                    ...prev,
                                    gradient: {
                                      ...prev.gradient!,
                                      centerX: parseInt(e.target.value),
                                    },
                                  }))
                                }
                                className="w-full"
                              />
                              <div className="text-sm text-gray-500 mt-1">
                                {qrStyle.gradient?.centerX || 50}%
                              </div>
                            </div>

                            <div>
                              <Label>Center Y (%)</Label>
                              <Input
                                type="range"
                                min="0"
                                max="100"
                                value={qrStyle.gradient?.centerY || 50}
                                onChange={(e) =>
                                  setQrStyle((prev) => ({
                                    ...prev,
                                    gradient: {
                                      ...prev.gradient!,
                                      centerY: parseInt(e.target.value),
                                    },
                                  }))
                                }
                                className="w-full"
                              />
                              <div className="text-sm text-gray-500 mt-1">
                                {qrStyle.gradient?.centerY || 50}%
                              </div>
                            </div>
                          </div>
                        )}

                        <div>
                          <Label htmlFor="backgroundColor">
                            Background Color
                          </Label>
                          <Input
                            type="color"
                            value={qrStyle.backgroundColor}
                            onChange={(e) =>
                              setQrStyle((prev) => ({
                                ...prev,
                                backgroundColor: e.target.value,
                              }))
                            }
                            className="h-10"
                          />
                        </div>
                      </div>
                    )}
                  </div>
                </TabsContent>

                {/* Effects Settings */}
                <TabsContent value="effects" className="space-y-4">
                  {/* Border Effects */}
                  <div>
                    <div className="flex items-center space-x-2 mb-4">
                      <Checkbox
                        id="border"
                        checked={qrStyle.border?.enabled}
                        onCheckedChange={(checked) =>
                          setQrStyle((prev) => ({
                            ...prev,
                            border: { ...prev.border!, enabled: !!checked },
                          }))
                        }
                      />
                      <Label htmlFor="border">Add Border</Label>
                    </div>

                    {qrStyle.border?.enabled && (
                      <div className="space-y-4 pl-6 border-l-2 border-gray-200">
                        <div className="grid grid-cols-2 gap-4">
                          <div>
                            <Label>Border Width</Label>
                            <Input
                              type="range"
                              min="1"
                              max="20"
                              value={qrStyle.border?.width || 4}
                              onChange={(e) =>
                                setQrStyle((prev) => ({
                                  ...prev,
                                  border: {
                                    ...prev.border!,
                                    width: parseInt(e.target.value),
                                  },
                                }))
                              }
                            />
                            <div className="text-sm text-gray-500 mt-1">
                              {qrStyle.border?.width || 4}px
                            </div>
                          </div>

                          <div>
                            <Label>Border Radius</Label>
                            <Input
                              type="range"
                              min="0"
                              max="50"
                              value={qrStyle.border?.radius || 0}
                              onChange={(e) =>
                                setQrStyle((prev) => ({
                                  ...prev,
                                  border: {
                                    ...prev.border!,
                                    radius: parseInt(e.target.value),
                                  },
                                }))
                              }
                            />
                            <div className="text-sm text-gray-500 mt-1">
                              {qrStyle.border?.radius || 0}px
                            </div>
                          </div>
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                          <div>
                            <Label>Border Color</Label>
                            <Input
                              type="color"
                              value={qrStyle.border?.color || "#000000"}
                              onChange={(e) =>
                                setQrStyle((prev) => ({
                                  ...prev,
                                  border: {
                                    ...prev.border!,
                                    color: e.target.value,
                                  },
                                }))
                              }
                              className="h-10"
                            />
                          </div>

                          <div>
                            <Label>Border Style</Label>
                            <Select
                              value={qrStyle.border?.style || "solid"}
                              onValueChange={(value: any) =>
                                setQrStyle((prev) => ({
                                  ...prev,
                                  border: {
                                    ...prev.border!,
                                    style: value,
                                  },
                                }))
                              }
                            >
                              <SelectTrigger>
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="solid">Solid</SelectItem>
                                <SelectItem value="dashed">Dashed</SelectItem>
                                <SelectItem value="dotted">Dotted</SelectItem>
                                <SelectItem value="double">Double</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>

                  <Separator />

                  {/* Shadow Effects */}
                  <div>
                    <div className="flex items-center space-x-2 mb-4">
                      <Checkbox
                        id="shadow"
                        checked={qrStyle.shadow?.enabled}
                        onCheckedChange={(checked) =>
                          setQrStyle((prev) => ({
                            ...prev,
                            shadow: { ...prev.shadow!, enabled: !!checked },
                          }))
                        }
                      />
                      <Label htmlFor="shadow">Add Shadow</Label>
                    </div>

                    {qrStyle.shadow?.enabled && (
                      <div className="space-y-4 pl-6 border-l-2 border-gray-200">
                        <div className="grid grid-cols-2 gap-4">
                          <div>
                            <Label>Blur</Label>
                            <Input
                              type="range"
                              min="0"
                              max="50"
                              value={qrStyle.shadow?.blur || 10}
                              onChange={(e) =>
                                setQrStyle((prev) => ({
                                  ...prev,
                                  shadow: {
                                    ...prev.shadow!,
                                    blur: parseInt(e.target.value),
                                  },
                                }))
                              }
                            />
                            <div className="text-sm text-gray-500 mt-1">
                              {qrStyle.shadow?.blur || 10}px
                            </div>
                          </div>

                          <div>
                            <Label>Opacity</Label>
                            <Input
                              type="range"
                              min="0"
                              max="1"
                              step="0.1"
                              value={qrStyle.shadow?.opacity || 0.25}
                              onChange={(e) =>
                                setQrStyle((prev) => ({
                                  ...prev,
                                  shadow: {
                                    ...prev.shadow!,
                                    opacity: parseFloat(e.target.value),
                                  },
                                }))
                              }
                            />
                            <div className="text-sm text-gray-500 mt-1">
                              {Math.round(
                                (qrStyle.shadow?.opacity || 0.25) * 100
                              )}
                              %
                            </div>
                          </div>
                        </div>

                        <div className="grid grid-cols-3 gap-4">
                          <div>
                            <Label>Offset X</Label>
                            <Input
                              type="range"
                              min="-20"
                              max="20"
                              value={qrStyle.shadow?.offsetX || 0}
                              onChange={(e) =>
                                setQrStyle((prev) => ({
                                  ...prev,
                                  shadow: {
                                    ...prev.shadow!,
                                    offsetX: parseInt(e.target.value),
                                  },
                                }))
                              }
                            />
                            <div className="text-sm text-gray-500 mt-1">
                              {qrStyle.shadow?.offsetX || 0}px
                            </div>
                          </div>

                          <div>
                            <Label>Offset Y</Label>
                            <Input
                              type="range"
                              min="-20"
                              max="20"
                              value={qrStyle.shadow?.offsetY || 4}
                              onChange={(e) =>
                                setQrStyle((prev) => ({
                                  ...prev,
                                  shadow: {
                                    ...prev.shadow!,
                                    offsetY: parseInt(e.target.value),
                                  },
                                }))
                              }
                            />
                            <div className="text-sm text-gray-500 mt-1">
                              {qrStyle.shadow?.offsetY || 4}px
                            </div>
                          </div>

                          <div>
                            <Label>Color</Label>
                            <Input
                              type="color"
                              value={qrStyle.shadow?.color || "#000000"}
                              onChange={(e) =>
                                setQrStyle((prev) => ({
                                  ...prev,
                                  shadow: {
                                    ...prev.shadow!,
                                    color: e.target.value,
                                  },
                                }))
                              }
                              className="h-10"
                            />
                          </div>
                        </div>
                      </div>
                    )}
                  </div>

                  <Separator />

                  {/* Background Image */}
                  <div>
                    <div className="flex items-center space-x-2 mb-4">
                      <Checkbox
                        id="backgroundImage"
                        checked={qrStyle.backgroundImage?.enabled}
                        onCheckedChange={(checked) =>
                          setQrStyle((prev) => ({
                            ...prev,
                            backgroundImage: {
                              ...prev.backgroundImage!,
                              enabled: !!checked,
                            },
                          }))
                        }
                      />
                      <Label htmlFor="backgroundImage">Background Image</Label>
                    </div>

                    {qrStyle.backgroundImage?.enabled && (
                      <div className="space-y-4 pl-6 border-l-2 border-gray-200">
                        <div>
                          <Label>Image URL</Label>
                          <Input
                            type="url"
                            value={qrStyle.backgroundImage?.url || ""}
                            onChange={(e) =>
                              setQrStyle((prev) => ({
                                ...prev,
                                backgroundImage: {
                                  ...prev.backgroundImage!,
                                  url: e.target.value,
                                },
                              }))
                            }
                            placeholder="https://example.com/background.jpg"
                          />
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                          <div>
                            <Label>Opacity</Label>
                            <Input
                              type="range"
                              min="0"
                              max="1"
                              step="0.1"
                              value={qrStyle.backgroundImage?.opacity || 0.1}
                              onChange={(e) =>
                                setQrStyle((prev) => ({
                                  ...prev,
                                  backgroundImage: {
                                    ...prev.backgroundImage!,
                                    opacity: parseFloat(e.target.value),
                                  },
                                }))
                              }
                            />
                            <div className="text-sm text-gray-500 mt-1">
                              {Math.round(
                                (qrStyle.backgroundImage?.opacity || 0.1) * 100
                              )}
                              %
                            </div>
                          </div>

                          <div>
                            <Label>Blend Mode</Label>
                            <Select
                              value={
                                qrStyle.backgroundImage?.blendMode || "overlay"
                              }
                              onValueChange={(value: any) =>
                                setQrStyle((prev) => ({
                                  ...prev,
                                  backgroundImage: {
                                    ...prev.backgroundImage!,
                                    blendMode: value,
                                  },
                                }))
                              }
                            >
                              <SelectTrigger>
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="normal">Normal</SelectItem>
                                <SelectItem value="multiply">
                                  Multiply
                                </SelectItem>
                                <SelectItem value="overlay">Overlay</SelectItem>
                                <SelectItem value="soft-light">
                                  Soft Light
                                </SelectItem>
                              </SelectContent>
                            </Select>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                </TabsContent>

                {/* Logo Settings */}
                <TabsContent value="logo" className="space-y-4">
                  <div>
                    <div className="flex items-center space-x-2 mb-4">
                      <Checkbox
                        id="logo"
                        checked={qrStyle.logo?.enabled}
                        onCheckedChange={(checked) =>
                          setQrStyle((prev) => ({
                            ...prev,
                            logo: { ...prev.logo!, enabled: !!checked },
                          }))
                        }
                      />
                      <Label htmlFor="logo">Add Logo/Icon</Label>
                    </div>

                    {qrStyle.logo?.enabled && (
                      <div className="space-y-4">
                        <div>
                          <Label htmlFor="logoUrl">Logo URL</Label>
                          <Input
                            type="url"
                            value={qrStyle.logo?.url || ""}
                            onChange={(e) =>
                              setQrStyle((prev) => ({
                                ...prev,
                                logo: { ...prev.logo!, url: e.target.value },
                              }))
                            }
                            placeholder="https://example.com/logo.png"
                          />
                          <div className="text-sm text-gray-500 mt-1">
                            Recommended: PNG with transparent background
                          </div>
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                          <div>
                            <Label>Logo Size (%)</Label>
                            <Input
                              type="range"
                              min="10"
                              max="40"
                              value={qrStyle.logo?.size || 20}
                              onChange={(e) =>
                                setQrStyle((prev) => ({
                                  ...prev,
                                  logo: {
                                    ...prev.logo!,
                                    size: parseInt(e.target.value),
                                  },
                                }))
                              }
                            />
                            <div className="text-sm text-gray-500 mt-1">
                              {qrStyle.logo?.size || 20}%
                            </div>
                          </div>

                          <div>
                            <Label>Logo Margin</Label>
                            <Input
                              type="range"
                              min="0"
                              max="20"
                              value={qrStyle.logo?.margin || 10}
                              onChange={(e) =>
                                setQrStyle((prev) => ({
                                  ...prev,
                                  logo: {
                                    ...prev.logo!,
                                    margin: parseInt(e.target.value),
                                  },
                                }))
                              }
                            />
                            <div className="text-sm text-gray-500 mt-1">
                              {qrStyle.logo?.margin || 10}px
                            </div>
                          </div>
                        </div>

                        <div>
                          <Label>Logo Shape</Label>
                          <Select
                            value={qrStyle.logo?.shape || "square"}
                            onValueChange={(value: any) =>
                              setQrStyle((prev) => ({
                                ...prev,
                                logo: {
                                  ...prev.logo!,
                                  shape: value,
                                },
                              }))
                            }
                          >
                            <SelectTrigger>
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="square">Square</SelectItem>
                              <SelectItem value="circle">Circle</SelectItem>
                              <SelectItem value="rounded">
                                Rounded Square
                              </SelectItem>
                            </SelectContent>
                          </Select>
                        </div>

                        <div>
                          <div className="flex items-center space-x-2 mb-2">
                            <Checkbox
                              id="logoBorder"
                              checked={qrStyle.logo?.border}
                              onCheckedChange={(checked) =>
                                setQrStyle((prev) => ({
                                  ...prev,
                                  logo: { ...prev.logo!, border: !!checked },
                                }))
                              }
                            />
                            <Label htmlFor="logoBorder">Logo Border</Label>
                          </div>

                          {qrStyle.logo?.border && (
                            <div className="grid grid-cols-2 gap-4 pl-6 border-l-2 border-gray-200">
                              <div>
                                <Label>Border Color</Label>
                                <Input
                                  type="color"
                                  value={qrStyle.logo?.borderColor || "#FFFFFF"}
                                  onChange={(e) =>
                                    setQrStyle((prev) => ({
                                      ...prev,
                                      logo: {
                                        ...prev.logo!,
                                        borderColor: e.target.value,
                                      },
                                    }))
                                  }
                                  className="h-10"
                                />
                              </div>

                              <div>
                                <Label>Border Width</Label>
                                <Input
                                  type="range"
                                  min="1"
                                  max="10"
                                  value={qrStyle.logo?.borderWidth || 2}
                                  onChange={(e) =>
                                    setQrStyle((prev) => ({
                                      ...prev,
                                      logo: {
                                        ...prev.logo!,
                                        borderWidth: parseInt(e.target.value),
                                      },
                                    }))
                                  }
                                />
                                <div className="text-sm text-gray-500 mt-1">
                                  {qrStyle.logo?.borderWidth || 2}px
                                </div>
                              </div>
                            </div>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                </TabsContent>

                {/* Advanced Settings */}
                <TabsContent value="advanced" className="space-y-4">
                  <div>
                    <Label>Overall Opacity</Label>
                    <Input
                      type="range"
                      min="0.1"
                      max="1"
                      step="0.1"
                      value={qrStyle.opacity}
                      onChange={(e) =>
                        setQrStyle((prev) => ({
                          ...prev,
                          opacity: parseFloat(e.target.value),
                        }))
                      }
                      className="w-full"
                    />
                    <div className="text-sm text-gray-500 mt-1">
                      {Math.round(qrStyle.opacity * 100)}%
                    </div>
                  </div>

                  <Separator />

                  {/* Animation Effects */}
                  <div>
                    <div className="flex items-center space-x-2 mb-4">
                      <Checkbox
                        id="animation"
                        checked={qrStyle.animation?.enabled}
                        onCheckedChange={(checked) =>
                          setQrStyle((prev) => ({
                            ...prev,
                            animation: {
                              ...prev.animation!,
                              enabled: !!checked,
                            },
                          }))
                        }
                      />
                      <Label htmlFor="animation">
                        Add Animation (SVG only)
                      </Label>
                    </div>

                    {qrStyle.animation?.enabled && (
                      <div className="space-y-4 pl-6 border-l-2 border-gray-200">
                        <div className="grid grid-cols-2 gap-4">
                          <div>
                            <Label>Animation Type</Label>
                            <Select
                              value={qrStyle.animation?.type || "pulse"}
                              onValueChange={(value: any) =>
                                setQrStyle((prev) => ({
                                  ...prev,
                                  animation: {
                                    ...prev.animation!,
                                    type: value,
                                  },
                                }))
                              }
                            >
                              <SelectTrigger>
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="none">None</SelectItem>
                                <SelectItem value="pulse">Pulse</SelectItem>
                                <SelectItem value="rotate">Rotate</SelectItem>
                                <SelectItem value="glow">Glow</SelectItem>
                                <SelectItem value="bounce">Bounce</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>

                          <div>
                            <Label>Duration (seconds)</Label>
                            <Input
                              type="range"
                              min="0.5"
                              max="5"
                              step="0.5"
                              value={qrStyle.animation?.duration || 2}
                              onChange={(e) =>
                                setQrStyle((prev) => ({
                                  ...prev,
                                  animation: {
                                    ...prev.animation!,
                                    duration: parseFloat(e.target.value),
                                  },
                                }))
                              }
                            />
                            <div className="text-sm text-gray-500 mt-1">
                              {qrStyle.animation?.duration || 2}s
                            </div>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                </TabsContent>
              </Tabs>
            </div>

            {/* Right Side - Preview */}
            <div className="xl:col-span-1 space-y-6">
              <div className="sticky top-0">
                <div className="text-center">
                  <h3 className="text-lg font-semibold mb-4">
                    🔍 Live Preview
                  </h3>
                  <div className="flex justify-center p-8 bg-gradient-to-br from-gray-50 to-gray-100 rounded-xl border-2 border-dashed border-gray-300 min-h-[400px] items-center">
                    {selectedUrl?.qrCode ? (
                      <div className="relative">
                        <img
                          src={selectedUrl.qrCode.url}
                          alt="QR Code Preview"
                          className="max-w-full h-auto shadow-2xl rounded-lg"
                          style={{
                            maxHeight: "350px",
                            opacity: qrStyle.opacity,
                            transform: `rotate(${qrStyle.rotation}deg)`,
                            filter: qrStyle.gradient?.enabled ? "none" : "none",
                          }}
                        />
                        <div className="absolute inset-0 pointer-events-none border-2 border-blue-500 border-dashed rounded-lg opacity-50"></div>
                      </div>
                    ) : (
                      <div className="w-64 h-64 bg-gray-200 rounded-xl flex items-center justify-center">
                        <QrCode className="w-20 h-20 text-gray-400" />
                      </div>
                    )}
                  </div>

                  <div className="mt-6 p-4 bg-white rounded-lg shadow-sm border space-y-2 text-sm">
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <span className="font-medium text-gray-600">Size:</span>
                        <span className="ml-1">
                          {qrStyle.size}×{qrStyle.size}px
                        </span>
                      </div>
                      <div>
                        <span className="font-medium text-gray-600">
                          Format:
                        </span>
                        <span className="ml-1">
                          {qrStyle.format.toUpperCase()}
                        </span>
                      </div>
                      <div>
                        <span className="font-medium text-gray-600">
                          Pattern:
                        </span>
                        <span className="ml-1">{qrStyle.pattern}</span>
                      </div>
                      <div>
                        <span className="font-medium text-gray-600">
                          Error Correction:
                        </span>
                        <span className="ml-1">{qrStyle.errorCorrection}</span>
                      </div>
                      <div>
                        <span className="font-medium text-gray-600">
                          Rotation:
                        </span>
                        <span className="ml-1">{qrStyle.rotation}°</span>
                      </div>
                      <div>
                        <span className="font-medium text-gray-600">
                          Opacity:
                        </span>
                        <span className="ml-1">
                          {Math.round(qrStyle.opacity * 100)}%
                        </span>
                      </div>
                    </div>

                    {qrStyle.gradient?.enabled && (
                      <div className="pt-2 border-t">
                        <span className="font-medium text-gray-600">
                          Gradient:
                        </span>
                        <span className="ml-1">
                          {qrStyle.gradient.type} (
                          {qrStyle.gradient.colors.length} colors)
                        </span>
                      </div>
                    )}

                    {qrStyle.border?.enabled && (
                      <div className="pt-2 border-t">
                        <span className="font-medium text-gray-600">
                          Border:
                        </span>
                        <span className="ml-1">
                          {qrStyle.border.width}px {qrStyle.border.style}
                        </span>
                      </div>
                    )}

                    {qrStyle.logo?.enabled && (
                      <div className="pt-2 border-t">
                        <span className="font-medium text-gray-600">Logo:</span>
                        <span className="ml-1">
                          {qrStyle.logo.size}% {qrStyle.logo.shape}
                        </span>
                      </div>
                    )}
                  </div>
                </div>

                {/* Preset Styles */}
                <div className="mt-6">
                  <h4 className="font-medium mb-3">🎨 Design Presets</h4>
                  <div className="grid grid-cols-2 gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() =>
                        setQrStyle((prev) => ({
                          ...prev,
                          color: "#000000",
                          backgroundColor: "#FFFFFF",
                          pattern: "standard",
                          dotStyle: "square",
                          cornerStyle: "square",
                          gradient: { ...prev.gradient!, enabled: false },
                          border: { ...prev.border!, enabled: false },
                          shadow: { ...prev.shadow!, enabled: false },
                        }))
                      }
                    >
                      📱 Classic
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() =>
                        setQrStyle((prev) => ({
                          ...prev,
                          color: "#3B82F6",
                          backgroundColor: "#F0F9FF",
                          pattern: "rounded",
                          dotStyle: "circle",
                          cornerStyle: "rounded",
                          gradient: { ...prev.gradient!, enabled: false },
                          border: {
                            enabled: true,
                            width: 3,
                            color: "#3B82F6",
                            style: "solid",
                            radius: 12,
                          },
                          shadow: {
                            enabled: true,
                            blur: 8,
                            offsetX: 0,
                            offsetY: 2,
                            color: "#3B82F6",
                            opacity: 0.2,
                          },
                        }))
                      }
                    >
                      💎 Premium
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() =>
                        setQrStyle((prev) => ({
                          ...prev,
                          pattern: "dots",
                          dotStyle: "circle",
                          cornerStyle: "extra-rounded",
                          gradient: {
                            enabled: true,
                            type: "linear",
                            colors: ["#8B5CF6", "#EC4899", "#F59E0B"],
                            direction: 45,
                          },
                          backgroundColor: "#1F2937",
                          border: {
                            enabled: true,
                            width: 2,
                            color: "#8B5CF6",
                            style: "solid",
                            radius: 16,
                          },
                          shadow: {
                            enabled: true,
                            blur: 15,
                            offsetX: 0,
                            offsetY: 5,
                            color: "#8B5CF6",
                            opacity: 0.3,
                          },
                        }))
                      }
                    >
                      🌈 Gradient
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() =>
                        setQrStyle((prev) => ({
                          ...prev,
                          color: "#059669",
                          backgroundColor: "#ECFDF5",
                          pattern: "classy-rounded",
                          dotStyle: "rounded",
                          cornerStyle: "rounded",
                          gradient: { ...prev.gradient!, enabled: false },
                          border: {
                            enabled: true,
                            width: 2,
                            color: "#059669",
                            style: "solid",
                            radius: 8,
                          },
                          shadow: {
                            enabled: true,
                            blur: 6,
                            offsetX: 0,
                            offsetY: 2,
                            color: "#059669",
                            opacity: 0.15,
                          },
                        }))
                      }
                    >
                      🌿 Nature
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() =>
                        setQrStyle((prev) => ({
                          ...prev,
                          color: "#DC2626",
                          backgroundColor: "#FEF2F2",
                          pattern: "fluid",
                          dotStyle: "heart",
                          cornerStyle: "circle",
                          gradient: { ...prev.gradient!, enabled: false },
                          border: {
                            enabled: true,
                            width: 3,
                            color: "#DC2626",
                            style: "dashed",
                            radius: 20,
                          },
                          shadow: {
                            enabled: false,
                            blur: 0,
                            offsetX: 0,
                            offsetY: 0,
                            color: "#000000",
                            opacity: 0,
                          },
                        }))
                      }
                    >
                      ❤️ Love
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() =>
                        setQrStyle((prev) => ({
                          ...prev,
                          color: "#FFFFFF",
                          backgroundColor: "#000000",
                          pattern: "japanese",
                          dotStyle: "diamond",
                          cornerStyle: "dot",
                          gradient: { ...prev.gradient!, enabled: false },
                          border: {
                            enabled: true,
                            width: 4,
                            color: "#FFFFFF",
                            style: "double",
                            radius: 0,
                          },
                          shadow: {
                            enabled: true,
                            blur: 20,
                            offsetX: 0,
                            offsetY: 0,
                            color: "#FFFFFF",
                            opacity: 0.4,
                          },
                        }))
                      }
                    >
                      🖤 Dark
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() =>
                        setQrStyle((prev) => ({
                          ...prev,
                          pattern: "extra-rounded",
                          dotStyle: "star",
                          cornerStyle: "extra-rounded",
                          gradient: {
                            enabled: true,
                            type: "conic",
                            colors: [
                              "#FF6B6B",
                              "#4ECDC4",
                              "#45B7D1",
                              "#96CEB4",
                              "#FFEAA7",
                            ],
                            direction: 0,
                          },
                          backgroundColor: "#2C3E50",
                          border: {
                            enabled: true,
                            width: 5,
                            color: "#FF6B6B",
                            style: "solid",
                            radius: 25,
                          },
                          shadow: {
                            enabled: true,
                            blur: 25,
                            offsetX: 0,
                            offsetY: 8,
                            color: "#FF6B6B",
                            opacity: 0.4,
                          },
                        }))
                      }
                    >
                      ⭐ Galaxy
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() =>
                        setQrStyle((prev) => ({
                          ...prev,
                          color: "#F97316",
                          backgroundColor: "#FFF7ED",
                          pattern: "classy",
                          dotStyle: "rounded",
                          cornerStyle: "square-rounded",
                          gradient: { ...prev.gradient!, enabled: false },
                          border: {
                            enabled: true,
                            width: 2,
                            color: "#F97316",
                            style: "dotted",
                            radius: 6,
                          },
                          shadow: {
                            enabled: true,
                            blur: 4,
                            offsetX: 2,
                            offsetY: 2,
                            color: "#F97316",
                            opacity: 0.2,
                          },
                        }))
                      }
                    >
                      🧡 Retro
                    </Button>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="flex gap-3 pt-6 border-t">
            <Button
              onClick={() =>
                selectedUrl && generateQRCode(selectedUrl, qrStyle)
              }
              disabled={!selectedUrl || generatingQR === selectedUrl?.shortCode}
              className="flex-1"
              size="lg"
            >
              <RefreshCw className="w-5 h-5 mr-2" />
              {generatingQR === selectedUrl?.shortCode
                ? "Generating Custom QR..."
                : "🎨 Generate Custom QR Code"}
            </Button>
            <Button
              variant="outline"
              onClick={() => setCustomizeDialogOpen(false)}
              size="lg"
            >
              Cancel
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Preview QR Code Dialog */}
      <Dialog open={previewDialogOpen} onOpenChange={setPreviewDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>QR Code Preview</DialogTitle>
            <DialogDescription>
              QR code for /{selectedUrl?.shortCode}
            </DialogDescription>
          </DialogHeader>

          {selectedUrl?.qrCode && (
            <div className="space-y-4">
              <div className="flex justify-center p-6 bg-gray-50 rounded-lg">
                <img
                  src={selectedUrl.qrCode.url}
                  alt={`QR Code for ${selectedUrl.shortCode}`}
                  className="max-w-full h-auto"
                  style={{ maxHeight: "300px" }}
                />
              </div>

              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">Size:</span>
                  <span>{selectedUrl.qrCode.style.size}px</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">Colors:</span>
                  <div className="flex gap-2">
                    <div
                      className="w-4 h-4 rounded border"
                      style={{
                        backgroundColor: selectedUrl.qrCode.style.color,
                      }}
                    />
                    <div
                      className="w-4 h-4 rounded border"
                      style={{
                        backgroundColor:
                          selectedUrl.qrCode.style.backgroundColor,
                      }}
                    />
                  </div>
                </div>
              </div>

              <div className="flex gap-2">
                <Button
                  onClick={() => downloadQRCode(selectedUrl, "png")}
                  disabled={downloadingQR === selectedUrl.shortCode}
                  className="flex-1"
                >
                  <Download className="w-4 h-4 mr-2" />
                  Download PNG
                </Button>
                <Button
                  variant="outline"
                  onClick={() => downloadQRCode(selectedUrl, "svg")}
                  disabled={downloadingQR === selectedUrl.shortCode}
                  className="flex-1"
                >
                  <Download className="w-4 h-4 mr-2" />
                  Download SVG
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
