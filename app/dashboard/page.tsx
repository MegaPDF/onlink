// ============= app/dashboard/page.tsx =============
"use client";

import React, { useState, useEffect } from "react";
import { useAuth } from "@/hooks/use-auth";
import { useToast } from "@/hooks/use-toast";
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
import { LinksTable } from "@/components/dashboard/links-table";
import { AnalyticsDashboard } from "@/components/dashboard/analytics-dashboard";
import {
  LinkIcon,
  MousePointer,
  TrendingUp,
  Calendar,
  Crown,
  Plus,
  BarChart3,
  Folder,
  Globe,
  ArrowUpRight,
  Activity,
  Users,
  Clock,
} from "lucide-react";
import { formatNumber, formatRelativeTime } from "@/lib/utils";
import Link from "next/link";
import { toast } from "sonner";

interface DashboardStats {
  totalUrls: number;
  totalClicks: number;
  activeUrls: number;
  urlsThisMonth: number;
  clicksThisMonth: number;
  averageClicksPerUrl: number;
}

interface RecentActivity {
  _id: string;
  type: "link_created" | "link_clicked" | "link_updated";
  description: string;
  timestamp: Date;
  metadata?: any;
}

interface QuickAction {
  title: string;
  description: string;
  icon: React.ComponentType<{ className?: string }>;
  href: string;
  color: string;
  premiumOnly?: boolean;
}

export default function DashboardPage() {
  const { user } = useAuth();

  const [isLoading, setIsLoading] = useState(true);
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [recentUrls, setRecentUrls] = useState([]);
  const [recentActivity, setRecentActivity] = useState<RecentActivity[]>([]);
  const [folders, setFolders] = useState([]);
  const [refreshKey, setRefreshKey] = useState(0);

  const quickActions: QuickAction[] = [
    {
      title: "Create Short Link",
      description: "Quickly shorten a new URL",
      icon: LinkIcon,
      href: "#shorten",
      color: "bg-blue-500",
    },
    {
      title: "View Analytics",
      description: "Track your link performance",
      icon: BarChart3,
      href: "/dashboard/analytics",
      color: "bg-green-500",
      premiumOnly: true,
    },
    {
      title: "Manage Folders",
      description: "Organize your links",
      icon: Folder,
      href: "/dashboard/folders",
      color: "bg-purple-500",
    },
    {
      title: "Custom Domains",
      description: "Brand your links",
      icon: Globe,
      href: "/dashboard/domains",
      color: "bg-orange-500",
      premiumOnly: true,
    },
  ];

  useEffect(() => {
    fetchDashboardData();
  }, [refreshKey]);

  const fetchDashboardData = async () => {
    try {
      setIsLoading(true);

      // Fetch dashboard stats and recent data
      const [statsResponse, recentUrlsResponse, foldersResponse] =
        await Promise.all([
          fetch("/api/client/dashboard/stats"),
          fetch("/api/client/my-links?limit=5&sortBy=createdAt&sortOrder=desc"),
          fetch("/api/client/folders"),
        ]);

      if (statsResponse.ok) {
        const statsData = await statsResponse.json();
        setStats(statsData.data);
      }

      if (recentUrlsResponse.ok) {
        const urlsData = await recentUrlsResponse.json();
        setRecentUrls(urlsData.data.urls || []);
      }

      if (foldersResponse.ok) {
        const foldersData = await foldersResponse.json();
        setFolders(foldersData.data || []);
      }

      // Fetch recent activity if available
      try {
        const activityResponse = await fetch("/api/client/dashboard/activity");
        if (activityResponse.ok) {
          const activityData = await activityResponse.json();
          setRecentActivity(activityData.data || []);
        }
      } catch (error) {
        // Activity endpoint might not be implemented yet
        console.log("Activity data not available");
      }
    } catch (error) {
      console.error("Failed to fetch dashboard data:", error);
      toast.error("Failed to load dashboard data");
    } finally {
      setIsLoading(false);
    }
  };

  const handleUrlCreated = () => {
    setRefreshKey((prev) => prev + 1);
    toast.success("URL shortened successfully!");
  };

  const scrollToShorten = () => {
    document
      .getElementById("url-shortener")
      ?.scrollIntoView({ behavior: "smooth" });
  };

  const isPremium = user?.plan !== "free";

  if (isLoading) {
    return (
      <div className="container mx-auto py-6 px-4">
        <div className="space-y-6">
          <div className="h-8 bg-gray-200 rounded animate-pulse"></div>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            {Array.from({ length: 4 }).map((_, i) => (
              <div
                key={i}
                className="h-32 bg-gray-200 rounded animate-pulse"
              ></div>
            ))}
          </div>
          <div className="h-64 bg-gray-200 rounded animate-pulse"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-6 px-4 space-y-6">
      {/* Welcome Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold">
            Welcome back, {user?.name?.split(" ")[0] || "User"}!
          </h1>
          <p className="text-muted-foreground">
            Here's what's happening with your links today.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Badge
            variant={isPremium ? "default" : "secondary"}
            className="capitalize"
          >
            {user?.plan} Plan
          </Badge>
          {!isPremium && (
            <Button asChild size="sm">
              <Link href="/dashboard/billing">
                <Crown className="w-4 h-4 mr-2" />
                Upgrade
              </Link>
            </Button>
          )}
        </div>
      </div>

      {/* Stats Cards */}
      {stats && (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Links</CardTitle>
              <LinkIcon className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {formatNumber(stats.totalUrls)}
              </div>
              <p className="text-xs text-muted-foreground">
                {stats.urlsThisMonth} created this month
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                Total Clicks
              </CardTitle>
              <MousePointer className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {formatNumber(stats.totalClicks)}
              </div>
              <p className="text-xs text-muted-foreground">
                {stats.clicksThisMonth || 0} clicks this month
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                Active Links
              </CardTitle>
              <Activity className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {formatNumber(stats.activeUrls)}
              </div>
              <p className="text-xs text-muted-foreground">
                {Math.round((stats.activeUrls / stats.totalUrls) * 100) || 0}%
                of total
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Avg. Clicks</CardTitle>
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {formatNumber(stats.averageClicksPerUrl || 0)}
              </div>
              <p className="text-xs text-muted-foreground">per link</p>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Quick Actions */}
      <Card>
        <CardHeader>
          <CardTitle>Quick Actions</CardTitle>
          <CardDescription>
            Common tasks to help you get started
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {quickActions.map((action) => {
              const Icon = action.icon;
              const isDisabled = action.premiumOnly && !isPremium;

              return (
                <Button
                  key={action.title}
                  variant="outline"
                  className="h-auto p-4 flex-col items-start text-left relative"
                  disabled={isDisabled}
                  onClick={
                    action.href === "#shorten" ? scrollToShorten : undefined
                  }
                  asChild={action.href !== "#shorten"}
                >
                  {action.href !== "#shorten" ? (
                    <Link href={isDisabled ? "#" : action.href}>
                      <div
                        className={`w-8 h-8 rounded-lg ${action.color} flex items-center justify-center mb-2`}
                      >
                        <Icon className="w-4 h-4 text-white" />
                      </div>
                      <div className="space-y-1">
                        <p className="font-medium">{action.title}</p>
                        <p className="text-xs text-muted-foreground">
                          {action.description}
                        </p>
                      </div>
                      {action.premiumOnly && !isPremium && (
                        <Crown className="absolute top-2 right-2 w-4 h-4 text-yellow-500" />
                      )}
                    </Link>
                  ) : (
                    <>
                      <div
                        className={`w-8 h-8 rounded-lg ${action.color} flex items-center justify-center mb-2`}
                      >
                        <Icon className="w-4 h-4 text-white" />
                      </div>
                      <div className="space-y-1">
                        <p className="font-medium">{action.title}</p>
                        <p className="text-xs text-muted-foreground">
                          {action.description}
                        </p>
                      </div>
                    </>
                  )}
                </Button>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* Main Content Tabs */}
      <Tabs defaultValue="shorten" className="space-y-4">
        <TabsList>
          <TabsTrigger value="shorten">Create Link</TabsTrigger>
          <TabsTrigger value="recent">Recent Links</TabsTrigger>
          {isPremium && <TabsTrigger value="analytics">Analytics</TabsTrigger>}
          <TabsTrigger value="activity">Activity</TabsTrigger>
        </TabsList>

        <TabsContent value="shorten" className="space-y-4">
          <Card id="url-shortener">
            <CardHeader>
              <CardTitle>Create New Short Link</CardTitle>
              <CardDescription>
                Shorten a URL and customize it with advanced options
              </CardDescription>
            </CardHeader>
            <CardContent>
              <UrlShortener folders={folders} onSuccess={handleUrlCreated} />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="recent" className="space-y-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle>Recent Links</CardTitle>
                <CardDescription>
                  Your most recently created links
                </CardDescription>
              </div>
              <Button asChild variant="outline" size="sm">
                <Link href="/dashboard/links">
                  View All
                  <ArrowUpRight className="w-4 h-4 ml-2" />
                </Link>
              </Button>
            </CardHeader>
            <CardContent>
              {recentUrls.length > 0 ? (
                <LinksTable
                  data={recentUrls}
                  compact={true}
                  showPagination={false}
                />
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  <LinkIcon className="w-12 h-12 mx-auto mb-4 opacity-50" />
                  <p>No links created yet</p>
                  <p className="text-sm">Create your first short link above</p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {isPremium && (
          <TabsContent value="analytics" className="space-y-4">
            <AnalyticsDashboard showUrlSelector={false} />
          </TabsContent>
        )}

        <TabsContent value="activity" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Recent Activity</CardTitle>
              <CardDescription>
                Track your recent actions and link activity
              </CardDescription>
            </CardHeader>
            <CardContent>
              {recentActivity.length > 0 ? (
                <div className="space-y-4">
                  {recentActivity.map((activity) => (
                    <div
                      key={activity._id}
                      className="flex items-center gap-4 p-3 border rounded-lg"
                    >
                      <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                        <Clock className="w-4 h-4 text-blue-600" />
                      </div>
                      <div className="flex-1">
                        <p className="text-sm">{activity.description}</p>
                        <p className="text-xs text-muted-foreground">
                          {formatRelativeTime(activity.timestamp)}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  <Activity className="w-12 h-12 mx-auto mb-4 opacity-50" />
                  <p>No recent activity</p>
                  <p className="text-sm">
                    Activity will appear here as you use the platform
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
