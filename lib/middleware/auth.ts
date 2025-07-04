import { NextRequest, NextResponse } from 'next/server';
import { getToken } from 'next-auth/jwt';

export async function authMiddleware(request: NextRequest): Promise<NextResponse | null> {
  const { pathname } = request.nextUrl;
  
  try {
    const token = await getToken({ 
      req: request, 
      secret: process.env.NEXTAUTH_SECRET 
    });

    // No token means user is not authenticated
    if (!token) {
      console.log('🚫 No authentication token found');
      
      if (pathname.startsWith('/api/')) {
        return NextResponse.json(
          { error: 'Authentication required' }, 
          { status: 401 }
        );
      }
      
      // Redirect to sign-in page with callback URL
      const signInUrl = new URL('/auth/signin', request.url);
      signInUrl.searchParams.set('callbackUrl', pathname);
      return NextResponse.redirect(signInUrl);
    }

    // Check if user account is active
    if (!token.isActive) {
      console.log('🚫 User account is inactive');
      
      if (pathname.startsWith('/api/')) {
        return NextResponse.json(
          { error: 'Account is inactive' }, 
          { status: 403 }
        );
      }
      
      return NextResponse.redirect(new URL('/auth/account-inactive', request.url));
    }

    // Admin-only routes
    if (pathname.startsWith('/admin') || pathname.startsWith('/api/admin')) {
      if (token.role !== 'admin') {
        console.log('🚫 Admin access required');
        
        if (pathname.startsWith('/api/')) {
          return NextResponse.json(
            { error: 'Admin access required' }, 
            { status: 403 }
          );
        }
        
        return NextResponse.redirect(new URL('/dashboard', request.url));
      }
    }

    // Premium features check
    if (requiresPremium(pathname) && token.plan === 'free') {
      console.log('💎 Premium feature accessed by free user');
      
      if (pathname.startsWith('/api/')) {
        return NextResponse.json(
          { error: 'Premium subscription required', upgradeRequired: true }, 
          { status: 402 }
        );
      }
      
      return NextResponse.redirect(new URL('/dashboard/billing?upgrade=true', request.url));
    }

    // Add user info to headers for API routes
    if (pathname.startsWith('/api/')) {
      const response = NextResponse.next();
      response.headers.set('x-user-id', token.sub || '');
      response.headers.set('x-user-role', token.role || 'user');
      response.headers.set('x-user-plan', token.plan || 'free');
      return response;
    }

    return null; // Continue to next middleware

  } catch (error) {
    console.error('❌ Auth middleware error:', error);
    
    if (pathname.startsWith('/api/')) {
      return NextResponse.json(
        { error: 'Authentication error' }, 
        { status: 500 }
      );
    }
    
    return NextResponse.redirect(new URL('/auth/error', request.url));
  }
}

function requiresPremium(pathname: string): boolean {
  const premiumPaths = [
    '/dashboard/analytics',
    '/dashboard/qr-codes',
    '/dashboard/bulk',
    '/dashboard/export',
    '/dashboard/domains',
    '/api/client/analytics',
    '/api/client/qr-codes',
    '/api/client/bulk-shorten',
    '/api/client/export'
  ];
  
  return premiumPaths.some(path => pathname.startsWith(path));
}