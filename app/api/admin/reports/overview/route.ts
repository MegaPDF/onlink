// app/api/admin/reports/overview/route.ts
import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { connectDB } from "@/lib/mongodb";
import { User } from "@/models/User";
import { URL as URLModel } from "@/models/URL";
import { Analytics } from "@/models/Analytics";

export async function GET(req: NextRequest) {
  try {
    // Check authentication and admin role
    const session = await getServerSession(authOptions);
    if (!session?.user || session.user.role !== "admin") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const startDate = searchParams.get("startDate");
    const endDate = searchParams.get("endDate");

    if (!startDate || !endDate) {
      return NextResponse.json(
        { error: "Start date and end date are required" },
        { status: 400 }
      );
    }

    await connectDB();

    // Date range filters
    const dateFilter = {
      createdAt: {
        $gte: new Date(startDate),
        $lte: new Date(endDate + "T23:59:59.999Z"),
      },
    };

    // Calculate previous period for growth comparison
    const periodDays = Math.ceil(
      (new Date(endDate).getTime() - new Date(startDate).getTime()) / (1000 * 60 * 60 * 24)
    );
    const previousStartDate = new Date(new Date(startDate).getTime() - periodDays * 24 * 60 * 60 * 1000);
    const previousEndDate = new Date(startDate);

    const previousDateFilter = {
      createdAt: {
        $gte: previousStartDate,
        $lt: previousEndDate,
      },
    };

    // Parallel queries for current period using mongoose models
    const [
      totalUsers,
      totalLinks,
      totalClicks,
      previousUsers,
      previousLinks,
      previousClicks,
    ] = await Promise.all([
      // Current period metrics
      User.countDocuments({ ...dateFilter, isDeleted: false }),
      URLModel.countDocuments({ ...dateFilter, isDeleted: false }),
      Analytics.countDocuments({
        timestamp: {
          $gte: new Date(startDate),
          $lte: new Date(endDate + "T23:59:59.999Z"),
        },
        'bot.isBot': false
      }),
      
      // Previous period metrics for growth calculation
      User.countDocuments({ ...previousDateFilter, isDeleted: false }),
      URLModel.countDocuments({ ...previousDateFilter, isDeleted: false }),
      Analytics.countDocuments({
        timestamp: {
          $gte: previousStartDate,
          $lt: previousEndDate,
        },
        'bot.isBot': false
      }),
    ]);

    // Get revenue data using aggregation
    const [currentRevenue, previousRevenue] = await Promise.all([
      User.aggregate([
        { 
          $match: { 
            ...dateFilter,
            isDeleted: false,
            plan: { $in: ["premium", "enterprise"] }
          } 
        },
        {
          $group: {
            _id: null,
            total: { 
              $sum: {
                $switch: {
                  branches: [
                    { case: { $eq: ["$plan", "premium"] }, then: 9 },
                    { case: { $eq: ["$plan", "enterprise"] }, then: 29 }
                  ],
                  default: 0
                }
              }
            }
          }
        }
      ]),
      User.aggregate([
        { 
          $match: { 
            ...previousDateFilter,
            isDeleted: false,
            plan: { $in: ["premium", "enterprise"] }
          } 
        },
        {
          $group: {
            _id: null,
            total: { 
              $sum: {
                $switch: {
                  branches: [
                    { case: { $eq: ["$plan", "premium"] }, then: 9 },
                    { case: { $eq: ["$plan", "enterprise"] }, then: 29 }
                  ],
                  default: 0
                }
              }
            }
          }
        }
      ])
    ]);

    // Calculate growth metrics
    const currentRevenueAmount = currentRevenue[0]?.total || 0;
    const prevRevenueAmount = previousRevenue[0]?.total || 0;

    const calculateGrowth = (current: number, previous: number) => {
      if (previous === 0) return current > 0 ? 100 : 0;
      return ((current - previous) / previous) * 100;
    };

    // Get detailed statistics
    const [usersByPlan, topPerformingLinks, recentActivity] = await Promise.all([
      // Users by plan
      User.aggregate([
        { $match: { ...dateFilter, isDeleted: false } },
        {
          $group: {
            _id: "$plan",
            count: { $sum: 1 },
          },
        },
        { $sort: { count: -1 } },
      ]),

      // Top performing links
      URLModel.aggregate([
        { $match: { ...dateFilter, isDeleted: false } },
        { $sort: { "clicks.total": -1 } },
        { $limit: 10 },
        {
          $project: {
            shortCode: 1,
            originalUrl: 1,
            title: 1,
            clicks: "$clicks.total",
            createdAt: 1,
          },
        },
      ]),

      // Recent activity (daily breakdown)
      URLModel.aggregate([
        { $match: dateFilter },
        {
          $group: {
            _id: {
              date: { $dateToString: { format: "%Y-%m-%d", date: "$createdAt" } },
            },
            links: { $sum: 1 },
          },
        },
        {
          $project: {
            date: "$_id.date",
            links: 1,
            _id: 0,
          },
        },
        { $sort: { date: 1 } },
      ]),
    ]);

    // Get click activity
    const clickActivity = await Analytics.aggregate([
      {
        $match: {
          timestamp: {
            $gte: new Date(startDate),
            $lte: new Date(endDate + "T23:59:59.999Z"),
          },
          'bot.isBot': false
        },
      },
      {
        $group: {
          _id: {
            date: { $dateToString: { format: "%Y-%m-%d", date: "$timestamp" } },
          },
          clicks: { $sum: 1 },
          uniqueVisitors: { $addToSet: "$hashedIp" },
        },
      },
      {
        $project: {
          date: "$_id.date",
          clicks: 1,
          uniqueVisitors: { $size: "$uniqueVisitors" },
          _id: 0,
        },
      },
      { $sort: { date: 1 } },
    ]);

    return NextResponse.json({
      success: true,
      data: {
        metrics: {
          users: {
            total: totalUsers,
            previous: previousUsers,
            growth: calculateGrowth(totalUsers, previousUsers),
          },
          links: {
            total: totalLinks,
            previous: previousLinks,
            growth: calculateGrowth(totalLinks, previousLinks),
          },
          clicks: {
            total: totalClicks,
            previous: previousClicks,
            growth: calculateGrowth(totalClicks, previousClicks),
          },
          revenue: {
            total: currentRevenueAmount,
            previous: prevRevenueAmount,
            growth: calculateGrowth(currentRevenueAmount, prevRevenueAmount),
          },
        },
        charts: {
          usersByPlan,
          topPerformingLinks,
          recentActivity,
          clickActivity,
        },
        period: {
          startDate,
          endDate,
          previousStartDate: previousStartDate.toISOString(),
          previousEndDate: previousEndDate.toISOString(),
        },
      },
    });
  } catch (error) {
    console.error("Error fetching overview reports:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}