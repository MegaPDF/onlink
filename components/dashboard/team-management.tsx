"use client";

import React, { useState, useEffect } from "react";
import { useAuth } from "@/hooks/use-auth";
import { useToast } from "@/hooks/use-toast";
import { formatDistanceToNow } from "date-fns";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
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
import {
  Users,
  UserPlus,
  MoreHorizontal,
  Shield,
  Edit,
  Trash2,
  Mail,
  Calendar,
  Settings,
  Crown,
  Eye,
  Clock,
  Ban,
} from "lucide-react";
import { LoadingSpinner } from "@/components/ui/loading-spinner";
import { EmptyState } from "@/components/ui/empty-state";

interface TeamMember {
  userId: string;
  user?: {
    name: string;
    email: string;
    image?: string;
  };
  role: "owner" | "admin" | "member" | "viewer";
  permissions: {
    createLinks: boolean;
    editLinks: boolean;
    deleteLinks: boolean;
    viewAnalytics: boolean;
    manageTeam: boolean;
    manageBilling: boolean;
  };
  joinedAt: Date;
  invitedBy: string;
  status: "active" | "pending" | "suspended";
}

interface Team {
  _id: string;
  name: string;
  description?: string;
  plan: "team" | "enterprise";
  members: TeamMember[];
  usage: {
    membersCount: number;
  };
  limits: {
    maxMembers: number;
  };
}

const defaultPermissions = {
  viewer: {
    createLinks: false,
    editLinks: false,
    deleteLinks: false,
    viewAnalytics: true,
    manageTeam: false,
    manageBilling: false,
  },
  member: {
    createLinks: true,
    editLinks: true,
    deleteLinks: false,
    viewAnalytics: true,
    manageTeam: false,
    manageBilling: false,
  },
  admin: {
    createLinks: true,
    editLinks: true,
    deleteLinks: true,
    viewAnalytics: true,
    manageTeam: true,
    manageBilling: false,
  },
};

export function TeamManagement() {
  const { user } = useAuth();
  const toast = useToast();
  const [team, setTeam] = useState<Team | null>(null);
  const [loading, setLoading] = useState(true);
  const [inviteDialogOpen, setInviteDialogOpen] = useState(false);
  const [editMemberDialogOpen, setEditMemberDialogOpen] = useState(false);
  const [selectedMember, setSelectedMember] = useState<TeamMember | null>(null);
  const [inviteForm, setInviteForm] = useState({
    email: "",
    role: "member" as "admin" | "member" | "viewer",
    permissions: defaultPermissions.member,
  });

  const fetchTeam = async () => {
    try {
      const response = await fetch("/api/client/team");
      const result = await response.json();

      if (response.ok) {
        setTeam(result.data.team);
      } else {
        toast.error("Failed to fetch team data");
      }
    } catch (error) {
      toast.error("Error loading team data");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTeam();
  }, []);

  const handleInvite = async () => {
    try {
      const response = await fetch("/api/client/team", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "invite",
          email: inviteForm.email,
          role: inviteForm.role,
          permissions: inviteForm.permissions,
        }),
      });

      const result = await response.json();

      if (response.ok) {
        toast.success("Invitation sent successfully");
        setInviteDialogOpen(false);
        setInviteForm({
          email: "",
          role: "member",
          permissions: defaultPermissions.member,
        });
        fetchTeam();
      } else {
        toast.error(result.error || "Failed to send invitation");
      }
    } catch (error) {
      toast.error("Error sending invitation");
    }
  };

  const handleUpdateMember = async () => {
    if (!selectedMember) return;

    try {
      const response = await fetch("/api/client/team", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "update",
          memberId: selectedMember.userId,
          updates: {
            role: selectedMember.role,
            permissions: selectedMember.permissions,
          },
        }),
      });

      const result = await response.json();

      if (response.ok) {
        toast.success("Member updated successfully");
        setEditMemberDialogOpen(false);
        setSelectedMember(null);
        fetchTeam();
      } else {
        toast.error(result.error || "Failed to update member");
      }
    } catch (error) {
      toast.error("Error updating member");
    }
  };

  const handleRemoveMember = async (memberId: string) => {
    try {
      const response = await fetch("/api/client/team", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "remove",
          memberId,
        }),
      });

      const result = await response.json();

      if (response.ok) {
        toast.success("Member removed successfully");
        fetchTeam();
      } else {
        toast.error(result.error || "Failed to remove member");
      }
    } catch (error) {
      toast.error("Error removing member");
    }
  };

  const getRoleBadge = (role: string) => {
    const variants = {
      owner: "default",
      admin: "secondary",
      member: "outline",
      viewer: "outline",
    } as const;

    const icons = {
      owner: Crown,
      admin: Shield,
      member: Users,
      viewer: Eye,
    };

    const Icon = icons[role as keyof typeof icons];

    return (
      <Badge variant={variants[role as keyof typeof variants]}>
        <Icon className="w-3 h-3 mr-1" />
        {role.charAt(0).toUpperCase() + role.slice(1)}
      </Badge>
    );
  };

  const getStatusBadge = (status: string) => {
    const variants = {
      active: "default",
      pending: "secondary",
      suspended: "destructive",
    } as const;

    const icons = {
      active: Users,
      pending: Clock,
      suspended: Ban,
    };

    const Icon = icons[status as keyof typeof icons];

    return (
      <Badge variant={variants[status as keyof typeof variants]}>
        <Icon className="w-3 h-3 mr-1" />
        {status.charAt(0).toUpperCase() + status.slice(1)}
      </Badge>
    );
  };

  const canManageMembers = () => {
    if (!user?.team) return false;
    return user.team.role === "owner" || user.team.role === "admin";
  };

  const openEditDialog = (member: TeamMember) => {
    setSelectedMember({ ...member });
    setEditMemberDialogOpen(true);
  };

  const updateSelectedMemberRole = (role: "admin" | "member" | "viewer") => {
    if (!selectedMember) return;
    setSelectedMember({
      ...selectedMember,
      role,
      permissions: defaultPermissions[role],
    });
  };

  const updateSelectedMemberPermission = (
    permission: keyof TeamMember["permissions"],
    value: boolean
  ) => {
    if (!selectedMember) return;
    setSelectedMember({
      ...selectedMember,
      permissions: {
        ...selectedMember.permissions,
        [permission]: value,
      },
    });
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="flex items-center justify-center">
            <LoadingSpinner size="lg" />
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!team) {
    return (
      <Card>
        <CardContent className="p-6">
          <EmptyState
            icon={Users}
            title="Team not found"
            description="You're not a member of any team."
          />
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Team Overview */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Users className="h-5 w-5" />
                {team.name}
              </CardTitle>
              <CardDescription>{team.description}</CardDescription>
            </div>
            <Badge variant="outline" className="text-xs">
              {team.plan.charAt(0).toUpperCase() + team.plan.slice(1)} Plan
            </Badge>
          </div>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between">
            <div className="text-sm text-muted-foreground">
              {team.usage.membersCount} of{" "}
              {team.limits.maxMembers === -1
                ? "unlimited"
                : team.limits.maxMembers}{" "}
              members
            </div>
            {canManageMembers() && (
              <Dialog
                open={inviteDialogOpen}
                onOpenChange={setInviteDialogOpen}
              >
                <DialogTrigger asChild>
                  <Button>
                    <UserPlus className="w-4 h-4 mr-2" />
                    Invite Member
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Invite Team Member</DialogTitle>
                    <DialogDescription>
                      Send an invitation to join your team.
                    </DialogDescription>
                  </DialogHeader>
                  <div className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="email">Email Address</Label>
                      <Input
                        id="email"
                        type="email"
                        placeholder="colleague@company.com"
                        value={inviteForm.email}
                        onChange={(e) =>
                          setInviteForm({
                            ...inviteForm,
                            email: e.target.value,
                          })
                        }
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="role">Role</Label>
                      <Select
                        value={inviteForm.role}
                        onValueChange={(
                          value: "admin" | "member" | "viewer"
                        ) => {
                          setInviteForm({
                            ...inviteForm,
                            role: value,
                            permissions: defaultPermissions[value],
                          });
                        }}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="viewer">Viewer</SelectItem>
                          <SelectItem value="member">Member</SelectItem>
                          <SelectItem value="admin">Admin</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  <DialogFooter>
                    <Button
                      variant="outline"
                      onClick={() => setInviteDialogOpen(false)}
                    >
                      Cancel
                    </Button>
                    <Button onClick={handleInvite} disabled={!inviteForm.email}>
                      Send Invitation
                    </Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Team Members */}
      <Card>
        <CardHeader>
          <CardTitle>Team Members</CardTitle>
          <CardDescription>
            Manage your team members and their permissions
          </CardDescription>
        </CardHeader>
        <CardContent>
          {team.members.length === 0 ? (
            <EmptyState
              icon={Users}
              title="No team members"
              description="Invite your first team member to get started."
            />
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Member</TableHead>
                  <TableHead>Role</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Joined</TableHead>
                  <TableHead className="w-[50px]"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {team.members.map((member) => (
                  <TableRow key={member.userId}>
                    <TableCell>
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
                          <Users className="w-4 h-4" />
                        </div>
                        <div>
                          <div className="font-medium">
                            {member.user?.name || "Unknown User"}
                          </div>
                          <div className="text-sm text-muted-foreground">
                            {member.user?.email}
                          </div>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>{getRoleBadge(member.role)}</TableCell>
                    <TableCell>{getStatusBadge(member.status)}</TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {formatDistanceToNow(new Date(member.joinedAt), {
                        addSuffix: true,
                      })}
                    </TableCell>
                    <TableCell>
                      {canManageMembers() && member.role !== "owner" && (
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon">
                              <MoreHorizontal className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem
                              onClick={() => openEditDialog(member)}
                            >
                              <Edit className="w-4 h-4 mr-2" />
                              Edit Member
                            </DropdownMenuItem>
                            <DropdownMenuItem>
                              <Mail className="w-4 h-4 mr-2" />
                              Resend Invitation
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <AlertDialog>
                              <AlertDialogTrigger asChild>
                                <DropdownMenuItem
                                  className="text-destructive"
                                  onSelect={(e) => e.preventDefault()}
                                >
                                  <Trash2 className="w-4 h-4 mr-2" />
                                  Remove Member
                                </DropdownMenuItem>
                              </AlertDialogTrigger>
                              <AlertDialogContent>
                                <AlertDialogHeader>
                                  <AlertDialogTitle>
                                    Remove Team Member
                                  </AlertDialogTitle>
                                  <AlertDialogDescription>
                                    Are you sure you want to remove{" "}
                                    <strong>{member.user?.name}</strong> from
                                    the team? This action cannot be undone.
                                  </AlertDialogDescription>
                                </AlertDialogHeader>
                                <AlertDialogFooter>
                                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                                  <AlertDialogAction
                                    onClick={() =>
                                      handleRemoveMember(member.userId)
                                    }
                                    className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                                  >
                                    Remove Member
                                  </AlertDialogAction>
                                </AlertDialogFooter>
                              </AlertDialogContent>
                            </AlertDialog>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Edit Member Dialog */}
      <Dialog
        open={editMemberDialogOpen}
        onOpenChange={setEditMemberDialogOpen}
      >
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Edit Team Member</DialogTitle>
            <DialogDescription>
              Update member role and permissions
            </DialogDescription>
          </DialogHeader>
          {selectedMember && (
            <div className="space-y-6">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                  <Users className="w-5 h-5" />
                </div>
                <div>
                  <div className="font-medium">{selectedMember.user?.name}</div>
                  <div className="text-sm text-muted-foreground">
                    {selectedMember.user?.email}
                  </div>
                </div>
              </div>

              <div className="space-y-4">
                <div className="space-y-2">
                  <Label>Role</Label>
                  <Select
                    value={selectedMember.role}
                    onValueChange={updateSelectedMemberRole}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="viewer">Viewer</SelectItem>
                      <SelectItem value="member">Member</SelectItem>
                      <SelectItem value="admin">Admin</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-3">
                  <Label>Permissions</Label>
                  <div className="grid grid-cols-2 gap-4">
                    {Object.entries(selectedMember.permissions).map(
                      ([key, value]) => (
                        <div key={key} className="flex items-center space-x-2">
                          <input
                            type="checkbox"
                            id={key}
                            checked={value}
                            onChange={(e) =>
                              updateSelectedMemberPermission(
                                key as keyof TeamMember["permissions"],
                                e.target.checked
                              )
                            }
                            className="rounded border-gray-300"
                          />
                          <Label htmlFor={key} className="text-sm">
                            {key.replace(/([A-Z])/g, " $1").toLowerCase()}
                          </Label>
                        </div>
                      )
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setEditMemberDialogOpen(false)}
            >
              Cancel
            </Button>
            <Button onClick={handleUpdateMember}>Save Changes</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
