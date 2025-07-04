"use client";

import React, { useState, useEffect } from "react";
import { AnalyticsDashboard } from "@/components/dashboard/analytics-dashboard";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { DatePickerWithRange } from "@/components/ui/date-picker";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  BarChart3,
  TrendingUp,
  Globe,
  Smartphone,
  Users,
  MousePointer,
  Download,
  Filter,
  Calendar,
  Eye,
} from "lucide-react";
import { formatNumber } from "@/lib/utils";
import { useAuth } from "@/hooks/use-auth";

interface AnalyticsFilters {
  dateRange: "today" | "7days" | "30days" | "90days" | "custom";
  linkId?: string;
  domain?: string;
  country?: string;
}

export default function AnalyticsPage() {
  const { user } = useAuth();
  const [filters, setFilters] = useState<AnalyticsFilters>({
    dateRange: "30days",
  });
  const [availableLinks, setAvailableLinks] = useState([]);
  const [isExporting, setIsExporting] = useState(false);

  useEffect(() => {
    fetchAvailableLinks();
  }, []);

  const fetchAvailableLinks = async () => {
    try {
      const response = await fetch(
        "/api/client/links?select=id,shortCode,title,originalUrl"
      );
      if (response.ok) {
        const data = await response.json();
        setAvailableLinks(data.data.links || []);
      }
    } catch (error) {
      console.error("Failed to fetch links:", error);
    }
  };

  const handleExport = async (format: "csv" | "xlsx" | "pdf") => {
    if (user?.plan === "free") {
      // Redirect to billing page
      window.location.href = "/dashboard/billing";
      return;
    }

    setIsExporting(true);
    try {
      const response = await fetch("/api/client/analytics/export", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ format, filters }),
      });

      if (response.ok) {
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `analytics-export.${format}`;
        a.click();
        window.URL.revokeObjectURL(url);
      }
    } catch (error) {
      console.error("Export failed:", error);
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Analytics</h1>
          <p className="text-muted-foreground">
            Detailed insights into your link performance
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            onClick={() => handleExport("csv")}
            disabled={isExporting}
          >
            <Download className="mr-2 h-4 w-4" />
            Export CSV
          </Button>

          {user?.plan !== "free" && (
            <>
              <Button
                variant="outline"
                onClick={() => handleExport("xlsx")}
                disabled={isExporting}
              >
                Export Excel
              </Button>
              <Button
                variant="outline"
                onClick={() => handleExport("pdf")}
                disabled={isExporting}
              >
                Export PDF
              </Button>
            </>
          )}
        </div>
      </div>

      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Filter className="h-5 w-5" />
            Filters
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-4">
            <div className="space-y-2">
              <Label>Time Range</Label>
              <Select
                value={filters.dateRange}
                onValueChange={(value: any) =>
                  setFilters({ ...filters, dateRange: value })
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="today">Today</SelectItem>
                  <SelectItem value="7days">Last 7 days</SelectItem>
                  <SelectItem value="30days">Last 30 days</SelectItem>
                  <SelectItem value="90days">Last 90 days</SelectItem>
                  <SelectItem value="custom">Custom range</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Specific Link</Label>
              <Select
                value={filters.linkId || ""}
                onValueChange={(value) =>
                  setFilters({ ...filters, linkId: value || undefined })
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="All links" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">All links</SelectItem>
                  {availableLinks.map((link: any) => (
                    <SelectItem key={link.id} value={link.id}>
                      {link.title || link.shortCode} -{" "}
                      {link.originalUrl.slice(0, 30)}...
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Country</Label>
              <Input
                placeholder="e.g., United States"
                value={filters.country || ""}
                onChange={(e) =>
                  setFilters({
                    ...filters,
                    country: e.target.value || undefined,
                  })
                }
              />
            </div>

            <div className="space-y-2">
              <Label>Domain</Label>
              <Input
                placeholder="e.g., example.com"
                value={filters.domain || ""}
                onChange={(e) =>
                  setFilters({
                    ...filters,
                    domain: e.target.value || undefined,
                  })
                }
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Analytics Dashboard */}
      <AnalyticsDashboard filters={filters} />

      {/* Upgrade Prompt for Free Users */}
      {user?.plan === "free" && (
        <Card className="border-orange-200 bg-orange-50 dark:border-orange-800 dark:bg-orange-950">
          <CardContent className="p-6">
            <div className="flex items-center gap-4">
              <TrendingUp className="h-8 w-8 text-orange-600" />
              <div className="flex-1">
                <h3 className="font-semibold text-orange-800 dark:text-orange-200">
                  Unlock Advanced Analytics
                </h3>
                <p className="text-orange-700 dark:text-orange-300 text-sm">
                  Upgrade to Premium for real-time analytics, geographic
                  insights, device tracking, and export capabilities.
                </p>
              </div>
              <Button asChild>
                <a href="/dashboard/billing">Upgrade Now</a>
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
