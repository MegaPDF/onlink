// ============= app/dashboard/links/page.tsx =============
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
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
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
  LinkIcon,
  MoreVertical,
  Edit3,
  Trash2,
  Copy,
  ExternalLink,
  QrCode,
  BarChart3,
  Search,
  Filter,
  Plus,
  Download,
  Calendar,
  MousePointer,
  Eye,
  EyeOff,
  Folder,
  Crown,
} from "lucide-react";
import Link from "next/link";
import { formatNumber, formatRelativeTime } from "@/lib/utils";
import { UrlShortener } from "@/components/dashboard/url-shortener";
import { toast } from "sonner";

interface LinkData {
  _id: string;
  shortCode: string;
  originalUrl: string;
  title?: string;
  description?: string;
  domain: string;
  folderId?: {
    _id: string;
    name: string;
    color: string;
  };
  clicks: {
    total: number;
    today: number;
    thisWeek: number;
    thisMonth: number;
  };
  tags: string[];
  isActive: boolean;
  expiresAt?: string;
  password?: boolean;
  createdAt: string;
  updatedAt: string;
}

interface LinksPageData {
  urls: LinkData[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
    hasNextPage: boolean;
    hasPrevPage: boolean;
  };
  stats: {
    totalUrls: number;
    activeUrls: number;
    totalClicks: number;
    urlsToday: number;
  };
}

export default function LinksPage() {
  const { user } = useAuth();
  const [data, setData] = useState<LinksPageData | null>(null);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [filters, setFilters] = useState({
    status: "all",
    folder: "all",
    sortBy: "createdAt",
    sortOrder: "desc",
  });
  const [currentPage, setCurrentPage] = useState(1);
  const [selectedLink, setSelectedLink] = useState<LinkData | null>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [showUrlShortener, setShowUrlShortener] = useState(false);

  useEffect(() => {
    fetchLinks();
  }, [currentPage, filters, searchTerm]);

  const fetchLinks = async (page = currentPage) => {
    try {
      setLoading(true);
      const params = new URLSearchParams({
        page: page.toString(),
        limit: "20",
        search: searchTerm,
        status: filters.status === "all" ? "" : filters.status,
        folderId: filters.folder === "all" ? "" : filters.folder,
        sortBy: filters.sortBy,
        sortOrder: filters.sortOrder,
      });

      const response = await fetch(`/api/client/links?${params.toString()}`);
      if (!response.ok) {
        throw new Error("Failed to fetch links");
      }

      const result = await response.json();
      setData(result.data);
      setCurrentPage(page);
    } catch (error) {
      console.error("Error fetching links:", error);
      toast.error("Failed to load links");
    } finally {
      setLoading(false);
    }
  };

  const handleCopyLink = async (shortCode: string, domain: string) => {
    try {
      const url = `https://${domain}/${shortCode}`;
      await navigator.clipboard.writeText(url);
      toast.success("Link copied to clipboard");
    } catch (error) {
      toast.error("Failed to copy link");
    }
  };

  const handleToggleStatus = async (linkId: string, currentStatus: boolean) => {
    try {
      const response = await fetch(`/api/client/my-links/${linkId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isActive: !currentStatus }),
      });

      if (response.ok) {
        toast.success(`Link ${!currentStatus ? "activated" : "deactivated"}`);
        fetchLinks();
      } else {
        throw new Error("Failed to update link status");
      }
    } catch (error) {
      toast.error("Failed to update link status");
    }
  };

  const handleDeleteLink = async () => {
    if (!selectedLink) return;

    try {
      const response = await fetch(`/api/client/my-links/${selectedLink._id}`, {
        method: "DELETE",
      });

      if (response.ok) {
        toast.success("Link deleted successfully");
        setDeleteDialogOpen(false);
        setSelectedLink(null);
        fetchLinks();
      } else {
        throw new Error("Failed to delete link");
      }
    } catch (error) {
      toast.error("Failed to delete link");
    }
  };

  const openDeleteDialog = (link: LinkData) => {
    setSelectedLink(link);
    setDeleteDialogOpen(true);
  };

  const handleLinkCreated = () => {
    setShowUrlShortener(false);
    fetchLinks(1);
  };

  if (loading && !data) {
    return (
      <div className="container mx-auto py-6 px-4">
        <div className="flex items-center justify-center min-h-96">
          <LoadingSpinner size="lg" />
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-6 px-4 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold">My Links</h1>
          <p className="text-muted-foreground">
            Manage and track all your shortened links
          </p>
        </div>

        <div className="flex gap-2">
          <Button
            variant={showUrlShortener ? "outline" : "default"}
            onClick={() => setShowUrlShortener(!showUrlShortener)}
          >
            <Plus className="h-4 w-4 mr-2" />
            Create Link
          </Button>

          {user?.plan !== "free" && (
            <Button variant="outline" asChild>
              <Link href="/dashboard/bulk">
                <Download className="h-4 w-4 mr-2" />
                Bulk Import
              </Link>
            </Button>
          )}
        </div>
      </div>

      {/* URL Shortener */}
      {showUrlShortener && (
        <Card>
          <CardHeader>
            <CardTitle>Create New Link</CardTitle>
            <CardDescription>
              Enter a URL to create a new short link
            </CardDescription>
          </CardHeader>
          <CardContent>
            <UrlShortener />
          </CardContent>
        </Card>
      )}

      {/* Stats Cards */}
      {data?.stats && (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Links</CardTitle>
              <LinkIcon className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {formatNumber(data.stats.totalUrls)}
              </div>
              <p className="text-xs text-muted-foreground">
                {formatNumber(data.stats.activeUrls)} active
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                Total Clicks
              </CardTitle>
              <MousePointer className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {formatNumber(data.stats.totalClicks)}
              </div>
              <p className="text-xs text-muted-foreground">all time</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                Created Today
              </CardTitle>
              <Calendar className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {formatNumber(data.stats.urlsToday)}
              </div>
              <p className="text-xs text-muted-foreground">new links</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Avg. Clicks</CardTitle>
              <BarChart3 className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {data.stats.totalUrls > 0
                  ? Math.round(data.stats.totalClicks / data.stats.totalUrls)
                  : 0}
              </div>
              <p className="text-xs text-muted-foreground">per link</p>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Filters and Search */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
              <Input
                placeholder="Search links..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>

            <div className="flex gap-2">
              <Select
                value={filters.status}
                onValueChange={(value) =>
                  setFilters({ ...filters, status: value })
                }
              >
                <SelectTrigger className="w-32">
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Status</SelectItem>
                  <SelectItem value="active">Active</SelectItem>
                  <SelectItem value="inactive">Inactive</SelectItem>
                  <SelectItem value="expired">Expired</SelectItem>
                </SelectContent>
              </Select>

              <Select
                value={filters.folder}
                onValueChange={(value) =>
                  setFilters({ ...filters, folder: value })
                }
              >
                <SelectTrigger className="w-32">
                  <SelectValue placeholder="Folder" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Folders</SelectItem>
                  <SelectItem value="none">Uncategorized</SelectItem>
                  {/* Folders would be loaded dynamically */}
                </SelectContent>
              </Select>

              <Select
                value={filters.sortBy}
                onValueChange={(value) =>
                  setFilters({ ...filters, sortBy: value })
                }
              >
                <SelectTrigger className="w-32">
                  <SelectValue placeholder="Sort by" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="createdAt">Created</SelectItem>
                  <SelectItem value="clicks.total">Clicks</SelectItem>
                  <SelectItem value="title">Title</SelectItem>
                  <SelectItem value="updatedAt">Updated</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Links Table */}
      <Card>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Link</TableHead>
                  <TableHead>Original URL</TableHead>
                  <TableHead>Folder</TableHead>
                  <TableHead>Clicks</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Created</TableHead>
                  <TableHead className="w-12"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {data?.urls.map((link) => (
                  <TableRow key={link._id}>
                    <TableCell>
                      <div className="space-y-1">
                        <div className="font-medium">
                          {link.title || "Untitled"}
                        </div>
                        <div className="text-sm text-muted-foreground font-mono">
                          {link.domain}/{link.shortCode}
                        </div>
                        {link.password && (
                          <Badge variant="outline" className="text-xs">
                            Password Protected
                          </Badge>
                        )}
                      </div>
                    </TableCell>

                    <TableCell>
                      <div className="max-w-xs truncate text-sm text-muted-foreground">
                        {link.originalUrl}
                      </div>
                    </TableCell>

                    <TableCell>
                      {link.folderId ? (
                        <div className="flex items-center gap-2">
                          <div
                            className="w-3 h-3 rounded"
                            style={{ backgroundColor: link.folderId.color }}
                          />
                          <span className="text-sm">{link.folderId.name}</span>
                        </div>
                      ) : (
                        <span className="text-sm text-muted-foreground">
                          None
                        </span>
                      )}
                    </TableCell>

                    <TableCell>
                      <div className="space-y-1">
                        <div className="font-medium">
                          {formatNumber(link.clicks.total)}
                        </div>
                        <div className="text-xs text-muted-foreground">
                          {formatNumber(link.clicks.today)} today
                        </div>
                      </div>
                    </TableCell>

                    <TableCell>
                      <Badge
                        variant={link.isActive ? "default" : "secondary"}
                        className="cursor-pointer"
                        onClick={() =>
                          handleToggleStatus(link._id, link.isActive)
                        }
                      >
                        {link.isActive ? "Active" : "Inactive"}
                      </Badge>
                    </TableCell>

                    <TableCell>
                      <div className="text-sm text-muted-foreground">
                        {formatRelativeTime(link.createdAt)}
                      </div>
                    </TableCell>

                    <TableCell>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="sm">
                            <MoreVertical className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuLabel>Actions</DropdownMenuLabel>

                          <DropdownMenuItem
                            onClick={() =>
                              handleCopyLink(link.shortCode, link.domain)
                            }
                          >
                            <Copy className="mr-2 h-4 w-4" />
                            Copy Link
                          </DropdownMenuItem>

                          <DropdownMenuItem asChild>
                            <a
                              href={`https://${link.domain}/${link.shortCode}`}
                              target="_blank"
                              rel="noopener noreferrer"
                            >
                              <ExternalLink className="mr-2 h-4 w-4" />
                              Open Link
                            </a>
                          </DropdownMenuItem>

                          {user?.plan !== "free" && (
                            <>
                              <DropdownMenuItem asChild>
                                <Link
                                  href={`/dashboard/analytics?link=${link.shortCode}`}
                                >
                                  <BarChart3 className="mr-2 h-4 w-4" />
                                  Analytics
                                </Link>
                              </DropdownMenuItem>

                              <DropdownMenuItem asChild>
                                <Link
                                  href={`/dashboard/qr-codes?link=${link.shortCode}`}
                                >
                                  <QrCode className="mr-2 h-4 w-4" />
                                  QR Code
                                </Link>
                              </DropdownMenuItem>
                            </>
                          )}

                          <DropdownMenuSeparator />

                          <DropdownMenuItem asChild>
                            <Link href={`/dashboard/links/${link._id}/edit`}>
                              <Edit3 className="mr-2 h-4 w-4" />
                              Edit
                            </Link>
                          </DropdownMenuItem>

                          <DropdownMenuItem
                            onClick={() =>
                              handleToggleStatus(link._id, link.isActive)
                            }
                          >
                            {link.isActive ? (
                              <>
                                <EyeOff className="mr-2 h-4 w-4" />
                                Deactivate
                              </>
                            ) : (
                              <>
                                <Eye className="mr-2 h-4 w-4" />
                                Activate
                              </>
                            )}
                          </DropdownMenuItem>

                          <DropdownMenuSeparator />

                          <DropdownMenuItem
                            className="text-red-600"
                            onClick={() => openDeleteDialog(link)}
                          >
                            <Trash2 className="mr-2 h-4 w-4" />
                            Delete
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>

          {/* Pagination */}
          {data?.pagination && data.pagination.totalPages > 1 && (
            <div className="flex items-center justify-between space-x-2 py-4 px-4 border-t">
              <div className="text-sm text-muted-foreground">
                Showing {(data.pagination.page - 1) * data.pagination.limit + 1}{" "}
                to{" "}
                {Math.min(
                  data.pagination.page * data.pagination.limit,
                  data.pagination.total
                )}{" "}
                of {data.pagination.total} entries
              </div>
              <div className="flex space-x-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => fetchLinks(currentPage - 1)}
                  disabled={!data.pagination.hasPrevPage || loading}
                >
                  Previous
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => fetchLinks(currentPage + 1)}
                  disabled={!data.pagination.hasNextPage || loading}
                >
                  Next
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Delete Dialog */}
      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Link</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete this link? This action cannot be
              undone and all analytics data will be lost.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setDeleteDialogOpen(false)}
            >
              Cancel
            </Button>
            <Button variant="destructive" onClick={handleDeleteLink}>
              Delete Link
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
