// ============= types/team.ts =============
export interface Team {
  _id: string;
  name: string;
  description?: string;
  slug: string;
  logo?: string;
  ownerId: string;
  
  members: {
    userId: string;
    role: 'owner' | 'admin' | 'member' | 'viewer';
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
    status: 'active' | 'pending' | 'suspended';
  }[];
  
  plan: 'team' | 'enterprise';
  billing: {
    stripeCustomerId?: string;
    stripeSubscriptionId?: string;
    stripePriceId?: string;
    billingEmail: string;
    billingAddress?: {
      line1: string;
      line2?: string;
      city: string;
      state: string;
      postal_code: string;
      country: string;
    };
  };
  
  settings: {
    defaultDomain?: string;
    customDomains: string[];
    allowCustomDomains: boolean;
    requireApproval: boolean;
    maxMembers: number;
    linkRetention: number;
    enforceSSO: boolean;
    allowGuestLinks: boolean;
    branding: {
      primaryColor?: string;
      logo?: string;
      customCss?: string;
    };
  };
  
  usage: {
    linksCount: number;
    clicksCount: number;
    membersCount: number;
    storageUsed: number;
    lastUpdated: Date;
  };
  
  limits: {
    maxMembers: number;
    maxLinks: number;
    maxClicks: number;
    maxStorage: number;
    customDomains: number;
  };
  
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
  isDeleted: boolean;
  deletedAt?: Date;
}

export interface TeamMember {
  userId: string;
  user?: {
    name: string;
    email: string;
    image?: string;
  };
  role: 'owner' | 'admin' | 'member' | 'viewer';
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
  status: 'active' | 'pending' | 'suspended';
}

export interface TeamInvitation {
  _id: string;
  teamId: string;
  teamName: string;
  email: string;
  role: 'admin' | 'member' | 'viewer';
  invitedBy: string;
  inviterName: string;
  token: string;
  expiresAt: Date;
  status: 'pending' | 'accepted' | 'declined' | 'expired';
  createdAt: Date;
}

export interface CreateTeamRequest {
  name: string;
  description?: string;
  slug: string;
  plan: 'team' | 'enterprise';
}

export interface UpdateTeamRequest {
  name?: string;
  description?: string;
  logo?: string;
  settings?: Partial<Team['settings']>;
}

export interface InviteMemberRequest {
  email: string;
  role: 'admin' | 'member' | 'viewer';
  permissions?: Partial<TeamMember['permissions']>;
}

export interface UpdateMemberRequest {
  role?: 'admin' | 'member' | 'viewer';
  permissions?: Partial<TeamMember['permissions']>;
  status?: 'active' | 'suspended';
}

export interface TeamStats {
  totalTeams: number;
  activeTeams: number;
  teamsCreatedToday: number;
  teamsCreatedThisWeek: number;
  teamsCreatedThisMonth: number;
  totalMembers: number;
  averageMembersPerTeam: number;
  teamsByPlan: {
    team: number;
    enterprise: number;
  };
}
