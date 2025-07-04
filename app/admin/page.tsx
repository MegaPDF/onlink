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
} from "lucide-react";
import { formatNumber, formatCurrency } from "@/lib/utils";
import Link from "next/link";

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

export default function AdminOverviewPage() {
  const [stats, setStats] = useState<AdminStats | null>(null);
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
      ] = await Promise.all([
        fetch("/api/admin/users?page=1&limit=1"),
        fetch("/api/admin/links?page=1&limit=1"),
        fetch("/api/admin/domains?page=1&limit=1"),
        fetch("/api/admin/billing?page=1&limit=1"),
        fetch("/api/admin/security?page=1&limit=1"),
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

      const [usersData, linksData, domainsData, billingData, securityData] =
        await Promise.all([
          usersResponse.json(),
          linksResponse.json(),
          domainsResponse.json(),
          billingResponse.json(),
          securityResponse.json(),
        ]);

      setStats({
        users: {
          total: usersData.data?.stats.totalUsers,
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
          blockedIps: 0,
        },
      });
    } catch (error) {
      console.error("Error fetching admin stats:", error);
      setError("Failed to load admin statistics");
      toast.error("Failed to load admin statistics");
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

  if (error) {
    return (
      <div className="container mx-auto py-6 px-4">
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
    <div className="container mx-auto py-6 px-4">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold">Admin Overview</h1>
          <p className="text-muted-foreground">System health and key metrics</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={fetchStats}>
            <Activity className="h-4 w-4 mr-2" />
            Refresh
          </Button>
          <Link href="/admin/reports">
            <Button>
              <BarChart3 className="h-4 w-4 mr-2" />
              View Reports
            </Button>
          </Link>
        </div>
      </div>

      {/* Key Metrics Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4 mb-8">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Users</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {formatNumber(stats?.users.total || 0)}
            </div>
            <p className="text-xs text-muted-foreground">
              {formatNumber(stats?.users.active || 0)} active
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Links</CardTitle>
            <LinkIcon className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {formatNumber(stats?.links.total || 0)}
            </div>
            <p className="text-xs text-muted-foreground">
              {formatNumber(stats?.links.totalClicks || 0)} total clicks
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Monthly Revenue
            </CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {formatCurrency(stats?.revenue.mrr || 0)}
            </div>
            <p className="text-xs text-muted-foreground">
              {formatCurrency(stats?.revenue.arr || 0)} ARR
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Security Alerts
            </CardTitle>
            <Shield className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {stats?.security.suspiciousActivities || 0}
            </div>
            <p className="text-xs text-muted-foreground">
              {stats?.security.failedLogins || 0} failed logins today
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Quick Actions */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4 mb-8">
        <Link href="/admin/users">
          <Card className="hover:shadow-md transition-shadow cursor-pointer">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-blue-100 rounded-lg">
                  <Users className="h-5 w-5 text-blue-600" />
                </div>
                <div>
                  <p className="font-medium">Manage Users</p>
                  <p className="text-sm text-muted-foreground">
                    View & edit users
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </Link>

        <Link href="/admin/links">
          <Card className="hover:shadow-md transition-shadow cursor-pointer">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-green-100 rounded-lg">
                  <LinkIcon className="h-5 w-5 text-green-600" />
                </div>
                <div>
                  <p className="font-medium">Manage Links</p>
                  <p className="text-sm text-muted-foreground">
                    Monitor all links
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </Link>

        <Link href="/admin/security">
          <Card className="hover:shadow-md transition-shadow cursor-pointer">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-red-100 rounded-lg">
                  <Shield className="h-5 w-5 text-red-600" />
                </div>
                <div>
                  <p className="font-medium">Security Center</p>
                  <p className="text-sm text-muted-foreground">
                    Monitor threats
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </Link>

        <Link href="/admin/billing">
          <Card className="hover:shadow-md transition-shadow cursor-pointer">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-purple-100 rounded-lg">
                  <CreditCard className="h-5 w-5 text-purple-600" />
                </div>
                <div>
                  <p className="font-medium">Billing Overview</p>
                  <p className="text-sm text-muted-foreground">
                    Revenue & subscriptions
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </Link>
      </div>

      {/* Detailed Stats */}
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {/* User Stats */}
        <Card>
          <CardHeader>
            <CardTitle>User Distribution</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-sm">Free Plan</span>
              <div className="flex items-center gap-2">
                <Badge variant="secondary">
                  {formatNumber(stats?.users.byPlan.free || 0)}
                </Badge>
                <span className="text-xs text-muted-foreground">
                  {stats?.users.total
                    ? Math.round(
                        (stats.users.byPlan.free / stats.users.total) * 100
                      )
                    : 0}
                  %
                </span>
              </div>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm">Premium Plan</span>
              <div className="flex items-center gap-2">
                <Badge variant="default">
                  {formatNumber(stats?.users.byPlan.premium || 0)}
                </Badge>
                <span className="text-xs text-muted-foreground">
                  {stats?.users.total
                    ? Math.round(
                        (stats.users.byPlan.premium / stats.users.total) * 100
                      )
                    : 0}
                  %
                </span>
              </div>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm">Enterprise Plan</span>
              <div className="flex items-center gap-2">
                <Badge variant="outline">
                  {formatNumber(stats?.users.byPlan.enterprise || 0)}
                </Badge>
                <span className="text-xs text-muted-foreground">
                  {stats?.users.total
                    ? Math.round(
                        (stats.users.byPlan.enterprise / stats.users.total) *
                          100
                      )
                    : 0}
                  %
                </span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Recent Activity */}
        <Card>
          <CardHeader>
            <CardTitle>Today's Activity</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-sm">New Users</span>
              <Badge variant="secondary">
                {formatNumber(stats?.users.newToday || 0)}
              </Badge>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm">Links Created</span>
              <Badge variant="secondary">
                {formatNumber(stats?.links.createdToday || 0)}
              </Badge>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm">Failed Logins</span>
              <Badge
                variant={
                  stats?.security.failedLogins ? "destructive" : "secondary"
                }
              >
                {formatNumber(stats?.security.failedLogins || 0)}
              </Badge>
            </div>
          </CardContent>
        </Card>

        {/* System Health */}
        <Card>
          <CardHeader>
            <CardTitle>System Health</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-sm">Active Links</span>
              <Badge variant="default">
                {formatNumber(stats?.links.active || 0)}
              </Badge>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm">Verified Domains</span>
              <Badge variant="default">
                {formatNumber(stats?.domains.verified || 0)}
              </Badge>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm">Active Subscriptions</span>
              <Badge variant="default">
                {formatNumber(stats?.revenue.activeSubscriptions || 0)}
              </Badge>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
