"use client";

import React, { useState, useEffect } from "react";
import { useAnalytics } from "@/hooks/use-analytics";
import { useAuth } from "@/hooks/use-auth";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  LineChart,
  Line,
  PieChart,
  Pie,
  Cell,
} from "recharts";
import {
  MousePointer,
  Users,
  Globe,
  Smartphone,
  TrendingUp,
  Download,
  Calendar,
  Crown,
  RefreshCw,
  AlertCircle,
  BarChart3,
  Activity,
} from "lucide-react";
import { formatNumber } from "@/lib/utils";
import { toast } from "sonner";

const COLORS = ["#3B82F6", "#EF4444", "#10B981", "#F59E0B", "#8B5CF6"];

interface AnalyticsDashboardProps {
  shortCode?: string;
  showUrlSelector?: boolean;
}

interface UserUrl {
  shortCode: string;
  title?: string;
  originalUrl: string;
  clicks: {
    total: number;
    unique: number;
  };
}

export function AnalyticsDashboard({
  shortCode: initialShortCode,
  showUrlSelector = true,
}: AnalyticsDashboardProps) {
  const { user } = useAuth();
  const [selectedUrl, setSelectedUrl] = useState(initialShortCode || "all");
  const [userUrls, setUserUrls] = useState<UserUrl[]>([]);
  const [urlsLoading, setUrlsLoading] = useState(false);

  // FIXED: Use selectedUrl for analytics hook, not the initial prop
  const {
    data,
    metrics,
    isLoading,
    error,
    setDateRange,
    exportAnalytics,
    refresh,
  } = useAnalytics({
    shortCode: selectedUrl === "all" ? undefined : selectedUrl,
  });

  // Update selected URL when initial shortCode changes
  useEffect(() => {
    if (initialShortCode) {
      setSelectedUrl(initialShortCode);
    }
  }, [initialShortCode]);

  // Fetch user URLs for the selector
  useEffect(() => {
    if (showUrlSelector && !initialShortCode) {
      fetchUserUrls();
    }
  }, [showUrlSelector, initialShortCode]);

  const fetchUserUrls = async () => {
    try {
      setUrlsLoading(true);
      const response = await fetch("/api/client/my-links?limit=50");
      if (!response.ok) {
        throw new Error("Failed to fetch URLs");
      }
      const result = await response.json();
      if (result.success && result.data?.urls) {
        setUserUrls(result.data.urls);
      }
    } catch (error) {
      console.error("Failed to fetch URLs:", error);
      toast.error("Failed to load URLs");
    } finally {
      setUrlsLoading(false);
    }
  };

  const handleUrlChange = (value: string) => {
    console.log("🔄 URL selection changed to:", value);
    setSelectedUrl(value);
  };

  const handleExport = async () => {
    try {
      await exportAnalytics("csv");
      toast.success("Analytics exported successfully");
    } catch (error) {
      console.error("Export failed:", error);
      toast.error("Failed to export analytics");
    }
  };

  // Show premium upgrade for free users
  if (user?.plan === "free") {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="text-center space-y-4">
            <Crown className="h-12 w-12 text-yellow-500 mx-auto" />
            <h3 className="text-lg font-semibold">Analytics Premium Feature</h3>
            <p className="text-muted-foreground">
              Upgrade to Premium to access detailed analytics and insights
            </p>
            <Button
              onClick={() => (window.location.href = "/dashboard/billing")}
            >
              <Crown className="mr-2 h-4 w-4" />
              Upgrade to Premium
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  // Show error state
  if (error) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="text-center space-y-4">
            <AlertCircle className="h-12 w-12 text-red-500 mx-auto" />
            <h3 className="text-lg font-semibold">Error Loading Analytics</h3>
            <p className="text-muted-foreground">{error}</p>
            <Button onClick={refresh}>
              <RefreshCw className="mr-2 h-4 w-4" />
              Try Again
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-2xl font-bold">Analytics</h2>
          <p className="text-muted-foreground">
            Track performance and understand your audience
          </p>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          {showUrlSelector && (
            <Select
              value={selectedUrl}
              onValueChange={handleUrlChange}
              disabled={urlsLoading}
            >
              <SelectTrigger className="w-48">
                <SelectValue
                  placeholder={urlsLoading ? "Loading..." : "Select URL"}
                />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All URLs</SelectItem>
                {userUrls.map((url) => (
                  <SelectItem key={url.shortCode} value={url.shortCode}>
                    <div className="flex flex-col">
                      <span className="font-medium">
                        {url.title || url.shortCode}
                      </span>
                      <span className="text-xs text-muted-foreground">
                        {url.clicks.total} clicks
                      </span>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}

          <Select onValueChange={(value) => setDateRange(value)}>
            <SelectTrigger className="w-32">
              <SelectValue placeholder="30 days" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="today">Today</SelectItem>
              <SelectItem value="7days">7 Days</SelectItem>
              <SelectItem value="30days">30 Days</SelectItem>
              <SelectItem value="90days">90 Days</SelectItem>
            </SelectContent>
          </Select>

          <Button
            variant="outline"
            onClick={handleExport}
            disabled={isLoading || !data || data.totalClicks === 0}
          >
            <Download className="mr-2 h-4 w-4" />
            Export
          </Button>

          <Button variant="outline" onClick={refresh} disabled={isLoading}>
            <RefreshCw
              className={`mr-2 h-4 w-4 ${isLoading ? "animate-spin" : ""}`}
            />
            Refresh
          </Button>
        </div>
      </div>

      {/* Loading State for Metrics */}
      {isLoading && !data ? (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {[...Array(4)].map((_, i) => (
            <Card key={i} className="animate-pulse">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <div className="h-4 bg-gray-200 rounded w-20"></div>
                <div className="h-4 w-4 bg-gray-200 rounded"></div>
              </CardHeader>
              <CardContent>
                <div className="h-8 bg-gray-200 rounded w-16 mb-2"></div>
                <div className="h-3 bg-gray-200 rounded w-24"></div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <>
          {/* Metrics Cards */}
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">
                  Total Clicks
                </CardTitle>
                <MousePointer className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {formatNumber(data?.totalClicks || 0)}
                </div>
                <p className="text-xs text-muted-foreground">
                  {metrics?.growth && metrics.growth !== 0 ? (
                    <span
                      className={
                        metrics.growth > 0 ? "text-green-600" : "text-red-600"
                      }
                    >
                      {metrics.growth > 0 ? "+" : ""}
                      {metrics.growth.toFixed(1)}% from last period
                    </span>
                  ) : (
                    "No previous period data"
                  )}
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">
                  Unique Visitors
                </CardTitle>
                <Users className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {formatNumber(data?.uniqueClicks || 0)}
                </div>
                <p className="text-xs text-muted-foreground">
                  {data?.totalClicks && data.uniqueClicks
                    ? `${Math.round(
                        (data.uniqueClicks / data.totalClicks) * 100
                      )}% unique rate`
                    : "No unique data"}
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">
                  Top Country
                </CardTitle>
                <Globe className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {metrics?.topCountry || "N/A"}
                </div>
                <p className="text-xs text-muted-foreground">
                  Most visitors from
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">
                  Top Device
                </CardTitle>
                <Smartphone className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {metrics?.topDevice || "N/A"}
                </div>
                <p className="text-xs text-muted-foreground">
                  Primary device type
                </p>
              </CardContent>
            </Card>
          </div>

          {/* Show message when no data */}
          {data && data.totalClicks === 0 ? (
            <Card>
              <CardContent className="p-8">
                <div className="text-center space-y-4">
                  <BarChart3 className="h-12 w-12 text-muted-foreground mx-auto" />
                  <div>
                    <h3 className="text-lg font-semibold mb-2">
                      No Analytics Data
                    </h3>
                    <p className="text-muted-foreground">
                      {selectedUrl === "all"
                        ? "No clicks recorded for your links yet. Share your links to start seeing analytics data."
                        : "No clicks recorded for this link yet. Share this link to start seeing analytics data."}
                    </p>
                  </div>
                  <div className="flex justify-center gap-2">
                    <Button variant="outline" onClick={refresh}>
                      <RefreshCw className="mr-2 h-4 w-4" />
                      Refresh Data
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ) : (
            /* Charts Tabs */
            <Tabs defaultValue="overview" className="space-y-4">
              <TabsList>
                <TabsTrigger value="overview">Overview</TabsTrigger>
                <TabsTrigger value="geography">Geography</TabsTrigger>
                <TabsTrigger value="devices">Devices</TabsTrigger>
                <TabsTrigger value="referrers">Referrers</TabsTrigger>
              </TabsList>

              <TabsContent value="overview" className="space-y-4">
                <Card>
                  <CardHeader>
                    <CardTitle>Click Trends</CardTitle>
                    <CardDescription>
                      Daily click activity over time
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    {data?.dailyStats && data.dailyStats.length > 0 ? (
                      <ResponsiveContainer width="100%" height={300}>
                        <LineChart data={data.dailyStats}>
                          <CartesianGrid strokeDasharray="3 3" />
                          <XAxis dataKey="date" />
                          <YAxis />
                          <Tooltip />
                          <Line
                            type="monotone"
                            dataKey="clicks"
                            stroke="#3B82F6"
                            strokeWidth={2}
                          />
                        </LineChart>
                      </ResponsiveContainer>
                    ) : (
                      <div className="h-[300px] flex items-center justify-center text-muted-foreground">
                        No daily data available
                      </div>
                    )}
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="geography" className="space-y-4">
                <Card>
                  <CardHeader>
                    <CardTitle>Geography</CardTitle>
                    <CardDescription>
                      Where your visitors are coming from
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    {data?.geography && data.geography.length > 0 ? (
                      <ResponsiveContainer width="100%" height={300}>
                        <BarChart data={data.geography.slice(0, 10)}>
                          <CartesianGrid strokeDasharray="3 3" />
                          <XAxis dataKey="country" />
                          <YAxis />
                          <Tooltip />
                          <Bar dataKey="count" fill="#3B82F6" />
                        </BarChart>
                      </ResponsiveContainer>
                    ) : (
                      <div className="h-[300px] flex items-center justify-center text-muted-foreground">
                        No geography data available
                      </div>
                    )}
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="devices" className="space-y-4">
                <Card>
                  <CardHeader>
                    <CardTitle>Devices</CardTitle>
                    <CardDescription>
                      Device types used by your visitors
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    {data?.devices && data.devices.length > 0 ? (
                      <ResponsiveContainer width="100%" height={300}>
                        <PieChart>
                          <Pie
                            data={data.devices}
                            cx="50%"
                            cy="50%"
                            innerRadius={60}
                            outerRadius={120}
                            fill="#8884d8"
                            dataKey="count"
                            label={({ type, percent }) =>
                              `${type} (${((percent ?? 0) * 100).toFixed(0)}%)`
                            }
                          >
                            {data.devices.map((entry, index) => (
                              <Cell
                                key={`cell-${index}`}
                                fill={COLORS[index % COLORS.length]}
                              />
                            ))}
                          </Pie>
                          <Tooltip />
                        </PieChart>
                      </ResponsiveContainer>
                    ) : (
                      <div className="h-[300px] flex items-center justify-center text-muted-foreground">
                        No device data available
                      </div>
                    )}
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="referrers" className="space-y-4">
                <Card>
                  <CardHeader>
                    <CardTitle>Referrers</CardTitle>
                    <CardDescription>
                      Traffic sources and referrers
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    {data?.referrers && data.referrers.length > 0 ? (
                      <ResponsiveContainer width="100%" height={300}>
                        <BarChart data={data.referrers.slice(0, 10)}>
                          <CartesianGrid strokeDasharray="3 3" />
                          <XAxis dataKey="domain" />
                          <YAxis />
                          <Tooltip />
                          <Bar dataKey="count" fill="#10B981" />
                        </BarChart>
                      </ResponsiveContainer>
                    ) : (
                      <div className="h-[300px] flex items-center justify-center text-muted-foreground">
                        No referrer data available
                      </div>
                    )}
                  </CardContent>
                </Card>
              </TabsContent>
            </Tabs>
          )}
        </>
      )}
    </div>
  );
}
