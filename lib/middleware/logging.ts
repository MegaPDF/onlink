import { NextRequest } from 'next/server';

interface RequestLog {
  timestamp: string;
  method: string;
  url: string;
  ip: string;
  userAgent: string;
  referer?: string;
  responseTime?: number;
}

export async function logRequestMiddleware(request: NextRequest): Promise<void> {
  const startTime = Date.now();
  const ip = getClientIP(request);
  
  const logData: RequestLog = {
    timestamp: new Date().toISOString(),
    method: request.method,
    url: request.url,
    ip,
    userAgent: request.headers.get('user-agent') || 'Unknown',
    referer: request.headers.get('referer') || undefined
  };
  
  // Log the request (in production, send to your logging service)
  if (process.env.NODE_ENV === 'development') {
    console.log('📝 Request:', logData);
  }
  
  // Store detailed logs for security analysis
  if (shouldLogDetailed(request.nextUrl.pathname)) {
    await storeSecurityLog(logData);
  }
}

function shouldLogDetailed(pathname: string): boolean {
  const detailedLogPaths = [
    '/api/auth',
    '/api/admin',
    '/admin',
    '/api/client/shorten'
  ];
  
  return detailedLogPaths.some(path => pathname.startsWith(path));
}

async function storeSecurityLog(logData: RequestLog): Promise<void> {
  try {
    // In production, store this in your database or logging service
    // For now, just console.log in development
    if (process.env.NODE_ENV === 'development') {
      console.log('🔍 Security log:', logData);
    }
    
    // Example: Store in database
    // await db.securityLogs.create(logData);
    
  } catch (error) {
    console.error('❌ Failed to store security log:', error);
  }
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
