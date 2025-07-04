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

export default function AdminBillingPage() {
  const [data, setData] = useState<BillingPageData | null>(null);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [filters, setFilters] = useState({
    plan: "",
    status: "",
    sortBy: "createdAt",
    sortOrder: "desc",
  });
  const [currentPage, setCurrentPage] = useState(1);
  const toast = useToast();

  const fetchBilling = useCallback(
    async (page = 1) => {
      try {
        setLoading(true);
        const params = new URLSearchParams({
          page: page.toString(),
          limit: "20",
          search: searchTerm,
          ...filters,
        });

        const response = await fetch(`/api/admin/billing?${params}`);
        const result = await response.json();

        if (!response.ok) {
          throw new Error(result.error || "Failed to fetch billing data");
        }

        setData(result.data);
        setCurrentPage(page);
      } catch (error) {
        console.error("Error fetching billing data:", error);
        toast.error("Failed to load billing data");
      } finally {
        setLoading(false);
      }
    },
    [searchTerm, filters, toast]
  );

  useEffect(() => {
    fetchBilling(1);
  }, [fetchBilling]);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    fetchBilling(1);
  };

  const handleCancelSubscription = async (subscriptionId: string) => {
    try {
      const response = await fetch("/api/admin/billing/cancel", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
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

  const getStatusBadgeVariant = (status: string) => {
    switch (status) {
      case "active":
        return "default";
      case "trialing":
        return "secondary";
      case "past_due":
        return "destructive";
      case "canceled":
        return "outline";
      default:
        return "secondary";
    }
  };

  const getPlanBadgeVariant = (plan: string) => {
    switch (plan) {
      case "enterprise":
        return "default";
      case "premium":
        return "secondary";
      case "team":
        return "outline";
      default:
        return "outline";
    }
  };

  if (loading && !data) {
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
          <h1 className="text-3xl font-bold">Billing Overview</h1>
          <p className="text-muted-foreground">
            Revenue, subscriptions, and billing analytics
          </p>
        </div>
        <Button onClick={() => fetchBilling(currentPage)}>
          <CreditCard className="h-4 w-4 mr-2" />
          Refresh
        </Button>
      </div>

      {/* Revenue Stats Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4 mb-8">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Monthly Recurring Revenue
            </CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {formatCurrency(data?.stats.totalMRR || 0)}
            </div>
            <p className="text-xs text-muted-foreground">
              {formatCurrency(data?.stats.totalARR || 0)} ARR
            </p>
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
              {formatNumber(data?.stats.activeSubscriptions || 0)}
            </div>
            <p className="text-xs text-muted-foreground">
              {formatNumber(data?.stats.trialSubscriptions || 0)} on trial
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Average Revenue Per User
            </CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {formatCurrency(data?.stats.averageRevenuePerUser || 0)}
            </div>
            <p className="text-xs text-muted-foreground">
              {data?.stats.churnRate
                ? `${data.stats.churnRate.toFixed(1)}% churn`
                : "N/A churn"}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Revenue</CardTitle>
            <Calendar className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {formatCurrency(data?.stats.totalRevenue || 0)}
            </div>
            <p className="text-xs text-muted-foreground">All time revenue</p>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card className="mb-6">
        <CardContent className="p-6">
          <form onSubmit={handleSearch} className="flex gap-4">
            <div className="flex-1">
              <Input
                placeholder="Search by customer name or email..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full"
              />
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
                <SelectItem value="">All Plans</SelectItem>
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
                <SelectItem value="">All Status</SelectItem>
                <SelectItem value="active">Active</SelectItem>
                <SelectItem value="trialing">Trialing</SelectItem>
                <SelectItem value="past_due">Past Due</SelectItem>
                <SelectItem value="canceled">Canceled</SelectItem>
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
                    <TableHead>Billing</TableHead>
                    <TableHead>Period</TableHead>
                    <TableHead className="w-12"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {data?.subscriptions.map((subscription) => (
                    <TableRow key={subscription._id}>
                      <TableCell>
                        {subscription.userId ? (
                          <div>
                            <p className="font-medium">
                              {subscription.userId.name}
                            </p>
                            <p className="text-sm text-muted-foreground">
                              {subscription.userId.email}
                            </p>
                          </div>
                        ) : subscription.teamId ? (
                          <div>
                            <p className="font-medium">
                              {subscription.teamId.name}
                            </p>
                            <p className="text-sm text-muted-foreground">
                              Team Account
                            </p>
                          </div>
                        ) : (
                          <span className="text-muted-foreground">Unknown</span>
                        )}
                      </TableCell>
                      <TableCell>
                        <Badge
                          variant={getPlanBadgeVariant(subscription.plan)}
                          className="capitalize"
                        >
                          {subscription.plan}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Badge
                          variant={getStatusBadgeVariant(subscription.status)}
                          className="capitalize"
                        >
                          {subscription.status}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div>
                          <p className="font-medium">
                            {formatCurrency(subscription.amount / 100)}{" "}
                            {subscription.currency.toUpperCase()}
                          </p>
                          <p className="text-sm text-muted-foreground">
                            per {subscription.interval}
                          </p>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="text-sm">
                          <p>
                            Next:{" "}
                            {new Date(
                              subscription.currentPeriodEnd
                            ).toLocaleDateString()}
                          </p>
                          <p className="text-muted-foreground">
                            Stripe ID:{" "}
                            {subscription.stripeSubscriptionId.slice(-8)}
                          </p>
                        </div>
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {formatRelativeTime(subscription.createdAt)}
                      </TableCell>
                      <TableCell>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon">
                              <MoreHorizontal className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
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
                            <DropdownMenuSeparator />
                            {subscription.status === "active" ? (
                              <DropdownMenuItem
                                className="text-red-600"
                                onClick={() =>
                                  handleCancelSubscription(
                                    subscription.stripeSubscriptionId
                                  )
                                }
                              >
                                <Ban className="mr-2 h-4 w-4" />
                                Cancel Subscription
                              </DropdownMenuItem>
                            ) : (
                              <DropdownMenuItem>
                                <CheckCircle className="mr-2 h-4 w-4" />
                                Reactivate
                              </DropdownMenuItem>
                            )}
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>

              {/* Pagination */}
              {data && data.pagination.totalPages > 1 && (
                <div className="flex items-center justify-between mt-6">
                  <p className="text-sm text-muted-foreground">
                    Showing{" "}
                    {(data.pagination.page - 1) * data.pagination.limit + 1} to{" "}
                    {Math.min(
                      data.pagination.page * data.pagination.limit,
                      data.pagination.total
                    )}{" "}
                    of {data.pagination.total} subscriptions
                  </p>
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => fetchBilling(currentPage - 1)}
                      disabled={!data.pagination.hasPrevPage || loading}
                    >
                      Previous
                    </Button>
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
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
