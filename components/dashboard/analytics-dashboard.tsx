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
} from "lucide-react";
import { formatNumber } from "@/lib/utils";

const COLORS = ["#3B82F6", "#EF4444", "#10B981", "#F59E0B", "#8B5CF6"];

interface AnalyticsDashboardProps {
  shortCode?: string;
  showUrlSelector?: boolean;
}

interface UserUrl {
  shortCode: string;
  title?: string;
  originalUrl: string;
}

export function AnalyticsDashboard({
  shortCode,
  showUrlSelector = true,
}: AnalyticsDashboardProps) {
  const { user } = useAuth();
  const {
    data,
    metrics,
    isLoading,
    error,
    setDateRange,
    exportAnalytics,
    refresh,
  } = useAnalytics({ shortCode });

  const [selectedUrl, setSelectedUrl] = useState(shortCode || "all");
  const [userUrls, setUserUrls] = useState<UserUrl[]>([]);
  const [urlsLoading, setUrlsLoading] = useState(false);

  useEffect(() => {
    if (showUrlSelector && !shortCode) {
      fetchUserUrls();
    }
  }, [showUrlSelector, shortCode]);

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
    } finally {
      setUrlsLoading(false);
    }
  };

  const handleUrlChange = (value: string) => {
    setSelectedUrl(value);
    // You might want to trigger a re-fetch with the new URL here
    // The useAnalytics hook should handle this based on shortCode prop changes
  };

  const handleExport = async () => {
    try {
      await exportAnalytics("csv");
    } catch (error) {
      console.error("Export failed:", error);
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

        <div className="flex items-center gap-2">
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
                    {url.title || url.shortCode}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}

          <Select onValueChange={(value) => setDateRange(value)}>
            <SelectTrigger className="w-32">
              <SelectValue placeholder="7 days" />
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
            disabled={isLoading || !data}
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
      {isLoading && !metrics ? (
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
          {metrics && (
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
                    {formatNumber(metrics.totalClicks)}
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {metrics.growth > 0 ? "+" : ""}
                    {metrics.growth.toFixed(1)}% from last period
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
                    {formatNumber(metrics.uniqueClicks)}
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {metrics.clickRate.toFixed(1)} clicks per visitor
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
                  <div className="text-2xl font-bold">{metrics.topCountry}</div>
                  <p className="text-xs text-muted-foreground">
                    Most active region
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
                  <div className="text-2xl font-bold capitalize">
                    {metrics.topDevice}
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Primary device type
                  </p>
                </CardContent>
              </Card>
            </div>
          )}

          {/* Charts */}
          {data && (
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
                    <CardTitle>Clicks Over Time</CardTitle>
                    <CardDescription>
                      Daily click trends for the selected period
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    {data.dailyStats && data.dailyStats.length > 0 ? (
                      <ResponsiveContainer width="100%" height={300}>
                        <LineChart data={data.dailyStats}>
                          <CartesianGrid strokeDasharray="3 3" />
                          <XAxis
                            dataKey="date"
                            tickFormatter={(value) =>
                              new Date(value).toLocaleDateString()
                            }
                          />
                          <YAxis />
                          <Tooltip
                            labelFormatter={(value) =>
                              new Date(value).toLocaleDateString()
                            }
                            formatter={(value) => [value, "Clicks"]}
                          />
                          <Line
                            type="monotone"
                            dataKey="clicks"
                            stroke="#3B82F6"
                            strokeWidth={2}
                            dot={{ r: 4 }}
                            activeDot={{ r: 6 }}
                          />
                        </LineChart>
                      </ResponsiveContainer>
                    ) : (
                      <div className="flex items-center justify-center h-[300px] text-muted-foreground">
                        No data available for the selected period
                      </div>
                    )}
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="geography" className="space-y-4">
                <div className="grid gap-4 md:grid-cols-2">
                  <Card>
                    <CardHeader>
                      <CardTitle>Top Countries</CardTitle>
                    </CardHeader>
                    <CardContent>
                      {data.geography && data.geography.length > 0 ? (
                        <ResponsiveContainer width="100%" height={250}>
                          <PieChart>
                            <Pie
                              data={data.geography.slice(0, 5)}
                              cx="50%"
                              cy="50%"
                              outerRadius={80}
                              fill="#8884d8"
                              dataKey="count"
                              nameKey="country"
                            >
                              {data.geography
                                .slice(0, 5)
                                .map((entry, index) => (
                                  <Cell
                                    key={`cell-${index}`}
                                    fill={COLORS[index % COLORS.length]}
                                  />
                                ))}
                            </Pie>
                            <Tooltip formatter={(value) => [value, "Clicks"]} />
                          </PieChart>
                        </ResponsiveContainer>
                      ) : (
                        <div className="flex items-center justify-center h-[250px] text-muted-foreground">
                          No geography data available
                        </div>
                      )}
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader>
                      <CardTitle>Country Breakdown</CardTitle>
                    </CardHeader>
                    <CardContent>
                      {data.geography && data.geography.length > 0 ? (
                        <div className="space-y-2">
                          {data.geography.slice(0, 10).map((country, index) => (
                            <div
                              key={country.country}
                              className="flex items-center justify-between"
                            >
                              <div className="flex items-center gap-2">
                                <div
                                  className="w-3 h-3 rounded-full"
                                  style={{
                                    backgroundColor:
                                      COLORS[index % COLORS.length],
                                  }}
                                />
                                <span className="text-sm">
                                  {country.country}
                                </span>
                              </div>
                              <span className="text-sm font-medium">
                                {formatNumber(country.count)}
                              </span>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <div className="text-center py-8 text-muted-foreground">
                          No country data available
                        </div>
                      )}
                    </CardContent>
                  </Card>
                </div>
              </TabsContent>

              <TabsContent value="devices" className="space-y-4">
                <Card>
                  <CardHeader>
                    <CardTitle>Device Types</CardTitle>
                    <CardDescription>
                      Click distribution by device type
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    {data.devices && data.devices.length > 0 ? (
                      <ResponsiveContainer width="100%" height={300}>
                        <BarChart data={data.devices}>
                          <CartesianGrid strokeDasharray="3 3" />
                          <XAxis dataKey="type" />
                          <YAxis />
                          <Tooltip formatter={(value) => [value, "Clicks"]} />
                          <Bar dataKey="count" fill="#3B82F6" />
                        </BarChart>
                      </ResponsiveContainer>
                    ) : (
                      <div className="flex items-center justify-center h-[300px] text-muted-foreground">
                        No device data available
                      </div>
                    )}
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="referrers" className="space-y-4">
                <Card>
                  <CardHeader>
                    <CardTitle>Top Referrers</CardTitle>
                    <CardDescription>
                      Sources of traffic to your links
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    {data.referrers && data.referrers.length > 0 ? (
                      <div className="space-y-3">
                        {data.referrers.slice(0, 10).map((referrer, index) => (
                          <div
                            key={referrer.domain}
                            className="flex items-center justify-between p-3 bg-muted rounded-lg"
                          >
                            <div className="flex items-center gap-3">
                              <Badge variant="outline">{index + 1}</Badge>
                              <span className="font-medium">
                                {referrer.domain}
                              </span>
                            </div>
                            <span className="text-sm text-muted-foreground">
                              {formatNumber(referrer.count)} clicks
                            </span>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="text-center py-8 text-muted-foreground">
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

      {/* No Data State */}
      {!isLoading && !data && !error && (
        <Card>
          <CardContent className="p-6">
            <div className="text-center space-y-4">
              <BarChart className="h-12 w-12 text-muted-foreground mx-auto" />
              <h3 className="text-lg font-semibold">No Analytics Data</h3>
              <p className="text-muted-foreground">
                No analytics data available for the selected period. Try
                selecting a different date range or check back later.
              </p>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
