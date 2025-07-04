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
} from "lucide-react";
import { formatNumber } from "@/lib/utils";
import { EmptyState } from "@/components/ui/empty-state";
import { LoadingSpinner } from "@/components/ui/loading-spinner";

interface Link {
  id: string;
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

  const fetchLinks = async () => {
    try {
      const params = new URLSearchParams({
        page: page.toString(),
        limit: "10",
        sortBy,
        sortOrder,
        ...(search && { search }),
        ...(statusFilter !== "all" && { status: statusFilter }),
        ...(tagFilter && { tag: tagFilter }),
        ...(selectedFolder && { folderId: selectedFolder }),
      });

      const response = await fetch(`/api/client/my-links?${params}`);
      const result = await response.json();

      if (response.ok) {
        setLinks(result.data.urls);
        setTotalPages(result.data.pagination.totalPages);
        setTags(result.data.tags || []);
      } else {
        toast.error("Failed to fetch links");
      }
    } catch (error) {
      toast.error("Error loading links");
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

  const toggleLinkStatus = async (linkId: string, currentStatus: boolean) => {
    try {
      const response = await fetch("/api/client/my-links", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          urlId: linkId,
          updates: { isActive: !currentStatus },
        }),
      });

      if (response.ok) {
        toast.success(`Link ${!currentStatus ? "activated" : "deactivated"}`);
        fetchLinks();
      } else {
        toast.error("Failed to update link");
      }
    } catch (error) {
      toast.error("Error updating link");
    }
  };

  const deleteLink = async (linkId: string) => {
    try {
      const response = await fetch(`/api/client/my-links?urlId=${linkId}`, {
        method: "DELETE",
      });

      if (response.ok) {
        toast.success("Link deleted successfully");
        fetchLinks();
      } else {
        toast.error("Failed to delete link");
      }
    } catch (error) {
      toast.error("Error deleting link");
    }
  };

  const handleBulkAction = async (action: string) => {
    if (selectedLinks.length === 0) {
      toast.error("No links selected");
      return;
    }

    try {
      let response;

      switch (action) {
        case "activate":
          response = await fetch("/api/client/my-links/bulk", {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              urlIds: selectedLinks,
              updates: { isActive: true },
            }),
          });
          break;
        case "deactivate":
          response = await fetch("/api/client/my-links/bulk", {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              urlIds: selectedLinks,
              updates: { isActive: false },
            }),
          });
          break;
        case "delete":
          if (
            !confirm(
              `Are you sure you want to delete ${selectedLinks.length} links?`
            )
          ) {
            return;
          }
          response = await fetch("/api/client/my-links/bulk", {
            method: "DELETE",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ urlIds: selectedLinks }),
          });
          break;
        default:
          return;
      }

      if (response?.ok) {
        toast.success(`Bulk ${action} completed successfully`);
        setSelectedLinks([]);
        fetchLinks();
      } else {
        toast.error(`Failed to ${action} links`);
      }
    } catch (error) {
      toast.error("Error performing bulk action");
    }
  };

  const exportLinks = async () => {
    try {
      const params = new URLSearchParams({
        ...(search && { search }),
        ...(statusFilter !== "all" && { status: statusFilter }),
        ...(tagFilter && { tag: tagFilter }),
        ...(selectedFolder && { folderId: selectedFolder }),
        export: "true",
      });

      const response = await fetch(`/api/client/my-links/export?${params}`);

      if (response.ok) {
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `links-export-${
          new Date().toISOString().split("T")[0]
        }.csv`;
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);
        toast.success("Links exported successfully");
      } else {
        toast.error("Failed to export links");
      }
    } catch (error) {
      toast.error("Error exporting links");
    }
  };

  const getStatusBadge = (link: Link) => {
    if (!link.isActive) {
      return <Badge variant="secondary">Inactive</Badge>;
    }
    if (link.expiresAt && new Date(link.expiresAt) < new Date()) {
      return <Badge variant="destructive">Expired</Badge>;
    }
    return <Badge className="bg-green-500 hover:bg-green-600">Active</Badge>;
  };

  const handleSort = (column: string) => {
    if (sortBy === column) {
      setSortOrder(sortOrder === "asc" ? "desc" : "asc");
    } else {
      setSortBy(column);
      setSortOrder("desc");
    }
    setPage(1);
  };

  const selectAllLinks = () => {
    if (selectedLinks.length === links.length) {
      setSelectedLinks([]);
    } else {
      setSelectedLinks(links.map((link) => link.id));
    }
  };

  const selectLink = (linkId: string) => {
    setSelectedLinks((prev) =>
      prev.includes(linkId)
        ? prev.filter((id) => id !== linkId)
        : [...prev, linkId]
    );
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="flex items-center justify-center">
            <LoadingSpinner size="lg" />
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle>My Links</CardTitle>
            <CardDescription>
              Manage and monitor your shortened URLs
            </CardDescription>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={exportLinks}>
              <Download className="h-4 w-4 mr-2" />
              Export
            </Button>
            {selectedLinks.length > 0 && (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" size="sm">
                    Actions ({selectedLinks.length})
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem
                    onClick={() => handleBulkAction("activate")}
                  >
                    <Play className="h-4 w-4 mr-2" />
                    Activate
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    onClick={() => handleBulkAction("deactivate")}
                  >
                    <Pause className="h-4 w-4 mr-2" />
                    Deactivate
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem
                    className="text-destructive"
                    onClick={() => handleBulkAction("delete")}
                  >
                    <Trash2 className="h-4 w-4 mr-2" />
                    Delete
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            )}
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {/* Filters */}
        <div className="flex flex-col sm:flex-row gap-4 mb-6">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search links..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-10"
            />
          </div>

          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-32">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Status</SelectItem>
              <SelectItem value="active">Active</SelectItem>
              <SelectItem value="inactive">Inactive</SelectItem>
              <SelectItem value="expired">Expired</SelectItem>
            </SelectContent>
          </Select>

          {showFolderFilter && (
            <Select value={selectedFolder} onValueChange={setSelectedFolder}>
              <SelectTrigger className="w-40">
                <SelectValue placeholder="All Folders" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="">All Folders</SelectItem>
                <SelectItem value="null">Uncategorized</SelectItem>
                {folders.map((folder) => (
                  <SelectItem key={folder._id} value={folder._id}>
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
            <Select value={tagFilter} onValueChange={setTagFilter}>
              <SelectTrigger className="w-32">
                <SelectValue placeholder="All Tags" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="">All Tags</SelectItem>
                {tags.map((tag) => (
                  <SelectItem key={tag} value={tag}>
                    <div className="flex items-center gap-2">
                      <Tag className="w-3 h-3" />
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
            action={{
              label: "Create Link",
              onClick: () => {
                // TODO: Implement create link action, e.g., open a modal or navigate
              },
              variant: "default",
            }}
          />
        ) : (
          <>
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-[50px]">
                      <input
                        type="checkbox"
                        checked={
                          selectedLinks.length === links.length &&
                          links.length > 0
                        }
                        onChange={selectAllLinks}
                        className="rounded border-gray-300"
                      />
                    </TableHead>
                    <TableHead
                      className="cursor-pointer hover:bg-muted/50"
                      onClick={() => handleSort("originalUrl")}
                    >
                      Original URL
                    </TableHead>
                    <TableHead>Short URL</TableHead>
                    <TableHead
                      className="cursor-pointer hover:bg-muted/50"
                      onClick={() => handleSort("clicks.total")}
                    >
                      Clicks
                    </TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead
                      className="cursor-pointer hover:bg-muted/50"
                      onClick={() => handleSort("createdAt")}
                    >
                      Created
                    </TableHead>
                    <TableHead className="w-[50px]"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {links.map((link) => (
                    <TableRow key={link.id}>
                      <TableCell>
                        <input
                          type="checkbox"
                          checked={selectedLinks.includes(link.id)}
                          onChange={() => selectLink(link.id)}
                          className="rounded border-gray-300"
                        />
                      </TableCell>
                      <TableCell>
                        <div className="space-y-1">
                          <div className="flex items-center gap-2">
                            <ExternalLink className="h-4 w-4 text-muted-foreground" />
                            <span className="font-medium truncate max-w-[300px]">
                              {link.title || link.originalUrl}
                            </span>
                          </div>
                          {link.folder && (
                            <div className="flex items-center gap-1 text-xs text-muted-foreground">
                              <div
                                className="w-2 h-2 rounded-full"
                                style={{
                                  backgroundColor:
                                    link.folder.color || "#3B82F6",
                                }}
                              />
                              {link.folder.name}
                            </div>
                          )}
                          {link.tags.length > 0 && (
                            <div className="flex flex-wrap gap-1">
                              {link.tags.slice(0, 3).map((tag) => (
                                <Badge
                                  key={tag}
                                  variant="outline"
                                  className="text-xs"
                                >
                                  {tag}
                                </Badge>
                              ))}
                              {link.tags.length > 3 && (
                                <Badge variant="outline" className="text-xs">
                                  +{link.tags.length - 3}
                                </Badge>
                              )}
                            </div>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <code className="text-sm bg-muted px-2 py-1 rounded">
                            {link.shortCode}
                          </code>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-6 w-6"
                            onClick={() => copyToClipboard(link.shortUrl)}
                          >
                            <Copy className="h-3 w-3" />
                          </Button>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <MousePointer className="h-4 w-4 text-muted-foreground" />
                          <span className="font-medium">
                            {formatNumber(link.clicks.total)}
                          </span>
                          <span className="text-xs text-muted-foreground">
                            ({formatNumber(link.clicks.unique)} unique)
                          </span>
                        </div>
                      </TableCell>
                      <TableCell>{getStatusBadge(link)}</TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        <div className="flex items-center gap-1">
                          <Calendar className="h-3 w-3" />
                          {formatDistanceToNow(new Date(link.createdAt), {
                            addSuffix: true,
                          })}
                        </div>
                      </TableCell>
                      <TableCell>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon">
                              <MoreHorizontal className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem
                              onClick={() => copyToClipboard(link.shortUrl)}
                            >
                              <Copy className="w-4 h-4 mr-2" />
                              Copy Link
                            </DropdownMenuItem>
                            <DropdownMenuItem>
                              <QrCode className="w-4 h-4 mr-2" />
                              QR Code
                            </DropdownMenuItem>
                            <DropdownMenuItem>
                              <BarChart3 className="w-4 h-4 mr-2" />
                              Analytics
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem>
                              <Edit className="w-4 h-4 mr-2" />
                              Edit
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              onClick={() =>
                                toggleLinkStatus(link.id, link.isActive)
                              }
                            >
                              {link.isActive ? (
                                <>
                                  <Pause className="w-4 h-4 mr-2" />
                                  Deactivate
                                </>
                              ) : (
                                <>
                                  <Play className="w-4 h-4 mr-2" />
                                  Activate
                                </>
                              )}
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <AlertDialog>
                              <AlertDialogTrigger asChild>
                                <DropdownMenuItem
                                  className="text-destructive"
                                  onSelect={(e) => e.preventDefault()}
                                >
                                  <Trash2 className="w-4 h-4 mr-2" />
                                  Delete
                                </DropdownMenuItem>
                              </AlertDialogTrigger>
                              <AlertDialogContent>
                                <AlertDialogHeader>
                                  <AlertDialogTitle>
                                    Delete Link
                                  </AlertDialogTitle>
                                  <AlertDialogDescription>
                                    Are you sure you want to delete this link?
                                    This action cannot be undone.
                                  </AlertDialogDescription>
                                </AlertDialogHeader>
                                <AlertDialogFooter>
                                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                                  <AlertDialogAction
                                    onClick={() => deleteLink(link.id)}
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
                  ))}
                </TableBody>
              </Table>
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="flex items-center justify-between mt-4">
                <div className="text-sm text-muted-foreground">
                  Page {page} of {totalPages}
                </div>
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setPage(page - 1)}
                    disabled={page === 1}
                  >
                    <ChevronLeft className="h-4 w-4" />
                    Previous
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setPage(page + 1)}
                    disabled={page === totalPages}
                  >
                    Next
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            )}
          </>
        )}
      </CardContent>
    </Card>
  );
}
