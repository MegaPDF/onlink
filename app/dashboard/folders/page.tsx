// ============= app/dashboard/folders/page.tsx =============
"use client";

import React, { useState, useEffect } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { LoadingSpinner } from "@/components/ui/loading-spinner";
import { useAuth } from "@/hooks/use-auth";
import { useToast } from "@/hooks/use-toast";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Folder,
  FolderPlus,
  MoreVertical,
  Edit3,
  Trash2,
  LinkIcon,
  MousePointer,
  Search,
  Grid3X3,
  List,
  ChevronRight,
  Plus,
  Archive,
} from "lucide-react";
import { formatNumber } from "@/lib/utils";
import { FoldersSidebar } from "@/components/dashboard/folders-sidebar";
import { toast } from "sonner";
import { formatDate } from "date-fns";

interface FolderData {
  _id: string;
  name: string;
  description?: string;
  color: string;
  icon?: string;
  parentId?: string;
  path: string;
  level: number;
  stats: {
    urlCount: number;
    totalClicks: number;
  };
  children?: FolderData[];
  isExpanded?: boolean;
  createdAt: string;
  updatedAt: string;
}

interface LinkData {
  _id: string;
  shortCode: string;
  originalUrl: string;
  title?: string;
  clicks: {
    total: number;
    today: number;
  };
  createdAt: string;
  isActive: boolean;
  domain: string;
}

export default function FoldersPage() {
  const { user } = useAuth();
  const [folders, setFolders] = useState<FolderData[]>([]);
  const [selectedFolder, setSelectedFolder] = useState<FolderData | null>(null);
  const [selectedFolderId, setSelectedFolderId] = useState<string | null>(null);
  const [folderLinks, setFolderLinks] = useState<LinkData[]>([]);
  const [loading, setLoading] = useState(true);
  const [linksLoading, setLinksLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [createForm, setCreateForm] = useState({
    name: "",
    description: "",
    color: "#3B82F6",
    parentId: "",
  });

  useEffect(() => {
    fetchFolders();
  }, []);

  useEffect(() => {
    if (selectedFolderId) {
      fetchFolderLinks(selectedFolderId);
    } else {
      fetchUncategorizedLinks();
    }
  }, [selectedFolderId]);

  const fetchFolders = async () => {
    try {
      setLoading(true);
      const response = await fetch("/api/client/folders");
      const result = await response.json();

      if (response.ok) {
        setFolders(result.data.folders);
      } else {
        toast.error("Failed to fetch folders");
      }
    } catch (error) {
      console.error("Error fetching folders:", error);
      toast.error("Error loading folders");
    } finally {
      setLoading(false);
    }
  };

  const fetchFolderLinks = async (folderId: string) => {
    try {
      setLinksLoading(true);
      const response = await fetch(
        `/api/client/links?folderId=${folderId}&limit=50`
      );
      const result = await response.json();

      if (response.ok) {
        setFolderLinks(result.data.urls || []);
      } else {
        toast.error("Failed to fetch folder links");
      }
    } catch (error) {
      console.error("Error fetching folder links:", error);
      toast.error("Error loading folder links");
    } finally {
      setLinksLoading(false);
    }
  };

  const fetchUncategorizedLinks = async () => {
    try {
      setLinksLoading(true);
      const response = await fetch(
        "/api/client/links?uncategorized=true&limit=50"
      );
      const result = await response.json();

      if (response.ok) {
        setFolderLinks(result.data.urls || []);
      } else {
        toast.error("Failed to fetch uncategorized links");
      }
    } catch (error) {
      console.error("Error fetching uncategorized links:", error);
      toast.error("Error loading uncategorized links");
    } finally {
      setLinksLoading(false);
    }
  };

  const handleCreateFolder = async () => {
    try {
      const response = await fetch("/api/client/folders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(createForm),
      });

      if (response.ok) {
        toast.success("Folder created successfully");
        setCreateDialogOpen(false);
        setCreateForm({
          name: "",
          description: "",
          color: "#3B82F6",
          parentId: "",
        });
        fetchFolders();
      } else {
        const result = await response.json();
        toast.error(result.error || "Failed to create folder");
      }
    } catch (error) {
      console.error("Error creating folder:", error);
      toast.error("Error creating folder");
    }
  };

  const handleUpdateFolder = async () => {
    if (!selectedFolder) return;

    try {
      const response = await fetch(
        `/api/client/folders/${selectedFolder._id}`,
        {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(createForm),
        }
      );

      if (response.ok) {
        toast.success("Folder updated successfully");
        setEditDialogOpen(false);
        setSelectedFolder(null);
        setCreateForm({
          name: "",
          description: "",
          color: "#3B82F6",
          parentId: "",
        });
        fetchFolders();
      } else {
        const result = await response.json();
        toast.error(result.error || "Failed to update folder");
      }
    } catch (error) {
      console.error("Error updating folder:", error);
      toast.error("Error updating folder");
    }
  };

  const handleDeleteFolder = async () => {
    if (!selectedFolder) return;

    try {
      const response = await fetch(
        `/api/client/folders/${selectedFolder._id}`,
        {
          method: "DELETE",
        }
      );

      if (response.ok) {
        toast.success("Folder deleted successfully");
        setDeleteDialogOpen(false);
        setSelectedFolder(null);
        if (selectedFolderId === selectedFolder._id) {
          setSelectedFolderId(null);
        }
        fetchFolders();
      } else {
        const result = await response.json();
        toast.error(result.error || "Failed to delete folder");
      }
    } catch (error) {
      console.error("Error deleting folder:", error);
      toast.error("Error deleting folder");
    }
  };

  const openEditDialog = (folder: FolderData) => {
    setSelectedFolder(folder);
    setCreateForm({
      name: folder.name,
      description: folder.description || "",
      color: folder.color,
      parentId: folder.parentId || "",
    });
    setEditDialogOpen(true);
  };

  const openDeleteDialog = (folder: FolderData) => {
    setSelectedFolder(folder);
    setDeleteDialogOpen(true);
  };

  const filteredFolders = folders.filter((folder) =>
    folder.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const filteredLinks = folderLinks.filter(
    (link) =>
      link.title?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      link.shortCode.toLowerCase().includes(searchTerm.toLowerCase()) ||
      link.originalUrl.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const selectedFolderData = folders.find((f) => f._id === selectedFolderId);

  if (loading) {
    return (
      <div className="container mx-auto py-6 px-4">
        <div className="flex items-center justify-center min-h-96">
          <LoadingSpinner size="lg" />
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-6 px-4">
      <div className="flex h-[calc(100vh-8rem)] gap-6">
        {/* Folders Sidebar */}
        <div className="w-80 flex-shrink-0">
          <FoldersSidebar
            onFolderSelect={setSelectedFolderId}
            selectedFolderId={selectedFolderId}
          />
        </div>

        {/* Main Content */}
        <div className="flex-1 space-y-6">
          {/* Header */}
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <h1 className="text-3xl font-bold">
                {selectedFolderData ? selectedFolderData.name : "All Links"}
              </h1>
              <p className="text-muted-foreground">
                {selectedFolderData
                  ? selectedFolderData.description ||
                    "Manage links in this folder"
                  : "Uncategorized links that haven't been organized into folders"}
              </p>
            </div>

            <div className="flex gap-2">
              <Dialog
                open={createDialogOpen}
                onOpenChange={setCreateDialogOpen}
              >
                <DialogTrigger asChild>
                  <Button>
                    <FolderPlus className="h-4 w-4 mr-2" />
                    New Folder
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Create New Folder</DialogTitle>
                    <DialogDescription>
                      Create a new folder to organize your links
                    </DialogDescription>
                  </DialogHeader>
                  <div className="space-y-4">
                    <div>
                      <Label htmlFor="name">Folder Name</Label>
                      <Input
                        id="name"
                        value={createForm.name}
                        onChange={(e) =>
                          setCreateForm({ ...createForm, name: e.target.value })
                        }
                        placeholder="Enter folder name"
                      />
                    </div>
                    <div>
                      <Label htmlFor="description">
                        Description (Optional)
                      </Label>
                      <Textarea
                        id="description"
                        value={createForm.description}
                        onChange={(e) =>
                          setCreateForm({
                            ...createForm,
                            description: e.target.value,
                          })
                        }
                        placeholder="Enter folder description"
                      />
                    </div>
                    <div>
                      <Label htmlFor="color">Color</Label>
                      <Input
                        id="color"
                        type="color"
                        value={createForm.color}
                        onChange={(e) =>
                          setCreateForm({
                            ...createForm,
                            color: e.target.value,
                          })
                        }
                      />
                    </div>
                  </div>
                  <DialogFooter>
                    <Button
                      variant="outline"
                      onClick={() => setCreateDialogOpen(false)}
                    >
                      Cancel
                    </Button>
                    <Button onClick={handleCreateFolder}>Create Folder</Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>

              <Button
                variant="outline"
                size="icon"
                onClick={() =>
                  setViewMode(viewMode === "grid" ? "list" : "grid")
                }
              >
                {viewMode === "grid" ? (
                  <List className="h-4 w-4" />
                ) : (
                  <Grid3X3 className="h-4 w-4" />
                )}
              </Button>
            </div>
          </div>

          {/* Search and Stats */}
          <Card>
            <CardContent className="p-4">
              <div className="flex flex-col sm:flex-row gap-4 items-center justify-between">
                <div className="relative flex-1 max-w-md">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
                  <Input
                    placeholder="Search links..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10"
                  />
                </div>

                <div className="flex gap-4 text-sm text-muted-foreground">
                  <div className="flex items-center gap-1">
                    <LinkIcon className="h-4 w-4" />
                    {formatNumber(folderLinks.length)} links
                  </div>
                  <div className="flex items-center gap-1">
                    <MousePointer className="h-4 w-4" />
                    {formatNumber(
                      folderLinks.reduce(
                        (sum, link) => sum + link.clicks.total,
                        0
                      )
                    )}{" "}
                    clicks
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Links Content */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                {selectedFolderData && (
                  <div
                    className="w-4 h-4 rounded"
                    style={{ backgroundColor: selectedFolderData.color }}
                  />
                )}
                Links{" "}
                {selectedFolderData
                  ? `in ${selectedFolderData.name}`
                  : "(Uncategorized)"}
              </CardTitle>
            </CardHeader>
            <CardContent>
              {linksLoading ? (
                <div className="flex items-center justify-center py-12">
                  <LoadingSpinner size="lg" />
                </div>
              ) : filteredLinks.length === 0 ? (
                <div className="text-center py-12">
                  <Archive className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                  <h3 className="text-lg font-semibold mb-2">No links found</h3>
                  <p className="text-muted-foreground mb-4">
                    {searchTerm
                      ? "No links match your search criteria"
                      : selectedFolderData
                      ? "This folder doesn't contain any links yet"
                      : "No uncategorized links found"}
                  </p>
                  <Button asChild>
                    <a href="/dashboard/links">
                      <Plus className="h-4 w-4 mr-2" />
                      Create New Link
                    </a>
                  </Button>
                </div>
              ) : (
                <div
                  className={
                    viewMode === "grid"
                      ? "grid gap-4 md:grid-cols-2 lg:grid-cols-3"
                      : "space-y-3"
                  }
                >
                  {filteredLinks.map((link) => (
                    <Card
                      key={link._id}
                      className={viewMode === "list" ? "p-4" : ""}
                    >
                      <CardContent
                        className={viewMode === "grid" ? "p-4" : "p-0"}
                      >
                        <div className="space-y-2">
                          <div className="flex items-start justify-between">
                            <div className="space-y-1 flex-1 min-w-0">
                              <h4 className="font-medium truncate">
                                {link.title || "Untitled"}
                              </h4>
                              <p className="text-sm text-muted-foreground truncate">
                                {link.domain}/{link.shortCode}
                              </p>
                              <p className="text-xs text-muted-foreground truncate">
                                {link.originalUrl}
                              </p>
                            </div>
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button variant="ghost" size="sm">
                                  <MoreVertical className="h-4 w-4" />
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end">
                                <DropdownMenuLabel>Actions</DropdownMenuLabel>
                                <DropdownMenuItem>
                                  <Edit3 className="mr-2 h-4 w-4" />
                                  Edit
                                </DropdownMenuItem>
                                <DropdownMenuItem>
                                  <Folder className="mr-2 h-4 w-4" />
                                  Move to Folder
                                </DropdownMenuItem>
                                <DropdownMenuSeparator />
                                <DropdownMenuItem className="text-red-600">
                                  <Trash2 className="mr-2 h-4 w-4" />
                                  Delete
                                </DropdownMenuItem>
                              </DropdownMenuContent>
                            </DropdownMenu>
                          </div>

                          <div className="flex items-center justify-between text-sm">
                            <div className="flex items-center gap-4">
                              <div className="flex items-center gap-1">
                                <MousePointer className="h-3 w-3 text-muted-foreground" />
                                <span>{formatNumber(link.clicks.total)}</span>
                              </div>
                              <Badge
                                variant={
                                  link.isActive ? "default" : "secondary"
                                }
                              >
                                {link.isActive ? "Active" : "Inactive"}
                              </Badge>
                            </div>
                            <span className="text-muted-foreground">
                              {formatDate(link.createdAt, "MMM dd")}
                            </span>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Edit Dialog */}
      <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Folder</DialogTitle>
            <DialogDescription>Update folder information</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="edit-name">Folder Name</Label>
              <Input
                id="edit-name"
                value={createForm.name}
                onChange={(e) =>
                  setCreateForm({ ...createForm, name: e.target.value })
                }
                placeholder="Enter folder name"
              />
            </div>
            <div>
              <Label htmlFor="edit-description">Description (Optional)</Label>
              <Textarea
                id="edit-description"
                value={createForm.description}
                onChange={(e) =>
                  setCreateForm({ ...createForm, description: e.target.value })
                }
                placeholder="Enter folder description"
              />
            </div>
            <div>
              <Label htmlFor="edit-color">Color</Label>
              <Input
                id="edit-color"
                type="color"
                value={createForm.color}
                onChange={(e) =>
                  setCreateForm({ ...createForm, color: e.target.value })
                }
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleUpdateFolder}>Update Folder</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Dialog */}
      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Folder</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete "{selectedFolder?.name}"? This
              action cannot be undone. All links in this folder will become
              uncategorized.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setDeleteDialogOpen(false)}
            >
              Cancel
            </Button>
            <Button variant="destructive" onClick={handleDeleteFolder}>
              Delete Folder
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
