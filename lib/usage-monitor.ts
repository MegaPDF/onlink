import { User } from "@/models/User";
import mongoose from "mongoose";

export class UsageMonitor {
  
  // Check if user can create a new link
  static async canCreateLink(userId: string | mongoose.Types.ObjectId): Promise<{ allowed: boolean; reason?: string }> {
    try {
      const user = await User.findById(userId);
      if (!user) return { allowed: false, reason: 'User not found' };

      // Check if account is active
      if (!user.isActive) {
        return { allowed: false, reason: 'Account is inactive' };
      }

      // Check subscription status for paid plans
      if (user.plan !== 'free' && user.subscription?.status !== 'active') {
        return { allowed: false, reason: 'Subscription is not active' };
      }

      // Check monthly limits for free plan
      if (user.plan === 'free') {
        const freeLimit = 5; // Free plan limit
        if (user.usage.monthlyLinks >= freeLimit) {
          return { 
            allowed: false, 
            reason: `Monthly limit of ${freeLimit} links exceeded. Upgrade your plan for unlimited links.` 
          };
        }
      }

      return { allowed: true };
    } catch (error) {
      console.error('Error checking link creation permission:', error);
      return { allowed: false, reason: 'Error checking permissions' };
    }
  }

  // Check if user can access analytics
  static async canAccessAnalytics(userId: string | mongoose.Types.ObjectId): Promise<boolean> {
    try {
      const user = await User.findById(userId);
      if (!user) return false;

      // Analytics available for premium and enterprise plans
      return user.plan === 'premium' || user.plan === 'enterprise';
    } catch (error) {
      console.error('Error checking analytics access:', error);
      return false;
    }
  }

  // Check if user can use custom domain
  static async canUseCustomDomain(userId: string | mongoose.Types.ObjectId): Promise<boolean> {
    try {
      const user = await User.findById(userId);
      if (!user) return false;

      // Custom domains available for premium and enterprise plans
      return user.plan === 'premium' || user.plan === 'enterprise';
    } catch (error) {
      console.error('Error checking custom domain access:', error);
      return false;
    }
  }

  // Get user's current usage summary
  static async getUserUsageSummary(userId: string | mongoose.Types.ObjectId) {
    try {
      const user = await User.findById(userId);
      if (!user) throw new Error('User not found');

      const planLimits = {
        free: { links: 5, clicks: 1000, customDomain: false, analytics: false },
        premium: { links: -1, clicks: -1, customDomain: true, analytics: true },
        enterprise: { links: -1, clicks: -1, customDomain: true, analytics: true }
      };

      const limits = planLimits[user.plan];
      const usage = user.usage;

      return {
        plan: user.plan,
        limits: {
          links: limits.links === -1 ? 'Unlimited' : limits.links,
          clicks: limits.clicks === -1 ? 'Unlimited' : limits.clicks,
          customDomains: limits.customDomain,
          analytics: limits.analytics
        },
        usage: {
          linksCount: usage.linksCount,
          clicksCount: usage.clicksCount,
          monthlyLinks: usage.monthlyLinks,
          monthlyClicks: usage.monthlyClicks
        },
        percentageUsed: {
          monthlyLinks: limits.links === -1 ? 0 : Math.round((usage.monthlyLinks / limits.links) * 100),
          monthlyClicks: limits.clicks === -1 ? 0 : Math.round((usage.monthlyClicks / limits.clicks) * 100)
        },
        resetDate: usage.resetDate
      };
    } catch (error) {
      console.error('Error getting usage summary:', error);
      throw error;
    }
  }
}