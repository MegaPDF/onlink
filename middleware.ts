import { NextRequest, NextResponse } from 'next/server';
import { getToken } from 'next-auth/jwt';
import { detectBot } from './lib/middleware-utils';

// Rate limiter configurations (simplified for this example)
const createRateLimiter = (limit: number, window: number) => ({
  async check(max: number, key: string) {
    // In production, use Redis or similar for distributed rate limiting
    // For now, this is a placeholder
    return true;
  }
});

const authLimiter = createRateLimiter(20, 15 * 60 * 1000);
const apiLimiter = createRateLimiter(100, 60 * 1000);
const redirectLimiter = createRateLimiter(100, 60 * 1000);

// Security headers
const securityHeaders = {
  'X-Frame-Options': 'DENY',
  'X-Content-Type-Options': 'nosniff',
  'Referrer-Policy': 'strict-origin-when-cross-origin',
  'X-XSS-Protection': '1; mode=block',
  'Strict-Transport-Security': 'max-age=31536000; includeSubDomains',
  'Permissions-Policy': 'camera=(), microphone=(), geolocation=()',
};

// Route patterns
const STATIC_EXTENSIONS = [
  '.js', '.css', '.png', '.jpg', '.jpeg', '.gif', '.svg', '.ico', '.webp',
  '.woff', '.woff2', '.ttf', '.eot', '.json', '.xml', '.txt', '.map'
];

const RESERVED_PATHS = [
  '/', '/home', '/index',
  '/auth', '/login', '/signin', '/signup', '/register',
  '/dashboard', '/admin', '/api',
  '/about', '/contact', '/terms', '/privacy', '/pricing', '/help',
  '/404', '/500', '/error', '/unauthorized',
  '/manifest.json', '/robots.txt', '/sitemap.xml', '/favicon.ico',
  '/sw.js', '/service-worker.js'
];

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const response = NextResponse.next();

  // Skip middleware for static files
  if (STATIC_EXTENSIONS.some(ext => pathname.includes(ext))) {
    return response;
  }

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
  const isBot = detectBot(request.headers.get('user-agent') || '');
  const ip = getClientIP(request);

  console.log(`🛡️ Middleware processing: ${pathname}`);

  try {
    // 1. Handle API routes first
    if (pathname.startsWith('/api/')) {
      return await handleApiRoute(request, response, token, isBot, ip);
    }

    // 2. Handle authentication routes
    if (pathname.startsWith('/auth/')) {
      return await handleAuthRoute(request, response, isAuthenticated, ip);
    }

    // 3. Handle admin routes
    if (pathname.startsWith('/admin')) {
      return await handleAdminRoute(request, response, isAuthenticated, userRole);
    }

    // 4. Handle dashboard routes
    if (pathname.startsWith('/dashboard')) {
      return await handleProtectedRoute(request, response, isAuthenticated);
    }

    // 5. Handle known public routes
    if (isPublicRoute(pathname)) {
      return response;
    }

    // 6. Handle potential short code routes (only for single segments)
    if (await isPotentialShortCode(pathname)) {
      return await handleShortCodeRedirect(request, response, ip);
    }

    // 7. Default: allow the request to continue
    return response;

  } catch (error) {
    console.error('Middleware error:', error);
    
    if (pathname.startsWith('/api/')) {
      return NextResponse.json(
        { error: 'Internal server error' }, 
        { status: 500 }
      );
    }
    
    return NextResponse.redirect(new URL('/500', request.url));
  }
}

// Check if route is public
function isPublicRoute(pathname: string): boolean {
  const publicRoutes = [
    '/',
    '/about',
    '/contact',
    '/terms',
    '/privacy',
    '/pricing',
    '/404',
    '/500',
    '/unauthorized',
    '/link-disabled',
    '/link-expired',
    '/link-limit-reached'
  ];

  return publicRoutes.includes(pathname) || 
         RESERVED_PATHS.some(path => pathname.startsWith(path));
}

// Check if this could be a short code
async function isPotentialShortCode(pathname: string): Promise<boolean> {
  // Must be a single segment (no additional slashes after the first one)
  const segments = pathname.split('/').filter(Boolean);
  if (segments.length !== 1) {
    return false;
  }

  const code = segments[0];

  // Must match short code pattern (6-12 alphanumeric characters)
  const shortCodePattern = /^[a-zA-Z0-9_-]{6,12}$/;
  if (!shortCodePattern.test(code)) {
    return false;
  }

  // Must not be a reserved word
  const reservedWords = [
    'api', 'admin', 'dashboard', 'auth', 'www', 'mail', 'ftp',
    'blog', 'shop', 'store', 'app', 'mobile', 'secure', 'ssl',
    'help', 'support', 'contact', 'about', 'terms', 'privacy',
    'login', 'signup', 'register', 'account', 'profile', 'settings'
  ];

  if (reservedWords.includes(code.toLowerCase())) {
    return false;
  }

  return true;
}

// Handle short code redirects
async function handleShortCodeRedirect(
  request: NextRequest, 
  response: NextResponse,
  ip: string
): Promise<NextResponse> {
  // Apply rate limiting for redirects
  try {
    await redirectLimiter.check(100, `redirect:${ip}`);
  } catch {
    return NextResponse.json(
      { error: 'Rate limit exceeded' }, 
      { status: 429 }
    );
  }

  // Let the dynamic route handle the actual redirect logic
  return response;
}

// Handle API routes
async function handleApiRoute(
  request: NextRequest,
  response: NextResponse,
  token: any,
  isBot: boolean,
  ip: string
): Promise<NextResponse> {
  const pathname = request.nextUrl.pathname;

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
      await authLimiter.check(10, `auth:${ip}`);
    } else if (pathname.startsWith('/api/admin/')) {
      if (!token || token.role !== 'admin') {
        return NextResponse.json(
          { error: 'Unauthorized' }, 
          { status: 401 }
        );
      }
      await apiLimiter.check(100, `admin:${ip}`);
    } else if (pathname.startsWith('/api/client/')) {
      if (!token) {
        return NextResponse.json(
          { error: 'Unauthorized' }, 
          { status: 401 }
        );
      }
      
      const limit = getPlanApiLimit(token.plan);
      await apiLimiter.check(limit, `client:${token.sub}`);
    } else {
      await apiLimiter.check(60, `api:${ip}`);
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
  isAuthenticated: boolean,
  ip: string
): Promise<NextResponse> {
  const pathname = request.nextUrl.pathname;

  // Redirect authenticated users away from auth pages
  if (isAuthenticated && ['/auth/signin', '/auth/signup'].includes(pathname)) {
    return NextResponse.redirect(new URL('/dashboard', request.url));
  }

  // Rate limiting for auth pages
  try {
    await authLimiter.check(20, `auth-page:${ip}`);
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
function getClientIP(request: NextRequest): string {
  const forwarded = request.headers.get('x-forwarded-for');
  const realIP = request.headers.get('x-real-ip');
  
  if (forwarded) {
    return forwarded.split(',')[0].trim();
  }
  
  if (realIP) {
    return realIP;
  }
  
  return request.ip || 'unknown';
}

function getPlanApiLimit(plan: string): number {
  const limits = {
    free: 50,
    premium: 200,
    team: 500,
    enterprise: 1000
  } as const;

  return limits[plan as keyof typeof limits] || 50;
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     */
    '/((?!_next/static|_next/image|favicon.ico).*)',
  ],
};
