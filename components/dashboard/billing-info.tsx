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
  CheckCircle,
} from "lucide-react";
import { Alert, AlertDescription } from "../ui/alert";
import { useAppSettings } from "@/hooks/use-settings";

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
  const settings = useAppSettings(); // Add dynamic settings
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
  const [pricingLoading, setPricingLoading] = useState(true);

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

  // Fetch dynamic pricing plans from API
  useEffect(() => {
    const fetchPricingPlans = async () => {
      try {
        setPricingLoading(true);
        console.log("📊 Fetching dynamic pricing plans...");

        const response = await fetch("/api/pricing");
        const result = await response.json();

        if (result.success && result.data) {
          console.log("✅ Dynamic pricing loaded:", result.data);
          setPricingPlans(result.data);
        } else {
          console.error("❌ Failed to fetch pricing:", result.error);
          // Generate fallback from settings if API fails
          const fallbackPlans = generatePlansFromSettings();
          setPricingPlans(fallbackPlans);
        }
      } catch (error) {
        console.error("❌ Error fetching pricing plans:", error);
        // Generate fallback from settings
        const fallbackPlans = generatePlansFromSettings();
        setPricingPlans(fallbackPlans);
      } finally {
        setPricingLoading(false);
      }
    };

    fetchPricingPlans();
  }, [settings]); // Re-fetch when settings change

  // Generate pricing plans from settings if API fails
  const generatePlansFromSettings = (): PricingPlan[] => {
    if (!settings.defaultLimits) {
      return []; // Return empty if no settings available
    }

    const plans: PricingPlan[] = [];

    // Free Plan
    plans.push({
      id: "free",
      name: "Free",
      description: "Perfect for personal use",
      price: { monthly: 0, yearly: 0 },
      stripePriceIds: { monthly: "", yearly: "" },
      features: {
        maxLinks: settings.defaultLimits.free.linksPerMonth,
        maxClicks: settings.defaultLimits.free.clicksPerMonth,
        customDomains: settings.defaultLimits.free.customDomains,
        analytics: settings.defaultLimits.free.analytics,
        qrCodes: settings.features.enableQRCodes,
        bulkOperations: settings.features.enableBulkOperations,
        apiAccess: settings.features.enableAPIAccess,
        prioritySupport: false,
        whiteLabel: false,
      },
      popular: false,
    });

    // Premium Plan - Use dynamic pricing if available
    plans.push({
      id: "premium",
      name: "Premium",
      description: "For professionals and small businesses",
      price: {
        monthly: 999, // Default fallback
        yearly: 9999,
      },
      stripePriceIds: {
        monthly: "price_premium_monthly",
        yearly: "price_premium_yearly",
      },
      features: {
        maxLinks: settings.defaultLimits.premium.linksPerMonth,
        maxClicks: settings.defaultLimits.premium.clicksPerMonth,
        customDomains: settings.defaultLimits.premium.customDomains,
        analytics: settings.defaultLimits.premium.analytics,
        qrCodes: settings.features.enableQRCodes,
        bulkOperations: settings.features.enableBulkOperations,
        apiAccess: settings.features.enableAPIAccess,
        prioritySupport: false,
        whiteLabel: false,
      },
      popular: true,
      badge: "Most Popular",
    });

    // Enterprise Plan
    plans.push({
      id: "enterprise",
      name: "Enterprise",
      description: "For large organizations",
      price: {
        monthly: 4999, // Default fallback
        yearly: 49999,
      },
      stripePriceIds: {
        monthly: "price_enterprise_monthly",
        yearly: "price_enterprise_yearly",
      },
      features: {
        maxLinks: settings.defaultLimits.enterprise.linksPerMonth,
        maxClicks: settings.defaultLimits.enterprise.clicksPerMonth,
        customDomains: settings.defaultLimits.enterprise.customDomains,
        analytics: settings.defaultLimits.enterprise.analytics,
        qrCodes: settings.features.enableQRCodes,
        bulkOperations: settings.features.enableBulkOperations,
        apiAccess: settings.features.enableAPIAccess,
        prioritySupport: true,
        whiteLabel: settings.features.enableWhiteLabel,
      },
      popular: false,
    });

    return plans;
  };

  // Get current plan limits from dynamic settings
  const getCurrentPlanLimits = () => {
    const currentPlanType = user?.plan || "free";
    return settings.defaultLimits?.[
      currentPlanType as keyof typeof settings.defaultLimits
    ];
  };

  const currentLimits = getCurrentPlanLimits();

  // Handle refresh data
  const handleRefresh = async () => {
    setLoading(true);
    try {
      await refresh();
      // Also refresh pricing plans
      const response = await fetch("/api/pricing");
      const result = await response.json();
      if (result.success) {
        setPricingPlans(result.data);
      }
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

          {/* Dynamic Usage Information */}
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
                    {currentLimits?.linksPerMonth === -1
                      ? " / Unlimited"
                      : ` / ${currentLimits?.linksPerMonth || 0}`}
                  </span>
                </div>
                <Progress
                  value={
                    currentLimits?.linksPerMonth === -1
                      ? 100
                      : Math.min(
                          ((user?.usage?.monthlyLinks || 0) /
                            (currentLimits?.linksPerMonth || 1)) *
                            100,
                          100
                        )
                  }
                  className={`h-2 ${
                    currentLimits?.linksPerMonth !== -1 &&
                    (user?.usage?.monthlyLinks || 0) >=
                      (currentLimits?.linksPerMonth || 0)
                      ? "[&>div]:bg-red-500"
                      : currentLimits?.linksPerMonth !== -1 &&
                        (user?.usage?.monthlyLinks || 0) >=
                          (currentLimits?.linksPerMonth || 0) * 0.8
                      ? "[&>div]:bg-yellow-500"
                      : ""
                  }`}
                />
                {currentLimits?.linksPerMonth !== -1 &&
                  (user?.usage?.monthlyLinks || 0) >=
                    (currentLimits?.linksPerMonth || 0) && (
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
                    {currentLimits?.clicksPerMonth === -1
                      ? " / Unlimited"
                      : ` / ${currentLimits?.clicksPerMonth || 0}`}
                  </span>
                </div>
                <Progress
                  value={
                    currentLimits?.clicksPerMonth === -1
                      ? 100
                      : Math.min(
                          ((user?.usage?.monthlyClicks || 0) /
                            (currentLimits?.clicksPerMonth || 1)) *
                            100,
                          100
                        )
                  }
                  className={`h-2 ${
                    currentLimits?.clicksPerMonth !== -1 &&
                    (user?.usage?.monthlyClicks || 0) >=
                      (currentLimits?.clicksPerMonth || 0)
                      ? "[&>div]:bg-red-500"
                      : currentLimits?.clicksPerMonth !== -1 &&
                        (user?.usage?.monthlyClicks || 0) >=
                          (currentLimits?.clicksPerMonth || 0) * 0.8
                      ? "[&>div]:bg-yellow-500"
                      : ""
                  }`}
                />
                {currentLimits?.clicksPerMonth !== -1 &&
                  (user?.usage?.monthlyClicks || 0) >=
                    (currentLimits?.clicksPerMonth || 0) && (
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

      {/* Dynamic Upgrade Options */}
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
            {pricingLoading ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="h-6 w-6 animate-spin mr-2" />
                <span>Loading pricing plans...</span>
              </div>
            ) : (
              <>
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

                {/* Dynamic Pricing Plans */}
                <div className="grid md:grid-cols-2 gap-4">
                  {pricingPlans
                    .filter(
                      (plan) => plan.id !== "free" && plan.id !== user?.plan
                    )
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
                            <h3 className="text-xl font-semibold">
                              {plan.name}
                            </h3>
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
                                : `${plan.features.maxClicks.toLocaleString()} clicks per month`}
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
                            {plan.features.qrCodes &&
                              settings.features.enableQRCodes && (
                                <li className="flex items-center gap-2 text-sm">
                                  <Check className="h-4 w-4 text-green-500 flex-shrink-0" />
                                  QR code generation
                                </li>
                              )}
                            {plan.features.apiAccess &&
                              settings.features.enableAPIAccess && (
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
                            {plan.features.whiteLabel &&
                              settings.features.enableWhiteLabel && (
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
              </>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
