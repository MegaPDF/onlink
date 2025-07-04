import { NextRequest } from 'next/server';
import { UAParser } from 'ua-parser-js';

// Bot detection patterns
const BOT_PATTERNS = [
  /googlebot/i,
  /bingbot/i,
  /slurp/i,
  /duckduckbot/i,
  /baiduspider/i,
  /yandexbot/i,
  /facebookexternalhit/i,
  /twitterbot/i,
  /rogerbot/i,
  /linkedinbot/i,
  /embedly/i,
  /quora link preview/i,
  /showyoubot/i,
  /outbrain/i,
  /pinterest\/0\./i,
  /developers\.google\.com\/\+\/web\/snippet\//i,
  /slackbot/i,
  /vkshare/i,
  /w3c_validator/i,
  /redditbot/i,
  /applebot/i,
  /whatsapp/i,
  /flipboard/i,
  /tumblr/i,
  /bitlybot/i,
  /skypeuripreview/i,
  /nuzzel/i,
  /discordbot/i,
  /telegrambot/i,
  /curl/i,
  /wget/i,
  /python-requests/i,
  /php/i,
  /bot/i,
  /crawler/i,
  /spider/i,
  /scraper/i,
];

/**
 * Detect if the user agent is a bot
 */
export function detectBot(userAgent: string): boolean {
  if (!userAgent) return false;
  
  return BOT_PATTERNS.some(pattern => pattern.test(userAgent));
}

/**
 * Parse user agent string to extract device information
 */
export function parseUserAgent(userAgent: string) {
  const parser = new UAParser(userAgent);
  const result = parser.getResult();

  return {
    browser: {
      name: result.browser.name || 'Unknown',
      version: result.browser.version || 'Unknown',
    },
    device: {
      type: result.device.type || 'desktop',
      vendor: result.device.vendor || 'Unknown',
      model: result.device.model || 'Unknown',
    },
    os: {
      name: result.os.name || 'Unknown',
      version: result.os.version || 'Unknown',
    },
    engine: {
      name: result.engine.name || 'Unknown',
      version: result.engine.version || 'Unknown',
    },
    deviceType: getDeviceType(result.device.type),
    isBot: detectBot(userAgent),
    isMobile: result.device.type === 'mobile',
    isTablet: result.device.type === 'tablet',
    isDesktop: !result.device.type,
  };
}

/**
 * Normalize device type
 */
function getDeviceType(deviceType?: string): 'mobile' | 'tablet' | 'desktop' | 'bot' {
  if (!deviceType) return 'desktop';
  
  switch (deviceType.toLowerCase()) {
    case 'mobile':
      return 'mobile';
    case 'tablet':
      return 'tablet';
    default:
      return 'desktop';
  }
}

/**
 * Extract client IP from request headers
 */
export function getClientIP(request: NextRequest): string {
  // Check various headers in order of preference
  const headers = [
    'x-forwarded-for',
    'x-real-ip',
    'x-client-ip',
    'cf-connecting-ip', // Cloudflare
    'x-forwarded',
    'forwarded-for',
    'forwarded',
  ];

  for (const header of headers) {
    const value = request.headers.get(header);
    if (value) {
      // Handle comma-separated IPs (x-forwarded-for can contain multiple IPs)
      const ip = value.split(',')[0].trim();
      if (isValidIP(ip)) {
        return ip;
      }
    }
  }

  // Fallback to localhost if no valid IP found
  return '127.0.0.1';
}

/**
 * Validate IP address format
 */
function isValidIP(ip: string): boolean {
  const ipv4Regex = /^(?:(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.){3}(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)$/;
  const ipv6Regex = /^(?:[0-9a-fA-F]{1,4}:){7}[0-9a-fA-F]{1,4}$/;
  
  return ipv4Regex.test(ip) || ipv6Regex.test(ip);
}

/**
 * Get geographic information from IP (requires external service)
 */
export async function getGeoLocation(ip: string): Promise<{
  country?: string;
  countryCode?: string;
  region?: string;
  city?: string;
  timezone?: string;
} | null> {
  // Skip local IPs
  if (ip === '127.0.0.1' || ip.startsWith('192.168.') || ip.startsWith('10.')) {
    return null;
  }

  try {
    // Using ipapi.co as an example (you might want to use a different service)
    const response = await fetch(`https://ipapi.co/${ip}/json/`, {
      headers: {
        'User-Agent': 'ShortLink/1.0',
      },
      // Add timeout
      signal: AbortSignal.timeout(5000),
    });

    if (!response.ok) {
      return null;
    }

    const data = await response.json();
    
    return {
      country: data.country_name,
      countryCode: data.country_code,
      region: data.region,
      city: data.city,
      timezone: data.timezone,
    };
  } catch (error) {
    console.error('Error fetching geo location:', error);
    return null;
  }
}

/**
 * Check if request is from a suspicious source
 */
export function isSuspiciousRequest(request: NextRequest): {
  isSuspicious: boolean;
  reasons: string[];
} {
  const reasons: string[] = [];
  const userAgent = request.headers.get('user-agent') || '';
  const referer = request.headers.get('referer') || '';
  const ip = getClientIP(request);

  // Check for missing or suspicious user agent
  if (!userAgent) {
    reasons.push('Missing user agent');
  } else if (userAgent.length < 10) {
    reasons.push('Suspiciously short user agent');
  } else if (/^[a-z]+$/i.test(userAgent)) {
    reasons.push('Simple user agent pattern');
  }

  // Check for suspicious referers
  const suspiciousRefererPatterns = [
    /\.tk$/,
    /\.ml$/,
    /\.cf$/,
    /\.ga$/,
    /bit\.ly/,
    /tinyurl/,
    /goo\.gl/,
  ];

  if (referer && suspiciousRefererPatterns.some(pattern => pattern.test(referer))) {
    reasons.push('Suspicious referer domain');
  }

  // Check for known malicious IP ranges (you'd maintain this list)
  if (isKnownMaliciousIP(ip)) {
    reasons.push('Known malicious IP');
  }

  // Check request frequency (this would require state tracking)
  // This is a simplified check - in production you'd use Redis or similar
  if (isHighFrequencyIP(ip)) {
    reasons.push('High frequency requests');
  }

  return {
    isSuspicious: reasons.length > 0,
    reasons,
  };
}

/**
 * Check if IP is in known malicious list
 */
function isKnownMaliciousIP(ip: string): boolean {
  // This would typically check against a database or external service
  // For now, just check some basic patterns
  const maliciousPatterns = [
    /^0\.0\.0\.0$/,
    /^127\.0\.0\.1$/,
    /^255\.255\.255\.255$/,
  ];

  return maliciousPatterns.some(pattern => pattern.test(ip));
}

/**
 * Check if IP has high request frequency
 */
function isHighFrequencyIP(ip: string): boolean {
  // This would require implementing request tracking
  // Could use Redis with sliding window or similar
  // For now, return false
  return false;
}

/**
 * Security check for short codes
 */
export function isValidShortCode(shortCode: string): boolean {
  // Basic validation for short codes
  const shortCodePattern = /^[a-zA-Z0-9_-]{6,12}$/;
  
  if (!shortCodePattern.test(shortCode)) {
    return false;
  }

  // Check against reserved words
  const reservedWords = [
    'api', 'admin', 'dashboard', 'auth', 'www', 'mail', 'ftp',
    'blog', 'shop', 'store', 'app', 'mobile', 'secure', 'ssl',
    'help', 'support', 'contact', 'about', 'terms', 'privacy',
    'login', 'signup', 'register', 'account', 'profile', 'settings',
    'user', 'users', 'member', 'members', 'guest', 'public',
    'private', 'internal', 'system', 'root', 'test', 'demo',
  ];

  return !reservedWords.includes(shortCode.toLowerCase());
}

/**
 * Generate a secure short code
 */
export function generateSecureShortCode(length: number = 8): string {
  const chars = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let result = '';
  
  for (let i = 0; i < length; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  
  return result;
}

/**
 * Check if URL is safe to redirect to
 */
export function isSafeRedirectURL(url: string): boolean {
  try {
    const parsedUrl = new URL(url);
    
    // Check protocol
    if (!['http:', 'https:'].includes(parsedUrl.protocol)) {
      return false;
    }

    // Check for suspicious domains
    const suspiciousDomains = [
      'localhost',
      '127.0.0.1',
      '0.0.0.0',
      '192.168.',
      '10.',
      '172.',
    ];

    const hostname = parsedUrl.hostname.toLowerCase();
    if (suspiciousDomains.some(domain => hostname.includes(domain))) {
      return false;
    }

    // Check for known malicious domains (you'd maintain this list)
    const maliciousDomains = [
      'malware.com',
      'phishing.net',
      // Add known bad domains
    ];

    if (maliciousDomains.includes(hostname)) {
      return false;
    }

    return true;
  } catch {
    return false;
  }
}

/**
 * Create request fingerprint for tracking
 */
export function createRequestFingerprint(request: NextRequest): string {
  const ip = getClientIP(request);
  const userAgent = request.headers.get('user-agent') || '';
  const acceptLanguage = request.headers.get('accept-language') || '';
  const acceptEncoding = request.headers.get('accept-encoding') || '';

  // Create a hash of key identifying information
  const fingerprint = `${ip}|${userAgent}|${acceptLanguage}|${acceptEncoding}`;
  
  // In production, you'd want to hash this for privacy
  return btoa(fingerprint).slice(0, 16);
}

/**
 * Log security event
 */
export async function logSecurityEvent(
  event: {
    type: 'suspicious_request' | 'rate_limit_exceeded' | 'invalid_access' | 'bot_detected';
    ip: string;
    userAgent: string;
    path: string;
    details?: any;
  }
): Promise<void> {
  // In production, this would log to your security monitoring system
  console.warn('Security Event:', {
    timestamp: new Date().toISOString(),
    ...event,
  });

  // You could integrate with services like:
  // - Sentry for error tracking
  // - LogRocket for session monitoring
  // - Custom analytics service
  // - SIEM systems
}

export default {
  detectBot,
  parseUserAgent,
  getClientIP,
  getGeoLocation,
  isSuspiciousRequest,
  isValidShortCode,
  generateSecureShortCode,
  isSafeRedirectURL,
  createRequestFingerprint,
  logSecurityEvent,
};