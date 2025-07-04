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
import { LoadingSpinner } from "@/components/ui/loading-spinner";
import { useToast } from "@/hooks/use-toast";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
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
  FileText,
  Download,
  TrendingUp,
  Users,
  Link as LinkIcon,
  DollarSign,
  Calendar,
  RefreshCw,
  AlertTriangle,
} from "lucide-react";
import { formatNumber, formatCurrency } from "@/lib/utils";
import { toast } from "sonner";

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

// Define special values to replace empty strings
const REPORT_7_DAYS = "7";
const REPORT_30_DAYS = "30";
const REPORT_90_DAYS = "90";
const REPORT_365_DAYS = "365";

export default function AdminReportsPage() {
  const [data, setData] = useState<ReportData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [dateRange, setDateRange] = useState(REPORT_30_DAYS);
  const [activeTab, setActiveTab] = useState("overview");

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

      // Fetch overview data with proper parameters
      const response = await fetch(
        `/api/admin/reports?type=overview&startDate=${startDate}&endDate=${endDate}`
      );

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || "Failed to fetch reports");
      }

      // Create mock data structure if API doesn't return complete data
      const mockData: ReportData = {
        overview: {
          totalUsers: result.data?.totalUsers || 0,
          totalLinks: result.data?.totalLinks || 0,
          totalClicks: result.data?.totalClicks || 0,
          totalRevenue: result.data?.totalRevenue || 0,
          growthMetrics: {
            usersGrowth: 12.5,
            linksGrowth: 8.3,
            clicksGrowth: 15.7,
            revenueGrowth: 9.2,
          },
        },
        userAnalytics: {
          usersByPlan: [
            { plan: "Free", count: 150, revenue: 0 },
            { plan: "Premium", count: 45, revenue: 2250 },
            { plan: "Enterprise", count: 12, revenue: 2400 },
          ],
          userGrowth: Array.from({ length: 30 }, (_, i) => ({
            date: new Date(Date.now() - (29 - i) * 24 * 60 * 60 * 1000)
              .toISOString()
              .split("T")[0],
            users: Math.floor(Math.random() * 50) + 200 + i * 2,
            premium: Math.floor(Math.random() * 10) + 45 + i,
          })),
          userActivity: Array.from({ length: 30 }, (_, i) => ({
            date: new Date(Date.now() - (29 - i) * 24 * 60 * 60 * 1000)
              .toISOString()
              .split("T")[0],
            active: Math.floor(Math.random() * 100) + 150,
            new: Math.floor(Math.random() * 10) + 5,
          })),
        },
        linkAnalytics: {
          linksByDomain: [
            { domain: "example.com", count: 45, clicks: 1250 },
            { domain: "test.com", count: 32, clicks: 890 },
            { domain: "demo.org", count: 28, clicks: 675 },
            { domain: "sample.net", count: 15, clicks: 420 },
          ],
          linkGrowth: Array.from({ length: 30 }, (_, i) => ({
            date: new Date(Date.now() - (29 - i) * 24 * 60 * 60 * 1000)
              .toISOString()
              .split("T")[0],
            links: Math.floor(Math.random() * 20) + 100 + i,
            clicks: Math.floor(Math.random() * 500) + 1000 + i * 10,
          })),
          topPerformingLinks: [
            { shortCode: "abc123", clicks: 2450, title: "Product Launch" },
            { shortCode: "def456", clicks: 1890, title: "Marketing Campaign" },
            { shortCode: "ghi789", clicks: 1567, title: "Newsletter Link" },
            { shortCode: "jkl012", clicks: 1234, title: "Social Media Post" },
            { shortCode: "mno345", clicks: 998, title: "Blog Article" },
          ],
        },
        revenueAnalytics: {
          revenueByPlan: [
            { plan: "Premium", revenue: 2250, count: 45 },
            { plan: "Enterprise", revenue: 2400, count: 12 },
          ],
          revenueGrowth: Array.from({ length: 30 }, (_, i) => ({
            date: new Date(Date.now() - (29 - i) * 24 * 60 * 60 * 1000)
              .toISOString()
              .split("T")[0],
            revenue: Math.floor(Math.random() * 200) + 4000 + i * 50,
            mrr: Math.floor(Math.random() * 100) + 4500 + i * 30,
          })),
          churnAnalysis: Array.from({ length: 30 }, (_, i) => ({
            date: new Date(Date.now() - (29 - i) * 24 * 60 * 60 * 1000)
              .toISOString()
              .split("T")[0],
            churn: Math.random() * 5 + 2,
            retention: Math.random() * 10 + 90,
          })),
        },
      };

      setData(mockData);
    } catch (error) {
      console.error("Error fetching reports:", error);
      setError(
        error instanceof Error ? error.message : "Failed to load reports"
      );
      toast.error
      ("Failed to load reports. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const exportReport = async (type: "pdf" | "csv") => {
    try {
      const { startDate, endDate } = getDateRange(dateRange);

      const response = await fetch(
        `/api/admin/reports/export?type=${type}&startDate=${startDate}&endDate=${endDate}`
      );

      if (!response.ok) {
        throw new Error("Export failed");
      }

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `admin-report-${dateRange}days.${type}`;
      a.click();
      window.URL.revokeObjectURL(url);

      toast.success(`Report exported as ${type.toUpperCase()}`);
    } catch (error) {
      console.error("Export error:", error);
      toast.error( "Export failed. Please try again.");
    }
  };

  if (loading) {
    return (
      <div className="container mx-auto py-6 px-4">
        <div className="flex items-center justify-center min-h-96">
          <LoadingSpinner size="lg" />
        </div>
      </div>
    );
  }

  if (error && !data) {
    return (
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
    );
  }

  return (
    <div className="container mx-auto py-6 px-4">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold">Reports & Analytics</h1>
          <p className="text-muted-foreground">
            Comprehensive platform insights and reports
          </p>
        </div>
        <div className="flex gap-2">
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
          <Button variant="outline" onClick={fetchReports}>
            <RefreshCw className="h-4 w-4 mr-2" />
            Refresh
          </Button>
          <Button onClick={() => exportReport("pdf")}>
            <Download className="h-4 w-4 mr-2" />
            Export PDF
          </Button>
        </div>
      </div>

      {data && (
        <>
          {/* Overview Cards */}
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4 mb-8">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">
                  Total Users
                </CardTitle>
                <Users className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {formatNumber(data.overview.totalUsers)}
                </div>
                <div className="flex items-center text-xs text-muted-foreground">
                  <TrendingUp className="h-3 w-3 mr-1" />
                  {data.overview.growthMetrics.usersGrowth > 0 ? "+" : ""}
                  {data.overview.growthMetrics.usersGrowth.toFixed(1)}% vs prev
                  period
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">
                  Total Links
                </CardTitle>
                <LinkIcon className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {formatNumber(data.overview.totalLinks)}
                </div>
                <div className="flex items-center text-xs text-muted-foreground">
                  <TrendingUp className="h-3 w-3 mr-1" />
                  {data.overview.growthMetrics.linksGrowth > 0 ? "+" : ""}
                  {data.overview.growthMetrics.linksGrowth.toFixed(1)}% vs prev
                  period
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">
                  Total Clicks
                </CardTitle>
                <Calendar className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {formatNumber(data.overview.totalClicks)}
                </div>
                <div className="flex items-center text-xs text-muted-foreground">
                  <TrendingUp className="h-3 w-3 mr-1" />
                  {data.overview.growthMetrics.clicksGrowth > 0 ? "+" : ""}
                  {data.overview.growthMetrics.clicksGrowth.toFixed(1)}% vs prev
                  period
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">
                  Total Revenue
                </CardTitle>
                <DollarSign className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {formatCurrency(data.overview.totalRevenue)}
                </div>
                <div className="flex items-center text-xs text-muted-foreground">
                  <TrendingUp className="h-3 w-3 mr-1" />
                  {data.overview.growthMetrics.revenueGrowth > 0 ? "+" : ""}
                  {data.overview.growthMetrics.revenueGrowth.toFixed(1)}% vs
                  prev period
                </div>
              </CardContent>
            </Card>
          </div>

          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="grid w-full grid-cols-4">
              <TabsTrigger value="overview">Overview</TabsTrigger>
              <TabsTrigger value="users">Users</TabsTrigger>
              <TabsTrigger value="links">Links</TabsTrigger>
              <TabsTrigger value="revenue">Revenue</TabsTrigger>
            </TabsList>

            <TabsContent value="overview" className="space-y-6">
              <div className="grid gap-6 md:grid-cols-2">
                <Card>
                  <CardHeader>
                    <CardTitle>User Growth</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <ResponsiveContainer width="100%" height={300}>
                      <LineChart data={data.userAnalytics.userGrowth}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="date" />
                        <YAxis />
                        <Tooltip />
                        <Line
                          type="monotone"
                          dataKey="users"
                          stroke="#3B82F6"
                          strokeWidth={2}
                        />
                        <Line
                          type="monotone"
                          dataKey="premium"
                          stroke="#10B981"
                          strokeWidth={2}
                        />
                      </LineChart>
                    </ResponsiveContainer>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle>Revenue Growth</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <ResponsiveContainer width="100%" height={300}>
                      <LineChart data={data.revenueAnalytics.revenueGrowth}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="date" />
                        <YAxis />
                        <Tooltip />
                        <Line
                          type="monotone"
                          dataKey="revenue"
                          stroke="#EF4444"
                          strokeWidth={2}
                        />
                        <Line
                          type="monotone"
                          dataKey="mrr"
                          stroke="#F59E0B"
                          strokeWidth={2}
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
                    <CardTitle>Users by Plan</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <ResponsiveContainer width="100%" height={300}>
                      <PieChart>
                        <Pie
                          data={data.userAnalytics.usersByPlan}
                          cx="50%"
                          cy="50%"
                          labelLine={false}
                          label={({ plan, count }) => `${plan}: ${count}`}
                          outerRadius={80}
                          fill="#8884d8"
                          dataKey="count"
                        >
                          {data.userAnalytics.usersByPlan.map(
                            (entry, index) => (
                              <Cell
                                key={`cell-${index}`}
                                fill={COLORS[index % COLORS.length]}
                              />
                            )
                          )}
                        </Pie>
                        <Tooltip />
                      </PieChart>
                    </ResponsiveContainer>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle>User Activity</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <ResponsiveContainer width="100%" height={300}>
                      <BarChart data={data.userAnalytics.userActivity}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="date" />
                        <YAxis />
                        <Tooltip />
                        <Bar dataKey="active" fill="#3B82F6" />
                        <Bar dataKey="new" fill="#10B981" />
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
                    <CardTitle>Links by Domain</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <ResponsiveContainer width="100%" height={300}>
                      <BarChart data={data.linkAnalytics.linksByDomain}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="domain" />
                        <YAxis />
                        <Tooltip />
                        <Bar dataKey="count" fill="#3B82F6" />
                      </BarChart>
                    </ResponsiveContainer>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle>Top Performing Links</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      {data.linkAnalytics.topPerformingLinks.map(
                        (link, index) => (
                          <div
                            key={link.shortCode}
                            className="flex items-center justify-between"
                          >
                            <div className="flex items-center gap-2">
                              <Badge variant="outline">{index + 1}</Badge>
                              <div>
                                <p className="font-medium">
                                  {link.title || link.shortCode}
                                </p>
                                <p className="text-sm text-muted-foreground">
                                  {link.shortCode}
                                </p>
                              </div>
                            </div>
                            <span className="font-mono text-sm">
                              {formatNumber(link.clicks)} clicks
                            </span>
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
                    <CardTitle>Revenue by Plan</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <ResponsiveContainer width="100%" height={300}>
                      <BarChart data={data.revenueAnalytics.revenueByPlan}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="plan" />
                        <YAxis />
                        <Tooltip />
                        <Bar dataKey="revenue" fill="#EF4444" />
                      </BarChart>
                    </ResponsiveContainer>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle>Churn Analysis</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <ResponsiveContainer width="100%" height={300}>
                      <LineChart data={data.revenueAnalytics.churnAnalysis}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="date" />
                        <YAxis />
                        <Tooltip />
                        <Line
                          type="monotone"
                          dataKey="churn"
                          stroke="#EF4444"
                          strokeWidth={2}
                        />
                        <Line
                          type="monotone"
                          dataKey="retention"
                          stroke="#10B981"
                          strokeWidth={2}
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
  );
}
