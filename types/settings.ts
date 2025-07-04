
// ============= types/settings.ts =============
export interface Settings {
  _id: string;
  
  system: {
    appName: string;
    appDescription: string;
    appUrl: string;
    supportEmail: string;
    
    smtp: {
      host: string;
      port: number;
      secure: boolean;
      username: string;
      password: string;
      fromName: string;
      fromEmail: string;
    };
    
    security: {
      enforceSSL: boolean;
      maxLoginAttempts: number;
      lockoutDuration: number;
      sessionTimeout: number;
      passwordMinLength: number;
      requireEmailVerification: boolean;
      enableTwoFactor: boolean;
    };
    
    rateLimiting: {
      enabled: boolean;
      windowMs: number;
      maxRequests: number;
      skipSuccessfulRequests: boolean;
    };
    
    uploads: {
      maxFileSize: number;
      allowedImageTypes: string[];
      allowedDocumentTypes: string[];
      storageProvider: 'local' | 's3' | 'cloudinary';
      s3Config?: {
        bucket: string;
        region: string;
        accessKeyId: string;
        secretAccessKey: string;
      };
    };
    
    analytics: {
      enableGoogleAnalytics: boolean;
      googleAnalyticsId?: string;
      enableCustomAnalytics: boolean;
      retentionDays: number;
    };
    
    integrations: {
      stripe: {
        enabled: boolean;
        publicKey?: string;
        secretKey?: string;
        webhookSecret?: string;
      };
      google: {
        enabled: boolean;
        clientId?: string;
        clientSecret?: string;
      };
      facebook: {
        enabled: boolean;
        appId?: string;
        appSecret?: string;
      };
    };
  };
  
  defaultLimits: {
    free: {
      linksPerMonth: number;
      clicksPerMonth: number;
      customDomains: number;
      analytics: boolean;
    };
    premium: {
      linksPerMonth: number;
      clicksPerMonth: number;
      customDomains: number;
      analytics: boolean;
    };
    enterprise: {
      linksPerMonth: number;
      clicksPerMonth: number;
      customDomains: number;
      analytics: boolean;
    };
  };
  
  features: {
    enableSignup: boolean;
    enableTeams: boolean;
    enableCustomDomains: boolean;
    enableQRCodes: boolean;
    enableBulkOperations: boolean;
    enableAPIAccess: boolean;
    enableWhiteLabel: boolean;
    maintenanceMode: boolean;
  };
  
  createdAt: Date;
  updatedAt: Date;
  lastModifiedBy: string;
}

export interface SMTPSettings {
  host: string;
  port: number;
  secure: boolean;
  username: string;
  password: string;
  fromName: string;
  fromEmail: string;
}

export interface SecuritySettings {
  enforceSSL: boolean;
  maxLoginAttempts: number;
  lockoutDuration: number;
  sessionTimeout: number;
  passwordMinLength: number;
  requireEmailVerification: boolean;
  enableTwoFactor: boolean;
}

export interface FeatureFlags {
  enableSignup: boolean;
  enableTeams: boolean;
  enableCustomDomains: boolean;
  enableQRCodes: boolean;
  enableBulkOperations: boolean;
  enableAPIAccess: boolean;
  enableWhiteLabel: boolean;
  maintenanceMode: boolean;
}

export interface UpdateSettingsRequest {
  system?: {
    appName?: string;
    appDescription?: string;
    supportEmail?: string;
    smtp?: Partial<SMTPSettings>;
    security?: Partial<SecuritySettings>;
  };
  features?: Partial<FeatureFlags>;
  defaultLimits?: Partial<Settings['defaultLimits']>;
}

export interface Domain {
  _id: string;
  domain: string;
  subdomain?: string;
  userId?: string;
  teamId?: string;
  type: 'system' | 'custom' | 'subdomain';
  isCustom: boolean;
  isVerified: boolean;
  isActive: boolean;
  sslEnabled: boolean;
  
  verificationCode?: string;
  verificationMethod: 'dns' | 'file' | 'meta';
  dnsRecords: {
    type: 'A' | 'CNAME' | 'TXT';
    name: string;
    value: string;
    verified: boolean;
    verifiedAt?: Date;
  }[];
  
  ssl: {
    provider: 'letsencrypt' | 'cloudflare' | 'custom';
    issuer?: string;
    validFrom?: Date;
    validTo?: Date;
    autoRenew: boolean;
  };
  
  settings: {
    redirectType: 301 | 302;
    forceHttps: boolean;
    enableCompression: boolean;
    cacheControl: string;
    branding: {
      logo?: string;
      favicon?: string;
      customCss?: string;
      metaTitle?: string;
      metaDescription?: string;
      customFooter?: string;
    };
    security: {
      enableCaptcha: boolean;
      ipWhitelist: string[];
      ipBlacklist: string[];
      rateLimiting: {
        enabled: boolean;
        requestsPerMinute: number;
      };
    };
  };
  
  usage: {
    linksCount: number;
    clicksCount: number;
    bandwidthUsed: number;
    lastUpdated: Date;
  };
  
  createdAt: Date;
  updatedAt: Date;
  lastUsedAt?: Date;
  isDeleted: boolean;
  deletedAt?: Date;
}

export interface CreateDomainRequest {
  domain: string;
  type: 'system' | 'custom' | 'subdomain';
  verificationMethod?: 'dns' | 'file' | 'meta';
}

export interface DomainVerification {
  domain: string;
  verified: boolean;
  records: {
    type: 'A' | 'CNAME' | 'TXT';
    name: string;
    value: string;
    verified: boolean;
  }[];
  instructions: string;
}

// ============= Common Types =============
export interface ApiResponse<T = any> {
  success: boolean;
  message: string;
  data?: T;
  error?: string;
  errors?: Record<string, string[]>;
}

export interface PaginationParams {
  page?: number;
  limit?: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
  search?: string;
}

export interface PaginatedResponse<T> {
  data: T[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
    hasNextPage: boolean;
    hasPrevPage: boolean;
  };
}

export interface FilterParams {
  startDate?: string;
  endDate?: string;
  status?: string;
  plan?: string;
  role?: string;
  [key: string]: any;
}

export interface AuditLog {
  _id: string;
  userId?: string;
  userEmail?: string;
  userName?: string;
  action: string;
  resource: string;
  resourceId?: string;
  details: {
    method: 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH';
    endpoint?: string;
    changes?: {
      field: string;
      oldValue?: any;
      newValue?: any;
    }[];
    metadata?: Record<string, any>;
  };
  context: {
    ip: string;
    userAgent: string;
    sessionId?: string;
    requestId?: string;
    teamId?: string;
  };
  result: {
    success: boolean;
    statusCode?: number;
    error?: string;
    duration?: number;
  };
  risk: {
    level: 'low' | 'medium' | 'high' | 'critical';
    factors: string[];
    score: number;
  };
  timestamp: Date;
  expiresAt?: Date;
}

export interface Analytics {
  _id: string;
  urlId: string;
  shortCode: string;
  clickId: string;
  timestamp: Date;
  ip: string;
  hashedIp: string;
  userAgent: string;
  fingerprint?: string;
  
  country?: string;
  countryCode?: string;
  region?: string;
  city?: string;
  latitude?: number;
  longitude?: number;
  timezone?: string;
  
  device: {
    type: 'mobile' | 'tablet' | 'desktop' | 'bot';
    brand?: string;
    model?: string;
    os: string;
    osVersion?: string;
    browser: string;
    browserVersion?: string;
    engine?: string;
    cpu?: string;
  };
  
  referrer: {
    url?: string;
    domain?: string;
    source: 'direct' | 'social' | 'search' | 'email' | 'ads' | 'referral' | 'unknown';
    medium?: string;
    campaign?: string;
    term?: string;
    content?: string;
  };
  
  utm: {
    source?: string;
    medium?: string;
    campaign?: string;
    term?: string;
    content?: string;
  };
  
  technical: {
    protocol: 'http' | 'https';
    method: 'GET' | 'POST';
    statusCode: number;
    responseTime: number;
    redirectCount: number;
  };
  
  qrCode: {
    isQRClick: boolean;
    qrSource?: 'image' | 'pdf' | 'print';
  };
  
  bot: {
    isBot: boolean;
    botName?: string;
    botType?: 'search' | 'social' | 'monitoring' | 'other';
  };
  
  privacy: {
    doNotTrack: boolean;
    gdprConsent?: boolean;
    ccpaOptOut?: boolean;
  };
  
  processed: {
    isProcessed: boolean;
    processedAt?: Date;
    aggregatedAt?: Date;
  };
}