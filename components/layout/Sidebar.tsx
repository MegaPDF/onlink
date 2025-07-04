"use client";

import React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import {
  LayoutDashboard,
  Link as LinkIcon,
  BarChart3,
  Folder,
  Users,
  Settings,
  CreditCard,
  User,
  Shield,
  Crown,
  QrCode,
  Upload,
  Download,
  Globe,
  Target,
  Zap,
  TrendingUp,
} from "lucide-react";

interface SidebarProps {
  className?: string;
  onNavigate?: () => void;
}

interface NavItem {
  title: string;
  href: string;
  icon: React.ComponentType<{ className?: string }>;
  badge?: string;
  premiumOnly?: boolean;
  adminOnly?: boolean;
  teamOnly?: boolean;
}

export function Sidebar({ className, onNavigate }: SidebarProps) {
  const pathname = usePathname();
  const { user } = useAuth();

  const navigation: NavItem[] = [
    {
      title: "Dashboard",
      href: "/dashboard",
      icon: LayoutDashboard,
    },
    {
      title: "My Links",
      href: "/dashboard/links",
      icon: LinkIcon,
    },
    {
      title: "Analytics",
      href: "/dashboard/analytics",
      icon: BarChart3,
      premiumOnly: true,
    },
    {
      title: "Folders",
      href: "/dashboard/folders",
      icon: Folder,
    },
    {
      title: "QR Codes",
      href: "/dashboard/qr-codes",
      icon: QrCode,
      premiumOnly: true,
    },
    {
      title: "Bulk Operations",
      href: "/dashboard/bulk",
      icon: Upload,
      premiumOnly: true,
    },
    {
      title: "Export",
      href: "/dashboard/export",
      icon: Download,
      premiumOnly: true,
    },
  ];

  const teamNavigation: NavItem[] = [
    {
      title: "Team",
      href: "/dashboard/team",
      icon: Users,
      teamOnly: true,
    },
    {
      title: "Team Analytics",
      href: "/dashboard/team/analytics",
      icon: TrendingUp,
      teamOnly: true,
      premiumOnly: true,
    },
    {
      title: "Team Domains",
      href: "/dashboard/team/domains",
      icon: Globe,
      teamOnly: true,
      premiumOnly: true,
    },
  ];

  const settingsNavigation: NavItem[] = [
    {
      title: "Profile",
      href: "/dashboard/profile",
      icon: User,
    },
    {
      title: "Billing",
      href: "/dashboard/billing",
      icon: CreditCard,
    },
    {
      title: "Domains",
      href: "/dashboard/domains",
      icon: Globe,
      premiumOnly: true,
    },
    {
      title: "Settings",
      href: "/dashboard/settings",
      icon: Settings,
    },
  ];

  const adminNavigation: NavItem[] = [
    {
      title: "Admin Panel",
      href: "/admin",
      icon: Shield,
      adminOnly: true,
    },
    {
      title: "System Settings",
      href: "/admin/settings",
      icon: Target,
      adminOnly: true,
    },
  ];

  const shouldShowItem = (item: NavItem) => {
    if (item.adminOnly && user?.role !== "admin") return false;
    if (item.teamOnly && !user?.team) return false;
    if (item.premiumOnly && user?.plan === "free") return false;
    return true;
  };

  const isActive = (href: string) => {
    if (href === "/dashboard") {
      return pathname === "/dashboard";
    }
    return pathname.startsWith(href);
  };

  const renderNavItem = (item: NavItem) => {
    const active = isActive(item.href);
    const Icon = item.icon;
    const disabled = !shouldShowItem(item);

    return (
      <Link
        key={item.href}
        href={disabled ? "#" : item.href}
        onClick={onNavigate}
      >
        <Button
          variant={active ? "secondary" : "ghost"}
          className={cn(
            "w-full justify-start",
            active && "bg-secondary",
            disabled && "opacity-50 cursor-not-allowed"
          )}
          disabled={disabled}
        >
          <Icon className="mr-2 h-4 w-4" />
          <span className="flex-1 text-left">{item.title}</span>
          {item.badge && (
            <Badge variant="secondary" className="ml-auto">
              {item.badge}
            </Badge>
          )}
          {item.premiumOnly && user?.plan === "free" && (
            <Crown className="ml-auto h-3 w-3 text-yellow-500" />
          )}
        </Button>
      </Link>
    );
  };

  return (
    <div className={cn("pb-12 min-h-screen", className)}>
      <div className="space-y-4 py-4">
        <div className="px-3 py-2">
          <div className="space-y-1">
            <h2 className="mb-2 px-4 text-lg font-semibold tracking-tight">
              Overview
            </h2>
            {navigation.map(renderNavItem)}
          </div>
        </div>

        {user?.team && (
          <>
            <Separator />
            <div className="px-3 py-2">
              <div className="space-y-1">
                <h2 className="mb-2 px-4 text-lg font-semibold tracking-tight">
                  Team
                </h2>
                {teamNavigation.map(renderNavItem)}
              </div>
            </div>
          </>
        )}

        <Separator />
        <div className="px-3 py-2">
          <div className="space-y-1">
            <h2 className="mb-2 px-4 text-lg font-semibold tracking-tight">
              Account
            </h2>
            {settingsNavigation.map(renderNavItem)}
          </div>
        </div>

        {user?.role === "admin" && (
          <>
            <Separator />
            <div className="px-3 py-2">
              <div className="space-y-1">
                <h2 className="mb-2 px-4 text-lg font-semibold tracking-tight text-red-600 dark:text-red-400">
                  Administration
                </h2>
                {adminNavigation.map(renderNavItem)}
              </div>
            </div>
          </>
        )}

        {/* Upgrade prompt for free users */}
        {user?.plan === "free" && (
          <>
            <Separator />
            <div className="px-3 py-2">
              <div className="rounded-lg bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-950 dark:to-indigo-950 p-4 border">
                <div className="flex items-center gap-2 mb-2">
                  <Crown className="h-4 w-4 text-yellow-500" />
                  <h3 className="font-semibold text-sm">Upgrade to Premium</h3>
                </div>
                <p className="text-xs text-muted-foreground mb-3">
                  Unlock analytics, QR codes, and unlimited links.
                </p>
                <Button size="sm" className="w-full" asChild>
                  <Link href="/dashboard/billing">
                    <Zap className="mr-1 h-3 w-3" />
                    Upgrade Now
                  </Link>
                </Button>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
