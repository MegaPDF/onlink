// app/api/admin/reports/revenue/route.ts
import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { connectDB } from "@/lib/mongodb";

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

    const { db } = await connectDB();

    // Date range filter
    const dateFilter = {
      createdAt: {
        $gte: new Date(startDate),
        $lte: new Date(endDate + "T23:59:59.999Z"),
      },
    };

    // 1. Revenue by Plan
    const revenueByPlan = await db.collection("subscriptions").aggregate([
      { 
        $match: { 
          ...dateFilter,
          status: { $in: ["active", "trialing"] }
        } 
      },
      {
        $group: {
          _id: "$plan",
          revenue: { $sum: "$amount" },
          count: { $sum: 1 },
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
    ]).toArray();

    // 2. Revenue Growth (daily revenue and MRR)
    const revenueGrowth = await Promise.all([
      // Daily revenue from new subscriptions
      db.collection("subscriptions").aggregate([
        { $match: dateFilter },
        {
          $group: {
            _id: {
              date: { $dateToString: { format: "%Y-%m-%d", date: "$createdAt" } },
            },
            revenue: { $sum: "$amount" },
          },
        },
        {
          $project: {
            date: "$_id.date",
            revenue: 1,
            _id: 0,
          },
        },
        { $sort: { date: 1 } },
      ]).toArray(),

      // Calculate MRR for each day (Monthly Recurring Revenue)
      db.collection("subscriptions").aggregate([
        { 
          $match: { 
            status: { $in: ["active", "trialing"] },
            createdAt: { $lte: new Date(endDate + "T23:59:59.999Z") }
          } 
        },
        {
          $addFields: {
            normalizedAmount: {
              $cond: [
                { $eq: ["$interval", "year"] },
                { $divide: ["$amount", 12] }, // Convert yearly to monthly
                "$amount" // Already monthly
              ]
            }
          }
        },
        {
          $group: {
            _id: null,
            mrr: { $sum: "$normalizedAmount" },
          },
        },
      ]).toArray(),
    ]);

    // Get current MRR
    const currentMRR = revenueGrowth[1][0]?.mrr || 0;

    // Merge revenue growth data
    const growthMap = new Map();
    
    // Add daily revenue
    revenueGrowth[0].forEach((item) => {
      growthMap.set(item.date, { date: item.date, revenue: item.revenue, mrr: currentMRR });
    });

    const revenueGrowthData = Array.from(growthMap.values()).sort((a, b) => 
      a.date.localeCompare(b.date)
    );

    // 3. Churn Analysis
    const churnAnalysis = await Promise.all([
      // Daily cancellations
      db.collection("subscriptions").aggregate([
        { 
          $match: { 
            status: "canceled",
            canceledAt: {
              $gte: new Date(startDate),
              $lte: new Date(endDate + "T23:59:59.999Z"),
            }
          } 
        },
        {
          $group: {
            _id: {
              date: { $dateToString: { format: "%Y-%m-%d", date: "$canceledAt" } },
            },
            cancellations: { $sum: 1 },
          },
        },
        {
          $project: {
            date: "$_id.date",
            cancellations: 1,
            _id: 0,
          },
        },
        { $sort: { date: 1 } },
      ]).toArray(),

      // Total active subscriptions for retention calculation
      db.collection("subscriptions").aggregate([
        { 
          $match: { 
            status: { $in: ["active", "trialing"] }
          } 
        },
        {
          $count: "total"
        }
      ]).toArray(),
    ]);

    const totalActiveSubscriptions = churnAnalysis[1][0]?.total || 1;
    
    // Calculate churn and retention rates
    const churnData = churnAnalysis[0].map((item) => {
      const churnRate = (item.cancellations / totalActiveSubscriptions) * 100;
      const retentionRate = 100 - churnRate;
      
      return {
        date: item.date,
        churn: churnRate,
        retention: retentionRate,
      };
    });

    // 4. Revenue metrics summary
    const revenueMetrics = await db.collection("subscriptions").aggregate([
      { 
        $match: { 
          ...dateFilter,
          status: { $in: ["active", "trialing"] }
        } 
      },
      {
        $group: {
          _id: null,
          totalRevenue: { $sum: "$amount" },
          totalSubscriptions: { $sum: 1 },
          averageRevenuePerUser: { $avg: "$amount" },
        },
      },
    ]).toArray();

    // 5. Fill in missing dates for consistent chart data
    type FilledDataType = {
      [key: string]: any;
      date?: string;
      revenue?: number;
      mrr?: number;
      churn?: number;
      retention?: number;
    };

    const fillMissingDates = (data: any[], dateField: string = 'date') => {
      const start = new Date(startDate);
      const end = new Date(endDate);
      const filledData: FilledDataType[] = [];
      const dataMap = new Map(data.map(item => [item[dateField], item]));

      for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
        const dateStr = d.toISOString().split('T')[0];
        filledData.push(dataMap.get(dateStr) || {
          [dateField]: dateStr,
          revenue: 0,
          mrr: currentMRR,
          churn: 0,
          retention: 100,
        });
      }

      return filledData;
    };

    const responseData = {
      revenueByPlan,
      revenueGrowth: fillMissingDates(revenueGrowthData),
      churnAnalysis: fillMissingDates(churnData),
      metrics: revenueMetrics[0] || {
        totalRevenue: 0,
        totalSubscriptions: 0,
        averageRevenuePerUser: 0,
      },
      mrr: currentMRR,
    };

    return NextResponse.json({
      success: true,
      data: responseData,
    });

  } catch (error) {
    console.error("Error fetching revenue reports:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}