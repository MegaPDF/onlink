import { NextRequest, NextResponse } from 'next/server';
import { getToken } from 'next-auth/jwt';
import { 
  rateLimitMiddleware,
  securityMiddleware,
  authMiddleware,
  corsMiddleware,
  logRequestMiddleware,
  redirectMiddleware,
  sanitizeMiddleware
} from '@/lib/middleware';

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  
  console.log(`🛡️ Middleware processing: ${request.method} ${pathname}`);

  try {
    // 1. Apply CORS headers for API routes
    if (pathname.startsWith('/api/')) {
      const corsResponse = await corsMiddleware(request);
      if (corsResponse) return corsResponse;
    }

    // 2. Log all requests (for monitoring)
    await logRequestMiddleware(request);

    // 3. Apply security headers
    const securityResponse = await securityMiddleware(request);
    if (securityResponse) return securityResponse;

    // 4. Sanitize input for sensitive endpoints
    if (shouldSanitizeRequest(pathname)) {
      const sanitizeResponse = await sanitizeMiddleware(request);
      if (sanitizeResponse) return sanitizeResponse;
    }

    // 5. Apply rate limiting
    if (shouldRateLimit(pathname)) {
      const rateLimitResponse = await rateLimitMiddleware(request);
      if (rateLimitResponse) return rateLimitResponse;
    }

    // 6. Handle authentication and authorization
    if (requiresAuth(pathname)) {
      const authResponse = await authMiddleware(request);
      if (authResponse) return authResponse;
    }

    // 7. Handle redirects
    const redirectResponse = await redirectMiddleware(request);
    if (redirectResponse) return redirectResponse;

    // 8. Continue to the next middleware or page
    return NextResponse.next();

  } catch (error) {
    console.error('❌ Middleware error:', error);
    
    // Return error response for API routes
    if (pathname.startsWith('/api/')) {
      return NextResponse.json(
        { error: 'Internal server error' }, 
        { status: 500 }
      );
    }
    
    // Redirect to error page for app routes
    return NextResponse.redirect(new URL('/error', request.url));
  }
}

// Helper functions to determine which middleware to apply
function requiresAuth(pathname: string): boolean {
  const protectedPaths = [
    '/dashboard',
    '/admin',
    '/api/client',
    '/api/admin',
    '/api/user'
  ];
  
  const publicPaths = [
    '/api/auth',
    '/api/health',
    '/api/public'
  ];
  
  // Check if it's a public path first
  if (publicPaths.some(path => pathname.startsWith(path))) {
    return false;
  }
  
  return protectedPaths.some(path => pathname.startsWith(path));
}

function shouldRateLimit(pathname: string): boolean {
  const rateLimitedPaths = [
    '/api/auth/signin',
    '/api/auth/signup',
    '/api/auth/forgot-password',
    '/api/auth/reset-password',
    '/api/client/shorten',
    '/api/public'
  ];
  
  return rateLimitedPaths.some(path => pathname.startsWith(path));
}

function shouldSanitizeRequest(pathname: string): boolean {
  const sanitizePaths = [
    '/api/client/shorten',
    '/api/admin',
    '/api/client/folders',
    '/api/auth/signup',
    '/api/auth/signin'
  ];
  
  return sanitizePaths.some(path => pathname.startsWith(path));
}

// Configure which paths the middleware should run on
export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public folder
     */
    '/((?!_next/static|_next/image|favicon.ico|public/).*)',
  ],
};
