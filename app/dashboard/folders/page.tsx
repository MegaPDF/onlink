"use client";

import React, { useState } from "react";
import { FoldersSidebar } from "@/components/dashboard/folders-sidebar";
import { LinksTable } from "@/components/dashboard/links-table";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Folder, FileText } from "lucide-react";

export default function FoldersPage() {
  const [selectedFolderId, setSelectedFolderId] = useState<string | null>(null);

  return (
    <div className="flex h-full min-h-screen">
      {/* Folders Sidebar */}
      <FoldersSidebar
        className="w-64 border-r bg-muted/30"
        onFolderSelect={setSelectedFolderId}
        selectedFolderId={selectedFolderId}
      />

      {/* Main Content */}
      <div className="flex-1 overflow-auto">
        <div className="container mx-auto py-6 px-4 max-w-7xl">
          {/* Header */}
          <div className="mb-6">
            <div className="flex items-center gap-2 mb-2">
              <Folder className="h-6 w-6 text-primary" />
              <h1 className="text-3xl font-bold">
                {selectedFolderId ? "Folder Contents" : "All Folders"}
              </h1>
            </div>
            <p className="text-muted-foreground">
              {selectedFolderId
                ? "Manage links in the selected folder"
                : "Organize your links with folders for better management"}
            </p>
          </div>

          {/* Content Area */}
          {!selectedFolderId ? (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <FileText className="h-5 w-5" />
                  Getting Started with Folders
                </CardTitle>
                <CardDescription>
                  Organize your links into folders for better management
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid gap-4 md:grid-cols-2">
                  <div className="p-4 border rounded-lg">
                    <h3 className="font-medium mb-2">Create Folders</h3>
                    <p className="text-sm text-muted-foreground">
                      Use the sidebar to create new folders and organize your
                      links by project, campaign, or any system that works for
                      you.
                    </p>
                  </div>
                  <div className="p-4 border rounded-lg">
                    <h3 className="font-medium mb-2">Organize Links</h3>
                    <p className="text-sm text-muted-foreground">
                      Drag and drop links between folders, or assign folders
                      when creating new short links.
                    </p>
                  </div>
                  <div className="p-4 border rounded-lg">
                    <h3 className="font-medium mb-2">Color Coding</h3>
                    <p className="text-sm text-muted-foreground">
                      Assign colors to folders for quick visual identification
                      and better organization.
                    </p>
                  </div>
                  <div className="p-4 border rounded-lg">
                    <h3 className="font-medium mb-2">Nested Structure</h3>
                    <p className="text-sm text-muted-foreground">
                      Create sub-folders to build a hierarchical structure that
                      matches your workflow.
                    </p>
                  </div>
                </div>

                <div className="pt-4 border-t">
                  <h4 className="font-medium mb-2">Quick Tips:</h4>
                  <ul className="space-y-1 text-sm text-muted-foreground">
                    <li>
                      • Click the "+" button in the sidebar to create your first
                      folder
                    </li>
                    <li>
                      • Right-click on folders for more options like edit,
                      delete, and sharing
                    </li>
                    <li>
                      • Use the search function to quickly find links across all
                      folders
                    </li>
                    <li>
                      • Folders help you track performance by category or
                      campaign
                    </li>
                  </ul>
                </div>
              </CardContent>
            </Card>
          ) : (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center justify-between">
                  <span>Folder Links</span>
                  <Badge variant="outline">Selected Folder</Badge>
                </CardTitle>
                <CardDescription>Links in the selected folder</CardDescription>
              </CardHeader>
              <CardContent>
                <LinksTable
                  folderId={selectedFolderId}
                  showFolderFilter={false}
                />
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}
