
import { NextRequest, NextResponse } from 'next/server';

export async function corsMiddleware(request: NextRequest): Promise<NextResponse | null> {
  const { pathname } = request.nextUrl;
  
  // Only apply CORS to API routes
  if (!pathname.startsWith('/api/')) {
    return null;
  }
  
  const origin = request.headers.get('origin');
  const method = request.method;
  
  // Allowed origins (configure based on your needs)
  const allowedOrigins = [
    'http://localhost:3000',
    'http://localhost:3001',
    'https://yourdomain.com',
    'https://app.yourdomain.com'
  ];
  
  // Check if origin is allowed
  const isAllowedOrigin = !origin || allowedOrigins.includes(origin) || 
    (process.env.NODE_ENV === 'development' && origin.startsWith('http://localhost'));
  
  if (!isAllowedOrigin) {
    console.log(`🚫 CORS blocked origin: ${origin}`);
    return NextResponse.json(
      { error: 'CORS policy violation' }, 
      { status: 403 }
    );
  }
  
  // Handle preflight requests
  if (method === 'OPTIONS') {
    return new NextResponse(null, {
      status: 200,
      headers: {
        'Access-Control-Allow-Origin': origin || '*',
        'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Requested-With',
        'Access-Control-Allow-Credentials': 'true',
        'Access-Control-Max-Age': '86400'
      }
    });
  }
  
  // Add CORS headers to actual requests
  const response = NextResponse.next();
  response.headers.set('Access-Control-Allow-Origin', origin || '*');
  response.headers.set('Access-Control-Allow-Credentials', 'true');
  
  return response;
}
