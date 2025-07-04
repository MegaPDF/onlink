// ============= middleware.ts =============
import { NextRequest, NextResponse } from 'next/server';
import { withAuth } from 'next-auth/middleware';
import { getToken } from 'next-auth/jwt';

// Middleware configuration
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
    
    // Exclude public routes and static files
    '/((?!api/auth|api/public|api/redirect|_next/static|_next/image|favicon.ico|robots.txt|sitemap.xml|manifest.json).*)'
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
  remaining: number;
  resetTime: number;
  limit: number;
} {
  const ip = getClientIP(req);
  const pathname = req.nextUrl.pathname;
  const now = Date.now();
  
  // Different limits for different routes
  let limit = 60; // requests per minute
  let windowMs = 60 * 1000; // 1 minute
  
  if (pathname.startsWith('/api/client/bulk-')) {
    limit = 5; // Bulk operations are more resource intensive
  } else if (pathname.startsWith('/api/client/shorten')) {
    limit = 30; // URL shortening
  } else if (pathname.startsWith('/api/auth/')) {
    limit = 10; // Authentication endpoints
  }

  const key = `${ip}:${pathname.split('/').slice(0, 4).join('/')}`;
  const current = rateLimitStore.get(key);
  
  if (!current || now > current.resetTime) {
    const resetTime = now + windowMs;
    rateLimitStore.set(key, { requests: 1, resetTime });
    return { allowed: true, remaining: limit - 1, resetTime, limit };
  }
  
  if (current.requests >= limit) {
    return { allowed: false, remaining: 0, resetTime: current.resetTime, limit };
  }
  
  current.requests++;
  return { 
    allowed: true, 
    remaining: limit - current.requests, 
    resetTime: current.resetTime,
    limit 
  };
}

// ========== API MIDDLEWARE ==========

async function handleAPIMiddleware(req: NextRequest, token: any): Promise<NextResponse | undefined> {
  const pathname = req.nextUrl.pathname;
  
  // Check API-specific permissions
  if (pathname.includes('/admin/') && token.role !== 'admin') {
    return NextResponse.json({ error: 'Admin privileges required' }, { status: 403 });
  }
  
  // Check premium features
  if (pathname.includes('/analytics') || pathname.includes('/bulk-')) {
    if (token.plan === 'free') {
      // Allow limited access or check specific usage limits
      // This would integrate with your existing UsageMonitor
    }
  }
  
  // Validate content type for POST/PUT requests
  if (['POST', 'PUT', 'PATCH'].includes(req.method)) {
    const contentType = req.headers.get('content-type') || '';
    
    if (!contentType.includes('application/json') && 
        !contentType.includes('multipart/form-data') &&
        !contentType.includes('application/x-www-form-urlencoded')) {
      return NextResponse.json({ error: 'Invalid content type' }, { status: 400 });
    }
  }
  
  // Add CORS headers for API routes
  const response = NextResponse.next();
  response.headers.set('Access-Control-Allow-Origin', process.env.CORS_ORIGIN || '*');
  response.headers.set('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  response.headers.set('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  
  return undefined; // Continue with the request
}

// ========== UTILITY FUNCTIONS ==========

function getClientIP(req: NextRequest): string {
  const forwarded = req.headers.get('x-forwarded-for');
  const realIP = req.headers.get('x-real-ip');
  const clientIP = req.headers.get('x-client-ip');
  
  if (forwarded) {
    return forwarded.split(',')[0].trim();
  }
  
  return realIP || clientIP || '127.0.0.1';
}

function hasTeamAccess(token: any, teamSlug: string): boolean {
  if (!token?.team) return false;
  
  // You would implement this based on your team access logic
  // This is a placeholder that checks if user has team access
  return token.team.teamId && token.team.role !== 'suspended';
}

function addSecurityHeaders(response: NextResponse): void {
  // Security headers
  response.headers.set('X-Content-Type-Options', 'nosniff');
  response.headers.set('X-Frame-Options', 'DENY');
  response.headers.set('X-XSS-Protection', '1; mode=block');
  response.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin');
  response.headers.set('Permissions-Policy', 'camera=(), microphone=(), geolocation=()');
  
  // CSP for enhanced security
  const csp = [
    "default-src 'self'",
    "script-src 'self' 'unsafe-inline' 'unsafe-eval'", // Adjust as needed
    "style-src 'self' 'unsafe-inline'",
    "img-src 'self' data: https:",
    "font-src 'self'",
    "connect-src 'self'",
    "frame-ancestors 'none'"
  ].join('; ');
  
  response.headers.set('Content-Security-Policy', csp);
  
  // HSTS for HTTPS enforcement
  if (process.env.NODE_ENV === 'production') {
    response.headers.set('Strict-Transport-Security', 'max-age=31536000; includeSubDomains');
  }
}

function generateRequestId(): string {
  return Math.random().toString(36).substring(2) + Date.now().toString(36);
}

function getRecentRequests(ip: string): number {
  const key = `requests:${ip}`;
  const current = rateLimitStore.get(key);
  const now = Date.now();
  
  if (!current || now > current.resetTime) {
    rateLimitStore.set(key, { requests: 1, resetTime: now + 60000 });
    return 1;
  }
  
  return current.requests;
}

function logRequest(req: NextRequest, token: any, requestId: string): void {
  // Implement request logging here
  // This could integrate with your existing AuditLog system
  const logData = {
    requestId,
    method: req.method,
    pathname: req.nextUrl.pathname,
    userAgent: req.headers.get('user-agent'),
    ip: getClientIP(req),
    userId: token?.sub,
    timestamp: new Date().toISOString(),
  };
  
  // In production, you might want to:
  // 1. Send to logging service (e.g., DataDog, LogRocket)
  // 2. Store in database for audit trails
  // 3. Stream to analytics platform
  
  if (process.env.NODE_ENV === 'development') {
    console.log('📊 Request logged:', logData);
  }
}

// Clean up rate limit store periodically (in production, use Redis with TTL)
if (typeof setInterval !== 'undefined') {
  setInterval(() => {
    const now = Date.now();
    for (const [key, value] of rateLimitStore.entries()) {
      if (now > value.resetTime) {
        rateLimitStore.delete(key);
      }
    }
  }, 60000); // Clean every minute
}