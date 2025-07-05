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
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Users,
  Link as LinkIcon,
  Globe,
  CreditCard,
  TrendingUp,
  Activity,
  DollarSign,
  AlertTriangle,
  Shield,
  BarChart3,
  RefreshCw,
  Eye,
  MousePointer,
  UserCheck,
  Crown,
  Calendar,
  Clock,
  Zap,
  Target,
  TrendingDown,
  CheckCircle,
  XCircle,
  MoreHorizontal,
  ArrowUpRight,
  ArrowDownRight,
} from "lucide-react";
import { formatNumber, formatCurrency } from "@/lib/utils";
import Link from "next/link";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  AreaChart,
  Area,
} from "recharts";

interface AdminStats {
  users: {
    total: number;
    active: number;
    newToday: number;
    byPlan: { free: number; premium: number; enterprise: number };
  };
  links: {
    total: number;
    active: number;
    totalClicks: number;
    createdToday: number;
  };
  domains: { total: number; verified: number; custom: number };
  revenue: {
    mrr: number;
    arr: number;
    totalRevenue: number;
    activeSubscriptions: number;
  };
  security: {
    failedLogins: number;
    suspiciousActivities: number;
    blockedIps: number;
  };
}

interface RecentActivity {
  _id: string;
  type: "user" | "link" | "security" | "revenue";
  action: string;
  userId?: { name: string; email: string };
  createdAt: string;
  status: "success" | "warning" | "error";
  metadata?: any;
}

interface TopLink {
  _id: string;
  shortCode: string;
  originalUrl: string;
  clicks: { total: number };
  userId: { name: string; email: string };
}

export default function AdminOverviewPage() {
  const [stats, setStats] = useState<AdminStats | null>(null);
  const [recentActivities, setRecentActivities] = useState<RecentActivity[]>(
    []
  );
  const [topLinks, setTopLinks] = useState<TopLink[]>([]);
  const [chartData, setChartData] = useState({
    revenue: [] as any[],
    userGrowth: [] as any[],
    planDistribution: [] as any[],
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const toast = useToast();

  useEffect(() => {
    fetchStats();
  }, []);

  const fetchStats = async () => {
    try {
      setLoading(true);
      setError(null);

      const [
        usersResponse,
        linksResponse,
        domainsResponse,
        billingResponse,
        securityResponse,
        activitiesResponse,
        topLinksResponse,
        chartsResponse,
      ] = await Promise.all([
        fetch("/api/admin/users?page=1&limit=1"),
        fetch("/api/admin/links?page=1&limit=1"),
        fetch("/api/admin/domains?page=1&limit=1"),
        fetch("/api/admin/billing?page=1&limit=1"),
        fetch("/api/admin/security?page=1&limit=1"),
        fetch("/api/admin/activities?limit=5"),
        fetch("/api/admin/links/top?limit=5"),
        fetch("/api/admin/analytics/charts"),
      ]);

      if (
        !usersResponse.ok ||
        !linksResponse.ok ||
        !domainsResponse.ok ||
        !billingResponse.ok ||
        !securityResponse.ok
      ) {
        throw new Error("Failed to fetch admin statistics");
      }

      const [
        usersData,
        linksData,
        domainsData,
        billingData,
        securityData,
        activitiesData,
        topLinksData,
        chartsData,
      ] = await Promise.all([
        usersResponse.json(),
        linksResponse.json(),
        domainsResponse.json(),
        billingResponse.json(),
        securityResponse.json(),
        activitiesResponse.ok
          ? activitiesResponse.json()
          : { data: { activities: [] } },
        topLinksResponse.ok ? topLinksResponse.json() : { data: { links: [] } },
        chartsResponse.ok
          ? chartsResponse.json()
          : { data: { revenue: [], userGrowth: [], planDistribution: [] } },
      ]);

      setStats({
        users: {
          total: usersData.data?.stats?.totalUsers || 0,
          active: usersData.data?.stats?.activeUsers || 0,
          newToday: usersData.data?.stats?.newUsersToday || 0,
          byPlan: {
            free: usersData.data?.stats?.freeUsers || 0,
            premium: usersData.data?.stats?.premiumUsers || 0,
            enterprise: usersData.data?.stats?.enterpriseUsers || 0,
          },
        },
        links: {
          total: linksData.data?.stats?.totalUrls || 0,
          active: linksData.data?.stats?.activeUrls || 0,
          totalClicks: linksData.data?.stats?.totalClicks || 0,
          createdToday: linksData.data?.stats?.urlsToday || 0,
        },
        domains: {
          total: domainsData.data?.stats?.totalDomains || 0,
          verified: domainsData.data?.stats?.verifiedDomains || 0,
          custom: domainsData.data?.stats?.customDomains || 0,
        },
        revenue: {
          mrr: billingData.data?.stats?.totalMRR || 0,
          arr: billingData.data?.stats?.totalARR || 0,
          totalRevenue: billingData.data?.stats?.totalRevenue || 0,
          activeSubscriptions:
            billingData.data?.stats?.activeSubscriptions || 0,
        },
        security: {
          failedLogins: securityData.data?.stats?.failedLoginsToday || 0,
          suspiciousActivities:
            securityData.data?.stats?.suspiciousActivities?.length || 0,
          blockedIps: securityData.data?.stats?.blockedIps || 0,
        },
      });

      // Set real data for activities and top links
      setRecentActivities(activitiesData.data?.activities || []);
      setTopLinks(topLinksData.data?.links || []);

      // Set chart data or use fallback based on current stats
      const currentStats = {
        users: {
          total: usersData.data?.stats?.totalUsers || 0,
          byPlan: {
            free: usersData.data?.stats?.freeUsers || 0,
            premium: usersData.data?.stats?.premiumUsers || 0,
            enterprise: usersData.data?.stats?.enterpriseUsers || 0,
          },
        },
        revenue: {
          mrr: billingData.data?.stats?.totalMRR || 0,
        },
      };

      setChartData({
        revenue:
          chartsData.data?.revenue ||
          generateFallbackRevenueData(currentStats.revenue.mrr),
        userGrowth:
          chartsData.data?.userGrowth ||
          generateFallbackUserGrowthData(currentStats.users.byPlan),
        planDistribution:
          chartsData.data?.planDistribution ||
          generatePlanDistributionData(currentStats.users),
      });
    } catch (error) {
      console.error("Error fetching admin stats:", error);
      setError("Failed to load admin statistics");
      toast.error("Failed to load admin statistics");
    } finally {
      setLoading(false);
    }
  };

  // Fallback data generation functions
  const generateFallbackRevenueData = (currentMRR: number) => {
    const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul"];
    return months.map((month, index) => ({
      month,
      revenue: Math.max(
        0,
        currentMRR * (0.7 + index * 0.05) + (Math.random() * 1000 - 500)
      ),
      users: Math.floor(Math.random() * 100) + 50,
    }));
  };

  const generateFallbackUserGrowthData = (byPlan: any) => {
    const dates = [
      "2024-01",
      "2024-02",
      "2024-03",
      "2024-04",
      "2024-05",
      "2024-06",
    ];
    return dates.map((date, index) => ({
      date,
      free: Math.floor(byPlan.free * (0.6 + index * 0.08)),
      premium: Math.floor(byPlan.premium * (0.6 + index * 0.08)),
      enterprise: Math.floor(byPlan.enterprise * (0.6 + index * 0.08)),
    }));
  };

  const generatePlanDistributionData = (users: any) => {
    const total = users.total || 1;
    return [
      {
        name: "Free",
        value: Math.round((users.byPlan.free / total) * 100),
        color: "#94a3b8",
      },
      {
        name: "Premium",
        value: Math.round((users.byPlan.premium / total) * 100),
        color: "#3b82f6",
      },
      {
        name: "Enterprise",
        value: Math.round((users.byPlan.enterprise / total) * 100),
        color: "#8b5cf6",
      },
    ];
  };

  const getActivityIcon = (type: string) => {
    switch (type) {
      case "user":
        return <Users className="h-4 w-4 text-blue-600" />;
      case "link":
        return <LinkIcon className="h-4 w-4 text-green-600" />;
      case "security":
        return <Shield className="h-4 w-4 text-red-600" />;
      case "revenue":
        return <DollarSign className="h-4 w-4 text-purple-600" />;
      default:
        return <Activity className="h-4 w-4 text-gray-600" />;
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "success":
        return (
          <Badge className="bg-green-100 text-green-700 hover:bg-green-100">
            Success
          </Badge>
        );
      case "warning":
        return (
          <Badge className="bg-yellow-100 text-yellow-700 hover:bg-yellow-100">
            Warning
          </Badge>
        );
      case "error":
        return (
          <Badge className="bg-red-100 text-red-700 hover:bg-red-100">
            Error
          </Badge>
        );
      default:
        return <Badge variant="secondary">Unknown</Badge>;
    }
  };

  const formatRelativeTime = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffInMinutes = Math.floor(
      (now.getTime() - date.getTime()) / (1000 * 60)
    );

    if (diffInMinutes < 1) return "Just now";
    if (diffInMinutes < 60) return `${diffInMinutes} minutes ago`;

    const diffInHours = Math.floor(diffInMinutes / 60);
    if (diffInHours < 24) return `${diffInHours} hours ago`;

    const diffInDays = Math.floor(diffInHours / 24);
    return `${diffInDays} days ago`;
  };

  if (loading) {
    return (
      <div className="flex-1 space-y-4 p-4 md:p-8 pt-6">
        <div className="flex items-center justify-center min-h-96">
          <LoadingSpinner size="lg" />
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex-1 space-y-4 p-4 md:p-8 pt-6">
        <div className="text-center">
          <AlertTriangle className="h-12 w-12 text-red-500 mx-auto mb-4" />
          <h2 className="text-xl font-semibold mb-2">Error Loading Data</h2>
          <p className="text-muted-foreground mb-4">{error}</p>
          <Button onClick={fetchStats}>
            <RefreshCw className="h-4 w-4 mr-2" />
            Try Again
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 space-y-6 p-4 md:p-8 pt-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="space-y-1">
          <h2 className="text-2xl font-bold tracking-tight">Admin Overview</h2>
          <p className="text-muted-foreground">
            System health and key metrics dashboard
          </p>
        </div>
        <div className="flex items-center space-x-2">
          <Button variant="outline" size="sm" onClick={fetchStats}>
            <RefreshCw className="h-4 w-4 mr-2" />
            Refresh
          </Button>
          <Link href="/admin/reports">
            <Button size="sm">
              <BarChart3 className="h-4 w-4 mr-2" />
              View Reports
            </Button>
          </Link>
        </div>
      </div>

      {/* Key Metrics Cards with Gradients */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card className="relative overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-br from-blue-50 to-blue-100 dark:from-blue-950/20 dark:to-blue-900/20"></div>
          <CardHeader className="relative flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Users</CardTitle>
            <Users className="h-4 w-4 text-blue-600" />
          </CardHeader>
          <CardContent className="relative">
            <div className="text-2xl font-bold text-blue-600">
              {formatNumber(stats?.users.total || 0)}
            </div>
            <p className="text-xs text-muted-foreground flex items-center">
              <ArrowUpRight className="h-3 w-3 text-green-600 mr-1" />+
              {stats?.users.newToday || 0} today
            </p>
          </CardContent>
        </Card>

        <Card className="relative overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-br from-green-50 to-green-100 dark:from-green-950/20 dark:to-green-900/20"></div>
          <CardHeader className="relative flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Links</CardTitle>
            <LinkIcon className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent className="relative">
            <div className="text-2xl font-bold text-green-600">
              {formatNumber(stats?.links.total || 0)}
            </div>
            <p className="text-xs text-muted-foreground flex items-center">
              <ArrowUpRight className="h-3 w-3 text-green-600 mr-1" />+
              {stats?.links.createdToday || 0} today
            </p>
          </CardContent>
        </Card>

        <Card className="relative overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-br from-purple-50 to-purple-100 dark:from-purple-950/20 dark:to-purple-900/20"></div>
          <CardHeader className="relative flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Monthly Revenue
            </CardTitle>
            <DollarSign className="h-4 w-4 text-purple-600" />
          </CardHeader>
          <CardContent className="relative">
            <div className="text-2xl font-bold text-purple-600">
              {formatCurrency(stats?.revenue.mrr || 0)}
            </div>
            <p className="text-xs text-muted-foreground flex items-center">
              <ArrowUpRight className="h-3 w-3 text-green-600 mr-1" />
              {formatCurrency(stats?.revenue.arr || 0)} ARR
            </p>
          </CardContent>
        </Card>

        <Card className="relative overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-br from-red-50 to-red-100 dark:from-red-950/20 dark:to-red-900/20"></div>
          <CardHeader className="relative flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Security Alerts
            </CardTitle>
            <Shield className="h-4 w-4 text-red-600" />
          </CardHeader>
          <CardContent className="relative">
            <div className="text-2xl font-bold text-red-600">
              {stats?.security.suspiciousActivities || 0}
            </div>
            <p className="text-xs text-muted-foreground">
              {stats?.security.failedLogins || 0} failed logins today
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Charts Section */}
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {/* Revenue Chart */}
        <Card className="col-span-2">
          <CardHeader>
            <CardTitle>Revenue & User Growth</CardTitle>
            <CardDescription>
              Monthly revenue and user acquisition trends
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <AreaChart data={chartData.revenue}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="month" />
                <YAxis />
                <Tooltip
                  formatter={(value, name) => [
                    name === "revenue"
                      ? formatCurrency(value as number)
                      : formatNumber(value as number),
                    name === "revenue" ? "Revenue" : "New Users",
                  ]}
                />
                <Area
                  type="monotone"
                  dataKey="revenue"
                  stackId="1"
                  stroke="#8884d8"
                  fill="#8884d8"
                  fillOpacity={0.6}
                />
                <Area
                  type="monotone"
                  dataKey="users"
                  stackId="2"
                  stroke="#82ca9d"
                  fill="#82ca9d"
                  fillOpacity={0.6}
                />
              </AreaChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Plan Distribution */}
        <Card>
          <CardHeader>
            <CardTitle>Plan Distribution</CardTitle>
            <CardDescription>
              User breakdown by subscription plan
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={chartData.planDistribution}
                  cx="50%"
                  cy="50%"
                  outerRadius={80}
                  fill="#8884d8"
                  dataKey="value"
                  label={({ name, value }) => `${name}: ${value}%`}
                >
                  {chartData.planDistribution.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip formatter={(value) => [`${value}%`, "Percentage"]} />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* User Growth Chart */}
      <Card>
        <CardHeader>
          <CardTitle>User Growth by Plan</CardTitle>
          <CardDescription>
            Monthly user growth segmented by subscription plans
          </CardDescription>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={chartData.userGrowth}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="date" />
              <YAxis />
              <Tooltip
                formatter={(value) => [formatNumber(value as number), "Users"]}
              />
              <Bar dataKey="free" stackId="a" fill="#94a3b8" name="Free" />
              <Bar
                dataKey="premium"
                stackId="a"
                fill="#3b82f6"
                name="Premium"
              />
              <Bar
                dataKey="enterprise"
                stackId="a"
                fill="#8b5cf6"
                name="Enterprise"
              />
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      {/* Tables Section */}
      <div className="grid gap-6 md:grid-cols-2">
        {/* Recent Activities */}
        <Card>
          <CardHeader>
            <CardTitle>Recent Activities</CardTitle>
            <CardDescription>
              Latest system activities and user actions
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Activity</TableHead>
                  <TableHead>Time</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {recentActivities.length > 0 ? (
                  recentActivities.map((activity) => (
                    <TableRow key={activity._id}>
                      <TableCell>
                        <div className="flex items-center space-x-2">
                          {getActivityIcon(activity.type)}
                          <div>
                            <div className="font-medium text-sm">
                              {activity.action}
                            </div>
                            <div className="text-xs text-muted-foreground">
                              {activity.userId?.email || "System"}
                            </div>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {formatRelativeTime(activity.createdAt)}
                      </TableCell>
                      <TableCell>{getStatusBadge(activity.status)}</TableCell>
                    </TableRow>
                  ))
                ) : (
                  <TableRow>
                    <TableCell
                      colSpan={3}
                      className="text-center text-muted-foreground py-8"
                    >
                      No recent activities found
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        {/* Top Performing Links */}
        <Card>
          <CardHeader>
            <CardTitle>Top Performing Links</CardTitle>
            <CardDescription>
              Most clicked short links this month
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Short Code</TableHead>
                  <TableHead>Clicks</TableHead>
                  <TableHead>User</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {topLinks.length > 0 ? (
                  topLinks.map((link, index) => (
                    <TableRow key={link._id}>
                      <TableCell>
                        <div className="flex items-center space-x-2">
                          <div className="flex items-center justify-center w-6 h-6 bg-blue-100 text-blue-600 rounded text-xs font-medium">
                            {index + 1}
                          </div>
                          <div>
                            <div className="font-medium text-sm">
                              {link.shortCode}
                            </div>
                            <div className="text-xs text-muted-foreground truncate max-w-[120px]">
                              {link.originalUrl}
                            </div>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center space-x-1">
                          <MousePointer className="h-3 w-3 text-green-600" />
                          <span className="font-medium">
                            {formatNumber(link.clicks?.total || 0)}
                          </span>
                        </div>
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {link.userId?.email || "Unknown"}
                      </TableCell>
                    </TableRow>
                  ))
                ) : (
                  <TableRow>
                    <TableCell
                      colSpan={3}
                      className="text-center text-muted-foreground py-8"
                    >
                      No top links found
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>

      {/* Quick Actions - Simplified */}
      <Card>
        <CardHeader>
          <CardTitle>Quick Actions</CardTitle>
          <CardDescription>Common administrative tasks</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-4">
            <Link href="/admin/users">
              <Button variant="outline" className="w-full justify-start">
                <Users className="h-4 w-4 mr-2" />
                Manage Users
              </Button>
            </Link>
            <Link href="/admin/links">
              <Button variant="outline" className="w-full justify-start">
                <LinkIcon className="h-4 w-4 mr-2" />
                Manage Links
              </Button>
            </Link>
            <Link href="/admin/security">
              <Button variant="outline" className="w-full justify-start">
                <Shield className="h-4 w-4 mr-2" />
                Security Center
              </Button>
            </Link>
            <Link href="/admin/billing">
              <Button variant="outline" className="w-full justify-start">
                <CreditCard className="h-4 w-4 mr-2" />
                Billing Overview
              </Button>
            </Link>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
