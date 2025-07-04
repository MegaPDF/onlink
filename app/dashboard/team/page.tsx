"use client";

import React from "react";
import { useAuth } from "@/hooks/use-auth";
import { TeamManagement } from "@/components/dashboard/team-management";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Users, Crown } from "lucide-react";
import Link from "next/link";

export default function TeamPage() {
  const { user } = useAuth();

  // If user doesn't have team access, show upgrade prompt
  if (!user?.team) {
    return (
      <div className="container mx-auto py-6 px-4 max-w-4xl">
        <div className="text-center space-y-6">
          <div className="mx-auto w-20 h-20 bg-primary/10 rounded-full flex items-center justify-center">
            <Users className="h-10 w-10 text-primary" />
          </div>

          <div className="space-y-2">
            <h1 className="text-3xl font-bold">Team Collaboration</h1>
            <p className="text-muted-foreground text-lg">
              Work together with your team on link management
            </p>
          </div>

          <Card className="max-w-2xl mx-auto text-left">
            <CardHeader>
              <CardTitle>Team Features Include:</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <div className="flex items-center gap-3">
                  <Users className="h-4 w-4 text-primary" />
                  <span>Invite team members with different roles</span>
                </div>
                <div className="flex items-center gap-3">
                  <Users className="h-4 w-4 text-primary" />
                  <span>Share folders and links with permissions</span>
                </div>
                <div className="flex items-center gap-3">
                  <Users className="h-4 w-4 text-primary" />
                  <span>Collaborative analytics and reporting</span>
                </div>
                <div className="flex items-center gap-3">
                  <Users className="h-4 w-4 text-primary" />
                  <span>Team usage tracking and limits</span>
                </div>
                <div className="flex items-center gap-3">
                  <Users className="h-4 w-4 text-primary" />
                  <span>Admin controls and user management</span>
                </div>
                <div className="flex items-center gap-3">
                  <Users className="h-4 w-4 text-primary" />
                  <span>Shared branding and custom domains</span>
                </div>
              </div>
            </CardContent>
          </Card>

          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link href="/dashboard/billing">
              <Button size="lg" className="w-full sm:w-auto">
                <Crown className="h-4 w-4 mr-2" />
                Upgrade to Enterprise
              </Button>
            </Link>
            <Link href="/dashboard">
              <Button variant="outline" size="lg" className="w-full sm:w-auto">
                Back to Dashboard
              </Button>
            </Link>
          </div>

          <div className="text-sm text-muted-foreground">
            Team features are available with Enterprise plan
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-6 px-4 max-w-6xl">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold">Team Management</h1>
        <p className="text-muted-foreground">
          Manage your team members and permissions
        </p>
      </div>

      {/* Team Management Component */}
      <TeamManagement />
    </div>
  );
}
