"use client";

import React from "react";
import { BillingInfo } from "@/components/dashboard/billing-info";

export default function BillingPage() {
  return (
    <div className="container mx-auto py-6 px-4 max-w-4xl">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold">Billing & Subscription</h1>
        <p className="text-muted-foreground">
          Manage your subscription and billing information
        </p>
      </div>

      {/* Billing Info Component */}
      <BillingInfo />
    </div>
  );
}
