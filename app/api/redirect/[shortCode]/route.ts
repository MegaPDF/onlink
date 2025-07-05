
import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '@/lib/mongodb';
import { URL as URLModel } from '@/models/URL';
import { AnalyticsTracker } from '@/lib/analytics';
import { getLocationFromIP } from '@/lib/geolocation';

export async function GET(
  req: NextRequest,
  { params }: { params: { shortCode: string } }
) {
  try {
    await connectDB();

    const { shortCode } = params;
    
    if (!shortCode) {
      return NextResponse.redirect(new URL('/', req.url), 302);
    }

    console.log('🔍 Looking for shortCode:', shortCode);

    // Find URL using the renamed model
    const url = await URLModel.findOne({
      $or: [
        { shortCode },
        { customSlug: shortCode }
      ],
      isDeleted: false
    });

    if (!url) {
      console.log('❌ URL not found for shortCode:', shortCode);
      return NextResponse.redirect(new URL('/404', req.url), 302);
    }

    console.log('✅ URL found:', url.originalUrl);

    // Check if URL is active
    if (!url.isActive) {
      return NextResponse.redirect(new URL('/link-disabled', req.url), 302);
    }

    // Check expiration
    if (url.expiresAt && url.expiresAt < new Date()) {
      return NextResponse.redirect(new URL('/link-expired', req.url), 302);
    }

    // Check click limit
    if (url.clickLimit && url.clicks.total >= url.clickLimit) {
      return NextResponse.redirect(new URL('/link-limit-reached', req.url), 302);
    }

    // Get user agent and check device restrictions
    const userAgent = req.headers.get('user-agent') || '';
    const deviceInfo = AnalyticsTracker.parseUserAgent(userAgent);

    if (url.deviceRestrictions) {
      const restrictions = url.deviceRestrictions;
      if (
        (deviceInfo.deviceType === 'mobile' && !restrictions.mobile) ||
        (deviceInfo.deviceType === 'tablet' && !restrictions.tablet) ||
        (deviceInfo.deviceType === 'desktop' && !restrictions.desktop)
      ) {
        return NextResponse.redirect(new URL('/device-not-allowed', req.url), 302);
      }
    }

    // Check time restrictions
    if (url.timeRestrictions?.enabled) {
      const now = new Date();
      const currentDay = now.getDay();
      const currentTime = `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}`;
      
      const isAllowed = url.timeRestrictions.schedule.some(schedule => {
        return schedule.day === currentDay && 
               currentTime >= schedule.startTime && 
               currentTime <= schedule.endTime;
      });

      if (!isAllowed) {
        return NextResponse.redirect(new URL('/access-time-restricted', req.url), 302);
      }
    }

    // Check password protection
    if (url.isPasswordProtected) {
      const password = req.nextUrl.searchParams.get('pwd');
      if (!password || password !== url.password) {
        return NextResponse.redirect(
          new URL(`/protected/${shortCode}`, req.url), 
          302
        );
      }
    }

    // Get client information for tracking
    const clientIP = getClientIP(req);
    const referrer = req.headers.get('referer');
    
    // Check if this is a tracking request (not a reload)
    const trackingSkipped = req.nextUrl.searchParams.get('_t') === 'skip';
    
    if (!trackingSkipped) {
  console.log('📊 Processing analytics tracking...');
  
  // Track analytics with geolocation (non-blocking)
  setImmediate(async () => {
    try {
      // Get location data
      const locationData = await getLocationFromIP(clientIP);
      
      const analyticsResult = await AnalyticsTracker.recordClick({
        shortCode,
        ip: clientIP,
        userAgent: userAgent,
        referrer: referrer || undefined,
        country: locationData.country,
        city: locationData.city,
        device: deviceInfo
      });
      
      if (analyticsResult) {
        console.log('✅ Analytics recorded successfully with location:', locationData.country);
      } else {
        console.log('⏭️ Analytics skipped (likely reload or duplicate)');
      }
    } catch (analyticsError) {
      console.error('❌ Analytics tracking error:', analyticsError);
    }
  });
} else {
  console.log('⏭️ Analytics tracking skipped via parameter');
}

    // Build final destination URL with UTM parameters
    let destinationUrl = url.originalUrl;

    if (url.utmParameters) {
      const urlObj = new URL(destinationUrl);
      const utmParams = url.utmParameters;

      if (utmParams.source) urlObj.searchParams.set('utm_source', utmParams.source);
      if (utmParams.medium) urlObj.searchParams.set('utm_medium', utmParams.medium);
      if (utmParams.campaign) urlObj.searchParams.set('utm_campaign', utmParams.campaign);
      if (utmParams.term) urlObj.searchParams.set('utm_term', utmParams.term);
      if (utmParams.content) urlObj.searchParams.set('utm_content', utmParams.content);

      destinationUrl = urlObj.toString();
    }

    console.log('🚀 Redirecting to:', destinationUrl);

    // Create response with cache headers to prevent unnecessary reloads
    const response = NextResponse.redirect(destinationUrl, 302);
    
    // Add headers to prevent caching of the redirect
    response.headers.set('Cache-Control', 'no-cache, no-store, must-revalidate');
    response.headers.set('Pragma', 'no-cache');
    response.headers.set('Expires', '0');
    
    return response;

  } catch (error) {
    console.error('❌ Redirect error:', error);
    return NextResponse.redirect(new URL('/', req.url), 302);
  }
}

// Handle POST requests for password-protected links
export async function POST(
  req: NextRequest,
  { params }: { params: { shortCode: string } }
) {
  try {
    await connectDB();

    const { shortCode } = params;
    const { password } = await req.json();

    const url = await URLModel.findOne({
      $or: [
        { shortCode },
        { customSlug: shortCode }
      ],
      isDeleted: false,
      isPasswordProtected: true
    });

    if (!url) {
      return NextResponse.json({ error: 'Link not found' }, { status: 404 });
    }

    if (!url.isActive) {
      return NextResponse.json({ error: 'Link is disabled' }, { status: 403 });
    }

    if (password !== url.password) {
      return NextResponse.json({ error: 'Invalid password' }, { status: 401 });
    }

    return NextResponse.json({
      success: true,
      redirectUrl: `/${shortCode}?pwd=${password}`
    });

  } catch (error) {
    console.error('Password verification error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

/**
 * Get client IP address from various headers
 */
function getClientIP(req: NextRequest): string {
  // Check various headers for the real IP
  const forwardedFor = req.headers.get('x-forwarded-for');
  const realIP = req.headers.get('x-real-ip');
  const cfConnectingIP = req.headers.get('cf-connecting-ip'); // Cloudflare
  
  if (forwardedFor) {
    // X-Forwarded-For can contain multiple IPs, get the first one
    return forwardedFor.split(',')[0].trim();
  }
  
  if (cfConnectingIP) {
    return cfConnectingIP;
  }
  
  if (realIP) {
    return realIP;
  }
  
  // Fallback for localhost development
  return '127.0.0.1';
}