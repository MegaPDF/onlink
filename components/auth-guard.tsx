"use client";

import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useEffect, ReactNode } from "react";
import { LoadingSpinner } from "@/components/ui/loading-spinner";

interface AuthGuardProps {
  children: ReactNode;
  fallback?: ReactNode;
  redirectTo?: string;
  allowedRoles?: string[];
}

export function AuthGuard({
  children,
  fallback,
  redirectTo = "/auth/signin",
  allowedRoles,
}: AuthGuardProps) {
  const { data: session, status } = useSession();
  const router = useRouter();

  useEffect(() => {
    if (status === "loading") return; // Still loading

    if (!session) {
      // Not authenticated, redirect to login
      router.push(redirectTo);
      return;
    }

    // Check role-based access if roles are specified
    if (allowedRoles && !allowedRoles.includes(session.user.role ?? "")) {
      router.push("/dashboard"); // Redirect to safe page
      return;
    }
  }, [session, status, router, redirectTo, allowedRoles]);

  // Show loading state
  if (status === "loading") {
    return (
      fallback || (
        <div className="flex items-center justify-center min-h-screen">
          <LoadingSpinner size="lg" />
        </div>
      )
    );
  }

  // Not authenticated
  if (!session) {
    return (
      fallback || (
        <div className="flex items-center justify-center min-h-screen">
          <LoadingSpinner size="lg" />
        </div>
      )
    );
  }

  // Check role access
  if (
    allowedRoles &&
    (!session.user.role || !allowedRoles.includes(session.user.role as string))
  ) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-red-600">Access Denied</h1>
          <p className="text-gray-600 mt-2">
            You don't have permission to access this page.
          </p>
        </div>
      </div>
    );
  }

  // Authenticated and authorized
  return <>{children}</>;
}
