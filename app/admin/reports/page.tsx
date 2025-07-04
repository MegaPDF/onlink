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
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip as RechartsTooltip,
  ResponsiveContainer,
  LineChart,
  Line,
  PieChart,
  Pie,
  Cell,
  AreaChart,
  Area,
} from "recharts";
import {
  FileText,
  Download,
  TrendingUp,
  TrendingDown,
  Users,
  Link,
  DollarSign,
  Calendar,
  RefreshCw,
  AlertTriangle,
  Loader2,
  Eye,
  Settings,
  BarChart3,
  Activity,
  Target,
  Crown,
  Zap,
} from "lucide-react";

// Types for real API data
interface ReportData {
  overview: {
    totalUsers: number;
    totalLinks: number;
    totalClicks: number;
    totalRevenue: number;
    growthMetrics: {
      usersGrowth: number;
      linksGrowth: number;
      clicksGrowth: number;
      revenueGrowth: number;
    };
  };
  userAnalytics: {
    usersByPlan: { plan: string; count: number; revenue: number }[];
    userGrowth: { date: string; users: number; premium: number }[];
    userActivity: { date: string; active: number; new: number }[];
  };
  linkAnalytics: {
    linksByDomain: { domain: string; count: number; clicks: number }[];
    linkGrowth: { date: string; links: number; clicks: number }[];
    topPerformingLinks: { shortCode: string; clicks: number; title?: string }[];
  };
  revenueAnalytics: {
    revenueByPlan: { plan: string; revenue: number; count: number }[];
    revenueGrowth: { date: string; revenue: number; mrr: number }[];
    churnAnalysis: { date: string; churn: number; retention: number }[];
  };
}

const COLORS = ["#3B82F6", "#EF4444", "#10B981", "#F59E0B", "#8B5CF6"];

const REPORT_7_DAYS = "7";
const REPORT_30_DAYS = "30";
const REPORT_90_DAYS = "90";
const REPORT_365_DAYS = "365";

// Utility functions
const formatNumber = (num: number) => {
  return new Intl.NumberFormat().format(num);
};

const formatCurrency = (amount: number, currency: string = "USD") => {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: currency,
  }).format(amount);
};

export default function AdminReportsPage() {
  const [data, setData] = useState<ReportData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [dateRange, setDateRange] = useState(REPORT_30_DAYS);
  const [activeTab, setActiveTab] = useState("overview");
  const [exporting, setExporting] = useState(false);

  // Toast notifications (replace with your actual toast implementation)
  const toast = {
    success: (message: string) => console.log("Success:", message),
    error: (message: string) => console.log("Error:", message),
  };

  useEffect(() => {
    fetchReports();
  }, [dateRange]);

  const getDateRange = (days: string) => {
    const endDate = new Date();
    const startDate = new Date();
    startDate.setDate(endDate.getDate() - parseInt(days));

    return {
      startDate: startDate.toISOString().split("T")[0],
      endDate: endDate.toISOString().split("T")[0],
    };
  };

  const fetchReports = async () => {
    try {
      setLoading(true);
      setError(null);

      const { startDate, endDate } = getDateRange(dateRange);

      // Fetch all report data from real API endpoints
      const [overviewRes, usersRes, linksRes, revenueRes] = await Promise.all([
        fetch(
          `/api/admin/reports/overview?startDate=${startDate}&endDate=${endDate}`
        ),
        fetch(
          `/api/admin/reports/users?startDate=${startDate}&endDate=${endDate}`
        ),
        fetch(
          `/api/admin/reports/links?startDate=${startDate}&endDate=${endDate}`
        ),
        fetch(
          `/api/admin/reports/revenue?startDate=${startDate}&endDate=${endDate}`
        ),
      ]);

      // Check if all requests were successful
      if (!overviewRes.ok || !usersRes.ok || !linksRes.ok || !revenueRes.ok) {
        throw new Error("Failed to fetch one or more report sections");
      }

      const [overviewData, usersData, linksData, revenueData] =
        await Promise.all([
          overviewRes.json(),
          usersRes.json(),
          linksRes.json(),
          revenueRes.json(),
        ]);

      // Combine real API data
      const realData: ReportData = {
        overview: {
          totalUsers: overviewData.data?.totalUsers || 0,
          totalLinks: overviewData.data?.totalLinks || 0,
          totalClicks: overviewData.data?.totalClicks || 0,
          totalRevenue: overviewData.data?.totalRevenue || 0,
          growthMetrics: {
            usersGrowth: overviewData.data?.growthMetrics?.usersGrowth || 0,
            linksGrowth: overviewData.data?.growthMetrics?.linksGrowth || 0,
            clicksGrowth: overviewData.data?.growthMetrics?.clicksGrowth || 0,
            revenueGrowth: overviewData.data?.growthMetrics?.revenueGrowth || 0,
          },
        },
        userAnalytics: {
          usersByPlan: usersData.data?.usersByPlan || [],
          userGrowth: usersData.data?.userGrowth || [],
          userActivity: usersData.data?.userActivity || [],
        },
        linkAnalytics: {
          linksByDomain: linksData.data?.linksByDomain || [],
          linkGrowth: linksData.data?.linkGrowth || [],
          topPerformingLinks: linksData.data?.topPerformingLinks || [],
        },
        revenueAnalytics: {
          revenueByPlan: revenueData.data?.revenueByPlan || [],
          revenueGrowth: revenueData.data?.revenueGrowth || [],
          churnAnalysis: revenueData.data?.churnAnalysis || [],
        },
      };

      setData(realData);
    } catch (error) {
      console.error("Error fetching reports:", error);
      setError(
        error instanceof Error ? error.message : "Failed to load reports"
      );
      toast.error("Failed to load reports. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const exportReport = async (type: "pdf" | "csv") => {
    try {
      setExporting(true);
      const { startDate, endDate } = getDateRange(dateRange);

      const response = await fetch(
        `/api/admin/reports/export?type=${type}&startDate=${startDate}&endDate=${endDate}&tab=${activeTab}`
      );

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Export failed");
      }

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `admin-report-${activeTab}-${dateRange}days-${
        new Date().toISOString().split("T")[0]
      }.${type}`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);

      toast.success(`Report exported as ${type.toUpperCase()}`);
    } catch (error) {
      console.error("Export error:", error);
      toast.error(
        error instanceof Error
          ? error.message
          : "Export failed. Please try again."
      );
    } finally {
      setExporting(false);
    }
  };

  const getGrowthIcon = (growth: number) => {
    return growth >= 0 ? (
      <TrendingUp className="h-3 w-3 mr-1 text-green-600" />
    ) : (
      <TrendingDown className="h-3 w-3 mr-1 text-red-600" />
    );
  };

  const getGrowthColor = (growth: number) => {
    return growth >= 0 ? "text-green-600" : "text-red-600";
  };

  if (loading) {
    return (
      <div className="container mx-auto py-6 px-4">
        <div className="flex items-center justify-center min-h-96">
          <Loader2 className="h-8 w-8 animate-spin" />
        </div>
      </div>
    );
  }

  if (error && !data) {
    return (
      <TooltipProvider>
        <div className="container mx-auto py-6 px-4">
          <Card className="border-destructive">
            <CardContent className="pt-6">
              <div className="flex items-center gap-3 text-destructive">
                <AlertTriangle className="h-5 w-5" />
                <div>
                  <h3 className="font-semibold">Failed to load reports</h3>
                  <p className="text-sm text-muted-foreground">{error}</p>
                </div>
              </div>
              <Button onClick={fetchReports} className="mt-4" variant="outline">
                <RefreshCw className="h-4 w-4 mr-2" />
                Try Again
              </Button>
            </CardContent>
          </Card>
        </div>
      </TooltipProvider>
    );
  }

  return (
    <TooltipProvider>
      <div className="container mx-auto py-6 px-4 space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">
              Reports & Analytics
            </h1>
            <p className="text-muted-foreground">
              Comprehensive platform insights and performance metrics
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Select value={dateRange} onValueChange={setDateRange}>
              <SelectTrigger className="w-32">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={REPORT_7_DAYS}>7 Days</SelectItem>
                <SelectItem value={REPORT_30_DAYS}>30 Days</SelectItem>
                <SelectItem value={REPORT_90_DAYS}>90 Days</SelectItem>
                <SelectItem value={REPORT_365_DAYS}>1 Year</SelectItem>
              </SelectContent>
            </Select>

            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="outline"
                  onClick={fetchReports}
                  disabled={loading}
                >
                  <RefreshCw
                    className={`h-4 w-4 mr-2 ${loading ? "animate-spin" : ""}`}
                  />
                  Refresh
                </Button>
              </TooltipTrigger>
              <TooltipContent>Refresh report data</TooltipContent>
            </Tooltip>

            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  onClick={() => exportReport("csv")}
                  disabled={exporting}
                >
                  <Download className="h-4 w-4 mr-2" />
                  Export CSV
                </Button>
              </TooltipTrigger>
              <TooltipContent>Export data as CSV file</TooltipContent>
            </Tooltip>

            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  onClick={() => exportReport("pdf")}
                  disabled={exporting}
                >
                  {exporting ? (
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  ) : (
                    <FileText className="h-4 w-4 mr-2" />
                  )}
                  Export PDF
                </Button>
              </TooltipTrigger>
              <TooltipContent>Export report as PDF</TooltipContent>
            </Tooltip>
          </div>
        </div>

        {data && (
          <>
            {/* Overview Cards */}
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
              <Card className="relative overflow-hidden">
                <div className="absolute inset-0 bg-gradient-to-br from-blue-50 to-blue-100 dark:from-blue-950/20 dark:to-blue-900/20"></div>
                <CardHeader className="relative flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">
                    Total Users
                  </CardTitle>
                  <Users className="h-4 w-4 text-blue-600" />
                </CardHeader>
                <CardContent className="relative">
                  <div className="text-2xl font-bold text-blue-600">
                    {formatNumber(data.overview.totalUsers)}
                  </div>
                  <div className="flex items-center text-xs text-muted-foreground mt-1">
                    {getGrowthIcon(data.overview.growthMetrics.usersGrowth)}
                    <span
                      className={getGrowthColor(
                        data.overview.growthMetrics.usersGrowth
                      )}
                    >
                      {data.overview.growthMetrics.usersGrowth > 0 ? "+" : ""}
                      {data.overview.growthMetrics.usersGrowth.toFixed(1)}%
                    </span>
                    <span className="ml-1">vs prev period</span>
                  </div>
                </CardContent>
              </Card>

              <Card className="relative overflow-hidden">
                <div className="absolute inset-0 bg-gradient-to-br from-green-50 to-green-100 dark:from-green-950/20 dark:to-green-900/20"></div>
                <CardHeader className="relative flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">
                    Total Links
                  </CardTitle>
                  <Link className="h-4 w-4 text-green-600" />
                </CardHeader>
                <CardContent className="relative">
                  <div className="text-2xl font-bold text-green-600">
                    {formatNumber(data.overview.totalLinks)}
                  </div>
                  <div className="flex items-center text-xs text-muted-foreground mt-1">
                    {getGrowthIcon(data.overview.growthMetrics.linksGrowth)}
                    <span
                      className={getGrowthColor(
                        data.overview.growthMetrics.linksGrowth
                      )}
                    >
                      {data.overview.growthMetrics.linksGrowth > 0 ? "+" : ""}
                      {data.overview.growthMetrics.linksGrowth.toFixed(1)}%
                    </span>
                    <span className="ml-1">vs prev period</span>
                  </div>
                </CardContent>
              </Card>

              <Card className="relative overflow-hidden">
                <div className="absolute inset-0 bg-gradient-to-br from-purple-50 to-purple-100 dark:from-purple-950/20 dark:to-purple-900/20"></div>
                <CardHeader className="relative flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">
                    Total Clicks
                  </CardTitle>
                  <Activity className="h-4 w-4 text-purple-600" />
                </CardHeader>
                <CardContent className="relative">
                  <div className="text-2xl font-bold text-purple-600">
                    {formatNumber(data.overview.totalClicks)}
                  </div>
                  <div className="flex items-center text-xs text-muted-foreground mt-1">
                    {getGrowthIcon(data.overview.growthMetrics.clicksGrowth)}
                    <span
                      className={getGrowthColor(
                        data.overview.growthMetrics.clicksGrowth
                      )}
                    >
                      {data.overview.growthMetrics.clicksGrowth > 0 ? "+" : ""}
                      {data.overview.growthMetrics.clicksGrowth.toFixed(1)}%
                    </span>
                    <span className="ml-1">vs prev period</span>
                  </div>
                </CardContent>
              </Card>

              <Card className="relative overflow-hidden">
                <div className="absolute inset-0 bg-gradient-to-br from-yellow-50 to-yellow-100 dark:from-yellow-950/20 dark:to-yellow-900/20"></div>
                <CardHeader className="relative flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">
                    Total Revenue
                  </CardTitle>
                  <DollarSign className="h-4 w-4 text-yellow-600" />
                </CardHeader>
                <CardContent className="relative">
                  <div className="text-2xl font-bold text-yellow-600">
                    {formatCurrency(data.overview.totalRevenue)}
                  </div>
                  <div className="flex items-center text-xs text-muted-foreground mt-1">
                    {getGrowthIcon(data.overview.growthMetrics.revenueGrowth)}
                    <span
                      className={getGrowthColor(
                        data.overview.growthMetrics.revenueGrowth
                      )}
                    >
                      {data.overview.growthMetrics.revenueGrowth > 0 ? "+" : ""}
                      {data.overview.growthMetrics.revenueGrowth.toFixed(1)}%
                    </span>
                    <span className="ml-1">vs prev period</span>
                  </div>
                </CardContent>
              </Card>
            </div>

            <Tabs value={activeTab} onValueChange={setActiveTab}>
              <TabsList className="grid w-full grid-cols-4">
                <TabsTrigger value="overview">
                  <BarChart3 className="h-4 w-4 mr-2" />
                  Overview
                </TabsTrigger>
                <TabsTrigger value="users">
                  <Users className="h-4 w-4 mr-2" />
                  Users
                </TabsTrigger>
                <TabsTrigger value="links">
                  <Link className="h-4 w-4 mr-2" />
                  Links
                </TabsTrigger>
                <TabsTrigger value="revenue">
                  <DollarSign className="h-4 w-4 mr-2" />
                  Revenue
                </TabsTrigger>
              </TabsList>

              <TabsContent value="overview" className="space-y-6">
                <div className="grid gap-6 md:grid-cols-2">
                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <TrendingUp className="h-5 w-5 text-blue-600" />
                        User Growth Trends
                      </CardTitle>
                      <CardDescription>
                        Track total and premium user acquisition over time
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      <ResponsiveContainer width="100%" height={300}>
                        <AreaChart data={data.userAnalytics.userGrowth}>
                          <CartesianGrid strokeDasharray="3 3" />
                          <XAxis
                            dataKey="date"
                            tick={{ fontSize: 12 }}
                            tickFormatter={(value) =>
                              new Date(value).toLocaleDateString("en-US", {
                                month: "short",
                                day: "numeric",
                              })
                            }
                          />
                          <YAxis tick={{ fontSize: 12 }} />
                          <RechartsTooltip
                            labelFormatter={(value) =>
                              new Date(value).toLocaleDateString()
                            }
                            formatter={(value, name) => [
                              formatNumber(Number(value)),
                              name === "users"
                                ? "Total Users"
                                : "Premium Users",
                            ]}
                          />
                          <Area
                            type="monotone"
                            dataKey="users"
                            stackId="1"
                            stroke="#3B82F6"
                            fill="#3B82F6"
                            fillOpacity={0.6}
                          />
                          <Area
                            type="monotone"
                            dataKey="premium"
                            stackId="2"
                            stroke="#10B981"
                            fill="#10B981"
                            fillOpacity={0.8}
                          />
                        </AreaChart>
                      </ResponsiveContainer>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <DollarSign className="h-5 w-5 text-green-600" />
                        Revenue Growth
                      </CardTitle>
                      <CardDescription>
                        Monitor revenue and MRR trends
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      <ResponsiveContainer width="100%" height={300}>
                        <LineChart data={data.revenueAnalytics.revenueGrowth}>
                          <CartesianGrid strokeDasharray="3 3" />
                          <XAxis
                            dataKey="date"
                            tick={{ fontSize: 12 }}
                            tickFormatter={(value) =>
                              new Date(value).toLocaleDateString("en-US", {
                                month: "short",
                                day: "numeric",
                              })
                            }
                          />
                          <YAxis tick={{ fontSize: 12 }} />
                          <RechartsTooltip
                            labelFormatter={(value) =>
                              new Date(value).toLocaleDateString()
                            }
                            formatter={(value, name) => [
                              formatCurrency(Number(value)),
                              name === "revenue" ? "Total Revenue" : "MRR",
                            ]}
                          />
                          <Line
                            type="monotone"
                            dataKey="revenue"
                            stroke="#EF4444"
                            strokeWidth={3}
                            dot={{ fill: "#EF4444", strokeWidth: 2, r: 4 }}
                          />
                          <Line
                            type="monotone"
                            dataKey="mrr"
                            stroke="#F59E0B"
                            strokeWidth={3}
                            dot={{ fill: "#F59E0B", strokeWidth: 2, r: 4 }}
                          />
                        </LineChart>
                      </ResponsiveContainer>
                    </CardContent>
                  </Card>
                </div>
              </TabsContent>

              <TabsContent value="users" className="space-y-6">
                <div className="grid gap-6 md:grid-cols-2">
                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <PieChart className="h-5 w-5 text-purple-600" />
                        Users by Plan
                      </CardTitle>
                      <CardDescription>
                        Distribution of users across subscription plans
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      <ResponsiveContainer width="100%" height={300}>
                        <PieChart>
                          <Pie
                            data={data.userAnalytics.usersByPlan}
                            cx="50%"
                            cy="50%"
                            labelLine={false}
                            label={({ plan, count, percent }) =>
                              `${plan}: ${((percent ?? 0) * 100).toFixed(0)}%`
                            }
                            outerRadius={80}
                            fill="#8884d8"
                            dataKey="count"
                          >
                            {data.userAnalytics.usersByPlan.map(
                              (entry, index) => (
                                <Cell
                                  key={`user-plan-cell-${index}`}
                                  fill={COLORS[index % COLORS.length]}
                                />
                              )
                            )}
                          </Pie>
                          <RechartsTooltip
                            formatter={(value, name, entry) => [
                              `${formatNumber(Number(value))} users`,
                              entry.payload.plan,
                            ]}
                          />
                        </PieChart>
                      </ResponsiveContainer>
                      <div className="grid grid-cols-1 gap-2 mt-4">
                        {data.userAnalytics.usersByPlan.map((plan, index) => (
                          <div
                            key={`user-plan-legend-${index}`}
                            className="flex items-center justify-between text-sm"
                          >
                            <div className="flex items-center gap-2">
                              <div
                                className="w-3 h-3 rounded-full"
                                style={{
                                  backgroundColor:
                                    COLORS[index % COLORS.length],
                                }}
                              />
                              <span>{plan.plan}</span>
                            </div>
                            <span className="font-medium">
                              {formatNumber(plan.count)} users
                            </span>
                          </div>
                        ))}
                      </div>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <Activity className="h-5 w-5 text-blue-600" />
                        User Activity
                      </CardTitle>
                      <CardDescription>
                        Daily active users and new registrations
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      <ResponsiveContainer width="100%" height={300}>
                        <BarChart data={data.userAnalytics.userActivity}>
                          <CartesianGrid strokeDasharray="3 3" />
                          <XAxis
                            dataKey="date"
                            tick={{ fontSize: 12 }}
                            tickFormatter={(value) =>
                              new Date(value).toLocaleDateString("en-US", {
                                month: "short",
                                day: "numeric",
                              })
                            }
                          />
                          <YAxis tick={{ fontSize: 12 }} />
                          <RechartsTooltip
                            labelFormatter={(value) =>
                              new Date(value).toLocaleDateString()
                            }
                            formatter={(value, name) => [
                              formatNumber(Number(value)),
                              name === "active" ? "Active Users" : "New Users",
                            ]}
                          />
                          <Bar
                            dataKey="active"
                            fill="#3B82F6"
                            name="Active Users"
                          />
                          <Bar dataKey="new" fill="#10B981" name="New Users" />
                        </BarChart>
                      </ResponsiveContainer>
                    </CardContent>
                  </Card>
                </div>
              </TabsContent>

              <TabsContent value="links" className="space-y-6">
                <div className="grid gap-6 md:grid-cols-2">
                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <BarChart3 className="h-5 w-5 text-green-600" />
                        Links by Domain
                      </CardTitle>
                      <CardDescription>
                        Distribution of links across different domains
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      <ResponsiveContainer width="100%" height={300}>
                        <BarChart data={data.linkAnalytics.linksByDomain}>
                          <CartesianGrid strokeDasharray="3 3" />
                          <XAxis dataKey="domain" tick={{ fontSize: 12 }} />
                          <YAxis tick={{ fontSize: 12 }} />
                          <RechartsTooltip
                            formatter={(value, name) => [
                              formatNumber(Number(value)),
                              name === "count" ? "Links" : "Clicks",
                            ]}
                          />
                          <Bar dataKey="count" fill="#3B82F6" name="Links" />
                        </BarChart>
                      </ResponsiveContainer>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <Target className="h-5 w-5 text-orange-600" />
                        Top Performing Links
                      </CardTitle>
                      <CardDescription>
                        Links with the highest click counts
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-4">
                        {data.linkAnalytics.topPerformingLinks.map(
                          (link, index) => (
                            <div
                              key={`top-link-${link.shortCode}-${index}`}
                              className="flex items-center justify-between p-3 rounded-lg border hover:bg-muted/50 transition-colors"
                            >
                              <div className="flex items-center gap-3">
                                <Badge
                                  variant="outline"
                                  className="min-w-[2rem] justify-center"
                                >
                                  {index + 1}
                                </Badge>
                                <div>
                                  <p className="font-medium text-sm">
                                    {link.title || link.shortCode}
                                  </p>
                                  <p className="text-xs text-muted-foreground font-mono">
                                    /{link.shortCode}
                                  </p>
                                </div>
                              </div>
                              <div className="text-right">
                                <p className="font-bold text-sm">
                                  {formatNumber(link.clicks)}
                                </p>
                                <p className="text-xs text-muted-foreground">
                                  clicks
                                </p>
                              </div>
                            </div>
                          )
                        )}
                      </div>
                    </CardContent>
                  </Card>
                </div>
              </TabsContent>

              <TabsContent value="revenue" className="space-y-6">
                <div className="grid gap-6 md:grid-cols-2">
                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <Crown className="h-5 w-5 text-yellow-600" />
                        Revenue by Plan
                      </CardTitle>
                      <CardDescription>
                        Revenue breakdown across subscription tiers
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      <ResponsiveContainer width="100%" height={300}>
                        <BarChart data={data.revenueAnalytics.revenueByPlan}>
                          <CartesianGrid strokeDasharray="3 3" />
                          <XAxis dataKey="plan" tick={{ fontSize: 12 }} />
                          <YAxis tick={{ fontSize: 12 }} />
                          <RechartsTooltip
                            formatter={(value) => [
                              formatCurrency(Number(value)),
                              "Revenue",
                            ]}
                          />
                          <Bar
                            dataKey="revenue"
                            fill="#EF4444"
                            name="Revenue"
                          />
                        </BarChart>
                      </ResponsiveContainer>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <Zap className="h-5 w-5 text-red-600" />
                        Churn Analysis
                      </CardTitle>
                      <CardDescription>
                        Customer retention and churn rate trends
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      <ResponsiveContainer width="100%" height={300}>
                        <LineChart data={data.revenueAnalytics.churnAnalysis}>
                          <CartesianGrid strokeDasharray="3 3" />
                          <XAxis
                            dataKey="date"
                            tick={{ fontSize: 12 }}
                            tickFormatter={(value) =>
                              new Date(value).toLocaleDateString("en-US", {
                                month: "short",
                                day: "numeric",
                              })
                            }
                          />
                          <YAxis tick={{ fontSize: 12 }} />
                          <RechartsTooltip
                            labelFormatter={(value) =>
                              new Date(value).toLocaleDateString()
                            }
                            formatter={(value, name) => [
                              `${Number(value).toFixed(1)}%`,
                              name === "churn"
                                ? "Churn Rate"
                                : "Retention Rate",
                            ]}
                          />
                          <Line
                            type="monotone"
                            dataKey="churn"
                            stroke="#EF4444"
                            strokeWidth={3}
                            dot={{ fill: "#EF4444", strokeWidth: 2, r: 4 }}
                            name="Churn Rate"
                          />
                          <Line
                            type="monotone"
                            dataKey="retention"
                            stroke="#10B981"
                            strokeWidth={3}
                            dot={{ fill: "#10B981", strokeWidth: 2, r: 4 }}
                            name="Retention Rate"
                          />
                        </LineChart>
                      </ResponsiveContainer>
                    </CardContent>
                  </Card>
                </div>
              </TabsContent>
            </Tabs>
          </>
        )}
      </div>
    </TooltipProvider>
  );
}
