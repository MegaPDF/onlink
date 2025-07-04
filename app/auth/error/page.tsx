"use client";

import React from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { AlertTriangle, Home, ArrowLeft, Link as LinkIcon } from "lucide-react";

export default function AuthErrorPage() {
  const searchParams = useSearchParams();
  const error = searchParams?.get("error");

  const getErrorMessage = (error: string | null) => {
    switch (error) {
      case "Configuration":
        return "There is a problem with the server configuration.";
      case "AccessDenied":
        return "Access denied. You do not have permission to sign in.";
      case "Verification":
        return "The verification token has expired or has already been used.";
      case "Default":
        return "An unexpected error occurred during authentication.";
      default:
        return "An authentication error occurred. Please try again.";
    }
  };

  const getErrorTitle = (error: string | null) => {
    switch (error) {
      case "Configuration":
        return "Server Configuration Error";
      case "AccessDenied":
        return "Access Denied";
      case "Verification":
        return "Verification Error";
      default:
        return "Authentication Error";
    }
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
          <h1 className="text-2xl font-bold">{getErrorTitle(error)}</h1>
        </div>

        <Card>
          <CardHeader className="text-center">
            <div className="mx-auto w-12 h-12 bg-red-100 rounded-full flex items-center justify-center mb-4">
              <AlertTriangle className="h-6 w-6 text-red-600" />
            </div>
            <CardTitle className="text-xl text-red-600">
              Something went wrong
            </CardTitle>
            <CardDescription>
              We encountered an issue while trying to authenticate you
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <Alert variant="destructive">
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>{getErrorMessage(error)}</AlertDescription>
            </Alert>

            <div className="space-y-2">
              <Button asChild className="w-full">
                <Link href="/auth/signin">
                  <ArrowLeft className="mr-2 h-4 w-4" />
                  Try signing in again
                </Link>
              </Button>

              <Button variant="outline" asChild className="w-full">
                <Link href="/">
                  <Home className="mr-2 h-4 w-4" />
                  Go to homepage
                </Link>
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Help Text */}
        <div className="text-center text-sm text-muted-foreground">
          If this problem persists, please{" "}
          <Link href="/contact" className="text-primary hover:underline">
            contact support
          </Link>
        </div>
      </div>
    </div>
  );
}
