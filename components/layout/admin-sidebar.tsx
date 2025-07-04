"use client";

import React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { useAuth } from "@/hooks/use-auth";
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
  ChevronRight,
} from "lucide-react";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarRail,
  SidebarFooter,
} from "@/components/ui/sidebar";

interface AdminSidebarProps extends React.ComponentProps<typeof Sidebar> {
  onNavigate?: () => void;
}

interface NavItem {
  title: string;
  href: string;
  icon: React.ComponentType<{ className?: string }>;
  badge?: string;
  isActive?: boolean;
}

interface NavGroup {
  title: string;
  items: NavItem[];
}

export function AdminSidebar({ onNavigate, ...props }: AdminSidebarProps) {
  const pathname = usePathname();
  const { user } = useAuth();

  const isActive = (href: string) => {
    if (href === "/admin") {
      return pathname === "/admin";
    }
    return pathname.startsWith(href);
  };

  const adminNavData: NavGroup[] = [
    {
      title: "Administration",
      items: [
        {
          title: "Overview",
          href: "/admin",
          icon: LayoutDashboard,
          isActive: isActive("/admin"),
        },
        {
          title: "Users",
          href: "/admin/users",
          icon: Users,
          isActive: isActive("/admin/users"),
        },
        {
          title: "Links",
          href: "/admin/links",
          icon: LinkIcon,
          isActive: isActive("/admin/links"),
        },
        {
          title: "Domains",
          href: "/admin/domains",
          icon: Globe,
          isActive: isActive("/admin/domains"),
        },
        {
          title: "Billing",
          href: "/admin/billing",
          icon: CreditCard,
          isActive: isActive("/admin/billing"),
        },
        {
          title: "Security",
          href: "/admin/security",
          icon: Shield,
          isActive: isActive("/admin/security"),
        },
        {
          title: "Reports",
          href: "/admin/reports",
          icon: FileText,
          isActive: isActive("/admin/reports"),
        },
        {
          title: "Settings",
          href: "/admin/settings",
          icon: Target,
          isActive: isActive("/admin/settings"),
        },
      ],
    },
    {
      title: "Quick Actions",
      items: [
        {
          title: "Analytics",
          href: "/admin/analytics",
          icon: BarChart3,
          isActive: isActive("/admin/analytics"),
        },
        {
          title: "Database",
          href: "/admin/database",
          icon: Database,
          isActive: isActive("/admin/database"),
        },
        {
          title: "Email Config",
          href: "/admin/email",
          icon: Mail,
          isActive: isActive("/admin/email"),
        },
        {
          title: "API Keys",
          href: "/admin/api-keys",
          icon: Key,
          isActive: isActive("/admin/api-keys"),
        },
        {
          title: "System Health",
          href: "/admin/health",
          icon: Monitor,
          isActive: isActive("/admin/health"),
        },
        {
          title: "Audit Logs",
          href: "/admin/audit",
          icon: Activity,
          isActive: isActive("/admin/audit"),
        },
      ],
    },
  ];

  return (
    <Sidebar {...props}>
      <SidebarHeader>
        {/* Header */}
        <div className="flex items-center gap-2 px-2 py-2">
          <Shield className="h-6 w-6 text-red-600" />
          <h2 className="text-lg font-semibold tracking-tight text-red-600">
            Admin Panel
          </h2>
        </div>

        {/* User Info */}
        <div className="flex items-center gap-3 p-3 bg-sidebar-accent/50 rounded-lg mx-2">
          <div className="h-8 w-8 bg-red-600 rounded-full flex items-center justify-center text-white text-sm font-medium">
            {user?.name?.charAt(0) || "A"}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium truncate">{user?.name}</p>
            <p className="text-xs text-sidebar-muted-foreground truncate">
              {user?.email}
            </p>
          </div>
        </div>
      </SidebarHeader>

      <SidebarContent className="gap-0">
        {/* Navigation Groups */}
        {adminNavData.map((group) => (
          <Collapsible
            key={group.title}
            defaultOpen
            className="group/collapsible"
          >
            <SidebarGroup>
              <SidebarGroupLabel
                asChild
                className="group/label text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground text-sm"
              >
                <CollapsibleTrigger>
                  {group.title}
                  <ChevronRight className="ml-auto transition-transform group-data-[state=open]/collapsible:rotate-90" />
                </CollapsibleTrigger>
              </SidebarGroupLabel>
              <CollapsibleContent>
                <SidebarGroupContent>
                  <SidebarMenu>
                    {group.items.map((item) => {
                      const Icon = item.icon;
                      return (
                        <SidebarMenuItem key={item.href}>
                          <SidebarMenuButton
                            asChild
                            isActive={item.isActive}
                            onClick={onNavigate}
                          >
                            <Link href={item.href}>
                              <Icon className="h-4 w-4" />
                              {item.title}
                              {item.badge && (
                                <span className="ml-auto rounded-full bg-primary px-2 py-1 text-xs text-primary-foreground">
                                  {item.badge}
                                </span>
                              )}
                            </Link>
                          </SidebarMenuButton>
                        </SidebarMenuItem>
                      );
                    })}
                  </SidebarMenu>
                </SidebarGroupContent>
              </CollapsibleContent>
            </SidebarGroup>
          </Collapsible>
        ))}

        {/* Admin Warning */}
        <SidebarGroup>
          <div className="px-2">
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
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter>
        {/* Back to User Dashboard */}
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton asChild onClick={onNavigate}>
              <Link href="/dashboard">
                <LogOut className="h-4 w-4" />
                Back to User Dashboard
              </Link>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>

      <SidebarRail />
    </Sidebar>
  );
}
