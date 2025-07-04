"use client";

import React, { useState, useEffect } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Users,
  LinkIcon,
  Globe,
  Server,
  TrendingUp,
  AlertTriangle,
  Shield,
  Activity,
  Database,
  Settings,
  BarChart3,
  Clock,
  DollarSign,
  Eye,
  UserCheck,
  FileText,
  Zap,
} from "lucide-react";
import { formatNumber } from "@/lib/utils";
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
} from "recharts";

interface AdminStats {
  users: {
    total: number;
    active: number;
    new: number;
    premium: number;
    team: number;
  };
  links: {
    total: number;
    active: number;
    clicks: number;
    clicksToday: number;
  };
  revenue: {
    mrr: number;
    arr: number;
    growth: number;
  };
  system: {
    uptime: number;
    responseTime: number;
    errorRate: number;
    storage: number;
  };
  recentActivity: Array<{
    id: string;
    type: "user_signup" | "link_created" | "subscription" | "system";
    description: string;
    timestamp: string;
    severity: "low" | "medium" | "high";
  }>;
  charts: {
    userGrowth: Array<{ date: string; users: number }>;
    revenue: Array<{ date: string; revenue: number }>;
    linkActivity: Array<{ date: string; links: number; clicks: number }>;
    planDistribution: Array<{ name: string; value: number; color: string }>;
  };
}

export default function AdminDashboard() {
  const [stats, setStats] = useState<AdminStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [timeRange, setTimeRange] = useState("30d");

  useEffect(() => {
    fetchAdminStats();
  }, [timeRange]);

  const fetchAdminStats = async () => {
    try {
      const response = await fetch(`/api/admin/stats?timeRange=${timeRange}`);
      if (response.ok) {
        const data = await response.json();
        setStats(data.data);
      }
    } catch (error) {
      console.error("Failed to fetch admin stats:", error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {Array.from({ length: 8 }).map((_, i) => (
            <Card key={i}>
              <CardContent className="p-6">
                <div className="h-16 bg-muted animate-pulse rounded" />
              </CardContent>
            </Card>
          ))}
        </div>
        <div className="h-96 bg-muted animate-pulse rounded-lg" />
      </div>
    );
  }

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case "high":
        return "text-red-600";
      case "medium":
        return "text-orange-600";
      default:
        return "text-green-600";
    }
  };

  const getActivityIcon = (type: string) => {
    switch (type) {
      case "user_signup":
        return Users;
      case "link_created":
        return LinkIcon;
      case "subscription":
        return DollarSign;
      case "system":
        return Server;
      default:
        return Activity;
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Admin Dashboard</h1>
          <p className="text-muted-foreground">System overview and analytics</p>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setTimeRange("7d")}
          >
            7 Days
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setTimeRange("30d")}
          >
            30 Days
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setTimeRange("90d")}
          >
            90 Days
          </Button>
        </div>
      </div>

      {/* Key Metrics */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">
                  Total Users
                </p>
                <p className="text-2xl font-bold">
                  {formatNumber(stats?.users.total || 0)}
                </p>
                <p className="text-xs text-green-600">
                  +{stats?.users.new || 0} new
                </p>
              </div>
              <div className="p-3 rounded-full bg-blue-50 dark:bg-blue-950">
                <Users className="h-6 w-6 text-blue-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">
                  Total Links
                </p>
                <p className="text-2xl font-bold">
                  {formatNumber(stats?.links.total || 0)}
                </p>
                <p className="text-xs text-green-600">
                  {formatNumber(stats?.links.clicksToday || 0)} clicks today
                </p>
              </div>
              <div className="p-3 rounded-full bg-green-50 dark:bg-green-950">
                <LinkIcon className="h-6 w-6 text-green-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">
                  Monthly Revenue
                </p>
                <p className="text-2xl font-bold">
                  ${formatNumber(stats?.revenue.mrr || 0)}
                </p>
                <p className="text-xs text-green-600">
                  +{stats?.revenue.growth || 0}% growth
                </p>
              </div>
              <div className="p-3 rounded-full bg-purple-50 dark:bg-purple-950">
                <DollarSign className="h-6 w-6 text-purple-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">
                  System Health
                </p>
                <p className="text-2xl font-bold">
                  {stats?.system.uptime || 99.9}%
                </p>
                <p className="text-xs text-green-600">
                  {stats?.system.responseTime || 45}ms avg
                </p>
              </div>
              <div className="p-3 rounded-full bg-orange-50 dark:bg-orange-950">
                <Server className="h-6 w-6 text-orange-600" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Detailed Stats */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader>
            <CardTitle className="text-sm">User Breakdown</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <div className="flex justify-between">
              <span className="text-sm">Active Users</span>
              <span className="text-sm font-medium">
                {formatNumber(stats?.users.active || 0)}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-sm">Premium Users</span>
              <span className="text-sm font-medium">
                {formatNumber(stats?.users.premium || 0)}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-sm">Team Users</span>
              <span className="text-sm font-medium">
                {formatNumber(stats?.users.team || 0)}
              </span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-sm">Link Analytics</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <div className="flex justify-between">
              <span className="text-sm">Active Links</span>
              <span className="text-sm font-medium">
                {formatNumber(stats?.links.active || 0)}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-sm">Total Clicks</span>
              <span className="text-sm font-medium">
                {formatNumber(stats?.links.clicks || 0)}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-sm">Avg. CTR</span>
              <span className="text-sm font-medium">
                {stats?.links.total
                  ? ((stats.links.clicks / stats.links.total) * 100).toFixed(1)
                  : 0}
                %
              </span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-sm">Revenue Metrics</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <div className="flex justify-between">
              <span className="text-sm">MRR</span>
              <span className="text-sm font-medium">
                ${formatNumber(stats?.revenue.mrr || 0)}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-sm">ARR</span>
              <span className="text-sm font-medium">
                ${formatNumber(stats?.revenue.arr || 0)}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-sm">Growth Rate</span>
              <span className="text-sm font-medium text-green-600">
                +{stats?.revenue.growth || 0}%
              </span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-sm">System Status</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <div className="flex justify-between">
              <span className="text-sm">Uptime</span>
              <span className="text-sm font-medium text-green-600">
                {stats?.system.uptime || 99.9}%
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-sm">Response Time</span>
              <span className="text-sm font-medium">
                {stats?.system.responseTime || 45}ms
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-sm">Error Rate</span>
              <span className="text-sm font-medium">
                {stats?.system.errorRate || 0.1}%
              </span>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Charts and Analytics */}
      <Tabs defaultValue="users" className="space-y-4">
        <TabsList>
          <TabsTrigger value="users">User Growth</TabsTrigger>
          <TabsTrigger value="revenue">Revenue</TabsTrigger>
          <TabsTrigger value="activity">Link Activity</TabsTrigger>
          <TabsTrigger value="plans">Plan Distribution</TabsTrigger>
        </TabsList>

        <TabsContent value="users">
          <Card>
            <CardHeader>
              <CardTitle>User Growth Over Time</CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <LineChart data={stats?.charts.userGrowth}>
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
                </LineChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="revenue">
          <Card>
            <CardHeader>
              <CardTitle>Revenue Growth</CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={stats?.charts.revenue}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="date" />
                  <YAxis />
                  <Tooltip />
                  <Bar dataKey="revenue" fill="#10B981" />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="activity">
          <Card>
            <CardHeader>
              <CardTitle>Link Activity</CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <LineChart data={stats?.charts.linkActivity}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="date" />
                  <YAxis />
                  <Tooltip />
                  <Line
                    type="monotone"
                    dataKey="links"
                    stroke="#8B5CF6"
                    strokeWidth={2}
                  />
                  <Line
                    type="monotone"
                    dataKey="clicks"
                    stroke="#F59E0B"
                    strokeWidth={2}
                  />
                </LineChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="plans">
          <Card>
            <CardHeader>
              <CardTitle>Plan Distribution</CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <PieChart>
                  <Pie
                    data={stats?.charts.planDistribution}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={({ name, value }) => `${name}: ${value}`}
                    outerRadius={80}
                    fill="#8884d8"
                    dataKey="value"
                  >
                    {stats?.charts.planDistribution?.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Quick Actions and Recent Activity */}
      <div className="grid gap-6 lg:grid-cols-3">
        {/* Quick Actions */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Zap className="h-5 w-5" />
              Quick Actions
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <Button variant="outline" className="w-full justify-start" asChild>
              <Link href="/admin/users">
                <Users className="mr-2 h-4 w-4" />
                Manage Users
              </Link>
            </Button>
            <Button variant="outline" className="w-full justify-start" asChild>
              <Link href="/admin/links">
                <LinkIcon className="mr-2 h-4 w-4" />
                View All Links
              </Link>
            </Button>
            <Button variant="outline" className="w-full justify-start" asChild>
              <Link href="/admin/settings">
                <Settings className="mr-2 h-4 w-4" />
                System Settings
              </Link>
            </Button>
            <Button variant="outline" className="w-full justify-start" asChild>
              <Link href="/admin/reports">
                <FileText className="mr-2 h-4 w-4" />
                Generate Reports
              </Link>
            </Button>
          </CardContent>
        </Card>

        {/* Recent Activity */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Activity className="h-5 w-5" />
              Recent Activity
            </CardTitle>
            <CardDescription>
              Latest system events and user actions
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4 max-h-64 overflow-y-auto">
              {stats?.recentActivity?.map((activity) => {
                const Icon = getActivityIcon(activity.type);
                return (
                  <div
                    key={activity.id}
                    className="flex items-center gap-3 p-2 rounded-lg hover:bg-muted/50"
                  >
                    <div className="w-8 h-8 rounded-full bg-muted flex items-center justify-center">
                      <Icon className="w-4 h-4" />
                    </div>
                    <div className="flex-1">
                      <p className="text-sm font-medium">
                        {activity.description}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {activity.timestamp}
                      </p>
                    </div>
                    <Badge
                      variant="outline"
                      className={getSeverityColor(activity.severity)}
                    >
                      {activity.severity}
                    </Badge>
                  </div>
                );
              }) || (
                <div className="text-center py-8 text-muted-foreground">
                  <Clock className="mx-auto h-12 w-12 mb-4 opacity-50" />
                  <p>No recent activity</p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
