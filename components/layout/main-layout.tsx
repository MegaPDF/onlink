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
