
"use client";

import React, { useState, useEffect } from "react";
import { useRouter, usePathname } from "next/navigation";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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
  DropdownMenuSeparator,
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
  FolderPlus,
  MoreHorizontal,
  ChevronRight,
  ChevronDown,
  Edit,
  Trash2,
  FolderOpen,
  Folder,
  Link as LinkIcon,
} from "lucide-react";
import { LoadingSpinner } from "@/components/ui/loading-spinner";

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
}

interface FoldersSidebarProps {
  onFolderSelect?: (folderId: string | null) => void;
  selectedFolderId?: string | null;
  className?: string;
}

export function FoldersSidebar({
  onFolderSelect,
  selectedFolderId,
  className = "",
}: FoldersSidebarProps) {
  const router = useRouter();
  const pathname = usePathname();
  const toast = useToast();
  const [folders, setFolders] = useState<FolderData[]>([]);
  const [flatFolders, setFlatFolders] = useState<FolderData[]>([]);
  const [loading, setLoading] = useState(true);
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [selectedFolder, setSelectedFolder] = useState<FolderData | null>(null);
  const [uncategorizedCount, setUncategorizedCount] = useState(0);
  const [createForm, setCreateForm] = useState({
    name: "",
    description: "",
    color: "#3B82F6",
    parentId: "",
  });

  const fetchFolders = async () => {
    try {
      const response = await fetch("/api/client/folders");
      const result = await response.json();

      if (response.ok) {
        const foldersData = result.data.folders;
        setFlatFolders(foldersData);
        setUncategorizedCount(result.data.uncategorizedCount || 0);

        // Build hierarchical structure
        const hierarchical = buildHierarchy(foldersData);
        setFolders(hierarchical);
      } else {
        toast.error("Failed to fetch folders");
      }
    } catch (error) {
      toast.error("Error loading folders");
    } finally {
      setLoading(false);
    }
  };

  const buildHierarchy = (folders: FolderData[]): FolderData[] => {
    const folderMap = new Map<string, FolderData>();
    const rootFolders: FolderData[] = [];

    // Create map and initialize children arrays
    folders.forEach((folder) => {
      folderMap.set(folder._id, { ...folder, children: [], isExpanded: false });
    });

    // Build hierarchy
    folders.forEach((folder) => {
      const folderNode = folderMap.get(folder._id)!;

      if (folder.parentId && folderMap.has(folder.parentId)) {
        const parentNode = folderMap.get(folder.parentId)!;
        parentNode.children!.push(folderNode);
      } else {
        rootFolders.push(folderNode);
      }
    });

    return rootFolders;
  };

  useEffect(() => {
    fetchFolders();
  }, []);

  const handleCreateFolder = async () => {
    try {
      const response = await fetch("/api/client/folders", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(createForm),
      });

      const result = await response.json();

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
        toast.error(result.error || "Failed to create folder");
      }
    } catch (error) {
      toast.error("Error creating folder");
    }
  };

  const handleEditFolder = async () => {
    if (!selectedFolder || !selectedFolder.name.trim()) {
      toast.error("Folder name is required");
      return;
    }

    try {
      const response = await fetch(
        `/api/client/folders/${selectedFolder._id}`,
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            name: selectedFolder.name.trim(),
            description: selectedFolder.description?.trim(),
            color: selectedFolder.color,
          }),
        }
      );

      const result = await response.json();

      if (response.ok) {
        toast.success("Folder updated successfully");
        setEditDialogOpen(false);
        setSelectedFolder(null);
        fetchFolders();
      } else {
        toast.error(result.error || "Failed to update folder");
      }
    } catch (error) {
      toast.error("Error updating folder");
    }
  };

  const handleDeleteFolder = async (folderId: string) => {
    try {
      const response = await fetch(`/api/client/folders/${folderId}`, {
        method: "DELETE",
      });

      const result = await response.json();

      if (response.ok) {
        toast.success("Folder deleted successfully");
        fetchFolders();
        // If the deleted folder was selected, clear selection
        if (selectedFolderId === folderId) {
          onFolderSelect?.(null);
        }
      } else {
        toast.error(result.error || "Failed to delete folder");
      }
    } catch (error) {
      toast.error("Error deleting folder");
    }
  };

  const handleFolderClick = (folderId: string | null) => {
    // Use the callback prop instead of navigation
    if (onFolderSelect) {
      onFolderSelect(folderId);
    }
  };

  const toggleFolderExpansion = (folderId: string) => {
    const updateExpansion = (folders: FolderData[]): FolderData[] => {
      return folders.map((folder) => {
        if (folder._id === folderId) {
          return { ...folder, isExpanded: !folder.isExpanded };
        }
        if (folder.children && folder.children.length > 0) {
          return { ...folder, children: updateExpansion(folder.children) };
        }
        return folder;
      });
    };

    setFolders(updateExpansion(folders));
  };

  const openEditDialog = (folder: FolderData) => {
    setSelectedFolder({ ...folder });
    setEditDialogOpen(true);
  };

  const renderFolder = (folder: FolderData, level: number = 0) => {
    const isSelected = selectedFolderId === folder._id;
    const hasChildren = folder.children && folder.children.length > 0;

    return (
      <div key={folder._id}>
        <div
          className={`group flex items-center gap-2 p-2 rounded-lg cursor-pointer transition-colors ${
            isSelected
              ? "bg-primary/10 text-primary"
              : "hover:bg-muted/50 text-muted-foreground hover:text-foreground"
          }`}
          style={{ paddingLeft: `${8 + level * 16}px` }}
          onClick={() => handleFolderClick(folder._id)}
        >
          {hasChildren && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                toggleFolderExpansion(folder._id);
              }}
              className="p-0.5 hover:bg-muted rounded"
            >
              {folder.isExpanded ? (
                <ChevronDown className="h-3 w-3" />
              ) : (
                <ChevronRight className="h-3 w-3" />
              )}
            </button>
          )}

          {!hasChildren && <div className="w-4" />}

          <div
            className="w-3 h-3 rounded-sm flex-shrink-0"
            style={{ backgroundColor: folder.color }}
          />

          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <span className="text-sm font-medium truncate">
                {folder.name}
              </span>
              {folder.stats.urlCount > 0 && (
                <Badge variant="secondary" className="text-xs px-1.5 py-0.5">
                  {folder.stats.urlCount}
                </Badge>
              )}
            </div>
          </div>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                size="sm"
                className="h-6 w-6 p-0 opacity-0 group-hover:opacity-100"
                onClick={(e) => e.stopPropagation()}
              >
                <MoreHorizontal className="h-3 w-3" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" side="right">
              <DropdownMenuItem onClick={() => openEditDialog(folder)}>
                <Edit className="w-4 h-4 mr-2" />
                Edit
              </DropdownMenuItem>
              <DropdownMenuItem>
                <FolderPlus className="w-4 h-4 mr-2" />
                Add Subfolder
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <DropdownMenuItem
                    className="text-destructive focus:text-destructive"
                    onSelect={(e) => e.preventDefault()}
                  >
                    <Trash2 className="w-4 h-4 mr-2" />
                    Delete
                  </DropdownMenuItem>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>
                      Are you absolutely sure?
                    </AlertDialogTitle>
                    <AlertDialogDescription>
                      This will permanently delete the "{folder.name}" folder.
                      All links in this folder will be moved to uncategorized.
                      This action cannot be undone.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                    <AlertDialogAction
                      onClick={() => handleDeleteFolder(folder._id)}
                      className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                    >
                      Delete Folder
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        {/* Render children */}
        {hasChildren && folder.isExpanded && (
          <div className="mt-1">
            {folder.children!.map((child) => renderFolder(child, level + 1))}
          </div>
        )}
      </div>
    );
  };

  if (loading) {
    return (
      <div className={`w-64 bg-background border-r ${className}`}>
        <div className="p-4">
          <div className="flex items-center justify-center">
            <LoadingSpinner size="sm" />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={`w-64 bg-background border-r flex flex-col ${className}`}>
      <div className="p-4 border-b">
        <div className="flex items-center justify-between mb-3">
          <h3 className="font-semibold text-sm">Folders</h3>
          <Dialog open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
            <DialogTrigger asChild>
              <Button variant="ghost" size="icon" className="h-6 w-6">
                <FolderPlus className="h-4 w-4" />
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Create New Folder</DialogTitle>
                <DialogDescription>
                  Organize your links into folders for better management.
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4">
                <Input
                  placeholder="Folder name"
                  value={createForm.name}
                  onChange={(e) =>
                    setCreateForm({ ...createForm, name: e.target.value })
                  }
                />
                <Input
                  placeholder="Description (optional)"
                  value={createForm.description}
                  onChange={(e) =>
                    setCreateForm({
                      ...createForm,
                      description: e.target.value,
                    })
                  }
                />
                <div className="flex items-center gap-2">
                  <input
                    type="color"
                    value={createForm.color}
                    onChange={(e) =>
                      setCreateForm({ ...createForm, color: e.target.value })
                    }
                    className="w-8 h-8 border rounded"
                  />
                  <span className="text-sm text-muted-foreground">
                    Folder color
                  </span>
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
                  disabled={!createForm.name}
                >
                  Create Folder
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>

        {/* All Links */}
        <div
          className={`flex items-center gap-2 p-2 rounded-lg cursor-pointer transition-colors mb-2 ${
            selectedFolderId === null
              ? "bg-primary/10 text-primary"
              : "hover:bg-muted/50 text-muted-foreground hover:text-foreground"
          }`}
          onClick={() => handleFolderClick(null)}
        >
          <LinkIcon className="h-4 w-4" />
          <span className="text-sm font-medium">All Links</span>
        </div>

        {/* Uncategorized */}
        {uncategorizedCount > 0 && (
          <div
            className={`flex items-center gap-2 p-2 rounded-lg cursor-pointer transition-colors mb-2 ${
              selectedFolderId === "uncategorized"
                ? "bg-primary/10 text-primary"
                : "hover:bg-muted/50 text-muted-foreground hover:text-foreground"
            }`}
            onClick={() => handleFolderClick("uncategorized")}
          >
            <Folder className="h-4 w-4" />
            <span className="text-sm font-medium">Uncategorized</span>
            <Badge variant="secondary" className="text-xs px-1.5 py-0.5">
              {uncategorizedCount}
            </Badge>
          </div>
        )}
      </div>

      {/* Folders List */}
      <div className="flex-1 overflow-auto p-2">
        {folders.length === 0 ? (
          <div className="p-4 text-center text-muted-foreground">
            <Folder className="h-8 w-8 mx-auto mb-2 opacity-50" />
            <p className="text-xs">No folders yet</p>
            <p className="text-xs">Click + to create one</p>
          </div>
        ) : (
          <div className="space-y-1">
            {folders.map((folder) => renderFolder(folder))}
          </div>
        )}
      </div>

      {/* Edit Dialog */}
      <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Folder</DialogTitle>
            <DialogDescription>Update your folder details.</DialogDescription>
          </DialogHeader>
          {selectedFolder && (
            <div className="space-y-4">
              <Input
                placeholder="Folder name"
                value={selectedFolder.name}
                onChange={(e) =>
                  setSelectedFolder({ ...selectedFolder, name: e.target.value })
                }
              />
              <Input
                placeholder="Description (optional)"
                value={selectedFolder.description || ""}
                onChange={(e) =>
                  setSelectedFolder({
                    ...selectedFolder,
                    description: e.target.value,
                  })
                }
              />
              <div className="flex items-center gap-2">
                <input
                  type="color"
                  value={selectedFolder.color}
                  onChange={(e) =>
                    setSelectedFolder({
                      ...selectedFolder,
                      color: e.target.value,
                    })
                  }
                  className="w-8 h-8 border rounded"
                />
                <span className="text-sm text-muted-foreground">
                  Folder color
                </span>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleEditFolder}>Update Folder</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
