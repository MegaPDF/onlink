// app/api/admin/reports/revenue/route.ts
import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { connectDB } from "@/lib/mongodb";
import { User } from "@/models/User";

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

    // 1. Revenue by Plan using User model
    const revenueByPlan = await User.aggregate([
      { 
        $match: { 
          ...dateFilter,
          isDeleted: false,
          plan: { $in: ["premium", "enterprise"] }
        } 
      },
      {
        $group: {
          _id: "$plan",
          count: { $sum: 1 },
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
        },
      },
      {
        $project: {
          plan: "$_id",
          revenue: 1,
          count: 1,
          _id: 0,
        },
      },
      { $sort: { revenue: -1 } },
    ]);

    // 2. Daily Revenue Trend
    const dailyRevenue = await User.aggregate([
      {
        $match: {
          ...dateFilter,
          isDeleted: false,
          plan: { $in: ["premium", "enterprise"] }
        },
      },
      {
        $group: {
          _id: {
            date: { $dateToString: { format: "%Y-%m-%d", date: "$createdAt" } },
            plan: "$plan"
          },
          count: { $sum: 1 },
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
        },
      },
      {
        $group: {
          _id: "$_id.date",
          totalRevenue: { $sum: "$revenue" },
          plans: {
            $push: {
              plan: "$_id.plan",
              revenue: "$revenue",
              count: "$count"
            }
          }
        }
      },
      {
        $project: {
          date: "$_id",
          totalRevenue: 1,
          plans: 1,
          _id: 0,
        },
      },
      { $sort: { date: 1 } },
    ]);

    // 3. Monthly Recurring Revenue (MRR) calculation
    const mrrData = await User.aggregate([
      {
        $match: {
          isDeleted: false,
          isActive: true,
          plan: { $in: ["premium", "enterprise"] }
        }
      },
      {
        $group: {
          _id: "$plan",
          activeSubscriptions: { $sum: 1 },
          monthlyRevenue: {
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
      {
        $project: {
          plan: "$_id",
          activeSubscriptions: 1,
          monthlyRevenue: 1,
          _id: 0
        }
      }
    ]);

    // 4. Revenue Growth Comparison
    const periodDays = Math.ceil(
      (new Date(endDate).getTime() - new Date(startDate).getTime()) / (1000 * 60 * 60 * 24)
    );
    const previousStartDate = new Date(new Date(startDate).getTime() - periodDays * 24 * 60 * 60 * 1000);
    const previousEndDate = new Date(startDate);

    const previousPeriodRevenue = await User.aggregate([
      {
        $match: {
          createdAt: {
            $gte: previousStartDate,
            $lt: previousEndDate,
          },
          isDeleted: false,
          plan: { $in: ["premium", "enterprise"] }
        }
      },
      {
        $group: {
          _id: null,
          totalRevenue: {
            $sum: {
              $switch: {
                branches: [
                  { case: { $eq: ["$plan", "premium"] }, then: 9 },
                  { case: { $eq: ["$plan", "enterprise"] }, then: 29 }
                ],
                default: 0
              }
            }
          },
          totalSubscriptions: { $sum: 1 }
        }
      }
    ]);

    // 5. Revenue Summary
    const currentPeriodTotal = revenueByPlan.reduce((sum, item) => sum + item.revenue, 0);
    const previousPeriodTotal = previousPeriodRevenue[0]?.totalRevenue || 0;
    const totalMRR = mrrData.reduce((sum, item) => sum + item.monthlyRevenue, 0);
    const totalActiveSubscriptions = mrrData.reduce((sum, item) => sum + item.activeSubscriptions, 0);

    const revenueGrowth = previousPeriodTotal > 0 
      ? ((currentPeriodTotal - previousPeriodTotal) / previousPeriodTotal) * 100 
      : currentPeriodTotal > 0 ? 100 : 0;

    // 6. Customer Lifetime Value (CLV) estimation
    const averageRevenuePerUser = totalActiveSubscriptions > 0 ? totalMRR / totalActiveSubscriptions : 0;
    const estimatedCLV = averageRevenuePerUser * 12; // Simple 12-month estimate

    return NextResponse.json({
      success: true,
      data: {
        summary: {
          currentPeriodRevenue: currentPeriodTotal,
          previousPeriodRevenue: previousPeriodTotal,
          revenueGrowth: Math.round(revenueGrowth * 100) / 100,
          monthlyRecurringRevenue: totalMRR,
          annualRecurringRevenue: totalMRR * 12,
          activeSubscriptions: totalActiveSubscriptions,
          averageRevenuePerUser: Math.round(averageRevenuePerUser * 100) / 100,
          estimatedCustomerLifetimeValue: Math.round(estimatedCLV * 100) / 100,
        },
        charts: {
          revenueByPlan,
          dailyRevenue,
          mrrByPlan: mrrData,
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
    console.error("Error fetching revenue reports:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}