// app/api/admin/reports/links/route.ts
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

    // 1. Links by Domain
    const linksByDomain = await db.collection("urls").aggregate([
      { $match: dateFilter },
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
    ]).toArray();

    // 2. Link Growth (daily new links and total clicks)
    const linkGrowth = await Promise.all([
      // Daily new links
      db.collection("urls").aggregate([
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
      ]).toArray(),

      // Daily clicks
      db.collection("clicks").aggregate([
        { $match: dateFilter },
        {
          $group: {
            _id: {
              date: { $dateToString: { format: "%Y-%m-%d", date: "$createdAt" } },
            },
            clicks: { $sum: 1 },
          },
        },
        {
          $project: {
            date: "$_id.date",
            clicks: 1,
            _id: 0,
          },
        },
        { $sort: { date: 1 } },
      ]).toArray(),
    ]);

    // Merge link growth data
    const growthMap = new Map();
    
    // Add links data
    linkGrowth[0].forEach((item) => {
      growthMap.set(item.date, { date: item.date, links: item.links, clicks: 0 });
    });

    // Add clicks data
    linkGrowth[1].forEach((item) => {
      const existing = growthMap.get(item.date) || { date: item.date, links: 0, clicks: 0 };
      existing.clicks = item.clicks;
      growthMap.set(item.date, existing);
    });

    const linkGrowthData = Array.from(growthMap.values()).sort((a, b) => 
      a.date.localeCompare(b.date)
    );

    // 3. Top Performing Links
    const topPerformingLinks = await db.collection("urls").aggregate([
      { $match: dateFilter },
      {
        $project: {
          shortCode: 1,
          title: 1,
          clicks: "$clicks.total",
          originalUrl: 1,
        },
      },
      { $sort: { clicks: -1 } },
      { $limit: 10 }, // Top 10 performing links
    ]).toArray();

    // 4. Additional link analytics
    const linkAnalytics = await db.collection("urls").aggregate([
      { $match: dateFilter },
      {
        $group: {
          _id: null,
          totalLinks: { $sum: 1 },
          totalClicks: { $sum: "$clicks.total" },
          uniqueClicks: { $sum: "$clicks.unique" },
          activeLinks: {
            $sum: { $cond: [{ $eq: ["$isActive", true] }, 1, 0] },
          },
          averageClicksPerLink: { $avg: "$clicks.total" },
        },
      },
    ]).toArray();

    // 5. Fill in missing dates for consistent chart data
    const fillMissingDates = (data: any[], dateField: string = 'date') => {
      const start = new Date(startDate);
      const end = new Date(endDate);
      const filledData: any[] = [];
      const dataMap = new Map(data.map(item => [item[dateField], item]));

      for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
        const dateStr = d.toISOString().split('T')[0];
        filledData.push(dataMap.get(dateStr) || {
          [dateField]: dateStr,
          links: 0,
          clicks: 0,
        });
      }

      return filledData;
    };

    const responseData = {
      linksByDomain,
      linkGrowth: fillMissingDates(linkGrowthData),
      topPerformingLinks,
      analytics: linkAnalytics[0] || {
        totalLinks: 0,
        totalClicks: 0,
        uniqueClicks: 0,
        activeLinks: 0,
        averageClicksPerLink: 0,
      },
    };

    return NextResponse.json({
      success: true,
      data: responseData,
    });

  } catch (error) {
    console.error("Error fetching link reports:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}