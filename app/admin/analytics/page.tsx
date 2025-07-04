"use client";

import React from "react";
import { AnalyticsDashboard } from "@/components/dashboard/analytics-dashboard";

export default function AdminAnalyticsPage() {
  return (
    <div className="container mx-auto py-6 px-4">
      <div className="mb-8">
        <h1 className="text-3xl font-bold">System Analytics</h1>
        <p className="text-muted-foreground">
          Platform-wide analytics and insights
        </p>
      </div>

      <AnalyticsDashboard showUrlSelector={false} />
    </div>
  );
}
