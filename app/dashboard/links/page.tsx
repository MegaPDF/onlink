"use client";

import React from "react";
import { LinksTable } from "@/components/dashboard/links-table";
import { FoldersSidebar } from "@/components/dashboard/folders-sidebar";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

export default function LinksPage() {
  return (
    <div className="flex h-full min-h-screen">
      {/* Folders Sidebar */}
      <FoldersSidebar className="w-64 border-r bg-muted/30" />

      {/* Main Content */}
      <div className="flex-1 overflow-auto">
        <div className="container mx-auto py-6 px-4 max-w-7xl">
          {/* Header */}
          <div className="mb-6">
            <h1 className="text-3xl font-bold">My Links</h1>
            <p className="text-muted-foreground">
              Manage and monitor all your shortened links
            </p>
          </div>

          {/* Links Table */}
          <LinksTable showFolderFilter={true} />
        </div>
      </div>
    </div>
  );
}
