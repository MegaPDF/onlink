"use client";

import React, { useState, useEffect } from "react";
import { useBilling } from "@/hooks/use-billing";
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
import { Progress } from "@/components/ui/progress";
import { Separator } from "@/components/ui/separator";
import {
  CreditCard,
  Crown,
  Shield,
  Check,
  X,
  Calendar,
  Download,
  ExternalLink,
  Zap,
  AlertTriangle,
  Loader2,
  Plus,
  RefreshCw,
  Receipt,
} from "lucide-react";

interface PricingPlan {
  id: string;
  name: string;
  description: string;
  price: {
    monthly: number;
    yearly: number;
  };
  stripePriceIds: {
    monthly: string;
    yearly: string;
  };
  features: {
    maxLinks: number;
    maxClicks: number;
    customDomains: number;
    analytics: boolean;
    qrCodes: boolean;
    bulkOperations: boolean;
    apiAccess: boolean;
    prioritySupport: boolean;
    whiteLabel: boolean;
  };
  popular?: boolean;
  badge?: string;
}

export function BillingInfo() {
  const { user } = useAuth() as {
    user?: { plan?: string; usage?: UserUsage; [key: string]: any };
  };
  const {
    subscription,
    invoices,
    paymentMethods,
    currentPlan,
    isActive,
    isTrialing,
    isPastDue,
    isCanceled,
    canUpgrade,
    createSubscription,
    openBillingPortal,
    downloadInvoice,
    refresh,
    isLoading,
    error,
  } = useBilling();

  const toast = useToast();
  const [loading, setLoading] = useState(false);
  const [selectedInterval, setSelectedInterval] = useState<"month" | "year">(
    "month"
  );
  const [pricingPlans, setPricingPlans] = useState<PricingPlan[]>([]);

  // Extend usage type to include resetDate
  type UserUsage = {
    monthlyLinks?: number;
    monthlyClicks?: number;
    resetDate?: string;
  };

  // Free plan users are always active
  const isUserActive = user?.plan === "free" ? true : isActive;
  const userStatus =
    user?.plan === "free"
      ? "active"
      : isTrialing
      ? "trialing"
      : isActive
      ? "active"
      : isPastDue
      ? "past_due"
      : isCanceled
      ? "canceled"
      : "inactive";

  // Fetch dynamic pricing plans
  useEffect(() => {
    const fetchPricingPlans = async () => {
      try {
        const response = await fetch("/api/pricing");
        const result = await response.json();

        if (result.success) {
          setPricingPlans(result.data);
        }
      } catch (error) {
        console.error("Failed to fetch pricing plans:", error);
        // Fallback to default plans if API fails
        setPricingPlans(getDefaultPlans());
      }
    };

    fetchPricingPlans();
  }, []);

  // Fallback default plans
  const getDefaultPlans = (): PricingPlan[] => [
    {
      id: "free",
      name: "Free",
      description: "Perfect for personal use",
      price: { monthly: 0, yearly: 0 },
      stripePriceIds: { monthly: "", yearly: "" },
      features: {
        maxLinks: 5,
        maxClicks: 1000,
        customDomains: 0,
        analytics: false,
        qrCodes: false,
        bulkOperations: false,
        apiAccess: false,
        prioritySupport: false,
        whiteLabel: false,
      },
      popular: false,
    },
    {
      id: "premium",
      name: "Premium",
      description: "For professionals and small businesses",
      price: { monthly: 999, yearly: 9999 },
      stripePriceIds: {
        monthly: "price_premium_monthly",
        yearly: "price_premium_yearly",
      },
      features: {
        maxLinks: -1,
        maxClicks: -1,
        customDomains: 3,
        analytics: true,
        qrCodes: true,
        bulkOperations: true,
        apiAccess: true,
        prioritySupport: false,
        whiteLabel: false,
      },
      popular: true,
      badge: "Most Popular",
    },
    {
      id: "enterprise",
      name: "Enterprise",
      description: "For large organizations",
      price: { monthly: 4999, yearly: 49999 },
      stripePriceIds: {
        monthly: "price_enterprise_monthly",
        yearly: "price_enterprise_yearly",
      },
      features: {
        maxLinks: -1,
        maxClicks: -1,
        customDomains: -1,
        analytics: true,
        qrCodes: true,
        bulkOperations: true,
        apiAccess: true,
        prioritySupport: true,
        whiteLabel: true,
      },
      popular: false,
    },
  ];

  // Handle refresh data
  const handleRefresh = async () => {
    setLoading(true);
    try {
      await refresh();
      toast.success("Billing data refreshed");
    } catch (error) {
      toast.error("Failed to refresh data");
    } finally {
      setLoading(false);
    }
  };

  const handleManageBilling = async () => {
    setLoading(true);
    try {
      await openBillingPortal();
    } catch (error) {
      toast.error("Failed to open billing portal");
    } finally {
      setLoading(false);
    }
  };

  const handleUpgrade = async (planId: string) => {
    setLoading(true);
    try {
      const plan = pricingPlans.find((p) => p.id === planId);
      if (!plan) return;

      const priceId =
        selectedInterval === "month"
          ? plan.stripePriceIds.monthly
          : plan.stripePriceIds.yearly;

      const result = await createSubscription({
        priceId,
        billingInfo: {
          email: user?.email || "",
          name: user?.name || "",
        },
      });

      if (result.success) {
        toast.success("Redirecting to checkout...");
      } else {
        toast.error(result.error || "Failed to create subscription");
      }
    } catch (error) {
      toast.error("Failed to upgrade subscription");
    } finally {
      setLoading(false);
    }
  };

  const handleDownloadInvoice = async (invoiceId: string) => {
    try {
      await downloadInvoice(invoiceId);
    } catch (error) {
      toast.error("Failed to download invoice");
    }
  };

  const formatCurrency = (amount: number, currency: string = "USD"): string => {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: currency,
    }).format(amount);
  };

  if (isLoading && !subscription && !invoices) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-6 w-6 animate-spin mr-2" />
        <span>Loading billing information...</span>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Error Display */}
      {error && (
        <Card className="border-red-200 bg-red-50">
          <CardContent className="pt-6">
            <div className="flex items-center gap-2 text-red-600">
              <AlertTriangle className="h-4 w-4" />
              <span>{error}</span>
              <Button
                variant="ghost"
                size="sm"
                onClick={handleRefresh}
                disabled={loading}
              >
                <RefreshCw className="h-4 w-4" />
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Current Subscription */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Crown className="h-5 w-5" />
                Current Subscription
              </CardTitle>
              <CardDescription>
                Manage your current plan and billing information
              </CardDescription>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={handleRefresh}
              disabled={loading}
            >
              <RefreshCw
                className={`h-4 w-4 mr-2 ${loading ? "animate-spin" : ""}`}
              />
              Refresh
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Current Plan Status */}
          <div className="flex items-center justify-between p-4 border rounded-lg">
            <div className="space-y-2">
              <div className="flex items-center gap-3">
                <h3 className="text-lg font-semibold">
                  {currentPlan?.name || user?.plan?.toUpperCase() || "FREE"}{" "}
                  Plan
                </h3>
                <Badge
                  variant={
                    isUserActive
                      ? "default"
                      : isPastDue
                      ? "destructive"
                      : "secondary"
                  }
                >
                  {user?.plan === "free"
                    ? "Active"
                    : isTrialing
                    ? "Trial"
                    : isUserActive
                    ? "Active"
                    : isPastDue
                    ? "Past Due"
                    : isCanceled
                    ? "Canceled"
                    : "Inactive"}
                </Badge>
              </div>

              {user?.plan === "free" ? (
                <div className="space-y-1 text-sm text-muted-foreground">
                  <div className="flex items-center gap-2">
                    <Crown className="h-4 w-4" />
                    Free plan with basic features
                  </div>
                  <div className="flex items-center gap-2">
                    <Calendar className="h-4 w-4" />
                    Upgrade anytime for unlimited access
                  </div>
                </div>
              ) : subscription ? (
                <div className="space-y-1 text-sm text-muted-foreground">
                  <div className="flex items-center gap-2">
                    <Calendar className="h-4 w-4" />
                    Next billing:{" "}
                    {new Date(
                      subscription.currentPeriodEnd
                    ).toLocaleDateString()}
                  </div>
                  <div className="flex items-center gap-2">
                    <CreditCard className="h-4 w-4" />
                    {formatCurrency(subscription.amount / 100)} /{" "}
                    {subscription.interval}
                  </div>
                  {isPastDue && (
                    <div className="flex items-center gap-2 text-red-600">
                      <AlertTriangle className="h-4 w-4" />
                      Payment past due
                    </div>
                  )}
                </div>
              ) : null}
            </div>

            {user?.plan === "free" ? (
              <Button
                onClick={() => {
                  // Scroll to upgrade section
                  const upgradeSection =
                    document.getElementById("upgrade-section");
                  upgradeSection?.scrollIntoView({ behavior: "smooth" });
                }}
                className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700"
              >
                <Crown className="mr-2 h-4 w-4" />
                Upgrade Plan
              </Button>
            ) : subscription ? (
              <Button
                variant="outline"
                onClick={handleManageBilling}
                disabled={loading}
              >
                <ExternalLink className="mr-2 h-4 w-4" />
                Manage Billing
              </Button>
            ) : null}
          </div>

          {/* Usage Information */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h4 className="font-semibold">Usage This Month</h4>
              {user?.plan === "free" && (
                <Badge variant="outline" className="text-xs">
                  Free Plan Limits
                </Badge>
              )}
            </div>

            <div className="grid md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span>Links Created</span>
                  <span>
                    {user?.usage?.monthlyLinks || 0}
                    {user?.plan === "free" ? " / 5" : " / Unlimited"}
                  </span>
                </div>
                <Progress
                  value={
                    user?.plan === "free"
                      ? Math.min(
                          ((user?.usage?.monthlyLinks || 0) / 5) * 100,
                          100
                        )
                      : 100
                  }
                  className={`h-2 ${
                    user?.plan === "free" &&
                    (user?.usage?.monthlyLinks || 0) >= 5
                      ? "[&>div]:bg-red-500"
                      : user?.plan === "free" &&
                        (user?.usage?.monthlyLinks || 0) >= 4
                      ? "[&>div]:bg-yellow-500"
                      : ""
                  }`}
                />
                {user?.plan === "free" &&
                  (user?.usage?.monthlyLinks || 0) >= 5 && (
                    <p className="text-xs text-red-600 font-medium">
                      ⚠️ Monthly limit reached. Upgrade to create unlimited
                      links.
                    </p>
                  )}
              </div>

              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span>Clicks Received</span>
                  <span>
                    {user?.usage?.monthlyClicks || 0}
                    {user?.plan === "free" ? " / 1,000" : " / Unlimited"}
                  </span>
                </div>
                <Progress
                  value={
                    user?.plan === "free"
                      ? Math.min(
                          ((user?.usage?.monthlyClicks || 0) / 1000) * 100,
                          100
                        )
                      : 100
                  }
                  className={`h-2 ${
                    user?.plan === "free" &&
                    (user?.usage?.monthlyClicks || 0) >= 1000
                      ? "[&>div]:bg-red-500"
                      : user?.plan === "free" &&
                        (user?.usage?.monthlyClicks || 0) >= 800
                      ? "[&>div]:bg-yellow-500"
                      : ""
                  }`}
                />
                {user?.plan === "free" &&
                  (user?.usage?.monthlyClicks || 0) >= 1000 && (
                    <p className="text-xs text-red-600 font-medium">
                      ⚠️ Monthly click limit reached.
                    </p>
                  )}
              </div>
            </div>

            {/* Usage reset info for free plan */}
            {user?.plan === "free" && user?.usage?.resetDate && (
              <div className="text-xs text-muted-foreground">
                Usage resets on{" "}
                {new Date(user.usage.resetDate).toLocaleDateString()}
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Free Plan Benefits */}
      {user?.plan === "free" && (
        <Card className="border-blue-200 bg-gradient-to-r from-blue-50 to-indigo-50">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-blue-900">
              <Crown className="h-5 w-5" />
              You're on the Free Plan
            </CardTitle>
            <CardDescription className="text-blue-700">
              Enjoying the free features? Upgrade to unlock the full potential
              of your links.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <h5 className="font-medium text-blue-900">
                  What you get with Free:
                </h5>
                <ul className="text-sm space-y-1 text-blue-800">
                  <li className="flex items-center gap-2">
                    <Check className="h-3 w-3 text-green-600" />5 links per
                    month
                  </li>
                  <li className="flex items-center gap-2">
                    <Check className="h-3 w-3 text-green-600" />
                    1,000 clicks per month
                  </li>
                  <li className="flex items-center gap-2">
                    <Check className="h-3 w-3 text-green-600" />
                    Basic link management
                  </li>
                  <li className="flex items-center gap-2">
                    <Check className="h-3 w-3 text-green-600" />
                    Community support
                  </li>
                </ul>
              </div>
              <div className="space-y-2">
                <h5 className="font-medium text-blue-900">Upgrade to get:</h5>
                <ul className="text-sm space-y-1 text-blue-800">
                  <li className="flex items-center gap-2">
                    <Crown className="h-3 w-3 text-amber-500" />
                    Unlimited links & clicks
                  </li>
                  <li className="flex items-center gap-2">
                    <Crown className="h-3 w-3 text-amber-500" />
                    Advanced analytics
                  </li>
                  <li className="flex items-center gap-2">
                    <Crown className="h-3 w-3 text-amber-500" />
                    Custom domains
                  </li>
                  <li className="flex items-center gap-2">
                    <Crown className="h-3 w-3 text-amber-500" />
                    QR codes & bulk operations
                  </li>
                </ul>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Payment Methods - Only for paid plans */}
      {user?.plan !== "free" && subscription && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CreditCard className="h-5 w-5" />
              Payment Methods
            </CardTitle>
            <CardDescription>
              Manage your payment methods and billing information
            </CardDescription>
          </CardHeader>
          <CardContent>
            {paymentMethods?.length > 0 ? (
              <div className="space-y-3">
                {paymentMethods.map((method) => (
                  <div
                    key={method.id}
                    className="flex items-center justify-between p-3 border rounded-lg"
                  >
                    <div className="flex items-center gap-3">
                      <CreditCard className="h-4 w-4" />
                      <div>
                        <div className="font-medium">
                          **** **** **** {method.card?.last4}
                        </div>
                        <div className="text-sm text-muted-foreground">
                          {method.card?.brand?.toUpperCase()} • Expires{" "}
                          {method.card?.expMonth}/{method.card?.expYear}
                        </div>
                      </div>
                    </div>
                    {method.isDefault && (
                      <Badge variant="secondary">Default</Badge>
                    )}
                  </div>
                ))}
                <Button
                  variant="outline"
                  onClick={handleManageBilling}
                  disabled={loading}
                  className="w-full"
                >
                  <Plus className="mr-2 h-4 w-4" />
                  Add Payment Method
                </Button>
              </div>
            ) : (
              <div className="text-center py-6">
                <CreditCard className="h-8 w-8 mx-auto mb-2 text-muted-foreground" />
                <p className="text-muted-foreground mb-4">
                  No payment methods found
                </p>
                <Button
                  variant="outline"
                  onClick={handleManageBilling}
                  disabled={loading}
                >
                  <Plus className="mr-2 h-4 w-4" />
                  Add Payment Method
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Invoices - Only for paid plans */}
      {user?.plan !== "free" && subscription && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Receipt className="h-5 w-5" />
              Recent Invoices
            </CardTitle>
            <CardDescription>
              Download and view your billing history
            </CardDescription>
          </CardHeader>
          <CardContent>
            {invoices?.length > 0 ? (
              <div className="space-y-3">
                {invoices.slice(0, 5).map((invoice) => (
                  <div
                    key={invoice.id}
                    className="flex items-center justify-between p-3 border rounded-lg"
                  >
                    <div className="space-y-1">
                      <div className="font-medium">
                        {formatCurrency(invoice.amount / 100)}
                      </div>
                      <div className="text-sm text-muted-foreground">
                        {new Date(invoice.dueDate).toLocaleDateString()} •{" "}
                        {invoice.description}
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge
                        variant={
                          invoice.status === "paid"
                            ? "default"
                            : invoice.status === "pending"
                            ? "secondary"
                            : "destructive"
                        }
                      >
                        {invoice.status}
                      </Badge>
                      {invoice.status === "paid" && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleDownloadInvoice(invoice.id)}
                        >
                          <Download className="h-4 w-4" />
                        </Button>
                      )}
                    </div>
                  </div>
                ))}
                {invoices.length > 5 && (
                  <Button
                    variant="outline"
                    onClick={handleManageBilling}
                    disabled={loading}
                    className="w-full"
                  >
                    View All Invoices
                  </Button>
                )}
              </div>
            ) : (
              <div className="text-center py-6">
                <Receipt className="h-8 w-8 mx-auto mb-2 text-muted-foreground" />
                <p className="text-muted-foreground">No invoices found</p>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Upgrade Options */}
      {user?.plan !== "enterprise" && (
        <Card id="upgrade-section">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Zap className="h-5 w-5" />
              Upgrade Your Plan
            </CardTitle>
            <CardDescription>
              Unlock more features and higher limits
            </CardDescription>
          </CardHeader>
          <CardContent>
            {/* Billing Interval Toggle */}
            <div className="flex items-center justify-center mb-6">
              <div className="flex items-center bg-muted rounded-lg p-1">
                <button
                  onClick={() => setSelectedInterval("month")}
                  className={`px-3 py-1 rounded-md text-sm font-medium transition-colors ${
                    selectedInterval === "month"
                      ? "bg-background shadow-sm"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  Monthly
                </button>
                <button
                  onClick={() => setSelectedInterval("year")}
                  className={`px-3 py-1 rounded-md text-sm font-medium transition-colors ${
                    selectedInterval === "year"
                      ? "bg-background shadow-sm"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  Yearly
                  <Badge variant="secondary" className="ml-2">
                    Save 20%
                  </Badge>
                </button>
              </div>
            </div>

            {/* Pricing Plans */}
            <div className="grid md:grid-cols-2 gap-4">
              {pricingPlans
                .filter((plan) => plan.id !== "free" && plan.id !== user?.plan)
                .map((plan) => (
                  <div
                    key={plan.id}
                    className={`border rounded-lg p-6 ${
                      plan.popular ? "border-primary bg-primary/5" : ""
                    }`}
                  >
                    {plan.popular && plan.badge && (
                      <Badge className="mb-4">{plan.badge}</Badge>
                    )}

                    <div className="space-y-4">
                      <div>
                        <h3 className="text-xl font-semibold">{plan.name}</h3>
                        <p className="text-sm text-muted-foreground">
                          {plan.description}
                        </p>
                      </div>

                      <div className="flex items-baseline gap-1">
                        <span className="text-3xl font-bold">
                          {formatCurrency(
                            (selectedInterval === "month"
                              ? plan.price.monthly
                              : plan.price.yearly) / 100
                          )}
                        </span>
                        <span className="text-muted-foreground">
                          /{selectedInterval === "month" ? "month" : "year"}
                        </span>
                      </div>

                      <ul className="space-y-2">
                        {/* Show dynamic features based on plan limits */}
                        <li className="flex items-center gap-2 text-sm">
                          <Check className="h-4 w-4 text-green-500 flex-shrink-0" />
                          {plan.features.maxLinks === -1
                            ? "Unlimited links"
                            : `${plan.features.maxLinks} links per month`}
                        </li>
                        <li className="flex items-center gap-2 text-sm">
                          <Check className="h-4 w-4 text-green-500 flex-shrink-0" />
                          {plan.features.maxClicks === -1
                            ? "Unlimited clicks"
                            : `${plan.features.maxClicks} clicks per month`}
                        </li>
                        {plan.features.analytics && (
                          <li className="flex items-center gap-2 text-sm">
                            <Check className="h-4 w-4 text-green-500 flex-shrink-0" />
                            Advanced analytics
                          </li>
                        )}
                        {plan.features.customDomains > 0 && (
                          <li className="flex items-center gap-2 text-sm">
                            <Check className="h-4 w-4 text-green-500 flex-shrink-0" />
                            {plan.features.customDomains === -1
                              ? "Unlimited custom domains"
                              : `${plan.features.customDomains} custom domains`}
                          </li>
                        )}
                        {plan.features.qrCodes && (
                          <li className="flex items-center gap-2 text-sm">
                            <Check className="h-4 w-4 text-green-500 flex-shrink-0" />
                            QR code generation
                          </li>
                        )}
                        {plan.features.apiAccess && (
                          <li className="flex items-center gap-2 text-sm">
                            <Check className="h-4 w-4 text-green-500 flex-shrink-0" />
                            API access
                          </li>
                        )}
                        {plan.features.prioritySupport && (
                          <li className="flex items-center gap-2 text-sm">
                            <Check className="h-4 w-4 text-green-500 flex-shrink-0" />
                            Priority support
                          </li>
                        )}
                        {plan.features.whiteLabel && (
                          <li className="flex items-center gap-2 text-sm">
                            <Check className="h-4 w-4 text-green-500 flex-shrink-0" />
                            White-label solution
                          </li>
                        )}
                      </ul>

                      <Button
                        onClick={() => handleUpgrade(plan.id)}
                        disabled={loading}
                        className="w-full"
                        variant={plan.popular ? "default" : "outline"}
                      >
                        {loading ? (
                          <Loader2 className="h-4 w-4 animate-spin mr-2" />
                        ) : (
                          <Crown className="h-4 w-4 mr-2" />
                        )}
                        Upgrade to {plan.name}
                      </Button>
                    </div>
                  </div>
                ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
