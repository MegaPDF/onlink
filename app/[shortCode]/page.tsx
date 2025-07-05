
"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { AlertCircle, Home, ExternalLink } from "lucide-react";

export default function ShortCodePage() {
  const params = useParams();
  const router = useRouter();
  const shortCode = params?.shortCode as string;
  const [hasRedirected, setHasRedirected] = useState(false);
  const [isRetry, setIsRetry] = useState(false);

  useEffect(() => {
    if (!shortCode || hasRedirected) {
      return;
    }

    // Check if this is a page reload or back navigation
    const sessionKey = `redirect_${shortCode}_${Date.now()}`;
    const hasVisitedRecently = sessionStorage.getItem(`visited_${shortCode}`);
    const lastVisit = hasVisitedRecently ? parseInt(hasVisitedRecently) : 0;
    const now = Date.now();
    const fiveMinutesAgo = now - 5 * 60 * 1000;

    // If visited within last 5 minutes, skip tracking
    const skipTracking = lastVisit > fiveMinutesAgo;

    if (skipTracking) {
      console.log("🔄 Recent visit detected, skipping analytics tracking");
    }

    // Mark this visit
    sessionStorage.setItem(`visited_${shortCode}`, now.toString());
    setHasRedirected(true);

    // Build redirect URL with tracking parameter
    const redirectUrl = `/api/redirect/${shortCode}${
      skipTracking ? "?_t=skip" : ""
    }`;

    // Perform the redirect
    window.location.href = redirectUrl;
  }, [shortCode, hasRedirected]);

  const handleManualRedirect = () => {
    setIsRetry(true);
    const redirectUrl = `/api/redirect/${shortCode}?_t=skip`; // Skip tracking on manual retry
    window.location.href = redirectUrl;
  };

  const handleGoHome = () => {
    router.push("/");
  };

  // Show loading state briefly, then fallback UI
  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="mx-auto w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center mb-4">
            <ExternalLink className="w-6 h-6 text-blue-600" />
          </div>
          <CardTitle>{isRetry ? "Retrying..." : "Redirecting..."}</CardTitle>
        </CardHeader>
        <CardContent className="text-center space-y-4">
          <div className="flex justify-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          </div>
          <p className="text-muted-foreground">
            {isRetry
              ? "Attempting to redirect again..."
              : "Please wait while we redirect you to your destination."}
          </p>

          {/* Fallback options - show after a delay */}
          <div className="pt-4 border-t space-y-2">
            <p className="text-sm text-muted-foreground">
              If you're not redirected automatically:
            </p>
            <div className="flex gap-2 justify-center">
              <Button
                variant="outline"
                size="sm"
                onClick={handleManualRedirect}
                disabled={isRetry}
              >
                Try Again
              </Button>
              <Button variant="outline" size="sm" onClick={handleGoHome}>
                <Home className="w-4 h-4 mr-2" />
                Go Home
              </Button>
            </div>
          </div>

          {/* Debug info in development */}
          {process.env.NODE_ENV === "development" && (
            <div className="pt-4 border-t text-xs text-muted-foreground">
              <p>ShortCode: {shortCode}</p>
              <p>Has Redirected: {hasRedirected.toString()}</p>
              <p>Is Retry: {isRetry.toString()}</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
