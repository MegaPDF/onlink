// Fixed components/dashboard/links-table.tsx

"use client";

import React, { useState, useEffect } from "react";
import { useToast } from "@/hooks/use-toast";
import { formatDistanceToNow } from "date-fns";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
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
import { Checkbox } from "@/components/ui/checkbox";
import {
  Search,
  Filter,
  MoreHorizontal,
  Copy,
  Edit,
  Trash2,
  Eye,
  QrCode,
  BarChart3,
  ExternalLink,
  Calendar,
  MousePointer,
  Download,
  Folder,
  Tag,
  Globe,
  ChevronLeft,
  ChevronRight,
  Pause,
  Play,
  Settings,
  AlertTriangle,
} from "lucide-react";
import { formatNumber } from "@/lib/utils";
import { EmptyState } from "@/components/ui/empty-state";
import { LoadingSpinner } from "@/components/ui/loading-spinner";

interface Link {
  _id: string; // FIXED: Use _id as primary identifier
  id?: string; // Keep for backward compatibility
  originalUrl: string;
  shortUrl: string;
  shortCode: string;
  title?: string;
  description?: string;
  tags: string[];
  folder?: { name: string; color: string };
  clicks: {
    total: number;
    unique: number;
  };
  isActive: boolean;
  createdAt: string;
  expiresAt?: string;
  lastClickAt?: string;
}

interface LinksTableProps {
  folderId?: string;
  showFolderFilter?: boolean;
  limit?: number;
}

export function LinksTable({
  folderId,
  showFolderFilter = true,
}: LinksTableProps) {
  const toast = useToast();
  const [links, setLinks] = useState<Link[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [tagFilter, setTagFilter] = useState("");
  const [sortBy, setSortBy] = useState("createdAt");
  const [sortOrder, setSortOrder] = useState("desc");
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [selectedFolder, setSelectedFolder] = useState(folderId || "");
  const [folders, setFolders] = useState<any[]>([]);
  const [tags, setTags] = useState<string[]>([]);
  const [selectedLinks, setSelectedLinks] = useState<string[]>([]);
  const [bulkActionOpen, setBulkActionOpen] = useState(false);

  // Update selectedFolder when folderId prop changes
  useEffect(() => {
    setSelectedFolder(folderId || "");
  }, [folderId]);

  const fetchLinks = async () => {
    try {
      console.log("🔄 Fetching links with params:", {
        folderId: selectedFolder,
        search,
        statusFilter,
        tagFilter,
      });

      const params = new URLSearchParams({
        page: page.toString(),
        limit: "10",
        sortBy,
        sortOrder,
        ...(search && { search }),
        ...(statusFilter !== "all" && { status: statusFilter }),
        ...(tagFilter !== "all" && tagFilter && { tag: tagFilter }),
        ...(selectedFolder &&
          selectedFolder !== "all" && { folderId: selectedFolder }),
      });

      const response = await fetch(`/api/client/my-links?${params}`);
      const result = await response.json();

      console.log("📡 Links API response:", response.status, result);

      if (response.ok) {
        // FIXED: Ensure each link has both _id and id for compatibility
        const processedLinks = (result.data.urls || []).map((link: any) => ({
          ...link,
          id: link._id || link.id, // Ensure id exists for compatibility
        }));

        setLinks(processedLinks);
        setTotalPages(result.data.pagination?.totalPages || 1);
        setTags(result.data.tags || []);

        console.log("✅ Links loaded:", processedLinks.length);
      } else {
        console.error("❌ Links API error:", result);
        toast.error("Failed to fetch links");
        setLinks([]);
      }
    } catch (error) {
      console.error("💥 Links fetch error:", error);
      toast.error("Error loading links");
      setLinks([]);
    } finally {
      setLoading(false);
    }
  };

  const fetchFolders = async () => {
    try {
      const response = await fetch("/api/client/folders");
      const result = await response.json();

      if (response.ok) {
        setFolders(result.data.folders);
      }
    } catch (error) {
      console.error("Error loading folders");
    }
  };

  useEffect(() => {
    fetchLinks();
    if (showFolderFilter) {
      fetchFolders();
    }
  }, [
    page,
    search,
    statusFilter,
    tagFilter,
    selectedFolder,
    sortBy,
    sortOrder,
  ]);

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast.success("Copied to clipboard!");
  };

  // FIXED: Correct delete function with proper API endpoint and ID handling
  const handleDelete = async (link: Link) => {
    try {
      const linkId = link._id || link.id;
      console.log("🗑️ Deleting link:", linkId, link.shortCode);

      if (!linkId) {
        toast.error("Cannot delete link: Invalid link ID");
        return;
      }

      // FIXED: Use correct API endpoint with urlId parameter
      const response = await fetch(`/api/client/my-links?urlId=${linkId}`, {
        method: "DELETE",
      });

      const result = await response.json();
      console.log("🗑️ Delete response:", response.status, result);

      if (response.ok) {
        toast.success("Link deleted successfully");
        fetchLinks(); // Refresh the list
      } else {
        console.error("❌ Delete failed:", result);
        toast.error(result.error || "Failed to delete link");
      }
    } catch (error) {
      console.error("💥 Delete error:", error);
      toast.error("Error deleting link");
    }
  };

  // FIXED: Correct toggle status function
  const handleToggleStatus = async (link: Link) => {
    try {
      const linkId = link._id || link.id;
      console.log(
        "🔄 Toggling status for link:",
        linkId,
        link.shortCode,
        "current:",
        link.isActive
      );

      if (!linkId) {
        toast.error("Cannot update link: Invalid link ID");
        return;
      }

      // FIXED: Use correct API endpoint with urlId parameter
      const response = await fetch(`/api/client/my-links?urlId=${linkId}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ isActive: !link.isActive }),
      });

      const result = await response.json();
      console.log("🔄 Toggle response:", response.status, result);

      if (response.ok) {
        toast.success(
          `Link ${!link.isActive ? "activated" : "deactivated"} successfully`
        );
        fetchLinks(); // Refresh the list
      } else {
        console.error("❌ Toggle failed:", result);
        toast.error(result.error || "Failed to update link status");
      }
    } catch (error) {
      console.error("💥 Toggle error:", error);
      toast.error("Error updating link status");
    }
  };

  const handleSort = (field: string) => {
    if (sortBy === field) {
      setSortOrder(sortOrder === "asc" ? "desc" : "asc");
    } else {
      setSortBy(field);
      setSortOrder("desc");
    }
  };

  const selectAllLinks = () => {
    if (selectedLinks.length === links.length) {
      setSelectedLinks([]);
    } else {
      // FIXED: Use _id consistently
      setSelectedLinks(
        links
          .map((link) => link._id || link.id)
          .filter((id): id is string => typeof id === "string")
      );
    }
  };

  const selectLink = (linkId: string) => {
    if (selectedLinks.includes(linkId)) {
      setSelectedLinks(selectedLinks.filter((id) => id !== linkId));
    } else {
      setSelectedLinks([...selectedLinks, linkId]);
    }
  };

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Links</CardTitle>
          <CardDescription>Loading your links...</CardDescription>
        </CardHeader>
        <CardContent>
          <LoadingSpinner />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Links</CardTitle>
        <CardDescription>
          Manage and monitor your shortened links
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="flex items-center gap-4 mb-6">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search links..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9"
            />
          </div>

          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-32">
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Status</SelectItem>
              <SelectItem value="active">Active</SelectItem>
              <SelectItem value="inactive">Inactive</SelectItem>
            </SelectContent>
          </Select>

          {showFolderFilter && (
            <Select
              value={selectedFolder === "" ? "all" : selectedFolder}
              onValueChange={(value) =>
                setSelectedFolder(value === "all" ? "" : value)
              }
            >
              <SelectTrigger className="w-40">
                <SelectValue placeholder="All Folders" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Folders</SelectItem>
                <SelectItem value="null">Uncategorized</SelectItem>
                {folders.map((folder, folderIndex) => (
                  <SelectItem
                    key={`folder-select-${folder._id}-${folderIndex}`}
                    value={folder._id}
                  >
                    <div className="flex items-center gap-2">
                      <div
                        className="w-3 h-3 rounded-full"
                        style={{ backgroundColor: folder.color || "#3B82F6" }}
                      />
                      {folder.name}
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}

          {tags.length > 0 && (
            <Select
              value={tagFilter === "" ? "all" : tagFilter}
              onValueChange={(value) =>
                setTagFilter(value === "all" ? "" : value)
              }
            >
              <SelectTrigger className="w-32">
                <SelectValue placeholder="Tags" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Tags</SelectItem>
                {tags.map((tag, tagIndex) => (
                  <SelectItem key={`tag-${tag}-${tagIndex}`} value={tag}>
                    <div className="flex items-center gap-2">
                      <Tag className="h-3 w-3" />
                      {tag}
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
        </div>

        {/* Links Table */}
        {links.length === 0 ? (
          <EmptyState
            icon={Globe}
            title="No links found"
            description="Create your first shortened link to get started."
          />
        ) : (
          <div className="space-y-4">
            {/* Bulk Actions */}
            {selectedLinks.length > 0 && (
              <div className="flex items-center gap-4 p-4 bg-muted rounded-lg">
                <span className="text-sm font-medium">
                  {selectedLinks.length} link(s) selected
                </span>
                <Button variant="outline" size="sm">
                  Bulk Delete
                </Button>
                <Button variant="outline" size="sm">
                  Bulk Toggle Status
                </Button>
              </div>
            )}

            {/* Table */}
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-12">
                      <Checkbox
                        checked={selectedLinks.length === links.length}
                        onCheckedChange={selectAllLinks}
                      />
                    </TableHead>
                    <TableHead>Link</TableHead>
                    <TableHead>Title</TableHead>
                    <TableHead>Folder</TableHead>
                    <TableHead>Clicks</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Created</TableHead>
                    <TableHead className="w-12"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {links.map((link, index) => {
                    const linkId = link._id || link.id;
                    return (
                      <TableRow key={`link-${linkId}-${index}`}>
                        <TableCell>
                          <Checkbox
                            checked={selectedLinks.includes(linkId ?? "")}
                            onCheckedChange={() => selectLink(linkId ?? "")}
                          />
                        </TableCell>
                        <TableCell>
                          <div className="space-y-1">
                            <div className="flex items-center gap-2">
                              <Button
                                variant="link"
                                className="p-0 h-auto text-primary text-sm font-mono"
                                onClick={() => copyToClipboard(link.shortUrl)}
                              >
                                {link.shortCode}
                              </Button>
                              <Copy className="h-3 w-3 text-muted-foreground" />
                            </div>
                            <div className="text-xs text-muted-foreground truncate max-w-xs">
                              {link.originalUrl}
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="max-w-xs">
                            {link.title ? (
                              <div className="font-medium truncate">
                                {link.title}
                              </div>
                            ) : (
                              <div className="text-muted-foreground text-sm">
                                No title
                              </div>
                            )}
                            {link.description && (
                              <div className="text-xs text-muted-foreground truncate">
                                {link.description}
                              </div>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>
                          {link.folder ? (
                            <div className="flex items-center gap-2">
                              <div
                                className="w-3 h-3 rounded-full"
                                style={{ backgroundColor: link.folder.color }}
                              />
                              <span className="text-sm">
                                {link.folder.name}
                              </span>
                            </div>
                          ) : (
                            <span className="text-muted-foreground text-sm">
                              Uncategorized
                            </span>
                          )}
                        </TableCell>
                        <TableCell>
                          <div className="text-sm">
                            <div className="font-medium">
                              {formatNumber(link.clicks.total)}
                            </div>
                            <div className="text-xs text-muted-foreground">
                              {formatNumber(link.clicks.unique)} unique
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge
                            variant={link.isActive ? "default" : "secondary"}
                          >
                            {link.isActive ? "Active" : "Inactive"}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <div className="text-sm text-muted-foreground">
                            {formatDistanceToNow(new Date(link.createdAt), {
                              addSuffix: true,
                            })}
                          </div>
                        </TableCell>
                        <TableCell>
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" className="h-8 w-8 p-0">
                                <MoreHorizontal className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem
                                onClick={() => copyToClipboard(link.shortUrl)}
                              >
                                <Copy className="mr-2 h-4 w-4" />
                                Copy Link
                              </DropdownMenuItem>
                              <DropdownMenuItem
                                onClick={() =>
                                  window.open(link.originalUrl, "_blank")
                                }
                              >
                                <ExternalLink className="mr-2 h-4 w-4" />
                                Visit Original
                              </DropdownMenuItem>
                              <DropdownMenuItem>
                                <BarChart3 className="mr-2 h-4 w-4" />
                                Analytics
                              </DropdownMenuItem>
                              <DropdownMenuItem>
                                <QrCode className="mr-2 h-4 w-4" />
                                QR Code
                              </DropdownMenuItem>
                              <DropdownMenuSeparator />
                              <DropdownMenuItem>
                                <Edit className="mr-2 h-4 w-4" />
                                Edit
                              </DropdownMenuItem>
                              <DropdownMenuItem
                                onClick={() => handleToggleStatus(link)}
                              >
                                {link.isActive ? (
                                  <>
                                    <Pause className="mr-2 h-4 w-4" />
                                    Deactivate
                                  </>
                                ) : (
                                  <>
                                    <Play className="mr-2 h-4 w-4" />
                                    Activate
                                  </>
                                )}
                              </DropdownMenuItem>
                              <DropdownMenuSeparator />
                              <AlertDialog>
                                <AlertDialogTrigger asChild>
                                  <DropdownMenuItem
                                    onSelect={(e) => e.preventDefault()}
                                    className="text-destructive focus:text-destructive"
                                  >
                                    <Trash2 className="mr-2 h-4 w-4" />
                                    Delete
                                  </DropdownMenuItem>
                                </AlertDialogTrigger>
                                <AlertDialogContent>
                                  <AlertDialogHeader>
                                    <AlertDialogTitle className="flex items-center gap-2">
                                      <AlertTriangle className="h-5 w-5 text-destructive" />
                                      Delete Link
                                    </AlertDialogTitle>
                                    <AlertDialogDescription>
                                      Are you sure you want to delete "
                                      {link.shortCode}"? This action cannot be
                                      undone and will break any existing
                                      references to this short URL.
                                    </AlertDialogDescription>
                                  </AlertDialogHeader>
                                  <AlertDialogFooter>
                                    <AlertDialogCancel>
                                      Cancel
                                    </AlertDialogCancel>
                                    <AlertDialogAction
                                      onClick={() => handleDelete(link)}
                                      className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                                    >
                                      Delete Link
                                    </AlertDialogAction>
                                  </AlertDialogFooter>
                                </AlertDialogContent>
                              </AlertDialog>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="flex items-center justify-between">
                <div className="text-sm text-muted-foreground">
                  Page {page} of {totalPages}
                </div>
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setPage(Math.max(1, page - 1))}
                    disabled={page === 1}
                  >
                    <ChevronLeft className="h-4 w-4" />
                    Previous
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setPage(Math.min(totalPages, page + 1))}
                    disabled={page === totalPages}
                  >
                    Next
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
