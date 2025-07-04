"use client";

import React, { useState, useEffect } from "react";
import { useAuth } from "@/hooks/use-auth";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { UrlShortener } from "@/components/dashboard/url-shortener";
import { AnalyticsDashboard } from "@/components/dashboard/analytics-dashboard";
import { LinksTable } from "@/components/dashboard/links-table";
//import { QuickActions } from "@/components/dashboard/quick-actions";
import {
  BarChart3,
  LinkIcon,
  MousePointer,
  TrendingUp,
  Users,
  Globe,
  Calendar,
  Zap,
  Crown,
  Plus,
} from "lucide-react";
import { formatNumber } from "@/lib/utils";
import Link from "next/link";

interface DashboardStats {
  totalLinks: number;
  totalClicks: number;
  clicksToday: number;
  linksTodayCount: number;
  topLink?: {
    shortCode: string;
    originalUrl: string;
    clicks: number;
  };
  recentActivity: Array<{
    id: string;
    type: "link_created" | "link_clicked" | "folder_created";
    description: string;
    timestamp: string;
  }>;
}

export default function DashboardPage() {
  const { user, isAuthenticated } = useAuth();
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [recentLinks, setRecentLinks] = useState([]);

  useEffect(() => {
    if (isAuthenticated) {
      fetchDashboardData();
    }
  }, [isAuthenticated]);

  const fetchDashboardData = async () => {
    try {
      const [statsRes, linksRes] = await Promise.all([
        fetch("/api/client/dashboard/stats"),
        fetch("/api/client/links?limit=5&sort=recent"),
      ]);

      if (statsRes.ok) {
        const statsData = await statsRes.json();
        setStats(statsData.data);
      }

      if (linksRes.ok) {
        const linksData = await linksRes.json();
        setRecentLinks(linksData.data.links);
      }
    } catch (error) {
      console.error("Failed to fetch dashboard data:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleUrlShortened = () => {
    fetchDashboardData();
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
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

  const statCards = [
    {
      title: "Total Links",
      value: formatNumber(stats?.totalLinks || 0),
      icon: LinkIcon,
      color: "text-blue-600",
      bgColor: "bg-blue-50 dark:bg-blue-950",
      change: `+${stats?.linksTodayCount || 0} today`,
    },
    {
      title: "Total Clicks",
      value: formatNumber(stats?.totalClicks || 0),
      icon: MousePointer,
      color: "text-green-600",
      bgColor: "bg-green-50 dark:bg-green-950",
      change: `+${formatNumber(stats?.clicksToday || 0)} today`,
    },
    {
      title: "Analytics",
      value: "View Details",
      icon: BarChart3,
      color: "text-purple-600",
      bgColor: "bg-purple-50 dark:bg-purple-950",
      change: "Real-time data",
      href: "/dashboard/analytics",
    },
    {
      title: user?.plan === "free" ? "Upgrade Plan" : "Premium Active",
      value: user?.plan === "free" ? "Free Plan" : "Premium",
      icon: user?.plan === "free" ? Crown : Zap,
      color: user?.plan === "free" ? "text-orange-600" : "text-green-600",
      bgColor:
        user?.plan === "free"
          ? "bg-orange-50 dark:bg-orange-950"
          : "bg-green-50 dark:bg-green-950",
      change: user?.plan === "free" ? "Upgrade now" : "All features",
      href: user?.plan === "free" ? "/dashboard/billing" : undefined,
    },
  ];

  return (
    <div className="space-y-6">
      {/* Welcome Section */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">
            Welcome back, {user?.name || "User"}!
          </h1>
          <p className="text-muted-foreground">
            Here's what's happening with your links today.
          </p>
        </div>
        <Button asChild>
          <Link href="/dashboard/links?new=true">
            <Plus className="mr-2 h-4 w-4" />
            Create Link
          </Link>
        </Button>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {statCards.map((stat, index) => (
          <Card key={index} className="hover:shadow-md transition-shadow">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">
                    {stat.title}
                  </p>
                  <div className="flex items-center gap-2">
                    <p className="text-2xl font-bold">{stat.value}</p>
                    {stat.href && (
                      <Button variant="ghost" size="sm" asChild>
                        <Link href={stat.href}>
                          <TrendingUp className="h-4 w-4" />
                        </Link>
                      </Button>
                    )}
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">
                    {stat.change}
                  </p>
                </div>
                <div className={`p-3 rounded-full ${stat.bgColor}`}>
                  <stat.icon className={`h-6 w-6 ${stat.color}`} />
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Main Content */}
      <div className="grid gap-6 lg:grid-cols-3">
        {/* URL Shortener */}
        <div className="lg:col-span-2">
          <UrlShortener onSuccess={handleUrlShortened} />
        </div>

        {/* Quick Actions */}
        <div>
          <QuickActions />
        </div>
      </div>

      {/* Recent Activity */}
      <Tabs defaultValue="links" className="space-y-4">
        <TabsList>
          <TabsTrigger value="links">Recent Links</TabsTrigger>
          <TabsTrigger value="analytics">Quick Analytics</TabsTrigger>
          <TabsTrigger value="activity">Activity Feed</TabsTrigger>
        </TabsList>

        <TabsContent value="links" className="space-y-4">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>Recent Links</CardTitle>
                <Button variant="outline" size="sm" asChild>
                  <Link href="/dashboard/links">View All</Link>
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <LinksTable showFolderFilter={false} limit={5} />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="analytics" className="space-y-4">
          <AnalyticsDashboard />
        </TabsContent>

        <TabsContent value="activity" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Recent Activity</CardTitle>
              <CardDescription>
                Your latest actions and link performance
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {stats?.recentActivity?.map((activity, index) => (
                  <div
                    key={activity.id}
                    className="flex items-center gap-3 p-3 rounded-lg bg-muted/50"
                  >
                    <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
                      {activity.type === "link_created" && (
                        <LinkIcon className="w-4 h-4" />
                      )}
                      {activity.type === "link_clicked" && (
                        <MousePointer className="w-4 h-4" />
                      )}
                      {activity.type === "folder_created" && (
                        <Globe className="w-4 h-4" />
                      )}
                    </div>
                    <div className="flex-1">
                      <p className="text-sm font-medium">
                        {activity.description}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {activity.timestamp}
                      </p>
                    </div>
                  </div>
                )) || (
                  <div className="text-center py-8 text-muted-foreground">
                    <Calendar className="mx-auto h-12 w-12 mb-4 opacity-50" />
                    <p>No recent activity</p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
