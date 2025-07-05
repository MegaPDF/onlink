import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { connectDB } from "@/lib/mongodb";
import { User } from "@/models/User";
import { URL as URLModel } from "@/models/URL";
import { Analytics } from "@/models/Analytics";

export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    await connectDB();

    const user = await User.findById(session.user.id);
    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    const url = req.nextUrl;
    const urlParam = url.searchParams.get('url');
    const startDateParam = url.searchParams.get('startDate');
    const endDateParam = url.searchParams.get('endDate');
    
    // Default to last 30 days if no date range provided
    const defaultEndDate = new Date();
    const defaultStartDate = new Date();
    defaultStartDate.setDate(defaultStartDate.getDate() - 30);
    
    const startDate = startDateParam ? new Date(startDateParam) : defaultStartDate;
    const endDate = endDateParam ? new Date(endDateParam) : defaultEndDate;

    console.log('📊 Analytics request:', {
      urlParam,
      startDate: startDate.toISOString(),
      endDate: endDate.toISOString()
    });

    // If specific URL requested
    if (urlParam && urlParam !== 'all') {
      // Find the URL
      let urlQuery;
      try {
        urlQuery = await URLModel.findOne({
          userId: user._id,
          shortCode: urlParam,
          isDeleted: false
        }).select('shortCode originalUrl title clicks createdAt');

        if (!urlQuery) {
          return NextResponse.json({ error: 'URL not found' }, { status: 404 });
        }
      } catch (error) {
        console.error('Error finding URL:', error);
        return NextResponse.json({ error: 'Invalid URL parameter' }, { status: 400 });
      }

      // Get analytics for this specific URL with complete breakdown
      const analyticsData = await Analytics.aggregate([
        {
          $match: {
            shortCode: urlQuery.shortCode,
            timestamp: { $gte: startDate, $lte: endDate },
            'bot.isBot': false
          }
        },
        {
          $facet: {
            totalClicks: [{ $count: "count" }],
            uniqueClicks: [
              { $group: { _id: "$visitor.hashedIp" } },
              { $count: "count" }
            ],
            dailyStats: [
              {
                $group: {
                  _id: { 
                    $dateToString: { 
                      format: "%Y-%m-%d", 
                      date: "$timestamp" 
                    } 
                  },
                  clicks: { $sum: 1 },
                  uniqueVisitors: { $addToSet: "$visitor.hashedIp" }
                }
              },
              {
                $project: {
                  date: "$_id",
                  clicks: 1,
                  uniqueVisitors: { $size: "$uniqueVisitors" },
                  _id: 0
                }
              },
              { $sort: { date: 1 } }
            ],
            geography: [
              {
                $match: { "location.country": { $nin: [null, ""] } }
              },
              {
                $group: {
                  _id: "$location.country",
                  count: { $sum: 1 }
                }
              },
              {
                $project: {
                  country: "$_id",
                  count: 1,
                  _id: 0
                }
              },
              { $sort: { count: -1 } },
              { $limit: 10 }
            ],
            devices: [
              {
                $group: {
                  _id: "$device.type",
                  count: { $sum: 1 }
                }
              },
              {
                $project: {
                  type: "$_id",
                  count: 1,
                  _id: 0
                }
              },
              { $sort: { count: -1 } },
              { $limit: 10 }
            ],
            referrers: [
              {
                $group: {
                  _id: "$referrer.domain",
                  count: { $sum: 1 }
                }
              },
              {
                $project: {
                  domain: { $ifNull: ["$_id", "Direct"] },
                  count: 1,
                  _id: 0
                }
              },
              { $sort: { count: -1 } },
              { $limit: 10 }
            ],
            browsers: [
              {
                $match: { "device.browser": { $nin: [null, ""] } }
              },
              {
                $group: {
                  _id: "$device.browser",
                  count: { $sum: 1 }
                }
              },
              {
                $project: {
                  browser: "$_id",
                  count: 1,
                  _id: 0
                }
              },
              { $sort: { count: -1 } },
              { $limit: 10 }
            ],
            operatingSystems: [
              {
                $match: { "device.os": { $nin: [null, ""] } }
              },
              {
                $group: {
                  _id: "$device.os",
                  count: { $sum: 1 }
                }
              },
              {
                $project: {
                  os: "$_id",
                  count: 1,
                  _id: 0
                }
              },
              { $sort: { count: -1 } },
              { $limit: 10 }
            ]
          }
        }
      ]);

      const result = analyticsData[0] || {};
      
      console.log('📊 Single URL analytics result:', {
        shortCode: urlQuery.shortCode,
        totalClicks: result.totalClicks?.[0]?.count || 0,
        uniqueClicks: result.uniqueClicks?.[0]?.count || 0,
        geography: result.geography?.length || 0,
        devices: result.devices?.length || 0,
        referrers: result.referrers?.length || 0
      });

      return NextResponse.json({
        success: true,
        data: {
          url: {
            shortCode: urlQuery.shortCode,
            originalUrl: urlQuery.originalUrl,
            title: urlQuery.title,
            clickRate: 0 // Calculate if needed
          },
          totalClicks: result.totalClicks?.[0]?.count || 0,
          uniqueClicks: result.uniqueClicks?.[0]?.count || 0,
          dailyStats: result.dailyStats || [],
          geography: result.geography || [],
          devices: result.devices || [],
          referrers: result.referrers || [],
          browsers: result.browsers || [],
          operatingSystems: result.operatingSystems || [],
          dateRange: { startDate, endDate }
        }
      });
    }

    // If no specific URL, get aggregate data for all user's URLs
    else {
      // Get user URLs
      const userUrls = await URLModel.find({
        userId: user._id,
        isDeleted: false
      }).select('shortCode originalUrl title clicks createdAt').lean();

      if (userUrls.length === 0) {
        return NextResponse.json({
          success: true,
          data: {
            summary: { totalClicks: 0, totalUrls: 0, averageClicks: 0 },
            totalClicks: 0,
            uniqueClicks: 0,
            dailyStats: [],
            geography: [],
            devices: [],
            referrers: [],
            browsers: [],
            operatingSystems: [],
            topUrls: [],
            recentUrls: []
          }
        });
      }

      const shortCodes = userUrls.map(url => url.shortCode);

      // Get aggregate analytics for all user URLs with complete breakdown
      const aggregateAnalytics = await Analytics.aggregate([
        {
          $match: {
            shortCode: { $in: shortCodes },
            timestamp: { $gte: startDate, $lte: endDate },
            'bot.isBot': false
          }
        },
        {
          $facet: {
            totalClicks: [{ $count: "count" }],
            uniqueClicks: [
              { $group: { _id: "$visitor.hashedIp" } },
              { $count: "count" }
            ],
            dailyStats: [
              {
                $group: {
                  _id: { 
                    $dateToString: { 
                      format: "%Y-%m-%d", 
                      date: "$timestamp" 
                    } 
                  },
                  clicks: { $sum: 1 },
                  uniqueVisitors: { $addToSet: "$visitor.hashedIp" }
                }
              },
              {
                $project: {
                  date: "$_id",
                  clicks: 1,
                  uniqueVisitors: { $size: "$uniqueVisitors" },
                  _id: 0
                }
              },
              { $sort: { date: 1 } }
            ],
            geography: [
              {
                $match: { "location.country": { $nin: [null, ""] } }
              },
              {
                $group: {
                  _id: "$location.country",
                  count: { $sum: 1 }
                }
              },
              {
                $project: {
                  country: "$_id",
                  count: 1,
                  _id: 0
                }
              },
              { $sort: { count: -1 } },
              { $limit: 10 }
            ],
            devices: [
              {
                $group: {
                  _id: "$device.type",
                  count: { $sum: 1 }
                }
              },
              {
                $project: {
                  type: "$_id",
                  count: 1,
                  _id: 0
                }
              },
              { $sort: { count: -1 } },
              { $limit: 10 }
            ],
            referrers: [
              {
                $group: {
                  _id: "$referrer.domain",
                  count: { $sum: 1 }
                }
              },
              {
                $project: {
                  domain: { $ifNull: ["$_id", "Direct"] },
                  count: 1,
                  _id: 0
                }
              },
              { $sort: { count: -1 } },
              { $limit: 10 }
            ],
            browsers: [
              {
                $match: { "device.browser":{ $nin: [null, ""] } }
              },
              {
                $group: {
                  _id: "$device.browser",
                  count: { $sum: 1 }
                }
              },
              {
                $project: {
                  browser: "$_id",
                  count: 1,
                  _id: 0
                }
              },
              { $sort: { count: -1 } },
              { $limit: 10 }
            ],
            operatingSystems: [
              {
                $match: { "device.os": { $nin: [null, ""] }}
              },
              {
                $group: {
                  _id: "$device.os",
                  count: { $sum: 1 }
                }
              },
              {
                $project: {
                  os: "$_id",
                  count: 1,
                  _id: 0
                }
              },
              { $sort: { count: -1 } },
              { $limit: 10 }
            ]
          }
        }
      ]);

      // Get aggregated stats from URL model
      const totalStats = await URLModel.aggregate([
        { $match: { userId: user._id, isDeleted: false } },
        {
          $group: {
            _id: null,
            totalClicks: { $sum: '$clicks.total' },
            totalUrls: { $sum: 1 },
            averageClicks: { $avg: '$clicks.total' }
          }
        }
      ]);

      // Get top performing URLs
      const topUrls = await URLModel.find({
        userId: user._id,
        isDeleted: false
      })
      .sort({ 'clicks.total': -1 })
      .limit(10)
      .select('shortCode originalUrl title clicks')
      .lean();

      const aggregateResult = aggregateAnalytics[0] || {};

      console.log('📊 Aggregate analytics result:', {
        totalUrls: userUrls.length,
        totalClicks: aggregateResult.totalClicks?.[0]?.count || 0,
        uniqueClicks: aggregateResult.uniqueClicks?.[0]?.count || 0,
        geography: aggregateResult.geography?.length || 0,
        devices: aggregateResult.devices?.length || 0,
        referrers: aggregateResult.referrers?.length || 0
      });

      return NextResponse.json({
        success: true,
        data: {
          summary: totalStats[0] || { totalClicks: 0, totalUrls: 0, averageClicks: 0 },
          totalClicks: aggregateResult.totalClicks?.[0]?.count || 0,
          uniqueClicks: aggregateResult.uniqueClicks?.[0]?.count || 0,
          dailyStats: aggregateResult.dailyStats || [],
          geography: aggregateResult.geography || [],
          devices: aggregateResult.devices || [],
          referrers: aggregateResult.referrers || [],
          browsers: aggregateResult.browsers || [],
          operatingSystems: aggregateResult.operatingSystems || [],
          topUrls: topUrls.map(url => ({
            ...url,
            clickRate: 0
          })),
          recentUrls: userUrls.slice(0, 5),
          dateRange: { startDate, endDate }
        }
      });
    }

  } catch (error) {
    console.error('Analytics GET error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}