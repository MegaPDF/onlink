// app/api/admin/reports/export/route.ts
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
    const type = searchParams.get("type") || "csv";
    const tab = searchParams.get("tab") || "overview";

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

    let exportData: any[] = [];
    let filename = `admin-report-${tab}-${startDate}-to-${endDate}`;

    // Generate export data based on selected tab
    switch (tab) {
      case "overview":
        // Export overview metrics
        const [users, links, clicks, revenue] = await Promise.all([
          db.collection("users").countDocuments(dateFilter),
          db.collection("urls").countDocuments(dateFilter),
          db.collection("clicks").countDocuments(dateFilter),
          db.collection("subscriptions")
            .aggregate([
              { $match: dateFilter },
              { $group: { _id: null, total: { $sum: "$amount" } } },
            ])
            .toArray(),
        ]);

        exportData = [
          {
            metric: "Total Users",
            value: users,
            period: `${startDate} to ${endDate}`,
          },
          {
            metric: "Total Links",
            value: links,
            period: `${startDate} to ${endDate}`,
          },
          {
            metric: "Total Clicks",
            value: clicks,
            period: `${startDate} to ${endDate}`,
          },
          {
            metric: "Total Revenue",
            value: revenue[0]?.total || 0,
            period: `${startDate} to ${endDate}`,
          },
        ];
        break;

      case "users":
        // Export user data
        exportData = await db.collection("users")
          .find(dateFilter)
          .project({
            name: 1,
            email: 1,
            plan: 1,
            role: 1,
            isActive: 1,
            isEmailVerified: 1,
            createdAt: 1,
          })
          .sort({ createdAt: -1 })
          .toArray();
        break;

      case "links":
        // Export links data
        exportData = await db.collection("urls")
          .find(dateFilter)
          .project({
            shortCode: 1,
            originalUrl: 1,
            title: 1,
            domain: 1,
            clicks: 1,
            isActive: 1,
            createdAt: 1,
            userId: 1,
          })
          .sort({ createdAt: -1 })
          .toArray();
        break;

      case "revenue":
        // Export revenue data
        exportData = await db.collection("subscriptions")
          .find(dateFilter)
          .project({
            plan: 1,
            status: 1,
            amount: 1,
            currency: 1,
            interval: 1,
            createdAt: 1,
            userId: 1,
            currentPeriodStart: 1,
            currentPeriodEnd: 1,
          })
          .sort({ createdAt: -1 })
          .toArray();
        break;

      default:
        return NextResponse.json(
          { error: "Invalid export tab" },
          { status: 400 }
        );
    }

    if (type === "csv") {
      // Generate CSV
      if (exportData.length === 0) {
        return new NextResponse("No data available for the selected period", {
          status: 200,
          headers: {
            "Content-Type": "text/csv",
            "Content-Disposition": `attachment; filename="${filename}.csv"`,
          },
        });
      }

      // Get CSV headers from the first object
      const headers = Object.keys(exportData[0]);
      let csvContent = headers.join(",") + "\n";

      // Add data rows
      exportData.forEach((row) => {
        const values = headers.map((header) => {
          let value = row[header];
          
          // Handle special data types
          if (value instanceof Date) {
            value = value.toISOString();
          } else if (typeof value === "object" && value !== null) {
            value = JSON.stringify(value);
          } else if (typeof value === "string" && value.includes(",")) {
            value = `"${value}"`;
          }
          
          return value || "";
        });
        csvContent += values.join(",") + "\n";
      });

      return new NextResponse(csvContent, {
        status: 200,
        headers: {
          "Content-Type": "text/csv",
          "Content-Disposition": `attachment; filename="${filename}.csv"`,
        },
      });

    } else if (type === "pdf") {
      // For PDF export, we'll return JSON data that the frontend can use with a PDF library
      // You can implement PDF generation using libraries like jsPDF or puppeteer
      return NextResponse.json({
        success: true,
        message: "PDF export is not yet implemented. Please use CSV export.",
        data: exportData,
      });

    } else {
      return NextResponse.json(
        { error: "Invalid export type. Use 'csv' or 'pdf'" },
        { status: 400 }
      );
    }

  } catch (error) {
    console.error("Error exporting reports:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}