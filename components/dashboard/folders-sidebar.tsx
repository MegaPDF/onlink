"use client";

import React, { useState, useEffect } from "react";
import { useRouter, usePathname } from "next/navigation";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
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
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import {
  Folder,
  FolderPlus,
  MoreHorizontal,
  Edit,
  Trash2,
  ChevronDown,
  ChevronRight,
  Globe,
  Hash,
  Eye,
  EyeOff,
  Move,
  Archive,
} from "lucide-react";
import { formatNumber } from "@/lib/utils";
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
    folders.forEach(folder => {
      folderMap.set(folder._id, { ...folder, children: [], isExpanded: false });
    });

    // Build hierarchy
    folders.forEach(folder => {
      const folderNode = folderMap.get(folder._id)!;
      
      if (folder.parentId) {
        const parent = folderMap.get(folder.parentId);
        if (parent) {
          parent.children!.push(folderNode);
        } else {
          rootFolders.push(folderNode);
        }
      } else {
        rootFolders.push(folderNode);
      }
    });

    return rootFolders.sort((a, b) => a.name.localeCompare(b.name));
  };

  useEffect(() => {
    fetchFolders();
  }, []);

  const handleCreateFolder = async () => {
    if (!createForm.name.trim()) {
      toast.error("Folder name is required");
      return;
    }

    try {
      const response = await fetch("/api/client/folders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: createForm.name.trim(),
          description: createForm.description.trim(),
          color: createForm.color,
          parentId: createForm.parentId || null,
        }),
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

  const handleUpdateFolder = async () => {
    if (!selectedFolder || !selectedFolder.name.trim()) {
      toast.error("Folder name is required");
      return;
    }

    try {
      const response = await fetch("/api/client/folders", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          folderId: selectedFolder._id,
          updates: {
            name: selectedFolder.name.trim(),
            description: selectedFolder.description?.trim(),
            color: selectedFolder.color,
          },
        }),
      });

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
      const response = await fetch(`/api/client/folders?folderId=${folderId}`, {
        method: "DELETE",
      });

      const result = await response.json();

      if (response.ok) {
        toast.success("Folder deleted successfully");
        fetchFolders();
        
        // Reset selection if deleted folder was selected
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
    if (onFolderSelect) {
      onFolderSelect(folderId);
    } else {
      // Default navigation behavior
      if (folderId) {
        router.push(`/dashboard/folders/${folderId}`);
      } else {
        router.push("/dashboard/links");
      }
    }
  };

  const toggleFolderExpansion = (folderId: string) => {
    const updateExpansion = (folders: FolderData[]): FolderData[] => {
      return folders.map(folder => {
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
            className="flex items-center gap-2 flex-1 min-w-0"
            onClick={() => handleFolderClick(folder._id)}
          >
            <div
              className="w-3 h-3 rounded-full flex-shrink-0"
              style={{ backgroundColor: folder.color }}
            />
            <span className="truncate text-sm font-medium">{folder.name}</span>
            <div className="flex items-center gap-1 ml-auto">
              <Badge variant="secondary" className="text-xs">
                {formatNumber(folder.stats.urlCount)}
              </Badge>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <MoreHorizontal className="h-3 w-3" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" side="right">
                  <DropdownMenuItem onClick={() => openEditDialog(folder)}>
                    <Edit className="w-4 h-4 mr-2" />
                    Edit Folder
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    onClick={() => {
                      setCreateForm({ 
                        ...createForm, 
                        parentId: folder._id 
                      });
                      setCreateDialogOpen(true);
                    }}
                  >
                    <FolderPlus className="w-4 h-4 mr-2" />
                    Add Subfolder
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <DropdownMenuItem
                        className="text-destructive"
                        onSelect={(e) => e.preventDefault()}
                      >
                        <Trash2 className="w-4 h-4 mr-2" />
                        Delete Folder
                      </DropdownMenuItem>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>Delete Folder</AlertDialogTitle>
                        <AlertDialogDescription>
                          Are you sure you want to delete "{folder.name}"? 
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
          </div>
        </div>

        {/* Render children */}
        {hasChildren && folder.isExpanded && (
          <div className="mt-1">
            {folder.children!.map(child => renderFolder(child, level + 1))}
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
                <div className="space-y-2">
                  <Label htmlFor="name">Folder Name</Label>
                  <Input
                    id="name"
                    placeholder="My Folder"
                    value={createForm.name}
                    onChange={(e) =>
                      setCreateForm({ ...createForm, name: e.target.value })
                    }
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="description">Description (Optional)</Label>
                  <Textarea
                    id="description"
                    placeholder="Brief description of this folder"
                    value={createForm.description}
                    onChange={(e) =>
                      setCreateForm({ ...createForm, description: e.target.value })
                    }
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="color">Color</Label>
                  <div className="flex items-center gap-2">
                    <Input
                      id="color"
                      type="color"
                      value={createForm.color}
                      onChange={(e) =>
                        setCreateForm({ ...createForm, color: e.target.value })
                      }
                      className="w-12 h-8 p-1 border rounded"
                    />
                    <Input
                      value={createForm.color}
                      onChange={(e) =>
                        setCreateForm({ ...createForm, color: e.target.value })
                      }
                      placeholder="#3B82F6"
                      className="flex-1"
                    />
                  </div>
                </div>
                {flatFolders.length > 0 && (
                  <div className="space-y-2">
                    <Label htmlFor="parentId">Parent Folder (Optional)</Label>
                    <select
                      id="parentId"
                      value={createForm.parentId}
                      onChange={(e) =>
                        setCreateForm({ ...createForm, parentId: e.target.value })
                      }
                      className="w-full p-2 border rounded-md"
                    >
                      <option value="">None (Root Level)</option>
                      {flatFolders
                        .filter(f => f.level < 4) // Prevent deep nesting
                        .map(folder => (
                          <option key={folder._id} value={folder._id}>
                            {"  ".repeat(folder.level)}
                            {folder.name}
                          </option>
                        ))}
                    </select>
                  </div>
                )}
              </div>
              <DialogFooter>
                <Button
                  variant="outline"
                  onClick={() => setCreateDialogOpen(false)}
                >
                  Cancel
                </Button>
                <Button onClick={handleCreateFolder} disabled={!createForm.name.trim()}>
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
          <Globe className="w-4 h-4" />
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
            <Hash className="w-4 h-4" />
            <span className="text-sm font-medium">Uncategorized</span>
            <Badge variant="secondary" className="text-xs ml-auto">
              {formatNumber(uncategorizedCount)}
            </Badge>
          </div>
        )}
      </div>

      {/* Folders List */}
      <div className="flex-1 overflow-y-auto p-4">
        {folders.length === 0 ? (
          <div className="text-center text-muted-foreground py-8">
            <Folder className="w-8 h-8 mx-auto mb-2 opacity-50" />
            <p className="text-sm">No folders yet</p>
            <p className="text-xs">Create your first folder to organize links</p>
          </div>
        ) : (
          <div className="space-y-1">
            {folders.map(folder => renderFolder(folder))}
          </div>
        )}
      </div>

      {/* Edit Folder Dialog */}
      <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Folder</DialogTitle>
            <DialogDescription>
              Update folder details and organization.
            </DialogDescription>
          </DialogHeader>
          {selectedFolder && (
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="edit-name">Folder Name</Label>
                <Input
                  id="edit-name"
                  value={selectedFolder.name}
                  onChange={(e) =>
                    setSelectedFolder({ ...selectedFolder, name: e.target.value })
                  }
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-description">Description</Label>
                <Textarea
                  id="edit-description"
                  value={selectedFolder.description || ""}
                  onChange={(e) =>
                    setSelectedFolder({ 
                      ...selectedFolder, 
                      description: e.target.value 
                    })
                  }
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-color">Color</Label>
                <div className="flex items-center gap-2">
                  <Input
                    id="edit-color"
                    type="color"
                    value={selectedFolder.color}
                    onChange={(e) =>
                      setSelectedFolder({ 
                        ...selectedFolder, 
                        color: e.target.value 
                      })
                    }
                    className="w-12 h-8 p-1 border rounded"
                  />
                  <Input
                    value={selectedFolder.color}
                    onChange={(e) =>
                      setSelectedFolder({ 
                        ...selectedFolder, 
                        color: e.target.value 
                      })
                    }
                    className="flex-1"
                  />
                </div>
              </div>
              <div className="p-3 bg-muted/50 rounded-lg">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">Links:</span>
                  <span className="font-medium">
                    {formatNumber(selectedFolder.stats.urlCount)}
                  </span>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">Total Clicks:</span>
                  <span className="font-medium">
                    {formatNumber(selectedFolder.stats.totalClicks)}
                  </span>
                </div>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setEditDialogOpen(false)}
            >
              Cancel
            </Button>
            <Button 
              onClick={handleUpdateFolder}
              disabled={!selectedFolder?.name.trim()}
            >
              Save Changes
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}