"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  AlertTriangle,
  RefreshCw,
  Home,
  ArrowLeft,
  Bug,
  ExternalLink,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";

interface ErrorProps {
  error: Error & { digest?: string };
  reset: () => void;
}

export default function Error({ error, reset }: ErrorProps) {
  const [isRetrying, setIsRetrying] = useState(false);
  const [retryCount, setRetryCount] = useState(0);
  const [showDetails, setShowDetails] = useState(false);

  // Log error to console and error reporting service
  useEffect(() => {
    console.error("Application Error:", error);

    // Report error to monitoring service (e.g., Sentry)
    // if (typeof window !== "undefined" && window.gtag) {
    //   window.gtag("event", "exception", {
    //     description: error.message,
    //     fatal: false,
    //   });
    // }
  }, [error]);

  const handleRetry = async () => {
    setIsRetrying(true);
    setRetryCount((prev) => prev + 1);

    // Add a small delay to prevent rapid retries
    await new Promise((resolve) => setTimeout(resolve, 1000));

    try {
      reset();
    } finally {
      setIsRetrying(false);
    }
  };

  const getErrorMessage = () => {
    if (error.message.includes("Network")) {
      return {
        title: "Network Error",
        description: "Please check your internet connection and try again.",
        type: "network" as const,
      };
    }

    if (error.message.includes("fetch")) {
      return {
        title: "Connection Error",
        description:
          "Unable to connect to our servers. This might be temporary.",
        type: "fetch" as const,
      };
    }

    if (
      error.message.includes("Unauthorized") ||
      error.message.includes("401")
    ) {
      return {
        title: "Authentication Error",
        description: "Your session has expired. Please sign in again.",
        type: "auth" as const,
      };
    }

    if (error.message.includes("Forbidden") || error.message.includes("403")) {
      return {
        title: "Access Denied",
        description: "You don't have permission to access this resource.",
        type: "forbidden" as const,
      };
    }

    return {
      title: "Something went wrong",
      description: "An unexpected error occurred. Our team has been notified.",
      type: "generic" as const,
    };
  };

  const errorInfo = getErrorMessage();

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <div className="max-w-2xl w-full space-y-6">
        {/* Error Icon and Title */}
        <div className="text-center space-y-4">
          <div className="mx-auto w-20 h-20 bg-destructive/10 rounded-full flex items-center justify-center">
            <AlertTriangle className="h-10 w-10 text-destructive" />
          </div>

          <div className="space-y-2">
            <h1 className="text-3xl font-bold tracking-tight">
              {errorInfo.title}
            </h1>
            <p className="text-lg text-muted-foreground">
              {errorInfo.description}
            </p>
          </div>
        </div>

        {/* Error Alert */}
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>
            {retryCount > 0 && retryCount < 3 && (
              <span className="block mb-2">
                Retry attempt {retryCount} failed.
              </span>
            )}
            {retryCount >= 3 && (
              <span className="block mb-2">
                Multiple retry attempts failed. This might be a persistent
                issue.
              </span>
            )}
            Error ID: {error.digest || "No ID available"}
          </AlertDescription>
        </Alert>

        {/* Action Buttons */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">What you can do</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Retry Button */}
            <Button
              onClick={handleRetry}
              disabled={isRetrying}
              className="w-full gap-2"
              variant={retryCount >= 3 ? "secondary" : "default"}
            >
              {isRetrying ? (
                <RefreshCw className="h-4 w-4 animate-spin" />
              ) : (
                <RefreshCw className="h-4 w-4" />
              )}
              {isRetrying
                ? "Retrying..."
                : `Try Again${retryCount > 0 ? ` (${retryCount})` : ""}`}
            </Button>

            {/* Navigation Options */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <Button asChild variant="outline" className="gap-2">
                <Link href="/">
                  <Home className="h-4 w-4" />
                  Go Home
                </Link>
              </Button>

              <Button
                onClick={() => window.history.back()}
                variant="outline"
                className="gap-2"
              >
                <ArrowLeft className="h-4 w-4" />
                Go Back
              </Button>
            </div>

            {/* Specific error type actions */}
            {errorInfo.type === "auth" && (
              <Button asChild variant="secondary" className="w-full gap-2">
                <Link href="/auth/signin">Sign In Again</Link>
              </Button>
            )}

            {errorInfo.type === "network" && (
              <Alert>
                <AlertDescription>
                  <strong>Network troubleshooting:</strong>
                  <ul className="mt-2 ml-4 list-disc text-sm space-y-1">
                    <li>Check your internet connection</li>
                    <li>Try refreshing the page</li>
                    <li>Disable any VPN or proxy</li>
                    <li>Clear your browser cache</li>
                  </ul>
                </AlertDescription>
              </Alert>
            )}
          </CardContent>
        </Card>

        {/* Error Details (Collapsible) */}
        <Collapsible>
          <CollapsibleTrigger asChild>
            <Button
              variant="ghost"
              className="w-full gap-2"
              onClick={() => setShowDetails(!showDetails)}
            >
              <Bug className="h-4 w-4" />
              {showDetails ? "Hide" : "Show"} Technical Details
            </Button>
          </CollapsibleTrigger>
          <CollapsibleContent>
            <Card className="mt-2">
              <CardContent className="pt-6">
                <div className="space-y-4 text-sm">
                  <div>
                    <strong>Error Message:</strong>
                    <pre className="mt-1 p-2 bg-muted rounded text-xs overflow-x-auto">
                      {error.message}
                    </pre>
                  </div>

                  {error.stack && (
                    <div>
                      <strong>Stack Trace:</strong>
                      <pre className="mt-1 p-2 bg-muted rounded text-xs overflow-x-auto max-h-32">
                        {error.stack}
                      </pre>
                    </div>
                  )}

                  <div>
                    <strong>Browser Info:</strong>
                    <pre className="mt-1 p-2 bg-muted rounded text-xs">
                      {typeof window !== "undefined"
                        ? window.navigator.userAgent
                        : "N/A"}
                    </pre>
                  </div>

                  <div>
                    <strong>URL:</strong>
                    <pre className="mt-1 p-2 bg-muted rounded text-xs">
                      {typeof window !== "undefined"
                        ? window.location.href
                        : "N/A"}
                    </pre>
                  </div>

                  <div>
                    <strong>Timestamp:</strong>
                    <pre className="mt-1 p-2 bg-muted rounded text-xs">
                      {new Date().toISOString()}
                    </pre>
                  </div>
                </div>
              </CardContent>
            </Card>
          </CollapsibleContent>
        </Collapsible>

        {/* Contact Support */}
        <Card>
          <CardContent className="pt-6">
            <div className="text-center space-y-3">
              <p className="text-sm text-muted-foreground">
                Still experiencing issues? Our support team is here to help.
              </p>
              <div className="flex justify-center gap-3">
                <Button asChild variant="outline" size="sm" className="gap-2">
                  <Link href="/contact">Contact Support</Link>
                </Button>
                <Button asChild variant="outline" size="sm" className="gap-2">
                  <Link href="/help" target="_blank">
                    Help Center
                    <ExternalLink className="h-3 w-3" />
                  </Link>
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Report Bug Link */}
        <div className="text-center">
          <Button asChild variant="link" size="sm" className="gap-2">
            <Link
              href={`mailto:support@olxclone.com?subject=Error Report&body=Error ID: ${
                error.digest || "N/A"
              }%0A%0AError Message: ${encodeURIComponent(
                error.message
              )}%0A%0APlease describe what you were doing when this error occurred:`}
            >
              <Bug className="h-3 w-3" />
              Report this bug
            </Link>
          </Button>
        </div>
      </div>
    </div>
  );
}
