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
import { Progress } from "@/components/ui/progress";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import {
  Crown,
  CreditCard,
  Calendar,
  TrendingUp,
  Check,
  X,
  Zap,
  Star,
  Download,
  Receipt,
  AlertCircle,
  Users,
  Globe,
  BarChart3,
  Shield,
  Smartphone,
  Building,
  Folder,
  LinkIcon,
} from "lucide-react";
import { formatNumber, formatDate } from "@/lib/utils";

interface BillingInfo {
  currentPlan: {
    name: string;
    price: number;
    interval: "monthly" | "yearly";
    features: string[];
    limits: {
      links: number;
      clicks: number;
      folders: number;
      domains: number;
      teamMembers: number;
    };
  };
  usage: {
    links: number;
    clicks: number;
    folders: number;
    domains: number;
    teamMembers: number;
  };
  subscription?: {
    id: string;
    status: string;
    currentPeriodEnd: string;
    cancelAtPeriodEnd: boolean;
  };
  paymentMethod?: {
    brand: string;
    last4: string;
    expiryMonth: number;
    expiryYear: number;
  };
  invoices: Array<{
    id: string;
    amount: number;
    status: string;
    date: string;
    downloadUrl: string;
  }>;
}

const plans = [
  {
    name: "Free",
    price: 0,
    interval: "monthly" as const,
    description: "Perfect for personal use",
    features: [
      "5 links per month",
      "Basic analytics",
      "Standard domains",
      "Community support",
    ],
    limits: {
      links: 5,
      clicks: -1,
      folders: 3,
      domains: 0,
      teamMembers: 0,
    },
    popular: false,
  },
  {
    name: "Premium",
    price: 9,
    interval: "monthly" as const,
    description: "Great for professionals",
    features: [
      "Unlimited links",
      "Advanced analytics",
      "Custom domains",
      "QR code generation",
      "Priority support",
      "Bulk operations",
      "Link expiration",
      "Password protection",
    ],
    limits: {
      links: -1,
      clicks: -1,
      folders: -1,
      domains: 3,
      teamMembers: 0,
    },
    popular: true,
  },
  {
    name: "Team",
    price: 29,
    interval: "monthly" as const,
    description: "Perfect for teams",
    features: [
      "Everything in Premium",
      "Team collaboration",
      "Role-based permissions",
      "Team analytics",
      "Shared domains",
      "Bulk import/export",
      "API access",
      "Priority support",
    ],
    limits: {
      links: -1,
      clicks: -1,
      folders: -1,
      domains: 10,
      teamMembers: 10,
    },
    popular: false,
  },
  {
    name: "Enterprise",
    price: 99,
    interval: "monthly" as const,
    description: "For large organizations",
    features: [
      "Everything in Team",
      "Unlimited team members",
      "Advanced security",
      "SSO integration",
      "Custom integrations",
      "Dedicated support",
      "SLA guarantee",
      "Custom contracts",
    ],
    limits: {
      links: -1,
      clicks: -1,
      folders: -1,
      domains: -1,
      teamMembers: -1,
    },
    popular: false,
  },
];

export default function BillingPage() {
  const { user } = useAuth();
  const toast = useToast();
  const [billingInfo, setBillingInfo] = useState<BillingInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [yearlyBilling, setYearlyBilling] = useState(false);

  useEffect(() => {
    fetchBillingInfo();
  }, []);

  const fetchBillingInfo = async () => {
    try {
      const response = await fetch("/api/client/billing");
      if (response.ok) {
        const data = await response.json();
        setBillingInfo(data.data);
      }
    } catch (error) {
      console.error("Failed to fetch billing info:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleSubscribe = async (planName: string) => {
    try {
      const response = await fetch("/api/client/billing/subscribe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          plan: planName,
          interval: yearlyBilling ? "yearly" : "monthly",
        }),
      });

      const result = await response.json();

      if (response.ok && result.data.checkoutUrl) {
        window.location.href = result.data.checkoutUrl;
      } else {
        throw new Error(result.error || "Failed to create subscription");
      }
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Failed to subscribe"
      );
    }
  };

  const handleCancelSubscription = async () => {
    try {
      const response = await fetch("/api/client/billing/cancel", {
        method: "POST",
      });

      if (response.ok) {
        toast.success(
          "Subscription will be canceled at the end of the billing period"
        );
        fetchBillingInfo();
      } else {
        throw new Error("Failed to cancel subscription");
      }
    } catch (error) {
      toast.error("Failed to cancel subscription");
    }
  };

  const getUsagePercentage = (used: number, limit: number) => {
    if (limit === -1) return 0; // Unlimited
    return Math.min((used / limit) * 100, 100);
  };

  const getUsageColor = (percentage: number) => {
    if (percentage >= 90) return "text-red-600";
    if (percentage >= 75) return "text-orange-600";
    return "text-green-600";
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="h-8 bg-muted animate-pulse rounded" />
        <div className="grid gap-6">
          {Array.from({ length: 3 }).map((_, i) => (
            <Card key={i}>
              <CardContent className="p-6">
                <div className="h-32 bg-muted animate-pulse rounded" />
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Billing & Plans</h1>
        <p className="text-muted-foreground">
          Manage your subscription and billing information
        </p>
      </div>

      <Tabs defaultValue="plans" className="space-y-6">
        <TabsList>
          <TabsTrigger value="plans">Plans & Pricing</TabsTrigger>
          <TabsTrigger value="usage">Usage & Limits</TabsTrigger>
          <TabsTrigger value="billing">Billing History</TabsTrigger>
          <TabsTrigger value="payment">Payment Methods</TabsTrigger>
        </TabsList>

        <TabsContent value="plans">
          <div className="space-y-6">
            {/* Billing Toggle */}
            <Card>
              <CardContent className="p-6">
                <div className="flex items-center justify-center gap-4">
                  <Label htmlFor="yearly-billing">Monthly</Label>
                  <Switch
                    id="yearly-billing"
                    checked={yearlyBilling}
                    onCheckedChange={setYearlyBilling}
                  />
                  <Label htmlFor="yearly-billing">
                    Yearly{" "}
                    <Badge variant="secondary" className="ml-1">
                      Save 20%
                    </Badge>
                  </Label>
                </div>
              </CardContent>
            </Card>

            {/* Current Plan */}
            {billingInfo?.currentPlan && (
              <Card className="border-blue-200 bg-blue-50 dark:border-blue-800 dark:bg-blue-950">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Crown className="h-5 w-5 text-blue-600" />
                    Current Plan: {billingInfo.currentPlan.name}
                  </CardTitle>
                  {billingInfo.subscription && (
                    <CardDescription>
                      {billingInfo.subscription.cancelAtPeriodEnd
                        ? `Cancels on ${formatDate(
                            billingInfo.subscription.currentPeriodEnd
                          )}`
                        : `Renews on ${formatDate(
                            billingInfo.subscription.currentPeriodEnd
                          )}`}
                    </CardDescription>
                  )}
                </CardHeader>
                <CardContent>
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-2xl font-bold">
                        ${billingInfo.currentPlan.price}
                        <span className="text-sm font-normal text-muted-foreground">
                          /{billingInfo.currentPlan.interval}
                        </span>
                      </p>
                    </div>
                    {billingInfo.subscription &&
                      !billingInfo.subscription.cancelAtPeriodEnd && (
                        <Button
                          variant="outline"
                          onClick={handleCancelSubscription}
                        >
                          Cancel Subscription
                        </Button>
                      )}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Plans Grid */}
            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
              {plans.map((plan) => {
                const price = yearlyBilling
                  ? Math.floor(plan.price * 0.8 * 12)
                  : plan.price;
                const isCurrentPlan =
                  billingInfo?.currentPlan.name.toLowerCase() ===
                  plan.name.toLowerCase();

                return (
                  <Card
                    key={plan.name}
                    className={`relative ${
                      plan.popular ? "border-blue-500 shadow-lg" : ""
                    }`}
                  >
                    {plan.popular && (
                      <Badge className="absolute -top-2 left-1/2 transform -translate-x-1/2">
                        Most Popular
                      </Badge>
                    )}

                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        {plan.name === "Free" && <Zap className="h-5 w-5" />}
                        {plan.name === "Premium" && (
                          <Star className="h-5 w-5" />
                        )}
                        {plan.name === "Team" && <Users className="h-5 w-5" />}
                        {plan.name === "Enterprise" && (
                          <Building className="h-5 w-5" />
                        )}
                        {plan.name}
                      </CardTitle>
                      <CardDescription>{plan.description}</CardDescription>
                    </CardHeader>

                    <CardContent className="space-y-4">
                      <div>
                        <div className="text-3xl font-bold">
                          $
                          {yearlyBilling && plan.price > 0 ? price : plan.price}
                        </div>
                        <div className="text-sm text-muted-foreground">
                          per {yearlyBilling ? "year" : "month"}
                        </div>
                        {yearlyBilling && plan.price > 0 && (
                          <div className="text-sm text-green-600">
                            Save ${plan.price * 12 - price}/year
                          </div>
                        )}
                      </div>

                      <ul className="space-y-2 text-sm">
                        {plan.features.map((feature, index) => (
                          <li key={index} className="flex items-center gap-2">
                            <Check className="h-4 w-4 text-green-600" />
                            {feature}
                          </li>
                        ))}
                      </ul>

                      <Button
                        className="w-full"
                        variant={
                          isCurrentPlan
                            ? "secondary"
                            : plan.popular
                            ? "default"
                            : "outline"
                        }
                        disabled={isCurrentPlan || plan.name === "Free"}
                        onClick={() =>
                          plan.name !== "Free" && handleSubscribe(plan.name)
                        }
                      >
                        {isCurrentPlan
                          ? "Current Plan"
                          : plan.name === "Free"
                          ? "Free Forever"
                          : `Choose ${plan.name}`}
                      </Button>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          </div>
        </TabsContent>

        <TabsContent value="usage">
          {billingInfo && (
            <div className="grid gap-6 md:grid-cols-2">
              {/* Links Usage */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <LinkIcon className="h-5 w-5" />
                    Links
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span>Used</span>
                      <span>
                        {formatNumber(billingInfo.usage.links)}
                        {billingInfo.currentPlan.limits.links === -1
                          ? " / Unlimited"
                          : ` / ${formatNumber(
                              billingInfo.currentPlan.limits.links
                            )}`}
                      </span>
                    </div>
                    {billingInfo.currentPlan.limits.links !== -1 && (
                      <Progress
                        value={getUsagePercentage(
                          billingInfo.usage.links,
                          billingInfo.currentPlan.limits.links
                        )}
                        className="w-full"
                      />
                    )}
                  </div>
                </CardContent>
              </Card>

              {/* Folders Usage */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Folder className="h-5 w-5" />
                    Folders
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span>Used</span>
                      <span>
                        {billingInfo.usage.folders}
                        {billingInfo.currentPlan.limits.folders === -1
                          ? " / Unlimited"
                          : ` / ${billingInfo.currentPlan.limits.folders}`}
                      </span>
                    </div>
                    {billingInfo.currentPlan.limits.folders !== -1 && (
                      <Progress
                        value={getUsagePercentage(
                          billingInfo.usage.folders,
                          billingInfo.currentPlan.limits.folders
                        )}
                        className="w-full"
                      />
                    )}
                  </div>
                </CardContent>
              </Card>

              {/* Domains Usage */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Globe className="h-5 w-5" />
                    Custom Domains
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span>Used</span>
                      <span>
                        {billingInfo.usage.domains}
                        {billingInfo.currentPlan.limits.domains === -1
                          ? " / Unlimited"
                          : billingInfo.currentPlan.limits.domains === 0
                          ? " / Not Available"
                          : ` / ${billingInfo.currentPlan.limits.domains}`}
                      </span>
                    </div>
                    {billingInfo.currentPlan.limits.domains > 0 && (
                      <Progress
                        value={getUsagePercentage(
                          billingInfo.usage.domains,
                          billingInfo.currentPlan.limits.domains
                        )}
                        className="w-full"
                      />
                    )}
                  </div>
                </CardContent>
              </Card>

              {/* Team Members Usage */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Users className="h-5 w-5" />
                    Team Members
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span>Used</span>
                      <span>
                        {billingInfo.usage.teamMembers}
                        {billingInfo.currentPlan.limits.teamMembers === -1
                          ? " / Unlimited"
                          : billingInfo.currentPlan.limits.teamMembers === 0
                          ? " / Not Available"
                          : ` / ${billingInfo.currentPlan.limits.teamMembers}`}
                      </span>
                    </div>
                    {billingInfo.currentPlan.limits.teamMembers > 0 && (
                      <Progress
                        value={getUsagePercentage(
                          billingInfo.usage.teamMembers,
                          billingInfo.currentPlan.limits.teamMembers
                        )}
                        className="w-full"
                      />
                    )}
                  </div>
                </CardContent>
              </Card>
            </div>
          )}
        </TabsContent>

        <TabsContent value="billing">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Receipt className="h-5 w-5" />
                Billing History
              </CardTitle>
              <CardDescription>View and download your invoices</CardDescription>
            </CardHeader>
            <CardContent>
              {billingInfo?.invoices?.length ? (
                <div className="space-y-4">
                  {billingInfo.invoices.map((invoice) => (
                    <div
                      key={invoice.id}
                      className="flex items-center justify-between p-4 border rounded-lg"
                    >
                      <div>
                        <div className="font-medium">
                          ${invoice.amount.toFixed(2)}
                        </div>
                        <div className="text-sm text-muted-foreground">
                          {formatDate(invoice.date)}
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        <Badge
                          variant={
                            invoice.status === "paid" ? "default" : "secondary"
                          }
                        >
                          {invoice.status}
                        </Badge>
                        <Button variant="outline" size="sm" asChild>
                          <a
                            href={invoice.downloadUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                          >
                            <Download className="mr-2 h-4 w-4" />
                            Download
                          </a>
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  <Receipt className="mx-auto h-12 w-12 mb-4 opacity-50" />
                  <p>No invoices yet</p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="payment">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <CreditCard className="h-5 w-5" />
                Payment Methods
              </CardTitle>
              <CardDescription>Manage your payment methods</CardDescription>
            </CardHeader>
            <CardContent>
              {billingInfo?.paymentMethod ? (
                <div className="flex items-center justify-between p-4 border rounded-lg">
                  <div className="flex items-center gap-3">
                    <CreditCard className="h-8 w-8 text-muted-foreground" />
                    <div>
                      <div className="font-medium">
                        **** **** **** {billingInfo.paymentMethod.last4}
                      </div>
                      <div className="text-sm text-muted-foreground">
                        {billingInfo.paymentMethod.brand.toUpperCase()} •
                        Expires {billingInfo.paymentMethod.expiryMonth}/
                        {billingInfo.paymentMethod.expiryYear}
                      </div>
                    </div>
                  </div>
                  <Button variant="outline" size="sm">
                    Update
                  </Button>
                </div>
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  <CreditCard className="mx-auto h-12 w-12 mb-4 opacity-50" />
                  <p>No payment method on file</p>
                  <Button className="mt-4">Add Payment Method</Button>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
