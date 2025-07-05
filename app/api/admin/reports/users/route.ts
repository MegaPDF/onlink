// app/api/admin/reports/users/route.ts
import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { connectDB } from "@/lib/mongodb";
import { User } from "@/models/User";
import { URL as URLModel } from "@/models/URL";

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

    // 1. Users by Plan
    const usersByPlan = await User.aggregate([
      { $match: { ...dateFilter, isDeleted: false } },
      {
        $group: {
          _id: "$plan",
          count: { $sum: 1 },
        },
      },
      {
        $lookup: {
          from: "users",
          let: { plan: "$_id" },
          pipeline: [
            { 
              $match: { 
                $expr: { $eq: ["$plan", "$$plan"] },
                isDeleted: false,
                plan: { $in: ["premium", "enterprise"] }
              } 
            },
            { 
              $group: { 
                _id: null, 
                revenue: { 
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
            },
          ],
          as: "revenueData",
        },
      },
      {
        $project: {
          plan: "$_id",
          count: 1,
          revenue: { $ifNull: [{ $arrayElemAt: ["$revenueData.revenue", 0] }, 0] },
          _id: 0,
        },
      },
      { $sort: { count: -1 } },
    ]);

    // 2. User Growth (daily data points)
    const userGrowth = await User.aggregate([
      { $match: { ...dateFilter, isDeleted: false } },
      {
        $group: {
          _id: {
            date: { $dateToString: { format: "%Y-%m-%d", date: "$createdAt" } },
          },
          users: { $sum: 1 },
          premium: {
            $sum: {
              $cond: [{ $in: ["$plan", ["premium", "enterprise"]] }, 1, 0],
            },
          },
        },
      },
      {
        $project: {
          date: "$_id.date",
          users: 1,
          premium: 1,
          _id: 0,
        },
      },
      { $sort: { date: 1 } },
    ]);

    // 3. User Activity Analysis
    const userActivity = await User.aggregate([
      { $match: { isDeleted: false } },
      {
        $lookup: {
          from: "urls",
          localField: "_id",
          foreignField: "userId",
          as: "urls"
        }
      },
      {
        $project: {
          _id: 1,
          name: 1,
          email: 1,
          plan: 1,
          createdAt: 1,
          lastLoginAt: 1,
          isActive: 1,
          urlCount: { $size: { $filter: { input: "$urls", cond: { $eq: ["$$this.isDeleted", false] } } } },
          totalClicks: { $sum: "$urls.clicks.total" }
        }
      },
      {
        $addFields: {
          activityLevel: {
            $switch: {
              branches: [
                { case: { $gte: ["$urlCount", 10] }, then: "high" },
                { case: { $gte: ["$urlCount", 3] }, then: "medium" },
                { case: { $gt: ["$urlCount", 0] }, then: "low" }
              ],
              default: "inactive"
            }
          }
        }
      },
      {
        $group: {
          _id: "$activityLevel",
          count: { $sum: 1 },
          avgUrls: { $avg: "$urlCount" },
          avgClicks: { $avg: "$totalClicks" }
        }
      },
      {
        $project: {
          activityLevel: "$_id",
          count: 1,
          avgUrls: { $round: ["$avgUrls", 2] },
          avgClicks: { $round: ["$avgClicks", 2] },
          _id: 0
        }
      }
    ]);

    // 4. Top Users by Activity
    const topUsers = await User.aggregate([
      { $match: { isDeleted: false } },
      {
        $lookup: {
          from: "urls",
          localField: "_id",
          foreignField: "userId",
          as: "urls"
        }
      },
      {
        $project: {
          name: 1,
          email: 1,
          plan: 1,
          createdAt: 1,
          urlCount: { $size: { $filter: { input: "$urls", cond: { $eq: ["$$this.isDeleted", false] } } } },
          totalClicks: { $sum: "$urls.clicks.total" }
        }
      },
      { $sort: { totalClicks: -1, urlCount: -1 } },
      { $limit: 10 }
    ]);

    // 5. Registration Trends by Month
    const registrationTrends = await User.aggregate([
      { $match: { isDeleted: false } },
      {
        $group: {
          _id: {
            year: { $year: "$createdAt" },
            month: { $month: "$createdAt" },
          },
          totalRegistrations: { $sum: 1 },
          premiumRegistrations: {
            $sum: {
              $cond: [{ $in: ["$plan", ["premium", "enterprise"]] }, 1, 0],
            },
          },
        },
      },
      {
        $project: {
          period: {
            $concat: [
              { $toString: "$_id.year" },
              "-",
              {
                $cond: [
                  { $lt: ["$_id.month", 10] },
                  { $concat: ["0", { $toString: "$_id.month" }] },
                  { $toString: "$_id.month" },
                ],
              },
            ],
          },
          totalRegistrations: 1,
          premiumRegistrations: 1,
          _id: 0,
        },
      },
      { $sort: { period: 1 } },
      { $limit: 12 }, // Last 12 months
    ]);

    // 6. User Demographics (if available)
    const userDemographics = await User.aggregate([
      { $match: { isDeleted: false } },
      {
        $group: {
          _id: {
            plan: "$plan",
            isEmailVerified: "$isEmailVerified",
            isActive: "$isActive"
          },
          count: { $sum: 1 }
        }
      },
      {
        $project: {
          plan: "$_id.plan",
          isEmailVerified: "$_id.isEmailVerified",
          isActive: "$_id.isActive",
          count: 1,
          _id: 0
        }
      },
      { $sort: { plan: 1 } }
    ]);

    return NextResponse.json({
      success: true,
      data: {
        usersByPlan,
        userGrowth,
        userActivity,
        topUsers,
        registrationTrends,
        userDemographics,
        period: {
          startDate,
          endDate,
        },
      },
    });
  } catch (error) {
    console.error("Error fetching user reports:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}