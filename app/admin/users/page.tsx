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
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
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
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  Users,
  Search,
  Filter,
  MoreHorizontal,
  UserCheck,
  UserX,
  Shield,
  Edit,
  Trash2,
  Mail,
  Calendar,
  Activity,
  Crown,
  Eye,
  Ban,
  CheckCircle,
  AlertTriangle,
  Download,
  Upload,
  Plus,
  RefreshCw,
} from "lucide-react";
import { formatNumber } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";
import { formatDate, formatDistanceToNow } from "date-fns";

interface User {
  id: string;
  name: string;
  email: string;
  image?: string;
  role: "user" | "admin";
  plan: "free" | "premium" | "team" | "enterprise";
  status: "active" | "suspended" | "pending";
  emailVerified: boolean;
  createdAt: string;
  lastActive: string;
  stats: {
    totalLinks: number;
    totalClicks: number;
    revenue: number;
  };
  subscription?: {
    status: string;
    plan: string;
    nextBilling: string;
  };
}

interface UserFilters {
  search: string;
  role: string;
  plan: string;
  status: string;
  verified: string;
}

export default function AdminUsersPage() {
  const toast = useToast();
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [showUserDialog, setShowUserDialog] = useState(false);
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 20,
    total: 0,
    totalPages: 0,
  });

  const [filters, setFilters] = useState<UserFilters>({
    search: "",
    role: "",
    plan: "",
    status: "",
    verified: "",
  });

  useEffect(() => {
    fetchUsers();
  }, [filters, pagination.page]);

  const fetchUsers = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        page: pagination.page.toString(),
        limit: pagination.limit.toString(),
        ...Object.fromEntries(Object.entries(filters).filter(([_, v]) => v)),
      });

      const response = await fetch(`/api/admin/users?${params}`);
      if (response.ok) {
        const data = await response.json();
        setUsers(data.data.users);
        setPagination((prev) => ({
          ...prev,
          total: data.data.total,
          totalPages: data.data.totalPages,
        }));
      }
    } catch (error) {
      console.error("Failed to fetch users:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleUserAction = async (
    userId: string,
    action: string,
    data?: any
  ) => {
    try {
      const response = await fetch(`/api/admin/users/${userId}/${action}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: data ? JSON.stringify(data) : undefined,
      });

      if (response.ok) {
        toast.success(`User ${action} completed successfully`);
        fetchUsers();
      } else {
        const result = await response.json();
        throw new Error(result.error);
      }
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : `Failed to ${action} user`
      );
    }
  };

  const getStatusBadge = (status: string) => {
    const variants = {
      active: "default",
      suspended: "destructive",
      pending: "secondary",
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
        {plan.charAt(0).toUpperCase() + plan.slice(1)}
      </Badge>
    );
  };

  const openUserDialog = (user: User) => {
    setSelectedUser(user);
    setShowUserDialog(true);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">User Management</h1>
          <p className="text-muted-foreground">
            Manage users, roles, and permissions
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button variant="outline" onClick={fetchUsers}>
            <RefreshCw className="mr-2 h-4 w-4" />
            Refresh
          </Button>
          <Button variant="outline">
            <Download className="mr-2 h-4 w-4" />
            Export
          </Button>
          <Button>
            <Plus className="mr-2 h-4 w-4" />
            Add User
          </Button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center gap-2">
              <Users className="h-5 w-5 text-blue-600" />
              <div>
                <p className="text-sm font-medium text-muted-foreground">
                  Total Users
                </p>
                <p className="text-2xl font-bold">
                  {formatNumber(pagination.total)}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center gap-2">
              <UserCheck className="h-5 w-5 text-green-600" />
              <div>
                <p className="text-sm font-medium text-muted-foreground">
                  Active Users
                </p>
                <p className="text-2xl font-bold">
                  {formatNumber(
                    users.filter((u) => u.status === "active").length
                  )}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center gap-2">
              <Crown className="h-5 w-5 text-purple-600" />
              <div>
                <p className="text-sm font-medium text-muted-foreground">
                  Premium Users
                </p>
                <p className="text-2xl font-bold">
                  {formatNumber(users.filter((u) => u.plan !== "free").length)}
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
                  Suspended
                </p>
                <p className="text-2xl font-bold">
                  {formatNumber(
                    users.filter((u) => u.status === "suspended").length
                  )}
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
                  placeholder="Search users..."
                  value={filters.search}
                  onChange={(e) =>
                    setFilters({ ...filters, search: e.target.value })
                  }
                  className="pl-9"
                />
              </div>
            </div>

            <Select
              value={filters.role}
              onValueChange={(value) => setFilters({ ...filters, role: value })}
            >
              <SelectTrigger>
                <SelectValue placeholder="All roles" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="">All roles</SelectItem>
                <SelectItem value="user">User</SelectItem>
                <SelectItem value="admin">Admin</SelectItem>
              </SelectContent>
            </Select>

            <Select
              value={filters.plan}
              onValueChange={(value) => setFilters({ ...filters, plan: value })}
            >
              <SelectTrigger>
                <SelectValue placeholder="All plans" />
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
                <SelectItem value="suspended">Suspended</SelectItem>
                <SelectItem value="pending">Pending</SelectItem>
              </SelectContent>
            </Select>

            <Select
              value={filters.verified}
              onValueChange={(value) =>
                setFilters({ ...filters, verified: value })
              }
            >
              <SelectTrigger>
                <SelectValue placeholder="Verification" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="">All users</SelectItem>
                <SelectItem value="true">Verified</SelectItem>
                <SelectItem value="false">Unverified</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Users Table */}
      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>User</TableHead>
                <TableHead>Role & Plan</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Stats</TableHead>
                <TableHead>Revenue</TableHead>
                <TableHead>Last Active</TableHead>
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
              ) : users.length === 0 ? (
                <TableRow>
                  <TableCell
                    colSpan={7}
                    className="text-center py-8 text-muted-foreground"
                  >
                    No users found
                  </TableCell>
                </TableRow>
              ) : (
                users.map((user) => (
                  <TableRow key={user.id}>
                    <TableCell>
                      <div className="flex items-center gap-3">
                        <Avatar>
                          <AvatarImage src={user.image} />
                          <AvatarFallback>
                            {user.name?.charAt(0)?.toUpperCase() || "U"}
                          </AvatarFallback>
                        </Avatar>
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="font-medium">{user.name}</span>
                            {user.emailVerified && (
                              <CheckCircle className="h-4 w-4 text-green-600" />
                            )}
                            {user.role === "admin" && (
                              <Shield className="h-4 w-4 text-blue-600" />
                            )}
                          </div>
                          <div className="text-sm text-muted-foreground">
                            {user.email}
                          </div>
                        </div>
                      </div>
                    </TableCell>

                    <TableCell>
                      <div className="space-y-1">
                        <Badge
                          variant={
                            user.role === "admin" ? "default" : "outline"
                          }
                        >
                          {user.role}
                        </Badge>
                        {getPlanBadge(user.plan)}
                      </div>
                    </TableCell>

                    <TableCell>{getStatusBadge(user.status)}</TableCell>

                    <TableCell>
                      <div className="text-sm">
                        <div>{formatNumber(user.stats.totalLinks)} links</div>
                        <div className="text-muted-foreground">
                          {formatNumber(user.stats.totalClicks)} clicks
                        </div>
                      </div>
                    </TableCell>

                    <TableCell>
                      <div className="font-medium">
                        ${user.stats.revenue.toFixed(2)}
                      </div>
                    </TableCell>

                    <TableCell>
                      <div className="text-sm">
                        {formatDistanceToNow(new Date(user.lastActive))}
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
                            onClick={() => openUserDialog(user)}
                          >
                            <Eye className="mr-2 h-4 w-4" />
                            View Details
                          </DropdownMenuItem>
                          <DropdownMenuItem>
                            <Edit className="mr-2 h-4 w-4" />
                            Edit User
                          </DropdownMenuItem>
                          <DropdownMenuItem>
                            <Mail className="mr-2 h-4 w-4" />
                            Send Email
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          {user.status === "active" ? (
                            <DropdownMenuItem
                              onClick={() =>
                                handleUserAction(user.id, "suspend")
                              }
                              className="text-orange-600"
                            >
                              <Ban className="mr-2 h-4 w-4" />
                              Suspend User
                            </DropdownMenuItem>
                          ) : (
                            <DropdownMenuItem
                              onClick={() =>
                                handleUserAction(user.id, "activate")
                              }
                              className="text-green-600"
                            >
                              <UserCheck className="mr-2 h-4 w-4" />
                              Activate User
                            </DropdownMenuItem>
                          )}
                          <AlertDialog>
                            <AlertDialogTrigger asChild>
                              <DropdownMenuItem
                                onSelect={(e) => e.preventDefault()}
                                className="text-red-600"
                              >
                                <Trash2 className="mr-2 h-4 w-4" />
                                Delete User
                              </DropdownMenuItem>
                            </AlertDialogTrigger>
                            <AlertDialogContent>
                              <AlertDialogHeader>
                                <AlertDialogTitle>Delete User</AlertDialogTitle>
                                <AlertDialogDescription>
                                  Are you sure you want to delete {user.name}?
                                  This action cannot be undone.
                                </AlertDialogDescription>
                              </AlertDialogHeader>
                              <AlertDialogFooter>
                                <AlertDialogCancel>Cancel</AlertDialogCancel>
                                <AlertDialogAction
                                  onClick={() =>
                                    handleUserAction(user.id, "delete")
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
          {pagination.total} users
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

      {/* User Details Dialog */}
      {selectedUser && (
        <Dialog open={showUserDialog} onOpenChange={setShowUserDialog}>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>User Details</DialogTitle>
              <DialogDescription>
                Detailed information about {selectedUser.name}
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-6">
              {/* User Info */}
              <div className="flex items-center gap-4">
                <Avatar className="h-16 w-16">
                  <AvatarImage src={selectedUser.image} />
                  <AvatarFallback className="text-lg">
                    {selectedUser.name?.charAt(0)?.toUpperCase() || "U"}
                  </AvatarFallback>
                </Avatar>
                <div>
                  <h3 className="text-lg font-semibold">{selectedUser.name}</h3>
                  <p className="text-muted-foreground">{selectedUser.email}</p>
                  <div className="flex items-center gap-2 mt-1">
                    {getStatusBadge(selectedUser.status)}
                    {getPlanBadge(selectedUser.plan)}
                    {selectedUser.role === "admin" && (
                      <Badge variant="default">Admin</Badge>
                    )}
                  </div>
                </div>
              </div>

              {/* Stats Grid */}
              <div className="grid gap-4 md:grid-cols-3">
                <div className="p-4 border rounded-lg">
                  <div className="text-2xl font-bold">
                    {formatNumber(selectedUser.stats.totalLinks)}
                  </div>
                  <div className="text-sm text-muted-foreground">
                    Total Links
                  </div>
                </div>
                <div className="p-4 border rounded-lg">
                  <div className="text-2xl font-bold">
                    {formatNumber(selectedUser.stats.totalClicks)}
                  </div>
                  <div className="text-sm text-muted-foreground">
                    Total Clicks
                  </div>
                </div>
                <div className="p-4 border rounded-lg">
                  <div className="text-2xl font-bold">
                    ${selectedUser.stats.revenue.toFixed(2)}
                  </div>
                  <div className="text-sm text-muted-foreground">Revenue</div>
                </div>
              </div>

              {/* Account Details */}
              <div className="grid gap-4 md:grid-cols-2">
                <div>
                  <h4 className="font-medium mb-2">Account Information</h4>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span>Email Verified:</span>
                      <span
                        className={
                          selectedUser.emailVerified
                            ? "text-green-600"
                            : "text-red-600"
                        }
                      >
                        {selectedUser.emailVerified ? "Yes" : "No"}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span>Created:</span>
                      <span>{formatDate(selectedUser.createdAt, "yyyy-MM-dd")}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Last Active:</span>
                      <span>
                        {formatDistanceToNow(new Date(selectedUser.lastActive))}
                      </span>
                    </div>
                  </div>
                </div>

                {selectedUser.subscription && (
                  <div>
                    <h4 className="font-medium mb-2">Subscription</h4>
                    <div className="space-y-2 text-sm">
                      <div className="flex justify-between">
                        <span>Status:</span>
                        <Badge variant="outline">
                          {selectedUser.subscription.status}
                        </Badge>
                      </div>
                      <div className="flex justify-between">
                        <span>Plan:</span>
                        <span>{selectedUser.subscription.plan}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Next Billing:</span>
                        <span>
                          {formatDate(selectedUser.subscription.nextBilling, "yyyy-MM-dd")}
                        </span>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>

            <DialogFooter>
              <Button
                variant="outline"
                onClick={() => setShowUserDialog(false)}
              >
                Close
              </Button>
              <Button>Edit User</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}
