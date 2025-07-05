// app/api/admin/reports/links/route.ts
import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { connectDB } from "@/lib/mongodb";
import { URL as URLModel } from "@/models/URL";
import { User } from "@/models/User";
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

    // Date range filter
    const dateFilter = {
      createdAt: {
        $gte: new Date(startDate),
        $lte: new Date(endDate + "T23:59:59.999Z"),
      },
    };

    // 1. Links by Domain
    const linksByDomain = await URLModel.aggregate([
      { $match: { ...dateFilter, isDeleted: false } },
      {
        $group: {
          _id: "$domain",
          count: { $sum: 1 },
          clicks: { $sum: "$clicks.total" },
        },
      },
      {
        $project: {
          domain: "$_id",
          count: 1,
          clicks: 1,
          _id: 0,
        },
      },
      { $sort: { count: -1 } },
      { $limit: 10 }, // Top 10 domains
    ]);

    // 2. Link Creation Trends (daily)
    const linkCreationTrends = await URLModel.aggregate([
      { $match: { ...dateFilter, isDeleted: false } },
      {
        $group: {
          _id: {
            date: { $dateToString: { format: "%Y-%m-%d", date: "$createdAt" } },
          },
          links: { $sum: 1 },
          totalClicks: { $sum: "$clicks.total" },
        },
      },
      {
        $project: {
          date: "$_id.date",
          links: 1,
          totalClicks: 1,
          _id: 0,
        },
      },
      { $sort: { date: 1 } },
    ]);

    // 3. Top Performing Links
    const topPerformingLinks = await URLModel.aggregate([
      { $match: { ...dateFilter, isDeleted: false } },
      {
        $lookup: {
          from: "users",
          localField: "userId",
          foreignField: "_id",
          as: "user"
        }
      },
      {
        $project: {
          shortCode: 1,
          originalUrl: 1,
          title: 1,
          domain: 1,
          clicks: "$clicks.total",
          createdAt: 1,
          userName: { $arrayElemAt: ["$user.name", 0] },
          userEmail: { $arrayElemAt: ["$user.email", 0] },
          userPlan: { $arrayElemAt: ["$user.plan", 0] }
        }
      },
      { $sort: { clicks: -1 } },
      { $limit: 20 },
    ]);

    // 4. Link Status Distribution
    const linkStatusDistribution = await URLModel.aggregate([
      { $match: { ...dateFilter, isDeleted: false } },
      {
        $group: {
          _id: {
            isActive: "$isActive",
            hasExpiration: { $ne: ["$expiresAt", null] },
            isExpired: {
              $cond: [
                { $and: [{ $ne: ["$expiresAt", null] }, { $lt: ["$expiresAt", new Date()] }] },
                true,
                false
              ]
            }
          },
          count: { $sum: 1 },
          totalClicks: { $sum: "$clicks.total" }
        }
      },
      {
        $project: {
          status: {
            $switch: {
              branches: [
                { case: { $eq: ["$_id.isExpired", true] }, then: "expired" },
                { case: { $eq: ["$_id.isActive", false] }, then: "inactive" },
                { case: { $eq: ["$_id.hasExpiration", true] }, then: "active_with_expiration" },
              ],
              default: "active"
            }
          },
          count: 1,
          totalClicks: 1,
          _id: 0
        }
      },
      { $sort: { count: -1 } }
    ]);

    // 5. Links by User Plan
    const linksByUserPlan = await URLModel.aggregate([
      { $match: { ...dateFilter, isDeleted: false } },
      {
        $lookup: {
          from: "users",
          localField: "userId",
          foreignField: "_id",
          as: "user"
        }
      },
      {
        $unwind: "$user"
      },
      {
        $group: {
          _id: "$user.plan",
          linkCount: { $sum: 1 },
          totalClicks: { $sum: "$clicks.total" },
          avgClicksPerLink: { $avg: "$clicks.total" },
          uniqueUsers: { $addToSet: "$userId" }
        }
      },
      {
        $project: {
          plan: "$_id",
          linkCount: 1,
          totalClicks: 1,
          avgClicksPerLink: { $round: ["$avgClicksPerLink", 2] },
          uniqueUsers: { $size: "$uniqueUsers" },
          _id: 0
        }
      },
      { $sort: { linkCount: -1 } }
    ]);

    // 6. Click Performance Analysis
    const clickPerformance = await URLModel.aggregate([
      { $match: { isDeleted: false } },
      {
        $bucket: {
          groupBy: "$clicks.total",
          boundaries: [0, 1, 10, 50, 100, 500, 1000, 5000],
          default: "5000+",
          output: {
            count: { $sum: 1 },
            avgClicks: { $avg: "$clicks.total" }
          }
        }
      },
      {
        $project: {
          range: {
            $switch: {
              branches: [
                { case: { $eq: ["$_id", 0] }, then: "0 clicks" },
                { case: { $eq: ["$_id", 1] }, then: "1-9 clicks" },
                { case: { $eq: ["$_id", 10] }, then: "10-49 clicks" },
                { case: { $eq: ["$_id", 50] }, then: "50-99 clicks" },
                { case: { $eq: ["$_id", 100] }, then: "100-499 clicks" },
                { case: { $eq: ["$_id", 500] }, then: "500-999 clicks" },
                { case: { $eq: ["$_id", 1000] }, then: "1000-4999 clicks" },
              ],
              default: "5000+ clicks"
            }
          },
          count: 1,
          avgClicks: { $round: ["$avgClicks", 2] },
          _id: 0
        }
      }
    ]);

    // 7. Recent High-Impact Links (created in period with significant clicks)
    const recentHighImpactLinks = await URLModel.aggregate([
      { 
        $match: { 
          ...dateFilter, 
          isDeleted: false,
          "clicks.total": { $gte: 10 } // At least 10 clicks
        } 
      },
      {
        $lookup: {
          from: "users",
          localField: "userId",
          foreignField: "_id",
          as: "user"
        }
      },
      {
        $project: {
          shortCode: 1,
          originalUrl: 1,
          title: 1,
          domain: 1,
          clicks: "$clicks.total",
          createdAt: 1,
          daysOld: {
            $divide: [
              { $subtract: [new Date(), "$createdAt"] },
              1000 * 60 * 60 * 24
            ]
          },
          userName: { $arrayElemAt: ["$user.name", 0] },
          userPlan: { $arrayElemAt: ["$user.plan", 0] }
        }
      },
      {
        $addFields: {
          clicksPerDay: {
            $cond: [
              { $gt: ["$daysOld", 0] },
              { $divide: ["$clicks", "$daysOld"] },
              "$clicks"
            ]
          }
        }
      },
      { $sort: { clicksPerDay: -1 } },
      { $limit: 15 }
    ]);

    // 8. Summary Statistics
    const summaryStats = await URLModel.aggregate([
      { $match: { ...dateFilter, isDeleted: false } },
      {
        $group: {
          _id: null,
          totalLinks: { $sum: 1 },
          totalClicks: { $sum: "$clicks.total" },
          avgClicksPerLink: { $avg: "$clicks.total" },
          maxClicks: { $max: "$clicks.total" },
          linksWithClicks: {
            $sum: { $cond: [{ $gt: ["$clicks.total", 0] }, 1, 0] }
          }
        }
      },
      {
        $project: {
          totalLinks: 1,
          totalClicks: 1,
          avgClicksPerLink: { $round: ["$avgClicksPerLink", 2] },
          maxClicks: 1,
          linksWithClicks: 1,
          linksWithoutClicks: { $subtract: ["$totalLinks", "$linksWithClicks"] },
          clickThroughRate: {
            $round: [
              { 
                $multiply: [
                  { $divide: ["$linksWithClicks", "$totalLinks"] }, 
                  100
                ] 
              }, 
              2
            ]
          },
          _id: 0
        }
      }
    ]);

    return NextResponse.json({
      success: true,
      data: {
        linksByDomain,
        linkCreationTrends,
        topPerformingLinks,
        linkStatusDistribution,
        linksByUserPlan,
        clickPerformance,
        recentHighImpactLinks,
        summaryStats: summaryStats[0] || {
          totalLinks: 0,
          totalClicks: 0,
          avgClicksPerLink: 0,
          maxClicks: 0,
          linksWithClicks: 0,
          linksWithoutClicks: 0,
          clickThroughRate: 0
        },
        period: {
          startDate,
          endDate,
        },
      },
    });
  } catch (error) {
    console.error("Error fetching link reports:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}