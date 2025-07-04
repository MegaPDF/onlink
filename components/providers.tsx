// ============= Enhanced components/providers.tsx =============
"use client";

import React from "react";
import { SessionProvider } from "next-auth/react";
import { ThemeProvider } from "next-themes";
import { TooltipProvider } from "@/components/ui/tooltip";
import { Toaster } from "sonner";

interface ProvidersProps {
  children: React.ReactNode;
}

export function Providers({ children }: ProvidersProps) {
  return (
    <SessionProvider
      // Re-fetch session every 2 minutes for faster logout detection
      refetchInterval={2 * 60}
      // Re-fetch session when window is focused
      refetchOnWindowFocus={true}
      // Enable base URL for proper session handling
      basePath="/api/auth"
    >
      <ThemeProvider
        attribute="class"
        defaultTheme="system"
        enableSystem
        disableTransitionOnChange
      >
        <TooltipProvider delayDuration={300}>
          {children}

          {/* Sonner toast notifications */}
          <Toaster
            position="bottom-right"
            expand={true}
            richColors
            closeButton
            toastOptions={{
              style: {
                background: "hsl(var(--background))",
                border: "1px solid hsl(var(--border))",
                color: "hsl(var(--foreground))",
              },
              className:
                "group toast group-[.toaster]:bg-background group-[.toaster]:text-foreground group-[.toaster]:border-border group-[.toaster]:shadow-lg",
              descriptionClassName: "group-[.toast]:text-muted-foreground",
            }}
          />
        </TooltipProvider>
      </ThemeProvider>
    </SessionProvider>
  );
}
