// ============= Fixed components/layout/Header.tsx =============
"use client";

import React, { useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAuth } from "@/hooks/use-auth";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import {
  Bell,
  Search,
  Settings,
  User,
  LogOut,
  CreditCard,
  Menu,
  Link as LinkIcon,
  BarChart3,
  Crown,
  Shield,
} from "lucide-react";

interface HeaderProps {
  onMenuClick?: () => void;
  showMobileMenu?: boolean;
}

export function Header({ onMenuClick, showMobileMenu = true }: HeaderProps) {
  const { user, logout, isAuthenticated, status } = useAuth();
  const router = useRouter();
  const toast = useToast();

  // Debug logging (remove in production)
  useEffect(() => {
    console.log("Header state changed:", {
      isAuthenticated,
      status,
      userId: user?.id,
      userName: user?.name,
    });
  }, [isAuthenticated, status, user]);

  const handleLogout = async () => {
    try {
      console.log("Logout initiated...");
      await logout();
      console.log("Logout completed");
    } catch (error) {
      console.error("Logout error in header:", error);
      toast.error("Logout failed");
    }
  };

  const getPlanBadgeColor = (plan: string) => {
    switch (plan) {
      case "enterprise":
        return "bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200";
      case "premium":
        return "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200";
      default:
        return "bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-200";
    }
  };

  const getPlanIcon = (plan: string) => {
    switch (plan) {
      case "enterprise":
        return <Crown className="h-3 w-3" />;
      case "premium":
        return <Shield className="h-3 w-3" />;
      default:
        return null;
    }
  };

  // Force re-render when authentication status changes
  const authKey = `${isAuthenticated}-${status}-${user?.id || "guest"}`;

    function getInitials(name: string): React.ReactNode {
        if (!name) return "";
        const words = name.trim().split(" ");
        if (words.length === 1) {
            return words[0].charAt(0).toUpperCase();
        }
        return (
            words[0].charAt(0).toUpperCase() +
            words[words.length - 1].charAt(0).toUpperCase()
        );
    }
  return (
    <header
      key={authKey}
      className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60"
    >
      <div className="container flex h-16 items-center justify-between px-4">
        {/* Left section */}
        <div className="flex items-center gap-4">
          {/* Mobile menu button */}
          {showMobileMenu && (
            <Button
              variant="ghost"
              size="icon"
              className="md:hidden"
              onClick={onMenuClick}
            >
              <Menu className="h-5 w-5" />
            </Button>
          )}

          {/* Logo */}
          <Link href="/" className="flex items-center space-x-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary text-primary-foreground">
              <LinkIcon className="h-4 w-4" />
            </div>
            <span className="hidden font-bold sm:inline-block">ShortLink</span>
          </Link>

          {/* Navigation (Desktop) */}
          {isAuthenticated && (
            <nav className="hidden md:flex items-center space-x-6 text-sm font-medium">
              <Link
                href="/dashboard"
                className="transition-colors hover:text-foreground/80 text-foreground/60"
              >
                Dashboard
              </Link>
              <Link
                href="/dashboard/analytics"
                className="transition-colors hover:text-foreground/80 text-foreground/60"
              >
                Analytics
              </Link>
              <Link
                href="/dashboard/links"
                className="transition-colors hover:text-foreground/80 text-foreground/60"
              >
                Links
              </Link>
              {user?.team && (
                <Link
                  href="/dashboard/team"
                  className="transition-colors hover:text-foreground/80 text-foreground/60"
                >
                  Team
                </Link>
              )}
              {user?.role === "admin" && (
                <Link
                  href="/admin"
                  className="transition-colors hover:text-foreground/80 text-foreground/60 flex items-center gap-1"
                >
                  <Shield className="h-3 w-3" />
                  Admin
                </Link>
              )}
            </nav>
          )}
        </div>

        {/* Right section */}
        <div className="flex items-center gap-2">
          {isAuthenticated && status === "authenticated" && user ? (
            <>
              {/* Search (Desktop) */}
              <Button variant="ghost" size="icon" className="hidden md:flex">
                <Search className="h-4 w-4" />
              </Button>

              {/* Notifications */}
              <Button variant="ghost" size="icon" className="relative">
                <Bell className="h-4 w-4" />
                <span className="absolute -top-1 -right-1 h-2 w-2 bg-red-500 rounded-full" />
              </Button>

              {/* User menu */}
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    variant="ghost"
                    className="relative h-8 w-8 rounded-full"
                  >
                    <Avatar className="h-8 w-8">
                      <AvatarImage src={user?.image} alt={user?.name} />
                      <AvatarFallback>
                        {getInitials(user?.name || "User")}
                      </AvatarFallback>
                    </Avatar>
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent className="w-80" align="end" forceMount>
                  <DropdownMenuLabel className="font-normal">
                    <div className="flex flex-col space-y-2">
                      <p className="text-sm font-medium leading-none">
                        {user?.name}
                      </p>
                      <p className="text-xs leading-none text-muted-foreground">
                        {user?.email}
                      </p>
                      <div className="flex items-center gap-2">
                        <Badge
                          className={getPlanBadgeColor(user?.plan || "free")}
                        >
                          <div className="flex items-center gap-1">
                            {getPlanIcon(user?.plan || "free")}
                            {user?.plan
                              ? user.plan.charAt(0).toUpperCase() +
                                user.plan.slice(1)
                              : "Free"}
                          </div>
                        </Badge>
                        {user?.team && (
                          <Badge variant="outline" className="text-xs">
                            {user.team.role}
                          </Badge>
                        )}
                      </div>
                    </div>
                  </DropdownMenuLabel>
                  <DropdownMenuSeparator />

                  <DropdownMenuItem asChild>
                    <Link
                      href="/dashboard/profile"
                      className="flex items-center"
                    >
                      <User className="mr-2 h-4 w-4" />
                      <span>Profile</span>
                    </Link>
                  </DropdownMenuItem>

                  <DropdownMenuItem asChild>
                    <Link
                      href="/dashboard/billing"
                      className="flex items-center"
                    >
                      <CreditCard className="mr-2 h-4 w-4" />
                      <span>Billing</span>
                    </Link>
                  </DropdownMenuItem>

                  <DropdownMenuItem asChild>
                    <Link
                      href="/dashboard/settings"
                      className="flex items-center"
                    >
                      <Settings className="mr-2 h-4 w-4" />
                      <span>Settings</span>
                    </Link>
                  </DropdownMenuItem>

                  {user?.plan === "free" && (
                    <>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem asChild>
                        <Link
                          href="/dashboard/billing"
                          className="flex items-center text-blue-600 dark:text-blue-400"
                        >
                          <Crown className="mr-2 h-4 w-4" />
                          <span>Upgrade to Premium</span>
                        </Link>
                      </DropdownMenuItem>
                    </>
                  )}

                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={handleLogout}>
                    <LogOut className="mr-2 h-4 w-4" />
                    <span>Log out</span>
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </>
          ) : (
            <div className="flex items-center gap-2">
              <Button variant="ghost" asChild>
                <Link href="/auth/signin">Sign In</Link>
              </Button>
              <Button asChild>
                <Link href="/auth/signup">Sign Up</Link>
              </Button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
