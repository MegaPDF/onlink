// app/api/admin/reports/overview/route.ts
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

    // Parallel queries for current period
    const [
      totalUsers,
      totalLinks,
      totalClicks,
      totalRevenue,
      previousUsers,
      previousLinks,
      previousClicks,
      previousRevenue,
    ] = await Promise.all([
      // Current period metrics
      db.collection("users").countDocuments(dateFilter),
      db.collection("urls").countDocuments(dateFilter),
      db.collection("clicks").countDocuments(dateFilter),
      db.collection("subscriptions")
        .aggregate([
          { $match: dateFilter },
          { $group: { _id: null, total: { $sum: "$amount" } } },
        ])
        .toArray(),
      
      // Previous period metrics for growth calculation
      db.collection("users").countDocuments(previousDateFilter),
      db.collection("urls").countDocuments(previousDateFilter),
      db.collection("clicks").countDocuments(previousDateFilter),
      db.collection("subscriptions")
        .aggregate([
          { $match: previousDateFilter },
          { $group: { _id: null, total: { $sum: "$amount" } } },
        ])
        .toArray(),
    ]);

    // Calculate growth metrics
    const currentRevenue = totalRevenue[0]?.total || 0;
    const prevRevenue = previousRevenue[0]?.total || 0;

    const calculateGrowth = (current: number, previous: number) => {
      if (previous === 0) return current > 0 ? 100 : 0;
      return ((current - previous) / previous) * 100;
    };

    const overviewData = {
      totalUsers,
      totalLinks,
      totalClicks,
      totalRevenue: currentRevenue,
      growthMetrics: {
        usersGrowth: calculateGrowth(totalUsers, previousUsers),
        linksGrowth: calculateGrowth(totalLinks, previousLinks),
        clicksGrowth: calculateGrowth(totalClicks, previousClicks),
        revenueGrowth: calculateGrowth(currentRevenue, prevRevenue),
      },
    };

    return NextResponse.json({
      success: true,
      data: overviewData,
    });

  } catch (error) {
    console.error("Error fetching overview reports:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}