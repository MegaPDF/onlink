// ============= app/dashboard/billing/page.tsx =============
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
import { useAuth } from "@/hooks/use-auth";
import { useToast } from "@/hooks/use-toast";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  CreditCard,
  Crown,
  CheckCircle,
  AlertCircle,
  Download,
  ExternalLink,
  Star,
  Zap,
  Users,
  BarChart3,
  Globe,
  Shield,
  Clock,
  DollarSign,
  Calendar,
} from "lucide-react";
import { formatCurrency } from "@/lib/utils";
import { toast } from "sonner";
import { formatDate } from "date-fns";

interface BillingData {
  subscription?: {
    id: string;
    status: string;
    plan: string;
    interval: string;
    amount: number;
    currency: string;
    currentPeriodStart: string;
    currentPeriodEnd: string;
    cancelAtPeriodEnd: boolean;
  };
  invoices: {
    id: string;
    amount: number;
    currency: string;
    status: string;
    created: string;
    paidAt?: string;
    invoiceUrl?: string;
  }[];
  usage: {
    linksUsed: number;
    linksLimit: number;
    clicksCount: number;
    clicksLimit: number;
    customDomains: number;
    customDomainsLimit: number;
  };
  features: {
    maxLinks: number;
    maxClicks: number;
    customDomains: number;
    teamMembers: number;
    analytics: boolean;
    qrCodes: boolean;
    bulkOperations: boolean;
    apiAccess: boolean;
    prioritySupport: boolean;
    whiteLabel: boolean;
  };
}

const plans = [
  {
    id: "free",
    name: "Free",
    price: { monthly: 0, yearly: 0 },
    description: "Perfect for personal use",
    features: [
      "5 links per month",
      "1,000 clicks per month",
      "Basic analytics",
      "Standard domains",
      "Community support",
    ],
    highlighted: false,
  },
  {
    id: "premium",
    name: "Premium",
    price: { monthly: 999, yearly: 9999 },
    description: "Great for professionals",
    features: [
      "Unlimited links",
      "Unlimited clicks",
      "Advanced analytics",
      "3 custom domains",
      "QR code generation",
      "Bulk operations",
      "API access",
      "Email support",
    ],
    highlighted: true,
  },
  {
    id: "enterprise",
    name: "Enterprise",
    price: { monthly: 4999, yearly: 49999 },
    description: "For large organizations",
    features: [
      "Everything in Premium",
      "Unlimited custom domains",
      "Team collaboration",
      "White-label option",
      "SSO integration",
      "Priority support",
      "Custom integrations",
      "Dedicated account manager",
    ],
    highlighted: false,
  },
];

export default function BillingPage() {
  const { user } = useAuth();
  const [data, setData] = useState<BillingData | null>(null);
  const [loading, setLoading] = useState(true);
  const [upgradeLoading, setUpgradeLoading] = useState(false);
  const [billingInterval, setBillingInterval] = useState<"monthly" | "yearly">(
    "monthly"
  );

  useEffect(() => {
    fetchBillingData();
  }, []);

  const fetchBillingData = async () => {
    try {
      setLoading(true);
      const response = await fetch("/api/client/billing");
      if (!response.ok) {
        throw new Error("Failed to fetch billing data");
      }

      const result = await response.json();
      setData(result.data);
    } catch (error) {
      console.error("Error fetching billing data:", error);
      toast.error("Failed to load billing information");
    } finally {
      setLoading(false);
    }
  };

  const handleUpgrade = async (planId: string) => {
    try {
      setUpgradeLoading(true);
      const response = await fetch("/api/client/billing/upgrade", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          plan: planId,
          interval: billingInterval,
        }),
      });

      if (!response.ok) {
        throw new Error("Failed to initiate upgrade");
      }

      const result = await response.json();
      if (result.data.checkoutUrl) {
        window.location.href = result.data.checkoutUrl;
      }
    } catch (error) {
      console.error("Error upgrading plan:", error);
      toast.error("Failed to upgrade plan. Please try again.");
    } finally {
      setUpgradeLoading(false);
    }
  };

  const handleCancelSubscription = async () => {
    try {
      const response = await fetch("/api/client/billing/cancel", {
        method: "POST",
      });

      if (!response.ok) {
        throw new Error("Failed to cancel subscription");
      }

      toast.success("Subscription cancelled successfully");
      fetchBillingData();
    } catch (error) {
      console.error("Error cancelling subscription:", error);
      toast.error("Failed to cancel subscription");
    }
  };

  const handleDownloadInvoice = async (invoiceId: string) => {
    try {
      const response = await fetch(`/api/client/billing/invoice/${invoiceId}`);
      if (!response.ok) {
        throw new Error("Failed to download invoice");
      }

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.style.display = "none";
      a.href = url;
      a.download = `invoice-${invoiceId}.pdf`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
    } catch (error) {
      toast.error("Failed to download invoice");
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
    <div className="container mx-auto py-6 px-4 space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold">Billing & Subscription</h1>
        <p className="text-muted-foreground">
          Manage your subscription and billing information
        </p>
      </div>

      {/* Current Plan */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Crown className="h-5 w-5 text-yellow-500" />
            Current Plan
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-xl font-semibold capitalize">
                {user?.plan || "Free"} Plan
              </h3>
              {data?.subscription && (
                <p className="text-muted-foreground">
                  {formatCurrency(data.subscription.amount / 100)} /{" "}
                  {data.subscription.interval}
                </p>
              )}
            </div>
            <Badge
              variant={
                data?.subscription?.status === "active"
                  ? "default"
                  : data?.subscription?.status === "canceled"
                  ? "destructive"
                  : "secondary"
              }
            >
              {data?.subscription?.status || "Free"}
            </Badge>
          </div>

          {data?.subscription && (
            <div className="grid gap-4 md:grid-cols-2">
              <div className="flex items-center gap-2">
                <Calendar className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm">
                  Next billing: {formatDate(data.subscription.currentPeriodEnd, "PPP")}
                </span>
              </div>
              <div className="flex items-center gap-2">
                <CreditCard className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm">
                  Auto-renewal:{" "}
                  {data.subscription.cancelAtPeriodEnd ? "Off" : "On"}
                </span>
              </div>
            </div>
          )}

          {user?.plan === "free" && (
            <div className="p-4 bg-muted/50 rounded-lg">
              <p className="text-sm text-muted-foreground mb-2">
                Upgrade to unlock premium features and remove limitations
              </p>
              <Button>
                <Crown className="h-4 w-4 mr-2" />
                Upgrade Now
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Usage */}
      <Card>
        <CardHeader>
          <CardTitle>Usage</CardTitle>
          <CardDescription>Your current usage and limits</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 md:grid-cols-3">
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">Links</span>
                <span className="text-sm text-muted-foreground">
                  {data?.usage.linksUsed || 0} /{" "}
                  {data?.usage.linksLimit === -1
                    ? "∞"
                    : data?.usage.linksLimit || 0}
                </span>
              </div>
              <div className="w-full bg-muted rounded-full h-2">
                <div
                  className="bg-primary h-2 rounded-full"
                  style={{
                    width: `${
                      data?.usage.linksLimit === -1
                        ? 100
                        : Math.min(
                            ((data?.usage.linksUsed || 0) /
                              (data?.usage.linksLimit || 1)) *
                              100,
                            100
                          )
                    }%`,
                  }}
                />
              </div>
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">Clicks</span>
                <span className="text-sm text-muted-foreground">
                  {data?.usage.clicksCount || 0} /{" "}
                  {data?.usage.clicksLimit === -1
                    ? "∞"
                    : data?.usage.clicksLimit || 0}
                </span>
              </div>
              <div className="w-full bg-muted rounded-full h-2">
                <div
                  className="bg-primary h-2 rounded-full"
                  style={{
                    width: `${
                      data?.usage.clicksLimit === -1
                        ? 100
                        : Math.min(
                            ((data?.usage.clicksCount || 0) /
                              (data?.usage.clicksLimit || 1)) *
                              100,
                            100
                          )
                    }%`,
                  }}
                />
              </div>
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">Custom Domains</span>
                <span className="text-sm text-muted-foreground">
                  {data?.usage.customDomains || 0} /{" "}
                  {data?.usage.customDomainsLimit === -1
                    ? "∞"
                    : data?.usage.customDomainsLimit || 0}
                </span>
              </div>
              <div className="w-full bg-muted rounded-full h-2">
                <div
                  className="bg-primary h-2 rounded-full"
                  style={{
                    width: `${
                      data?.usage.customDomainsLimit === -1
                        ? 100
                        : Math.min(
                            ((data?.usage.customDomains || 0) /
                              (data?.usage.customDomainsLimit || 1)) *
                              100,
                            100
                          )
                    }%`,
                  }}
                />
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Pricing Plans */}
      {user?.plan === "free" && (
        <Card>
          <CardHeader>
            <CardTitle>Upgrade Your Plan</CardTitle>
            <CardDescription>
              Choose the plan that best fits your needs
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-center gap-4 mb-6">
              <span
                className={
                  billingInterval === "monthly"
                    ? "font-medium"
                    : "text-muted-foreground"
                }
              >
                Monthly
              </span>
              <Button
                variant="outline"
                size="sm"
                onClick={() =>
                  setBillingInterval(
                    billingInterval === "monthly" ? "yearly" : "monthly"
                  )
                }
              >
                {billingInterval === "monthly" ? "Monthly" : "Yearly"}
              </Button>
              <span
                className={
                  billingInterval === "yearly"
                    ? "font-medium"
                    : "text-muted-foreground"
                }
              >
                Yearly
                <Badge variant="secondary" className="ml-2">
                  Save 20%
                </Badge>
              </span>
            </div>

            <div className="grid gap-6 lg:grid-cols-3">
              {plans.map((plan) => (
                <Card
                  key={plan.id}
                  className={`relative ${
                    plan.highlighted ? "border-primary shadow-lg" : ""
                  }`}
                >
                  {plan.highlighted && (
                    <div className="absolute top-0 left-1/2 transform -translate-x-1/2 -translate-y-1/2">
                      <Badge className="px-3 py-1">Most Popular</Badge>
                    </div>
                  )}
                  <CardHeader className="text-center">
                    <CardTitle className="text-xl">{plan.name}</CardTitle>
                    <div className="text-3xl font-bold">
                      {plan.price[billingInterval] === 0
                        ? "Free"
                        : formatCurrency(plan.price[billingInterval] / 100)}
                    </div>
                    {plan.price[billingInterval] > 0 && (
                      <p className="text-sm text-muted-foreground">
                        per {billingInterval === "monthly" ? "month" : "year"}
                      </p>
                    )}
                    <CardDescription>{plan.description}</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <ul className="space-y-2">
                      {plan.features.map((feature, index) => (
                        <li key={index} className="flex items-center gap-2">
                          <CheckCircle className="h-4 w-4 text-green-500" />
                          <span className="text-sm">{feature}</span>
                        </li>
                      ))}
                    </ul>
                    {plan.id !== "free" && (
                      <Button
                        className="w-full"
                        variant={plan.highlighted ? "default" : "outline"}
                        onClick={() => handleUpgrade(plan.id)}
                        disabled={upgradeLoading}
                      >
                        {upgradeLoading ? (
                          <LoadingSpinner size="sm" />
                        ) : (
                          `Upgrade to ${plan.name}`
                        )}
                      </Button>
                    )}
                  </CardContent>
                </Card>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Billing History */}
      {data?.invoices && data.invoices.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Billing History</CardTitle>
            <CardDescription>Your past invoices and payments</CardDescription>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Date</TableHead>
                  <TableHead>Amount</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {data.invoices.map((invoice) => (
                  <TableRow key={invoice.id}>
                    <TableCell>{formatDate(invoice.created, "PPP")}</TableCell>
                    <TableCell>
                      {formatCurrency(invoice.amount / 100, invoice.currency)}
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant={
                          invoice.status === "paid"
                            ? "default"
                            : invoice.status === "open"
                            ? "secondary"
                            : "destructive"
                        }
                      >
                        {invoice.status}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex gap-2">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleDownloadInvoice(invoice.id)}
                        >
                          <Download className="h-4 w-4" />
                        </Button>
                        {invoice.invoiceUrl && (
                          <Button size="sm" variant="outline" asChild>
                            <a
                              href={invoice.invoiceUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                            >
                              <ExternalLink className="h-4 w-4" />
                            </a>
                          </Button>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}

      {/* Subscription Management */}
      {data?.subscription && (
        <Card>
          <CardHeader>
            <CardTitle>Subscription Management</CardTitle>
            <CardDescription>Manage your current subscription</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex gap-4">
              <Button variant="outline">
                <CreditCard className="h-4 w-4 mr-2" />
                Update Payment Method
              </Button>

              <Dialog>
                <DialogTrigger asChild>
                  <Button variant="outline">
                    <AlertCircle className="h-4 w-4 mr-2" />
                    Cancel Subscription
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Cancel Subscription</DialogTitle>
                    <DialogDescription>
                      Are you sure you want to cancel your subscription? You'll
                      lose access to premium features at the end of your current
                      billing period.
                    </DialogDescription>
                  </DialogHeader>
                  <div className="flex gap-2 justify-end">
                    <Button variant="outline">Keep Subscription</Button>
                    <Button
                      variant="destructive"
                      onClick={handleCancelSubscription}
                    >
                      Cancel Subscription
                    </Button>
                  </div>
                </DialogContent>
              </Dialog>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
