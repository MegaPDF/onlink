// lib/redirect-utils.ts
import { NextRequest, NextResponse } from 'next/server';

/**
 * Creates a proper redirect URL that works in both development and production
 */
export function createRedirectResponse(
  req: NextRequest, 
  path: string, 
  status: number = 302
): NextResponse {
  // Use the request's origin to build the redirect URL
  const origin = req.nextUrl.origin;
  const redirectUrl = new URL(path, origin);
  
  return NextResponse.redirect(redirectUrl, status);
}

/**
 * Creates an error redirect to the home page with error parameter
 */
export function createErrorRedirect(
  req: NextRequest, 
  errorType: string
): NextResponse {
  return createRedirectResponse(req, `/?error=${errorType}`);
}

/**
 * Get the base URL from request, useful for generating short URLs
 */
export function getBaseUrlFromRequest(req: NextRequest): string {
  return req.nextUrl.origin;
}

/**
 * Generate short URL using request origin
 */
export function generateShortUrlFromRequest(req: NextRequest, shortCode: string): string {
  const baseUrl = getBaseUrlFromRequest(req);
  return `${baseUrl}/${shortCode}`;
}