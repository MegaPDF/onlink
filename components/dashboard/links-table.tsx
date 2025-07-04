// ============= components/dashboard/links-table.tsx =============
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
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
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
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [selectedFolder, setSelectedFolder] = useState(folderId || "");

  const fetchLinks = async () => {
    try {
      const params = new URLSearchParams({
        page: page.toString(),
        limit: "10",
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
      } else {
        toast.error("Failed to fetch links");
      }
    } catch (error) {
      toast.error("Error loading links");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLinks();
  }, [page, search, statusFilter, tagFilter, selectedFolder]);

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast.copySuccess();
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
    if (!confirm("Are you sure you want to delete this link?")) return;

    try {
      const response = await fetch(`/api/client/my-links?urlId=${linkId}`, {
        method: "DELETE",
      });

      if (response.ok) {
        toast.deleteSuccess("Link deleted");
        fetchLinks();
      } else {
        toast.error("Failed to delete link");
      }
    } catch (error) {
      toast.error("Error deleting link");
    }
  };

  const getStatusBadge = (link: Link) => {
    if (!link.isActive) {
      return <Badge variant="secondary">Inactive</Badge>;
    }
    if (link.expiresAt && new Date(link.expiresAt) < new Date()) {
      return <Badge variant="destructive">Expired</Badge>;
    }
    return (
      <Badge variant="default" className="bg-green-500">
        Active
      </Badge>
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
        <CardTitle>My Links</CardTitle>
        <CardDescription>
          Manage and monitor your shortened URLs
        </CardDescription>
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
        </div>

        {/* Links Table */}
        {links.length === 0 ? (
          <EmptyState
            icon={ExternalLink}
            title="No links found"
            description="Create your first shortened link to get started"
            action={{
              label: "Create Link",
              onClick: () => (window.location.href = "/dashboard"),
            }}
          />
        ) : (
          <div className="space-y-4">
            <div className="rounded-lg border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>URL</TableHead>
                    <TableHead>Clicks</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Created</TableHead>
                    <TableHead className="w-12"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {links.map((link) => (
                    <TableRow key={link.id}>
                      <TableCell>
                        <div className="space-y-1">
                          <div className="flex items-center gap-2">
                            <div className="font-medium text-sm">
                              {link.title || "Untitled"}
                            </div>
                            {link.folder && (
                              <Badge
                                variant="outline"
                                className="text-xs"
                                style={{ color: link.folder.color }}
                              >
                                {link.folder.name}
                              </Badge>
                            )}
                          </div>
                          <div className="flex items-center gap-2 text-xs text-muted-foreground">
                            <span className="font-mono">{link.shortUrl}</span>
                            <Button
                              size="sm"
                              variant="ghost"
                              className="h-4 w-4 p-0"
                              onClick={() => copyToClipboard(link.shortUrl)}
                            >
                              <Copy className="h-3 w-3" />
                            </Button>
                          </div>
                          <div className="text-xs text-muted-foreground truncate max-w-md">
                            {link.originalUrl}
                          </div>
                          {link.tags.length > 0 && (
                            <div className="flex gap-1 flex-wrap">
                              {link.tags.map((tag) => (
                                <Badge
                                  key={tag}
                                  variant="outline"
                                  className="text-xs"
                                >
                                  #{tag}
                                </Badge>
                              ))}
                            </div>
                          )}
                        </div>
                      </TableCell>

                      <TableCell>
                        <div className="space-y-1">
                          <div className="flex items-center gap-2">
                            <MousePointer className="h-3 w-3 text-muted-foreground" />
                            <span className="font-medium">
                              {formatNumber(link.clicks.total)}
                            </span>
                          </div>
                          <div className="text-xs text-muted-foreground">
                            {formatNumber(link.clicks.unique)} unique
                          </div>
                          {link.lastClickAt && (
                            <div className="text-xs text-muted-foreground">
                              Last:{" "}
                              {formatDistanceToNow(new Date(link.lastClickAt), {
                                addSuffix: true,
                              })}
                            </div>
                          )}
                        </div>
                      </TableCell>

                      <TableCell>
                        {getStatusBadge(link)}
                        {link.expiresAt && (
                          <div className="text-xs text-muted-foreground mt-1">
                            <Calendar className="h-3 w-3 inline mr-1" />
                            Expires{" "}
                            {formatDistanceToNow(new Date(link.expiresAt), {
                              addSuffix: true,
                            })}
                          </div>
                        )}
                      </TableCell>

                      <TableCell>
                        <div className="text-sm">
                          {formatDistanceToNow(new Date(link.createdAt), {
                            addSuffix: true,
                          })}
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
                              onClick={() =>
                                window.open(link.shortUrl, "_blank")
                              }
                            >
                              <ExternalLink className="mr-2 h-4 w-4" />
                              Visit
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              onClick={() => copyToClipboard(link.shortUrl)}
                            >
                              <Copy className="mr-2 h-4 w-4" />
                              Copy
                            </DropdownMenuItem>
                            <DropdownMenuItem>
                              <QrCode className="mr-2 h-4 w-4" />
                              QR Code
                            </DropdownMenuItem>
                            <DropdownMenuItem>
                              <BarChart3 className="mr-2 h-4 w-4" />
                              Analytics
                            </DropdownMenuItem>
                            <DropdownMenuItem>
                              <Edit className="mr-2 h-4 w-4" />
                              Edit
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              onClick={() =>
                                toggleLinkStatus(link.id, link.isActive)
                              }
                            >
                              <Eye className="mr-2 h-4 w-4" />
                              {link.isActive ? "Deactivate" : "Activate"}
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              onClick={() => deleteLink(link.id)}
                              className="text-red-600"
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
            {totalPages > 1 && (
              <div className="flex items-center justify-between">
                <Button
                  variant="outline"
                  disabled={page === 1}
                  onClick={() => setPage(page - 1)}
                >
                  Previous
                </Button>
                <span className="text-sm text-muted-foreground">
                  Page {page} of {totalPages}
                </span>
                <Button
                  variant="outline"
                  disabled={page === totalPages}
                  onClick={() => setPage(page + 1)}
                >
                  Next
                </Button>
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
