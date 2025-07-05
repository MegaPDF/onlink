import { z } from 'zod';

// Domain validation schema
export const CreateDomainSchema = z.object({
  domain: z
    .string()
    .min(1, 'Domain is required')
    .max(253, 'Domain name too long')
    .regex(
      /^(localhost:\d+|[a-z0-9.-]+\.[a-z]{2,})$/i,
      'Invalid domain format. Examples: example.com, localhost:3000'
    )
    .transform(val => val.toLowerCase().trim()),
  
  type: z.enum(['system', 'custom', 'subdomain'], {
    errorMap: () => ({ message: 'Type must be system, custom, or subdomain' })
  }),
  
  verificationMethod: z
    .enum(['dns', 'file', 'meta'])
    .default('dns')
    .optional(),
  
  sslProvider: z
    .enum(['letsencrypt', 'cloudflare', 'custom'])
    .default('letsencrypt')
    .optional(),
  
  autoRenew: z
    .boolean()
    .default(true)
    .optional(),
  
  // Additional settings for advanced configuration
  settings: z.object({
    forceHttps: z.boolean().default(true).optional(),
    enableCompression: z.boolean().default(true).optional(),
    redirectType: z.enum(['301', '302']).default('301').optional(),
    cacheControl: z.string().default('public, max-age=3600').optional(),
    rateLimiting: z.object({
      enabled: z.boolean().default(true).optional(),
      requestsPerMinute: z.number().min(1).max(1000).default(60).optional()
    }).optional()
  }).optional()
});

// Domain update schema
export const UpdateDomainSchema = z.object({
  isActive: z.boolean().optional(),
  isVerified: z.boolean().optional(),
  action: z.enum(['verify', 'activate', 'deactivate']).optional(),
  settings: z.object({
    forceHttps: z.boolean().optional(),
    enableCompression: z.boolean().optional(),
    redirectType: z.enum(['301', '302']).optional(),
    cacheControl: z.string().optional(),
    security: z.object({
      enableCaptcha: z.boolean().optional(),
      ipWhitelist: z.array(z.string().ip()).optional(),
      ipBlacklist: z.array(z.string().ip()).optional(),
      rateLimiting: z.object({
        enabled: z.boolean().optional(),
        requestsPerMinute: z.number().min(1).max(1000).optional()
      }).optional()
    }).optional()
  }).optional()
});

// Bulk operation schema
export const BulkDomainOperationSchema = z.object({
  action: z.enum([
    'activate',
    'deactivate', 
    'verify',
    'delete',
    'force_https',
    'disable_https'
  ]),
  domainIds: z
    .array(z.string().regex(/^[0-9a-fA-F]{24}$/, 'Invalid domain ID format'))
    .min(1, 'At least one domain ID is required')
    .max(100, 'Maximum 100 domains can be processed at once')
});

// Domain query filters schema
export const DomainQuerySchema = z.object({
  page: z.coerce.number().min(1).default(1),
  limit: z.coerce.number().min(1).max(100).default(20),
  search: z.string().optional(),
  type: z.enum(['system', 'custom', 'subdomain', 'all_types']).optional(),
  status: z.enum(['active', 'inactive', 'all_statuses']).optional(),
  verification: z.enum(['verified', 'unverified', 'all_verification']).optional(),
  sortBy: z.enum([
    'domain', 
    'type', 
    'isActive', 
    'isVerified', 
    'createdAt', 
    'updatedAt',
    'usage.linksCount',
    'usage.clicksCount'
  ]).default('createdAt'),
  sortOrder: z.enum(['asc', 'desc']).default('desc')
});

// DNS record validation
export const DNSRecordSchema = z.object({
  type: z.enum(['A', 'CNAME', 'TXT']),
  name: z.string().min(1, 'DNS record name is required'),
  value: z.string().min(1, 'DNS record value is required'),
  ttl: z.number().min(60).max(86400).default(3600).optional()
});

// SSL configuration schema
export const SSLConfigSchema = z.object({
  provider: z.enum(['letsencrypt', 'cloudflare', 'custom']),
  autoRenew: z.boolean().default(true),
  customCert: z.object({
    certificate: z.string().optional(),
    privateKey: z.string().optional(),
    chain: z.string().optional()
  }).optional()
});

// Export validation functions
export function validateCreateDomain(data: unknown) {
  return CreateDomainSchema.parse(data);
}

export function validateUpdateDomain(data: unknown) {
  return UpdateDomainSchema.parse(data);
}

export function validateBulkOperation(data: unknown) {
  return BulkDomainOperationSchema.parse(data);
}

export function validateDomainQuery(data: unknown) {
  return DomainQuerySchema.parse(data);
}

// Domain name validation utility
export function isValidDomainName(domain: string): boolean {
  const domainRegex = /^(localhost:\d+|[a-z0-9.-]+\.[a-z]{2,})$/i;
  return domainRegex.test(domain);
}

// Check if domain is available (not in use)
export async function isDomainAvailable(domain: string): Promise<boolean> {
  try {
    const { Domain } = await import('@/models/Domain');
    await import('@/lib/mongodb').then(({ connectDB }) => connectDB());
    
    const existingDomain = await Domain.findOne({
      domain: domain.toLowerCase().trim(),
      isDeleted: { $ne: true }
    });
    
    return !existingDomain;
  } catch (error) {
    console.error('Error checking domain availability:', error);
    return false;
  }
}

// Generate verification code
export function generateVerificationCode(): string {
  const { nanoid } = require('nanoid');
  return nanoid(32);
}

// Type exports
export type CreateDomainInput = z.infer<typeof CreateDomainSchema>;
export type UpdateDomainInput = z.infer<typeof UpdateDomainSchema>;
export type BulkDomainOperationInput = z.infer<typeof BulkDomainOperationSchema>;
export type DomainQueryInput = z.infer<typeof DomainQuerySchema>;
export type DNSRecordInput = z.infer<typeof DNSRecordSchema>;
export type SSLConfigInput = z.infer<typeof SSLConfigSchema>;