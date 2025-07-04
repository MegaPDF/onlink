import { NextRequest, NextResponse } from 'next/server';

export async function sanitizeMiddleware(request: NextRequest): Promise<NextResponse | null> {
  const { pathname } = request.nextUrl;
  
  // Only sanitize POST/PUT/PATCH requests with JSON body
  if (!['POST', 'PUT', 'PATCH'].includes(request.method)) {
    return null;
  }
  
  try {
    const contentType = request.headers.get('content-type');
    
    if (!contentType?.includes('application/json')) {
      return null;
    }
    
    // Clone request to read body
    const body = await request.json();
    const sanitizedBody = sanitizeObject(body);
    
    // Create new request with sanitized body
    const sanitizedRequest = new Request(request.url, {
      method: request.method,
      headers: request.headers,
      body: JSON.stringify(sanitizedBody)
    });
    
    // Continue with sanitized request
    return NextResponse.next();
    
  } catch (error) {
    console.error('❌ Sanitization error:', error);
    
    return NextResponse.json(
      { error: 'Invalid request data' }, 
      { status: 400 }
    );
  }
}

function sanitizeObject(obj: any): any {
  if (typeof obj === 'string') {
    return sanitizeString(obj);
  }
  
  if (Array.isArray(obj)) {
    return obj.map(item => sanitizeObject(item));
  }
  
  if (obj && typeof obj === 'object') {
    const sanitized: any = {};
    for (const [key, value] of Object.entries(obj)) {
      sanitized[sanitizeString(key)] = sanitizeObject(value);
    }
    return sanitized;
  }
  
  return obj;
}

function sanitizeString(str: string): string {
  if (typeof str !== 'string') return str;
  
  return str
    // Remove potential XSS
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
    .replace(/<iframe\b[^<]*(?:(?!<\/iframe>)<[^<]*)*<\/iframe>/gi, '')
    .replace(/javascript:/gi, '')
    .replace(/vbscript:/gi, '')
    .replace(/on\w+\s*=/gi, '')
    
    // Remove potential SQL injection
    .replace(/(\b(union|select|insert|update|delete|drop|create|alter|exec|execute)\b)/gi, '')
    
    // Remove directory traversal
    .replace(/\.\./g, '')
    
    // Trim whitespace
    .trim()
    
    // Limit length to prevent DoS
    .slice(0, 10000);
}
