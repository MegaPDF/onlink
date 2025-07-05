import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '@/lib/mongodb';
import { Settings } from '@/models/Settings';
import { PricingPlan } from '@/types/billing';


export async function GET(req: NextRequest) {
  try {
    await connectDB();
    
    // Get settings from database
    const settings = await Settings.findOne({}).select('pricing defaultLimits features');
    
    if (!settings) {
      return NextResponse.json({
        success: false,
        error: 'Settings not found'
      }, { status: 404 });
    }

    // Convert database pricing to the format expected by billing component
    const pricingPlans: PricingPlan[] = [];

    // Free Plan
    if (settings.pricing?.free || settings.defaultLimits?.free) {
      pricingPlans.push({
        id: "free",
        name: settings.pricing?.free?.name || "Free",
        description: settings.pricing?.free?.description || "Perfect for personal use",
        price: {
          monthly: settings.pricing?.free?.price?.monthly || 0,
          yearly: settings.pricing?.free?.price?.yearly || 0
        },
        stripePriceIds: {
          monthly: settings.pricing?.free?.stripePriceIds?.monthly || "",
          yearly: settings.pricing?.free?.stripePriceIds?.yearly || ""
        },
        features: {
          maxLinks: settings.defaultLimits?.free?.linksPerMonth || 5,
          maxClicks: settings.defaultLimits?.free?.clicksPerMonth || 1000,
          customDomains: settings.defaultLimits?.free?.customDomains || 0,
          analytics: settings.defaultLimits?.free?.analytics || false,
          qrCodes: settings.features?.enableQRCodes || false,
          bulkOperations: settings.features?.enableBulkOperations || false,
          apiAccess: settings.features?.enableAPIAccess || false,
          prioritySupport: false,
          whiteLabel: false,
        },
        popular: settings.pricing?.free?.popular || false,
        badge: settings.pricing?.free?.badge
      });
    }

    // Premium Plan
    if (settings.pricing?.premium || settings.defaultLimits?.premium) {
      pricingPlans.push({
        id: "premium",
        name: settings.pricing?.premium?.name || "Premium",
        description: settings.pricing?.premium?.description || "For professionals and small businesses",
        price: {
          monthly: settings.pricing?.premium?.price?.monthly || 999,
          yearly: settings.pricing?.premium?.price?.yearly || 9999
        },
        stripePriceIds: {
          monthly: settings.pricing?.premium?.stripePriceIds?.monthly || "price_premium_monthly",
          yearly: settings.pricing?.premium?.stripePriceIds?.yearly || "price_premium_yearly"
        },
        features: {
          maxLinks: settings.defaultLimits?.premium?.linksPerMonth || -1,
          maxClicks: settings.defaultLimits?.premium?.clicksPerMonth || -1,
          customDomains: settings.defaultLimits?.premium?.customDomains || 3,
          analytics: settings.defaultLimits?.premium?.analytics || true,
          qrCodes: settings.features?.enableQRCodes || true,
          bulkOperations: settings.features?.enableBulkOperations || true,
          apiAccess: settings.features?.enableAPIAccess || true,
          prioritySupport: false,
          whiteLabel: false,
        },
        popular: settings.pricing?.premium?.popular || true,
        badge: settings.pricing?.premium?.badge || "Most Popular"
      });
    }

    // Enterprise Plan
    if (settings.pricing?.enterprise || settings.defaultLimits?.enterprise) {
      pricingPlans.push({
        id: "enterprise",
        name: settings.pricing?.enterprise?.name || "Enterprise",
        description: settings.pricing?.enterprise?.description || "For large organizations",
        price: {
          monthly: settings.pricing?.enterprise?.price?.monthly || 4999,
          yearly: settings.pricing?.enterprise?.price?.yearly || 49999
        },
        stripePriceIds: {
          monthly: settings.pricing?.enterprise?.stripePriceIds?.monthly || "price_enterprise_monthly",
          yearly: settings.pricing?.enterprise?.stripePriceIds?.yearly || "price_enterprise_yearly"
        },
        features: {
          maxLinks: settings.defaultLimits?.enterprise?.linksPerMonth || -1,
          maxClicks: settings.defaultLimits?.enterprise?.clicksPerMonth || -1,
          customDomains: settings.defaultLimits?.enterprise?.customDomains || -1,
          analytics: settings.defaultLimits?.enterprise?.analytics || true,
          qrCodes: settings.features?.enableQRCodes || true,
          bulkOperations: settings.features?.enableBulkOperations || true,
          apiAccess: settings.features?.enableAPIAccess || true,
          prioritySupport: true,
          whiteLabel: settings.features?.enableWhiteLabel || true,
        },
        popular: settings.pricing?.enterprise?.popular || false,
        badge: settings.pricing?.enterprise?.badge
      });
    }

    return NextResponse.json({
      success: true,
      data: pricingPlans
    });

  } catch (error) {
    console.error('Error fetching pricing:', error);
    return NextResponse.json({
      success: false,
      error: 'Failed to fetch pricing'
    }, { status: 500 });
  }
}