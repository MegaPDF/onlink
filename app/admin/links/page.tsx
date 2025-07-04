"use client";

import React, { useState, useEffect, useCallback } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { LoadingSpinner } from "@/components/ui/loading-spinner";
import { EmptyState } from "@/components/ui/empty-state";
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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
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
  Link as LinkIcon,
  Search,
  MoreHorizontal,
  ExternalLink,
  Copy,
  Trash2,
  Eye,
  BarChart3,
  Calendar,
  MousePointer,
} from "lucide-react";
import { formatRelativeTime, formatNumber } from "@/lib/utils";

interface URLData {
  _id: string;
  shortCode: string;
  originalUrl: string;
  title?: string;
  domain: string;
  userId: { _id: string; name: string; email: string };
  folderId?: { _id: string; name: string };
  clicks: { total: number; unique: number };
  isActive: boolean;
  expiresAt?: Date;
  createdAt: Date;
  lastClickAt?: Date;
}

interface LinksPageData {
  urls: URLData[];
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

// Define special "all" values to replace empty strings
const ALL_LINKS_STATUS = "all_links_status";
const ALL_USERS = "all_users";
const ALL_DOMAINS = "all_domains";

export default function AdminLinksPage() {
  const [data, setData] = useState<LinksPageData | null>(null);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [filters, setFilters] = useState({
    userId: ALL_USERS,
    domain: ALL_DOMAINS,
    status: ALL_LINKS_STATUS,
    sortBy: "createdAt",
    sortOrder: "desc",
  });
  const [currentPage, setCurrentPage] = useState(1);
  const toast = useToast();

  const fetchLinks = useCallback(
    async (page = 1) => {
      try {
        setLoading(true);
        const params = new URLSearchParams({
          page: page.toString(),
          limit: "20",
          search: searchTerm,
          // Convert special "all" values back to empty strings for API
          userId: filters.userId === ALL_USERS ? "" : filters.userId,
          domain: filters.domain === ALL_DOMAINS ? "" : filters.domain,
          status: filters.status === ALL_LINKS_STATUS ? "" : filters.status,
          sortBy: filters.sortBy,
          sortOrder: filters.sortOrder,
        });

        const response = await fetch(`/api/admin/links?${params}`);
        const result = await response.json();

        if (!response.ok) {
          throw new Error(result.error || "Failed to fetch links");
        }

        setData(result.data);
        setCurrentPage(page);
      } catch (error) {
        console.error("Error fetching links:", error);
        toast.error("Failed to load links. Please try again.");
      } finally {
        setLoading(false);
      }
    },
    [searchTerm, filters, toast]
  );

  useEffect(() => {
    fetchLinks(1);
  }, []);

  useEffect(() => {
    const delayedSearch = setTimeout(() => {
      if (searchTerm !== undefined) {
        fetchLinks(1);
      }
    }, 500);

    return () => clearTimeout(delayedSearch);
  }, [searchTerm, filters]);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    fetchLinks(1);
  };

  const handleDeleteLink = async (urlId: string) => {
    try {
      const response = await fetch(`/api/admin/links?linkId=${urlId}`, {
        method: "DELETE",
      });

      if (!response.ok) {
        throw new Error("Failed to delete link");
      }

      toast.success("Link deleted successfully.");

      fetchLinks(currentPage);
    } catch (error) {
      console.error("Error deleting link:", error);
      toast.error("Failed to delete link. Please try again.");
    }
  };

  const getStatusBadge = (isActive: boolean, expiresAt?: Date) => {
    if (expiresAt && new Date(expiresAt) < new Date()) {
      return <Badge variant="destructive">Expired</Badge>;
    }
    return isActive ? (
      <Badge variant="default" className="bg-green-100 text-green-800">
        Active
      </Badge>
    ) : (
      <Badge variant="secondary">Inactive</Badge>
    );
  };

  if (loading && !data) {
    return (
      <div className="flex items-center justify-center h-96">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold">Links</h1>
        <p className="text-muted-foreground">
          Manage all shortened links across the platform
        </p>
      </div>

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
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                Active Links
              </CardTitle>
              <Eye className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {formatNumber(data.stats.activeUrls)}
              </div>
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
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Links Today</CardTitle>
              <Calendar className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {formatNumber(data.stats.urlsToday)}
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle>Search & Filter</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSearch} className="flex gap-4">
            <div className="flex-1">
              <Input
                placeholder="Search links by URL, title, or short code..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
            <Select
              value={filters.status}
              onValueChange={(value) =>
                setFilters((prev) => ({ ...prev, status: value }))
              }
            >
              <SelectTrigger className="w-40">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={ALL_LINKS_STATUS}>All Status</SelectItem>
                <SelectItem value="active">Active</SelectItem>
                <SelectItem value="inactive">Inactive</SelectItem>
                <SelectItem value="expired">Expired</SelectItem>
              </SelectContent>
            </Select>
            <Button type="submit">
              <Search className="h-4 w-4" />
            </Button>
          </form>
        </CardContent>
      </Card>

      {/* Links Table */}
      <Card>
        <CardHeader>
          <CardTitle>Links ({data?.pagination.total || 0})</CardTitle>
        </CardHeader>
        <CardContent>
          {data?.urls.length === 0 ? (
            <EmptyState
              icon={LinkIcon}
              title="No links found"
              description="No links match your current filters."
            />
          ) : (
            <>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Link</TableHead>
                    <TableHead>Owner</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Clicks</TableHead>
                    <TableHead>Created</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {data?.urls.map((url) => (
                    <TableRow key={url._id}>
                      <TableCell>
                        <div className="max-w-xs">
                          <div className="font-medium truncate">
                            {url.title || url.originalUrl}
                          </div>
                          <div className="text-sm text-muted-foreground">
                            {url.domain}/{url.shortCode}
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div>
                          <div className="font-medium">{url.userId.name}</div>
                          <div className="text-sm text-muted-foreground">
                            {url.userId.email}
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        {getStatusBadge(url.isActive, url.expiresAt)}
                      </TableCell>
                      <TableCell>
                        <div className="text-sm">
                          <div>{formatNumber(url.clicks.total)} total</div>
                          <div className="text-muted-foreground">
                            {formatNumber(url.clicks.unique)} unique
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="text-sm">
                          {formatRelativeTime(url.createdAt)}
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
                            <DropdownMenuLabel>Actions</DropdownMenuLabel>
                            <DropdownMenuItem>
                              <ExternalLink className="mr-2 h-4 w-4" />
                              Open Link
                            </DropdownMenuItem>
                            <DropdownMenuItem>
                              <Copy className="mr-2 h-4 w-4" />
                              Copy Short URL
                            </DropdownMenuItem>
                            <DropdownMenuItem>
                              <BarChart3 className="mr-2 h-4 w-4" />
                              View Analytics
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <AlertDialog>
                              <AlertDialogTrigger asChild>
                                <DropdownMenuItem
                                  className="text-red-600"
                                  onSelect={(e) => e.preventDefault()}
                                >
                                  <Trash2 className="mr-2 h-4 w-4" />
                                  Delete Link
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
                                    onClick={() => handleDeleteLink(url._id)}
                                    className="bg-red-600 hover:bg-red-700"
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

              {/* Pagination */}
              {data?.pagination && data.pagination.totalPages > 1 && (
                <div className="flex items-center justify-between space-x-2 py-4">
                  <div className="text-sm text-muted-foreground">
                    Showing {(currentPage - 1) * 20 + 1} to{" "}
                    {Math.min(currentPage * 20, data.pagination.total)} of{" "}
                    {data.pagination.total} links
                  </div>
                  <div className="flex items-center space-x-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => fetchLinks(currentPage - 1)}
                      disabled={!data.pagination.hasPrevPage}
                    >
                      Previous
                    </Button>
                    <div className="text-sm">
                      Page {currentPage} of {data.pagination.totalPages}
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => fetchLinks(currentPage + 1)}
                      disabled={!data.pagination.hasNextPage}
                    >
                      Next
                    </Button>
                  </div>
                </div>
              )}
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
