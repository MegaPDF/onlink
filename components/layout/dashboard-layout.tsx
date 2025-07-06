// ========== components/layout/dashboard-layout.tsx (REMOVE REDIRECT) ==========
"use client";

import React from "react";
import { MainLayout } from "./main-layout";
import { useAuth } from "@/hooks/use-auth";
import { Skeleton } from "@/components/ui/skeleton";

interface DashboardLayoutProps {
  children: React.ReactNode;
  className?: string;
}

export function DashboardLayout({ children, className }: DashboardLayoutProps) {
  const { user, isAuthenticated, isLoading } = useAuth();

  console.log("🔍 Client DashboardLayout:", {
    isLoading,
    isAuthenticated,
    user: user?.email,
  });

  if (isLoading) {
    console.log("⏳ Showing loading skeleton...");
    return (
      <MainLayout>
        <div className="container mx-auto py-6 px-4">
          <div className="space-y-6">
            <Skeleton className="h-8 w-48" />
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
              {Array.from({ length: 4 }).map((_, i) => (
                <Skeleton key={i} className="h-32" />
              ))}
            </div>
            <Skeleton className="h-64" />
          </div>
        </div>
      </MainLayout>
    );
  }

  // If not authenticated, show minimal placeholder
  // Let server-side redirect handle the actual redirect
  if (!isAuthenticated) {
    console.log("❌ Not authenticated, showing placeholder...");
    return (
      <MainLayout>
        <div className="container mx-auto py-6 px-4">
          <div className="flex items-center justify-center min-h-96">
            <div className="text-center">
              <Skeleton className="h-8 w-64 mx-auto mb-4" />
              <Skeleton className="h-4 w-48 mx-auto" />
            </div>
          </div>
        </div>
      </MainLayout>
    );
  }

  console.log("✅ Rendering authenticated dashboard");
  return <MainLayout className={className}>{children}</MainLayout>;
}
