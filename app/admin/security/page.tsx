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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
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
} from "lucide-react";
import { formatRelativeTime, formatNumber } from "@/lib/utils";

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
  };
}

// Define special "all" values to replace empty strings
const ALL_SECURITY_ACTIONS = "all_security_actions";
const ALL_RISK_LEVELS = "all_risk_levels";
const ALL_SECURITY_USERS = "all_security_users";

export default function AdminSecurityPage() {
  const [data, setData] = useState<SecurityPageData | null>(null);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [filters, setFilters] = useState({
    action: ALL_SECURITY_ACTIONS,
    riskLevel: ALL_RISK_LEVELS,
    userId: ALL_SECURITY_USERS,
    sortBy: "timestamp",
    sortOrder: "desc",
  });
  const [currentPage, setCurrentPage] = useState(1);
  const [activeTab, setActiveTab] = useState("logs");
  const toast = useToast();

  const fetchSecurityData = useCallback(
    async (page = 1) => {
      try {
        setLoading(true);
        const params = new URLSearchParams({
          page: page.toString(),
          limit: "20",
          search: searchTerm,
          // Convert special "all" values back to empty strings for API
          action: filters.action === ALL_SECURITY_ACTIONS ? "" : filters.action,
          riskLevel:
            filters.riskLevel === ALL_RISK_LEVELS ? "" : filters.riskLevel,
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
    [searchTerm, filters, toast]
  );

  useEffect(() => {
    fetchSecurityData(1);
  }, []);

  useEffect(() => {
    const delayedSearch = setTimeout(() => {
      if (searchTerm !== undefined) {
        fetchSecurityData(1);
      }
    }, 500);

    return () => clearTimeout(delayedSearch);
  }, [searchTerm, filters]);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    fetchSecurityData(1);
  };

  const getRiskBadgeVariant = (level: string) => {
    switch (level) {
      case "critical":
        return "destructive";
      case "high":
        return "destructive";
      case "medium":
        return "secondary";
      case "low":
        return "outline";
      default:
        return "outline";
    }
  };

  const getSuccessBadgeVariant = (success: boolean) => {
    return success ? "default" : "destructive";
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
          <h1 className="text-3xl font-bold">Security & Audit</h1>
          <p className="text-muted-foreground">
            Monitor system security and audit logs
          </p>
        </div>
        <Button onClick={() => fetchSecurityData(currentPage)}>
          <RefreshCw className="h-4 w-4 mr-2" />
          Refresh
        </Button>
      </div>

      {/* Stats Cards */}
      {data?.stats && (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                Failed Logins Today
              </CardTitle>
              <AlertTriangle className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {formatNumber(data.stats.failedLoginsToday)}
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                High Risk Events
              </CardTitle>
              <Shield className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {formatNumber(
                  data.stats.riskLevels
                    .filter((r) => r.level === "high" || r.level === "critical")
                    .reduce((sum, r) => sum + r.count, 0)
                )}
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                Suspicious Activities
              </CardTitle>
              <Activity className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {formatNumber(data.stats.suspiciousActivities.length)}
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Logs</CardTitle>
              <Monitor className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {formatNumber(data.pagination.total)}
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
            <CardHeader>
              <CardTitle>Search & Filter</CardTitle>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSearch} className="flex gap-4">
                <div className="flex-1">
                  <Input
                    placeholder="Search by user, action, or IP address..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                  />
                </div>
                <Select
                  value={filters.action}
                  onValueChange={(value) =>
                    setFilters((prev) => ({ ...prev, action: value }))
                  }
                >
                  <SelectTrigger className="w-40">
                    <SelectValue placeholder="Action" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value={ALL_SECURITY_ACTIONS}>
                      All Actions
                    </SelectItem>
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
                  <SelectTrigger className="w-40">
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
                <Button type="submit">
                  <Search className="h-4 w-4" />
                </Button>
              </form>
            </CardContent>
          </Card>

          {/* Audit Logs Table */}
          <Card>
            <CardHeader>
              <CardTitle>Audit Logs ({data?.pagination.total || 0})</CardTitle>
            </CardHeader>
            <CardContent>
              {data?.auditLogs.length === 0 ? (
                <EmptyState
                  icon={Activity}
                  title="No audit logs found"
                  description="No logs match your current filters."
                />
              ) : (
                <>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>User & Action</TableHead>
                        <TableHead>Resource</TableHead>
                        <TableHead>Context</TableHead>
                        <TableHead>Risk</TableHead>
                        <TableHead>Result</TableHead>
                        <TableHead>Time</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {data?.auditLogs.map((log) => (
                        <TableRow key={log._id}>
                          <TableCell>
                            <div>
                              <p className="font-medium">
                                {log.userName || "Anonymous"}
                              </p>
                              <p className="text-sm text-muted-foreground">
                                {log.userEmail}
                              </p>
                              <Badge variant="outline" className="mt-1 text-xs">
                                {log.action}
                              </Badge>
                            </div>
                          </TableCell>
                          <TableCell>
                            <div>
                              <p className="font-medium">{log.resource}</p>
                              {log.resourceId && (
                                <p className="text-sm text-muted-foreground">
                                  ID: {log.resourceId.substring(0, 8)}...
                                </p>
                              )}
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="text-sm">
                              <p className="flex items-center gap-1">
                                <MapPin className="w-3 h-3" />
                                {log.context.ip}
                              </p>
                              <p className="text-muted-foreground truncate max-w-[150px]">
                                {log.context.userAgent}
                              </p>
                            </div>
                          </TableCell>
                          <TableCell>
                            <Badge
                              variant={getRiskBadgeVariant(log.risk.level)}
                            >
                              {log.risk.level.toUpperCase()}
                            </Badge>
                            <p className="text-xs text-muted-foreground mt-1">
                              Score: {log.risk.score}
                            </p>
                          </TableCell>
                          <TableCell>
                            <Badge
                              variant={getSuccessBadgeVariant(
                                log.result.success
                              )}
                            >
                              {log.result.success ? "Success" : "Failed"}
                            </Badge>
                            {log.result.statusCode && (
                              <p className="text-xs text-muted-foreground mt-1">
                                {log.result.statusCode}
                              </p>
                            )}
                          </TableCell>
                          <TableCell>
                            <div className="text-sm">
                              {formatRelativeTime(log.timestamp)}
                            </div>
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
                        {data.pagination.total} logs
                      </div>
                      <div className="flex items-center space-x-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => fetchSecurityData(currentPage - 1)}
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
                          onClick={() => fetchSecurityData(currentPage + 1)}
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
        </TabsContent>

        <TabsContent value="suspicious" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Suspicious Activities</CardTitle>
              <CardDescription>
                High-risk events that require attention
              </CardDescription>
            </CardHeader>
            <CardContent>
              {data?.stats.suspiciousActivities.length === 0 ? (
                <EmptyState
                  icon={Shield}
                  title="No suspicious activities"
                  description="All recent activities appear normal."
                />
              ) : (
                <div className="space-y-4">
                  {data?.stats.suspiciousActivities.map((activity) => (
                    <div
                      key={activity._id}
                      className="flex items-center justify-between p-4 border rounded-lg"
                    >
                      <div>
                        <p className="font-medium">
                          {activity.userName || "Anonymous"} - {activity.action}
                        </p>
                        <p className="text-sm text-muted-foreground">
                          {activity.context.ip} •{" "}
                          {formatRelativeTime(activity.timestamp)}
                        </p>
                      </div>
                      <Badge variant={getRiskBadgeVariant(activity.risk.level)}>
                        {activity.risk.level.toUpperCase()}
                      </Badge>
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
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {data?.stats.riskLevels.map((risk) => (
                    <div
                      key={risk.level}
                      className="flex items-center justify-between"
                    >
                      <span className="capitalize">{risk.level}</span>
                      <span className="font-medium">{risk.count}</span>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Top Actions</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {data?.stats.topActions.map((action) => (
                    <div
                      key={action.action}
                      className="flex items-center justify-between"
                    >
                      <span>{action.action}</span>
                      <span className="font-medium">{action.count}</span>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
