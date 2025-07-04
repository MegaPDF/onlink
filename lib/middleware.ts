// ============= lib/enhanced-middleware.ts =============
import { NextRequest, NextResponse } from 'next/server';
import { getToken } from 'next-auth/jwt';
import { connectDB } from './mongodb';
import { AuditLog } from '@/models/AuditLog';
import { User } from '@/models/User';
import { SecurityService } from './security';

// Types for middleware
export interface RequestContext {
  ip: string;
  userAgent: string;
  userId?: string;
  sessionId?: string;
  requestId: string;
  timestamp: Date;
}

export interface SecurityCheckResult {
  allowed: boolean;
  riskLevel: 'low' | 'medium' | 'high' | 'critical';
  factors: string[];
  shouldLog: boolean;
}

export interface RateLimitConfig {
  windowMs: number;
  maxRequests: number;
  skipSuccessfulRequests?: boolean;
  skipFailedRequests?: boolean;
  keyGenerator?: (req: NextRequest) => string;
}

// ========== ENHANCED MIDDLEWARE FUNCTIONS ==========

/**
 * Comprehensive request validator middleware
 */
export async function validateRequest(req: NextRequest): Promise<{
  valid: boolean;
  errors: string[];
  sanitizedUrl?: URL;
}> {
  const errors: string[] = [];
  let sanitizedUrl: URL | undefined = undefined;

  try {
    sanitizedUrl = new URL(req.url);
    
    // Validate URL structure
    if (sanitizedUrl.pathname.includes('..')) {
      errors.push('Path traversal attempt detected');
    }

    // Validate query parameters
    for (const [key, value] of sanitizedUrl.searchParams.entries()) {
      if (containsSQLInjection(value)) {
        errors.push(`SQL injection attempt in parameter: ${key}`);
      }
      
      if (containsXSSPayload(value)) {
        errors.push(`XSS attempt in parameter: ${key}`);
      }

      if (value.length > 1000) {
        errors.push(`Parameter too long: ${key}`);
      }
    }

    // Validate headers
    const userAgent = req.headers.get('user-agent') || '';
    if (userAgent.length > 500) {
      errors.push('User agent too long');
    }

    const contentType = req.headers.get('content-type') || '';
    if (req.method !== 'GET' && !isValidContentType(contentType)) {
      errors.push('Invalid content type');
    }

    // Validate request size
    const contentLength = req.headers.get('content-length');
    if (contentLength && parseInt(contentLength) > getMaxRequestSize(req.nextUrl.pathname)) {
      errors.push('Request payload too large');
    }

  } catch (error) {
    errors.push('Invalid request URL');
  }

  return {
    valid: errors.length === 0,
    errors,
    sanitizedUrl: errors.length === 0 ? sanitizedUrl : undefined
  };
}

/**
 * Advanced security scanner
 */
export async function performAdvancedSecurityScan(
  req: NextRequest,
  context: RequestContext
): Promise<SecurityCheckResult> {
  const factors: string[] = [];
  let riskScore = 0;

  // Check IP reputation
  const ipRisk = await checkIPReputation(context.ip);
  if (ipRisk.malicious) {
    factors.push('malicious_ip');
    riskScore += 80;
  } else if (ipRisk.suspicious) {
    factors.push('suspicious_ip');
    riskScore += 40;
  }

  // Analyze user agent patterns
  const uaAnalysis = analyzeUserAgent(context.userAgent);
  if (uaAnalysis.isBot && !uaAnalysis.isLegitimateBot) {
    factors.push('suspicious_bot');
    riskScore += 30;
  }

  // Check for automation patterns
  if (hasAutomationSignatures(req)) {
    factors.push('automation_detected');
    riskScore += 25;
  }

  // Analyze request patterns
  const requestAnalysis = await analyzeRequestPatterns(context);
  if (requestAnalysis.anomalous) {
    factors.push('anomalous_pattern');
    riskScore += requestAnalysis.score;
  }

  // Check for known attack signatures
  const attackSignatures = detectAttackSignatures(req);
  if (attackSignatures.detected) {
    factors.push(...attackSignatures.types);
    riskScore += attackSignatures.severity;
  }

  // Geographic analysis
  const geoAnalysis = await analyzeGeographicRisk(context.ip);
  if (geoAnalysis.highRisk) {
    factors.push('high_risk_location');
    riskScore += 20;
  }

  const riskLevel = 
    riskScore >= 80 ? 'critical' :
    riskScore >= 60 ? 'high' :
    riskScore >= 30 ? 'medium' : 'low';

  return {
    allowed: riskScore < 80, // Block critical risk
    riskLevel,
    factors,
    shouldLog: riskScore >= 30 // Log medium+ risk
  };
}

/**
 * Advanced rate limiter with sliding window
 */
export class AdvancedRateLimiter {
  private store = new Map<string, { requests: number[]; blocked: boolean }>();
  private blockedIPs = new Set<string>();

  async checkLimit(
    req: NextRequest,
    config: RateLimitConfig
  ): Promise<{
    allowed: boolean;
    remaining: number;
    resetTime: number;
    totalHits: number;
  }> {
    const key = config.keyGenerator ? config.keyGenerator(req) : getClientIP(req);
    const now = Date.now();
    const windowStart = now - config.windowMs;

    // Check if IP is temporarily blocked
    if (this.blockedIPs.has(key)) {
      return { allowed: false, remaining: 0, resetTime: now + config.windowMs, totalHits: 0 };
    }

    let record = this.store.get(key);
    if (!record) {
      record = { requests: [], blocked: false };
      this.store.set(key, record);
    }

    // Remove expired requests
    record.requests = record.requests.filter(time => time > windowStart);

    // Check if limit exceeded
    if (record.requests.length >= config.maxRequests) {
      // Block IP for extended period if they keep trying
      if (record.requests.length > config.maxRequests * 2) {
        this.blockedIPs.add(key);
        setTimeout(() => this.blockedIPs.delete(key), config.windowMs * 10);
      }
      
      return {
        allowed: false,
        remaining: 0,
        resetTime: record.requests[0] + config.windowMs,
        totalHits: record.requests.length
      };
    }

    // Add current request
    record.requests.push(now);

    return {
      allowed: true,
      remaining: config.maxRequests - record.requests.length,
      resetTime: now + config.windowMs,
      totalHits: record.requests.length
    };
  }

  // Clean up expired entries
  cleanup(): void {
    const now = Date.now();
    for (const [key, record] of this.store.entries()) {
      if (record.requests.length === 0 || 
          Math.max(...record.requests) < now - (60 * 60 * 1000)) {
        this.store.delete(key);
      }
    }
  }
}

/**
 * Audit logger middleware
 */
export async function logAuditEvent(
  req: NextRequest,
  context: RequestContext,
  eventType: string,
  result: { success: boolean; statusCode?: number; error?: string },
  metadata?: Record<string, any>
): Promise<void> {
  try {
    await connectDB();

    const user = context.userId ? await User.findById(context.userId) : null;

    const auditLog = new AuditLog({
      userId: context.userId,
      userEmail: user?.email,
      userName: user?.name,
      action: eventType,
      resource: getResourceFromPath(req.nextUrl.pathname),
      resourceId: extractResourceId(req.nextUrl.pathname),
      details: {
        method: req.method as any,
        endpoint: req.nextUrl.pathname,
        changes: extractChanges(req, metadata),
        metadata: {
          ...metadata,
          requestId: context.requestId,
          userAgent: context.userAgent
        }
      },
      context: {
        ip: context.ip,
        userAgent: context.userAgent,
        sessionId: context.sessionId,
        requestId: context.requestId
      },
      result: {
        success: result.success,
        statusCode: result.statusCode,
        error: result.error,
        duration: Date.now() - context.timestamp.getTime()
      },
      risk: await calculateRiskScore(context, eventType, result)
    });

    await auditLog.save();
  } catch (error) {
    console.error('Failed to log audit event:', error);
  }
}

/**
 * Request sanitizer
 */
export function sanitizeRequest(req: NextRequest): {
  sanitizedHeaders: Record<string, string>;
  sanitizedQuery: Record<string, string>;
  isModified: boolean;
} {
  let isModified = false;
  const sanitizedHeaders: Record<string, string> = {};
  const sanitizedQuery: Record<string, string> = {};

  // Sanitize headers
  for (const [key, value] of req.headers.entries()) {
    const sanitizedValue = SecurityService.sanitizeInput(value);
    sanitizedHeaders[key] = sanitizedValue;
    if (sanitizedValue !== value) {
      isModified = true;
    }
  }

  // Sanitize query parameters
  for (const [key, value] of req.nextUrl.searchParams.entries()) {
    const sanitizedValue = SecurityService.sanitizeInput(value);
    sanitizedQuery[key] = sanitizedValue;
    if (sanitizedValue !== value) {
      isModified = true;
    }
  }

  return { sanitizedHeaders, sanitizedQuery, isModified };
}

// ========== HELPER FUNCTIONS ==========

function containsSQLInjection(input: string): boolean {
  const sqlPatterns = [
    /(\bUNION\b|\bSELECT\b|\bINSERT\b|\bDELETE\b|\bDROP\b)/i,
    /(\bOR\b|\bAND\b).*(=|>|<).*(\bOR\b|\bAND\b)/i,
    /'[^']*'(\s*(=|>|<|\bLIKE\b))/i,
    /\b(exec|execute|sp_|xp_)\b/i
  ];
  
  return sqlPatterns.some(pattern => pattern.test(input));
}

function containsXSSPayload(input: string): boolean {
  const xssPatterns = [
    /<script[^>]*>.*?<\/script>/gi,
    /<iframe[^>]*>.*?<\/iframe>/gi,
    /javascript:/gi,
    /vbscript:/gi,
    /onload\s*=/gi,
    /onerror\s*=/gi,
    /onclick\s*=/gi
  ];
  
  return xssPatterns.some(pattern => pattern.test(input));
}

function isValidContentType(contentType: string): boolean {
  const validTypes = [
    'application/json',
    'multipart/form-data',
    'application/x-www-form-urlencoded',
    'text/plain'
  ];
  
  return validTypes.some(type => contentType.includes(type));
}

function getMaxRequestSize(pathname: string): number {
  if (pathname.includes('/bulk-')) {
    return 50 * 1024 * 1024; // 50MB for bulk operations
  }
  if (pathname.includes('/upload')) {
    return 10 * 1024 * 1024; // 10MB for uploads
  }
  return 1024 * 1024; // 1MB default
}

async function checkIPReputation(ip: string): Promise<{
  malicious: boolean;
  suspicious: boolean;
  score: number;
}> {
  // This would integrate with IP reputation services
  // For now, return basic checks
  const suspiciousRanges = [
    /^10\./,      // Private
    /^172\./,     // Private
    /^192\.168\./ // Private
  ];
  
  return {
    malicious: false,
    suspicious: suspiciousRanges.some(range => range.test(ip)),
    score: 0
  };
}

function analyzeUserAgent(userAgent: string): {
  isBot: boolean;
  isLegitimateBot: boolean;
  browserFingerprint: string;
} {
  const legitimateBots = [
    'Googlebot', 'Bingbot', 'Slurp', 'facebookexternalhit'
  ];
  
  const isBot = /bot|crawler|spider|scraper/i.test(userAgent);
  const isLegitimateBot = legitimateBots.some(bot => 
    userAgent.toLowerCase().includes(bot.toLowerCase())
  );
  
  return {
    isBot,
    isLegitimateBot,
    browserFingerprint: btoa(userAgent).slice(0, 16)
  };
}

function hasAutomationSignatures(req: NextRequest): boolean {
  const automationIndicators = [
    req.headers.get('x-requested-with') === 'XMLHttpRequest',
    req.headers.get('sec-fetch-site') === 'none',
    !req.headers.get('accept-language'),
    !req.headers.get('accept-encoding')
  ];
  
  return automationIndicators.filter(Boolean).length >= 2;
}

async function analyzeRequestPatterns(context: RequestContext): Promise<{
  anomalous: boolean;
  score: number;
}> {
  // This would analyze patterns in request timing, frequency, etc.
  // For now, return basic analysis
  return { anomalous: false, score: 0 };
}

function detectAttackSignatures(req: NextRequest): {
  detected: boolean;
  types: string[];
  severity: number;
} {
  const types: string[] = [];
  let severity = 0;
  
  const url = req.nextUrl.toString();
  const userAgent = req.headers.get('user-agent') || '';
  
  // Check for common attack patterns
  if (/\.\.\//g.test(url)) {
    types.push('path_traversal');
    severity += 40;
  }
  
  if (/<script/i.test(url)) {
    types.push('xss_attempt');
    severity += 50;
  }
  
  if (/union.*select/i.test(url)) {
    types.push('sql_injection');
    severity += 60;
  }
  
  return {
    detected: types.length > 0,
    types,
    severity
  };
}

async function analyzeGeographicRisk(ip: string): Promise<{
  highRisk: boolean;
  country?: string;
}> {
  // This would integrate with GeoIP services
  // For now, return basic check
  return { highRisk: false };
}

function getClientIP(req: NextRequest): string {
  const forwarded = req.headers.get('x-forwarded-for');
  const realIP = req.headers.get('x-real-ip');
  
  if (forwarded) {
    return forwarded.split(',')[0].trim();
  }
  
  return realIP || '127.0.0.1';
}

function getResourceFromPath(pathname: string): string {
  const segments = pathname.split('/').filter(Boolean);
  if (segments[0] === 'api' && segments[1] === 'client') {
    return segments[2] || 'unknown';
  }
  return segments[0] || 'root';
}

function extractResourceId(pathname: string): string | undefined {
  const segments = pathname.split('/').filter(Boolean);
  // Try to find ID-like segments (24 char hex for MongoDB ObjectId)
  const idPattern = /^[a-f\d]{24}$/i;
  return segments.find(segment => idPattern.test(segment));
}

function extractChanges(req: NextRequest, metadata?: Record<string, any>): any[] {
  // Extract changes from request body for audit logging
  // This would be implemented based on your specific needs
  return [];
}

async function calculateRiskScore(
  context: RequestContext,
  eventType: string,
  result: { success: boolean; statusCode?: number; error?: string }
): Promise<{
  level: 'low' | 'medium' | 'high' | 'critical';
  factors: string[];
  score: number;
}> {
  const factors: string[] = [];
  let score = 0;

  // Base score for event type
  const riskEvents = ['delete', 'admin', 'bulk', 'team'];
  if (riskEvents.some(event => eventType.includes(event))) {
    score += 20;
    factors.push('high_risk_action');
  }

  // Failed requests are more suspicious
  if (!result.success) {
    score += 30;
    factors.push('failed_request');
  }

  // HTTP error codes
  if (result.statusCode && result.statusCode >= 400) {
    score += 15;
    factors.push('error_response');
  }

  const level = 
    score >= 80 ? 'critical' :
    score >= 60 ? 'high' :
    score >= 30 ? 'medium' : 'low';

  return { level, factors, score };
}

// Export the rate limiter instance
export const rateLimiter = new AdvancedRateLimiter();

// Clean up function for rate limiter
setInterval(() => rateLimiter.cleanup(), 5 * 60 * 1000); // Clean every 5 minutes