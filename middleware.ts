import { NextRequest, NextResponse } from 'next/server';
import { getToken } from 'next-auth/jwt';
import { detectBot } from './lib/middleware-utils';

// Rate limiter configurations
const createRateLimiter = (limit: number, window: number) => ({
  async check(max: number, key: string) {
    return true; // Placeholder - implement with Redis in production
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

  console.log(`🛡️ Middleware processing: ${pathname}`);

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
  const userRole = token?.role as string || 'user';
  const isBot = detectBot(request.headers.get('user-agent') || '');
  const ip = getClientIP(request);

  console.log(`🔍 Auth state: ${isAuthenticated ? 'authenticated' : 'not authenticated'}, role: ${userRole}`);

  try {
    // 1. Handle API routes first
    if (pathname.startsWith('/api/')) {
      return await handleApiRoute(request, response, token, isBot, ip);
    }

    // 2. Handle authentication routes - FIXED: No auto-redirect for /auth/signup
    if (pathname.startsWith('/auth/')) {
      return await handleAuthRoute(request, response, isAuthenticated, userRole, ip);
    }

    // 3. Handle admin routes
    if (pathname.startsWith('/admin')) {
      return await handleAdminRoute(request, response, isAuthenticated, userRole);
    }

    // 4. Handle dashboard routes - FIXED: Role-based redirect
    if (pathname.startsWith('/dashboard')) {
      return await handleProtectedRoute(request, response, isAuthenticated, userRole);
    }

    // 5. Handle known public routes
    if (isPublicRoute(pathname)) {
      return response;
    }

    // 6. Handle potential short code routes
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

// FIXED: Handle authentication routes properly
async function handleAuthRoute(
  request: NextRequest,
  response: NextResponse,
  isAuthenticated: boolean,
  userRole: string,
  ip: string
): Promise<NextResponse> {
  const pathname = request.nextUrl.pathname;

  // FIXED: Only redirect authenticated users from signin page, NOT signup
  if (isAuthenticated) {
    if (pathname === '/auth/signin') {
      // Redirect based on role
      const redirectUrl = getRoleBasedRedirectUrl(userRole);
      console.log(`🔄 Redirecting authenticated user to: ${redirectUrl}`);
      return NextResponse.redirect(new URL(redirectUrl, request.url));
    }
    
    // Allow access to other auth pages (like signup) even when authenticated
    // This prevents the redirect loop when going to /auth/signup
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

  if (userRole !== 'admin' && userRole !== 'moderator') {
    return NextResponse.redirect(new URL('/unauthorized', request.url));
  }

  return response;
}

// FIXED: Handle protected routes with role-based logic
async function handleProtectedRoute(
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

  // FIXED: Redirect admin users to admin dashboard
  if ((userRole === 'admin' || userRole === 'moderator') && request.nextUrl.pathname === '/dashboard') {
    console.log(`🔄 Redirecting ${userRole} from /dashboard to /admin`);
    return NextResponse.redirect(new URL('/admin', request.url));
  }

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
      if (!token || (token.role !== 'admin' && token.role !== 'moderator')) {
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

// Helper function for role-based redirects
function getRoleBasedRedirectUrl(userRole: string): string {
  switch (userRole) {
    case 'admin':
    case 'moderator':
      return '/admin';
    case 'user':
    default:
      return '/dashboard';
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
  const segments = pathname.split('/').filter(Boolean);
  if (segments.length !== 1) {
    return false;
  }

  const code = segments[0];
  const shortCodePattern = /^[a-zA-Z0-9_-]{6,12}$/;
  if (!shortCodePattern.test(code)) {
    return false;
  }

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
  try {
    await redirectLimiter.check(100, `redirect:${ip}`);
  } catch {
    return NextResponse.json(
      { error: 'Rate limit exceeded' }, 
      { status: 429 }
    );
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
  
  return 'unknown';
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
    '/((?!_next/static|_next/image|favicon.ico).*)',
  ],
};