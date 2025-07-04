// ============= app/api/webhook/analytics/route.ts =============
import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '@/lib/mongodb';
import { Analytics } from '@/models/Analytics';
import { URL } from '@/models/URL';
import { User } from '@/models/User';
import DataSyncManager from '@/lib/sync-utils';

// External analytics webhook (for integrations like Google Analytics, Mixpanel, etc.)
export async function POST(req: NextRequest) {
  try {
    // Verify webhook signature (implement based on provider)
    const signature = req.headers.get('x-webhook-signature');
    const webhookSecret = process.env.ANALYTICS_WEBHOOK_SECRET;

    if (!signature || !webhookSecret) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Basic signature verification (implement proper verification based on provider)
    if (signature !== `sha256=${webhookSecret}`) {
      return NextResponse.json({ error: 'Invalid signature' }, { status: 401 });
    }

    await connectDB();

    const body = await req.json();
    const { type, data } = body;

    switch (type) {
      case 'click_event':
        await handleClickEvent(data);
        break;
      case 'batch_update':
        await handleBatchUpdate(data);
        break;
      case 'sync_request':
        await handleSyncRequest(data);
        break;
      default:
        console.log('Unknown analytics webhook type:', type);
    }

    return NextResponse.json({ received: true });

  } catch (error) {
    console.error('Analytics webhook error:', error);
    return NextResponse.json({ 
      error: 'Webhook processing failed' 
    }, { status: 500 });
  }
}

async function handleClickEvent(data: any) {
  try {
    const { shortCode, clickData } = data;

    if (!shortCode || !clickData) {
      throw new Error('Missing required click data');
    }

    // Find URL
    const url = await URL.findOne({ shortCode, isDeleted: false });
    if (!url) {
      console.warn(`URL not found for click event: ${shortCode}`);
      return;
    }

    // Create analytics record
    const analyticsRecord = new Analytics({
      urlId: url._id,
      shortCode,
      clickId: clickData.clickId || `ext_${Date.now()}_${Math.random()}`,
      timestamp: new Date(clickData.timestamp || Date.now()),
      ip: clickData.ip || '0.0.0.0',
      hashedIp: clickData.hashedIp || 'external',
      userAgent: clickData.userAgent || 'External Analytics',
      country: clickData.country,
      countryCode: clickData.countryCode,
      region: clickData.region,
      city: clickData.city,
      device: {
        type: clickData.device?.type || 'unknown',
        os: clickData.device?.os || 'Unknown',
        browser: clickData.device?.browser || 'Unknown'
      },
      referrer: {
        url: clickData.referrer?.url,
        domain: clickData.referrer?.domain,
        source: clickData.referrer?.source || 'external'
      },
      technical: {
        protocol: 'https',
        method: 'GET',
        statusCode: 302,
        responseTime: clickData.responseTime || 0,
        redirectCount: 1
      },
      bot: {
        isBot: clickData.isBot || false,
        botName: clickData.botName
      },
      processed: {
        isProcessed: false
      }
    });

    await analyticsRecord.save();

    // Update URL stats in background
    setImmediate(async () => {
      await DataSyncManager.updateURLClickStats(shortCode);
    });

    console.log(`External click event processed for ${shortCode}`);

  } catch (error) {
    console.error('Error handling click event:', error);
    throw error;
  }
}

async function handleBatchUpdate(data: any) {
  try {
    const { updates } = data;

    if (!Array.isArray(updates)) {
      throw new Error('Updates must be an array');
    }

    for (const update of updates) {
      if (update.type === 'click_stats') {
        await updateClickStats(update);
      } else if (update.type === 'user_stats') {
        await updateUserStats(update);
      }
    }

    console.log(`Processed ${updates.length} batch updates`);

  } catch (error) {
    console.error('Error handling batch update:', error);
    throw error;
  }
}

async function updateClickStats(update: any) {
  const { shortCode, stats } = update;

  if (!shortCode || !stats) {
    return;
  }

  await URL.findOneAndUpdate(
    { shortCode, isDeleted: false },
    {
      'clicks.total': stats.total || 0,
      'clicks.unique': stats.unique || 0,
      'clicks.today': stats.today || 0,
      'clicks.thisWeek': stats.thisWeek || 0,
      'clicks.thisMonth': stats.thisMonth || 0,
      'clicks.lastUpdated': new Date()
    }
  );
}

async function updateUserStats(update: any) {
  const { userId, stats } = update;

  if (!userId || !stats) {
    return;
  }

  await User.findByIdAndUpdate(userId, {
    'usage.clicksCount': stats.totalClicks || 0,
    'usage.monthlyClicks': stats.monthlyClicks || 0,
    'usage.lastUpdated': new Date()
  });
}

async function handleSyncRequest(data: any) {
  try {
    const { userId, shortCode } = data;

    if (userId) {
      await DataSyncManager.syncUserData(userId);
      console.log(`Synced data for user: ${userId}`);
    } else if (shortCode) {
      await DataSyncManager.updateURLClickStats(shortCode);
      await DataSyncManager.updateURLAnalyticsCache(shortCode);
      console.log(`Synced data for URL: ${shortCode}`);
    } else {
      // Full system sync (use carefully)
      await DataSyncManager.resetMonthlyUsage();
      console.log('Performed system-wide sync');
    }

  } catch (error) {
    console.error('Error handling sync request:', error);
    throw error;
  }
}
