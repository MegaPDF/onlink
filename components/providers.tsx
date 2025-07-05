// components/providers.tsx - Updated with settings initialization
"use client";

import React, { useEffect } from "react";
import { SessionProvider } from "next-auth/react";
import ClientSettings from "@/lib/settings-client";
import { Toaster } from "./ui/sonner";

export function Providers({ children }: { children: React.ReactNode }) {
  useEffect(() => {
    // Initialize settings on client load
    ClientSettings.loadSettings().catch(console.error);
  }, []);

  return (
    <SessionProvider>
      {children}
      <Toaster />
    </SessionProvider>
  );
}

// Alternative: If you want to show a loading state while settings load
export function ProvidersWithLoading({
  children,
}: {
  children: React.ReactNode;
}) {
  const [settingsLoaded, setSettingsLoaded] = React.useState(false);

  useEffect(() => {
    ClientSettings.loadSettings()
      .then(() => setSettingsLoaded(true))
      .catch((error) => {
        console.error("Failed to load settings:", error);
        setSettingsLoaded(true); // Still show app with fallback settings
      });
  }, []);

  // Show loading while settings are being fetched
  // You can customize this loading screen
  if (!settingsLoaded) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <SessionProvider>
      {children}
      <Toaster />
    </SessionProvider>
  );
}
