"use client";

import React from "react";
import Link from "next/link";
import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  AlertTriangle,
  Mail,
  Shield,
  ArrowLeft,
  RefreshCw,
  Link as LinkIcon,
} from "lucide-react";

export default function AccountInactivePage() {
  const { user, logout } = useAuth();

  const handleContactSupport = () => {
    window.open(
      "mailto:support@yourapp.com?subject=Account Activation Request",
      "_blank"
    );
  };

  const handleRefresh = () => {
    window.location.reload();
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background px-4 py-8">
      <div className="w-full max-w-md space-y-6">
        {/* Header */}
        <div className="text-center space-y-2">
          <Link
            href="/"
            className="inline-flex items-center space-x-2 text-primary"
          >
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary text-primary-foreground">
              <LinkIcon className="h-4 w-4" />
            </div>
            <span className="font-bold text-xl">ShortLink</span>
          </Link>
          <h1 className="text-2xl font-bold">Account Inactive</h1>
          <p className="text-muted-foreground">
            Your account is currently inactive and requires activation
          </p>
        </div>

        {/* Main Card */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Shield className="h-5 w-5 text-orange-500" />
              Account Status
            </CardTitle>
            <CardDescription>
              Your account ({user?.email}) is currently inactive
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <Alert>
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>
                Your account has been deactivated. This could be due to:
                <ul className="mt-2 list-disc list-inside text-sm space-y-1">
                  <li>Administrative action</li>
                  <li>Account verification pending</li>
                  <li>Terms of service violation</li>
                  <li>Security concerns</li>
                </ul>
              </AlertDescription>
            </Alert>

            <div className="space-y-3">
              <Button
                onClick={handleContactSupport}
                className="w-full"
                variant="default"
              >
                <Mail className="mr-2 h-4 w-4" />
                Contact Support
              </Button>

              <Button
                onClick={handleRefresh}
                className="w-full"
                variant="outline"
              >
                <RefreshCw className="mr-2 h-4 w-4" />
                Check Status Again
              </Button>

              <Button onClick={logout} className="w-full" variant="ghost">
                Sign Out
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Help Text */}
        <div className="text-center text-sm text-muted-foreground">
          <p>
            If you believe this is an error, please contact our support team.
            We'll help you resolve this issue as quickly as possible.
          </p>
        </div>

        {/* Back to Home */}
        <div className="text-center">
          <Link
            href="/"
            className="inline-flex items-center text-sm text-muted-foreground hover:text-foreground"
          >
            <ArrowLeft className="mr-1 h-3 w-3" />
            Back to home
          </Link>
        </div>
      </div>
    </div>
  );
}
