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
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Shield,
  AlertTriangle,
  Activity,
  Eye,
  Ban,
  Search,
  RefreshCw,
  Download,
  Lock,
  Unlock,
  UserX,
  Globe,
  Clock,
  CheckCircle,
  XCircle,
  Filter,
  Zap,
} from "lucide-react";
import { formatNumber} from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";
import { formatDistanceToNow } from "date-fns";

interface SecurityEvent {
  id: string;
  type:
    | "login_attempt"
    | "password_change"
    | "suspicious_activity"
    | "data_breach"
    | "rate_limit"
    | "malware_detection";
  severity: "low" | "medium" | "high" | "critical";
  user?: {
    id: string;
    name: string;
    email: string;
  };
  ip: string;
  location: string;
  userAgent: string;
  description: string;
  metadata: Record<string, any>;
  resolved: boolean;
  createdAt: string;
}

interface SecurityStats {
  threats: {
    total: number;
    blocked: number;
    resolved: number;
    pending: number;
  };
  events: {
    total: number;
    today: number;
    thisWeek: number;
    critical: number;
  };
  users: {
    suspicious: number;
    banned: number;
    twoFactorEnabled: number;
  };
  links: {
    flagged: number;
    malicious: number;
    reported: number;
  };
}

export default function AdminSecurityPage() {
  const toast = useToast();
  const [events, setEvents] = useState<SecurityEvent[]>([]);
  const [stats, setStats] = useState<SecurityStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState({
    search: "",
    type: "",
    severity: "",
    resolved: "",
    timeRange: "24h",
  });

  useEffect(() => {
    fetchSecurityData();
  }, [filters]);

  const fetchSecurityData = async () => {
    setLoading(true);
    try {
      const [eventsRes, statsRes] = await Promise.all([
        fetch(
          `/api/admin/security/events?${new URLSearchParams({
            ...filters,
            limit: "50",
          })}`
        ),
        fetch(`/api/admin/security/stats?timeRange=${filters.timeRange}`),
      ]);

      if (eventsRes.ok) {
        const eventsData = await eventsRes.json();
        setEvents(eventsData.data);
      }

      if (statsRes.ok) {
        const statsData = await statsRes.json();
        setStats(statsData.data);
      }
    } catch (error) {
      console.error("Failed to fetch security data:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleEventAction = async (eventId: string, action: string) => {
    try {
      const response = await fetch(
        `/api/admin/security/events/${eventId}/${action}`,
        {
          method: "POST",
        }
      );

      if (response.ok) {
        toast.success(`Event ${action} successfully`);
        fetchSecurityData();
      } else {
        const result = await response.json();
        throw new Error(result.error);
      }
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : `Failed to ${action} event`
      );
    }
  };

  const getSeverityBadge = (severity: string) => {
    const variants = {
      low: "secondary",
      medium: "default",
      high: "destructive",
      critical: "destructive",
    } as const;

    const colors = {
      low: "text-blue-600",
      medium: "text-orange-600",
      high: "text-red-600",
      critical: "text-red-800",
    } as const;

    return (
      <Badge
        variant={variants[severity as keyof typeof variants]}
        className={colors[severity as keyof typeof colors]}
      >
        {severity.toUpperCase()}
      </Badge>
    );
  };

  const getEventIcon = (type: string) => {
    const icons = {
      login_attempt: Lock,
      password_change: Shield,
      suspicious_activity: AlertTriangle,
      data_breach: XCircle,
      rate_limit: Clock,
      malware_detection: Ban,
    } as const;

    return icons[type as keyof typeof icons] || Activity;
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Security Center</h1>
          <p className="text-muted-foreground">
            Monitor security events and manage threats
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button variant="outline" onClick={fetchSecurityData}>
            <RefreshCw className="mr-2 h-4 w-4" />
            Refresh
          </Button>
          <Button variant="outline">
            <Download className="mr-2 h-4 w-4" />
            Export Report
          </Button>
        </div>
      </div>

      {/* Security Stats */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-red-600" />
              <div>
                <p className="text-sm font-medium text-muted-foreground">
                  Threats Detected
                </p>
                <p className="text-2xl font-bold">
                  {formatNumber(stats?.threats.total || 0)}
                </p>
                <p className="text-xs text-red-600">
                  {stats?.threats.pending || 0} pending
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center gap-2">
              <Shield className="h-5 w-5 text-green-600" />
              <div>
                <p className="text-sm font-medium text-muted-foreground">
                  Threats Blocked
                </p>
                <p className="text-2xl font-bold">
                  {formatNumber(stats?.threats.blocked || 0)}
                </p>
                <p className="text-xs text-green-600">
                  {stats?.threats.resolved || 0} resolved
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center gap-2">
              <Activity className="h-5 w-5 text-blue-600" />
              <div>
                <p className="text-sm font-medium text-muted-foreground">
                  Security Events
                </p>
                <p className="text-2xl font-bold">
                  {formatNumber(stats?.events.total || 0)}
                </p>
                <p className="text-xs text-blue-600">
                  {stats?.events.today || 0} today
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center gap-2">
              <UserX className="h-5 w-5 text-orange-600" />
              <div>
                <p className="text-sm font-medium text-muted-foreground">
                  Suspicious Users
                </p>
                <p className="text-2xl font-bold">
                  {formatNumber(stats?.users.suspicious || 0)}
                </p>
                <p className="text-xs text-orange-600">
                  {stats?.users.banned || 0} banned
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Additional Stats */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardContent className="p-6">
            <div className="text-2xl font-bold">
              {formatNumber(stats?.events.critical || 0)}
            </div>
            <div className="text-sm text-muted-foreground">Critical Events</div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="text-2xl font-bold">
              {formatNumber(stats?.users.twoFactorEnabled || 0)}
            </div>
            <div className="text-sm text-muted-foreground">
              2FA Enabled Users
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="text-2xl font-bold">
              {formatNumber(stats?.links.flagged || 0)}
            </div>
            <div className="text-sm text-muted-foreground">Flagged Links</div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="text-2xl font-bold">
              {formatNumber(stats?.links.malicious || 0)}
            </div>
            <div className="text-sm text-muted-foreground">Malicious Links</div>
          </CardContent>
        </Card>
      </div>

      {/* Security Events */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Shield className="h-5 w-5" />
            Security Events
          </CardTitle>
          <CardDescription>
            Recent security events and threat activity
          </CardDescription>
        </CardHeader>
        <CardContent>
          {/* Filters */}
          <div className="grid gap-4 md:grid-cols-6 mb-4">
            <div className="relative">
              <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search events..."
                value={filters.search}
                onChange={(e) =>
                  setFilters({ ...filters, search: e.target.value })
                }
                className="pl-9"
              />
            </div>

            <Select
              value={filters.type}
              onValueChange={(value) => setFilters({ ...filters, type: value })}
            >
              <SelectTrigger>
                <SelectValue placeholder="All types" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="">All types</SelectItem>
                <SelectItem value="login_attempt">Login Attempts</SelectItem>
                <SelectItem value="suspicious_activity">
                  Suspicious Activity
                </SelectItem>
                <SelectItem value="malware_detection">
                  Malware Detection
                </SelectItem>
                <SelectItem value="rate_limit">Rate Limiting</SelectItem>
                <SelectItem value="data_breach">Data Breach</SelectItem>
              </SelectContent>
            </Select>

            <Select
              value={filters.severity}
              onValueChange={(value) =>
                setFilters({ ...filters, severity: value })
              }
            >
              <SelectTrigger>
                <SelectValue placeholder="All severities" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="">All severities</SelectItem>
                <SelectItem value="low">Low</SelectItem>
                <SelectItem value="medium">Medium</SelectItem>
                <SelectItem value="high">High</SelectItem>
                <SelectItem value="critical">Critical</SelectItem>
              </SelectContent>
            </Select>

            <Select
              value={filters.resolved}
              onValueChange={(value) =>
                setFilters({ ...filters, resolved: value })
              }
            >
              <SelectTrigger>
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="">All events</SelectItem>
                <SelectItem value="true">Resolved</SelectItem>
                <SelectItem value="false">Unresolved</SelectItem>
              </SelectContent>
            </Select>

            <Select
              value={filters.timeRange}
              onValueChange={(value) =>
                setFilters({ ...filters, timeRange: value })
              }
            >
              <SelectTrigger>
                <SelectValue placeholder="Time range" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="1h">Last hour</SelectItem>
                <SelectItem value="24h">Last 24 hours</SelectItem>
                <SelectItem value="7d">Last 7 days</SelectItem>
                <SelectItem value="30d">Last 30 days</SelectItem>
              </SelectContent>
            </Select>

            <Button variant="outline" onClick={fetchSecurityData}>
              <Filter className="mr-2 h-4 w-4" />
              Apply
            </Button>
          </div>

          {/* Events Table */}
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Event</TableHead>
                <TableHead>Severity</TableHead>
                <TableHead>User</TableHead>
                <TableHead>Location</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Time</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                Array.from({ length: 5 }).map((_, i) => (
                  <TableRow key={i}>
                    <TableCell colSpan={7}>
                      <div className="h-16 bg-muted animate-pulse rounded" />
                    </TableCell>
                  </TableRow>
                ))
              ) : events.length === 0 ? (
                <TableRow>
                  <TableCell
                    colSpan={7}
                    className="text-center py-8 text-muted-foreground"
                  >
                    No security events found
                  </TableCell>
                </TableRow>
              ) : (
                events.map((event) => {
                  const Icon = getEventIcon(event.type);
                  return (
                    <TableRow key={event.id}>
                      <TableCell>
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-full bg-muted flex items-center justify-center">
                            <Icon className="w-4 h-4" />
                          </div>
                          <div>
                            <div className="font-medium">
                              {event.description}
                            </div>
                            <div className="text-sm text-muted-foreground">
                              {event.type.replace("_", " ").toUpperCase()}
                            </div>
                          </div>
                        </div>
                      </TableCell>

                      <TableCell>{getSeverityBadge(event.severity)}</TableCell>

                      <TableCell>
                        {event.user ? (
                          <div>
                            <div className="font-medium">{event.user.name}</div>
                            <div className="text-sm text-muted-foreground">
                              {event.user.email}
                            </div>
                          </div>
                        ) : (
                          <span className="text-muted-foreground">
                            Anonymous
                          </span>
                        )}
                      </TableCell>

                      <TableCell>
                        <div className="text-sm">
                          <div>{event.location}</div>
                          <div className="text-muted-foreground">
                            {event.ip}
                          </div>
                        </div>
                      </TableCell>

                      <TableCell>
                        <Badge
                          variant={event.resolved ? "default" : "destructive"}
                        >
                          {event.resolved ? (
                            <>
                              <CheckCircle className="w-3 h-3 mr-1" />
                              Resolved
                            </>
                          ) : (
                            <>
                              <AlertTriangle className="w-3 h-3 mr-1" />
                              Active
                            </>
                          )}
                        </Badge>
                      </TableCell>

                      <TableCell>
                        <div className="text-sm">
                          {formatDistanceToNow(new Date(event.createdAt))}
                        </div>
                      </TableCell>

                      <TableCell>
                        <div className="flex items-center gap-1">
                          <Button variant="ghost" size="sm">
                            <Eye className="h-4 w-4" />
                          </Button>
                          {!event.resolved && (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() =>
                                handleEventAction(event.id, "resolve")
                              }
                            >
                              <CheckCircle className="h-4 w-4" />
                            </Button>
                          )}
                          {event.severity === "critical" && (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() =>
                                handleEventAction(event.id, "escalate")
                              }
                            >
                              <Zap className="h-4 w-4" />
                            </Button>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
