"use client";

import React, { useState, useEffect } from "react";
import { FoldersSidebar } from "@/components/dashboard/folders-sidebar";
import { LinksTable } from "@/components/dashboard/links-table";
import { UrlShortener } from "@/components/dashboard/url-shortener";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Folder,
  FileText,
  Link as LinkIcon,
  Plus,
  Zap,
  RefreshCw,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface FolderData {
  _id: string;
  name: string;
  color: string;
  level: number;
  stats: {
    urlCount: number;
    totalClicks: number;
  };
}

export default function FoldersPage() {
  const toast = useToast();
  const [selectedFolderId, setSelectedFolderId] = useState<string | null>(null);
  const [folders, setFolders] = useState<FolderData[]>([]);
  const [showUrlShortener, setShowUrlShortener] = useState(false);
  const [linksKey, setLinksKey] = useState(0);
  const [foldersKey, setFoldersKey] = useState(0);

  // Fetch folders for the URL shortener dropdown
  useEffect(() => {
    fetchFolders();
  }, [foldersKey]);

  const fetchFolders = async () => {
    try {
      console.log("🔄 Fetching folders for folders page...");
      const response = await fetch("/api/client/folders");
      const result = await response.json();

      if (response.ok) {
        console.log("✅ Folders fetched:", result.data.folders?.length || 0);
        setFolders(result.data.folders || []);
      }
    } catch (error) {
      console.error("❌ Error loading folders:", error);
    }
  };

  const handleFolderSelect = (folderId: string | null) => {
    console.log("📁 Folder selected in folders page:", folderId);
    setSelectedFolderId(folderId);
  };

  const getFolderDisplayName = () => {
    if (selectedFolderId === null) return "All Links";
    if (selectedFolderId === "uncategorized") return "Uncategorized Links";
    const folder = getCurrentFolder();
    return folder ? folder.name : "Folder Contents";
  };

  const getFolderDescription = () => {
    if (selectedFolderId === null)
      return "All your shortened links across all folders";
    if (selectedFolderId === "uncategorized")
      return "Links that haven't been organized into folders yet";
    const folder = getCurrentFolder();
    return folder
      ? `Links in the ${folder.name} folder`
      : "Links in the selected folder";
  };

  // Get current folder data for context
  const getCurrentFolder = () => {
    if (!selectedFolderId || selectedFolderId === "uncategorized") return null;
    return folders.find((f) => f._id === selectedFolderId) || null;
  };

  // Handle successful link creation - FIXED: Refresh both links and folders
  const handleLinkCreated = (linkData: any) => {
    console.log("🎉 Link created in folders page:", linkData);

    setLinksKey((prev) => prev + 1); // Force links table refresh
    setFoldersKey((prev) => prev + 1); // Force folders refresh to update stats
    setShowUrlShortener(false); // Hide shortener after creation

    toast.success("Link created successfully!");

    // If link was created in a folder, give extra feedback
    if (linkData?.folder?.name) {
      toast.success(`Link added to ${linkData.folder.name} folder!`);
    }
  };

  // Format folders for UrlShortener component
  const formatFoldersForShortener = () => {
    return folders.map((folder) => ({
      id: folder._id,
      name: folder.name,
      color: folder.color,
    }));
  };

  // Get default folder ID for URL shortener
  const getDefaultFolderId = () => {
    if (selectedFolderId === "uncategorized") return ""; // No folder
    return selectedFolderId || ""; // Current folder or empty
  };

  // FIXED: Get proper folderId for LinksTable
  const getLinksTableFolderId = () => {
    console.log(
      "🔍 Getting folderId for LinksTable, selectedFolderId:",
      selectedFolderId
    );

    if (selectedFolderId === null) return undefined; // Show all links
    if (selectedFolderId === "uncategorized") return "null"; // Show uncategorized links

    const result = selectedFolderId; // Show specific folder links
    console.log("📊 LinksTable will receive folderId:", result);
    return result;
  };

  // Manual refresh function
  const handleRefresh = () => {
    setLinksKey((prev) => prev + 1);
    setFoldersKey((prev) => prev + 1);
    toast.success("Refreshed!");
  };

  return (
    <div className="flex h-full min-h-screen">
      {/* Folders Sidebar */}
      <FoldersSidebar
        key={foldersKey} // Force re-render when folders update
        className="w-64 border-r bg-muted/30"
        onFolderSelect={handleFolderSelect}
        selectedFolderId={selectedFolderId}
      />

      {/* Main Content */}
      <div className="flex-1 overflow-auto">
        <div className="container mx-auto py-6 px-4 max-w-7xl">
          {/* Header */}
          <div className="mb-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 mb-2">
                {selectedFolderId === null ? (
                  <LinkIcon className="h-6 w-6 text-primary" />
                ) : (
                  <Folder className="h-6 w-6 text-primary" />
                )}
                <h1 className="text-3xl font-bold">{getFolderDisplayName()}</h1>
                {selectedFolderId && (
                  <Badge variant="outline" className="ml-2">
                    {selectedFolderId === "uncategorized"
                      ? "Uncategorized"
                      : "Folder"}
                  </Badge>
                )}
              </div>

              {/* Action buttons */}
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  onClick={handleRefresh}
                  className="flex items-center gap-2"
                >
                  <RefreshCw className="h-4 w-4" />
                  Refresh
                </Button>
                <Button
                  onClick={() => setShowUrlShortener(!showUrlShortener)}
                  className="flex items-center gap-2"
                >
                  <Plus className="h-4 w-4" />
                  {showUrlShortener ? "Hide Shortener" : "Create Link"}
                </Button>
              </div>
            </div>
            <p className="text-muted-foreground">{getFolderDescription()}</p>
          </div>

          {/* Show folder context info with real-time stats */}
          {selectedFolderId &&
            selectedFolderId !== "uncategorized" &&
            getCurrentFolder() && (
              <Card
                className="border-l-4 mb-6"
                style={{ borderLeftColor: getCurrentFolder()?.color }}
              >
                <CardContent className="pt-4">
                  <div className="flex items-center gap-3">
                    <div
                      className="w-4 h-4 rounded-full"
                      style={{ backgroundColor: getCurrentFolder()?.color }}
                    />
                    <div>
                      <h3 className="font-medium">
                        {getCurrentFolder()?.name}
                      </h3>
                      <p className="text-sm text-muted-foreground">
                        {getCurrentFolder()?.stats.urlCount} links •{" "}
                        {getCurrentFolder()?.stats.totalClicks} total clicks
                      </p>
                    </div>
                    <Badge variant="outline" className="ml-auto">
                      Level {(getCurrentFolder()?.level ?? 0) + 1}
                    </Badge>
                  </div>
                </CardContent>
              </Card>
            )}

          {/* URL Shortener - Show when button clicked */}
          {showUrlShortener && (
            <Card className="mb-6">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Zap className="h-5 w-5" />
                  Create New Link
                  {selectedFolderId && selectedFolderId !== "uncategorized" && (
                    <Badge variant="secondary">
                      Will be added to:{" "}
                      {getCurrentFolder()?.name || "Selected folder"}
                    </Badge>
                  )}
                </CardTitle>
                <CardDescription>
                  Create a shortened link
                  {selectedFolderId === "uncategorized"
                    ? " (will be uncategorized)"
                    : selectedFolderId
                    ? ` in the ${getCurrentFolder()?.name || "selected"} folder`
                    : ""}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <UrlShortener
                  folders={formatFoldersForShortener()}
                  defaultFolderId={getDefaultFolderId()}
                  onSuccess={handleLinkCreated}
                />
              </CardContent>
            </Card>
          )}

          {/* Debug info */}
          <div className="text-xs text-muted-foreground bg-muted p-2 rounded mb-4">
            <strong>Debug:</strong> selectedFolderId = "
            {selectedFolderId || "null"}", linksTableFolderId = "
            {getLinksTableFolderId() || "undefined"}", showFolderFilter ={" "}
            {selectedFolderId === null ? "true" : "false"}
          </div>

          {/* Content Area - FIXED: Always render LinksTable with proper filtering */}
          {selectedFolderId === null ? (
            /* Show welcome/getting started when no folder is selected */
            <div className="space-y-6">
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
                        Create links directly in folders or move existing links
                        between folders as needed.
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
                        Create sub-folders to build a hierarchical structure
                        that matches your workflow.
                      </p>
                    </div>
                  </div>

                  <div className="pt-4 border-t">
                    <h4 className="font-medium mb-2">Quick Tips:</h4>
                    <ul className="space-y-1 text-sm text-muted-foreground">
                      <li>
                        • Click the "+" button in the sidebar to create your
                        first folder
                      </li>
                      <li>
                        • Use the "Create Link" button to add links directly to
                        folders
                      </li>
                      <li>
                        • Right-click on folders for more options like edit and
                        delete
                      </li>
                      <li>
                        • Folders help you track performance by category or
                        campaign
                      </li>
                    </ul>
                  </div>
                </CardContent>
              </Card>

              {/* Show all links in a separate card */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <LinkIcon className="h-5 w-5" />
                    All Your Links
                  </CardTitle>
                  <CardDescription>
                    Browse all your links across all folders
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <LinksTable key={linksKey} showFolderFilter={true} />
                </CardContent>
              </Card>
            </div>
          ) : (
            /* FIXED: Show filtered links when a folder is selected */
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center justify-between">
                  <span className="flex items-center gap-2">
                    <Folder className="h-5 w-5" />
                    {selectedFolderId === "uncategorized"
                      ? "Uncategorized Links"
                      : `${getCurrentFolder()?.name || "Folder"} Links`}
                  </span>
                  <Badge variant="outline">
                    {selectedFolderId === "uncategorized"
                      ? "Uncategorized"
                      : "Selected Folder"}
                  </Badge>
                </CardTitle>
                <CardDescription>
                  {selectedFolderId === "uncategorized"
                    ? "Links that haven't been assigned to any folder"
                    : `Links in the ${
                        getCurrentFolder()?.name || "selected"
                      } folder`}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <LinksTable
                  key={linksKey}
                  folderId={getLinksTableFolderId()}
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
