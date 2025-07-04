"use client";

import React, { useState, useEffect, useCallback } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  CreditCard,
  Search,
  MoreHorizontal,
  TrendingUp,
  TrendingDown,
  DollarSign,
  Users,
  Calendar,
  ExternalLink,
  Download,
  Ban,
  CheckCircle,
  XCircle,
  AlertTriangle,
  Filter,
  Settings,
  Clock,
  Loader2,
  Activity,
  RefreshCw,
  FileText,
  Mail,
  Eye,
  Crown,
  Zap,
  Target,
} from "lucide-react";

// Types for real API data
interface SubscriptionData {
  _id: string;
  stripeSubscriptionId: string;
  stripeCustomerId: string;
  userId?: { _id: string; name: string; email: string };
  teamId?: { _id: string; name: string; slug: string };
  plan: "free" | "premium" | "enterprise" | "team";
  status:
    | "active"
    | "inactive"
    | "canceled"
    | "past_due"
    | "unpaid"
    | "trialing";
  interval: "month" | "year";
  amount: number;
  currency: string;
  currentPeriodStart: Date;
  currentPeriodEnd: Date;
  features: {
    maxLinks: number;
    maxClicks: number;
    customDomains: number;
    teamMembers: number;
    analytics: boolean;
    qrCodes: boolean;
  };
  createdAt: Date;
  updatedAt: Date;
  canceledAt?: Date;
  trialEnd?: Date;
}

interface BillingPageData {
  subscriptions: SubscriptionData[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
    hasNextPage: boolean;
    hasPrevPage: boolean;
  };
  stats: {
    totalMRR: number;
    totalARR: number;
    totalRevenue: number;
    activeSubscriptions: number;
    trialSubscriptions: number;
    canceledSubscriptions: number;
    churnRate: number;
    averageRevenuePerUser: number;
    growth: {
      mrr: number;
      subscriptions: number;
    };
  };
}

const ALL_BILLING_PLANS = "all_billing_plans";
const ALL_BILLING_STATUSES = "all_billing_statuses";
const ALL_INTERVALS = "all_intervals";

// Utility functions
const formatCurrency = (amount: number, currency: string = "USD") => {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: currency.toUpperCase(),
  }).format(amount / 100); // Assuming amount is in cents
};

const formatNumber = (num: number) => {
  return new Intl.NumberFormat().format(num);
};

const formatRelativeTime = (date: Date | string) => {
  const dateObj = typeof date === "string" ? new Date(date) : date;
  const now = new Date();
  const diffInMs = now.getTime() - dateObj.getTime();
  const diffInHours = diffInMs / (1000 * 60 * 60);
  const diffInDays = diffInMs / (1000 * 60 * 60 * 24);

  if (diffInHours < 1) return "Just now";
  if (diffInHours < 24) return `${Math.floor(diffInHours)}h ago`;
  if (diffInDays < 7) return `${Math.floor(diffInDays)}d ago`;
  if (diffInDays < 30) return `${Math.floor(diffInDays)}d ago`;
  return dateObj.toLocaleDateString();
};

const formatPercentage = (value: number | null | undefined) => {
  if (value === null || value === undefined || isNaN(value)) {
    return "0.0%";
  }
  return `${value.toFixed(1)}%`;
};

export default function AdminBillingPage() {
  const [data, setData] = useState<BillingPageData | null>(null);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedSubscriptions, setSelectedSubscriptions] = useState<string[]>(
    []
  );
  const [filters, setFilters] = useState({
    plan: ALL_BILLING_PLANS,
    status: ALL_BILLING_STATUSES,
    interval: ALL_INTERVALS,
    sortBy: "createdAt",
    sortOrder: "desc",
  });
  const [currentPage, setCurrentPage] = useState(1);

  // Toast notifications (replace with your actual toast implementation)
  const toast = {
    success: (message: string) => console.log("Success:", message),
    error: (message: string) => console.log("Error:", message),
  };

  // Fetch billing data from API
  const fetchBilling = useCallback(
    async (page = 1) => {
      try {
        setLoading(true);
        const params = new URLSearchParams({
          page: page.toString(),
          limit: "20",
          search: searchTerm,
          plan: filters.plan === ALL_BILLING_PLANS ? "" : filters.plan,
          status: filters.status === ALL_BILLING_STATUSES ? "" : filters.status,
          interval: filters.interval === ALL_INTERVALS ? "" : filters.interval,
          sortBy: filters.sortBy,
          sortOrder: filters.sortOrder,
        });

        const response = await fetch(`/api/admin/billing?${params.toString()}`);
        const result = await response.json();

        if (!response.ok) {
          throw new Error(result.error || "Failed to fetch billing data");
        }

        setData(result.data);
        setCurrentPage(page);
      } catch (error) {
        console.error("Error fetching billing:", error);
        toast.error("Failed to load billing data. Please try again.");
      } finally {
        setLoading(false);
      }
    },
    [searchTerm, filters]
  );

  // Load billing data on component mount and when filters change
  useEffect(() => {
    fetchBilling(1);
  }, [fetchBilling]);

  // Search handler
  const handleSearch = () => {
    fetchBilling(1);
  };

  // Cancel subscription
  const handleCancelSubscription = async (subscriptionId: string) => {
    try {
      const response = await fetch(`/api/admin/billing/cancel`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ subscriptionId }),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || "Failed to cancel subscription");
      }

      toast.success("Subscription canceled successfully");
      fetchBilling(currentPage);
    } catch (error) {
      console.error("Error canceling subscription:", error);
      toast.error("Failed to cancel subscription");
    }
  };

  // Reactivate subscription
  const handleReactivateSubscription = async (subscriptionId: string) => {
    try {
      const response = await fetch(`/api/admin/billing/reactivate`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ subscriptionId }),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || "Failed to reactivate subscription");
      }

      toast.success("Subscription reactivated successfully");
      fetchBilling(currentPage);
    } catch (error) {
      console.error("Error reactivating subscription:", error);
      toast.error("Failed to reactivate subscription");
    }
  };

  // Bulk actions
  const handleBulkAction = async (
    action: string,
    subscriptionIds: string[]
  ) => {
    try {
      const response = await fetch("/api/admin/billing/bulk", {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ action, subscriptionIds }),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || "Failed to perform bulk action");
      }

      toast.success(`Bulk action completed successfully`);
      setSelectedSubscriptions([]);
      fetchBilling(currentPage);
    } catch (error) {
      console.error("Error performing bulk action:", error);
      toast.error("Failed to perform bulk action");
    }
  };

  // Export billing data
  const handleExportBilling = async () => {
    try {
      const response = await fetch("/api/admin/billing/export", {
        method: "GET",
        headers: {
          Accept: "text/csv",
        },
      });

      if (!response.ok) {
        throw new Error("Failed to export billing data");
      }

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `billing-export-${
        new Date().toISOString().split("T")[0]
      }.csv`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);

      toast.success("Billing data exported successfully");
    } catch (error) {
      console.error("Error exporting billing data:", error);
      toast.error("Failed to export billing data");
    }
  };

  // Utility functions
  const getPlanBadge = (plan: string) => {
    switch (plan) {
      case "free":
        return (
          <Badge className="bg-gray-100 text-gray-800 border-gray-200 dark:bg-gray-900/20 dark:text-gray-400 dark:border-gray-800">
            Free
          </Badge>
        );
      case "premium":
        return (
          <Badge className="bg-yellow-100 text-yellow-800 border-yellow-200 dark:bg-yellow-900/20 dark:text-yellow-400 dark:border-yellow-800">
            <Crown className="w-3 h-3 mr-1" />
            Premium
          </Badge>
        );
      case "enterprise":
        return (
          <Badge className="bg-purple-100 text-purple-800 border-purple-200 dark:bg-purple-900/20 dark:text-purple-400 dark:border-purple-800">
            <Zap className="w-3 h-3 mr-1" />
            Enterprise
          </Badge>
        );
      case "team":
        return (
          <Badge className="bg-blue-100 text-blue-800 border-blue-200 dark:bg-blue-900/20 dark:text-blue-400 dark:border-blue-800">
            <Users className="w-3 h-3 mr-1" />
            Team
          </Badge>
        );
      default:
        return <Badge variant="outline">{plan}</Badge>;
    }
  };

  const getStatusBadge = (status: string, trialEnd?: Date) => {
    switch (status) {
      case "active":
        return (
          <Badge className="bg-green-100 text-green-800 border-green-200 dark:bg-green-900/20 dark:text-green-400 dark:border-green-800">
            <CheckCircle className="w-3 h-3 mr-1" />
            Active
          </Badge>
        );
      case "trialing":
        const isTrialExpiring =
          trialEnd &&
          new Date(trialEnd).getTime() - Date.now() < 3 * 24 * 60 * 60 * 1000;
        return (
          <Badge
            className={`${
              isTrialExpiring
                ? "bg-orange-100 text-orange-800 border-orange-200 dark:bg-orange-900/20 dark:text-orange-400 dark:border-orange-800"
                : "bg-blue-100 text-blue-800 border-blue-200 dark:bg-blue-900/20 dark:text-blue-400 dark:border-blue-800"
            }`}
          >
            <Clock className="w-3 h-3 mr-1" />
            Trial
          </Badge>
        );
      case "canceled":
        return (
          <Badge className="bg-gray-100 text-gray-800 border-gray-200 dark:bg-gray-900/20 dark:text-gray-400 dark:border-gray-800">
            <XCircle className="w-3 h-3 mr-1" />
            Canceled
          </Badge>
        );
      case "past_due":
        return (
          <Badge className="bg-red-100 text-red-800 border-red-200 dark:bg-red-900/20 dark:text-red-400 dark:border-red-800">
            <AlertTriangle className="w-3 h-3 mr-1" />
            Past Due
          </Badge>
        );
      case "unpaid":
        return (
          <Badge className="bg-red-100 text-red-800 border-red-200 dark:bg-red-900/20 dark:text-red-400 dark:border-red-800">
            <XCircle className="w-3 h-3 mr-1" />
            Unpaid
          </Badge>
        );
      case "inactive":
        return (
          <Badge className="bg-gray-100 text-gray-800 border-gray-200 dark:bg-gray-900/20 dark:text-gray-400 dark:border-gray-800">
            <XCircle className="w-3 h-3 mr-1" />
            Inactive
          </Badge>
        );
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  const toggleSubscriptionSelection = (subscriptionId: string) => {
    setSelectedSubscriptions((prev) =>
      prev.includes(subscriptionId)
        ? prev.filter((id) => id !== subscriptionId)
        : [...prev, subscriptionId]
    );
  };

  const toggleSelectAll = () => {
    if (!data) return;
    if (selectedSubscriptions.length === data.subscriptions.length) {
      setSelectedSubscriptions([]);
    } else {
      setSelectedSubscriptions(data.subscriptions.map((sub) => sub._id));
    }
  };

  // Loading state
  if (loading && !data) {
    return (
      <div className="flex items-center justify-center h-96">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  // Error state - no data loaded
  if (!loading && !data) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-center">
          <AlertTriangle className="h-12 w-12 text-red-500 mx-auto mb-4" />
          <h3 className="text-lg font-semibold mb-2">
            Failed to load billing data
          </h3>
          <p className="text-muted-foreground mb-4">
            There was an error loading the billing information.
          </p>
          <Button onClick={() => fetchBilling(1)}>
            <RefreshCw className="h-4 w-4 mr-2" />
            Try Again
          </Button>
        </div>
      </div>
    );
  }

  return (
    <TooltipProvider>
      <div className="container mx-auto py-6 px-4 space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">
              Billing & Subscriptions
            </h1>
            <p className="text-muted-foreground">
              Manage subscriptions and revenue analytics
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleExportBilling}
                >
                  <Download className="h-4 w-4 mr-2" />
                  Export
                </Button>
              </TooltipTrigger>
              <TooltipContent>Export billing data to CSV</TooltipContent>
            </Tooltip>
          </div>
        </div>

        {/* Stats Cards */}
        {data?.stats && (
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4">
            <Card className="relative overflow-hidden">
              <div className="absolute inset-0 bg-gradient-to-br from-green-50 to-green-100 dark:from-green-950/20 dark:to-green-900/20"></div>
              <CardHeader className="relative flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">
                  Monthly Recurring Revenue
                </CardTitle>
                <DollarSign className="h-4 w-4 text-green-600" />
              </CardHeader>
              <CardContent className="relative">
                <div className="text-2xl font-bold text-green-600">
                  {formatCurrency(data.stats.totalMRR)}
                </div>
                <div className="flex items-center text-xs text-muted-foreground mt-1">
                  {(data.stats.growth?.mrr || 0) >= 0 ? (
                    <TrendingUp className="h-3 w-3 mr-1 text-green-600" />
                  ) : (
                    <TrendingDown className="h-3 w-3 mr-1 text-red-600" />
                  )}
                  <span
                    className={`${
                      (data.stats.growth?.mrr || 0) >= 0
                        ? "text-green-600"
                        : "text-red-600"
                    }`}
                  >
                    {Math.abs(data.stats.growth?.mrr || 0).toFixed(1)}%
                  </span>
                  <span className="ml-1">vs last month</span>
                </div>
              </CardContent>
            </Card>

            <Card className="relative overflow-hidden">
              <div className="absolute inset-0 bg-gradient-to-br from-blue-50 to-blue-100 dark:from-blue-950/20 dark:to-blue-900/20"></div>
              <CardHeader className="relative flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">
                  Active Subscriptions
                </CardTitle>
                <Users className="h-4 w-4 text-blue-600" />
              </CardHeader>
              <CardContent className="relative">
                <div className="text-2xl font-bold text-blue-600">
                  {formatNumber(data.stats.activeSubscriptions)}
                </div>
                <div className="flex items-center text-xs text-muted-foreground mt-1">
                  {(data.stats.growth?.subscriptions || 0) >= 0 ? (
                    <TrendingUp className="h-3 w-3 mr-1 text-green-600" />
                  ) : (
                    <TrendingDown className="h-3 w-3 mr-1 text-red-600" />
                  )}
                  <span
                    className={`${
                      (data.stats.growth?.subscriptions || 0) >= 0
                        ? "text-green-600"
                        : "text-red-600"
                    }`}
                  >
                    +{Math.abs(data.stats.growth?.subscriptions || 0)}
                  </span>
                  <span className="ml-1">this month</span>
                </div>
              </CardContent>
            </Card>

            <Card className="relative overflow-hidden">
              <div className="absolute inset-0 bg-gradient-to-br from-purple-50 to-purple-100 dark:from-purple-950/20 dark:to-purple-900/20"></div>
              <CardHeader className="relative flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">
                  Trial Users
                </CardTitle>
                <Calendar className="h-4 w-4 text-purple-600" />
              </CardHeader>
              <CardContent className="relative">
                <div className="text-2xl font-bold text-purple-600">
                  {formatNumber(data.stats.trialSubscriptions)}
                </div>
                <p className="text-xs text-muted-foreground">
                  {data.stats.canceledSubscriptions} canceled
                </p>
              </CardContent>
            </Card>

            <Card className="relative overflow-hidden">
              <div className="absolute inset-0 bg-gradient-to-br from-orange-50 to-orange-100 dark:from-orange-950/20 dark:to-orange-900/20"></div>
              <CardHeader className="relative flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">
                  Churn Rate
                </CardTitle>
                <Target className="h-4 w-4 text-orange-600" />
              </CardHeader>
              <CardContent className="relative">
                <div className="text-2xl font-bold text-orange-600">
                  {formatPercentage(data.stats.churnRate)}
                </div>
                <p className="text-xs text-muted-foreground">
                  ARPU: {formatCurrency(data.stats.averageRevenuePerUser || 0)}
                </p>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Filters */}
        <Card>
          <CardContent className="pt-6">
            <div className="flex gap-4 items-end flex-wrap">
              <div className="flex-1 min-w-[300px]">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
                  <Input
                    placeholder="Search subscriptions by customer name or email..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10"
                  />
                </div>
              </div>

              <Select
                value={filters.plan}
                onValueChange={(value) =>
                  setFilters((prev) => ({ ...prev, plan: value }))
                }
              >
                <SelectTrigger className="w-32">
                  <SelectValue placeholder="Plan" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={ALL_BILLING_PLANS}>All Plans</SelectItem>
                  <SelectItem value="free">Free</SelectItem>
                  <SelectItem value="premium">Premium</SelectItem>
                  <SelectItem value="enterprise">Enterprise</SelectItem>
                  <SelectItem value="team">Team</SelectItem>
                </SelectContent>
              </Select>

              <Select
                value={filters.status}
                onValueChange={(value) =>
                  setFilters((prev) => ({ ...prev, status: value }))
                }
              >
                <SelectTrigger className="w-32">
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={ALL_BILLING_STATUSES}>
                    All Status
                  </SelectItem>
                  <SelectItem value="active">Active</SelectItem>
                  <SelectItem value="trialing">Trial</SelectItem>
                  <SelectItem value="canceled">Canceled</SelectItem>
                  <SelectItem value="past_due">Past Due</SelectItem>
                  <SelectItem value="unpaid">Unpaid</SelectItem>
                </SelectContent>
              </Select>

              <Select
                value={filters.interval}
                onValueChange={(value) =>
                  setFilters((prev) => ({ ...prev, interval: value }))
                }
              >
                <SelectTrigger className="w-32">
                  <SelectValue placeholder="Interval" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={ALL_INTERVALS}>All Intervals</SelectItem>
                  <SelectItem value="month">Monthly</SelectItem>
                  <SelectItem value="year">Yearly</SelectItem>
                </SelectContent>
              </Select>

              <Button onClick={handleSearch} variant="outline">
                <Filter className="h-4 w-4 mr-2" />
                Filter
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Bulk Actions */}
        {selectedSubscriptions.length > 0 && (
          <Card className="bg-blue-50 dark:bg-blue-950/20 border-blue-200 dark:border-blue-800">
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <CheckCircle className="h-5 w-5 text-blue-600" />
                  <span className="font-medium text-blue-800 dark:text-blue-200">
                    {selectedSubscriptions.length} subscription
                    {selectedSubscriptions.length > 1 ? "s" : ""} selected
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() =>
                      handleBulkAction("send_invoice", selectedSubscriptions)
                    }
                  >
                    <Mail className="h-4 w-4 mr-2" />
                    Send Invoice
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() =>
                      handleBulkAction("download", selectedSubscriptions)
                    }
                  >
                    <Download className="h-4 w-4 mr-2" />
                    Download
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    className="text-red-600"
                    onClick={() =>
                      handleBulkAction("cancel", selectedSubscriptions)
                    }
                  >
                    <Ban className="h-4 w-4 mr-2" />
                    Cancel
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Subscriptions Table */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>
                  Subscriptions (
                  {data ? formatNumber(data.pagination.total) : "0"})
                </CardTitle>
                <CardDescription>
                  Monitor and manage all customer subscriptions and billing
                </CardDescription>
              </div>
              <div className="flex items-center gap-2">
                <Button variant="outline" size="sm">
                  <Settings className="h-4 w-4 mr-2" />
                  Columns
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {!data || data.subscriptions.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12">
                <CreditCard className="h-12 w-12 text-muted-foreground mb-4" />
                <h3 className="text-lg font-semibold mb-2">
                  No subscriptions found
                </h3>
                <p className="text-muted-foreground">
                  {!data
                    ? "Loading subscriptions..."
                    : "No subscriptions match your current filters."}
                </p>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="rounded-md border">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="w-[50px]">
                          <Checkbox
                            checked={
                              data.subscriptions.length > 0 &&
                              selectedSubscriptions.length ===
                                data.subscriptions.length
                            }
                            onCheckedChange={toggleSelectAll}
                          />
                        </TableHead>
                        <TableHead>Customer</TableHead>
                        <TableHead>Plan</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Amount</TableHead>
                        <TableHead>Interval</TableHead>
                        <TableHead>Next Payment</TableHead>
                        <TableHead>Created</TableHead>
                        <TableHead className="w-[50px]"></TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {data.subscriptions.map((subscription) => (
                        <TableRow key={subscription._id} className="group">
                          <TableCell>
                            <Checkbox
                              checked={selectedSubscriptions.includes(
                                subscription._id
                              )}
                              onCheckedChange={() =>
                                toggleSubscriptionSelection(subscription._id)
                              }
                            />
                          </TableCell>
                          <TableCell>
                            {subscription.userId ? (
                              <div className="flex items-center space-x-2">
                                <div className="h-6 w-6 rounded-full bg-gradient-to-br from-blue-400 to-blue-600 flex items-center justify-center text-white text-xs font-medium">
                                  {subscription.userId.name
                                    .charAt(0)
                                    .toUpperCase()}
                                </div>
                                <div>
                                  <div className="font-medium text-sm">
                                    {subscription.userId.name}
                                  </div>
                                  <div className="text-xs text-muted-foreground">
                                    {subscription.userId.email}
                                  </div>
                                </div>
                              </div>
                            ) : subscription.teamId ? (
                              <div className="flex items-center space-x-2">
                                <div className="h-6 w-6 rounded-full bg-gradient-to-br from-purple-400 to-purple-600 flex items-center justify-center text-white text-xs font-medium">
                                  {subscription.teamId.name
                                    .charAt(0)
                                    .toUpperCase()}
                                </div>
                                <div>
                                  <div className="font-medium text-sm">
                                    {subscription.teamId.name}
                                  </div>
                                  <div className="text-xs text-muted-foreground">
                                    Team: {subscription.teamId.slug}
                                  </div>
                                </div>
                              </div>
                            ) : (
                              <span className="text-muted-foreground text-sm">
                                Unknown Customer
                              </span>
                            )}
                          </TableCell>
                          <TableCell>
                            {getPlanBadge(subscription.plan)}
                          </TableCell>
                          <TableCell>
                            {getStatusBadge(
                              subscription.status,
                              subscription.trialEnd
                            )}
                          </TableCell>
                          <TableCell>
                            <div className="space-y-1">
                              <div className="font-medium">
                                {formatCurrency(
                                  subscription.amount,
                                  subscription.currency
                                )}
                              </div>
                              <div className="text-xs text-muted-foreground capitalize">
                                {subscription.currency?.toUpperCase() || "USD"}
                              </div>
                            </div>
                          </TableCell>
                          <TableCell>
                            <Badge variant="outline" className="capitalize">
                              {subscription.interval}ly
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center text-sm text-muted-foreground">
                              <Clock className="h-3 w-3 mr-1" />
                              {formatRelativeTime(
                                subscription.currentPeriodEnd
                              )}
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="text-sm">
                              {formatRelativeTime(subscription.createdAt)}
                            </div>
                          </TableCell>
                          <TableCell>
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button
                                  variant="ghost"
                                  className="h-8 w-8 p-0 opacity-0 group-hover:opacity-100 transition-opacity"
                                >
                                  <MoreHorizontal className="h-4 w-4" />
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end" className="w-48">
                                <DropdownMenuLabel>Actions</DropdownMenuLabel>
                                <DropdownMenuItem
                                  onClick={() =>
                                    window.open(
                                      `https://dashboard.stripe.com/subscriptions/${subscription.stripeSubscriptionId}`,
                                      "_blank"
                                    )
                                  }
                                >
                                  <ExternalLink className="mr-2 h-4 w-4" />
                                  View in Stripe
                                </DropdownMenuItem>
                                <DropdownMenuItem>
                                  <Download className="mr-2 h-4 w-4" />
                                  Download Invoice
                                </DropdownMenuItem>
                                <DropdownMenuItem>
                                  <Eye className="mr-2 h-4 w-4" />
                                  View Details
                                </DropdownMenuItem>
                                <DropdownMenuSeparator />
                                {subscription.status === "canceled" ? (
                                  <DropdownMenuItem
                                    onClick={() =>
                                      handleReactivateSubscription(
                                        subscription._id
                                      )
                                    }
                                    className="text-green-600"
                                  >
                                    <CheckCircle className="mr-2 h-4 w-4" />
                                    Reactivate
                                  </DropdownMenuItem>
                                ) : (
                                  <AlertDialog>
                                    <AlertDialogTrigger asChild>
                                      <DropdownMenuItem
                                        onSelect={(e) => e.preventDefault()}
                                        className="text-red-600"
                                      >
                                        <Ban className="mr-2 h-4 w-4" />
                                        Cancel Subscription
                                      </DropdownMenuItem>
                                    </AlertDialogTrigger>
                                    <AlertDialogContent>
                                      <AlertDialogHeader>
                                        <AlertDialogTitle className="flex items-center gap-2">
                                          <AlertTriangle className="h-5 w-5 text-red-600" />
                                          Cancel Subscription
                                        </AlertDialogTitle>
                                        <AlertDialogDescription>
                                          Are you sure you want to cancel this
                                          subscription? The customer will lose
                                          access to premium features at the end
                                          of their current billing period.
                                        </AlertDialogDescription>
                                      </AlertDialogHeader>
                                      <AlertDialogFooter>
                                        <AlertDialogCancel>
                                          Cancel
                                        </AlertDialogCancel>
                                        <AlertDialogAction
                                          onClick={() =>
                                            handleCancelSubscription(
                                              subscription._id
                                            )
                                          }
                                          className="bg-red-600 hover:bg-red-700"
                                        >
                                          Cancel Subscription
                                        </AlertDialogAction>
                                      </AlertDialogFooter>
                                    </AlertDialogContent>
                                  </AlertDialog>
                                )}
                              </DropdownMenuContent>
                            </DropdownMenu>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>

                {/* Pagination */}
                {data && data.pagination.totalPages > 1 && (
                  <div className="flex items-center justify-between">
                    <div className="text-sm text-muted-foreground">
                      Showing{" "}
                      <strong>
                        {(data.pagination.page - 1) * data.pagination.limit + 1}
                      </strong>{" "}
                      to{" "}
                      <strong>
                        {Math.min(
                          data.pagination.page * data.pagination.limit,
                          data.pagination.total
                        )}
                      </strong>{" "}
                      of <strong>{data.pagination.total}</strong> results
                    </div>
                    <div className="flex items-center space-x-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => fetchBilling(currentPage - 1)}
                        disabled={!data.pagination.hasPrevPage || loading}
                      >
                        Previous
                      </Button>
                      <div className="flex items-center space-x-1">
                        {[
                          ...Array(Math.min(5, data.pagination.totalPages)),
                        ].map((_, i) => {
                          const page = i + 1;
                          return (
                            <Button
                              key={page}
                              variant={
                                page === data.pagination.page
                                  ? "default"
                                  : "outline"
                              }
                              size="sm"
                              className="w-8 h-8"
                              onClick={() => fetchBilling(page)}
                            >
                              {page}
                            </Button>
                          );
                        })}
                      </div>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => fetchBilling(currentPage + 1)}
                        disabled={!data.pagination.hasNextPage || loading}
                      >
                        Next
                      </Button>
                    </div>
                  </div>
                )}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </TooltipProvider>
  );
}
