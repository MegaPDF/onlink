import { NextRequest, NextResponse } from 'next/server';

export async function redirectMiddleware(request: NextRequest): Promise<NextResponse | null> {
  const { pathname } = request.nextUrl;
  
  // Handle common redirects
  const redirects: { [key: string]: string } = {
    '/login': '/auth/signin',
    '/signup': '/auth/signup',
    '/register': '/auth/signup',
    '/panel': '/admin',
    '/control': '/admin',
    '/cp': '/admin',
    '/user': '/dashboard',
    '/profile': '/dashboard/profile',
    '/account': '/dashboard/profile',
    '/settings': '/dashboard/settings',
    '/docs': '/api-docs',
    '/api-doc': '/api-docs',
    '/api-documentation': '/api-docs'
  };
  
  if (redirects[pathname]) {
    console.log(`🔄 Redirecting ${pathname} to ${redirects[pathname]}`);
    return NextResponse.redirect(new URL(redirects[pathname], request.url));
  }
  
  // Handle trailing slashes
  if (pathname.endsWith('/') && pathname !== '/') {
    const newPathname = pathname.slice(0, -1);
    console.log(`🔄 Removing trailing slash: ${pathname} to ${newPathname}`);
    return NextResponse.redirect(new URL(newPathname, request.url));
  }
  
  // Handle old URL patterns (if migrating from another system)
  if (pathname.startsWith('/old-dashboard/')) {
    const newPath = pathname.replace('/old-dashboard/', '/dashboard/');
    return NextResponse.redirect(new URL(newPath, request.url));
  }
  
  return null;
}

// ============= lib/middleware-utils.ts =============
export function getClientIP(request: NextRequest): string {
  const forwarded = request.headers.get('x-forwarded-for');
  const realIP = request.headers.get('x-real-ip');
  const cfConnectingIP = request.headers.get('cf-connecting-ip'); // Cloudflare
  
  if (cfConnectingIP) return cfConnectingIP.trim();
  if (forwarded) return forwarded.split(',')[0].trim();
  if (realIP) return realIP.trim();
  
  return '127.0.0.1';
}

export function getUserAgent(request: NextRequest): string {
  return request.headers.get('user-agent') || 'Unknown';
}

export function getReferer(request: NextRequest): string | null {
  return request.headers.get('referer');
}

export function isBot(userAgent: string): boolean {
  const botPatterns = [
    /bot/i,
    /crawler/i,
    /spider/i,
    /scraper/i,
    /facebookexternalhit/i,
    /twitterbot/i,
    /linkedinbot/i,
    /whatsapp/i,
    /telegram/i,
    /slackbot/i,
    /googlebot/i,
    /bingbot/i,
    /yandexbot/i,
    /duckduckbot/i
  ];
  
  return botPatterns.some(pattern => pattern.test(userAgent));
}

export function isMobile(userAgent: string): boolean {
  const mobilePatterns = [
    /android/i,
    /iphone/i,
    /ipad/i,
    /ipod/i,
    /blackberry/i,
    /windows phone/i,
    /mobile/i
  ];
  
  return mobilePatterns.some(pattern => pattern.test(userAgent));
}

export function getBrowser(userAgent: string): string {
  if (/chrome/i.test(userAgent)) return 'Chrome';
  if (/firefox/i.test(userAgent)) return 'Firefox';
  if (/safari/i.test(userAgent)) return 'Safari';
  if (/edge/i.test(userAgent)) return 'Edge';
  if (/opera/i.test(userAgent)) return 'Opera';
  return 'Unknown';
}
