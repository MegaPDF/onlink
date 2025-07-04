import { NextRequest, NextResponse } from 'next/server';

interface RateLimitStore {
  [key: string]: {
    count: number;
    resetTime: number;
  };
}

// In-memory store (use Redis in production)
const rateLimitStore: RateLimitStore = {};

export async function rateLimitMiddleware(request: NextRequest): Promise<NextResponse | null> {
  const { pathname } = request.nextUrl;
  const ip = getClientIP(request);
  
  // Different rate limits for different endpoints
  const rateLimitConfig = getRateLimitConfig(pathname);
  if (!rateLimitConfig) return null;
  
  const key = `${ip}:${pathname}`;
  const now = Date.now();
  
  // Clean up expired entries
  if (rateLimitStore[key] && now > rateLimitStore[key].resetTime) {
    delete rateLimitStore[key];
  }
  
  // Check current rate limit
  if (!rateLimitStore[key]) {
    rateLimitStore[key] = {
      count: 1,
      resetTime: now + rateLimitConfig.windowMs
    };
  } else {
    rateLimitStore[key].count++;
  }
  
  const { count, resetTime } = rateLimitStore[key];
  const remaining = Math.max(0, rateLimitConfig.maxRequests - count);
  
  // Add rate limit headers
  const headers = new Headers();
  headers.set('X-RateLimit-Limit', rateLimitConfig.maxRequests.toString());
  headers.set('X-RateLimit-Remaining', remaining.toString());
  headers.set('X-RateLimit-Reset', Math.ceil(resetTime / 1000).toString());
  
  if (count > rateLimitConfig.maxRequests) {
    console.log(`🚫 Rate limit exceeded for ${ip} on ${pathname}`);
    
    headers.set('Retry-After', Math.ceil((resetTime - now) / 1000).toString());
    
    return NextResponse.json(
      { 
        error: 'Rate limit exceeded', 
        retryAfter: Math.ceil((resetTime - now) / 1000)
      },
      { status: 429, headers }
    );
  }
  
  // Continue with rate limit headers
  const response = NextResponse.next();
  headers.forEach((value, key) => {
    response.headers.set(key, value);
  });
  
  return response;
}

function getRateLimitConfig(pathname: string): { maxRequests: number; windowMs: number } | null {
  const configs: { [key: string]: { maxRequests: number; windowMs: number } } = {
    '/api/auth/signin': { maxRequests: 5, windowMs: 15 * 60 * 1000 }, // 5 per 15 min
    '/api/auth/signup': { maxRequests: 3, windowMs: 60 * 60 * 1000 }, // 3 per hour
    '/api/auth/forgot-password': { maxRequests: 3, windowMs: 15 * 60 * 1000 }, // 3 per 15 min
    '/api/client/shorten': { maxRequests: 100, windowMs: 60 * 60 * 1000 }, // 100 per hour
    '/api/public': { maxRequests: 1000, windowMs: 60 * 60 * 1000 }, // 1000 per hour
  };
  
  for (const [path, config] of Object.entries(configs)) {
    if (pathname.startsWith(path)) {
      return config;
    }
  }
  
  return null;
}

function getClientIP(request: NextRequest): string {
  const forwarded = request.headers.get('x-forwarded-for');
  const realIP = request.headers.get('x-real-ip');
  
  if (forwarded) {
    return forwarded.split(',')[0].trim();
  }
  
  if (realIP) {
    return realIP.trim();
  }
  
  return '127.0.0.1';
}