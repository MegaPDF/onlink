import { NextRequest, NextResponse } from 'next/server';
import { getToken } from 'next-auth/jwt';
import { detectBot } from './lib/middleware-utils';

// Rate limiter configurations
const authLimiter = rateLimit({
  interval: 15 * 60 * 1000, // 15 minutes
  uniqueTokenPerInterval: 500,
});

const apiLimiter = rateLimit({
  interval: 60 * 1000, // 1 minute
  uniqueTokenPerInterval: 1000,
});

const redirectLimiter = rateLimit({
  interval: 60 * 1000, // 1 minute
  uniqueTokenPerInterval: 2000,
});

// Security headers
const securityHeaders = {
  'X-Frame-Options': 'DENY',
  'X-Content-Type-Options': 'nosniff',
  'Referrer-Policy': 'strict-origin-when-cross-origin',
  'X-XSS-Protection': '1; mode=block',
  'Strict-Transport-Security': 'max-age=31536000; includeSubDomains',
  'Permissions-Policy': 'camera=(), microphone=(), geolocation=()',
};

// Route configurations
const publicRoutes = [
  '/',
  '/auth/signin',
  '/auth/signup',
  '/auth/forgot-password',
  '/auth/reset-password',
  '/auth/verify-email',
  '/api/auth',
  '/api/public',
  '/about',
  '/contact',
  '/terms',
  '/privacy',
  '/pricing',
  '/404',
  '/500',
];

const protectedRoutes = [
  '/dashboard',
  '/api/client',
];

const adminRoutes = [
  '/admin',
  '/api/admin',
];

const apiRoutes = [
  '/api/',
];

export async function middleware(request: NextRequest) {
  const { pathname, origin } = request.nextUrl;
  const response = NextResponse.next();

  // Add security headers to all responses
  Object.entries(securityHeaders).forEach(([key, value]) => {
    response.headers.set(key, value);
  });

  // Add CORS headers for API routes
  if (pathname.startsWith('/api/')) {
    response.headers.set('Access-Control-Allow-Origin', process.env.ALLOWED_ORIGINS || '*');
    response.headers.set('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
    response.headers.set('Access-Control-Allow-Headers', 'Content-Type, Authorization');
    response.headers.set('Access-Control-Max-Age', '86400');

    // Handle preflight requests
    if (request.method === 'OPTIONS') {
      return new Response(null, { status: 200, headers: response.headers });
    }
  }

  // Get user information
  const token = await getToken({ 
    req: request, 
    secret: process.env.NEXTAUTH_SECRET 
  });

  const isAuthenticated = !!token;
  const userRole = token?.role as string;
  const userPlan = token?.plan as string;
  const isBot = detectBot(request.headers.get('user-agent') || '');

  // Handle different route types
  try {
    // 1. Handle URL shortcode redirects (highest priority)
    if (await isShortCodeRoute(pathname)) {
      return await handleShortCodeRedirect(request, response);
    }

    // 2. Handle API routes
    if (pathname.startsWith('/api/')) {
      return await handleApiRoute(request, response, token, isBot);
    }

    // 3. Handle authentication routes
    if (pathname.startsWith('/auth/')) {
      return await handleAuthRoute(request, response, isAuthenticated);
    }

    // 4. Handle admin routes
    if (isAdminRoute(pathname)) {
      return await handleAdminRoute(request, response, isAuthenticated, userRole);
    }

    // 5. Handle protected routes
    if (isProtectedRoute(pathname)) {
      return await handleProtectedRoute(request, response, isAuthenticated);
    }

    // 6. Handle public routes and static assets
    return response;

  } catch (error) {
    console.error('Middleware error:', error);
    
    // Return error page for critical failures
    if (pathname.startsWith('/api/')) {
      return NextResponse.json(
        { error: 'Internal server error' }, 
        { status: 500 }
      );
    }
    
    return NextResponse.redirect(new URL('/500', request.url));
  }
}

// Handle short code redirects
async function handleShortCodeRedirect(
  request: NextRequest, 
  response: NextResponse
): Promise<NextResponse> {
  const pathname = request.nextUrl.pathname;
  const shortCode = pathname.slice(1); // Remove leading slash

  // Apply rate limiting for redirects
  const ip = getClientIP(request);
  const identifier = `redirect:${ip}`;

  try {
    await redirectLimiter.check(100, identifier); // 100 requests per minute per IP
  } catch {
    return NextResponse.json(
      { error: 'Rate limit exceeded' }, 
      { status: 429 }
    );
  }

  // Let the API route handle the actual redirect logic
  return response;
}

// Handle API routes
async function handleApiRoute(
  request: NextRequest,
  response: NextResponse,
  token: any,
  isBot: boolean
): Promise<NextResponse> {
  const pathname = request.nextUrl.pathname;
  const ip = getClientIP(request);

  // Block bots from most API endpoints (except public ones)
  if (isBot && !pathname.includes('/api/public/')) {
    return NextResponse.json(
      { error: 'Access denied' }, 
      { status: 403 }
    );
  }

  // Rate limiting for different API categories
  try {
    if (pathname.startsWith('/api/auth/')) {
      // Stricter rate limiting for auth endpoints
      await authLimiter.check(10, `auth:${ip}`); // 10 requests per 15 minutes
    } else if (pathname.startsWith('/api/admin/')) {
      // Admin API rate limiting
      if (!token || token.role !== 'admin') {
        return NextResponse.json(
          { error: 'Unauthorized' }, 
          { status: 401 }
        );
      }
      await apiLimiter.check(100, `admin:${ip}`); // 100 requests per minute
    } else if (pathname.startsWith('/api/client/')) {
      // Client API rate limiting
      if (!token) {
        return NextResponse.json(
          { error: 'Unauthorized' }, 
          { status: 401 }
        );
      }
      
      // Different limits based on plan
      const limit = getPlanApiLimit(token.plan);
      await apiLimiter.check(limit, `client:${token.sub}`);
    } else {
      // General API rate limiting
      await apiLimiter.check(60, `api:${ip}`); // 60 requests per minute
    }
  } catch {
    return NextResponse.json(
      { error: 'Rate limit exceeded' }, 
      { status: 429 }
    );
  }

  return response;
}

// Handle authentication routes
async function handleAuthRoute(
  request: NextRequest,
  response: NextResponse,
  isAuthenticated: boolean
): Promise<NextResponse> {
  const pathname = request.nextUrl.pathname;

  // Redirect authenticated users away from auth pages
  if (isAuthenticated && ['/auth/signin', '/auth/signup'].includes(pathname)) {
    return NextResponse.redirect(new URL('/dashboard', request.url));
  }

  // Rate limiting for auth pages
  const ip = getClientIP(request);
  try {
    await authLimiter.check(20, `auth-page:${ip}`); // 20 visits per 15 minutes
  } catch {
    return NextResponse.redirect(new URL('/rate-limit', request.url));
  }

  return response;
}

// Handle admin routes
async function handleAdminRoute(
  request: NextRequest,
  response: NextResponse,
  isAuthenticated: boolean,
  userRole: string
): Promise<NextResponse> {
  if (!isAuthenticated) {
    const loginUrl = new URL('/auth/signin', request.url);
    loginUrl.searchParams.set('callbackUrl', request.url.toString());
    return NextResponse.redirect(loginUrl);
  }

  if (userRole !== 'admin') {
    return NextResponse.redirect(new URL('/unauthorized', request.url));
  }

  return response;
}

// Handle protected routes
async function handleProtectedRoute(
  request: NextRequest,
  response: NextResponse,
  isAuthenticated: boolean
): Promise<NextResponse> {
  if (!isAuthenticated) {
    const loginUrl = new URL('/auth/signin', request.url);
    loginUrl.searchParams.set('callbackUrl', request.url.toString());
    return NextResponse.redirect(loginUrl);
  }

  return response;
}

// Helper functions
async function isShortCodeRoute(pathname: string): Promise<boolean> {
  // Skip if it's clearly not a short code
  if (pathname === '/' || 
      pathname.startsWith('/api/') || 
      pathname.startsWith('/auth/') ||
      pathname.startsWith('/dashboard/') ||
      pathname.startsWith('/admin/') ||
      pathname.includes('.') || // Files with extensions
      publicRoutes.some(route => pathname.startsWith(route))) {
    return false;
  }

  // Check if it matches short code pattern (6-12 alphanumeric characters)
  const shortCode = pathname.slice(1);
  const shortCodePattern = /^[a-zA-Z0-9]{6,12}$/;
  
  return shortCodePattern.test(shortCode);
}

function isProtectedRoute(pathname: string): boolean {
  return protectedRoutes.some(route => pathname.startsWith(route));
}

function isAdminRoute(pathname: string): boolean {
  return adminRoutes.some(route => pathname.startsWith(route));
}

function getClientIP(request: NextRequest): string {
  const forwarded = request.headers.get('x-forwarded-for');
  const realIP = request.headers.get('x-real-ip');
  
  if (forwarded) {
    return forwarded.split(',')[0].trim();
  }
  
  if (realIP) {
    return realIP;
  }
  
  return '127.0.0.1';
}

function getPlanApiLimit(plan: string): number {
  switch (plan) {
    case 'enterprise':
      return 1000; // 1000 requests per minute
    case 'premium':
      return 300;  // 300 requests per minute
    case 'free':
    default:
      return 60;   // 60 requests per minute
  }
}

// Export middleware configuration
export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public folder files
     */
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
};
// Simple in-memory rate limiter (not for production use)
function rateLimit({
    interval,
    uniqueTokenPerInterval,
}: {
    interval: number;
    uniqueTokenPerInterval: number;
}) {
    // Map: identifier -> { count, expiresAt }
    const tokenMap = new Map<string, { count: number; expiresAt: number }>();

    return {
        async check(limit: number, identifier: string) {
            const now = Date.now();
            let entry = tokenMap.get(identifier);

            if (!entry || entry.expiresAt < now) {
                entry = { count: 0, expiresAt: now + interval };
                tokenMap.set(identifier, entry);
            }

            if (entry.count >= limit) {
                throw new Error('Rate limit exceeded');
            }

            entry.count += 1;

            // Clean up old entries if map grows too large
            if (tokenMap.size > uniqueTokenPerInterval * 2) {
                for (const [key, value] of tokenMap.entries()) {
                    if (value.expiresAt < now) {
                        tokenMap.delete(key);
                    }
                }
            }
        },
    };
}

