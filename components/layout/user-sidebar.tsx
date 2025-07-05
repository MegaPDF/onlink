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
  Link as LinkIcon,
  BarChart3,
  Folder,
  Users,
  Settings,
  CreditCard,
  User,
  Crown,
  QrCode,
  Upload,
  Download,
  Globe,
  Zap,
  TrendingUp,
  Shield,
} from "lucide-react";

interface UserSidebarProps {
  className?: string;
  onNavigate?: () => void;
}

interface NavItem {
  title: string;
  href: string;
  icon: React.ComponentType<{ className?: string }>;
  badge?: string;
  premiumOnly?: boolean;
  teamOnly?: boolean;
}

export function UserSidebar({ className, onNavigate }: UserSidebarProps) {
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

  const shouldShowItem = (item: NavItem) => {
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
            active && "bg-muted font-medium",
            disabled && "opacity-50 cursor-not-allowed"
          )}
          disabled={disabled}
        >
          <Icon className="mr-2 h-4 w-4" />
          {item.title}
          {item.premiumOnly && user?.plan === "free" && (
            <Crown className="ml-auto h-3 w-3 text-yellow-500" />
          )}
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
          <Link href="/dashboard" className="flex items-center space-x-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary text-primary-foreground">
              <LinkIcon className="h-4 w-4" />
            </div>
            <span className="hidden font-bold sm:inline-block">ShortLink</span>
          </Link>
          {/* User Info */}
          <div className="flex items-center gap-3 p-3 bg-muted/50 rounded-lg mt-4">
            <div className="h-8 w-8 bg-primary rounded-full flex items-center justify-center text-white text-sm font-medium">
              {user?.name?.charAt(0) || "U"}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium truncate">{user?.name}</p>
              <p className="text-xs text-muted-foreground truncate">
                {user?.email}
              </p>
              <div className="flex items-center gap-1 mt-1">
                <span className="text-xs bg-primary/10 text-primary px-2 py-0.5 rounded capitalize">
                  {user?.plan}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Main Navigation */}
        <div className="px-3 py-2">
          <h2 className="mb-2 px-4 text-sm font-semibold tracking-tight text-muted-foreground">
            Navigation
          </h2>
          <div className="space-y-1">{navigation.map(renderNavItem)}</div>
        </div>

        {/* Team Section */}
        {user?.team && (
          <>
            <Separator />
            <div className="px-3 py-2">
              <h2 className="mb-2 px-4 text-sm font-semibold tracking-tight text-muted-foreground">
                Team
              </h2>
              <div className="space-y-1">
                {teamNavigation.map(renderNavItem)}
              </div>
            </div>
          </>
        )}

        <Separator />

        {/* Settings */}
        <div className="px-3 py-2">
          <h2 className="mb-2 px-4 text-sm font-semibold tracking-tight text-muted-foreground">
            Settings
          </h2>
          <div className="space-y-1">
            {settingsNavigation.map(renderNavItem)}
          </div>
        </div>

        {/* Admin Access */}
        {user?.role === "admin" && (
          <>
            <Separator />
            <div className="px-3 py-2">
              <Link href="/admin">
                <Button
                  variant="outline"
                  className="w-full text-red-600 border-red-200 hover:bg-red-50"
                >
                  <Shield className="mr-2 h-4 w-4" />
                  Admin Panel
                </Button>
              </Link>
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
