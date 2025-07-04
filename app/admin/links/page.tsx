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

export default function AdminLinksPage() {
  const [data, setData] = useState<LinksPageData | null>(null);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [filters, setFilters] = useState({
    userId: "",
    domain: "",
    status: "",
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
          ...filters,
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
        toast.error("Failed to load links");
      } finally {
        setLoading(false);
      }
    },
    [searchTerm, filters, toast]
  );

  useEffect(() => {
    fetchLinks(1);
  }, [fetchLinks]);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    fetchLinks(1);
  };

  const handleDeleteLink = async (urlId: string) => {
    try {
      const response = await fetch(`/api/admin/links?urlId=${urlId}`, {
        method: "DELETE",
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || "Failed to delete link");
      }

      toast.success("Link deleted successfully");
      fetchLinks(currentPage);
    } catch (error) {
      console.error("Error deleting link:", error);
      toast.error("Failed to delete link");
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast.success("Copied to clipboard");
  };

  const getStatusBadgeVariant = (url: URLData) => {
    if (!url.isActive) return "secondary";
    if (url.expiresAt && new Date(url.expiresAt) < new Date())
      return "destructive";
    return "default";
  };

  const getStatusText = (url: URLData) => {
    if (!url.isActive) return "Inactive";
    if (url.expiresAt && new Date(url.expiresAt) < new Date()) return "Expired";
    return "Active";
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
    <div className="container mx-auto py-6 px-4">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold">Link Management</h1>
          <p className="text-muted-foreground">Monitor all platform links</p>
        </div>
        <Button onClick={() => fetchLinks(currentPage)}>
          <LinkIcon className="h-4 w-4 mr-2" />
          Refresh
        </Button>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4 mb-8">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Links</CardTitle>
            <LinkIcon className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {formatNumber(data?.stats.totalUrls || 0)}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Links</CardTitle>
            <Eye className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {formatNumber(data?.stats.activeUrls || 0)}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Clicks</CardTitle>
            <MousePointer className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {formatNumber(data?.stats.totalClicks || 0)}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Created Today</CardTitle>
            <Calendar className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {formatNumber(data?.stats.urlsToday || 0)}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card className="mb-6">
        <CardContent className="p-6">
          <form onSubmit={handleSearch} className="flex gap-4">
            <div className="flex-1">
              <Input
                placeholder="Search links by URL, title, or short code..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full"
              />
            </div>
            <Select
              value={filters.status}
              onValueChange={(value) =>
                setFilters((prev) => ({ ...prev, status: value }))
              }
            >
              <SelectTrigger className="w-32">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="">All Status</SelectItem>
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
                    <TableHead className="w-12"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {data?.urls.map((url) => (
                    <TableRow key={url._id}>
                      <TableCell>
                        <div className="space-y-1">
                          <div className="flex items-center gap-2">
                            <code className="px-2 py-1 bg-muted rounded text-sm font-mono">
                              {url.domain}/{url.shortCode}
                            </code>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-6 w-6"
                              onClick={() =>
                                copyToClipboard(
                                  `https://${url.domain}/${url.shortCode}`
                                )
                              }
                            >
                              <Copy className="h-3 w-3" />
                            </Button>
                          </div>
                          <p className="text-sm text-muted-foreground max-w-md truncate">
                            {url.title || url.originalUrl}
                          </p>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div>
                          <p className="font-medium">{url.userId.name}</p>
                          <p className="text-sm text-muted-foreground">
                            {url.userId.email}
                          </p>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant={getStatusBadgeVariant(url)}>
                          {getStatusText(url)}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className="text-sm">
                          <p className="font-medium">
                            {formatNumber(url.clicks.total)}
                          </p>
                          <p className="text-muted-foreground">
                            {formatNumber(url.clicks.unique)} unique
                          </p>
                        </div>
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {formatRelativeTime(url.createdAt)}
                      </TableCell>
                      <TableCell>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon">
                              <MoreHorizontal className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuLabel>Actions</DropdownMenuLabel>
                            <DropdownMenuItem
                              onClick={() =>
                                window.open(
                                  `https://${url.domain}/${url.shortCode}`,
                                  "_blank"
                                )
                              }
                            >
                              <ExternalLink className="mr-2 h-4 w-4" />
                              Visit Link
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              onClick={() =>
                                copyToClipboard(
                                  `https://${url.domain}/${url.shortCode}`
                                )
                              }
                            >
                              <Copy className="mr-2 h-4 w-4" />
                              Copy URL
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              onClick={() => copyToClipboard(url.originalUrl)}
                            >
                              <Copy className="mr-2 h-4 w-4" />
                              Copy Original
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
              {data && data.pagination.totalPages > 1 && (
                <div className="flex items-center justify-between mt-6">
                  <p className="text-sm text-muted-foreground">
                    Showing{" "}
                    {(data.pagination.page - 1) * data.pagination.limit + 1} to{" "}
                    {Math.min(
                      data.pagination.page * data.pagination.limit,
                      data.pagination.total
                    )}{" "}
                    of {data.pagination.total} links
                  </p>
                  <div className="flex gap-2">
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
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
