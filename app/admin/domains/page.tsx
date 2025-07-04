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
import { Label } from "@/components/ui/label";
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
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
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
  Filter,
  Download,
  Upload,
  Clock,
  TrendingUp,
  Loader2,
  AlertTriangle,
  Activity,
  Key,
  Lock,
  Unlock,
  Copy,
  ExternalLink,
  RefreshCw,
  Eye,
  EyeOff,
  Server,
  Zap,
} from "lucide-react";

// Types for real API data
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
    status: "valid" | "invalid" | "expired" | "pending";
  };
  usage: {
    linksCount: number;
    clicksCount: number;
    lastUpdated: Date;
  };
  createdAt: Date;
  updatedAt: Date;
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
    inactiveDomains: number;
    verifiedDomains: number;
    customDomains: number;
    systemDomains: number;
    sslExpiringSoon: number;
    totalLinks: number;
  };
}

interface NewDomainData {
  domain: string;
  type: "custom" | "subdomain";
  verificationMethod: "dns" | "file" | "meta";
  sslProvider: "letsencrypt" | "cloudflare" | "custom";
  autoRenew: boolean;
}

const ALL_TYPES = "all_types";
const ALL_STATUSES = "all_statuses";
const ALL_VERIFICATION = "all_verification";

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
  if (diffInDays < 30) return `${Math.floor(diffInDays)}d ago`;
  return dateObj.toLocaleDateString();
};

const formatNumber = (num: number) => {
  return new Intl.NumberFormat().format(num);
};

export default function AdminDomainsPage() {
  const [data, setData] = useState<DomainsPageData | null>(null);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedDomains, setSelectedDomains] = useState<string[]>([]);
  const [filters, setFilters] = useState({
    type: ALL_TYPES,
    status: ALL_STATUSES,
    verification: ALL_VERIFICATION,
    sortBy: "createdAt",
    sortOrder: "desc",
  });
  const [currentPage, setCurrentPage] = useState(1);
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [addingDomain, setAddingDomain] = useState(false);
  const [newDomain, setNewDomain] = useState<NewDomainData>({
    domain: "",
    type: "custom",
    verificationMethod: "dns",
    sslProvider: "letsencrypt",
    autoRenew: true,
  });

  // Toast notifications (replace with your actual toast implementation)
  const toast = {
    success: (message: string) => console.log("Success:", message),
    error: (message: string) => console.log("Error:", message),
  };

  // Fetch domains from API
  const fetchDomains = useCallback(
    async (page = 1) => {
      try {
        setLoading(true);
        const params = new URLSearchParams({
          page: page.toString(),
          limit: "20",
          search: searchTerm,
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
        const result = await response.json();

        if (!response.ok) {
          throw new Error(result.error || "Failed to fetch domains");
        }

        setData(result.data);
        setCurrentPage(page);
      } catch (error) {
        console.error("Error fetching domains:", error);
        toast.error("Failed to load domains. Please try again.");
      } finally {
        setLoading(false);
      }
    },
    [searchTerm, filters]
  );

  // Load domains on component mount and when filters change
  useEffect(() => {
    fetchDomains(1);
  }, [fetchDomains]);

  // Search handler
  const handleSearch = () => {
    fetchDomains(1);
  };

  // Add new domain
  const handleAddDomain = async () => {
    if (!newDomain.domain.trim()) {
      toast.error("Domain name is required");
      return;
    }

    try {
      setAddingDomain(true);

      const response = await fetch("/api/admin/domains", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(newDomain),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || "Failed to add domain");
      }

      toast.success("Domain added successfully!");
      setShowAddDialog(false);
      setNewDomain({
        domain: "",
        type: "custom",
        verificationMethod: "dns",
        sslProvider: "letsencrypt",
        autoRenew: true,
      });
      fetchDomains(currentPage);
    } catch (error) {
      console.error("Error adding domain:", error);
      toast.error(
        error instanceof Error ? error.message : "Failed to add domain"
      );
    } finally {
      setAddingDomain(false);
    }
  };

  // Delete domain
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

  // Toggle domain status
  const handleToggleDomainStatus = async (
    domainId: string,
    isActive: boolean
  ) => {
    try {
      const response = await fetch(`/api/admin/domains?domainId=${domainId}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ isActive }),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || "Failed to update domain status");
      }

      toast.success(
        `Domain ${isActive ? "activated" : "deactivated"} successfully`
      );
      fetchDomains(currentPage);
    } catch (error) {
      console.error("Error updating domain status:", error);
      toast.error("Failed to update domain status");
    }
  };

  // Verify domain
  const handleVerifyDomain = async (domainId: string) => {
    try {
      const response = await fetch(
        `/api/admin/domains/verify?domainId=${domainId}`,
        {
          method: "POST",
        }
      );

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || "Failed to verify domain");
      }

      toast.success("Domain verification initiated");
      fetchDomains(currentPage);
    } catch (error) {
      console.error("Error verifying domain:", error);
      toast.error("Failed to verify domain");
    }
  };

  // Bulk actions
  const handleBulkAction = async (action: string, domainIds: string[]) => {
    try {
      const response = await fetch("/api/admin/domains/bulk", {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ action, domainIds }),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || "Failed to perform bulk action");
      }

      toast.success(`Bulk action completed successfully`);
      setSelectedDomains([]);
      fetchDomains(currentPage);
    } catch (error) {
      console.error("Error performing bulk action:", error);
      toast.error("Failed to perform bulk action");
    }
  };

  // Export domains
  const handleExportDomains = async () => {
    try {
      const response = await fetch("/api/admin/domains/export", {
        method: "GET",
        headers: {
          Accept: "text/csv",
        },
      });

      if (!response.ok) {
        throw new Error("Failed to export domains");
      }

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `domains-export-${
        new Date().toISOString().split("T")[0]
      }.csv`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);

      toast.success("Domains exported successfully");
    } catch (error) {
      console.error("Error exporting domains:", error);
      toast.error("Failed to export domains");
    }
  };

  // Utility functions
  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast.success("Copied to clipboard");
  };

  const getTypeBadge = (type: string) => {
    switch (type) {
      case "system":
        return (
          <Badge className="bg-blue-100 text-blue-800 border-blue-200 dark:bg-blue-900/20 dark:text-blue-400 dark:border-blue-800">
            <Server className="w-3 h-3 mr-1" />
            System
          </Badge>
        );
      case "custom":
        return (
          <Badge className="bg-purple-100 text-purple-800 border-purple-200 dark:bg-purple-900/20 dark:text-purple-400 dark:border-purple-800">
            <Globe className="w-3 h-3 mr-1" />
            Custom
          </Badge>
        );
      case "subdomain":
        return (
          <Badge className="bg-green-100 text-green-800 border-green-200 dark:bg-green-900/20 dark:text-green-400 dark:border-green-800">
            <Zap className="w-3 h-3 mr-1" />
            Subdomain
          </Badge>
        );
      default:
        return <Badge variant="outline">{type}</Badge>;
    }
  };

  const getStatusBadge = (isActive: boolean, isVerified: boolean) => {
    if (!isVerified) {
      return (
        <Badge className="bg-red-100 text-red-800 border-red-200 dark:bg-red-900/20 dark:text-red-400 dark:border-red-800">
          <XCircle className="w-3 h-3 mr-1" />
          Unverified
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
        <XCircle className="w-3 h-3 mr-1" />
        Inactive
      </Badge>
    );
  };

  const getSSLBadge = (ssl: DomainData["ssl"]) => {
    if (!ssl.validTo) {
      return (
        <Badge variant="outline" className="text-gray-600">
          <AlertCircle className="w-3 h-3 mr-1" />
          No SSL
        </Badge>
      );
    }

    const now = new Date();
    const expiryDate = new Date(ssl.validTo);
    const daysUntilExpiry = Math.ceil(
      (expiryDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)
    );

    if (daysUntilExpiry < 0) {
      return (
        <Badge className="bg-red-100 text-red-800 border-red-200 dark:bg-red-900/20 dark:text-red-400 dark:border-red-800">
          <XCircle className="w-3 h-3 mr-1" />
          Expired
        </Badge>
      );
    } else if (daysUntilExpiry <= 30) {
      return (
        <Badge className="bg-yellow-100 text-yellow-800 border-yellow-200 dark:bg-yellow-900/20 dark:text-yellow-400 dark:border-yellow-800">
          <AlertTriangle className="w-3 h-3 mr-1" />
          Expires in {daysUntilExpiry}d
        </Badge>
      );
    } else {
      return (
        <Badge className="bg-green-100 text-green-800 border-green-200 dark:bg-green-900/20 dark:text-green-400 dark:border-green-800">
          <Lock className="w-3 h-3 mr-1" />
          Valid
        </Badge>
      );
    }
  };

  const toggleDomainSelection = (domainId: string) => {
    setSelectedDomains((prev) =>
      prev.includes(domainId)
        ? prev.filter((id) => id !== domainId)
        : [...prev, domainId]
    );
  };

  const toggleSelectAll = () => {
    if (!data) return;
    if (selectedDomains.length === data.domains.length) {
      setSelectedDomains([]);
    } else {
      setSelectedDomains(data.domains.map((domain) => domain._id));
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
          <h3 className="text-lg font-semibold mb-2">Failed to load domains</h3>
          <p className="text-muted-foreground mb-4">
            There was an error loading the domains data.
          </p>
          <Button onClick={() => fetchDomains(1)}>
            <RefreshCw className="h-4 w-4 mr-2" />
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
            <h1 className="text-3xl font-bold tracking-tight">Domains</h1>
            <p className="text-muted-foreground">
              Manage domains and SSL certificates
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleExportDomains}
                >
                  <Download className="h-4 w-4 mr-2" />
                  Export
                </Button>
              </TooltipTrigger>
              <TooltipContent>Export domains data to CSV</TooltipContent>
            </Tooltip>

            <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
              <DialogTrigger asChild>
                <Button>
                  <Plus className="h-4 w-4 mr-2" />
                  Add Domain
                </Button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-md">
                <DialogHeader>
                  <DialogTitle>Add New Domain</DialogTitle>
                  <DialogDescription>
                    Add a custom domain or subdomain to your system.
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="domain">Domain Name *</Label>
                    <Input
                      id="domain"
                      value={newDomain.domain}
                      onChange={(e) =>
                        setNewDomain((prev) => ({
                          ...prev,
                          domain: e.target.value,
                        }))
                      }
                      placeholder="example.com"
                      required
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="type">Type</Label>
                      <Select
                        value={newDomain.type}
                        onValueChange={(value: "custom" | "subdomain") =>
                          setNewDomain((prev) => ({ ...prev, type: value }))
                        }
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="custom">Custom Domain</SelectItem>
                          <SelectItem value="subdomain">Subdomain</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="verification">Verification</Label>
                      <Select
                        value={newDomain.verificationMethod}
                        onValueChange={(value: "dns" | "file" | "meta") =>
                          setNewDomain((prev) => ({
                            ...prev,
                            verificationMethod: value,
                          }))
                        }
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="dns">DNS Record</SelectItem>
                          <SelectItem value="file">File Upload</SelectItem>
                          <SelectItem value="meta">Meta Tag</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="sslProvider">SSL Provider</Label>
                    <Select
                      value={newDomain.sslProvider}
                      onValueChange={(
                        value: "letsencrypt" | "cloudflare" | "custom"
                      ) =>
                        setNewDomain((prev) => ({
                          ...prev,
                          sslProvider: value,
                        }))
                      }
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="letsencrypt">
                          Let's Encrypt
                        </SelectItem>
                        <SelectItem value="cloudflare">Cloudflare</SelectItem>
                        <SelectItem value="custom">
                          Custom Certificate
                        </SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id="autoRenew"
                      checked={newDomain.autoRenew}
                      onCheckedChange={(checked) =>
                        setNewDomain((prev) => ({
                          ...prev,
                          autoRenew: !!checked,
                        }))
                      }
                    />
                    <Label htmlFor="autoRenew">
                      Auto-renew SSL certificate
                    </Label>
                  </div>
                </div>
                <DialogFooter>
                  <Button
                    variant="outline"
                    onClick={() => setShowAddDialog(false)}
                    disabled={addingDomain}
                  >
                    Cancel
                  </Button>
                  <Button
                    onClick={handleAddDomain}
                    disabled={addingDomain || !newDomain.domain.trim()}
                  >
                    {addingDomain && (
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    )}
                    Add Domain
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </div>
        </div>

        {/* Stats Cards */}
        {data?.stats && (
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4">
            <Card className="relative overflow-hidden">
              <div className="absolute inset-0 bg-gradient-to-br from-blue-50 to-blue-100 dark:from-blue-950/20 dark:to-blue-900/20"></div>
              <CardHeader className="relative flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">
                  Total Domains
                </CardTitle>
                <Globe className="h-4 w-4 text-blue-600" />
              </CardHeader>
              <CardContent className="relative">
                <div className="text-2xl font-bold text-blue-600">
                  {formatNumber(data.stats.totalDomains)}
                </div>
                <div className="flex items-center text-xs text-muted-foreground mt-1">
                  <TrendingUp className="h-3 w-3 mr-1" />
                  <span className="text-green-600">+2</span>
                  <span className="ml-1">this week</span>
                </div>
              </CardContent>
            </Card>

            <Card className="relative overflow-hidden">
              <div className="absolute inset-0 bg-gradient-to-br from-green-50 to-green-100 dark:from-green-950/20 dark:to-green-900/20"></div>
              <CardHeader className="relative flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">
                  Active Domains
                </CardTitle>
                <CheckCircle className="h-4 w-4 text-green-600" />
              </CardHeader>
              <CardContent className="relative">
                <div className="text-2xl font-bold text-green-600">
                  {formatNumber(data.stats.activeDomains)}
                </div>
                <p className="text-xs text-muted-foreground">
                  {data.stats.inactiveDomains} inactive
                </p>
              </CardContent>
            </Card>

            <Card className="relative overflow-hidden">
              <div className="absolute inset-0 bg-gradient-to-br from-purple-50 to-purple-100 dark:from-purple-950/20 dark:to-purple-900/20"></div>
              <CardHeader className="relative flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Verified</CardTitle>
                <Shield className="h-4 w-4 text-purple-600" />
              </CardHeader>
              <CardContent className="relative">
                <div className="text-2xl font-bold text-purple-600">
                  {formatNumber(data.stats.verifiedDomains)}
                </div>
                <div className="flex items-center text-xs text-muted-foreground mt-1">
                  <AlertTriangle className="h-3 w-3 mr-1" />
                  <span className="text-orange-600">
                    {data.stats.sslExpiringSoon}
                  </span>
                  <span className="ml-1">SSL expiring</span>
                </div>
              </CardContent>
            </Card>

            <Card className="relative overflow-hidden">
              <div className="absolute inset-0 bg-gradient-to-br from-orange-50 to-orange-100 dark:from-orange-950/20 dark:to-orange-900/20"></div>
              <CardHeader className="relative flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">
                  Custom Domains
                </CardTitle>
                <Settings className="h-4 w-4 text-orange-600" />
              </CardHeader>
              <CardContent className="relative">
                <div className="text-2xl font-bold text-orange-600">
                  {formatNumber(data.stats.customDomains)}
                </div>
                <p className="text-xs text-muted-foreground">
                  {formatNumber(data.stats.totalLinks)} total links
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
                    placeholder="Search domains..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10"
                  />
                </div>
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
                <SelectTrigger className="w-32">
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
                <SelectTrigger className="w-32">
                  <SelectValue placeholder="Verification" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={ALL_VERIFICATION}>All</SelectItem>
                  <SelectItem value="verified">Verified</SelectItem>
                  <SelectItem value="unverified">Unverified</SelectItem>
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
        {selectedDomains.length > 0 && (
          <Card className="bg-blue-50 dark:bg-blue-950/20 border-blue-200 dark:border-blue-800">
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <CheckCircle className="h-5 w-5 text-blue-600" />
                  <span className="font-medium text-blue-800 dark:text-blue-200">
                    {selectedDomains.length} domain
                    {selectedDomains.length > 1 ? "s" : ""} selected
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleBulkAction("verify", selectedDomains)}
                  >
                    <Shield className="h-4 w-4 mr-2" />
                    Verify
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() =>
                      handleBulkAction("activate", selectedDomains)
                    }
                  >
                    <CheckCircle className="h-4 w-4 mr-2" />
                    Activate
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    className="text-red-600"
                    onClick={() => handleBulkAction("delete", selectedDomains)}
                  >
                    <Trash2 className="h-4 w-4 mr-2" />
                    Delete
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Domains Table */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>
                  Domains ({data ? formatNumber(data.pagination.total) : "0"})
                </CardTitle>
                <CardDescription>
                  Manage domain configurations, SSL certificates, and
                  verification status
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
            {!data || data.domains.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12">
                <Globe className="h-12 w-12 text-muted-foreground mb-4" />
                <h3 className="text-lg font-semibold mb-2">No domains found</h3>
                <p className="text-muted-foreground">
                  {!data
                    ? "Loading domains..."
                    : "No domains match your current filters."}
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
                              data.domains.length > 0 &&
                              selectedDomains.length === data.domains.length
                            }
                            onCheckedChange={toggleSelectAll}
                          />
                        </TableHead>
                        <TableHead>Domain</TableHead>
                        <TableHead>Type</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>SSL</TableHead>
                        <TableHead>Owner</TableHead>
                        <TableHead>Usage</TableHead>
                        <TableHead>Created</TableHead>
                        <TableHead className="w-[50px]"></TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {data.domains.map((domain) => (
                        <TableRow key={domain._id} className="group">
                          <TableCell>
                            <Checkbox
                              checked={selectedDomains.includes(domain._id)}
                              onCheckedChange={() =>
                                toggleDomainSelection(domain._id)
                              }
                            />
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-2">
                              <Globe className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                              <div className="space-y-1">
                                <div className="font-medium">
                                  {domain.domain}
                                </div>
                                {domain.lastUsedAt && (
                                  <div className="text-xs text-muted-foreground">
                                    Last used{" "}
                                    {formatRelativeTime(domain.lastUsedAt)}
                                  </div>
                                )}
                              </div>
                            </div>
                          </TableCell>
                          <TableCell>{getTypeBadge(domain.type)}</TableCell>
                          <TableCell>
                            {getStatusBadge(domain.isActive, domain.isVerified)}
                          </TableCell>
                          <TableCell>{getSSLBadge(domain.ssl)}</TableCell>
                          <TableCell>
                            {domain.userId ? (
                              <div className="flex items-center space-x-2">
                                <div className="h-6 w-6 rounded-full bg-gradient-to-br from-blue-400 to-blue-600 flex items-center justify-center text-white text-xs font-medium">
                                  {domain.userId.name.charAt(0).toUpperCase()}
                                </div>
                                <div>
                                  <div className="font-medium text-sm">
                                    {domain.userId.name}
                                  </div>
                                  <div className="text-xs text-muted-foreground">
                                    {domain.userId.email}
                                  </div>
                                </div>
                              </div>
                            ) : (
                              <Badge
                                variant="outline"
                                className="text-blue-600"
                              >
                                <Server className="w-3 h-3 mr-1" />
                                System
                              </Badge>
                            )}
                          </TableCell>
                          <TableCell>
                            <div className="space-y-1">
                              <div className="text-sm font-medium">
                                {formatNumber(domain.usage.linksCount)} links
                              </div>
                              <div className="text-xs text-muted-foreground">
                                {formatNumber(domain.usage.clicksCount)} clicks
                              </div>
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
                                  onClick={() => copyToClipboard(domain.domain)}
                                >
                                  <Copy className="mr-2 h-4 w-4" />
                                  Copy Domain
                                </DropdownMenuItem>
                                <DropdownMenuItem
                                  onClick={() =>
                                    window.open(
                                      `https://${domain.domain}`,
                                      "_blank"
                                    )
                                  }
                                >
                                  <ExternalLink className="mr-2 h-4 w-4" />
                                  Visit Domain
                                </DropdownMenuItem>
                                <DropdownMenuItem>
                                  <Settings className="mr-2 h-4 w-4" />
                                  Configure
                                </DropdownMenuItem>
                                <DropdownMenuSeparator />
                                {!domain.isVerified && (
                                  <DropdownMenuItem
                                    onClick={() =>
                                      handleVerifyDomain(domain._id)
                                    }
                                    className="text-blue-600"
                                  >
                                    <Shield className="mr-2 h-4 w-4" />
                                    Verify Domain
                                  </DropdownMenuItem>
                                )}
                                {domain.isActive ? (
                                  <DropdownMenuItem
                                    onClick={() =>
                                      handleToggleDomainStatus(
                                        domain._id,
                                        false
                                      )
                                    }
                                    className="text-orange-600"
                                  >
                                    <XCircle className="mr-2 h-4 w-4" />
                                    Deactivate
                                  </DropdownMenuItem>
                                ) : (
                                  <DropdownMenuItem
                                    onClick={() =>
                                      handleToggleDomainStatus(domain._id, true)
                                    }
                                    className="text-green-600"
                                  >
                                    <CheckCircle className="mr-2 h-4 w-4" />
                                    Activate
                                  </DropdownMenuItem>
                                )}
                                <DropdownMenuItem>
                                  <Key className="mr-2 h-4 w-4" />
                                  SSL Settings
                                </DropdownMenuItem>
                                <DropdownMenuSeparator />
                                <AlertDialog>
                                  <AlertDialogTrigger asChild>
                                    <DropdownMenuItem
                                      onSelect={(e) => e.preventDefault()}
                                      className="text-red-600"
                                    >
                                      <Trash2 className="mr-2 h-4 w-4" />
                                      Delete Domain
                                    </DropdownMenuItem>
                                  </AlertDialogTrigger>
                                  <AlertDialogContent>
                                    <AlertDialogHeader>
                                      <AlertDialogTitle className="flex items-center gap-2">
                                        <AlertTriangle className="h-5 w-5 text-red-600" />
                                        Delete Domain
                                      </AlertDialogTitle>
                                      <AlertDialogDescription>
                                        Are you sure you want to delete{" "}
                                        <strong>{domain.domain}</strong>? This
                                        action cannot be undone and will affect
                                        all associated links (
                                        {formatNumber(domain.usage.linksCount)}{" "}
                                        links).
                                      </AlertDialogDescription>
                                    </AlertDialogHeader>
                                    <AlertDialogFooter>
                                      <AlertDialogCancel>
                                        Cancel
                                      </AlertDialogCancel>
                                      <AlertDialogAction
                                        onClick={() =>
                                          handleDeleteDomain(domain._id)
                                        }
                                        className="bg-red-600 hover:bg-red-700"
                                      >
                                        Delete Domain
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
                        onClick={() => fetchDomains(currentPage - 1)}
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
                              onClick={() => fetchDomains(page)}
                            >
                              {page}
                            </Button>
                          );
                        })}
                      </div>
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
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </TooltipProvider>
  );
}
