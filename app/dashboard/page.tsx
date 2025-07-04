"use client";

import React, { useState, useEffect } from "react";
import { useAuth } from "@/hooks/use-auth";
import { useToast } from "@/hooks/use-toast";
import { UrlShortener } from "@/components/dashboard/url-shortener";
import { LinksTable } from "@/components/dashboard/links-table";
import { AnalyticsDashboard } from "@/components/dashboard/analytics-dashboard";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { LoadingSpinner } from "@/components/ui/loading-spinner";
import {
  Link as LinkIcon,
  MousePointer,
  Users,
  Globe,
  TrendingUp,
  Calendar,
  Crown,
  Plus,
  BarChart3,
  Folder,
  Zap,
  Target,
  Eye,
} from "lucide-react";
import { formatNumber } from "@/lib/utils";
import Link from "next/link";

interface DashboardStats {
  totalUrls: number;
  activeUrls: number;
  totalClicks: number;
  uniqueClicks: number;
  averageClicksPerUrl: number;
  urlsThisMonth: number;
  clicksThisMonth: number;
}

export default function DashboardPage() {
  const { user } = useAuth();
  const toast = useToast();
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchDashboardStats();
  }, []);

  const fetchDashboardStats = async () => {
    try {
      setLoading(true);
      const response = await fetch("/api/client/dashboard/stats");
      const result = await response.json();

      if (response.ok) {
        setStats(result.data);
      } else {
        toast.error("Failed to load dashboard stats");
      }
    } catch (error) {
      console.error("Failed to fetch dashboard stats:", error);
      toast.error("Failed to load dashboard stats");
    } finally {
      setLoading(false);
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
    <div className="container mx-auto py-6 px-4 space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">
            Welcome back, {user?.name || "User"}! 👋
          </h1>
          <p className="text-muted-foreground">
            Here's your link performance overview
          </p>
        </div>
        <div className="flex gap-2">
          <Link href="/dashboard/analytics">
            <Button variant="outline">
              <BarChart3 className="h-4 w-4 mr-2" />
              Analytics
            </Button>
          </Link>
          <Link href="/dashboard/links">
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              Create Link
            </Button>
          </Link>
        </div>
      </div>

      {/* Quick URL Shortener */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Zap className="h-5 w-5" />
            Quick Link Shortener
          </CardTitle>
          <CardDescription>Create a shortened link instantly</CardDescription>
        </CardHeader>
        <CardContent>
          <UrlShortener onSuccess={fetchDashboardStats} />
        </CardContent>
      </Card>

      {/* Stats Overview */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Links</CardTitle>
            <LinkIcon className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {formatNumber(stats?.totalUrls || 0)}
            </div>
            <p className="text-xs text-muted-foreground">
              {formatNumber(stats?.activeUrls || 0)} active
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Clicks</CardTitle>
            <MousePointer className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {formatNumber(stats?.totalClicks || 0)}
            </div>
            <p className="text-xs text-muted-foreground">
              {formatNumber(stats?.uniqueClicks || 0)} unique
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">This Month</CardTitle>
            <Calendar className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {formatNumber(stats?.urlsThisMonth || 0)}
            </div>
            <p className="text-xs text-muted-foreground">
              {formatNumber(stats?.clicksThisMonth || 0)} clicks
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
              {formatNumber(stats?.averageClicksPerUrl || 0)}
            </div>
            <p className="text-xs text-muted-foreground">per link</p>
          </CardContent>
        </Card>
      </div>

      {/* Usage Progress for Free Users */}
      {user?.plan === "free" && (
        <Card className="border-orange-200 bg-orange-50/50">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Target className="h-5 w-5 text-orange-600" />
              Monthly Usage
            </CardTitle>
            <CardDescription>
              Track your monthly limits and upgrade when ready
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span>Links Created</span>
                <span>{user?.usage?.monthlyLinks || 0} / 5</span>
              </div>
              <Progress
                value={((user?.usage?.monthlyLinks || 0) / 5) * 100}
                className="h-2"
              />
            </div>

            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span>Clicks Received</span>
                <span>{user?.usage?.monthlyClicks || 0} / 1,000</span>
              </div>
              <Progress
                value={((user?.usage?.monthlyClicks || 0) / 1000) * 100}
                className="h-2"
              />
            </div>

            <div className="pt-2 border-t">
              <Link href="/dashboard/billing">
                <Button className="w-full">
                  <Crown className="h-4 w-4 mr-2" />
                  Upgrade to Premium
                </Button>
              </Link>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Quick Actions */}
      <Card>
        <CardHeader>
          <CardTitle>Quick Actions</CardTitle>
          <CardDescription>Common tasks and features</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <Link href="/dashboard/links" className="block">
              <div className="p-4 border rounded-lg hover:bg-muted/50 transition-colors text-center">
                <LinkIcon className="h-8 w-8 mx-auto mb-2 text-primary" />
                <h4 className="font-medium">My Links</h4>
                <p className="text-sm text-muted-foreground">Manage URLs</p>
              </div>
            </Link>

            <Link href="/dashboard/folders" className="block">
              <div className="p-4 border rounded-lg hover:bg-muted/50 transition-colors text-center">
                <Folder className="h-8 w-8 mx-auto mb-2 text-primary" />
                <h4 className="font-medium">Folders</h4>
                <p className="text-sm text-muted-foreground">Organize links</p>
              </div>
            </Link>

            {user?.plan !== "free" ? (
              <>
                <Link href="/dashboard/analytics" className="block">
                  <div className="p-4 border rounded-lg hover:bg-muted/50 transition-colors text-center">
                    <BarChart3 className="h-8 w-8 mx-auto mb-2 text-primary" />
                    <h4 className="font-medium">Analytics</h4>
                    <p className="text-sm text-muted-foreground">
                      View insights
                    </p>
                  </div>
                </Link>

                <Link href="/dashboard/bulk" className="block">
                  <div className="p-4 border rounded-lg hover:bg-muted/50 transition-colors text-center">
                    <Plus className="h-8 w-8 mx-auto mb-2 text-primary" />
                    <h4 className="font-medium">Bulk Import</h4>
                    <p className="text-sm text-muted-foreground">
                      Multiple URLs
                    </p>
                  </div>
                </Link>
              </>
            ) : (
              <>
                <div className="p-4 border rounded-lg bg-muted/30 text-center relative">
                  <BarChart3 className="h-8 w-8 mx-auto mb-2 text-muted-foreground" />
                  <h4 className="font-medium text-muted-foreground">
                    Analytics
                  </h4>
                  <p className="text-sm text-muted-foreground">
                    Premium feature
                  </p>
                  <Crown className="absolute top-2 right-2 h-4 w-4 text-orange-500" />
                </div>

                <div className="p-4 border rounded-lg bg-muted/30 text-center relative">
                  <Plus className="h-8 w-8 mx-auto mb-2 text-muted-foreground" />
                  <h4 className="font-medium text-muted-foreground">
                    Bulk Import
                  </h4>
                  <p className="text-sm text-muted-foreground">
                    Premium feature
                  </p>
                  <Crown className="absolute top-2 right-2 h-4 w-4 text-orange-500" />
                </div>
              </>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Recent Links */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span>Recent Links</span>
            <Link href="/dashboard/links">
              <Button variant="outline" size="sm">
                <Eye className="h-4 w-4 mr-2" />
                View All
              </Button>
            </Link>
          </CardTitle>
          <CardDescription>Your most recently created links</CardDescription>
        </CardHeader>
        <CardContent>
          <LinksTable limit={5} showFolderFilter={false} />
        </CardContent>
      </Card>

      {/* Analytics Preview for Premium Users */}
      {user?.plan !== "free" && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <span>Analytics Overview</span>
              <Link href="/dashboard/analytics">
                <Button variant="outline" size="sm">
                  <BarChart3 className="h-4 w-4 mr-2" />
                  View Details
                </Button>
              </Link>
            </CardTitle>
            <CardDescription>
              Quick insights into your link performance
            </CardDescription>
          </CardHeader>
          <CardContent>
            <AnalyticsDashboard showUrlSelector={false} />
          </CardContent>
        </Card>
      )}
    </div>
  );
}
