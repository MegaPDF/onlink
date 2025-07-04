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
import { LoadingSpinner } from "@/components/ui/loading-spinner";
import { EmptyState } from "@/components/ui/empty-state";
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
  CreditCard,
  Search,
  MoreHorizontal,
  TrendingUp,
  DollarSign,
  Users,
  Calendar,
  ExternalLink,
  Download,
  Ban,
  CheckCircle,
} from "lucide-react";
import { formatRelativeTime, formatNumber, formatCurrency } from "@/lib/utils";
import { toast } from "sonner";

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
  };
}

// Define special "all" values to replace empty strings
const ALL_BILLING_PLANS = "all_billing_plans";
const ALL_BILLING_STATUSES = "all_billing_statuses";
const ALL_INTERVALS = "all_intervals";

export default function AdminBillingPage() {
  const [data, setData] = useState<BillingPageData | null>(null);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [filters, setFilters] = useState({
    plan: ALL_BILLING_PLANS,
    status: ALL_BILLING_STATUSES,
    interval: ALL_INTERVALS,
    sortBy: "createdAt",
    sortOrder: "desc",
  });
  const [currentPage, setCurrentPage] = useState(1);
  const fetchBilling = useCallback(
    async (page = 1) => {
      try {
        setLoading(true);
        const params = new URLSearchParams({
          page: page.toString(),
          limit: "20",
          search: searchTerm,
          // Convert special "all" values back to empty strings for API
          plan: filters.plan === ALL_BILLING_PLANS ? "" : filters.plan,
          status: filters.status === ALL_BILLING_STATUSES ? "" : filters.status,
          interval: filters.interval === ALL_INTERVALS ? "" : filters.interval,
          sortBy: filters.sortBy,
          sortOrder: filters.sortOrder,
        });

        const response = await fetch(`/api/admin/billing?${params.toString()}`);
        if (!response.ok) {
          throw new Error("Failed to fetch billing data");
        }

        const result = await response.json();
        setData(result.data);
        setCurrentPage(page);
      } catch (error) {
        console.error("Error fetching billing:", error);
        toast("Failed to fetch billing data. Please try again.");
      } finally {
        setLoading(false);
      }
    },
    [searchTerm, filters]
  );

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    fetchBilling(1);
  };

  useEffect(() => {
    fetchBilling();
  }, []);

  useEffect(() => {
    const delayedSearch = setTimeout(() => {
      if (searchTerm !== undefined) {
        fetchBilling(1);
      }
    }, 500);

    return () => clearTimeout(delayedSearch);
  }, [searchTerm, filters]);

  const getPlanBadge = (plan: string) => {
    switch (plan) {
      case "free":
        return <Badge variant="secondary">Free</Badge>;
      case "premium":
        return <Badge variant="default">Premium</Badge>;
      case "enterprise":
        return <Badge variant="destructive">Enterprise</Badge>;
      case "team":
        return <Badge variant="outline">Team</Badge>;
      default:
        return <Badge variant="outline">{plan}</Badge>;
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "active":
        return (
          <Badge variant="default" className="bg-green-100 text-green-800">
            Active
          </Badge>
        );
      case "trialing":
        return (
          <Badge variant="default" className="bg-blue-100 text-blue-800">
            Trial
          </Badge>
        );
      case "canceled":
        return <Badge variant="secondary">Canceled</Badge>;
      case "past_due":
        return <Badge variant="destructive">Past Due</Badge>;
      case "unpaid":
        return <Badge variant="destructive">Unpaid</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  if (loading && !data) {
    return (
      <div className="flex items-center justify-center h-96">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold">Billing & Subscriptions</h1>
        <p className="text-muted-foreground">
          Manage subscriptions and revenue analytics
        </p>
      </div>

      {/* Stats Cards */}
      {data?.stats && (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                Monthly Recurring Revenue
              </CardTitle>
              <DollarSign className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {formatCurrency(data.stats.totalMRR)}
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                Active Subscriptions
              </CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {formatNumber(data.stats.activeSubscriptions)}
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Trial Users</CardTitle>
              <Calendar className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {formatNumber(data.stats.trialSubscriptions)}
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Churn Rate</CardTitle>
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {data.stats.churnRate.toFixed(1)}%
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle>Search & Filter</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSearch} className="flex gap-4">
            <div className="flex-1">
              <Input
                placeholder="Search subscriptions..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
            <Select
              value={filters.plan}
              onValueChange={(value) =>
                setFilters((prev) => ({ ...prev, plan: value }))
              }
            >
              <SelectTrigger className="w-40">
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
              <SelectTrigger className="w-40">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={ALL_BILLING_STATUSES}>All Status</SelectItem>
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
              <SelectTrigger className="w-40">
                <SelectValue placeholder="Interval" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={ALL_INTERVALS}>All Intervals</SelectItem>
                <SelectItem value="month">Monthly</SelectItem>
                <SelectItem value="year">Yearly</SelectItem>
              </SelectContent>
            </Select>
            <Button type="submit">
              <Search className="h-4 w-4" />
            </Button>
          </form>
        </CardContent>
      </Card>

      {/* Subscriptions Table */}
      <Card>
        <CardHeader>
          <CardTitle>Subscriptions ({data?.pagination.total || 0})</CardTitle>
        </CardHeader>
        <CardContent>
          {data?.subscriptions.length === 0 ? (
            <EmptyState
              icon={CreditCard}
              title="No subscriptions found"
              description="No subscriptions match your current filters."
            />
          ) : (
            <>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Customer</TableHead>
                    <TableHead>Plan</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Amount</TableHead>
                    <TableHead>Interval</TableHead>
                    <TableHead>Next Payment</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {data?.subscriptions.map((subscription) => (
                    <TableRow key={subscription._id}>
                      <TableCell>
                        {subscription.userId ? (
                          <div>
                            <div className="font-medium">
                              {subscription.userId.name}
                            </div>
                            <div className="text-sm text-muted-foreground">
                              {subscription.userId.email}
                            </div>
                          </div>
                        ) : subscription.teamId ? (
                          <div>
                            <div className="font-medium">
                              {subscription.teamId.name}
                            </div>
                            <div className="text-sm text-muted-foreground">
                              Team: {subscription.teamId.slug}
                            </div>
                          </div>
                        ) : (
                          <span className="text-muted-foreground">Unknown</span>
                        )}
                      </TableCell>
                      <TableCell>{getPlanBadge(subscription.plan)}</TableCell>
                      <TableCell>
                        {getStatusBadge(subscription.status)}
                      </TableCell>
                      <TableCell>
                        <div className="font-medium">
                          {formatCurrency(
                            subscription.amount,
                            subscription.currency
                          )}
                        </div>
                      </TableCell>
                      <TableCell className="capitalize">
                        {subscription.interval}ly
                      </TableCell>
                      <TableCell>
                        <div className="text-sm">
                          {formatRelativeTime(subscription.currentPeriodEnd)}
                        </div>
                      </TableCell>
                      <TableCell>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" className="h-8 w-8 p-0">
                              <MoreHorizontal className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuLabel>Actions</DropdownMenuLabel>
                            <DropdownMenuItem>
                              <ExternalLink className="mr-2 h-4 w-4" />
                              View in Stripe
                            </DropdownMenuItem>
                            <DropdownMenuItem>
                              <Download className="mr-2 h-4 w-4" />
                              Download Invoice
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem className="text-red-600">
                              <Ban className="mr-2 h-4 w-4" />
                              Cancel Subscription
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>

              {/* Pagination */}
              {data?.pagination && data.pagination.totalPages > 1 && (
                <div className="flex items-center justify-between space-x-2 py-4">
                  <div className="text-sm text-muted-foreground">
                    Showing {(currentPage - 1) * 20 + 1} to{" "}
                    {Math.min(currentPage * 20, data.pagination.total)} of{" "}
                    {data.pagination.total} subscriptions
                  </div>
                  <div className="flex items-center space-x-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => fetchBilling(currentPage - 1)}
                      disabled={!data.pagination.hasPrevPage}
                    >
                      Previous
                    </Button>
                    <div className="text-sm">
                      Page {currentPage} of {data.pagination.totalPages}
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => fetchBilling(currentPage + 1)}
                      disabled={!data.pagination.hasNextPage}
                    >
                      Next
                    </Button>
                  </div>
                </div>
              )}
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
