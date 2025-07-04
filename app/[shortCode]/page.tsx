// ============= app/[shortCode]/page.tsx =============
"use client";

import { useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { AlertCircle, Home, ExternalLink } from "lucide-react";

interface ShortCodePageProps {
  params: {
    shortCode: string;
  };
}

export default function ShortCodePage() {
  const params = useParams();
  const router = useRouter();
  const shortCode = params?.shortCode as string;

  useEffect(() => {
    if (!shortCode) {
      router.push("/");
      return;
    }

    // Redirect to the API endpoint that handles the actual redirection
    window.location.href = `/api/redirect/${shortCode}`;
  }, [shortCode, router]);

  // This component should only render briefly before the redirect
  // But we'll include a fallback UI in case there are issues
  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="mx-auto w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center mb-4">
            <ExternalLink className="w-6 h-6 text-blue-600" />
          </div>
          <CardTitle>Redirecting...</CardTitle>
        </CardHeader>
        <CardContent className="text-center space-y-4">
          <div className="flex justify-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          </div>
          <p className="text-muted-foreground">
            Please wait while we redirect you to your destination.
          </p>

          {/* Fallback options */}
          <div className="pt-4 border-t space-y-2">
            <p className="text-sm text-muted-foreground">
              If you're not redirected automatically:
            </p>
            <div className="flex gap-2 justify-center">
              <Button
                variant="outline"
                size="sm"
                onClick={() =>
                  (window.location.href = `/api/redirect/${shortCode}`)
                }
              >
                Try Again
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => router.push("/")}
              >
                <Home className="w-4 h-4 mr-2" />
                Go Home
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
