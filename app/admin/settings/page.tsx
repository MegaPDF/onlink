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
} from "lucide-react";
import { formatNumber, formatCurrency } from "@/lib/utils";

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

export default function AdminReportsPage() {
  const [data, setData] = useState<ReportData | null>(null);
  const [loading, setLoading] = useState(true);
  const [dateRange, setDateRange] = useState("30");
  const [activeTab, setActiveTab] = useState("overview");
  const toast = useToast();

  useEffect(() => {
    fetchReports();
  }, [dateRange]);

  const fetchReports = async () => {
    try {
      setLoading(true);
      const response = await fetch(`/api/admin/reports?range=${dateRange}`);
      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || "Failed to fetch reports");
      }

      setData(result.data);
    } catch (error) {
      console.error("Error fetching reports:", error);
      toast.error("Failed to load reports");
    } finally {
      setLoading(false);
    }
  };

  const exportReport = async (type: "pdf" | "csv") => {
    try {
      const response = await fetch(
        `/api/admin/reports/export?type=${type}&range=${dateRange}`
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
      toast.error("Export failed");
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
              <SelectItem value="7">7 Days</SelectItem>
              <SelectItem value="30">30 Days</SelectItem>
              <SelectItem value="90">90 Days</SelectItem>
              <SelectItem value="365">1 Year</SelectItem>
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
