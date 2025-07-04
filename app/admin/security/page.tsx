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

export default function AdminSecurityPage() {
  const [data, setData] = useState<SecurityPageData | null>(null);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [filters, setFilters] = useState({
    action: "",
    riskLevel: "",
    userId: "",
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
          ...filters,
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
        toast.error("Failed to load security data");
      } finally {
        setLoading(false);
      }
    },
    [searchTerm, filters, toast]
  );

  useEffect(() => {
    fetchSecurityData(1);
  }, [fetchSecurityData]);

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

  const getDeviceIcon = (userAgent: string) => {
    if (userAgent.includes("Mobile")) {
      return <Smartphone className="h-4 w-4" />;
    }
    return <Monitor className="h-4 w-4" />;
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
          <h1 className="text-3xl font-bold">Security Center</h1>
          <p className="text-muted-foreground">
            Monitor threats and audit system activity
          </p>
        </div>
        <Button onClick={() => fetchSecurityData(currentPage)}>
          <Shield className="h-4 w-4 mr-2" />
          Refresh
        </Button>
      </div>

      {/* Security Stats */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4 mb-8">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Failed Logins Today
            </CardTitle>
            <Ban className="h-4 w-4 text-red-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">
              {formatNumber(data?.stats.failedLoginsToday || 0)}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Suspicious Activities
            </CardTitle>
            <AlertTriangle className="h-4 w-4 text-yellow-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-yellow-600">
              {formatNumber(data?.stats.suspiciousActivities?.length || 0)}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Total Audit Logs
            </CardTitle>
            <Activity className="h-4 w-4 text-blue-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {formatNumber(data?.pagination.total || 0)}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              High Risk Events
            </CardTitle>
            <Shield className="h-4 w-4 text-red-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">
              {formatNumber(
                data?.stats.riskLevels?.find((r) => r.level === "high")
                  ?.count || 0
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="logs">Audit Logs</TabsTrigger>
          <TabsTrigger value="suspicious">Suspicious Activity</TabsTrigger>
          <TabsTrigger value="analytics">Risk Analytics</TabsTrigger>
        </TabsList>

        <TabsContent value="logs" className="space-y-6">
          {/* Filters */}
          <Card>
            <CardContent className="p-6">
              <form onSubmit={handleSearch} className="flex gap-4">
                <div className="flex-1">
                  <Input
                    placeholder="Search by user, action, or IP address..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full"
                  />
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
                    <SelectItem value="">All Actions</SelectItem>
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
                    <SelectItem value="">All Risks</SelectItem>
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
                                <p className="text-sm text-muted-foreground font-mono">
                                  {log.resourceId.slice(-8)}
                                </p>
                              )}
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="space-y-1">
                              <div className="flex items-center gap-1 text-sm">
                                <MapPin className="h-3 w-3" />
                                {log.context.ip}
                              </div>
                              <div className="flex items-center gap-1 text-sm text-muted-foreground">
                                {getDeviceIcon(log.context.userAgent)}
                                {log.context.userAgent.slice(0, 30)}...
                              </div>
                            </div>
                          </TableCell>
                          <TableCell>
                            <Badge
                              variant={getRiskBadgeVariant(log.risk.level)}
                              className="capitalize"
                            >
                              {log.risk.level}
                            </Badge>
                            {log.risk.factors.length > 0 && (
                              <p className="text-xs text-muted-foreground mt-1">
                                {log.risk.factors.slice(0, 2).join(", ")}
                              </p>
                            )}
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
                          <TableCell className="text-sm text-muted-foreground">
                            {formatRelativeTime(log.timestamp)}
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
                        {(data.pagination.page - 1) * data.pagination.limit + 1}{" "}
                        to{" "}
                        {Math.min(
                          data.pagination.page * data.pagination.limit,
                          data.pagination.total
                        )}{" "}
                        of {data.pagination.total} logs
                      </p>
                      <div className="flex gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => fetchSecurityData(currentPage - 1)}
                          disabled={!data.pagination.hasPrevPage || loading}
                        >
                          Previous
                        </Button>
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
                </>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="suspicious" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <AlertTriangle className="h-5 w-5 text-yellow-500" />
                Suspicious Activities
              </CardTitle>
              <CardDescription>
                High-risk activities that require attention
              </CardDescription>
            </CardHeader>
            <CardContent>
              {data?.stats.suspiciousActivities?.length === 0 ? (
                <EmptyState
                  icon={Shield}
                  title="No suspicious activities"
                  description="All activities are within normal parameters."
                />
              ) : (
                <div className="space-y-4">
                  {data?.stats.suspiciousActivities?.map((activity) => (
                    <div key={activity._id} className="border rounded-lg p-4">
                      <div className="flex items-start justify-between">
                        <div className="space-y-2">
                          <div className="flex items-center gap-2">
                            <Badge variant="destructive">High Risk</Badge>
                            <span className="font-medium">
                              {activity.action}
                            </span>
                          </div>
                          <p className="text-sm text-muted-foreground">
                            User: {activity.userName || "Anonymous"} (
                            {activity.userEmail})
                          </p>
                          <p className="text-sm text-muted-foreground">
                            IP: {activity.context.ip} •{" "}
                            {formatRelativeTime(activity.timestamp)}
                          </p>
                          <div className="flex gap-2 flex-wrap">
                            {activity.risk.factors.map((factor, index) => (
                              <Badge
                                key={index}
                                variant="outline"
                                className="text-xs"
                              >
                                {factor.replace("_", " ")}
                              </Badge>
                            ))}
                          </div>
                        </div>
                        <Button variant="outline" size="sm">
                          <Eye className="h-4 w-4 mr-2" />
                          Investigate
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
            {/* Risk Levels */}
            <Card>
              <CardHeader>
                <CardTitle>Risk Level Distribution</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {data?.stats.riskLevels?.map((risk) => (
                    <div
                      key={risk.level}
                      className="flex items-center justify-between"
                    >
                      <div className="flex items-center gap-2">
                        <Badge
                          variant={getRiskBadgeVariant(risk.level)}
                          className="capitalize"
                        >
                          {risk.level}
                        </Badge>
                      </div>
                      <span className="font-mono text-sm">
                        {formatNumber(risk.count)}
                      </span>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Top Actions */}
            <Card>
              <CardHeader>
                <CardTitle>Most Common Actions</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {data?.stats.topActions?.map((action) => (
                    <div
                      key={action.action}
                      className="flex items-center justify-between"
                    >
                      <span className="font-medium capitalize">
                        {action.action.replace("_", " ")}
                      </span>
                      <span className="font-mono text-sm">
                        {formatNumber(action.count)}
                      </span>
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
