// app/[shortCode]/page.tsx - Next.js 15 Compatible
import { redirect } from "next/navigation";
import { connectDB } from "@/lib/mongodb";
import { URL } from "@/models/URL";
import { parseUserAgent } from "@/lib/utils";
import { headers } from "next/headers";
import PasswordProtectedLink from "@/components/password-protected-link";

interface PageProps {
  params: Promise<{
    shortCode: string;
  }>;
  searchParams: Promise<{
    pwd?: string;
    qr?: string;
    qr_source?: "image" | "pdf" | "print";
  }>;
}

export default async function ShortCodePage({
  params,
  searchParams,
}: PageProps) {
  // Await the params and searchParams in Next.js 15
  const resolvedParams = await params;
  const resolvedSearchParams = await searchParams;

  const { shortCode } = resolvedParams;
  const { pwd, qr, qr_source } = resolvedSearchParams;

  if (!shortCode) {
    redirect("/");
  }

  try {
    await connectDB();

    // Find URL
    const url = await URL.findOne({
      $or: [{ shortCode }, { customSlug: shortCode }],
      isDeleted: false,
    });

    if (!url) {
      redirect("/404");
    }

    // Check if URL is active
    if (!url.isActive) {
      redirect("/link-disabled");
    }

    // Check expiration
    if (url.expiresAt && url.expiresAt < new Date()) {
      redirect("/link-expired");
    }

    // Check click limit
    if (url.clickLimit && url.clicks.total >= url.clickLimit) {
      redirect("/link-limit-reached");
    }

    // Check password protection
    if (url.isPasswordProtected) {
      if (!pwd || pwd !== url.password) {
        // Return password protection component instead of redirecting
        return <PasswordProtectedLink shortCode={shortCode} />;
      }
    }

    // Get headers for analytics and device restrictions
    const headersList = await headers();
    const userAgent = headersList.get("user-agent") || "";

    // Check device restrictions
    const deviceInfo = parseUserAgent(userAgent);

    if (url.deviceRestrictions) {
      const restrictions = url.deviceRestrictions;
      if (
        (deviceInfo.deviceType === "mobile" && !restrictions.mobile) ||
        (deviceInfo.deviceType === "tablet" && !restrictions.tablet) ||
        (deviceInfo.deviceType === "desktop" && !restrictions.desktop)
      ) {
        redirect("/device-not-allowed");
      }
    }

    // Check time restrictions
    if (url.timeRestrictions?.enabled) {
      const now = new Date();
      const currentDay = now.getDay();
      const currentTime = `${now.getHours().toString().padStart(2, "0")}:${now
        .getMinutes()
        .toString()
        .padStart(2, "0")}`;

      const isAllowed = url.timeRestrictions.schedule.some((schedule) => {
        return (
          schedule.day === currentDay &&
          currentTime >= schedule.startTime &&
          currentTime <= schedule.endTime
        );
      });

      if (!isAllowed) {
        redirect("/access-time-restricted");
      }
    }

    // Build destination URL with UTM parameters
    let destinationUrl = url.originalUrl;

    if (url.utmParameters) {
      const urlObj = new URL(destinationUrl);
      const utmParams = url.utmParameters;

      if (utmParams.source)
        urlObj.searchParams.set("utm_source", utmParams.source);
      if (utmParams.medium)
        urlObj.searchParams.set("utm_medium", utmParams.medium);
      if (utmParams.campaign)
        urlObj.searchParams.set("utm_campaign", utmParams.campaign);
      if (utmParams.term) urlObj.searchParams.set("utm_term", utmParams.term);
      if (utmParams.content)
        urlObj.searchParams.set("utm_content", utmParams.content);

      destinationUrl = urlObj.toString();
    }

    // Track analytics in background (don't await to avoid blocking redirect)
    trackAnalyticsBackground(shortCode, headersList, resolvedSearchParams);

    // Perform redirect
    redirect(destinationUrl);
  } catch (error) {
    console.error("Redirect error:", error);
    redirect("/");
  }
}

// Separate function for background analytics tracking
async function trackAnalyticsBackground(
  shortCode: string,
  headersList: Headers,
  searchParams: { qr?: string; qr_source?: "image" | "pdf" | "print" }
) {
  try {
    const { AnalyticsTracker } = await import("@/lib/analytics");

    const userAgent = headersList.get("user-agent") || "";
    const forwarded = headersList.get("x-forwarded-for");
    const ip = forwarded
      ? forwarded.split(",")[0].trim()
      : headersList.get("x-real-ip") || "127.0.0.1";

    // Create a mock request object for the analytics tracker
    const mockRequest = {
      headers: {
        get: (name: string) => headersList.get(name),
      },
      nextUrl: {
        searchParams: new URLSearchParams(
          Object.entries(searchParams).filter(([_, v]) => v !== undefined)
        ),
      },
    };

    await AnalyticsTracker.trackClick(shortCode, mockRequest as any, {
      isQRClick: searchParams.qr === "1",
      qrSource: searchParams.qr_source,
    });

    // Update last click timestamp
    await URL.findOneAndUpdate(
      {
        $or: [{ shortCode }, { customSlug: shortCode }],
      },
      { lastClickAt: new Date() }
    );
  } catch (error) {
    console.error("Background analytics tracking error:", error);
  }
}

// Generate metadata - Next.js 15 compatible
export async function generateMetadata({ params }: PageProps) {
  const resolvedParams = await params;
  const { shortCode } = resolvedParams;

  try {
    await connectDB();

    const url = await URL.findOne({
      $or: [{ shortCode }, { customSlug: shortCode }],
      isDeleted: false,
    });

    if (!url) {
      return {
        title: "Link Not Found",
        description: "The requested link could not be found.",
      };
    }

    return {
      title: url.title || "Redirecting...",
      description:
        url.description || "You are being redirected to your destination.",
      openGraph: {
        title: url.title || "Redirecting...",
        description:
          url.description || "You are being redirected to your destination.",
        url: url.originalUrl,
        images: url.favicon ? [{ url: url.favicon }] : undefined,
      },
    };
  } catch (error) {
    return {
      title: "Redirecting...",
      description: "You are being redirected to your destination.",
    };
  }
}
