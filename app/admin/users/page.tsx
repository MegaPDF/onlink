// ============= app/admin/users/page.tsx (Fixed Select values) =============
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
import { toast } from "sonner";
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
  Users,
  Search,
  Filter,
  MoreHorizontal,
  Edit,
  Ban,
  Shield,
  Mail,
  Calendar,
  UserCheck,
  UserX,
  Crown,
  Trash2,
} from "lucide-react";
import { formatRelativeTime, formatNumber } from "@/lib/utils";
import { User } from "@/types/user";

interface UsersPageData {
  users: User[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
    hasNextPage: boolean;
    hasPrevPage: boolean;
  };
  stats: {
    totalUsers: number;
    activeUsers: number;
    freeUsers: number;
    premiumUsers: number;
    enterpriseUsers: number;
  };
}

// Define special "all" values to replace empty strings
const ALL_PLANS = "all_plans";
const ALL_ROLES = "all_roles";
const ALL_STATUS = "all_status";

export default function AdminUsersPage() {
  const [data, setData] = useState<UsersPageData | null>(null);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [filters, setFilters] = useState({
    role: ALL_ROLES,
    plan: ALL_PLANS,
    status: ALL_STATUS,
    sortBy: "createdAt",
    sortOrder: "desc",
  });
  const [currentPage, setCurrentPage] = useState(1);

  const fetchUsers = useCallback(
    async (page = 1) => {
      try {
        setLoading(true);
        const params = new URLSearchParams({
          page: page.toString(),
          limit: "20",
          search: searchTerm,
          // Convert special "all" values back to empty strings for API
          role: filters.role === ALL_ROLES ? "" : filters.role,
          plan: filters.plan === ALL_PLANS ? "" : filters.plan,
          status: filters.status === ALL_STATUS ? "" : filters.status,
          sortBy: filters.sortBy,
          sortOrder: filters.sortOrder,
        });

        const response = await fetch(`/api/admin/users?${params.toString()}`);
        if (!response.ok) {
          throw new Error("Failed to fetch users");
        }

        const result = await response.json();
        setData(result.data);
        setCurrentPage(page);
      } catch (error) {
        console.error("Error fetching users:", error);
        toast.error("Failed to fetch users. Please try again.");
      } finally {
        setLoading(false);
      }
    },
    [searchTerm, filters, toast]
  );

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    fetchUsers(1);
  };

  const handleUserAction = async (userId: string, action: string) => {
    try {
      const response = await fetch(`/api/admin/users?userId=${userId}`, {
        method: action === "delete" ? "DELETE" : "PUT",
        headers: { "Content-Type": "application/json" },
        body:
          action !== "delete"
            ? JSON.stringify({
                isActive: action === "activate",
                role: action === "promote" ? "admin" : undefined,
              })
            : undefined,
      });

      if (!response.ok) {
        throw new Error(`Failed to ${action} user`);
      }

      toast.success(`User ${action}ed successfully.`);

      fetchUsers(currentPage);
    } catch (error) {
      console.error(`Error ${action}ing user:`, error);
      toast.error(`Failed to ${action} user. Please try again.`);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  useEffect(() => {
    const delayedSearch = setTimeout(() => {
      if (searchTerm !== undefined) {
        fetchUsers(1);
      }
    }, 500);

    return () => clearTimeout(delayedSearch);
  }, [searchTerm, filters]);

  const getPlanBadge = (plan: string) => {
    switch (plan) {
      case "free":
        return <Badge variant="secondary">Free</Badge>;
      case "premium":
        return <Badge variant="default">Premium</Badge>;
      case "enterprise":
        return <Badge variant="destructive">Enterprise</Badge>;
      default:
        return <Badge variant="outline">{plan}</Badge>;
    }
  };

  const getRoleBadge = (role: string) => {
    switch (role) {
      case "admin":
        return <Badge variant="destructive">Admin</Badge>;
      case "moderator":
        return <Badge variant="default">Moderator</Badge>;
      case "user":
        return <Badge variant="secondary">User</Badge>;
      default:
        return <Badge variant="outline">{role}</Badge>;
    }
  };

  const getStatusBadge = (isActive: boolean) => {
    return isActive ? (
      <Badge variant="default" className="bg-green-100 text-green-800">
        Active
      </Badge>
    ) : (
      <Badge variant="secondary" className="bg-red-100 text-red-800">
        Inactive
      </Badge>
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
      <div>
        <h1 className="text-3xl font-bold">Users</h1>
        <p className="text-muted-foreground">
          Manage user accounts and permissions
        </p>
      </div>

      {/* Stats Cards */}
      {data?.stats && (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-5">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Users</CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {formatNumber(data.stats.totalUsers)}
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                Active Users
              </CardTitle>
              <UserCheck className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {formatNumber(data.stats.activeUsers)}
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Free Users</CardTitle>
              <UserX className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {formatNumber(data.stats.freeUsers)}
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                Premium Users
              </CardTitle>
              <Crown className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {formatNumber(data.stats.premiumUsers)}
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Enterprise</CardTitle>
              <Shield className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {formatNumber(data.stats.enterpriseUsers)}
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
                placeholder="Search users..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
            <Select
              value={filters.plan}
              onValueChange={(value) =>
                setFilters((prev) => ({ ...prev, plan: value }))
              }
            >
              <SelectTrigger className="w-32">
                <SelectValue placeholder="Plan" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={ALL_PLANS}>All Plans</SelectItem>
                <SelectItem value="free">Free</SelectItem>
                <SelectItem value="premium">Premium</SelectItem>
                <SelectItem value="enterprise">Enterprise</SelectItem>
              </SelectContent>
            </Select>
            <Select
              value={filters.role}
              onValueChange={(value) =>
                setFilters((prev) => ({ ...prev, role: value }))
              }
            >
              <SelectTrigger className="w-32">
                <SelectValue placeholder="Role" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={ALL_ROLES}>All Roles</SelectItem>
                <SelectItem value="user">User</SelectItem>
                <SelectItem value="admin">Admin</SelectItem>
                <SelectItem value="moderator">Moderator</SelectItem>
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
                <SelectItem value={ALL_STATUS}>All Status</SelectItem>
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

      {/* Users Table */}
      <Card>
        <CardHeader>
          <CardTitle>Users ({data?.pagination.total || 0})</CardTitle>
        </CardHeader>
        <CardContent>
          {data?.users.length === 0 ? (
            <EmptyState
              icon={Users}
              title="No users found"
              description="No users match your current filters."
            />
          ) : (
            <>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>User</TableHead>
                    <TableHead>Plan</TableHead>
                    <TableHead>Role</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Joined</TableHead>
                    <TableHead>Links</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {data?.users.map((user) => (
                    <TableRow key={user._id}>
                      <TableCell>
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-sm font-medium">
                            {user.name.charAt(0).toUpperCase()}
                          </div>
                          <div>
                            <div className="font-medium">{user.name}</div>
                            <div className="text-sm text-muted-foreground">
                              {user.email}
                            </div>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>{getPlanBadge(user.plan)}</TableCell>
                      <TableCell>{getRoleBadge(user.role)}</TableCell>
                      <TableCell>{getStatusBadge(user.isActive)}</TableCell>
                      <TableCell>
                        <div className="text-sm">
                          {formatRelativeTime(user.createdAt)}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="text-sm">
                          {user.usage?.linksCount || 0}
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
                              <Edit className="mr-2 h-4 w-4" />
                              Edit User
                            </DropdownMenuItem>
                            <DropdownMenuItem>
                              <Mail className="mr-2 h-4 w-4" />
                              Send Email
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            {user.isActive ? (
                              <DropdownMenuItem
                                onClick={() =>
                                  handleUserAction(user._id, "deactivate")
                                }
                              >
                                <Ban className="mr-2 h-4 w-4" />
                                Deactivate
                              </DropdownMenuItem>
                            ) : (
                              <DropdownMenuItem
                                onClick={() =>
                                  handleUserAction(user._id, "activate")
                                }
                              >
                                <UserCheck className="mr-2 h-4 w-4" />
                                Activate
                              </DropdownMenuItem>
                            )}
                            {user.role !== "admin" && (
                              <DropdownMenuItem
                                onClick={() =>
                                  handleUserAction(user._id, "promote")
                                }
                              >
                                <Shield className="mr-2 h-4 w-4" />
                                Promote to Admin
                              </DropdownMenuItem>
                            )}
                            <DropdownMenuSeparator />
                            <AlertDialog>
                              <AlertDialogTrigger asChild>
                                <DropdownMenuItem
                                  className="text-red-600"
                                  onSelect={(e) => e.preventDefault()}
                                >
                                  <Trash2 className="mr-2 h-4 w-4" />
                                  Delete User
                                </DropdownMenuItem>
                              </AlertDialogTrigger>
                              <AlertDialogContent>
                                <AlertDialogHeader>
                                  <AlertDialogTitle>
                                    Delete User
                                  </AlertDialogTitle>
                                  <AlertDialogDescription>
                                    Are you sure you want to delete this user?
                                    This action cannot be undone.
                                  </AlertDialogDescription>
                                </AlertDialogHeader>
                                <AlertDialogFooter>
                                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                                  <AlertDialogAction
                                    onClick={() =>
                                      handleUserAction(user._id, "delete")
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
                  ))}
                </TableBody>
              </Table>

              {/* Pagination */}
              {data?.pagination && data.pagination.totalPages > 1 && (
                <div className="flex items-center justify-between space-x-2 py-4">
                  <div className="text-sm text-muted-foreground">
                    Showing {(currentPage - 1) * 20 + 1} to{" "}
                    {Math.min(currentPage * 20, data.pagination.total)} of{" "}
                    {data.pagination.total} users
                  </div>
                  <div className="flex items-center space-x-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => fetchUsers(currentPage - 1)}
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
                      onClick={() => fetchUsers(currentPage + 1)}
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

// ============= Fix for other admin pages with same issue =============

// For app/admin/domains/page.tsx - similar fix needed:
// Replace empty string values with constants like:
const ALL_TYPES = "all_types";
const ALL_STATUSES = "all_statuses";

// For app/admin/billing/page.tsx - similar fix needed:
// Replace empty string values with constants like:
const ALL_BILLING_PLANS = "all_billing_plans";
const ALL_BILLING_STATUSES = "all_billing_statuses";

// For components/dashboard/team-management.tsx - similar fix needed:
// Replace empty string values with constants like:
const ALL_TEAM_ROLES = "all_team_roles";
const ALL_TEAM_STATUSES = "all_team_statuses";
