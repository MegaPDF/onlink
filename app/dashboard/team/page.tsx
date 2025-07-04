"use client";

import React from "react";
import { TeamManagement } from "@/components/dashboard/team-management";
import { useAuth } from "@/hooks/use-auth";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Users, Crown, Zap, Shield, Globe, Star } from "lucide-react";
import Link from "next/link";

export default function TeamPage() {
  const { user } = useAuth();

  // If user is not on a team plan or doesn't have a team
  if (!user?.team && user?.plan !== "enterprise") {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">
            Team Collaboration
          </h1>
          <p className="text-muted-foreground">
            Work together with your team on link management
          </p>
        </div>

        <Card className="border-blue-200 bg-blue-50 dark:border-blue-800 dark:bg-blue-950">
          <CardContent className="p-8 text-center">
            <Users className="mx-auto h-16 w-16 text-blue-600 mb-4" />
            <h2 className="text-2xl font-bold mb-2">Team Features Available</h2>
            <p className="text-muted-foreground mb-6 max-w-md mx-auto">
              Upgrade to a Team or Enterprise plan to collaborate with your team
              members, share links, and manage permissions.
            </p>

            <div className="grid gap-4 md:grid-cols-2 mb-6 max-w-2xl mx-auto">
              <div className="p-4 bg-white dark:bg-gray-800 rounded-lg">
                <Shield className="h-8 w-8 text-blue-600 mb-2" />
                <h3 className="font-semibold mb-1">Role-based Access</h3>
                <p className="text-sm text-muted-foreground">
                  Control who can create, edit, or delete links
                </p>
              </div>

              <div className="p-4 bg-white dark:bg-gray-800 rounded-lg">
                <Globe className="h-8 w-8 text-green-600 mb-2" />
                <h3 className="font-semibold mb-1">Shared Domains</h3>
                <p className="text-sm text-muted-foreground">
                  Use custom domains across your team
                </p>
              </div>

              <div className="p-4 bg-white dark:bg-gray-800 rounded-lg">
                <Star className="h-8 w-8 text-purple-600 mb-2" />
                <h3 className="font-semibold mb-1">Team Analytics</h3>
                <p className="text-sm text-muted-foreground">
                  View aggregated analytics for your team
                </p>
              </div>

              <div className="p-4 bg-white dark:bg-gray-800 rounded-lg">
                <Zap className="h-8 w-8 text-orange-600 mb-2" />
                <h3 className="font-semibold mb-1">Bulk Operations</h3>
                <p className="text-sm text-muted-foreground">
                  Import and export links as a team
                </p>
              </div>
            </div>

            <div className="flex gap-3 justify-center">
              <Button asChild>
                <Link href="/dashboard/billing">
                  <Crown className="mr-2 h-4 w-4" />
                  Upgrade to Team
                </Link>
              </Button>
              <Button variant="outline" asChild>
                <Link href="/contact">Learn More</Link>
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Team Management</h1>
        <p className="text-muted-foreground">
          Manage your team members and their permissions
        </p>
      </div>

      <TeamManagement />
    </div>
  );
}
