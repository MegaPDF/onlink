"use client";

import React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import {
  LayoutDashboard,
  Users,
  Link as LinkIcon,
  Globe,
  CreditCard,
  Shield,
  FileText,
  Target,
  BarChart3,
  Database,
  Mail,
  Key,
  Monitor,
  Activity,
  AlertTriangle,
  LogOut,
} from "lucide-react";

interface AdminSidebarProps {
  className?: string;
  onNavigate?: () => void;
}

interface NavItem {
  title: string;
  href: string;
  icon: React.ComponentType<{ className?: string }>;
  badge?: string;
}

export function AdminSidebar({ className, onNavigate }: AdminSidebarProps) {
  const pathname = usePathname();
  const { user } = useAuth();

  const adminNavigation: NavItem[] = [
    {
      title: "Overview",
      href: "/admin",
      icon: LayoutDashboard,
    },
    {
      title: "Users",
      href: "/admin/users",
      icon: Users,
    },
    {
      title: "Links",
      href: "/admin/links",
      icon: LinkIcon,
    },
    {
      title: "Domains",
      href: "/admin/domains",
      icon: Globe,
    },
    {
      title: "Billing",
      href: "/admin/billing",
      icon: CreditCard,
    },
    {
      title: "Security",
      href: "/admin/security",
      icon: Shield,
    },
    {
      title: "Reports",
      href: "/admin/reports",
      icon: FileText,
    },
    {
      title: "Settings",
      href: "/admin/settings",
      icon: Target,
    },
  ];

  const adminQuickActions: NavItem[] = [
    {
      title: "Analytics",
      href: "/admin/analytics",
      icon: BarChart3,
    },
    {
      title: "Database",
      href: "/admin/database",
      icon: Database,
    },
    {
      title: "Email Config",
      href: "/admin/email",
      icon: Mail,
    },
    {
      title: "API Keys",
      href: "/admin/api-keys",
      icon: Key,
    },
    {
      title: "System Health",
      href: "/admin/health",
      icon: Monitor,
    },
    {
      title: "Audit Logs",
      href: "/admin/audit",
      icon: Activity,
    },
  ];

  const isActive = (href: string) => {
    if (href === "/admin") {
      return pathname === "/admin";
    }
    return pathname.startsWith(href);
  };

  const renderNavItem = (item: NavItem) => {
    const active = isActive(item.href);
    const Icon = item.icon;

    return (
      <Link key={item.href} href={item.href} onClick={onNavigate}>
        <Button
          variant={active ? "secondary" : "ghost"}
          className={cn(
            "w-full justify-start",
            active && "bg-muted font-medium"
          )}
        >
          <Icon className="mr-2 h-4 w-4" />
          {item.title}
          {item.badge && (
            <span className="ml-auto rounded-full bg-primary px-2 py-1 text-xs text-primary-foreground">
              {item.badge}
            </span>
          )}
        </Button>
      </Link>
    );
  };

  return (
    <div className={cn("pb-12 w-64", className)}>
      <div className="space-y-4 py-4">
        {/* Header */}
        <div className="px-3 py-2">
          <div className="flex items-center gap-2 mb-4">
            <Shield className="h-6 w-6 text-red-600" />
            <h2 className="text-lg font-semibold tracking-tight text-red-600">
              Admin Panel
            </h2>
          </div>

          {/* User Info */}
          <div className="flex items-center gap-3 p-3 bg-muted/50 rounded-lg">
            <div className="h-8 w-8 bg-red-600 rounded-full flex items-center justify-center text-white text-sm font-medium">
              {user?.name?.charAt(0) || "A"}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium truncate">{user?.name}</p>
              <p className="text-xs text-muted-foreground truncate">
                {user?.email}
              </p>
            </div>
          </div>
        </div>

        {/* Main Navigation */}
        <div className="px-3 py-2">
          <h2 className="mb-2 px-4 text-sm font-semibold tracking-tight text-muted-foreground">
            Administration
          </h2>
          <div className="space-y-1">{adminNavigation.map(renderNavItem)}</div>
        </div>

        <Separator />

        {/* Quick Actions */}
        <div className="px-3 py-2">
          <h2 className="mb-2 px-4 text-sm font-semibold tracking-tight text-muted-foreground">
            Quick Actions
          </h2>
          <div className="space-y-1">
            {adminQuickActions.map(renderNavItem)}
          </div>
        </div>

        <Separator />

        {/* Admin Warning */}
        <div className="px-3 py-2">
          <div className="rounded-lg bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-800 p-3">
            <div className="flex items-start gap-2">
              <AlertTriangle className="h-4 w-4 text-amber-600 dark:text-amber-400 mt-0.5 flex-shrink-0" />
              <div className="text-xs">
                <div className="font-medium text-amber-600 dark:text-amber-400 mb-1">
                  Administrator Access
                </div>
                <div className="text-amber-700 dark:text-amber-300">
                  You have full system access. Use with caution.
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Back to User Dashboard */}
        <div className="px-3 py-2">
          <Link href="/dashboard">
            <Button variant="outline" className="w-full">
              <LogOut className="mr-2 h-4 w-4" />
              Back to User Dashboard
            </Button>
          </Link>
        </div>
      </div>
    </div>
  );
}
