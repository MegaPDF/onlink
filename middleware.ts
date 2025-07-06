import { NextRequest, NextResponse } from 'next/server';
import { getToken } from 'next-auth/jwt';

export const config = {
  matcher: ['/dashboard/:path*']
};

export default async function middleware(req: NextRequest) {
  console.log('🔍 Simple middleware executing for:', req.nextUrl.pathname);
  
  const token = await getToken({ req, secret: process.env.NEXTAUTH_SECRET });
  
  console.log('🔑 Token found:', !!token);
  console.log('📧 User email:', token?.email || 'None');
  
  if (!token) {
    console.log('❌ Redirecting to sign-in');
    const signInUrl = new URL('/auth/signin', req.url);
    const response = NextResponse.redirect(signInUrl);
    console.log('🔄 Redirect response created');
    return response;
  }
  
  console.log('✅ Allowing request');
  return NextResponse.next();
}