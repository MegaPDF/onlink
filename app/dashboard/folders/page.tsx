"use client";

import React, { useState, useEffect } from "react";
import { useAuth } from "@/hooks/use-auth";
import { useToast } from "@/hooks/use-toast";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
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
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import {
  Folder,
  Plus,
  MoreHorizontal,
  Edit,
  Trash2,
  LinkIcon,
  MousePointer,
  Eye,
  Share,
  Archive,
  Star,
  Calendar,
  Settings,
  FolderOpen,
  Hash,
} from "lucide-react";
import { formatNumber } from "@/lib/utils";
import Link from "next/link";
import { formatDistanceToNow } from "date-fns";

interface FolderData {
  id: string;
  name: string;
  description?: string;
  color: string;
  linksCount: number;
  totalClicks: number;
  createdAt: string;
  updatedAt: string;
  isDefault: boolean;
}

const colorOptions = [
  "#3B82F6",
  "#EF4444",
  "#10B981",
  "#F59E0B",
  "#8B5CF6",
  "#06B6D4",
  "#F97316",
  "#84CC16",
  "#EC4899",
  "#6B7280",
];

export default function FoldersPage() {
  const { user } = useAuth();
  const toast = useToast();
  const [folders, setFolders] = useState<FolderData[]>([]);
  const [loading, setLoading] = useState(true);
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [selectedFolder, setSelectedFolder] = useState<FolderData | null>(null);
  const [formData, setFormData] = useState({
    name: "",
    description: "",
    color: colorOptions[0],
  });

  useEffect(() => {
    fetchFolders();
  }, []);

  const fetchFolders = async () => {
    try {
      const response = await fetch("/api/client/folders");
      if (response.ok) {
        const data = await response.json();
        setFolders(data.data || []);
      }
    } catch (error) {
      console.error("Failed to fetch folders:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateFolder = async () => {
    try {
      const response = await fetch("/api/client/folders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });

      const result = await response.json();

      if (!response.ok) {
        if (result.upgradeRequired) {
          toast.error(result.error, {
            action: {
              label: "Upgrade",
              onClick: () => (window.location.href = "/dashboard/billing"),
            },
          });
          return;
        }
        throw new Error(result.error);
      }

      toast.success("Folder created successfully!");
      setCreateDialogOpen(false);
      setFormData({ name: "", description: "", color: colorOptions[0] });
      fetchFolders();
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Failed to create folder"
      );
    }
  };

  const handleUpdateFolder = async () => {
    if (!selectedFolder) return;

    try {
      const response = await fetch(`/api/client/folders/${selectedFolder.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });

      if (!response.ok) {
        const result = await response.json();
        throw new Error(result.error);
      }

      toast.success("Folder updated successfully!");
      setEditDialogOpen(false);
      setSelectedFolder(null);
      fetchFolders();
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Failed to update folder"
      );
    }
  };

  const handleDeleteFolder = async (folderId: string) => {
    try {
      const response = await fetch(`/api/client/folders/${folderId}`, {
        method: "DELETE",
      });

      if (!response.ok) {
        const result = await response.json();
        throw new Error(result.error);
      }

      toast.success("Folder deleted successfully!");
      fetchFolders();
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Failed to delete folder"
      );
    }
  };

  const openEditDialog = (folder: FolderData) => {
    setSelectedFolder(folder);
    setFormData({
      name: folder.name,
      description: folder.description || "",
      color: folder.color,
    });
    setEditDialogOpen(true);
  };

  if (loading) {
    return (
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {Array.from({ length: 6 }).map((_, i) => (
          <Card key={i}>
            <CardContent className="p-6">
              <div className="h-24 bg-muted animate-pulse rounded" />
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Folders</h1>
          <p className="text-muted-foreground">
            Organize your links into folders for better management
          </p>
        </div>

        <Dialog open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="mr-2 h-4 w-4" />
              Create Folder
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
              <div className="space-y-2">
                <Label htmlFor="name">Folder Name *</Label>
                <Input
                  id="name"
                  placeholder="Enter folder name"
                  value={formData.name}
                  onChange={(e) =>
                    setFormData({ ...formData, name: e.target.value })
                  }
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="description">Description</Label>
                <Input
                  id="description"
                  placeholder="Optional description"
                  value={formData.description}
                  onChange={(e) =>
                    setFormData({ ...formData, description: e.target.value })
                  }
                />
              </div>
              <div className="space-y-2">
                <Label>Color</Label>
                <div className="flex gap-2">
                  {colorOptions.map((color) => (
                    <button
                      key={color}
                      className={`w-8 h-8 rounded-full border-2 ${
                        formData.color === color
                          ? "border-gray-900 dark:border-gray-100"
                          : "border-gray-300"
                      }`}
                      style={{ backgroundColor: color }}
                      onClick={() => setFormData({ ...formData, color })}
                    />
                  ))}
                </div>
              </div>
            </div>
            <DialogFooter>
              <Button
                variant="outline"
                onClick={() => setCreateDialogOpen(false)}
              >
                Cancel
              </Button>
              <Button
                onClick={handleCreateFolder}
                disabled={!formData.name.trim()}
              >
                Create Folder
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {/* Folders Grid */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {folders.map((folder) => (
          <Card key={folder.id} className="hover:shadow-md transition-shadow">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div
                    className="w-10 h-10 rounded-lg flex items-center justify-center"
                    style={{ backgroundColor: `${folder.color}20` }}
                  >
                    <Folder
                      className="w-5 h-5"
                      style={{ color: folder.color }}
                    />
                  </div>
                  <div>
                    <CardTitle className="text-base">{folder.name}</CardTitle>
                    {folder.isDefault && (
                      <Badge variant="outline" className="text-xs">
                        Default
                      </Badge>
                    )}
                  </div>
                </div>

                {!folder.isDefault && (
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="sm">
                        <MoreHorizontal className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem onClick={() => openEditDialog(folder)}>
                        <Edit className="mr-2 h-4 w-4" />
                        Edit
                      </DropdownMenuItem>
                      <DropdownMenuItem asChild>
                        <Link href={`/dashboard/links?folder=${folder.id}`}>
                          <Eye className="mr-2 h-4 w-4" />
                          View Links
                        </Link>
                      </DropdownMenuItem>
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <DropdownMenuItem
                            onSelect={(e) => e.preventDefault()}
                          >
                            <Trash2 className="mr-2 h-4 w-4" />
                            Delete
                          </DropdownMenuItem>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>Delete Folder</AlertDialogTitle>
                            <AlertDialogDescription>
                              Are you sure you want to delete "{folder.name}"?
                              Links in this folder will be moved to the default
                              folder.
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>Cancel</AlertDialogCancel>
                            <AlertDialogAction
                              onClick={() => handleDeleteFolder(folder.id)}
                            >
                              Delete
                            </AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    </DropdownMenuContent>
                  </DropdownMenu>
                )}
              </div>

              {folder.description && (
                <CardDescription className="text-sm">
                  {folder.description}
                </CardDescription>
              )}
            </CardHeader>

            <CardContent>
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div className="flex items-center gap-2">
                  <LinkIcon className="w-4 h-4 text-muted-foreground" />
                  <span>{formatNumber(folder.linksCount)} links</span>
                </div>
                <div className="flex items-center gap-2">
                  <MousePointer className="w-4 h-4 text-muted-foreground" />
                  <span>{formatNumber(folder.totalClicks)} clicks</span>
                </div>
              </div>

              <div className="mt-4 pt-4 border-t text-xs text-muted-foreground">
                <div className="flex items-center gap-1">
                  <Calendar className="w-3 h-3" />
                  Created {formatDistanceToNow(new Date(folder.createdAt))}
                </div>
              </div>

              <Button
                variant="outline"
                size="sm"
                className="w-full mt-3"
                asChild
              >
                <Link href={`/dashboard/links?folder=${folder.id}`}>
                  <FolderOpen className="mr-2 h-4 w-4" />
                  Open Folder
                </Link>
              </Button>
            </CardContent>
          </Card>
        ))}

        {folders.length === 0 && (
          <div className="col-span-full">
            <Card>
              <CardContent className="p-12 text-center">
                <Folder className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
                <h3 className="text-lg font-semibold mb-2">No folders yet</h3>
                <p className="text-muted-foreground mb-4">
                  Create your first folder to organize your links
                </p>
                <Button onClick={() => setCreateDialogOpen(true)}>
                  <Plus className="mr-2 h-4 w-4" />
                  Create First Folder
                </Button>
              </CardContent>
            </Card>
          </div>
        )}
      </div>

      {/* Edit Dialog */}
      <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Folder</DialogTitle>
            <DialogDescription>Update folder details</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="edit-name">Folder Name *</Label>
              <Input
                id="edit-name"
                value={formData.name}
                onChange={(e) =>
                  setFormData({ ...formData, name: e.target.value })
                }
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-description">Description</Label>
              <Input
                id="edit-description"
                value={formData.description}
                onChange={(e) =>
                  setFormData({ ...formData, description: e.target.value })
                }
              />
            </div>
            <div className="space-y-2">
              <Label>Color</Label>
              <div className="flex gap-2">
                {colorOptions.map((color) => (
                  <button
                    key={color}
                    className={`w-8 h-8 rounded-full border-2 ${
                      formData.color === color
                        ? "border-gray-900 dark:border-gray-100"
                        : "border-gray-300"
                    }`}
                    style={{ backgroundColor: color }}
                    onClick={() => setFormData({ ...formData, color })}
                  />
                ))}
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditDialogOpen(false)}>
              Cancel
            </Button>
            <Button
              onClick={handleUpdateFolder}
              disabled={!formData.name.trim()}
            >
              Update Folder
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Premium Upgrade Prompt */}
      {user?.plan === "free" && folders.length >= 3 && (
        <Card className="border-orange-200 bg-orange-50 dark:border-orange-800 dark:bg-orange-950">
          <CardContent className="p-6">
            <div className="flex items-center gap-4">
              <Hash className="h-8 w-8 text-orange-600" />
              <div className="flex-1">
                <h3 className="font-semibold text-orange-800 dark:text-orange-200">
                  Folder Limit Reached
                </h3>
                <p className="text-orange-700 dark:text-orange-300 text-sm">
                  Free users can create up to 3 folders. Upgrade to Premium for
                  unlimited folders.
                </p>
              </div>
              <Button asChild>
                <Link href="/dashboard/billing">Upgrade Now</Link>
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
