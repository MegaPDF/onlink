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
import { toast } from "sonner";

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
    activeDomains: number;
    verifiedDomains: number;
    customDomains: number;
  };
}

// Define special "all" values to replace empty strings
const ALL_TYPES = "all_types";
const ALL_STATUSES = "all_statuses";
const ALL_VERIFICATION = "all_verification";

export default function AdminDomainsPage() {
  const [data, setData] = useState<DomainsPageData | null>(null);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [filters, setFilters] = useState({
    type: ALL_TYPES,
    status: ALL_STATUSES,
    verification: ALL_VERIFICATION,
    sortBy: "createdAt",
    sortOrder: "desc",
  });
  const [currentPage, setCurrentPage] = useState(1);

  const fetchDomains = useCallback(
    async (page = 1) => {
      try {
        setLoading(true);
        const params = new URLSearchParams({
          page: page.toString(),
          limit: "20",
          search: searchTerm,
          // Convert special "all" values back to empty strings for API
          type: filters.type === ALL_TYPES ? "" : filters.type,
          status: filters.status === ALL_STATUSES ? "" : filters.status,
          verification:
            filters.verification === ALL_VERIFICATION
              ? ""
              : filters.verification,
          sortBy: filters.sortBy,
          sortOrder: filters.sortOrder,
        });

        const response = await fetch(`/api/admin/domains?${params.toString()}`);
        if (!response.ok) {
          throw new Error("Failed to fetch domains");
        }

        const result = await response.json();
        setData(result.data);
        setCurrentPage(page);
      } catch (error) {
        console.error("Error fetching domains:", error);
        toast("Failed to fetch domains. Please try again.");
      } finally {
        setLoading(false);
      }
    },
    [searchTerm, filters]
  );

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    fetchDomains(1);
  };

  useEffect(() => {
    fetchDomains();
  }, []);

  useEffect(() => {
    const delayedSearch = setTimeout(() => {
      if (searchTerm !== undefined) {
        fetchDomains(1);
      }
    }, 500);

    return () => clearTimeout(delayedSearch);
  }, [searchTerm, filters]);

  const getTypeBadge = (type: string) => {
    switch (type) {
      case "system":
        return <Badge variant="default">System</Badge>;
      case "custom":
        return <Badge variant="secondary">Custom</Badge>;
      case "subdomain":
        return <Badge variant="outline">Subdomain</Badge>;
      default:
        return <Badge variant="outline">{type}</Badge>;
    }
  };

  const getStatusBadge = (isActive: boolean, isVerified: boolean) => {
    if (!isVerified) {
      return <Badge variant="destructive">Unverified</Badge>;
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
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Domains</h1>
          <p className="text-muted-foreground">
            Manage domains and SSL certificates
          </p>
        </div>
        <Button>
          <Plus className="h-4 w-4 mr-2" />
          Add Domain
        </Button>
      </div>

      {/* Stats Cards */}
      {data?.stats && (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                Total Domains
              </CardTitle>
              <Globe className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {formatNumber(data.stats.totalDomains)}
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                Active Domains
              </CardTitle>
              <CheckCircle className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {formatNumber(data.stats.activeDomains)}
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Verified</CardTitle>
              <Shield className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {formatNumber(data.stats.verifiedDomains)}
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Custom</CardTitle>
              <Settings className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {formatNumber(data.stats.customDomains)}
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
                placeholder="Search domains..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
            <Select
              value={filters.type}
              onValueChange={(value) =>
                setFilters((prev) => ({ ...prev, type: value }))
              }
            >
              <SelectTrigger className="w-40">
                <SelectValue placeholder="Type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={ALL_TYPES}>All Types</SelectItem>
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
              <SelectTrigger className="w-40">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={ALL_STATUSES}>All Status</SelectItem>
                <SelectItem value="active">Active</SelectItem>
                <SelectItem value="inactive">Inactive</SelectItem>
              </SelectContent>
            </Select>
            <Select
              value={filters.verification}
              onValueChange={(value) =>
                setFilters((prev) => ({ ...prev, verification: value }))
              }
            >
              <SelectTrigger className="w-40">
                <SelectValue placeholder="Verification" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={ALL_VERIFICATION}>All</SelectItem>
                <SelectItem value="verified">Verified</SelectItem>
                <SelectItem value="unverified">Unverified</SelectItem>
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
                    <TableHead>Links</TableHead>
                    <TableHead>Created</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {data?.domains.map((domain) => (
                    <TableRow key={domain._id}>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Globe className="h-4 w-4 text-muted-foreground" />
                          <div>
                            <div className="font-medium">{domain.domain}</div>
                            {domain.ssl.validTo && (
                              <div className="text-xs text-muted-foreground">
                                SSL expires{" "}
                                {formatRelativeTime(domain.ssl.validTo)}
                              </div>
                            )}
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>{getTypeBadge(domain.type)}</TableCell>
                      <TableCell>
                        {getStatusBadge(domain.isActive, domain.isVerified)}
                      </TableCell>
                      <TableCell>
                        {domain.userId ? (
                          <div>
                            <div className="font-medium">
                              {domain.userId.name}
                            </div>
                            <div className="text-sm text-muted-foreground">
                              {domain.userId.email}
                            </div>
                          </div>
                        ) : (
                          <Badge variant="outline">System</Badge>
                        )}
                      </TableCell>
                      <TableCell>
                        <div className="text-sm">
                          {formatNumber(domain.usage.linksCount)}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="text-sm">
                          {formatRelativeTime(domain.createdAt)}
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
                              <Settings className="mr-2 h-4 w-4" />
                              Configure
                            </DropdownMenuItem>
                            <DropdownMenuItem>
                              <Shield className="mr-2 h-4 w-4" />
                              SSL Settings
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem className="text-red-600">
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
              {data?.pagination && data.pagination.totalPages > 1 && (
                <div className="flex items-center justify-between space-x-2 py-4">
                  <div className="text-sm text-muted-foreground">
                    Showing {(currentPage - 1) * 20 + 1} to{" "}
                    {Math.min(currentPage * 20, data.pagination.total)} of{" "}
                    {data.pagination.total} domains
                  </div>
                  <div className="flex items-center space-x-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => fetchDomains(currentPage - 1)}
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
                      onClick={() => fetchDomains(currentPage + 1)}
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
