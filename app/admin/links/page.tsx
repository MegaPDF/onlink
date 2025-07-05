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
import { useRouter } from "next/navigation";
import { toast } from "sonner";

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
  const diff = now.getTime() - dateObj.getTime();
  const seconds = Math.floor(diff / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);

  if (days > 0) return `${days}d ago`;
  if (hours > 0) return `${hours}h ago`;
  if (minutes > 0) return `${minutes}m ago`;
  return "Just now";
};

const formatNumber = (num: number) => {
  if (num >= 1000000) return `${(num / 1000000).toFixed(1)}M`;
  if (num >= 1000) return `${(num / 1000).toFixed(1)}K`;
  return num;
};

export default function AdminLinksPage() {
  const router = useRouter();

  // State management
  const [data, setData] = useState<LinksPageData | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedLinks, setSelectedLinks] = useState<string[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [statusFilter, setStatusFilter] = useState<string>(ALL_LINKS_STATUS);
  const [userFilter, setUserFilter] = useState<string>(ALL_USERS);
  const [domainFilter, setDomainFilter] = useState<string>(ALL_DOMAINS);
  const [sortBy, setSortBy] = useState("createdAt");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("desc");

  // Fetch data
  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams({
        page: currentPage.toString(),
        limit: "20",
        search: searchQuery,
        status: statusFilter === ALL_LINKS_STATUS ? "" : statusFilter,
        userId: userFilter === ALL_USERS ? "" : userFilter,
        domain: domainFilter === ALL_DOMAINS ? "" : domainFilter,
        sortBy,
        sortOrder,
      });

      const response = await fetch(`/api/admin/links?${params}`);
      if (!response.ok) throw new Error("Failed to fetch data");

      const result = await response.json();
      setData(result.data);
    } catch (error) {
      console.error("Error fetching data:", error);
      toast.error("Failed to load links data");
    } finally {
      setLoading(false);
    }
  }, [
    currentPage,
    searchQuery,
    statusFilter,
    userFilter,
    domainFilter,
    sortBy,
    sortOrder,
    toast,
  ]);

  // Initial load
  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Copy to clipboard
  const copyToClipboard = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      toast.success("Link copied to clipboard");
    } catch (error) {
      toast.error("Failed to copy link");
    }
  };

  // FIXED: Handle view analytics with proper navigation
  const handleViewAnalytics = useCallback(
    (shortCode: string) => {
      if (!shortCode) {
        toast.error("Invalid link code");
        return;
      }

      // Navigate to analytics page with shortCode parameter
      router.push(`/dashboard/analytics?url=${shortCode}`);
    },
    [router]
  );

  // FIXED: Handle toggle status with proper ID handling
  const handleToggleStatus = useCallback(
    async (url: URLData) => {
      if (!url._id) {
        toast.error("Invalid link ID");
        return;
      }

      try {
        const response = await fetch(`/api/admin/links`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            linkId: url._id, // Use _id instead of id
            updates: { isActive: !url.isActive },
          }),
        });

        if (!response.ok) throw new Error("Failed to update link");

        toast.success(
          `Link ${url.isActive ? "deactivated" : "activated"} successfully`
        );

        // Refresh data
        fetchData();
      } catch (error) {
        console.error("Error toggling status:", error);
        toast.error("Failed to update link status");
      }
    },
    [fetchData]
  );

  // FIXED: Handle delete with proper ID handling
  const handleDelete = useCallback(
    async (linkId: string) => {
      if (!linkId) {
        toast.error("Invalid link ID");
        return;
      }

      try {
        const response = await fetch(`/api/admin/links?linkId=${linkId}`, {
          method: "DELETE",
        });

        if (!response.ok) throw new Error("Failed to delete link");

        toast.success("Link deleted successfully");

        // Refresh data
        fetchData();
      } catch (error) {
        console.error("Error deleting link:", error);
        toast.error("Failed to delete link");
      }
    },
    [fetchData]
  );

  // FIXED: Handle bulk actions with proper ID handling
  const handleBulkAction = useCallback(
    async (action: string, linkIds: string[]) => {
      if (!linkIds.length) {
        toast.error("No links selected");
        return;
      }

      try {
        let response;

        switch (action) {
          case "activate":
            response = await fetch("/api/admin/links/bulk", {
              method: "PUT",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                linkIds,
                updates: { isActive: true },
              }),
            });
            break;

          case "deactivate":
            response = await fetch("/api/admin/links/bulk", {
              method: "PUT",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                linkIds,
                updates: { isActive: false },
              }),
            });
            break;

          case "delete":
            response = await fetch("/api/admin/links/bulk", {
              method: "DELETE",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ linkIds }),
            });
            break;

          default:
            throw new Error("Invalid action");
        }

        if (!response || !response.ok)
          throw new Error(`Failed to ${action} links`);

        toast.success(`${linkIds.length} link(s) ${action}d successfully`);

        // Clear selection and refresh
        setSelectedLinks([]);
        fetchData();
      } catch (error) {
        console.error(`Error ${action}ing links:`, error);
        toast.error(`Failed to ${action} selected links`);
      }
    },
    [fetchData]
  );

  // Handle selection changes
  const handleSelectAll = (checked: boolean) => {
    if (checked && data?.urls) {
      setSelectedLinks(data.urls.map((url) => url._id));
    } else {
      setSelectedLinks([]);
    }
  };

  const handleSelectLink = (linkId: string, checked: boolean) => {
    if (checked) {
      setSelectedLinks((prev) => [...prev, linkId]);
    } else {
      setSelectedLinks((prev) => prev.filter((id) => id !== linkId));
    }
  };

  if (loading && !data) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin" />
        </div>
      </div>
    );
  }

  return (
    <TooltipProvider>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">
              Links Management
            </h1>
            <p className="text-muted-foreground">
              Monitor and manage all shortened links in the system
            </p>
          </div>
        </div>

        {/* Stats Cards */}
        {data && (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
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
                    +{data.stats.urlsToday || 0}
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
          <CardHeader>
            <CardTitle>Filters</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">Search</label>
                <div className="relative">
                  <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Search links..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-10"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">Status</label>
                <Select value={statusFilter} onValueChange={setStatusFilter}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value={ALL_LINKS_STATUS}>All Status</SelectItem>
                    <SelectItem value="active">Active</SelectItem>
                    <SelectItem value="inactive">Inactive</SelectItem>
                    <SelectItem value="expired">Expired</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">Sort By</label>
                <Select value={sortBy} onValueChange={setSortBy}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="createdAt">Created Date</SelectItem>
                    <SelectItem value="clicks.total">Total Clicks</SelectItem>
                    <SelectItem value="title">Title</SelectItem>
                    <SelectItem value="lastClickAt">Last Clicked</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">Order</label>
                <Select
                  value={sortOrder}
                  onValueChange={(value: "asc" | "desc") => setSortOrder(value)}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="desc">Newest First</SelectItem>
                    <SelectItem value="asc">Oldest First</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <Button onClick={fetchData} disabled={loading}>
                {loading ? (
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                ) : (
                  <Search className="h-4 w-4 mr-2" />
                )}
                Search
              </Button>
              <Button
                variant="outline"
                onClick={() => {
                  setSearchQuery("");
                  setStatusFilter(ALL_LINKS_STATUS);
                  setUserFilter(ALL_USERS);
                  setDomainFilter(ALL_DOMAINS);
                  setSortBy("createdAt");
                  setSortOrder("desc");
                }}
              >
                <Filter className="h-4 w-4 mr-2" />
                Clear Filters
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Bulk Actions */}
        {selectedLinks.length > 0 && (
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Checkbox
                    checked={selectedLinks.length === (data?.urls.length || 0)}
                    onCheckedChange={handleSelectAll}
                  />
                  <span className="text-sm font-medium">
                    {selectedLinks.length} link
                    {selectedLinks.length !== 1 ? "s" : ""} selected
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
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button
                        variant="outline"
                        size="sm"
                        className="text-red-600"
                      >
                        <Trash2 className="h-4 w-4 mr-2" />
                        Delete
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>
                          Delete Selected Links
                        </AlertDialogTitle>
                        <AlertDialogDescription>
                          Are you sure you want to delete {selectedLinks.length}{" "}
                          selected link(s)? This action cannot be undone.
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction
                          onClick={() =>
                            handleBulkAction("delete", selectedLinks)
                          }
                          className="bg-red-600 hover:bg-red-700"
                        >
                          Delete
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
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
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-12">
                        <Checkbox
                          checked={selectedLinks.length === data.urls.length}
                          onCheckedChange={handleSelectAll}
                        />
                      </TableHead>
                      <TableHead>Link</TableHead>
                      <TableHead>User</TableHead>
                      <TableHead>Clicks</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Last Click</TableHead>
                      <TableHead>Created</TableHead>
                      <TableHead className="w-12"></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {data.urls.map((url) => (
                      <TableRow key={url._id} className="group">
                        <TableCell>
                          <Checkbox
                            checked={selectedLinks.includes(url._id)}
                            onCheckedChange={(checked) =>
                              handleSelectLink(url._id, checked as boolean)
                            }
                          />
                        </TableCell>
                        <TableCell>
                          <div className="space-y-1">
                            <div className="flex items-center gap-2">
                              <div className="font-medium truncate max-w-[200px]">
                                {url.title || url.shortCode}
                              </div>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() =>
                                  copyToClipboard(
                                    `${url.domain}/${url.shortCode}`
                                  )
                                }
                                className="h-6 w-6 p-0 opacity-0 group-hover:opacity-100 transition-opacity"
                              >
                                <Copy className="h-3 w-3" />
                              </Button>
                            </div>
                            <div className="text-xs text-muted-foreground truncate max-w-[250px]">
                              {url.originalUrl}
                            </div>
                            <div className="text-xs text-blue-600">
                              {url.domain}/{url.shortCode}
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="space-y-1">
                            <div className="font-medium">{url.userId.name}</div>
                            <div className="text-xs text-muted-foreground">
                              {url.userId.email}
                            </div>
                          </div>
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
                          <Badge
                            variant={url.isActive ? "default" : "secondary"}
                          >
                            {url.isActive ? "Active" : "Inactive"}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <div className="text-sm text-muted-foreground">
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
                              <DropdownMenuItem
                                onClick={() =>
                                  handleViewAnalytics(url.shortCode)
                                }
                              >
                                <BarChart3 className="mr-2 h-4 w-4" />
                                View Analytics
                              </DropdownMenuItem>
                              <DropdownMenuSeparator />
                              <DropdownMenuItem
                                onClick={() => handleToggleStatus(url)}
                              >
                                {url.isActive ? (
                                  <Pause className="mr-2 h-4 w-4" />
                                ) : (
                                  <Play className="mr-2 h-4 w-4" />
                                )}
                                {url.isActive ? "Deactivate" : "Activate"}
                              </DropdownMenuItem>
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
                                    <AlertDialogTitle>
                                      Delete Link
                                    </AlertDialogTitle>
                                    <AlertDialogDescription>
                                      Are you sure you want to delete this link?
                                      This action cannot be undone and will
                                      remove all associated analytics.
                                    </AlertDialogDescription>
                                  </AlertDialogHeader>
                                  <AlertDialogFooter>
                                    <AlertDialogCancel>
                                      Cancel
                                    </AlertDialogCancel>
                                    <AlertDialogAction
                                      onClick={() => handleDelete(url._id)}
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
                {data.pagination.totalPages > 1 && (
                  <div className="flex items-center justify-between">
                    <div className="text-sm text-muted-foreground">
                      Showing {(currentPage - 1) * 20 + 1} to{" "}
                      {Math.min(currentPage * 20, data.pagination.total)} of{" "}
                      {data.pagination.total} links
                    </div>
                    <div className="flex items-center gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() =>
                          setCurrentPage((prev) => Math.max(1, prev - 1))
                        }
                        disabled={!data.pagination.hasPrevPage}
                      >
                        Previous
                      </Button>
                      <span className="text-sm">
                        Page {currentPage} of {data.pagination.totalPages}
                      </span>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setCurrentPage((prev) => prev + 1)}
                        disabled={!data.pagination.hasNextPage}
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
