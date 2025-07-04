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
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Globe,
  Search,
  MoreHorizontal,
  Plus,
  CheckCircle,
  XCircle,
  AlertCircle,
  Shield,
  Settings,
  Trash2,
} from "lucide-react";
import { formatRelativeTime, formatNumber } from "@/lib/utils";

interface DomainData {
  _id: string;
  domain: string;
  type: "system" | "custom" | "subdomain";
  isVerified: boolean;
  isActive: boolean;
  userId?: { _id: string; name: string; email: string };
  teamId?: { _id: string; name: string; slug: string };
  verification: {
    method: "dns" | "file" | "meta";
    dnsRecords: {
      type: "A" | "CNAME" | "TXT";
      name: string;
      value: string;
      verified: boolean;
    }[];
  };
  ssl: {
    provider: "letsencrypt" | "cloudflare" | "custom";
    validFrom?: Date;
    validTo?: Date;
    autoRenew: boolean;
  };
  usage: {
    linksCount: number;
    clicksCount: number;
    lastUpdated: Date;
  };
  createdAt: Date;
  lastUsedAt?: Date;
}

interface DomainsPageData {
  domains: DomainData[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
    hasNextPage: boolean;
    hasPrevPage: boolean;
  };
  stats: {
    totalDomains: number;
    verifiedDomains: number;
    activeDomains: number;
    customDomains: number;
    systemDomains: number;
  };
}

export default function AdminDomainsPage() {
  const [data, setData] = useState<DomainsPageData | null>(null);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [filters, setFilters] = useState({
    type: "",
    status: "",
    sortBy: "createdAt",
    sortOrder: "desc",
  });
  const [currentPage, setCurrentPage] = useState(1);
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [newDomain, setNewDomain] = useState({ domain: "", type: "custom" });
  const toast = useToast();

  const fetchDomains = useCallback(
    async (page = 1) => {
      try {
        setLoading(true);
        const params = new URLSearchParams({
          page: page.toString(),
          limit: "20",
          search: searchTerm,
          ...filters,
        });

        const response = await fetch(`/api/admin/domains?${params}`);
        const result = await response.json();

        if (!response.ok) {
          throw new Error(result.error || "Failed to fetch domains");
        }

        setData(result.data);
        setCurrentPage(page);
      } catch (error) {
        console.error("Error fetching domains:", error);
        toast.error("Failed to load domains");
      } finally {
        setLoading(false);
      }
    },
    [searchTerm, filters, toast]
  );

  useEffect(() => {
    fetchDomains(1);
  }, [fetchDomains]);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    fetchDomains(1);
  };

  const handleCreateDomain = async () => {
    try {
      const response = await fetch("/api/admin/domains", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(newDomain),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || "Failed to create domain");
      }

      toast.success("Domain created successfully");
      setCreateDialogOpen(false);
      setNewDomain({ domain: "", type: "custom" });
      fetchDomains(currentPage);
    } catch (error) {
      console.error("Error creating domain:", error);
      toast.error("Failed to create domain");
    }
  };

  const handleDeleteDomain = async (domainId: string) => {
    try {
      const response = await fetch(`/api/admin/domains?domainId=${domainId}`, {
        method: "DELETE",
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || "Failed to delete domain");
      }

      toast.success("Domain deleted successfully");
      fetchDomains(currentPage);
    } catch (error) {
      console.error("Error deleting domain:", error);
      toast.error("Failed to delete domain");
    }
  };

  const getStatusIcon = (domain: DomainData) => {
    if (domain.isVerified && domain.isActive) {
      return <CheckCircle className="h-4 w-4 text-green-500" />;
    } else if (domain.isVerified && !domain.isActive) {
      return <AlertCircle className="h-4 w-4 text-yellow-500" />;
    } else {
      return <XCircle className="h-4 w-4 text-red-500" />;
    }
  };

  const getStatusText = (domain: DomainData) => {
    if (domain.isVerified && domain.isActive) return "Active";
    if (domain.isVerified && !domain.isActive) return "Inactive";
    return "Unverified";
  };

  const getTypeBadgeVariant = (type: string) => {
    switch (type) {
      case "system":
        return "default";
      case "custom":
        return "secondary";
      case "subdomain":
        return "outline";
      default:
        return "outline";
    }
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
          <h1 className="text-3xl font-bold">Domain Management</h1>
          <p className="text-muted-foreground">Manage all platform domains</p>
        </div>
        <div className="flex gap-2">
          <Button onClick={() => fetchDomains(currentPage)} variant="outline">
            <Globe className="h-4 w-4 mr-2" />
            Refresh
          </Button>
          <Dialog open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="h-4 w-4 mr-2" />
                Add Domain
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Add New Domain</DialogTitle>
                <DialogDescription>
                  Add a new domain to the platform
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4">
                <div>
                  <label className="text-sm font-medium">Domain</label>
                  <Input
                    placeholder="example.com"
                    value={newDomain.domain}
                    onChange={(e) =>
                      setNewDomain((prev) => ({
                        ...prev,
                        domain: e.target.value,
                      }))
                    }
                  />
                </div>
                <div>
                  <label className="text-sm font-medium">Type</label>
                  <Select
                    value={newDomain.type}
                    onValueChange={(value) =>
                      setNewDomain((prev) => ({ ...prev, type: value }))
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="system">System</SelectItem>
                      <SelectItem value="custom">Custom</SelectItem>
                      <SelectItem value="subdomain">Subdomain</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <DialogFooter>
                <Button
                  variant="outline"
                  onClick={() => setCreateDialogOpen(false)}
                >
                  Cancel
                </Button>
                <Button onClick={handleCreateDomain}>Create Domain</Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-5 mb-8">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {formatNumber(data?.stats.totalDomains || 0)}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Verified</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {formatNumber(data?.stats.verifiedDomains || 0)}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {formatNumber(data?.stats.activeDomains || 0)}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Custom</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {formatNumber(data?.stats.customDomains || 0)}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">System</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {formatNumber(data?.stats.systemDomains || 0)}
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
                placeholder="Search domains..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full"
              />
            </div>
            <Select
              value={filters.type}
              onValueChange={(value) =>
                setFilters((prev) => ({ ...prev, type: value }))
              }
            >
              <SelectTrigger className="w-32">
                <SelectValue placeholder="Type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="">All Types</SelectItem>
                <SelectItem value="system">System</SelectItem>
                <SelectItem value="custom">Custom</SelectItem>
                <SelectItem value="subdomain">Subdomain</SelectItem>
              </SelectContent>
            </Select>
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
                <SelectItem value="verified">Verified</SelectItem>
                <SelectItem value="unverified">Unverified</SelectItem>
                <SelectItem value="active">Active</SelectItem>
                <SelectItem value="inactive">Inactive</SelectItem>
              </SelectContent>
            </Select>
            <Button type="submit">
              <Search className="h-4 w-4" />
            </Button>
          </form>
        </CardContent>
      </Card>

      {/* Domains Table */}
      <Card>
        <CardHeader>
          <CardTitle>Domains ({data?.pagination.total || 0})</CardTitle>
        </CardHeader>
        <CardContent>
          {data?.domains.length === 0 ? (
            <EmptyState
              icon={Globe}
              title="No domains found"
              description="No domains match your current filters."
            />
          ) : (
            <>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Domain</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Owner</TableHead>
                    <TableHead>Usage</TableHead>
                    <TableHead>Created</TableHead>
                    <TableHead className="w-12"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {data?.domains.map((domain) => (
                    <TableRow key={domain._id}>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          {getStatusIcon(domain)}
                          <div>
                            <p className="font-medium">{domain.domain}</p>
                            <p className="text-sm text-muted-foreground">
                              SSL: {domain.ssl.provider}
                            </p>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge
                          variant={getTypeBadgeVariant(domain.type)}
                          className="capitalize"
                        >
                          {domain.type}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Badge
                          variant={
                            domain.isVerified && domain.isActive
                              ? "default"
                              : "secondary"
                          }
                        >
                          {getStatusText(domain)}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        {domain.userId ? (
                          <div>
                            <p className="font-medium">{domain.userId.name}</p>
                            <p className="text-sm text-muted-foreground">
                              {domain.userId.email}
                            </p>
                          </div>
                        ) : domain.teamId ? (
                          <div>
                            <p className="font-medium">{domain.teamId.name}</p>
                            <p className="text-sm text-muted-foreground">
                              Team
                            </p>
                          </div>
                        ) : (
                          <span className="text-muted-foreground">System</span>
                        )}
                      </TableCell>
                      <TableCell>
                        <div className="text-sm">
                          <p>{formatNumber(domain.usage.linksCount)} links</p>
                          <p className="text-muted-foreground">
                            {formatNumber(domain.usage.clicksCount)} clicks
                          </p>
                        </div>
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {formatRelativeTime(domain.createdAt)}
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
                            <DropdownMenuItem>
                              <Settings className="mr-2 h-4 w-4" />
                              Configure
                            </DropdownMenuItem>
                            <DropdownMenuItem>
                              <Shield className="mr-2 h-4 w-4" />
                              SSL Settings
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem
                              className="text-red-600"
                              onClick={() => handleDeleteDomain(domain._id)}
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
                    of {data.pagination.total} domains
                  </p>
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => fetchDomains(currentPage - 1)}
                      disabled={!data.pagination.hasPrevPage || loading}
                    >
                      Previous
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => fetchDomains(currentPage + 1)}
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
