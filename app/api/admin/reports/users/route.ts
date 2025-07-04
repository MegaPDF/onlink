// app/api/admin/reports/users/route.ts
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

    // 1. Users by Plan
    const usersByPlan = await db.collection("users").aggregate([
      { $match: dateFilter },
      {
        $group: {
          _id: "$plan",
          count: { $sum: 1 },
        },
      },
      {
        $lookup: {
          from: "subscriptions",
          let: { plan: "$_id" },
          pipeline: [
            { $match: { $expr: { $eq: ["$plan", "$$plan"] } } },
            { $group: { _id: null, revenue: { $sum: "$amount" } } },
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
    ]).toArray();

    // 2. User Growth (daily data points)
    const userGrowth = await db.collection("users").aggregate([
      { $match: dateFilter },
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
    ]).toArray();

    // 3. User Activity (daily active users and new registrations)
    const userActivity = await Promise.all([
      // Daily new users
      db.collection("users").aggregate([
        { $match: dateFilter },
        {
          $group: {
            _id: {
              date: { $dateToString: { format: "%Y-%m-%d", date: "$createdAt" } },
            },
            new: { $sum: 1 },
          },
        },
        {
          $project: {
            date: "$_id.date",
            new: 1,
            _id: 0,
          },
        },
        { $sort: { date: 1 } },
      ]).toArray(),

      // Daily active users (users who created links or had clicks)
      db.collection("urls").aggregate([
        { $match: dateFilter },
        {
          $group: {
            _id: {
              date: { $dateToString: { format: "%Y-%m-%d", date: "$createdAt" } },
              userId: "$userId",
            },
          },
        },
        {
          $group: {
            _id: "$_id.date",
            active: { $sum: 1 },
          },
        },
        {
          $project: {
            date: "$_id",
            active: 1,
            _id: 0,
          },
        },
        { $sort: { date: 1 } },
      ]).toArray(),
    ]);

    // Merge activity data
    const activityMap = new Map();
    
    // Add new users
    userActivity[0].forEach((item) => {
      activityMap.set(item.date, { date: item.date, new: item.new, active: 0 });
    });

    // Add active users
    userActivity[1].forEach((item) => {
      const existing = activityMap.get(item.date) || { date: item.date, new: 0, active: 0 };
      existing.active = item.active;
      activityMap.set(item.date, existing);
    });

    const userActivityData = Array.from(activityMap.values()).sort((a, b) => 
      a.date.localeCompare(b.date)
    );

    // 4. Fill in missing dates for consistent chart data
    const fillMissingDates = (data: any[], dateField: string = 'date') => {
      const start = new Date(startDate);
      const end = new Date(endDate);
      const filledData: any[] = [];
      const dataMap = new Map(data.map(item => [item[dateField], item]));

      for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
        const dateStr = d.toISOString().split('T')[0];
        filledData.push(dataMap.get(dateStr) || {
          [dateField]: dateStr,
          ...(data[0] ? Object.keys(data[0]).reduce((acc, key) => {
            if (key !== dateField) acc[key] = 0;
            return acc;
          }, {} as any) : {})
        });
      }

      return filledData;
    };

    const responseData = {
      usersByPlan,
      userGrowth: fillMissingDates(userGrowth),
      userActivity: fillMissingDates(userActivityData),
    };

    return NextResponse.json({
      success: true,
      data: responseData,
    });

  } catch (error) {
    console.error("Error fetching user reports:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}