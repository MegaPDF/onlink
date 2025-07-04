// ============= app/api/redirect/[shortCode]/route.ts =============
import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '@/lib/mongodb';
import { URL } from '@/models/URL';
import { AnalyticsTracker } from '@/lib/analytics';
import { parseUserAgent } from '@/lib/utils';

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

    // Find URL
    const url = await URL.findOne({
      $or: [
        { shortCode },
        { customSlug: shortCode }
      ],
      isDeleted: false
    });

    if (!url) {
      // Redirect to 404 page or homepage
      return NextResponse.redirect(new URL('/404', req.url), 302);
    }

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
    const deviceInfo = parseUserAgent(userAgent);

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

    // Check geographic restrictions (if implemented)
    if (url.geoRestrictions && url.geoRestrictions.countries.length > 0) {
      // This would require IP geolocation lookup
      // For now, we'll skip this check
    }

    // Check time restrictions
    if (url.timeRestrictions?.enabled) {
      const now = new Date();
      const currentDay = now.getDay(); // 0 = Sunday, 6 = Saturday
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
        // Redirect to password page
        return NextResponse.redirect(
          new URL(`/protected/${shortCode}`, req.url), 
          302
        );
      }
    }

    // Check for QR code click
    const isQRClick = req.nextUrl.searchParams.get('qr') === '1';
    const qrSource = req.nextUrl.searchParams.get('qr_source') as 'image' | 'pdf' | 'print' | undefined;

    // Track analytics in background (non-blocking)
    setImmediate(async () => {
      try {
        await AnalyticsTracker.trackClick(shortCode, req, {
          isQRClick,
          qrSource
        });
      } catch (analyticsError) {
        console.error('Analytics tracking error:', analyticsError);
        // Don't fail the redirect for analytics errors
      }
    });

    // Build final destination URL with UTM parameters
    let destinationUrl = url.originalUrl;

    // Add UTM parameters if configured
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

    // Update last click timestamp
    setImmediate(async () => {
      try {
        await URL.findByIdAndUpdate(url._id, {
          lastClickAt: new Date()
        });
      } catch (updateError) {
        console.error('Error updating last click timestamp:', updateError);
      }
    });

    // Perform redirect
    const redirectType = url.domain === process.env.NEXT_PUBLIC_BASE_URL ? 301 : 302;
    
    return NextResponse.redirect(destinationUrl, redirectType);

  } catch (error) {
    console.error('Redirect error:', error);
    
    // Fallback redirect to homepage on error
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

    const url = await URL.findOne({
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

    // Return the destination URL for client-side redirect
    return NextResponse.json({
      success: true,
      redirectUrl: `/${shortCode}?pwd=${password}`
    });

  } catch (error) {
    console.error('Password verification error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}