// ============= components/dashboard/analytics-dashboard.tsx =============
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
} from "lucide-react";
import { formatNumber } from "@/lib/utils";

const COLORS = ["#3B82F6", "#EF4444", "#10B981", "#F59E0B", "#8B5CF6"];

interface AnalyticsDashboardProps {
  shortCode?: string;
  showUrlSelector?: boolean;
}

export function AnalyticsDashboard({
  shortCode,
  showUrlSelector = true,
}: AnalyticsDashboardProps) {
  const { user } = useAuth();
  const { data, metrics, isLoading, setDateRange, exportAnalytics } =
    useAnalytics({ shortCode });

  const [selectedUrl, setSelectedUrl] = useState(shortCode || "");
  const [userUrls, setUserUrls] = useState([]);

  useEffect(() => {
    if (showUrlSelector && !shortCode) {
      fetchUserUrls();
    }
  }, []);

  const fetchUserUrls = async () => {
    try {
      const response = await fetch("/api/client/my-links?limit=50");
      const result = await response.json();
      if (response.ok) {
        setUserUrls(result.data.urls);
      }
    } catch (error) {
      console.error("Failed to fetch URLs:", error);
    }
  };

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
            <Select value={selectedUrl} onValueChange={setSelectedUrl}>
              <SelectTrigger className="w-48">
                <SelectValue placeholder="Select URL" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All URLs</SelectItem>
                {userUrls.map((url: any) => (
                  <SelectItem key={url.shortCode} value={url.shortCode}>
                    {url.title || url.shortCode}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}

          <Select onValueChange={(value) => setDateRange(value as any)}>
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

          <Button variant="outline" onClick={() => exportAnalytics("csv")}>
            <Download className="mr-2 h-4 w-4" />
            Export
          </Button>
        </div>
      </div>

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
                {metrics.growth}% from last period
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
              <CardTitle className="text-sm font-medium">Top Country</CardTitle>
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
              <CardTitle className="text-sm font-medium">Top Device</CardTitle>
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
              </CardHeader>
              <CardContent>
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
                        {data.geography.slice(0, 5).map((entry, index) => (
                          <Cell
                            key={`cell-${index}`}
                            fill={COLORS[index % COLORS.length]}
                          />
                        ))}
                      </Pie>
                      <Tooltip />
                    </PieChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Country Breakdown</CardTitle>
                </CardHeader>
                <CardContent>
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
                              backgroundColor: COLORS[index % COLORS.length],
                            }}
                          />
                          <span className="text-sm">{country.country}</span>
                        </div>
                        <span className="text-sm font-medium">
                          {formatNumber(country.count)}
                        </span>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="devices" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Device Types</CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={data.devices}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="type" />
                    <YAxis />
                    <Tooltip />
                    <Bar dataKey="count" fill="#3B82F6" />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="referrers" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Top Referrers</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {data.referrers.slice(0, 10).map((referrer, index) => (
                    <div
                      key={referrer.domain}
                      className="flex items-center justify-between p-3 bg-muted rounded-lg"
                    >
                      <div className="flex items-center gap-3">
                        <Badge variant="outline">{index + 1}</Badge>
                        <span className="font-medium">{referrer.domain}</span>
                      </div>
                      <span className="text-sm text-muted-foreground">
                        {formatNumber(referrer.count)} clicks
                      </span>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      )}
    </div>
  );
}
