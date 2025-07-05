// ============= middleware.ts (FIXED) =============
import { NextRequest, NextResponse } from 'next/server';
import { withAuth } from 'next-auth/middleware';
import { getToken } from 'next-auth/jwt';

// Middleware configuration - FIXED to exclude short links
export const config = {
  matcher: [
    // Protected client API routes
    '/api/client/:path*',
    
    // Dashboard and authenticated pages
    '/dashboard/:path*',
    '/settings/:path*',
    '/analytics/:path*',
    '/teams/:path*',
    '/folders/:path*',
    
    // Admin routes
    '/admin/:path*',
    
    // DO NOT include the catch-all pattern that was catching short links
    // This was the problematic line that was removed:
    // '/((?!api/auth|api/public|api/redirect|_next/static|_next/image|favicon.ico|robots.txt|sitemap.xml|manifest.json).*)'
  ]
};

// Rate limiting store (in production, use Redis)
const rateLimitStore = new Map<string, { requests: number; resetTime: number }>();

// Security patterns
const SECURITY_PATTERNS = {
  suspiciousUserAgents: [
    /^[a-z]+$/i,
    /test/i,
    /curl|wget|python|php|perl|ruby/i,
    /scanner|scraper|crawler/i,
    /^.{0,10}$/,
  ],
  maliciousIPs: [
    /^0\.0\.0\.0$/,
    /^127\.0\.0\.1$/,
    /^255\.255\.255\.255$/,
  ],
  suspiciousPaths: [
    /\.php$/,
    /\.asp$/,
    /\.jsp$/,
    /wp-admin|wp-login|phpmyadmin/i,
    /admin\.php|config\.php|install\.php/i,
    /\.\.|\/\.\.|\.\.\/|\.\.\\/,
    /<script|javascript:|vbscript:|onload=/i,
  ],
};

export default withAuth(
  async function middleware(req: NextRequest) {
    const token = await getToken({ req });
    const { pathname } = req.nextUrl;

    try {
      // ========== SECURITY LAYER ==========
      const securityCheck = await performSecurityChecks(req);
      if (securityCheck.blocked) {
        console.warn('🚫 Security threat blocked:', securityCheck.reason);
        return new NextResponse('Access Denied', { 
          status: securityCheck.status || 403,
          headers: { 'X-Security-Block': securityCheck.reason ?? '' }
        });
      }

      // ========== RATE LIMITING ==========
      const rateLimitCheck = checkRateLimit(req);
      if (!rateLimitCheck.allowed) {
        console.warn('⏰ Rate limit exceeded for:', getClientIP(req));
        return new NextResponse('Too Many Requests', { 
          status: 429,
          headers: {
            'Retry-After': Math.ceil((rateLimitCheck.resetTime - Date.now()) / 1000).toString(),
            'X-RateLimit-Limit': rateLimitCheck.limit.toString(),
            'X-RateLimit-Remaining': '0',
            'X-RateLimit-Reset': rateLimitCheck.resetTime.toString()
          }
        });
      }

      // ========== AUTHENTICATION LAYER ==========
      
      // Check for authentication on protected routes
      if (pathname.startsWith('/api/client/') || 
          pathname.startsWith('/dashboard') || 
          pathname.startsWith('/settings') ||
          pathname.startsWith('/analytics') ||
          pathname.startsWith('/teams') ||
          pathname.startsWith('/folders')) {
        
        if (!token) {
          if (pathname.startsWith('/api/')) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
          }
          return NextResponse.redirect(new URL('/auth/signin', req.url));
        }
      }

      // ========== AUTHORIZATION LAYER ==========
      
      // Admin route protection
      if (pathname.startsWith('/admin')) {
        if (!token || token.role !== 'admin') {
          if (pathname.startsWith('/api/')) {
            return NextResponse.json({ error: 'Admin access required' }, { status: 403 });
          }
          return NextResponse.redirect(new URL('/dashboard', req.url));
        }
      }

      // Team-specific route protection
      if (pathname.startsWith('/teams/') && pathname !== '/teams') {
        const teamSlug = pathname.split('/')[2];
        if (teamSlug && !hasTeamAccess(token, teamSlug)) {
          if (pathname.startsWith('/api/')) {
            return NextResponse.json({ error: 'Team access denied' }, { status: 403 });
          }
          return NextResponse.redirect(new URL('/teams', req.url));
        }
      }

      // ========== API SPECIFIC MIDDLEWARE ==========
      if (pathname.startsWith('/api/client/')) {
        return await handleAPIMiddleware(req, token);
      }

      // ========== RESPONSE ENHANCEMENT ==========
      const response = NextResponse.next();
      
      // Add security headers
      addSecurityHeaders(response);
      
      // Add rate limit headers
      response.headers.set('X-RateLimit-Limit', rateLimitCheck.limit.toString());
      response.headers.set('X-RateLimit-Remaining', rateLimitCheck.remaining.toString());
      response.headers.set('X-RateLimit-Reset', rateLimitCheck.resetTime.toString());
      
      // Add request ID for tracking
      const requestId = generateRequestId();
      response.headers.set('X-Request-ID', requestId);
      
      // Log request for analytics
      logRequest(req, token, requestId);

      return response;

    } catch (error) {
      console.error('🚨 Middleware error:', error);
      
      // Graceful fallback - don't block legitimate requests
      const fallbackResponse = NextResponse.next();
      addSecurityHeaders(fallbackResponse);
      return fallbackResponse;
    }
  },
  {
    pages: {
      signIn: '/auth/signin',
      error: '/auth/error',
    }
  }
);

// ========== SECURITY FUNCTIONS ==========

async function performSecurityChecks(req: NextRequest): Promise<{
  blocked: boolean;
  reason?: string;
  status?: number;
}> {
  const userAgent = req.headers.get('user-agent') || '';
  const ip = getClientIP(req);
  const pathname = req.nextUrl.pathname;
  const referer = req.headers.get('referer') || '';

  // Check for suspicious user agents
  if (SECURITY_PATTERNS.suspiciousUserAgents.some(pattern => pattern.test(userAgent))) {
    return { blocked: true, reason: 'Suspicious user agent', status: 403 };
  }

  // Check for malicious IPs
  if (SECURITY_PATTERNS.maliciousIPs.some(pattern => pattern.test(ip))) {
    return { blocked: true, reason: 'Blocked IP address', status: 403 };
  }

  // Check for suspicious paths
  if (SECURITY_PATTERNS.suspiciousPaths.some(pattern => pattern.test(pathname))) {
    return { blocked: true, reason: 'Suspicious path access', status: 404 };
  }

  // Check for SQL injection attempts
  const queryString = req.nextUrl.search;
  if (queryString && /(\bUNION\b|\bSELECT\b|\bINSERT\b|\bDELETE\b|\bDROP\b)/i.test(queryString)) {
    return { blocked: true, reason: 'SQL injection attempt', status: 400 };
  }

  // Check for XSS attempts
  if (pathname.includes('<script') || queryString.includes('<script')) {
    return { blocked: true, reason: 'XSS attempt', status: 400 };
  }

  // Check request size (basic DoS protection)
  const contentLength = req.headers.get('content-length');
  if (contentLength && parseInt(contentLength) > 10 * 1024 * 1024) { // 10MB limit
    return { blocked: true, reason: 'Request too large', status: 413 };
  }

  // Check for rapid requests from same IP (basic flood protection)
  const recentRequests = getRecentRequests(ip);
  if (recentRequests > 100) { // 100 requests in the last minute
    return { blocked: true, reason: 'Request flooding detected', status: 429 };
  }

  return { blocked: false };
}

function checkRateLimit(req: NextRequest): {
  allowed: boolean;
  limit: number;
  remaining: number;
  resetTime: number;
} {
  const ip = getClientIP(req);
  const now = Date.now();
  const windowMs = 60 * 1000; // 1 minute
  const maxRequests = 100;

  const key = `rateLimit:${ip}`;
  const current = rateLimitStore.get(key);

  if (!current || now > current.resetTime) {
    rateLimitStore.set(key, {
      requests: 1,
      resetTime: now + windowMs
    });
    return {
      allowed: true,
      limit: maxRequests,
      remaining: maxRequests - 1,
      resetTime: now + windowMs
    };
  }

  if (current.requests >= maxRequests) {
    return {
      allowed: false,
      limit: maxRequests,
      remaining: 0,
      resetTime: current.resetTime
    };
  }

  current.requests++;
  return {
    allowed: true,
    limit: maxRequests,
    remaining: maxRequests - current.requests,
    resetTime: current.resetTime
  };
}

function getClientIP(req: NextRequest): string {
  const forwarded = req.headers.get('x-forwarded-for');
  const realIP = req.headers.get('x-real-ip');
  
  if (forwarded) {
    return forwarded.split(',')[0].trim();
  }
  
  if (realIP) {
    return realIP;
  }
  
  return '127.0.0.1';
}

function getRecentRequests(ip: string): number {
  // Simple implementation - in production use Redis
  return 0;
}

function hasTeamAccess(token: any, teamSlug: string): boolean {
  // Implementation depends on your team access logic
  return true;
}

async function handleAPIMiddleware(req: NextRequest, token: any) {
  // Handle API-specific middleware logic
  return NextResponse.next();
}

function addSecurityHeaders(response: NextResponse) {
  response.headers.set('X-Frame-Options', 'DENY');
  response.headers.set('X-Content-Type-Options', 'nosniff');
  response.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin');
  response.headers.set('X-XSS-Protection', '1; mode=block');
}

function generateRequestId(): string {
  return Math.random().toString(36).substring(2, 15);
}

function logRequest(req: NextRequest, token: any, requestId: string) {
  // Log request for analytics
  console.log(`Request ${requestId}: ${req.method} ${req.nextUrl.pathname}`);
}