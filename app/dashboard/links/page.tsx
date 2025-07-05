"use client";

import React, { useState, useEffect } from "react";
import { LinksTable } from "@/components/dashboard/links-table";
import { FoldersSidebar } from "@/components/dashboard/folders-sidebar";
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
import { Plus, Zap, Folder, Link as LinkIcon, RefreshCw } from "lucide-react";
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

export default function LinksPage() {
  const toast = useToast();
  // Add state to track selected folder
  const [selectedFolderId, setSelectedFolderId] = useState<string | null>(null);
  const [folders, setFolders] = useState<FolderData[]>([]);
  const [showUrlShortener, setShowUrlShortener] = useState(false);
  const [linksKey, setLinksKey] = useState(0); // Force links table refresh
  const [foldersKey, setFoldersKey] = useState(0); // Force folders refresh

  // Fetch folders for the URL shortener dropdown
  useEffect(() => {
    fetchFolders();
  }, [foldersKey]); // Re-fetch when foldersKey changes

  const fetchFolders = async () => {
    try {
      console.log("🔄 Fetching folders...");
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

  // Add handler for folder selection
  const handleFolderSelect = (folderId: string | null) => {
    console.log("📁 Folder selected:", folderId);
    setSelectedFolderId(folderId);
  };

  // Helper to convert selectedFolderId to the format LinksTable expects
  const getLinksTableFolderId = () => {
    if (selectedFolderId === null) return undefined; // Show all links
    if (selectedFolderId === "uncategorized") return "null"; // Show uncategorized links
    return selectedFolderId; // Show specific folder links
  };

  // Get current folder data for context
  const getCurrentFolder = () => {
    if (!selectedFolderId || selectedFolderId === "uncategorized") return null;
    return folders.find((f) => f._id === selectedFolderId) || null;
  };

  // Handle successful link creation - FIXED: Refresh both links and folders
  const handleLinkCreated = (linkData: any) => {
    console.log("🎉 Link created:", linkData);

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

  const getFolderDisplayName = () => {
    if (selectedFolderId === null) return "All Links";
    if (selectedFolderId === "uncategorized") return "Uncategorized Links";
    const folder = getCurrentFolder();
    return folder ? folder.name : "Folder Links";
  };

  // Manual refresh function
  const handleRefresh = () => {
    setLinksKey((prev) => prev + 1);
    setFoldersKey((prev) => prev + 1);
    toast.success("Refreshed!");
  };

  return (
    <div className="flex h-full min-h-screen">
      {/* FIXED: Add missing props to FoldersSidebar with key for refresh */}
      <FoldersSidebar
        key={foldersKey} // Force re-render when folders update
        className="w-64 border-r bg-muted/30"
        onFolderSelect={handleFolderSelect}
        selectedFolderId={selectedFolderId}
      />

      {/* Main Content */}
      <div className="flex-1 overflow-auto">
        <div className="container mx-auto py-6 px-4 max-w-7xl space-y-6">
          {/* Header */}
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold flex items-center gap-2">
                {selectedFolderId === null ? (
                  <LinkIcon className="h-8 w-8 text-primary" />
                ) : (
                  <Folder className="h-8 w-8 text-primary" />
                )}
                {getFolderDisplayName()}
              </h1>
              <p className="text-muted-foreground">
                Manage and monitor your shortened links
                {selectedFolderId &&
                  (selectedFolderId === "uncategorized"
                    ? " - Links without folders"
                    : ` - ${
                        getCurrentFolder()?.stats.urlCount || 0
                      } links in this folder`)}
              </p>
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

          {/* Show folder context info with real-time stats */}
          {selectedFolderId &&
            selectedFolderId !== "uncategorized" &&
            getCurrentFolder() && (
              <Card
                className="border-l-4"
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

          {/* URL Shortener - FIXED: Pass folder context */}
          {showUrlShortener && (
            <Card>
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
          <div className="text-xs text-muted-foreground bg-muted p-2 rounded">
            <strong>Debug:</strong> selectedFolderId = "
            {selectedFolderId || "null"}", linksTableFolderId = "
            {getLinksTableFolderId() || "undefined"}", folders ={" "}
            {folders.length}, currentFolder ={" "}
            {getCurrentFolder()?.name || "none"}
          </div>

          {/* FIXED: Pass selectedFolderId to LinksTable and force refresh */}
          <LinksTable
            key={linksKey} // Force refresh when links are created
            folderId={getLinksTableFolderId()}
            showFolderFilter={true}
          />
        </div>
      </div>
    </div>
  );
}
