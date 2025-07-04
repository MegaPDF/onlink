// ============= types/auth.ts =============
export interface LoginCredentials {
  email: string;
  password: string;
  remember?: boolean;
}

export interface SignupData {
  name: string;
  email: string;
  password: string;
  confirmPassword: string;
  plan?: 'free' | 'premium' | 'enterprise';
  acceptTerms: boolean;
}

export interface AuthUser {
  id: string;
  name: string;
  email: string;
  image?: string;
  role: 'user' | 'admin' | 'moderator';
  plan: 'free' | 'premium' | 'enterprise';
  emailVerified?: Date;
  isActive: boolean;
  team?: {
    teamId: string;
    role: 'owner' | 'admin' | 'member' | 'viewer';
    joinedAt: Date;
  };
}

export interface SessionData {
  user: AuthUser;
  expires: string;
  accessToken?: string;
  refreshToken?: string;
}

export interface AuthResponse {
  success: boolean;
  message: string;
  user?: AuthUser;
  token?: string;
  redirectUrl?: string;
}

export interface PasswordResetRequest {
  email: string;
}

export interface PasswordResetData {
  token: string;
  password: string;
  confirmPassword: string;
}

export interface TwoFactorSetup {
  secret: string;
  qrCode: string;
  backupCodes: string[];
}

export interface TwoFactorVerification {
  token: string;
  code: string;
}

export interface LoginAttempt {
  email: string;
  ip: string;
  userAgent: string;
  success: boolean;
  timestamp: Date;
  failureReason?: string;
}

export interface SecuritySettings {
  twoFactorEnabled: boolean;
  loginAttempts: number;
  lockedUntil?: Date;
  lastPasswordChange?: Date;
  ipWhitelist: string[];
}
