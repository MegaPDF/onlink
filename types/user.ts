// ============= types/user.ts =============
export interface User {
  _id: string;
  name: string;
  email: string;
  image?: string;
  emailVerified?: Date;
  role: 'user' | 'admin' | 'moderator';
  plan: 'free' | 'premium' | 'enterprise';
  
  subscription?: {
    stripeCustomerId?: string;
    stripeSubscriptionId?: string;
    stripePriceId?: string;
    stripeCurrentPeriodEnd?: Date;
    status: 'active' | 'inactive' | 'canceled' | 'past_due';
  };
  
  usage: {
    linksCount: number;
    clicksCount: number;
    monthlyLinks: number;
    monthlyClicks: number;
    resetDate: Date;
    lastUpdated: Date;
  };
  
  preferences: {
    defaultDomain?: string;
    customDomain?: string;
    timezone: string;
    language: string;
    dateFormat: string;
    notifications: {
      email: boolean;
      marketing: boolean;
      security: boolean;
      analytics: boolean;
    };
    privacy: {
      publicProfile: boolean;
      shareAnalytics: boolean;
    };
  };
  
  team?: {
    teamId: string;
    role: 'owner' | 'admin' | 'member' | 'viewer';
    joinedAt: Date;
  };
  
  security: {
    twoFactorEnabled: boolean;
    twoFactorSecret?: string;
    loginAttempts: number;
    lockedUntil?: Date;
    lastPasswordChange?: Date;
    ipWhitelist: string[];
  };
  
  createdAt: Date;
  updatedAt: Date;
  lastLoginAt?: Date;
  lastActiveAt?: Date;
  isActive: boolean;
  isEmailVerified: boolean;
  isDeleted: boolean;
  deletedAt?: Date;
}

export interface UserProfile {
  name: string;
  email: string;
  image?: string;
  timezone: string;
  language: string;
  dateFormat: string;
  bio?: string;
}

export interface UserPreferences {
  defaultDomain?: string;
  customDomain?: string;
  timezone: string;
  language: string;
  dateFormat: string;
  notifications: {
    email: boolean;
    marketing: boolean;
    security: boolean;
    analytics: boolean;
  };
  privacy: {
    publicProfile: boolean;
    shareAnalytics: boolean;
  };
}

export interface UsageSummary {
  plan: 'free' | 'premium' | 'enterprise';
  limits: {
    links: number | 'Unlimited';
    clicks: number | 'Unlimited';
    customDomains: boolean;
    analytics: boolean;
  };
  usage: {
    linksCount: number;
    clicksCount: number;
    monthlyLinks: number;
    monthlyClicks: number;
  };
  percentageUsed: {
    monthlyLinks: number;
    monthlyClicks: number;
  };
  resetDate: Date;
}

export interface UserStats {
  totalUsers: number;
  activeUsers: number;
  newUsersToday: number;
  newUsersThisWeek: number;
  newUsersThisMonth: number;
  usersByPlan: {
    free: number;
    premium: number;
    enterprise: number;
  };
  usersByRole: {
    user: number;
    admin: number;
    moderator: number;
  };
}