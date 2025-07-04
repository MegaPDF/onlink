"use client";

import React, { useState } from "react";
import { Footer } from "./footer";
import { cn } from "@/lib/utils";
import { Sidebar } from "./Sidebar";
import { Header } from "./Header";

interface MainLayoutProps {
  children: React.ReactNode;
  showSidebar?: boolean;
  showFooter?: boolean;
  className?: string;
}

export function MainLayout({
  children,
  showSidebar = true,
  showFooter = true,
  className,
}: MainLayoutProps) {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  return (
    <div className="min-h-screen bg-background">
      <Header
        onMenuClick={() => setSidebarOpen(!sidebarOpen)}
        showMobileMenu={showSidebar}
      />

      <div className="flex">
        {showSidebar && (
          <>
            {/* Desktop sidebar */}
            <aside className="hidden md:flex md:w-64 md:flex-col md:fixed md:inset-y-0 md:pt-16">
              <Sidebar />
            </aside>

            {/* Mobile sidebar overlay */}
            {sidebarOpen && (
              <div className="fixed inset-0 z-50 md:hidden">
                <div
                  className="absolute inset-0 bg-background/80 backdrop-blur-sm"
                  onClick={() => setSidebarOpen(false)}
                />
                <aside className="absolute left-0 top-0 h-full w-64 bg-background border-r pt-16">
                  <Sidebar onNavigate={() => setSidebarOpen(false)} />
                </aside>
              </div>
            )}
          </>
        )}

        {/* Main content */}
        <main
          className={cn(
            "flex-1 min-h-screen",
            showSidebar && "md:pl-64",
            className
          )}
        >
          <div className="h-full">{children}</div>
          {showFooter && <Footer />}
        </main>
      </div>
    </div>
  );
}
