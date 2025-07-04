import { NextRequest } from "next/server";
import { redirect, notFound } from "next/navigation";
import { connectDB } from "@/lib/mongodb";
import { URL } from "@/models/URL";
import { AnalyticsTracker } from "@/lib/analytics";
import { parseUserAgent } from "@/lib/utils";
import { PasswordProtectedLink } from "@/components/password-protected-link";

interface ShortCodePageProps {
  params: { shortCode: string };
  searchParams: { [key: string]: string | string[] | undefined };
}

export default async function ShortCodePage({
  params,
  searchParams,
}: ShortCodePageProps) {
  const { shortCode } = params;
  const password = searchParams.pwd as string;

  try {
    await connectDB();

    // Find URL
    const url = await URL.findOne({
      $or: [{ shortCode }, { customSlug: shortCode }],
      isDeleted: false,
    });

    if (!url) {
      notFound();
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

    // Handle password protection
    if (url.isPasswordProtected) {
      if (!password || password !== url.password) {
        return <PasswordProtectedLink shortCode={shortCode} />;
      }
    }

    // Track analytics (in a separate function to avoid blocking)
    trackClick(url._id, shortCode);

    // Redirect to destination
    redirect(url.originalUrl);
  } catch (error) {
    console.error("Short code redirect error:", error);
    notFound();
  }
}

async function trackClick(urlId: string, shortCode: string) {
  try {
    // This runs in the background and doesn't block the redirect
    const analytics = new AnalyticsTracker();
    await analytics.trackClick(urlId, {
      shortCode,
      timestamp: new Date(),
      // Add more tracking data as needed
    });
  } catch (error) {
    console.error("Analytics tracking error:", error);
    // Don't fail the redirect if analytics fails
  }
}
