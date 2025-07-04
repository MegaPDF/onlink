"use client";

import React from "react";
import { useAuth } from "@/hooks/use-auth";
import { AnalyticsDashboard } from "@/components/dashboard/analytics-dashboard";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Crown } from "lucide-react";
import Link from "next/link";

export default function AnalyticsPage() {
  const { user } = useAuth();

  // If user is on free plan, show upgrade prompt
  if (user?.plan === "free") {
    return (
      <div className="container mx-auto py-6 px-4 max-w-4xl">
        <div className="text-center space-y-6">
          <div className="mx-auto w-20 h-20 bg-primary/10 rounded-full flex items-center justify-center">
            <Crown className="h-10 w-10 text-primary" />
          </div>

          <div className="space-y-2">
            <h1 className="text-3xl font-bold">Analytics Premium Feature</h1>
            <p className="text-muted-foreground text-lg">
              Unlock detailed analytics and insights about your links
            </p>
          </div>

          <Card className="max-w-2xl mx-auto text-left">
            <CardHeader>
              <CardTitle>What you'll get with Premium:</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-3">
                  <div className="flex items-center gap-3">
                    <div className="w-2 h-2 bg-primary rounded-full" />
                    <span>Detailed click analytics</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="w-2 h-2 bg-primary rounded-full" />
                    <span>Geographic insights</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="w-2 h-2 bg-primary rounded-full" />
                    <span>Device & browser data</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="w-2 h-2 bg-primary rounded-full" />
                    <span>Referrer tracking</span>
                  </div>
                </div>

                <div className="space-y-3">
                  <div className="flex items-center gap-3">
                    <div className="w-2 h-2 bg-primary rounded-full" />
                    <span>Performance trends</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="w-2 h-2 bg-primary rounded-full" />
                    <span>Export capabilities</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="w-2 h-2 bg-primary rounded-full" />
                    <span>Real-time tracking</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="w-2 h-2 bg-primary rounded-full" />
                    <span>Custom date ranges</span>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link href="/dashboard/billing">
              <Button size="lg" className="w-full sm:w-auto">
                <Crown className="h-4 w-4 mr-2" />
                Upgrade to Premium
              </Button>
            </Link>
            <Link href="/dashboard">
              <Button variant="outline" size="lg" className="w-full sm:w-auto">
                Back to Dashboard
              </Button>
            </Link>
          </div>

          <div className="text-sm text-muted-foreground">
            Start your free trial today • No credit card required
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-6 px-4 max-w-7xl">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold">Analytics Dashboard</h1>
        <p className="text-muted-foreground">
          Detailed insights into your link performance
        </p>
      </div>

      {/* Analytics Dashboard Component */}
      <AnalyticsDashboard showUrlSelector={true} />
    </div>
  );
}
