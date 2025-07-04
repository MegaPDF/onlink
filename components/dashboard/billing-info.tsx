"use client";

import React, { useState } from "react";
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
} from "lucide-react";
import { formatCurrency, formatRelativeTime } from "@/lib/utils";

export function BillingInfo() {
  const { user } = useAuth();
  const {
    subscription,
    invoices,
    currentPlan,
    isActive,
    isTrialing,
    isPastDue,
    canUpgrade,
    openBillingPortal,
    downloadInvoice,
  } = useBilling();
  const toast = useToast();
  const [loading, setLoading] = useState(false);

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

  const pricingPlans = [
    {
      id: "free",
      name: "Free",
      price: { monthly: 0, yearly: 0 },
      description: "Perfect for personal use",
      features: [
        "5 links per month",
        "1,000 clicks per month",
        "Basic analytics",
        "Standard support",
      ],
      limitations: ["No custom domains", "No QR codes", "No team features"],
    },
    {
      id: "premium",
      name: "Premium",
      price: { monthly: 999, yearly: 9999 },
      description: "For professionals and growing businesses",
      features: [
        "Unlimited links",
        "Unlimited clicks",
        "Advanced analytics",
        "Custom domains",
        "QR codes",
        "Bulk operations",
        "Priority support",
      ],
      popular: true,
    },
    {
      id: "enterprise",
      name: "Enterprise",
      price: { monthly: 4999, yearly: 49999 },
      description: "For large organizations",
      features: [
        "Everything in Premium",
        "Team collaboration",
        "White-label solution",
        "API access",
        "SSO integration",
        "Dedicated support",
      ],
    },
  ];

  const getCurrentPlanFeatures = () => {
    return (
      pricingPlans.find((plan) => plan.id === user?.plan) || pricingPlans[0]
    );
  };

  const planInfo = getCurrentPlanFeatures();

  return (
    <div className="space-y-6">
      {/* Current Plan */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            {user?.plan === "enterprise" && (
              <Shield className="h-5 w-5 text-purple-600" />
            )}
            {user?.plan === "premium" && (
              <Crown className="h-5 w-5 text-blue-600" />
            )}
            {user?.plan === "free" && (
              <CreditCard className="h-5 w-5 text-gray-600" />
            )}
            Current Plan: {planInfo.name}
          </CardTitle>
          <CardDescription>{planInfo.description}</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-6 md:grid-cols-2">
            {/* Plan Details */}
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-lg font-semibold">
                  {user?.plan === "free"
                    ? "Free"
                    : formatCurrency(planInfo.price.monthly)}
                  {user?.plan !== "free" && (
                    <span className="text-sm font-normal text-muted-foreground">
                      /month
                    </span>
                  )}
                </span>
                <Badge
                  variant={isActive ? "default" : "secondary"}
                  className={
                    user?.plan === "enterprise"
                      ? "bg-purple-100 text-purple-800"
                      : user?.plan === "premium"
                      ? "bg-blue-100 text-blue-800"
                      : "bg-gray-100 text-gray-800"
                  }
                >
                  {isTrialing ? "Trial" : isActive ? "Active" : "Inactive"}
                </Badge>
              </div>

              {subscription && (
                <div className="space-y-2 text-sm text-muted-foreground">
                  <div className="flex items-center gap-2">
                    <Calendar className="h-4 w-4" />
                    Next billing:{" "}
                    {new Date(
                      subscription.currentPeriodEnd
                    ).toLocaleDateString()}
                  </div>
                  {isPastDue && (
                    <div className="flex items-center gap-2 text-red-600">
                      <AlertTriangle className="h-4 w-4" />
                      Payment past due
                    </div>
                  )}
                </div>
              )}

              {user?.plan !== "free" && (
                <Button
                  variant="outline"
                  onClick={handleManageBilling}
                  disabled={loading}
                  className="w-full"
                >
                  <ExternalLink className="mr-2 h-4 w-4" />
                  Manage Billing
                </Button>
              )}
            </div>

            {/* Usage */}
            <div className="space-y-4">
              <h4 className="font-semibold">Usage This Month</h4>

              <div className="space-y-3">
                <div>
                  <div className="flex justify-between text-sm mb-1">
                    <span>Links Created</span>
                    <span>
                      {user?.usage?.monthlyLinks || 0}
                      {user?.plan === "free" ? " / 5" : " / Unlimited"}
                    </span>
                  </div>
                  <Progress
                    value={
                      user?.plan === "free"
                        ? ((user?.usage?.monthlyLinks || 0) / 5) * 100
                        : 100
                    }
                    className="h-2"
                  />
                </div>

                <div>
                  <div className="flex justify-between text-sm mb-1">
                    <span>Clicks Received</span>
                    <span>
                      {user?.usage?.monthlyClicks || 0}
                      {user?.plan === "free" ? " / 1,000" : " / Unlimited"}
                    </span>
                  </div>
                  <Progress
                    value={
                      user?.plan === "free"
                        ? ((user?.usage?.monthlyClicks || 0) / 1000) * 100
                        : 100
                    }
                    className="h-2"
                  />
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Plan Features */}
      <Card>
        <CardHeader>
          <CardTitle>Plan Features</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-2">
            <div>
              <h4 className="font-semibold mb-3 text-green-600">
                Included Features
              </h4>
              <ul className="space-y-2">
                {planInfo.features.map((feature, index) => (
                  <li key={index} className="flex items-center gap-2">
                    <Check className="h-4 w-4 text-green-600" />
                    <span className="text-sm">{feature}</span>
                  </li>
                ))}
              </ul>
            </div>

            {planInfo.limitations && (
              <div>
                <h4 className="font-semibold mb-3 text-gray-600">
                  Limitations
                </h4>
                <ul className="space-y-2">
                  {planInfo.limitations.map((limitation, index) => (
                    <li key={index} className="flex items-center gap-2">
                      <X className="h-4 w-4 text-gray-400" />
                      <span className="text-sm text-muted-foreground">
                        {limitation}
                      </span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Upgrade CTA */}
      {canUpgrade && (
        <Card className="border-blue-200 bg-blue-50 dark:border-blue-800 dark:bg-blue-950">
          <CardHeader>
            <CardTitle className="text-blue-800 dark:text-blue-200">
              Unlock More Features
            </CardTitle>
            <CardDescription>
              Upgrade your plan to access advanced features and unlimited usage
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex flex-col sm:flex-row gap-4">
              <Button className="flex-1">
                <Crown className="mr-2 h-4 w-4" />
                Upgrade to Premium
              </Button>
              <Button variant="outline" className="flex-1">
                <Shield className="mr-2 h-4 w-4" />
                View Enterprise
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Recent Invoices */}
      {invoices && invoices.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Recent Invoices</CardTitle>
            <CardDescription>
              Your billing history and payment receipts
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {invoices.slice(0, 5).map((invoice) => (
                <div
                  key={invoice.id}
                  className="flex items-center justify-between p-3 border rounded-lg"
                >
                  <div className="space-y-1">
                    <div className="font-medium">
                      {formatCurrency(invoice.amount)} - {invoice.description}
                    </div>
                    <div className="text-sm text-muted-foreground">
                      {new Date(invoice.dueDate).toLocaleDateString()}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge
                      variant={
                        invoice.status === "paid" ? "default" : "destructive"
                      }
                    >
                      {invoice.status}
                    </Badge>
                    {invoice.status === "paid" && (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => downloadInvoice(invoice.id)}
                      >
                        <Download className="h-3 w-3" />
                      </Button>
                    )}
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
