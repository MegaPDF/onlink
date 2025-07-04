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
  FileText,
  Download,
  TrendingUp,
  Users,
  DollarSign,
  Activity,
} from "lucide-react";
import { formatNumber, formatCurrency } from "@/lib/utils";

interface ReportData {
  overview: {
    totalUsers: number;
    totalLinks: number;
    totalClicks: number;
    totalRevenue: number;
    growth: {
      users: number;
      links: number;
      clicks: number;
      revenue: number;
    };
  };
  userAnalytics: {
    newUsers: { date: string; count: number }[];
    usersByPlan: { plan: string; count: number }[];
    retention: { cohort: string; retention: number }[];
  };
  linkAnalytics: {
    linksCreated: { date: string; count: number }[];
    clicksOverTime: { date: string; clicks: number }[];
    topDomains: { domain: string; count: number }[];
  };
  revenueAnalytics: {
    revenueByPlan: { plan: string; revenue: number; count: number }[];
    revenueGrowth: { date: string; revenue: number; mrr: number }[];
    churnAnalysis: { date: string; churn: number; retention: number }[];
  };
}

// Define special values to replace empty strings
const REPORT_7_DAYS = "7";
const REPORT_30_DAYS = "30";
const REPORT_90_DAYS = "90";

export default function AdminReportsPage() {
  const [data, setData] = useState<ReportData | null>(null);
  const [loading, setLoading] = useState(true);
  const [dateRange, setDateRange] = useState(REPORT_30_DAYS);
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
      toast.error("Failed to load reports. Please try again.");
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
      toast.error("Export failed. Please try again.");
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
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
            </SelectContent>
          </Select>
          <Button onClick={() => exportReport("csv")}>
            <Download className="h-4 w-4 mr-2" />
            Export CSV
          </Button>
          <Button onClick={() => exportReport("pdf")}>
            <Download className="h-4 w-4 mr-2" />
            Export PDF
          </Button>
        </div>
      </div>

      {/* Overview Stats */}
      {data?.overview && (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Users</CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {formatNumber(data.overview.totalUsers)}
              </div>
              <p className="text-xs text-muted-foreground">
                +{data.overview.growth.users}% from last period
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Links</CardTitle>
              <FileText className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {formatNumber(data.overview.totalLinks)}
              </div>
              <p className="text-xs text-muted-foreground">
                +{data.overview.growth.links}% from last period
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                Total Clicks
              </CardTitle>
              <Activity className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {formatNumber(data.overview.totalClicks)}
              </div>
              <p className="text-xs text-muted-foreground">
                +{data.overview.growth.clicks}% from last period
              </p>
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
              <p className="text-xs text-muted-foreground">
                +{data.overview.growth.revenue}% from last period
              </p>
            </CardContent>
          </Card>
        </div>
      )}

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
                <CardTitle>Users by Plan</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {data?.userAnalytics.usersByPlan.map((item) => (
                    <div
                      key={item.plan}
                      className="flex items-center justify-between"
                    >
                      <span className="capitalize">{item.plan}</span>
                      <span className="font-medium">
                        {formatNumber(item.count)}
                      </span>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Top Domains</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {data?.linkAnalytics.topDomains.map((item) => (
                    <div
                      key={item.domain}
                      className="flex items-center justify-between"
                    >
                      <span>{item.domain}</span>
                      <span className="font-medium">
                        {formatNumber(item.count)}
                      </span>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="users" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>User Analytics</CardTitle>
              <CardDescription>
                Detailed user registration and retention metrics
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid gap-6 md:grid-cols-2">
                <div>
                  <h4 className="font-medium mb-2">New User Registrations</h4>
                  <div className="space-y-2">
                    {data?.userAnalytics.newUsers.slice(0, 7).map((item) => (
                      <div
                        key={item.date}
                        className="flex items-center justify-between text-sm"
                      >
                        <span>{item.date}</span>
                        <span>{item.count}</span>
                      </div>
                    ))}
                  </div>
                </div>
                <div>
                  <h4 className="font-medium mb-2">User Retention</h4>
                  <div className="space-y-2">
                    {data?.userAnalytics.retention.map((item) => (
                      <div
                        key={item.cohort}
                        className="flex items-center justify-between text-sm"
                      >
                        <span>{item.cohort}</span>
                        <span>{item.retention}%</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="links" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Link Analytics</CardTitle>
              <CardDescription>
                Link creation and engagement metrics
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid gap-6 md:grid-cols-2">
                <div>
                  <h4 className="font-medium mb-2">Links Created Daily</h4>
                  <div className="space-y-2">
                    {data?.linkAnalytics.linksCreated
                      .slice(0, 7)
                      .map((item) => (
                        <div
                          key={item.date}
                          className="flex items-center justify-between text-sm"
                        >
                          <span>{item.date}</span>
                          <span>{item.count}</span>
                        </div>
                      ))}
                  </div>
                </div>
                <div>
                  <h4 className="font-medium mb-2">Daily Clicks</h4>
                  <div className="space-y-2">
                    {data?.linkAnalytics.clicksOverTime
                      .slice(0, 7)
                      .map((item) => (
                        <div
                          key={item.date}
                          className="flex items-center justify-between text-sm"
                        >
                          <span>{item.date}</span>
                          <span>{formatNumber(item.clicks)}</span>
                        </div>
                      ))}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="revenue" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Revenue Analytics</CardTitle>
              <CardDescription>
                Revenue breakdown and growth metrics
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid gap-6 md:grid-cols-2">
                <div>
                  <h4 className="font-medium mb-2">Revenue by Plan</h4>
                  <div className="space-y-2">
                    {data?.revenueAnalytics.revenueByPlan.map((item) => (
                      <div
                        key={item.plan}
                        className="flex items-center justify-between text-sm"
                      >
                        <span className="capitalize">{item.plan}</span>
                        <span>{formatCurrency(item.revenue)}</span>
                      </div>
                    ))}
                  </div>
                </div>
                <div>
                  <h4 className="font-medium mb-2">Churn Analysis</h4>
                  <div className="space-y-2">
                    {data?.revenueAnalytics.churnAnalysis
                      .slice(0, 7)
                      .map((item) => (
                        <div
                          key={item.date}
                          className="flex items-center justify-between text-sm"
                        >
                          <span>{item.date}</span>
                          <span>{item.churn}%</span>
                        </div>
                      ))}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
