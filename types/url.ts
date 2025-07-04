// ============= types/url.ts =============
export interface URL {
  _id: string;
  originalUrl: string;
  shortCode: string;
  customSlug?: string;
  
  userId: string;
  teamId?: string;
  folderId?: string;
  
  title?: string;
  description?: string;
  tags: string[];
  favicon?: string;
  
  domain: string;
  customDomain?: string;
  
  qrCode?: {
    url: string;
    downloadUrl?: string;
    style?: {
      size: number;
      color: string;
      backgroundColor: string;
      logo?: string;
    };
  };
  
  isActive: boolean;
  isPublic: boolean;
  isPasswordProtected: boolean;
  password?: string;
  
  expiresAt?: Date;
  clickLimit?: number;
  geoRestrictions?: {
    type: 'allow' | 'block';
    countries: string[];
  };
  deviceRestrictions?: {
    mobile: boolean;
    desktop: boolean;
    tablet: boolean;
  };
  timeRestrictions?: {
    enabled: boolean;
    schedule: {
      day: number;
      startTime: string;
      endTime: string;
    }[];
  };
  
  utmParameters?: {
    source?: string;
    medium?: string;
    campaign?: string;
    term?: string;
    content?: string;
  };
  
  clicks: {
    total: number;
    unique: number;
    today: number;
    thisWeek: number;
    thisMonth: number;
    lastUpdated: Date;
  };
  
  analyticsCache: {
    topCountries: { country: string; count: number }[];
    topReferrers: { referrer: string; count: number }[];
    topDevices: { device: string; count: number }[];
    lastSyncAt: Date;
  };
  
  createdAt: Date;
  updatedAt: Date;
  lastClickAt?: Date;
  isDeleted: boolean;
  deletedAt?: Date;
}

export interface CreateURLRequest {
  originalUrl: string;
  customSlug?: string;
  folderId?: string;
  title?: string;
  description?: string;
  tags?: string[];
  expiresAt?: string;
  clickLimit?: number;
  isPasswordProtected?: boolean;
  password?: string;
  geoRestrictions?: {
    type: 'allow' | 'block';
    countries: string[];
  };
  deviceRestrictions?: {
    mobile: boolean;
    desktop: boolean;
    tablet: boolean;
  };
  utmParameters?: {
    source?: string;
    medium?: string;
    campaign?: string;
    term?: string;
    content?: string;
  };
}

export interface BulkURLRequest {
  urls: string[];
  folderId?: string;
  tags?: string[];
}

export interface BulkURLResponse {
  results: {
    originalUrl: string;
    shortUrl?: string;
    shortCode?: string;
    error?: string;
  }[];
  processed: number;
  successful: number;
}

export interface URLStats {
  totalUrls: number;
  activeUrls: number;
  urlsCreatedToday: number;
  urlsCreatedThisWeek: number;
  urlsCreatedThisMonth: number;
  totalClicks: number;
  clicksToday: number;
  clicksThisWeek: number;
  clicksThisMonth: number;
  averageClicksPerUrl: number;
}

export interface URLAnalytics {
  urlId: string;
  shortCode: string;
  clicks: {
    total: number;
    unique: number;
    today: number;
    thisWeek: number;
    thisMonth: number;
  };
  geography: {
    country: string;
    countryCode: string;
    count: number;
  }[];
  devices: {
    type: 'mobile' | 'tablet' | 'desktop' | 'bot';
    count: number;
  }[];
  browsers: {
    browser: string;
    count: number;
  }[];
  referrers: {
    domain: string;
    count: number;
  }[];
  dailyStats: {
    date: string;
    clicks: number;
  }[];
}

export interface QRCodeOptions {
  size: number;
  color: string;
  backgroundColor: string;
  logo?: string;
  format: 'png' | 'svg' | 'pdf';
}

export interface Folder {
  _id: string;
  name: string;
  description?: string;
  color?: string;
  icon?: string;
  userId: string;
  teamId?: string;
  parentId?: string;
  path: string;
  level: number;
  isShared: boolean;
  shareSettings?: {
    type: 'public' | 'team' | 'private';
    permissions: {
      view: boolean;
      edit: boolean;
      delete: boolean;
    };
    sharedWith: {
      userId: string;
      role: 'viewer' | 'editor';
      sharedAt: Date;
    }[];
  };
  stats: {
    urlCount: number;
    totalClicks: number;
    lastUpdated: Date;
  };
  createdAt: Date;
  updatedAt: Date;
  isDeleted: boolean;
  deletedAt?: Date;
}