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
  Plus,
  Eye,
  EyeOff,
  Copy,
  CheckCircle,
  XCircle,
  RefreshCw,
  Download,
  Upload,
  Settings,
  AlertTriangle,
  Clock,
  Activity,
  TrendingUp,
  Loader2,
} from "lucide-react";

// Types for real API data
interface User {
  _id: string;
  name: string;
  email: string;
  role: "user" | "admin" | "moderator";
  plan: "free" | "premium" | "enterprise";
  isActive: boolean;
  isEmailVerified: boolean;
  createdAt: string;
  updatedAt: string;
  lastLoginAt?: string;
  avatar?: string;
  profilePicture?: string;
}

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
    inactiveUsers: number;
    freeUsers: number;
    premiumUsers: number;
    enterpriseUsers: number;
    adminUsers: number;
    moderatorUsers: number;
  };
}

interface NewUserData {
  name: string;
  email: string;
  role: "user" | "admin" | "moderator";
  plan: "free" | "premium" | "enterprise";
  isActive: boolean;
  isEmailVerified: boolean;
  sendWelcomeEmail: boolean;
  temporaryPassword: string;
}

const ALL_PLANS = "all_plans";
const ALL_ROLES = "all_roles";
const ALL_STATUS = "all_status";

// Utility functions
const formatRelativeTime = (date: Date) => {
  const now = new Date();
  const diffInMs = now.getTime() - date.getTime();
  const diffInHours = diffInMs / (1000 * 60 * 60);
  const diffInDays = diffInMs / (1000 * 60 * 60 * 24);

  if (diffInHours < 1) return "Just now";
  if (diffInHours < 24) return `${Math.floor(diffInHours)}h ago`;
  if (diffInDays < 7) return `${Math.floor(diffInDays)}d ago`;
  return date.toLocaleDateString();
};

const formatNumber = (num: number) => {
  return new Intl.NumberFormat().format(num);
};

const generateSecureToken = (length: number) => {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%^&*';
  let result = '';
  for (let i = 0; i < length; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
};

export default function AdminUsersPage() {
  const [data, setData] = useState<UsersPageData | null>(null);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedUsers, setSelectedUsers] = useState<string[]>([]);
  const [filters, setFilters] = useState({
    role: ALL_ROLES,
    plan: ALL_PLANS,
    status: ALL_STATUS,
    sortBy: "createdAt",
    sortOrder: "desc",
  });
  const [currentPage, setCurrentPage] = useState(1);
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [addingUser, setAddingUser] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [newUser, setNewUser] = useState<NewUserData>({
    name: "",
    email: "",
    role: "user",
    plan: "free",
    isActive: true,
    isEmailVerified: false,
    sendWelcomeEmail: true,
    temporaryPassword: "",
  });

  // Toast notifications (replace with your actual toast implementation)
  const toast = {
    success: (message: string, options?: { duration?: number }) => {
      console.log("Success:", message);
      // Replace with actual toast notification
    },
    error: (message: string) => {
      console.log("Error:", message);
      // Replace with actual toast notification
    },
  };

  // Fetch users from API
  const fetchUsers = useCallback(
    async (page = 1) => {
      try {
        setLoading(true);
        const params = new URLSearchParams({
          page: page.toString(),
          limit: "20",
          search: searchTerm,
          role: filters.role === ALL_ROLES ? "" : filters.role,
          plan: filters.plan === ALL_PLANS ? "" : filters.plan,
          status: filters.status === ALL_STATUS ? "" : filters.status,
          sortBy: filters.sortBy,
          sortOrder: filters.sortOrder,
        });

        const response = await fetch(`/api/admin/users?${params}`);
        const result = await response.json();

        if (!response.ok) {
          throw new Error(result.error || "Failed to fetch users");
        }

        setData(result.data);
        setCurrentPage(page);
      } catch (error) {
        console.error("Error fetching users:", error);
        toast.error("Failed to load users. Please try again.");
      } finally {
        setLoading(false);
      }
    },
    [searchTerm, filters]
  );

  // Load users on component mount and when filters change
  useEffect(() => {
    fetchUsers(1);
  }, [fetchUsers]);

  // Generate password when add dialog opens
  useEffect(() => {
    if (showAddDialog) {
      setNewUser((prev) => ({
        ...prev,
        temporaryPassword: generateSecureToken(12),
      }));
    }
  }, [showAddDialog]);

  // Search handler
  const handleSearch = () => {
    fetchUsers(1);
  };

  // Add new user
  const handleAddUser = async () => {
    if (!newUser.name.trim() || !newUser.email.trim()) {
      toast.error("Name and email are required");
      return;
    }

    try {
      setAddingUser(true);

      const response = await fetch("/api/admin/users", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(newUser),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || "Failed to create user");
      }

      toast.success("User created successfully!");
      setShowAddDialog(false);
      setNewUser({
        name: "",
        email: "",
        role: "user",
        plan: "free",
        isActive: true,
        isEmailVerified: false,
        sendWelcomeEmail: true,
        temporaryPassword: "",
      });
      fetchUsers(currentPage);

      // Show temporary password if created
      if (result.data?.temporaryPassword) {
        toast.success(`Temporary password: ${result.data.temporaryPassword}`, {
          duration: 10000,
        });
      }
    } catch (error) {
      console.error("Error creating user:", error);
      toast.error(
        error instanceof Error ? error.message : "Failed to create user"
      );
    } finally {
      setAddingUser(false);
    }
  };

  // Update user status
  const handleUpdateUserStatus = async (userId: string, isActive: boolean) => {
    try {
      const response = await fetch(`/api/admin/users?userId=${userId}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ isActive }),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || "Failed to update user status");
      }

      toast.success(
        `User ${isActive ? "activated" : "deactivated"} successfully`
      );
      fetchUsers(currentPage);
    } catch (error) {
      console.error("Error updating user status:", error);
      toast.error(
        error instanceof Error ? error.message : "Failed to update user status"
      );
    }
  };

  // Delete user
  const handleDeleteUser = async (userId: string) => {
    try {
      const response = await fetch(`/api/admin/users?userId=${userId}`, {
        method: "DELETE",
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || "Failed to delete user");
      }

      toast.success("User deleted successfully");
      fetchUsers(currentPage);
    } catch (error) {
      console.error("Error deleting user:", error);
      toast.error(
        error instanceof Error ? error.message : "Failed to delete user"
      );
    }
  };

  // Bulk actions
  const handleBulkAction = async (action: string, userIds: string[]) => {
    try {
      const response = await fetch("/api/admin/users/bulk", {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ action, userIds }),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || "Failed to perform bulk action");
      }

      toast.success(`Bulk action completed successfully`);
      setSelectedUsers([]);
      fetchUsers(currentPage);
    } catch (error) {
      console.error("Error performing bulk action:", error);
      toast.error(
        error instanceof Error ? error.message : "Failed to perform bulk action"
      );
    }
  };

  // Export users
  const handleExportUsers = async () => {
    try {
      const response = await fetch("/api/admin/users/export", {
        method: "GET",
        headers: {
          "Accept": "text/csv",
        },
      });

      if (!response.ok) {
        throw new Error("Failed to export users");
      }

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `users-export-${new Date().toISOString().split('T')[0]}.csv`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);

      toast.success("Users exported successfully");
    } catch (error) {
      console.error("Error exporting users:", error);
      toast.error("Failed to export users");
    }
  };

  // Utility functions
  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast.success("Copied to clipboard");
  };

  const generateNewPassword = () => {
    const newPassword = generateSecureToken(12);
    setNewUser((prev) => ({ ...prev, temporaryPassword: newPassword }));
  };

  const getRoleBadgeColor = (role: string) => {
    switch (role) {
      case "admin":
        return "bg-red-100 text-red-800 border-red-200 dark:bg-red-900/20 dark:text-red-400 dark:border-red-800";
      case "moderator":
        return "bg-orange-100 text-orange-800 border-orange-200 dark:bg-orange-900/20 dark:text-orange-400 dark:border-orange-800";
      default:
        return "bg-blue-100 text-blue-800 border-blue-200 dark:bg-blue-900/20 dark:text-blue-400 dark:border-blue-800";
    }
  };

  const getPlanBadgeColor = (plan: string) => {
    switch (plan) {
      case "enterprise":
        return "bg-purple-100 text-purple-800 border-purple-200 dark:bg-purple-900/20 dark:text-purple-400 dark:border-purple-800";
      case "premium":
        return "bg-yellow-100 text-yellow-800 border-yellow-200 dark:bg-yellow-900/20 dark:text-yellow-400 dark:border-yellow-800";
      default:
        return "bg-gray-100 text-gray-800 border-gray-200 dark:bg-gray-900/20 dark:text-gray-400 dark:border-gray-800";
    }
  };

  const getStatusBadge = (isActive: boolean) => {
    return isActive ? (
      <Badge className="bg-green-100 text-green-800 border-green-200 dark:bg-green-900/20 dark:text-green-400 dark:border-green-800">
        <CheckCircle className="w-3 h-3 mr-1" />
        Active
      </Badge>
    ) : (
      <Badge className="bg-red-100 text-red-800 border-red-200 dark:bg-red-900/20 dark:text-red-400 dark:border-red-800">
        <XCircle className="w-3 h-3 mr-1" />
        Inactive
      </Badge>
    );
  };

  const toggleUserSelection = (userId: string) => {
    setSelectedUsers(prev => 
      prev.includes(userId) 
        ? prev.filter(id => id !== userId)
        : [...prev, userId]
    );
  };

  const toggleSelectAll = () => {
    if (!data) return;
    if (selectedUsers.length === data.users.length) {
      setSelectedUsers([]);
    } else {
      setSelectedUsers(data.users.map(user => user._id));
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
          <h3 className="text-lg font-semibold mb-2">Failed to load users</h3>
          <p className="text-muted-foreground mb-4">
            There was an error loading the user data.
          </p>
          <Button onClick={() => fetchUsers(1)}>
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
            <h1 className="text-3xl font-bold tracking-tight">Users</h1>
            <p className="text-muted-foreground">
              Manage user accounts and permissions
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Tooltip>
              <TooltipTrigger asChild>
                <Button variant="outline" size="sm" onClick={handleExportUsers}>
                  <Download className="h-4 w-4 mr-2" />
                  Export
                </Button>
              </TooltipTrigger>
              <TooltipContent>Export user data to CSV</TooltipContent>
            </Tooltip>
            
            <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
              <DialogTrigger asChild>
                <Button>
                  <Plus className="h-4 w-4 mr-2" />
                  Add User
                </Button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-md">
                <DialogHeader>
                  <DialogTitle>Add New User</DialogTitle>
                  <DialogDescription>
                    Create a new user account. A welcome email will be sent with
                    login credentials.
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="name">Name *</Label>
                      <Input
                        id="name"
                        value={newUser.name}
                        onChange={(e) =>
                          setNewUser((prev) => ({ ...prev, name: e.target.value }))
                        }
                        placeholder="Full name"
                        required
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="email">Email *</Label>
                      <Input
                        id="email"
                        type="email"
                        value={newUser.email}
                        onChange={(e) =>
                          setNewUser((prev) => ({ ...prev, email: e.target.value }))
                        }
                        placeholder="user@example.com"
                        required
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="role">Role</Label>
                      <Select
                        value={newUser.role}
                        onValueChange={(value: "user" | "admin" | "moderator") =>
                          setNewUser((prev) => ({ ...prev, role: value }))
                        }
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="user">User</SelectItem>
                          <SelectItem value="moderator">Moderator</SelectItem>
                          <SelectItem value="admin">Admin</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="plan">Plan</Label>
                      <Select
                        value={newUser.plan}
                        onValueChange={(value: "free" | "premium" | "enterprise") =>
                          setNewUser((prev) => ({ ...prev, plan: value }))
                        }
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="free">Free</SelectItem>
                          <SelectItem value="premium">Premium</SelectItem>
                          <SelectItem value="enterprise">Enterprise</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="password">Temporary Password</Label>
                    <div className="flex space-x-2">
                      <div className="relative flex-1">
                        <Input
                          id="password"
                          type={showPassword ? "text" : "password"}
                          value={newUser.temporaryPassword}
                          onChange={(e) =>
                            setNewUser((prev) => ({
                              ...prev,
                              temporaryPassword: e.target.value,
                            }))
                          }
                          placeholder="Auto-generated password"
                        />
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          className="absolute right-0 top-0 h-full px-3 py-2"
                          onClick={() => setShowPassword(!showPassword)}
                        >
                          {showPassword ? (
                            <EyeOff className="h-4 w-4" />
                          ) : (
                            <Eye className="h-4 w-4" />
                          )}
                        </Button>
                      </div>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={generateNewPassword}
                          >
                            <RefreshCw className="h-4 w-4" />
                          </Button>
                        </TooltipTrigger>
                        <TooltipContent>Generate new password</TooltipContent>
                      </Tooltip>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={() => copyToClipboard(newUser.temporaryPassword)}
                          >
                            <Copy className="h-4 w-4" />
                          </Button>
                        </TooltipTrigger>
                        <TooltipContent>Copy password</TooltipContent>
                      </Tooltip>
                    </div>
                  </div>

                  <div className="space-y-3">
                    <div className="flex items-center space-x-2">
                      <Checkbox
                        id="isActive"
                        checked={newUser.isActive}
                        onCheckedChange={(checked) =>
                          setNewUser((prev) => ({ ...prev, isActive: !!checked }))
                        }
                      />
                      <Label htmlFor="isActive">Account is active</Label>
                    </div>

                    <div className="flex items-center space-x-2">
                      <Checkbox
                        id="isEmailVerified"
                        checked={newUser.isEmailVerified}
                        onCheckedChange={(checked) =>
                          setNewUser((prev) => ({
                            ...prev,
                            isEmailVerified: !!checked,
                          }))
                        }
                      />
                      <Label htmlFor="isEmailVerified">Email is verified</Label>
                    </div>

                    <div className="flex items-center space-x-2">
                      <Checkbox
                        id="sendWelcomeEmail"
                        checked={newUser.sendWelcomeEmail}
                        onCheckedChange={(checked) =>
                          setNewUser((prev) => ({
                            ...prev,
                            sendWelcomeEmail: !!checked,
                          }))
                        }
                      />
                      <Label htmlFor="sendWelcomeEmail">Send welcome email</Label>
                    </div>
                  </div>
                </div>
                <DialogFooter>
                  <Button
                    variant="outline"
                    onClick={() => setShowAddDialog(false)}
                    disabled={addingUser}
                  >
                    Cancel
                  </Button>
                  <Button
                    onClick={handleAddUser}
                    disabled={
                      addingUser || !newUser.name.trim() || !newUser.email.trim()
                    }
                  >
                    {addingUser && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                    Create User
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
                <CardTitle className="text-sm font-medium">Total Users</CardTitle>
                <Users className="h-4 w-4 text-blue-600" />
              </CardHeader>
              <CardContent className="relative">
                <div className="text-2xl font-bold text-blue-600">
                  {formatNumber(data.stats.totalUsers)}
                </div>
                <div className="flex items-center text-xs text-muted-foreground mt-1">
                  <TrendingUp className="h-3 w-3 mr-1" />
                  <span className="text-green-600">+12%</span>
                  <span className="ml-1">from last month</span>
                </div>
              </CardContent>
            </Card>

            <Card className="relative overflow-hidden">
              <div className="absolute inset-0 bg-gradient-to-br from-green-50 to-green-100 dark:from-green-950/20 dark:to-green-900/20"></div>
              <CardHeader className="relative flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Active Users</CardTitle>
                <UserCheck className="h-4 w-4 text-green-600" />
              </CardHeader>
              <CardContent className="relative">
                <div className="text-2xl font-bold text-green-600">
                  {formatNumber(data.stats.activeUsers)}
                </div>
                <p className="text-xs text-muted-foreground">
                  {data.stats.inactiveUsers} inactive
                </p>
              </CardContent>
            </Card>

            <Card className="relative overflow-hidden">
              <div className="absolute inset-0 bg-gradient-to-br from-yellow-50 to-yellow-100 dark:from-yellow-950/20 dark:to-yellow-900/20"></div>
              <CardHeader className="relative flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Premium Users</CardTitle>
                <Crown className="h-4 w-4 text-yellow-600" />
              </CardHeader>
              <CardContent className="relative">
                <div className="text-2xl font-bold text-yellow-600">
                  {formatNumber(data.stats.premiumUsers + data.stats.enterpriseUsers)}
                </div>
                <p className="text-xs text-muted-foreground">
                  {data.stats.freeUsers} free users
                </p>
              </CardContent>
            </Card>

            <Card className="relative overflow-hidden">
              <div className="absolute inset-0 bg-gradient-to-br from-red-50 to-red-100 dark:from-red-950/20 dark:to-red-900/20"></div>
              <CardHeader className="relative flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Admin Users</CardTitle>
                <Shield className="h-4 w-4 text-red-600" />
              </CardHeader>
              <CardContent className="relative">
                <div className="text-2xl font-bold text-red-600">
                  {formatNumber(data.stats.adminUsers)}
                </div>
                <p className="text-xs text-muted-foreground">
                  {data.stats.moderatorUsers} moderators
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
                    placeholder="Search by name or email..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10"
                  />
                </div>
              </div>
              
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

              <Button onClick={handleSearch} variant="outline">
                <Filter className="h-4 w-4 mr-2" />
                Filter
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Bulk Actions */}
        {selectedUsers.length > 0 && (
          <Card className="bg-blue-50 dark:bg-blue-950/20 border-blue-200 dark:border-blue-800">
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <CheckCircle className="h-5 w-5 text-blue-600" />
                  <span className="font-medium text-blue-800 dark:text-blue-200">
                    {selectedUsers.length} user{selectedUsers.length > 1 ? 's' : ''} selected
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <Button 
                    variant="outline" 
                    size="sm"
                    onClick={() => handleBulkAction('email', selectedUsers)}
                  >
                    <Mail className="h-4 w-4 mr-2" />
                    Send Email
                  </Button>
                  <Button 
                    variant="outline" 
                    size="sm"
                    onClick={() => handleBulkAction('deactivate', selectedUsers)}
                  >
                    <Ban className="h-4 w-4 mr-2" />
                    Deactivate
                  </Button>
                  <Button 
                    variant="outline" 
                    size="sm" 
                    className="text-red-600"
                    onClick={() => handleBulkAction('delete', selectedUsers)}
                  >
                    <Trash2 className="h-4 w-4 mr-2" />
                    Delete
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Users Table */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>Users ({data ? formatNumber(data.pagination.total) : '0'})</CardTitle>
                <CardDescription>
                  Manage and view all user accounts in your system
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
            {!data || data.users.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12">
                <Users className="h-12 w-12 text-muted-foreground mb-4" />
                <h3 className="text-lg font-semibold mb-2">No users found</h3>
                <p className="text-muted-foreground">
                  {!data ? "Loading users..." : "No users match your current filters."}
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
                            checked={data.users.length > 0 && selectedUsers.length === data.users.length}
                            onCheckedChange={toggleSelectAll}
                           // indeterminate={selectedUsers.length > 0 && selectedUsers.length < data.users.length}
                          />
                        </TableHead>
                        <TableHead>User</TableHead>
                        <TableHead>Role</TableHead>
                        <TableHead>Plan</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Last Login</TableHead>
                        <TableHead>Created</TableHead>
                        <TableHead className="w-[50px]"></TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {data.users.map((user) => (
                        <TableRow key={user._id} className="group">
                          <TableCell>
                            <Checkbox
                              checked={selectedUsers.includes(user._id)}
                              onCheckedChange={() => toggleUserSelection(user._id)}
                            />
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center space-x-3">
                              <div className="h-8 w-8 rounded-full bg-gradient-to-br from-blue-400 to-blue-600 flex items-center justify-center text-white text-sm font-medium">
                                {user.name.charAt(0).toUpperCase()}
                              </div>
                              <div className="space-y-1">
                                <div className="font-medium">{user.name}</div>
                                <div className="text-sm text-muted-foreground flex items-center gap-2">
                                  {user.email}
                                  {user.isEmailVerified && (
                                    <Tooltip>
                                      <TooltipTrigger>
                                        <CheckCircle className="h-3 w-3 text-green-600" />
                                      </TooltipTrigger>
                                      <TooltipContent>Email verified</TooltipContent>
                                    </Tooltip>
                                  )}
                                </div>
                              </div>
                            </div>
                          </TableCell>
                          <TableCell>
                            <Badge className={getRoleBadgeColor(user.role)}>
                              {user.role === 'admin' && <Shield className="w-3 h-3 mr-1" />}
                              {user.role === 'moderator' && <UserCheck className="w-3 h-3 mr-1" />}
                              {user.role}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <Badge className={getPlanBadgeColor(user.plan)}>
                              {user.plan === 'enterprise' && <Crown className="w-3 h-3 mr-1" />}
                              {user.plan}
                            </Badge>
                          </TableCell>
                          <TableCell>{getStatusBadge(user.isActive)}</TableCell>
                          <TableCell>
                            <div className="flex items-center text-sm text-muted-foreground">
                              <Clock className="h-3 w-3 mr-1" />
                              {user.lastLoginAt 
                                ? formatRelativeTime(new Date(user.lastLoginAt))
                                : "Never"
                              }
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="text-sm">
                              {formatRelativeTime(new Date(user.createdAt))}
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
                                <DropdownMenuItem
                                  onClick={() => copyToClipboard(user.email)}
                                >
                                  <Mail className="mr-2 h-4 w-4" />
                                  Copy Email
                                </DropdownMenuItem>
                                <DropdownMenuItem>
                                  <Eye className="mr-2 h-4 w-4" />
                                  View Profile
                                </DropdownMenuItem>
                                <DropdownMenuItem>
                                  <Edit className="mr-2 h-4 w-4" />
                                  Edit User
                                </DropdownMenuItem>
                                <DropdownMenuSeparator />
                                {user.isActive ? (
                                  <DropdownMenuItem
                                    onClick={() =>
                                      handleUpdateUserStatus(user._id, false)
                                    }
                                    className="text-orange-600"
                                  >
                                    <Ban className="mr-2 h-4 w-4" />
                                    Deactivate
                                  </DropdownMenuItem>
                                ) : (
                                  <DropdownMenuItem
                                    onClick={() =>
                                      handleUpdateUserStatus(user._id, true)
                                    }
                                    className="text-green-600"
                                  >
                                    <UserCheck className="mr-2 h-4 w-4" />
                                    Activate
                                  </DropdownMenuItem>
                                )}
                                <DropdownMenuSeparator />
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
                                      <AlertDialogTitle className="flex items-center gap-2">
                                        <AlertTriangle className="h-5 w-5 text-red-600" />
                                        Delete User Account
                                      </AlertDialogTitle>
                                      <AlertDialogDescription>
                                        Are you sure you want to delete <strong>{user.name}</strong>'s account? 
                                        This action cannot be undone and will permanently delete their account 
                                        and all associated data.
                                      </AlertDialogDescription>
                                    </AlertDialogHeader>
                                    <AlertDialogFooter>
                                      <AlertDialogCancel>Cancel</AlertDialogCancel>
                                      <AlertDialogAction
                                        onClick={() => handleDeleteUser(user._id)}
                                        className="bg-red-600 hover:bg-red-700"
                                      >
                                        Delete Account
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
                      Showing <strong>{((data.pagination.page - 1) * data.pagination.limit) + 1}</strong> to{" "}
                      <strong>{Math.min(data.pagination.page * data.pagination.limit, data.pagination.total)}</strong> of{" "}
                      <strong>{data.pagination.total}</strong> results
                    </div>
                    <div className="flex items-center space-x-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => fetchUsers(currentPage - 1)}
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
                              onClick={() => fetchUsers(page)}
                            >
                              {page}
                            </Button>
                          );
                        })}
                      </div>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => fetchUsers(currentPage + 1)}
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