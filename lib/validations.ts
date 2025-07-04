// ============= lib/validations.ts =============
import { z } from 'zod';

// Auth validations
export const LoginSchema = z.object({
  email: z.string().email('Invalid email address').max(255),
  password: z.string().min(1, 'Password is required'),
  remember: z.boolean().optional()
});

export const SignupSchema = z.object({
  name: z.string().min(1, 'Name is required').max(100),
  email: z.string().email('Invalid email address').max(255),
  password: z.string()
    .min(8, 'Password must be at least 8 characters')
    .max(128, 'Password is too long')
    .regex(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/, 'Password must contain uppercase, lowercase, and number'),
  confirmPassword: z.string(),
  acceptTerms: z.boolean().refine(val => val === true, 'You must accept the terms')
}).refine(data => data.password === data.confirmPassword, {
  message: "Passwords don't match",
  path: ["confirmPassword"]
});

export const ForgotPasswordSchema = z.object({
  email: z.string().email('Invalid email address')
});

export const ResetPasswordSchema = z.object({
  token: z.string().min(1, 'Token is required'),
  password: z.string()
    .min(8, 'Password must be at least 8 characters')
    .regex(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/, 'Password must contain uppercase, lowercase, and number'),
  confirmPassword: z.string()
}).refine(data => data.password === data.confirmPassword, {
  message: "Passwords don't match",
  path: ["confirmPassword"]
});

// URL validations
export const CreateURLSchema = z.object({
  originalUrl: z.string()
    .url('Invalid URL format')
    .max(2048, 'URL is too long')
    .refine(url => {
      try {
        const parsed = new URL(url);
        return ['http:', 'https:'].includes(parsed.protocol);
      } catch {
        return false;
      }
    }, 'Only HTTP and HTTPS URLs are allowed'),
  
  customSlug: z.string()
    .min(3, 'Custom slug must be at least 3 characters')
    .max(50, 'Custom slug is too long')
    .regex(/^[a-zA-Z0-9-_]+$/, 'Custom slug can only contain letters, numbers, hyphens, and underscores')
    .optional(),
  
  folderId: z.string().regex(/^[0-9a-fA-F]{24}$/, 'Invalid folder ID').optional(),
  
  title: z.string().max(200, 'Title is too long').optional(),
  description: z.string().max(500, 'Description is too long').optional(),
  
  tags: z.array(z.string().max(50)).max(10, 'Maximum 10 tags allowed').default([]),
  
  expiresAt: z.string().datetime().optional(),
  clickLimit: z.number().positive('Click limit must be positive').optional(),
  
  isPasswordProtected: z.boolean().default(false),
  password: z.string().min(4, 'Password must be at least 4 characters').max(128).optional(),
  
  geoRestrictions: z.object({
    type: z.enum(['allow', 'block']),
    countries: z.array(z.string().length(2, 'Invalid country code'))
  }).optional(),
  
  deviceRestrictions: z.object({
    mobile: z.boolean().default(true),
    desktop: z.boolean().default(true),
    tablet: z.boolean().default(true)
  }).optional(),
  
  utmParameters: z.object({
    source: z.string().max(100).optional(),
    medium: z.string().max(100).optional(),
    campaign: z.string().max(100).optional(),
    term: z.string().max(100).optional(),
    content: z.string().max(100).optional()
  }).optional()
}).refine(data => {
  if (data.isPasswordProtected && !data.password) {
    return false;
  }
  return true;
}, {
  message: "Password is required when password protection is enabled",
  path: ["password"]
});

export const BulkURLSchema = z.object({
  urls: z.array(z.string().url()).min(1, 'At least one URL is required').max(100, 'Maximum 100 URLs allowed'),
  folderId: z.string().regex(/^[0-9a-fA-F]{24}$/).optional(),
  tags: z.array(z.string().max(50)).max(10).default([])
});

// Folder validations
export const CreateFolderSchema = z.object({
  name: z.string().min(1, 'Folder name is required').max(100, 'Folder name is too long'),
  description: z.string().max(500, 'Description is too long').optional(),
  color: z.string().regex(/^#[0-9A-F]{6}$/i, 'Invalid color format').default('#3B82F6'),
  icon: z.string().max(50).optional(),
  parentId: z.string().regex(/^[0-9a-fA-F]{24}$/, 'Invalid parent folder ID').optional()
});

// Team validations
export const CreateTeamSchema = z.object({
  name: z.string().min(1, 'Team name is required').max(100, 'Team name is too long'),
  description: z.string().max(500, 'Description is too long').optional(),
  slug: z.string()
    .min(3, 'Slug must be at least 3 characters')
    .max(50, 'Slug is too long')
    .regex(/^[a-z0-9-]+$/, 'Slug can only contain lowercase letters, numbers, and hyphens')
    .refine(slug => !slug.startsWith('-') && !slug.endsWith('-'), 'Slug cannot start or end with hyphen'),
  plan: z.enum(['team', 'enterprise']).default('team')
});

export const InviteMemberSchema = z.object({
  email: z.string().email('Invalid email address'),
  role: z.enum(['admin', 'member', 'viewer']),
  permissions: z.object({
    createLinks: z.boolean().default(true),
    editLinks: z.boolean().default(true),
    deleteLinks: z.boolean().default(false),
    viewAnalytics: z.boolean().default(true),
    manageTeam: z.boolean().default(false),
    manageBilling: z.boolean().default(false)
  }).optional()
});

// Domain validations
export const CreateDomainSchema = z.object({
  domain: z.string()
    .min(3, 'Domain must be at least 3 characters')
    .max(255, 'Domain is too long')
    .regex(/^[a-z0-9.-]+\.[a-z]{2,}$/, 'Invalid domain format')
    .refine(domain => {
      const parts = domain.split('.');
      return parts.every(part => part.length > 0 && part.length <= 63);
    }, 'Invalid domain format'),
  type: z.enum(['system', 'custom', 'subdomain']),
  verificationMethod: z.enum(['dns', 'file', 'meta']).default('dns')
});

// Settings validations
export const UpdateSettingsSchema = z.object({
  system: z.object({
    appName: z.string().min(1).max(100).optional(),
    appDescription: z.string().max(500).optional(),
    supportEmail: z.string().email().optional(),
    
    smtp: z.object({
      host: z.string().min(1).optional(),
      port: z.number().min(1).max(65535).optional(),
      secure: z.boolean().optional(),
      username: z.string().optional(),
      password: z.string().optional(),
      fromName: z.string().optional(),
      fromEmail: z.string().email().optional()
    }).optional(),
    
    security: z.object({
      maxLoginAttempts: z.number().min(1).max(10).optional(),
      lockoutDuration: z.number().min(5).max(1440).optional(),
      sessionTimeout: z.number().min(30).max(10080).optional(),
      passwordMinLength: z.number().min(6).max(32).optional(),
      requireEmailVerification: z.boolean().optional(),
      enableTwoFactor: z.boolean().optional()
    }).optional()
  }).optional(),
  
  features: z.object({
    enableSignup: z.boolean().optional(),
    enableTeams: z.boolean().optional(),
    enableCustomDomains: z.boolean().optional(),
    enableQRCodes: z.boolean().optional(),
    enableBulkOperations: z.boolean().optional(),
    enableAPIAccess: z.boolean().optional(),
    enableWhiteLabel: z.boolean().optional(),
    maintenanceMode: z.boolean().optional()
  }).optional()
});

// User profile validations
export const UpdateProfileSchema = z.object({
  name: z.string().min(1, 'Name is required').max(100),
  image: z.string().url().optional(),
  timezone: z.string().max(50).default('UTC'),
  language: z.string().length(2).default('en'),
  dateFormat: z.string().max(20).default('MM/DD/YYYY'),
  bio: z.string().max(500).optional()
});

export const UpdatePreferencesSchema = z.object({
  defaultDomain: z.string().optional(),
  customDomain: z.string().optional(),
  timezone: z.string().max(50),
  language: z.string().length(2),
  dateFormat: z.string().max(20),
  notifications: z.object({
    email: z.boolean(),
    marketing: z.boolean(),
    security: z.boolean(),
    analytics: z.boolean()
  }),
  privacy: z.object({
    publicProfile: z.boolean(),
    shareAnalytics: z.boolean()
  })
});

// QR Code validations
export const QRCodeSchema = z.object({
  shortCode: z.string().min(1, 'Short code is required'),
  size: z.number().min(100).max(1000).default(200),
  color: z.string().regex(/^#[0-9A-F]{6}$/i).default('#000000'),
  backgroundColor: z.string().regex(/^#[0-9A-F]{6}$/i).default('#FFFFFF'),
  logo: z.string().url().optional(),
  format: z.enum(['png', 'svg', 'pdf']).default('png')
});
