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
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
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
  LinkIcon,
  Search,
  Filter,
  MoreHorizontal,
  Eye,
  Edit,
  Trash2,
  Ban,
  CheckCircle,
  AlertTriangle,
  MousePointer,
  Calendar,
  Globe,
  User,
  Activity,
  TrendingUp,
  Download,
  RefreshCw,
  Copy,
  ExternalLink,
} from "lucide-react";
import { formatNumber} from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";
import { formatDate, formatDistanceToNow } from "date-fns";

interface AdminLink {
  id: string;
  shortCode: string;
  originalUrl: string;
  shortUrl: string;
  title?: string;
  description?: string;
  user: {
    id: string;
    name: string;
    email: string;
    plan: string;
  };
  clicks: {
    total: number;
    unique: number;
    today: number;
  };
  status: "active" | "inactive" | "banned" | "expired";
  isPasswordProtected: boolean;
  expiresAt?: string;
  createdAt: string;
  lastClickAt?: string;
  domain: string;
  tags: string[];
  flags: {
    isSuspicious: boolean;
    isReported: boolean;
    violatesPolicy: boolean;
  };
}

interface LinkFilters {
  search: string;
  status: string;
  domain: string;
  userPlan: string;
  hasFlags: string;
  dateRange: string;
}

export default function AdminLinksPage() {
  const toast = useToast();
  const [links, setLinks] = useState<AdminLink[]>([]);
  const [loading, setLoading] = useState(true);
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 20,
    total: 0,
    totalPages: 0,
  });

  const [filters, setFilters] = useState<LinkFilters>({
    search: "",
    status: "",
    domain: "",
    userPlan: "",
    hasFlags: "",
    dateRange: "",
  });

  const [stats, setStats] = useState({
    totalLinks: 0,
    activeLinks: 0,
    flaggedLinks: 0,
    totalClicks: 0,
  });

  useEffect(() => {
    fetchLinks();
    fetchStats();
  }, [filters, pagination.page]);

  const fetchLinks = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        page: pagination.page.toString(),
        limit: pagination.limit.toString(),
        ...Object.fromEntries(Object.entries(filters).filter(([_, v]) => v)),
      });

      const response = await fetch(`/api/admin/links?${params}`);
      if (response.ok) {
        const data = await response.json();
        setLinks(data.data.links);
        setPagination((prev) => ({
          ...prev,
          total: data.data.total,
          totalPages: data.data.totalPages,
        }));
      }
    } catch (error) {
      console.error("Failed to fetch links:", error);
    } finally {
      setLoading(false);
    }
  };

  const fetchStats = async () => {
    try {
      const response = await fetch("/api/admin/links/stats");
      if (response.ok) {
        const data = await response.json();
        setStats(data.data);
      }
    } catch (error) {
      console.error("Failed to fetch stats:", error);
    }
  };

  const handleLinkAction = async (
    linkId: string,
    action: string,
    reason?: string
  ) => {
    try {
      const response = await fetch(`/api/admin/links/${linkId}/${action}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: reason ? JSON.stringify({ reason }) : undefined,
      });

      if (response.ok) {
        toast.success(`Link ${action} completed successfully`);
        fetchLinks();
        fetchStats();
      } else {
        const result = await response.json();
        throw new Error(result.error);
      }
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : `Failed to ${action} link`
      );
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast.success("Copied to clipboard");
  };

  const getStatusBadge = (status: string, flags: AdminLink["flags"]) => {
    if (flags.violatesPolicy) {
      return <Badge variant="destructive">Policy Violation</Badge>;
    }
    if (flags.isReported) {
      return <Badge variant="destructive">Reported</Badge>;
    }
    if (flags.isSuspicious) {
      return <Badge variant="secondary">Suspicious</Badge>;
    }

    const variants = {
      active: "default",
      inactive: "secondary",
      banned: "destructive",
      expired: "outline",
    } as const;

    return (
      <Badge variant={variants[status as keyof typeof variants] || "secondary"}>
        {status.charAt(0).toUpperCase() + status.slice(1)}
      </Badge>
    );
  };

  const getPlanBadge = (plan: string) => {
    const colors = {
      free: "bg-gray-100 text-gray-800",
      premium: "bg-blue-100 text-blue-800",
      team: "bg-purple-100 text-purple-800",
      enterprise: "bg-orange-100 text-orange-800",
    } as const;

    return (
      <Badge className={colors[plan as keyof typeof colors] || colors.free}>
        {plan}
      </Badge>
    );
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Link Management</h1>
          <p className="text-muted-foreground">
            Monitor and manage all shortened links
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button variant="outline" onClick={fetchLinks}>
            <RefreshCw className="mr-2 h-4 w-4" />
            Refresh
          </Button>
          <Button variant="outline">
            <Download className="mr-2 h-4 w-4" />
            Export
          </Button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center gap-2">
              <LinkIcon className="h-5 w-5 text-blue-600" />
              <div>
                <p className="text-sm font-medium text-muted-foreground">
                  Total Links
                </p>
                <p className="text-2xl font-bold">
                  {formatNumber(stats.totalLinks)}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center gap-2">
              <CheckCircle className="h-5 w-5 text-green-600" />
              <div>
                <p className="text-sm font-medium text-muted-foreground">
                  Active Links
                </p>
                <p className="text-2xl font-bold">
                  {formatNumber(stats.activeLinks)}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-orange-600" />
              <div>
                <p className="text-sm font-medium text-muted-foreground">
                  Flagged Links
                </p>
                <p className="text-2xl font-bold">
                  {formatNumber(stats.flaggedLinks)}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center gap-2">
              <MousePointer className="h-5 w-5 text-purple-600" />
              <div>
                <p className="text-sm font-medium text-muted-foreground">
                  Total Clicks
                </p>
                <p className="text-2xl font-bold">
                  {formatNumber(stats.totalClicks)}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Filter className="h-5 w-5" />
            Filters
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-6">
            <div className="md:col-span-2">
              <div className="relative">
                <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search links..."
                  value={filters.search}
                  onChange={(e) =>
                    setFilters({ ...filters, search: e.target.value })
                  }
                  className="pl-9"
                />
              </div>
            </div>

            <Select
              value={filters.status}
              onValueChange={(value) =>
                setFilters({ ...filters, status: value })
              }
            >
              <SelectTrigger>
                <SelectValue placeholder="All statuses" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="">All statuses</SelectItem>
                <SelectItem value="active">Active</SelectItem>
                <SelectItem value="inactive">Inactive</SelectItem>
                <SelectItem value="banned">Banned</SelectItem>
                <SelectItem value="expired">Expired</SelectItem>
              </SelectContent>
            </Select>

            <Select
              value={filters.userPlan}
              onValueChange={(value) =>
                setFilters({ ...filters, userPlan: value })
              }
            >
              <SelectTrigger>
                <SelectValue placeholder="User plan" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="">All plans</SelectItem>
                <SelectItem value="free">Free</SelectItem>
                <SelectItem value="premium">Premium</SelectItem>
                <SelectItem value="team">Team</SelectItem>
                <SelectItem value="enterprise">Enterprise</SelectItem>
              </SelectContent>
            </Select>

            <Select
              value={filters.hasFlags}
              onValueChange={(value) =>
                setFilters({ ...filters, hasFlags: value })
              }
            >
              <SelectTrigger>
                <SelectValue placeholder="Flags" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="">All links</SelectItem>
                <SelectItem value="true">Flagged only</SelectItem>
                <SelectItem value="false">No flags</SelectItem>
              </SelectContent>
            </Select>

            <Select
              value={filters.dateRange}
              onValueChange={(value) =>
                setFilters({ ...filters, dateRange: value })
              }
            >
              <SelectTrigger>
                <SelectValue placeholder="Date range" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="">All time</SelectItem>
                <SelectItem value="today">Today</SelectItem>
                <SelectItem value="week">This week</SelectItem>
                <SelectItem value="month">This month</SelectItem>
                <SelectItem value="quarter">This quarter</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Links Table */}
      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Link</TableHead>
                <TableHead>User</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Clicks</TableHead>
                <TableHead>Created</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                Array.from({ length: 5 }).map((_, i) => (
                  <TableRow key={i}>
                    <TableCell colSpan={6}>
                      <div className="h-16 bg-muted animate-pulse rounded" />
                    </TableCell>
                  </TableRow>
                ))
              ) : links.length === 0 ? (
                <TableRow>
                  <TableCell
                    colSpan={6}
                    className="text-center py-8 text-muted-foreground"
                  >
                    No links found
                  </TableCell>
                </TableRow>
              ) : (
                links.map((link) => (
                  <TableRow key={link.id}>
                    <TableCell>
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <span className="font-medium">
                            {link.title || link.shortCode}
                          </span>
                          {link.isPasswordProtected && (
                            <Badge variant="outline" className="text-xs">
                              Protected
                            </Badge>
                          )}
                        </div>
                        <div className="text-sm text-muted-foreground">
                          {link.shortUrl}
                        </div>
                        <div className="text-xs text-muted-foreground truncate max-w-xs">
                          → {link.originalUrl}
                        </div>
                      </div>
                    </TableCell>

                    <TableCell>
                      <div className="space-y-1">
                        <div className="font-medium">{link.user.name}</div>
                        <div className="text-sm text-muted-foreground">
                          {link.user.email}
                        </div>
                        {getPlanBadge(link.user.plan)}
                      </div>
                    </TableCell>

                    <TableCell>
                      {getStatusBadge(link.status, link.flags)}
                    </TableCell>

                    <TableCell>
                      <div className="text-sm">
                        <div className="font-medium">
                          {formatNumber(link.clicks.total)} total
                        </div>
                        <div className="text-muted-foreground">
                          {formatNumber(link.clicks.unique)} unique
                        </div>
                        <div className="text-muted-foreground">
                          {formatNumber(link.clicks.today)} today
                        </div>
                      </div>
                    </TableCell>

                    <TableCell>
                      <div className="text-sm">
                        <div>{formatDate(link.createdAt, "yyyy-MM-dd")}</div>
                        {link.lastClickAt && (
                          <div className="text-muted-foreground">
                            Last:{" "}
                            {formatDistanceToNow(new Date(link.lastClickAt))}
                          </div>
                        )}
                      </div>
                    </TableCell>

                    <TableCell>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="sm">
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
                          <DropdownMenuItem asChild>
                            <a
                              href={link.originalUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                            >
                              <ExternalLink className="mr-2 h-4 w-4" />
                              Visit Original
                            </a>
                          </DropdownMenuItem>
                          <DropdownMenuItem>
                            <Eye className="mr-2 h-4 w-4" />
                            View Analytics
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          {link.status === "active" ? (
                            <DropdownMenuItem
                              onClick={() => handleLinkAction(link.id, "ban")}
                              className="text-red-600"
                            >
                              <Ban className="mr-2 h-4 w-4" />
                              Ban Link
                            </DropdownMenuItem>
                          ) : (
                            <DropdownMenuItem
                              onClick={() => handleLinkAction(link.id, "unban")}
                              className="text-green-600"
                            >
                              <CheckCircle className="mr-2 h-4 w-4" />
                              Unban Link
                            </DropdownMenuItem>
                          )}
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
                                <AlertDialogTitle>Delete Link</AlertDialogTitle>
                                <AlertDialogDescription>
                                  Are you sure you want to delete this link?
                                  This action cannot be undone.
                                </AlertDialogDescription>
                              </AlertDialogHeader>
                              <AlertDialogFooter>
                                <AlertDialogCancel>Cancel</AlertDialogCancel>
                                <AlertDialogAction
                                  onClick={() =>
                                    handleLinkAction(link.id, "delete")
                                  }
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
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Pagination */}
      <div className="flex items-center justify-between">
        <div className="text-sm text-muted-foreground">
          Showing {(pagination.page - 1) * pagination.limit + 1} to{" "}
          {Math.min(pagination.page * pagination.limit, pagination.total)} of{" "}
          {pagination.total} links
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            disabled={pagination.page === 1}
            onClick={() =>
              setPagination((prev) => ({ ...prev, page: prev.page - 1 }))
            }
          >
            Previous
          </Button>
          <Button
            variant="outline"
            size="sm"
            disabled={pagination.page === pagination.totalPages}
            onClick={() =>
              setPagination((prev) => ({ ...prev, page: prev.page + 1 }))
            }
          >
            Next
          </Button>
        </div>
      </div>
    </div>
  );
}
