
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
      const params = new URLSearchParams({
        page: page.toString(),
        limit: "10",
        sortBy,
        sortOrder,
        ...(search && { search }),
        ...(statusFilter !== "all" && { status: statusFilter }),
        ...(tagFilter !== "all" && tagFilter && { tag: tagFilter }),
        ...(selectedFolder && selectedFolder !== "all" && { folderId: selectedFolder }),
      });

      const response = await fetch(`/api/client/my-links?${params}`);
      const result = await response.json();

      if (response.ok) {
        setLinks(result.data.urls || []);
        setTotalPages(result.data.pagination?.totalPages || 1);
        setTags(result.data.tags || []);
      } else {
        toast.error("Failed to fetch links");
        setLinks([]);
      }
    } catch (error) {
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
      setSelectedLinks(links.map(link => link.id));
    }
  };

  const selectLink = (linkId: string) => {
    if (selectedLinks.includes(linkId)) {
      setSelectedLinks(selectedLinks.filter(id => id !== linkId));
    } else {
      setSelectedLinks([...selectedLinks, linkId]);
    }
  };

  const handleDelete = async (linkId: string) => {
    try {
      const response = await fetch(`/api/client/links/${linkId}`, {
        method: 'DELETE',
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

  const handleToggleStatus = async (linkId: string, isActive: boolean) => {
    try {
      const response = await fetch(`/api/client/links/${linkId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ isActive: !isActive }),
      });

      if (response.ok) {
        toast.success(`Link ${!isActive ? 'activated' : 'deactivated'} successfully`);
        fetchLinks();
      } else {
        toast.error("Failed to update link status");
      }
    } catch (error) {
      toast.error("Error updating link status");
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
        {/* Filters */}
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
              onValueChange={(value) => setSelectedFolder(value === "all" ? "" : value)}
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
              onValueChange={(value) => setTagFilter(value === "all" ? "" : value)}
            >
              <SelectTrigger className="w-32">
                <SelectValue placeholder="All Tags" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Tags</SelectItem>
                {tags.map((tag, tagIndex) => (
                  <SelectItem 
                    key={`tag-select-${tagIndex}-${tag}`} 
                    value={tag}
                  >
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

        {/* Bulk Actions */}
        {selectedLinks.length > 0 && (
          <div className="mb-4 p-4 bg-muted rounded-lg">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">
                {selectedLinks.length} link{selectedLinks.length !== 1 ? 's' : ''} selected
              </span>
              <div className="flex gap-2">
                <Button variant="outline" size="sm">
                  <Folder className="w-4 h-4 mr-2" />
                  Move to Folder
                </Button>
                <Button variant="outline" size="sm">
                  <Pause className="w-4 h-4 mr-2" />
                  Deactivate
                </Button>
                <Button variant="destructive" size="sm">
                  <Trash2 className="w-4 h-4 mr-2" />
                  Delete
                </Button>
              </div>
            </div>
          </div>
        )}

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
                  {links.map((link, linkIndex) => (
                    <TableRow key={`link-row-${link.id}-${linkIndex}`}>
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
                          <div className="font-medium text-sm">
                            {link.title || new URL(link.originalUrl).hostname}
                          </div>
                          <div className="text-xs text-muted-foreground truncate max-w-[300px]">
                            {link.originalUrl}
                          </div>
                          {link.tags.length > 0 && (
                            <div className="flex gap-1 flex-wrap">
                              {link.tags.slice(0, 2).map((tag, tagIndex) => (
                                <Badge 
                                  key={`link-${link.id}-tag-${tagIndex}-${tag}`} 
                                  variant="secondary" 
                                  className="text-xs"
                                >
                                  {tag}
                                </Badge>
                              ))}
                              {link.tags.length > 2 && (
                                <Badge 
                                  key={`link-${link.id}-more-tags`}
                                  variant="secondary" 
                                  className="text-xs"
                                >
                                  +{link.tags.length - 2}
                                </Badge>
                              )}
                            </div>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <code className="text-sm bg-muted px-2 py-1 rounded">
                            {link.shortUrl}
                          </code>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => copyToClipboard(link.shortUrl)}
                          >
                            <Copy className="w-3 h-3" />
                          </Button>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="space-y-1">
                          <div className="flex items-center gap-2">
                            <MousePointer className="w-3 h-3 text-muted-foreground" />
                            <span className="font-medium">{formatNumber(link.clicks.total)}</span>
                          </div>
                          <div className="text-xs text-muted-foreground">
                            {formatNumber(link.clicks.unique)} unique
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="space-y-1">
                          <Badge variant={link.isActive ? "default" : "secondary"}>
                            {link.isActive ? "Active" : "Inactive"}
                          </Badge>
                          {link.expiresAt && (
                            <div className="text-xs text-muted-foreground">
                              Expires {formatDistanceToNow(new Date(link.expiresAt), { addSuffix: true })}
                            </div>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="text-xs text-muted-foreground">
                          {formatDistanceToNow(new Date(link.createdAt), { addSuffix: true })}
                        </div>
                      </TableCell>
                      <TableCell>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="sm">
                              <MoreHorizontal className="w-4 h-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => copyToClipboard(link.shortUrl)}>
                              <Copy className="w-4 h-4 mr-2" />
                              Copy Link
                            </DropdownMenuItem>
                            <DropdownMenuItem>
                              <BarChart3 className="w-4 h-4 mr-2" />
                              Analytics
                            </DropdownMenuItem>
                            <DropdownMenuItem>
                              <QrCode className="w-4 h-4 mr-2" />
                              QR Code
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem>
                              <Edit className="w-4 h-4 mr-2" />
                              Edit
                            </DropdownMenuItem>
                            <DropdownMenuItem 
                              onClick={() => handleToggleStatus(link.id, link.isActive)}
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
                                  className="text-destructive focus:text-destructive"
                                  onSelect={(e) => e.preventDefault()}
                                >
                                  <Trash2 className="w-4 h-4 mr-2" />
                                  Delete
                                </DropdownMenuItem>
                              </AlertDialogTrigger>
                              <AlertDialogContent>
                                <AlertDialogHeader>
                                  <AlertDialogTitle>Are you sure?</AlertDialogTitle>
                                  <AlertDialogDescription>
                                    This action cannot be undone. This will permanently delete your link.
                                  </AlertDialogDescription>
                                </AlertDialogHeader>
                                <AlertDialogFooter>
                                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                                  <AlertDialogAction 
                                    onClick={() => handleDelete(link.id)}
                                    className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                                  >
                                    Delete
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
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setPage(Math.max(1, page - 1))}
                    disabled={page === 1}
                  >
                    <ChevronLeft className="w-4 h-4 mr-2" />
                    Previous
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setPage(Math.min(totalPages, page + 1))}
                    disabled={page === totalPages}
                  >
                    Next
                    <ChevronRight className="w-4 h-4 ml-2" />
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