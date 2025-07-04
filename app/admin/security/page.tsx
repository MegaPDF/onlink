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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
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
  Shield,
  Search,
  AlertTriangle,
  Activity,
  Ban,
  Eye,
  Calendar,
  MapPin,
  Monitor,
  Smartphone,
  RefreshCw,
  Filter,
  Download,
  Settings,
  Clock,
  TrendingUp,
  TrendingDown,
  Loader2,
  CheckCircle,
  XCircle,
  Lock,
  Unlock,
  UserX,
  AlertCircle,
  Globe,
  Server,
  Database,
  MoreHorizontal,
  FileText,
  Zap,
  Target,
} from "lucide-react";

// Types for real API data
interface AuditLogData {
  _id: string;
  userId?: string;
  userEmail?: string;
  userName?: string;
  action: string;
  resource: string;
  resourceId?: string;
  details: {
    method: "GET" | "POST" | "PUT" | "DELETE" | "PATCH";
    endpoint?: string;
    changes?: {
      field: string;
      oldValue?: any;
      newValue?: any;
    }[];
    metadata?: Record<string, any>;
  };
  context: {
    ip: string;
    userAgent: string;
    sessionId?: string;
    requestId?: string;
    teamId?: string;
    location?: {
      country: string;
      city: string;
    };
  };
  result: {
    success: boolean;
    statusCode?: number;
    error?: string;
    duration?: number;
  };
  risk: {
    level: "low" | "medium" | "high" | "critical";
    factors: string[];
    score: number;
  };
  timestamp: Date;
}

interface SecurityPageData {
  auditLogs: AuditLogData[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
    hasNextPage: boolean;
    hasPrevPage: boolean;
  };
  stats: {
    riskLevels: { level: string; count: number }[];
    topActions: { action: string; count: number }[];
    failedLoginsToday: number;
    suspiciousActivities: AuditLogData[];
    totalEvents: number;
    blockedIPs: number;
    activeThreats: number;
    securityScore: number;
  };
}

const ALL_SECURITY_ACTIONS = "all_security_actions";
const ALL_RISK_LEVELS = "all_risk_levels";
const ALL_SECURITY_USERS = "all_security_users";

// Utility functions
const formatRelativeTime = (date: Date | string) => {
  const dateObj = typeof date === 'string' ? new Date(date) : date;
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

export default function AdminSecurityPage() {
  const [data, setData] = useState<SecurityPageData | null>(null);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedLogs, setSelectedLogs] = useState<string[]>([]);
  const [filters, setFilters] = useState({
    action: ALL_SECURITY_ACTIONS,
    riskLevel: ALL_RISK_LEVELS,
    userId: ALL_SECURITY_USERS,
    sortBy: "timestamp",
    sortOrder: "desc",
  });
  const [currentPage, setCurrentPage] = useState(1);
  const [activeTab, setActiveTab] = useState("logs");

  // Toast notifications (replace with your actual toast implementation)
  const toast = {
    success: (message: string) => console.log("Success:", message),
    error: (message: string) => console.log("Error:", message),
  };

  // Fetch security data from API
  const fetchSecurityData = useCallback(
    async (page = 1) => {
      try {
        setLoading(true);
        const params = new URLSearchParams({
          page: page.toString(),
          limit: "20",
          search: searchTerm,
          action: filters.action === ALL_SECURITY_ACTIONS ? "" : filters.action,
          riskLevel: filters.riskLevel === ALL_RISK_LEVELS ? "" : filters.riskLevel,
          userId: filters.userId === ALL_SECURITY_USERS ? "" : filters.userId,
          sortBy: filters.sortBy,
          sortOrder: filters.sortOrder,
        });

        const response = await fetch(`/api/admin/security?${params}`);
        const result = await response.json();

        if (!response.ok) {
          throw new Error(result.error || "Failed to fetch security data");
        }

        setData(result.data);
        setCurrentPage(page);
      } catch (error) {
        console.error("Error fetching security data:", error);
        toast.error("Failed to load security data. Please try again.");
      } finally {
        setLoading(false);
      }
    },
    [searchTerm, filters]
  );

  // Load security data on component mount and when filters change
  useEffect(() => {
    fetchSecurityData(1);
  }, [fetchSecurityData]);

  // Search handler
  const handleSearch = () => {
    fetchSecurityData(1);
  };

  // Block IP address
  const handleBlockIP = async (ip: string) => {
    try {
      const response = await fetch("/api/admin/security/block-ip", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ ip }),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || "Failed to block IP");
      }

      toast.success(`IP ${ip} blocked successfully`);
      fetchSecurityData(currentPage);
    } catch (error) {
      console.error("Error blocking IP:", error);
      toast.error("Failed to block IP address");
    }
  };

  // Bulk actions
  const handleBulkAction = async (action: string, logIds: string[]) => {
    try {
      const response = await fetch("/api/admin/security/bulk", {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ action, logIds }),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || "Failed to perform bulk action");
      }

      toast.success(`Bulk action completed successfully`);
      setSelectedLogs([]);
      fetchSecurityData(currentPage);
    } catch (error) {
      console.error("Error performing bulk action:", error);
      toast.error("Failed to perform bulk action");
    }
  };

  // Export security data
  const handleExportLogs = async () => {
    try {
      const response = await fetch("/api/admin/security/export", {
        method: "GET",
        headers: {
          "Accept": "text/csv",
        },
      });

      if (!response.ok) {
        throw new Error("Failed to export security logs");
      }

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `security-logs-export-${new Date().toISOString().split('T')[0]}.csv`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);

      toast.success("Security logs exported successfully");
    } catch (error) {
      console.error("Error exporting logs:", error);
      toast.error("Failed to export security logs");
    }
  };

  // Utility functions
  const getRiskBadgeColor = (level: string) => {
    switch (level) {
      case "critical":
        return "bg-red-100 text-red-800 border-red-200 dark:bg-red-900/20 dark:text-red-400 dark:border-red-800";
      case "high":
        return "bg-orange-100 text-orange-800 border-orange-200 dark:bg-orange-900/20 dark:text-orange-400 dark:border-orange-800";
      case "medium":
        return "bg-yellow-100 text-yellow-800 border-yellow-200 dark:bg-yellow-900/20 dark:text-yellow-400 dark:border-yellow-800";
      case "low":
        return "bg-green-100 text-green-800 border-green-200 dark:bg-green-900/20 dark:text-green-400 dark:border-green-800";
      default:
        return "bg-gray-100 text-gray-800 border-gray-200 dark:bg-gray-900/20 dark:text-gray-400 dark:border-gray-800";
    }
  };

  const getRiskIcon = (level: string) => {
    switch (level) {
      case "critical":
        return <AlertTriangle className="w-3 h-3 mr-1" />;
      case "high":
        return <AlertCircle className="w-3 h-3 mr-1" />;
      case "medium":
        return <Eye className="w-3 h-3 mr-1" />;
      case "low":
        return <CheckCircle className="w-3 h-3 mr-1" />;
      default:
        return <Shield className="w-3 h-3 mr-1" />;
    }
  };

  const getSuccessBadge = (success: boolean) => {
    return success ? (
      <Badge className="bg-green-100 text-green-800 border-green-200 dark:bg-green-900/20 dark:text-green-400 dark:border-green-800">
        <CheckCircle className="w-3 h-3 mr-1" />
        Success
      </Badge>
    ) : (
      <Badge className="bg-red-100 text-red-800 border-red-200 dark:bg-red-900/20 dark:text-red-400 dark:border-red-800">
        <XCircle className="w-3 h-3 mr-1" />
        Failed
      </Badge>
    );
  };

  const getActionIcon = (action: string) => {
    switch (action) {
      case "login":
        return <Lock className="w-4 h-4" />;
      case "logout":
        return <Unlock className="w-4 h-4" />;
      case "create":
        return <Zap className="w-4 h-4" />;
      case "update":
        return <Settings className="w-4 h-4" />;
      case "delete":
        return <Ban className="w-4 h-4" />;
      default:
        return <Activity className="w-4 h-4" />;
    }
  };

  const toggleLogSelection = (logId: string) => {
    setSelectedLogs(prev => 
      prev.includes(logId) 
        ? prev.filter(id => id !== logId)
        : [...prev, logId]
    );
  };

  const toggleSelectAll = () => {
    if (!data) return;
    if (selectedLogs.length === data.auditLogs.length) {
      setSelectedLogs([]);
    } else {
      setSelectedLogs(data.auditLogs.map(log => log._id));
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
          <h3 className="text-lg font-semibold mb-2">Failed to load security data</h3>
          <p className="text-muted-foreground mb-4">
            There was an error loading the security information.
          </p>
          <Button onClick={() => fetchSecurityData(1)}>
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
            <h1 className="text-3xl font-bold tracking-tight">Security & Audit</h1>
            <p className="text-muted-foreground">
              Monitor system security and audit logs
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Tooltip>
              <TooltipTrigger asChild>
                <Button variant="outline" size="sm" onClick={handleExportLogs}>
                  <Download className="h-4 w-4 mr-2" />
                  Export
                </Button>
              </TooltipTrigger>
              <TooltipContent>Export security logs to CSV</TooltipContent>
            </Tooltip>
            <Button onClick={() => fetchSecurityData(currentPage)}>
              <RefreshCw className="h-4 w-4 mr-2" />
              Refresh
            </Button>
          </div>
        </div>

        {/* Stats Cards */}
        {data?.stats && (
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4">
            <Card className="relative overflow-hidden">
              <div className="absolute inset-0 bg-gradient-to-br from-red-50 to-red-100 dark:from-red-950/20 dark:to-red-900/20"></div>
              <CardHeader className="relative flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Failed Logins Today</CardTitle>
                <AlertTriangle className="h-4 w-4 text-red-600" />
              </CardHeader>
              <CardContent className="relative">
                <div className="text-2xl font-bold text-red-600">
                  {formatNumber(data.stats.failedLoginsToday)}
                </div>
                <div className="flex items-center text-xs text-muted-foreground mt-1">
                  <TrendingDown className="h-3 w-3 mr-1" />
                  <span className="text-red-600">High alert</span>
                </div>
              </CardContent>
            </Card>

            <Card className="relative overflow-hidden">
              <div className="absolute inset-0 bg-gradient-to-br from-orange-50 to-orange-100 dark:from-orange-950/20 dark:to-orange-900/20"></div>
              <CardHeader className="relative flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">High Risk Events</CardTitle>
                <Shield className="h-4 w-4 text-orange-600" />
              </CardHeader>
              <CardContent className="relative">
                <div className="text-2xl font-bold text-orange-600">
                  {formatNumber(
                    data.stats.riskLevels
                      .filter((r) => r.level === "high" || r.level === "critical")
                      .reduce((sum, r) => sum + r.count, 0)
                  )}
                </div>
                <p className="text-xs text-muted-foreground">
                  {data.stats.blockedIPs} IPs blocked
                </p>
              </CardContent>
            </Card>

            <Card className="relative overflow-hidden">
              <div className="absolute inset-0 bg-gradient-to-br from-blue-50 to-blue-100 dark:from-blue-950/20 dark:to-blue-900/20"></div>
              <CardHeader className="relative flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Active Threats</CardTitle>
                <Activity className="h-4 w-4 text-blue-600" />
              </CardHeader>
              <CardContent className="relative">
                <div className="text-2xl font-bold text-blue-600">
                  {formatNumber(data.stats.activeThreats || 0)}
                </div>
                <p className="text-xs text-muted-foreground">
                  {data.stats.suspiciousActivities.length} suspicious
                </p>
              </CardContent>
            </Card>

            <Card className="relative overflow-hidden">
              <div className="absolute inset-0 bg-gradient-to-br from-green-50 to-green-100 dark:from-green-950/20 dark:to-green-900/20"></div>
              <CardHeader className="relative flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Security Score</CardTitle>
                <Target className="h-4 w-4 text-green-600" />
              </CardHeader>
              <CardContent className="relative">
                <div className="text-2xl font-bold text-green-600">
                  {data.stats.securityScore || 85}/100
                </div>
                <div className="flex items-center text-xs text-muted-foreground mt-1">
                  <TrendingUp className="h-3 w-3 mr-1" />
                  <span className="text-green-600">Good</span>
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="logs">Audit Logs</TabsTrigger>
            <TabsTrigger value="suspicious">Suspicious Activity</TabsTrigger>
            <TabsTrigger value="analytics">Risk Analytics</TabsTrigger>
          </TabsList>

          <TabsContent value="logs" className="space-y-6">
            {/* Filters */}
            <Card>
              <CardContent className="pt-6">
                <div className="flex gap-4 items-end flex-wrap">
                  <div className="flex-1 min-w-[300px]">
                    <div className="relative">
                      <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
                      <Input
                        placeholder="Search by user, action, or IP address..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="pl-10"
                      />
                    </div>
                  </div>
                  
                  <Select
                    value={filters.action}
                    onValueChange={(value) =>
                      setFilters((prev) => ({ ...prev, action: value }))
                    }
                  >
                    <SelectTrigger className="w-32">
                      <SelectValue placeholder="Action" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value={ALL_SECURITY_ACTIONS}>All Actions</SelectItem>
                      <SelectItem value="login">Login</SelectItem>
                      <SelectItem value="logout">Logout</SelectItem>
                      <SelectItem value="create">Create</SelectItem>
                      <SelectItem value="update">Update</SelectItem>
                      <SelectItem value="delete">Delete</SelectItem>
                    </SelectContent>
                  </Select>

                  <Select
                    value={filters.riskLevel}
                    onValueChange={(value) =>
                      setFilters((prev) => ({ ...prev, riskLevel: value }))
                    }
                  >
                    <SelectTrigger className="w-32">
                      <SelectValue placeholder="Risk" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value={ALL_RISK_LEVELS}>All Risks</SelectItem>
                      <SelectItem value="low">Low</SelectItem>
                      <SelectItem value="medium">Medium</SelectItem>
                      <SelectItem value="high">High</SelectItem>
                      <SelectItem value="critical">Critical</SelectItem>
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
            {selectedLogs.length > 0 && (
              <Card className="bg-blue-50 dark:bg-blue-950/20 border-blue-200 dark:border-blue-800">
                <CardContent className="pt-6">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <CheckCircle className="h-5 w-5 text-blue-600" />
                      <span className="font-medium text-blue-800 dark:text-blue-200">
                        {selectedLogs.length} log{selectedLogs.length > 1 ? 's' : ''} selected
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Button 
                        variant="outline" 
                        size="sm"
                        onClick={() => handleBulkAction('flag', selectedLogs)}
                      >
                        <AlertTriangle className="h-4 w-4 mr-2" />
                        Flag
                      </Button>
                      <Button 
                        variant="outline" 
                        size="sm"
                        onClick={() => handleBulkAction('investigate', selectedLogs)}
                      >
                        <Eye className="h-4 w-4 mr-2" />
                        Investigate
                      </Button>
                      <Button 
                        variant="outline" 
                        size="sm" 
                        className="text-red-600"
                        onClick={() => handleBulkAction('block', selectedLogs)}
                      >
                        <Ban className="h-4 w-4 mr-2" />
                        Block
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Audit Logs Table */}
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle>Audit Logs ({data ? formatNumber(data.pagination.total) : '0'})</CardTitle>
                    <CardDescription>
                      Monitor all system activities and security events
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
                {!data || data.auditLogs.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-12">
                    <Activity className="h-12 w-12 text-muted-foreground mb-4" />
                    <h3 className="text-lg font-semibold mb-2">No audit logs found</h3>
                    <p className="text-muted-foreground">
                      {!data ? "Loading logs..." : "No logs match your current filters."}
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
                                checked={data.auditLogs.length > 0 && selectedLogs.length === data.auditLogs.length}
                                onCheckedChange={toggleSelectAll}
                              />
                            </TableHead>
                            <TableHead>User & Action</TableHead>
                            <TableHead>Resource</TableHead>
                            <TableHead>Context</TableHead>
                            <TableHead>Risk</TableHead>
                            <TableHead>Result</TableHead>
                            <TableHead>Time</TableHead>
                            <TableHead className="w-[50px]"></TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {data.auditLogs.map((log) => (
                            <TableRow key={log._id} className="group">
                              <TableCell>
                                <Checkbox
                                  checked={selectedLogs.includes(log._id)}
                                  onCheckedChange={() => toggleLogSelection(log._id)}
                                />
                              </TableCell>
                              <TableCell>
                                <div className="flex items-center space-x-2">
                                  <div className="h-6 w-6 rounded-full bg-gradient-to-br from-blue-400 to-blue-600 flex items-center justify-center text-white text-xs font-medium">
                                    {(log.userName || "A").charAt(0).toUpperCase()}
                                  </div>
                                  <div>
                                    <div className="font-medium text-sm">
                                      {log.userName || "Anonymous"}
                                    </div>
                                    <div className="text-xs text-muted-foreground">
                                      {log.userEmail}
                                    </div>
                                    <div className="flex items-center gap-1 mt-1">
                                      {getActionIcon(log.action)}
                                      <Badge variant="outline" className="text-xs">
                                        {log.action}
                                      </Badge>
                                    </div>
                                  </div>
                                </div>
                              </TableCell>
                              <TableCell>
                                <div>
                                  <div className="font-medium text-sm">{log.resource}</div>
                                  {log.resourceId && (
                                    <div className="text-xs text-muted-foreground">
                                      ID: {log.resourceId.substring(0, 8)}...
                                    </div>
                                  )}
                                  <Badge variant="outline" className="text-xs mt-1">
                                    {log.details.method}
                                  </Badge>
                                </div>
                              </TableCell>
                              <TableCell>
                                <div className="space-y-1">
                                  <div className="flex items-center gap-1 text-sm">
                                    <MapPin className="w-3 h-3" />
                                    {log.context.ip}
                                  </div>
                                  {log.context.location && (
                                    <div className="flex items-center gap-1 text-xs text-muted-foreground">
                                      <Globe className="w-3 h-3" />
                                      {log.context.location.city}, {log.context.location.country}
                                    </div>
                                  )}
                                  <div className="text-xs text-muted-foreground truncate max-w-[150px]">
                                    {log.context.userAgent}
                                  </div>
                                </div>
                              </TableCell>
                              <TableCell>
                                <Badge className={getRiskBadgeColor(log.risk.level)}>
                                  {getRiskIcon(log.risk.level)}
                                  {log.risk.level.toUpperCase()}
                                </Badge>
                                <div className="text-xs text-muted-foreground mt-1">
                                  Score: {log.risk.score}
                                </div>
                                {log.risk.factors.length > 0 && (
                                  <div className="text-xs text-muted-foreground">
                                    {log.risk.factors.slice(0, 2).join(", ")}
                                  </div>
                                )}
                              </TableCell>
                              <TableCell>
                                {getSuccessBadge(log.result.success)}
                                {log.result.statusCode && (
                                  <div className="text-xs text-muted-foreground mt-1">
                                    {log.result.statusCode}
                                  </div>
                                )}
                                {log.result.duration && (
                                  <div className="text-xs text-muted-foreground">
                                    {log.result.duration}ms
                                  </div>
                                )}
                              </TableCell>
                              <TableCell>
                                <div className="flex items-center text-sm text-muted-foreground">
                                  <Clock className="h-3 w-3 mr-1" />
                                  {formatRelativeTime(log.timestamp)}
                                </div>
                              </TableCell>
                              <TableCell>
                                <DropdownMenu>
                                  <DropdownMenuTrigger asChild>
                                    <Button variant="ghost" className="h-8 w-8 p-0 opacity-0 group-hover:opacity-100 transition-opacity">
                                      <MoreHorizontal className="h-4 w-4" />
                                    </Button>
                                  </DropdownMenuTrigger>
                                  <DropdownMenuContent align="end" className="w-48">
                                    <DropdownMenuLabel>Actions</DropdownMenuLabel>
                                    <DropdownMenuItem>
                                      <Eye className="mr-2 h-4 w-4" />
                                      View Details
                                    </DropdownMenuItem>
                                    <DropdownMenuItem>
                                      <FileText className="mr-2 h-4 w-4" />
                                      Export Log
                                    </DropdownMenuItem>
                                    <DropdownMenuSeparator />
                                    <DropdownMenuItem
                                      onClick={() => handleBlockIP(log.context.ip)}
                                      className="text-red-600"
                                    >
                                      <Ban className="mr-2 h-4 w-4" />
                                      Block IP
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
                    {data && data.pagination.totalPages > 1 && (
                      <div className="flex items-center justify-between">
                        <div className="text-sm text-muted-foreground">
                          Showing <strong>{((data.pagination.page - 1) * data.pagination.limit) + 1}</strong> to{" "}
                          <strong>{Math.min(data.pagination.page * data.pagination.limit, data.pagination.total)}</strong> of{" "}
                          <strong>{data.pagination.total}</strong> results
                        </div>
                        <div className="flex items-center space-x-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => fetchSecurityData(currentPage - 1)}
                            disabled={!data.pagination.hasPrevPage || loading}
                          >
                            Previous
                          </Button>
                          <div className="flex items-center space-x-1">
                            {[...Array(Math.min(5, data.pagination.totalPages))].map((_, i) => {
                              const page = i + 1;
                              return (
                                <Button
                                  key={page}
                                  variant={page === data.pagination.page ? "default" : "outline"}
                                  size="sm"
                                  className="w-8 h-8"
                                  onClick={() => fetchSecurityData(page)}
                                >
                                  {page}
                                </Button>
                              );
                            })}
                          </div>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => fetchSecurityData(currentPage + 1)}
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
          </TabsContent>

          <TabsContent value="suspicious" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Suspicious Activities</CardTitle>
                <CardDescription>
                  High-risk events that require immediate attention
                </CardDescription>
              </CardHeader>
              <CardContent>
                {!data?.stats.suspiciousActivities || data.stats.suspiciousActivities.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-12">
                    <Shield className="h-12 w-12 text-green-500 mb-4" />
                    <h3 className="text-lg font-semibold mb-2">No suspicious activities</h3>
                    <p className="text-muted-foreground">
                      All recent activities appear normal and secure.
                    </p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {data.stats.suspiciousActivities.map((activity) => (
                      <div
                        key={`suspicious-${activity._id}`}
                        className="flex items-center justify-between p-4 border rounded-lg hover:bg-muted/50 transition-colors"
                      >
                        <div className="flex items-center space-x-3">
                          <div className="h-8 w-8 rounded-full bg-red-100 dark:bg-red-900/20 flex items-center justify-center">
                            <AlertTriangle className="h-4 w-4 text-red-600" />
                          </div>
                          <div>
                            <div className="font-medium">
                              {activity.userName || "Anonymous"} - {activity.action}
                            </div>
                            <div className="text-sm text-muted-foreground">
                              {activity.context.ip} • {formatRelativeTime(activity.timestamp)}
                            </div>
                            <div className="text-xs text-muted-foreground">
                              Risk factors: {activity.risk.factors.join(", ")}
                            </div>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <Badge className={getRiskBadgeColor(activity.risk.level)}>
                            {getRiskIcon(activity.risk.level)}
                            {activity.risk.level.toUpperCase()}
                          </Badge>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleBlockIP(activity.context.ip)}
                          >
                            <Ban className="h-4 w-4 mr-1" />
                            Block
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="analytics" className="space-y-6">
            <div className="grid gap-6 md:grid-cols-2">
              <Card>
                <CardHeader>
                  <CardTitle>Risk Level Distribution</CardTitle>
                  <CardDescription>
                    Breakdown of security events by risk level
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {data?.stats.riskLevels.map((risk, index) => (
                      <div
                        key={`risk-${risk.level || 'unknown'}-${index}`}
                        className="flex items-center justify-between p-2 rounded-lg border"
                      >
                        <div className="flex items-center gap-2">
                          <Badge className={getRiskBadgeColor(risk.level)}>
                            {getRiskIcon(risk.level)}
                            {risk.level || 'Unknown'}
                          </Badge>
                        </div>
                        <span className="font-medium">{formatNumber(risk.count)}</span>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Top Actions</CardTitle>
                  <CardDescription>
                    Most frequent security events and activities
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {data?.stats.topActions.map((action, index) => (
                      <div
                        key={`action-${action.action || 'unknown'}-${index}`}
                        className="flex items-center justify-between p-2 rounded-lg border"
                      >
                        <div className="flex items-center gap-2">
                          {getActionIcon(action.action)}
                          <span className="capitalize">{action.action || 'Unknown'}</span>
                        </div>
                        <span className="font-medium">{formatNumber(action.count)}</span>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </TooltipProvider>
  );
}