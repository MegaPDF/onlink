import { NextRequest, NextResponse } from 'next/server';

export async function securityMiddleware(request: NextRequest): Promise<NextResponse | null> {
  const response = NextResponse.next();
  
  // Security headers
  const securityHeaders = {
    // Prevent XSS attacks
    'X-Content-Type-Options': 'nosniff',
    'X-Frame-Options': 'DENY',
    'X-XSS-Protection': '1; mode=block',
    
    // HTTPS enforcement
    'Strict-Transport-Security': 'max-age=31536000; includeSubDomains',
    
    // Content Security Policy
    'Content-Security-Policy': [
      "default-src 'self'",
      "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://accounts.google.com https://apis.google.com",
      "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
      "font-src 'self' https://fonts.gstatic.com",
      "img-src 'self' data: https: blob:",
      "connect-src 'self' https://api.stripe.com https://accounts.google.com",
      "frame-src 'self' https://accounts.google.com",
      "object-src 'none'",
      "base-uri 'self'",
      "form-action 'self'"
    ].join('; '),
    
    // Referrer policy
    'Referrer-Policy': 'strict-origin-when-cross-origin',
    
    // Permissions policy
    'Permissions-Policy': [
      'camera=()',
      'microphone=()',
      'geolocation=(self)',
      'interest-cohort=()'
    ].join(', ')
  };
  
  // Apply security headers
  Object.entries(securityHeaders).forEach(([key, value]) => {
    response.headers.set(key, value);
  });
  
  // Additional security checks
  const { pathname } = request.nextUrl;
  const userAgent = request.headers.get('user-agent') || '';
  
  // Block known malicious user agents
  if (isMaliciousUserAgent(userAgent)) {
    console.log(`🚫 Blocked malicious user agent: ${userAgent}`);
    return NextResponse.json(
      { error: 'Access denied' }, 
      { status: 403 }
    );
  }
  
  // Block suspicious patterns in URLs
  if (hasSuspiciousPatterns(pathname)) {
    console.log(`🚫 Blocked suspicious URL pattern: ${pathname}`);
    return NextResponse.json(
      { error: 'Access denied' }, 
      { status: 403 }
    );
  }
  
  return response;
}

function isMaliciousUserAgent(userAgent: string): boolean {
  const maliciousPatterns = [
    /sqlmap/i,
    /nikto/i,
    /nessus/i,
    /openvas/i,
    /nmap/i,
    /masscan/i,
    /zap/i,
    /w3af/i,
    /acunetix/i,
    /appscan/i,
    /burp/i,
    /<script/i,
    /\.\./,
    /union.*select/i,
    /base64_decode/i
  ];
  
  return maliciousPatterns.some(pattern => pattern.test(userAgent));
}

function hasSuspiciousPatterns(pathname: string): boolean {
  const suspiciousPatterns = [
    /\.\./,  // Directory traversal
    /\/etc\/passwd/,
    /\/proc\/self\/environ/,
    /wp-admin/,
    /wp-login/,
    /phpmyadmin/,
    /admin\.php/,
    /config\.php/,
    /\.env/,
    /\.git/,
    /\.svn/,
    /\.htaccess/,
    /backup/,
    /dump/,
    /sql/i,
    /<script/i,
    /javascript:/i,
    /vbscript:/i,
    /onload=/i,
    /onerror=/i
  ];
  
  return suspiciousPatterns.some(pattern => pattern.test(pathname));
}