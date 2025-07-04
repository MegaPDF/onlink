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
import { Checkbox } from "@/components/ui/checkbox";
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
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  Link2 as LinkIcon,
  Search,
  MoreHorizontal,
  ExternalLink,
  Copy,
  Trash2,
  Eye,
  BarChart3,
  Calendar,
  MousePointer,
  Filter,
  Download,
  Settings,
  AlertTriangle,
  Clock,
  TrendingUp,
  Loader2,
  CheckCircle,
  XCircle,
  Ban,
  Play,
  Pause,
  Users,
  Globe,
  Zap,
  Activity,
} from "lucide-react";

// Types for real API data
interface URLData {
  _id: string;
  shortCode: string;
  originalUrl: string;
  title?: string;
  description?: string;
  domain: string;
  userId: { _id: string; name: string; email: string };
  folderId?: { _id: string; name: string; color?: string };
  clicks: { total: number; unique: number };
  isActive: boolean;
  expiresAt?: Date;
  createdAt: Date;
  updatedAt: Date;
  lastClickAt?: Date;
  tags?: string[];
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
    inactiveUrls: number;
    expiredUrls: number;
    totalClicks: number;
    urlsToday: number;
    clicksToday: number;
    topDomain: string;
  };
}

const ALL_LINKS_STATUS = "all_links_status";
const ALL_USERS = "all_users";
const ALL_DOMAINS = "all_domains";

// Utility functions
const formatRelativeTime = (date: Date | string) => {
  const dateObj = typeof date === "string" ? new Date(date) : date;
  const now = new Date();
  const diffInMs = now.getTime() - dateObj.getTime();
  const diffInHours = diffInMs / (1000 * 60 * 60);
  const diffInDays = diffInMs / (1000 * 60 * 60 * 24);

  if (diffInHours < 1) return "Just now";
  if (diffInHours < 24) return `${Math.floor(diffInHours)}h ago`;
  if (diffInDays < 7) return `${Math.floor(diffInDays)}d ago`;
  return dateObj.toLocaleDateString();
};

const formatNumber = (num: number) => {
  return new Intl.NumberFormat().format(num);
};

export default function AdminLinksPage() {
  const [data, setData] = useState<LinksPageData | null>(null);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedLinks, setSelectedLinks] = useState<string[]>([]);
  const [filters, setFilters] = useState({
    userId: ALL_USERS,
    domain: ALL_DOMAINS,
    status: ALL_LINKS_STATUS,
    sortBy: "createdAt",
    sortOrder: "desc",
  });
  const [currentPage, setCurrentPage] = useState(1);

  // Toast notifications (replace with your actual toast implementation)
  const toast = {
    success: (message: string) => console.log("Success:", message),
    error: (message: string) => console.log("Error:", message),
  };

  // Fetch links from API
  const fetchLinks = useCallback(
    async (page = 1) => {
      try {
        setLoading(true);
        const params = new URLSearchParams({
          page: page.toString(),
          limit: "20",
          search: searchTerm,
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
    [searchTerm, filters]
  );

  // Load links on component mount and when filters change
  useEffect(() => {
    fetchLinks(1);
  }, [fetchLinks]);

  // Search handler
  const handleSearch = () => {
    fetchLinks(1);
  };

  // Delete single link
  const handleDeleteLink = async (urlId: string) => {
    try {
      const response = await fetch(`/api/admin/links?linkId=${urlId}`, {
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
      toast.error("Failed to delete link. Please try again.");
    }
  };

  // Toggle link status
  const handleToggleLinkStatus = async (urlId: string, isActive: boolean) => {
    try {
      const response = await fetch(`/api/admin/links?linkId=${urlId}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ isActive }),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || "Failed to update link status");
      }

      toast.success(
        `Link ${isActive ? "activated" : "deactivated"} successfully`
      );
      fetchLinks(currentPage);
    } catch (error) {
      console.error("Error updating link status:", error);
      toast.error("Failed to update link status");
    }
  };

  // Bulk actions
  const handleBulkAction = async (action: string, linkIds: string[]) => {
    try {
      const response = await fetch("/api/admin/links/bulk", {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ action, linkIds }),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || "Failed to perform bulk action");
      }

      toast.success(`Bulk action completed successfully`);
      setSelectedLinks([]);
      fetchLinks(currentPage);
    } catch (error) {
      console.error("Error performing bulk action:", error);
      toast.error("Failed to perform bulk action");
    }
  };

  // Export links
  const handleExportLinks = async () => {
    try {
      const response = await fetch("/api/admin/links/export", {
        method: "GET",
        headers: {
          Accept: "text/csv",
        },
      });

      if (!response.ok) {
        throw new Error("Failed to export links");
      }

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `links-export-${new Date().toISOString().split("T")[0]}.csv`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);

      toast.success("Links exported successfully");
    } catch (error) {
      console.error("Error exporting links:", error);
      toast.error("Failed to export links");
    }
  };

  // Utility functions
  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast.success("Copied to clipboard");
  };

  const getStatusBadge = (isActive: boolean, expiresAt?: Date) => {
    if (expiresAt && new Date(expiresAt) < new Date()) {
      return (
        <Badge className="bg-red-100 text-red-800 border-red-200 dark:bg-red-900/20 dark:text-red-400 dark:border-red-800">
          <XCircle className="w-3 h-3 mr-1" />
          Expired
        </Badge>
      );
    }
    return isActive ? (
      <Badge className="bg-green-100 text-green-800 border-green-200 dark:bg-green-900/20 dark:text-green-400 dark:border-green-800">
        <CheckCircle className="w-3 h-3 mr-1" />
        Active
      </Badge>
    ) : (
      <Badge className="bg-gray-100 text-gray-800 border-gray-200 dark:bg-gray-900/20 dark:text-gray-400 dark:border-gray-800">
        <Pause className="w-3 h-3 mr-1" />
        Inactive
      </Badge>
    );
  };

  const getDomainBadgeColor = (domain: string) => {
    const colors = [
      "bg-blue-100 text-blue-800 border-blue-200 dark:bg-blue-900/20 dark:text-blue-400 dark:border-blue-800",
      "bg-purple-100 text-purple-800 border-purple-200 dark:bg-purple-900/20 dark:text-purple-400 dark:border-purple-800",
      "bg-green-100 text-green-800 border-green-200 dark:bg-green-900/20 dark:text-green-400 dark:border-green-800",
      "bg-orange-100 text-orange-800 border-orange-200 dark:bg-orange-900/20 dark:text-orange-400 dark:border-orange-800",
    ];
    return colors[domain.length % colors.length];
  };

  const toggleLinkSelection = (linkId: string) => {
    setSelectedLinks((prev) =>
      prev.includes(linkId)
        ? prev.filter((id) => id !== linkId)
        : [...prev, linkId]
    );
  };

  const toggleSelectAll = () => {
    if (!data) return;
    if (selectedLinks.length === data.urls.length) {
      setSelectedLinks([]);
    } else {
      setSelectedLinks(data.urls.map((link) => link._id));
    }
  };

  // Loading state
  if (loading && !data) {
    return (
      <div className="flex items-center justify-center h-96">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  // Error state - no data loaded
  if (!loading && !data) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-center">
          <AlertTriangle className="h-12 w-12 text-red-500 mx-auto mb-4" />
          <h3 className="text-lg font-semibold mb-2">Failed to load links</h3>
          <p className="text-muted-foreground mb-4">
            There was an error loading the links data.
          </p>
          <Button onClick={() => fetchLinks(1)}>
            <Activity className="h-4 w-4 mr-2" />
            Try Again
          </Button>
        </div>
      </div>
    );
  }

  return (
    <TooltipProvider>
      <div className="container mx-auto py-6 px-4 space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Links</h1>
            <p className="text-muted-foreground">
              Manage all shortened links across the platform
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Tooltip>
              <TooltipTrigger asChild>
                <Button variant="outline" size="sm" onClick={handleExportLinks}>
                  <Download className="h-4 w-4 mr-2" />
                  Export
                </Button>
              </TooltipTrigger>
              <TooltipContent>Export links data to CSV</TooltipContent>
            </Tooltip>
          </div>
        </div>

        {/* Stats Cards */}
        {data?.stats && (
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4">
            <Card className="relative overflow-hidden">
              <div className="absolute inset-0 bg-gradient-to-br from-blue-50 to-blue-100 dark:from-blue-950/20 dark:to-blue-900/20"></div>
              <CardHeader className="relative flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">
                  Total Links
                </CardTitle>
                <LinkIcon className="h-4 w-4 text-blue-600" />
              </CardHeader>
              <CardContent className="relative">
                <div className="text-2xl font-bold text-blue-600">
                  {formatNumber(data.stats.totalUrls)}
                </div>
                <div className="flex items-center text-xs text-muted-foreground mt-1">
                  <TrendingUp className="h-3 w-3 mr-1" />
                  <span className="text-green-600">
                    +{data.stats.urlsToday}
                  </span>
                  <span className="ml-1">today</span>
                </div>
              </CardContent>
            </Card>

            <Card className="relative overflow-hidden">
              <div className="absolute inset-0 bg-gradient-to-br from-green-50 to-green-100 dark:from-green-950/20 dark:to-green-900/20"></div>
              <CardHeader className="relative flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">
                  Active Links
                </CardTitle>
                <Eye className="h-4 w-4 text-green-600" />
              </CardHeader>
              <CardContent className="relative">
                <div className="text-2xl font-bold text-green-600">
                  {formatNumber(data.stats.activeUrls)}
                </div>
                <p className="text-xs text-muted-foreground">
                  {data.stats.inactiveUrls} inactive
                </p>
              </CardContent>
            </Card>

            <Card className="relative overflow-hidden">
              <div className="absolute inset-0 bg-gradient-to-br from-purple-50 to-purple-100 dark:from-purple-950/20 dark:to-purple-900/20"></div>
              <CardHeader className="relative flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">
                  Total Clicks
                </CardTitle>
                <MousePointer className="h-4 w-4 text-purple-600" />
              </CardHeader>
              <CardContent className="relative">
                <div className="text-2xl font-bold text-purple-600">
                  {formatNumber(data.stats.totalClicks)}
                </div>
                <div className="flex items-center text-xs text-muted-foreground mt-1">
                  <Zap className="h-3 w-3 mr-1" />
                  <span className="text-green-600">
                    +{data.stats.clicksToday || 0}
                  </span>
                  <span className="ml-1">today</span>
                </div>
              </CardContent>
            </Card>

            <Card className="relative overflow-hidden">
              <div className="absolute inset-0 bg-gradient-to-br from-orange-50 to-orange-100 dark:from-orange-950/20 dark:to-orange-900/20"></div>
              <CardHeader className="relative flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">
                  Top Domain
                </CardTitle>
                <Globe className="h-4 w-4 text-orange-600" />
              </CardHeader>
              <CardContent className="relative">
                <div className="text-lg font-bold text-orange-600 truncate">
                  {data.stats.topDomain || "N/A"}
                </div>
                <p className="text-xs text-muted-foreground">
                  Most used domain
                </p>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Filters */}
        <Card>
          <CardContent className="pt-6">
            <div className="flex gap-4 items-end flex-wrap">
              <div className="flex-1 min-w-[300px]">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
                  <Input
                    placeholder="Search links by URL, title, or short code..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10"
                  />
                </div>
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
                  <SelectItem value={ALL_LINKS_STATUS}>All Status</SelectItem>
                  <SelectItem value="active">Active</SelectItem>
                  <SelectItem value="inactive">Inactive</SelectItem>
                  <SelectItem value="expired">Expired</SelectItem>
                </SelectContent>
              </Select>

              <Select
                value={filters.domain}
                onValueChange={(value) =>
                  setFilters((prev) => ({ ...prev, domain: value }))
                }
              >
                <SelectTrigger className="w-32">
                  <SelectValue placeholder="Domain" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={ALL_DOMAINS}>All Domains</SelectItem>
                  <SelectItem value="short.ly">short.ly</SelectItem>
                  <SelectItem value="link.to">link.to</SelectItem>
                  <SelectItem value="custom.com">custom.com</SelectItem>
                </SelectContent>
              </Select>

              <Select
                value={filters.sortBy}
                onValueChange={(value) =>
                  setFilters((prev) => ({ ...prev, sortBy: value }))
                }
              >
                <SelectTrigger className="w-32">
                  <SelectValue placeholder="Sort by" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="createdAt">Created</SelectItem>
                  <SelectItem value="clicks">Clicks</SelectItem>
                  <SelectItem value="lastClickAt">Last Click</SelectItem>
                </SelectContent>
              </Select>

              <Button onClick={handleSearch} variant="outline">
                <Filter className="h-4 w-4 mr-2" />
                Filter
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Bulk Actions */}
        {selectedLinks.length > 0 && (
          <Card className="bg-blue-50 dark:bg-blue-950/20 border-blue-200 dark:border-blue-800">
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <CheckCircle className="h-5 w-5 text-blue-600" />
                  <span className="font-medium text-blue-800 dark:text-blue-200">
                    {selectedLinks.length} link
                    {selectedLinks.length > 1 ? "s" : ""} selected
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleBulkAction("activate", selectedLinks)}
                  >
                    <Play className="h-4 w-4 mr-2" />
                    Activate
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() =>
                      handleBulkAction("deactivate", selectedLinks)
                    }
                  >
                    <Pause className="h-4 w-4 mr-2" />
                    Deactivate
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    className="text-red-600"
                    onClick={() => handleBulkAction("delete", selectedLinks)}
                  >
                    <Trash2 className="h-4 w-4 mr-2" />
                    Delete
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Links Table */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>
                  Links ({data ? formatNumber(data.pagination.total) : "0"})
                </CardTitle>
                <CardDescription>
                  Manage and monitor all shortened links in the system
                </CardDescription>
              </div>
              <div className="flex items-center gap-2">
                <Button variant="outline" size="sm">
                  <Settings className="h-4 w-4 mr-2" />
                  Columns
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {!data || data.urls.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12">
                <LinkIcon className="h-12 w-12 text-muted-foreground mb-4" />
                <h3 className="text-lg font-semibold mb-2">No links found</h3>
                <p className="text-muted-foreground">
                  {!data
                    ? "Loading links..."
                    : "No links match your current filters."}
                </p>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="rounded-md border">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="w-[50px]">
                          <Checkbox
                            checked={
                              data.urls.length > 0 &&
                              selectedLinks.length === data.urls.length
                            }
                            onCheckedChange={toggleSelectAll}
                           
                          />
                        </TableHead>
                        <TableHead>Link</TableHead>
                        <TableHead>Owner</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Clicks</TableHead>
                        <TableHead>Last Click</TableHead>
                        <TableHead>Created</TableHead>
                        <TableHead className="w-[50px]"></TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {data.urls.map((url) => (
                        <TableRow key={url._id} className="group">
                          <TableCell>
                            <Checkbox
                              checked={selectedLinks.includes(url._id)}
                              onCheckedChange={() =>
                                toggleLinkSelection(url._id)
                              }
                            />
                          </TableCell>
                          <TableCell>
                            <div className="space-y-1 max-w-sm">
                              <div className="flex items-center gap-2">
                                <ExternalLink className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                                <span className="font-medium truncate">
                                  {url.title || url.originalUrl}
                                </span>
                              </div>
                              <div className="flex items-center gap-2">
                                <Badge
                                  className={getDomainBadgeColor(url.domain)}
                                  variant="outline"
                                >
                                  {url.domain}
                                </Badge>
                                <span className="text-sm text-muted-foreground">
                                  /{url.shortCode}
                                </span>
                              </div>
                              {url.folderId && (
                                <div className="flex items-center gap-1 text-xs text-muted-foreground">
                                  <div
                                    className="w-2 h-2 rounded-full"
                                    style={{
                                      backgroundColor:
                                        url.folderId.color || "#3B82F6",
                                    }}
                                  />
                                  {url.folderId.name}
                                </div>
                              )}
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center space-x-2">
                              <div className="h-6 w-6 rounded-full bg-gradient-to-br from-blue-400 to-blue-600 flex items-center justify-center text-white text-xs font-medium">
                                {url.userId.name.charAt(0).toUpperCase()}
                              </div>
                              <div>
                                <div className="font-medium text-sm">
                                  {url.userId.name}
                                </div>
                                <div className="text-xs text-muted-foreground">
                                  {url.userId.email}
                                </div>
                              </div>
                            </div>
                          </TableCell>
                          <TableCell>
                            {getStatusBadge(url.isActive, url.expiresAt)}
                          </TableCell>
                          <TableCell>
                            <div className="space-y-1">
                              <div className="font-medium">
                                {formatNumber(url.clicks.total)}
                              </div>
                              <div className="text-xs text-muted-foreground">
                                {formatNumber(url.clicks.unique)} unique
                              </div>
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center text-sm text-muted-foreground">
                              <Clock className="h-3 w-3 mr-1" />
                              {url.lastClickAt
                                ? formatRelativeTime(url.lastClickAt)
                                : "Never"}
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
                                <Button
                                  variant="ghost"
                                  className="h-8 w-8 p-0 opacity-0 group-hover:opacity-100 transition-opacity"
                                >
                                  <MoreHorizontal className="h-4 w-4" />
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end" className="w-48">
                                <DropdownMenuLabel>Actions</DropdownMenuLabel>
                                <DropdownMenuItem
                                  onClick={() =>
                                    window.open(
                                      `${url.domain}/${url.shortCode}`,
                                      "_blank"
                                    )
                                  }
                                >
                                  <ExternalLink className="mr-2 h-4 w-4" />
                                  Open Link
                                </DropdownMenuItem>
                                <DropdownMenuItem
                                  onClick={() =>
                                    copyToClipboard(
                                      `${url.domain}/${url.shortCode}`
                                    )
                                  }
                                >
                                  <Copy className="mr-2 h-4 w-4" />
                                  Copy Short URL
                                </DropdownMenuItem>
                                <DropdownMenuItem>
                                  <BarChart3 className="mr-2 h-4 w-4" />
                                  View Analytics
                                </DropdownMenuItem>
                                <DropdownMenuSeparator />
                                {url.isActive ? (
                                  <DropdownMenuItem
                                    onClick={() =>
                                      handleToggleLinkStatus(url._id, false)
                                    }
                                    className="text-orange-600"
                                  >
                                    <Pause className="mr-2 h-4 w-4" />
                                    Deactivate
                                  </DropdownMenuItem>
                                ) : (
                                  <DropdownMenuItem
                                    onClick={() =>
                                      handleToggleLinkStatus(url._id, true)
                                    }
                                    className="text-green-600"
                                  >
                                    <Play className="mr-2 h-4 w-4" />
                                    Activate
                                  </DropdownMenuItem>
                                )}
                                <DropdownMenuSeparator />
                                <AlertDialog>
                                  <AlertDialogTrigger asChild>
                                    <DropdownMenuItem
                                      onSelect={(e) => e.preventDefault()}
                                      className="text-red-600"
                                    >
                                      <Trash2 className="mr-2 h-4 w-4" />
                                      Delete Link
                                    </DropdownMenuItem>
                                  </AlertDialogTrigger>
                                  <AlertDialogContent>
                                    <AlertDialogHeader>
                                      <AlertDialogTitle className="flex items-center gap-2">
                                        <AlertTriangle className="h-5 w-5 text-red-600" />
                                        Delete Link
                                      </AlertDialogTitle>
                                      <AlertDialogDescription>
                                        Are you sure you want to delete this
                                        link? This action cannot be undone and
                                        will break any existing references to
                                        this short URL.
                                      </AlertDialogDescription>
                                    </AlertDialogHeader>
                                    <AlertDialogFooter>
                                      <AlertDialogCancel>
                                        Cancel
                                      </AlertDialogCancel>
                                      <AlertDialogAction
                                        onClick={() =>
                                          handleDeleteLink(url._id)
                                        }
                                        className="bg-red-600 hover:bg-red-700"
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
                {data && data.pagination.totalPages > 1 && (
                  <div className="flex items-center justify-between">
                    <div className="text-sm text-muted-foreground">
                      Showing{" "}
                      <strong>
                        {(data.pagination.page - 1) * data.pagination.limit + 1}
                      </strong>{" "}
                      to{" "}
                      <strong>
                        {Math.min(
                          data.pagination.page * data.pagination.limit,
                          data.pagination.total
                        )}
                      </strong>{" "}
                      of <strong>{data.pagination.total}</strong> results
                    </div>
                    <div className="flex items-center space-x-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => fetchLinks(currentPage - 1)}
                        disabled={!data.pagination.hasPrevPage || loading}
                      >
                        Previous
                      </Button>
                      <div className="flex items-center space-x-1">
                        {[
                          ...Array(Math.min(5, data.pagination.totalPages)),
                        ].map((_, i) => {
                          const page = i + 1;
                          return (
                            <Button
                              key={page}
                              variant={
                                page === data.pagination.page
                                  ? "default"
                                  : "outline"
                              }
                              size="sm"
                              className="w-8 h-8"
                              onClick={() => fetchLinks(page)}
                            >
                              {page}
                            </Button>
                          );
                        })}
                      </div>
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
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </TooltipProvider>
  );
}
