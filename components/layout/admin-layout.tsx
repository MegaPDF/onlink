"use client";

import React from "react";
import { MainLayout } from "./main-layout";
import { useAuth } from "@/hooks/use-auth";
import { redirect } from "next/navigation";
import { Shield, AlertTriangle } from "lucide-react";
import { Alert, AlertDescription } from "../ui/alert";

interface AdminLayoutProps {
  children: React.ReactNode;
  className?: string;
}

export function AdminLayout({ children, className }: AdminLayoutProps) {
  const { user, isAuthenticated, isLoading } = useAuth();

  if (isLoading) {
    return (
      <MainLayout>
        <div className="container mx-auto py-6 px-4">
          <div className="flex items-center justify-center min-h-96">
            <div className="text-center">
              <Shield className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <p className="text-muted-foreground">Loading admin panel...</p>
            </div>
          </div>
        </div>
      </MainLayout>
    );
  }

  if (!isAuthenticated) {
    redirect("/auth/signin");
  }

  if (user?.role !== "admin") {
    return (
      <MainLayout>
        <div className="container mx-auto py-6 px-4">
          <Alert variant="destructive">
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>
              Access denied. You need administrator privileges to access this
              page.
            </AlertDescription>
          </Alert>
        </div>
      </MainLayout>
    );
  }

  return (
    <MainLayout className={className}>
      <div className="border-b bg-muted/50">
        <div className="container mx-auto px-4 py-3">
          <div className="flex items-center gap-2">
            <Shield className="h-5 w-5 text-red-600" />
            <span className="text-sm font-medium text-red-600">
              Administrator Panel
            </span>
          </div>
        </div>
      </div>
      {children}
    </MainLayout>
  );
}
