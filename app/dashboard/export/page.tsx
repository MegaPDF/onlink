"use client";

import React, { useState, useCallback } from "react";
import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { LoadingSpinner } from "@/components/ui/loading-spinner";
import {
  Download,
  FileText,
  BarChart3,
  Calendar,
  Crown,
  AlertCircle,
  CheckCircle,
  Clock,
  Database,
} from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";

interface ExportJob {
  id: string;
  type: string;
  status: "pending" | "processing" | "completed" | "failed";
  progress: number;
  createdAt: string;
  downloadUrl?: string;
  error?: string;
}

export default function ExportPage() {
  const { user } = useAuth();
  const [isExporting, setIsExporting] = useState(false);
  const [exportType, setExportType] = useState("urls");
  const [dateRange, setDateRange] = useState({
    start: new Date(new Date().setMonth(new Date().getMonth() - 1)),
    end: new Date(),
  });
  const [exportJobs, setExportJobs] = useState<ExportJob[]>([]);

  // Show premium upgrade for free users
  if (user?.plan === "free") {
    return (
      <div className="container mx-auto py-6 px-4 max-w-4xl">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold">Export Data</h1>
            <p className="text-muted-foreground">
              Export your links, analytics, and other data
            </p>
          </div>
        </div>

        <Card>
          <CardContent className="p-8">
            <div className="text-center space-y-4">
              <Crown className="h-16 w-16 text-yellow-500 mx-auto" />
              <h3 className="text-2xl font-semibold">Premium Feature</h3>
              <p className="text-muted-foreground text-lg">
                Data export is available for Premium and Enterprise users
              </p>
              <div className="space-y-2">
                <p className="text-sm text-muted-foreground">
                  • Export all your links and analytics data
                </p>
                <p className="text-sm text-muted-foreground">
                  • Multiple export formats (CSV, JSON)
                </p>
                <p className="text-sm text-muted-foreground">
                  • Custom date ranges and filtering
                </p>
                <p className="text-sm text-muted-foreground">
                  • Scheduled exports
                </p>
              </div>
              <Button
                size="lg"
                onClick={() => (window.location.href = "/dashboard/billing")}
                className="mt-6"
              >
                <Crown className="mr-2 h-5 w-5" />
                Upgrade to Premium
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  const handleExport = useCallback(async () => {
    try {
      setIsExporting(true);

      const params = new URLSearchParams({
        type: exportType,
        format: "csv",
        startDate: dateRange.start.toISOString(),
        endDate: dateRange.end.toISOString(),
      });

      const response = await fetch(`/api/client/export?${params.toString()}`);

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Export failed");
      }

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `${exportType}-export-${
        new Date().toISOString().split("T")[0]
      }.csv`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);

      toast.success("Your data has been exported successfully.");

      // Add to export jobs list
      const newJob: ExportJob = {
        id: Date.now().toString(),
        type: exportType,
        status: "completed",
        progress: 100,
        createdAt: new Date().toISOString(),
      };
      setExportJobs((prev) => [newJob, ...prev]);
    } catch (error: unknown) {
      console.error("Export error:", error);
      if (error instanceof Error) {
        toast.error(error.message);
      } else {
        toast.error("An unexpected error occurred.");
      }
    } finally {
      setIsExporting(false);
    }
  }, [exportType, dateRange]);

  const getStatusIcon = (status: ExportJob["status"]) => {
    switch (status) {
      case "completed":
        return <CheckCircle className="h-4 w-4 text-green-500" />;
      case "failed":
        return <AlertCircle className="h-4 w-4 text-red-500" />;
      case "processing":
        return <LoadingSpinner size="sm" />;
      default:
        return <Clock className="h-4 w-4 text-yellow-500" />;
    }
  };

  const getStatusBadge = (status: ExportJob["status"]) => {
    switch (status) {
      case "completed":
        return (
          <Badge className="bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400">
            Completed
          </Badge>
        );
      case "failed":
        return (
          <Badge className="bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-400">
            Failed
          </Badge>
        );
      case "processing":
        return (
          <Badge className="bg-blue-100 text-blue-800 dark:bg-blue-900/20 dark:text-blue-400">
            Processing
          </Badge>
        );
      default:
        return (
          <Badge className="bg-yellow-100 text-yellow-800 dark:bg-yellow-900/20 dark:text-yellow-400">
            Pending
          </Badge>
        );
    }
  };

  return (
    <div className="container mx-auto py-6 px-4 max-w-4xl">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold">Export Data</h1>
          <p className="text-muted-foreground">
            Export your links, analytics, and other data in various formats
          </p>
        </div>
        <Badge
          variant="secondary"
          className="bg-yellow-100 text-yellow-800 dark:bg-yellow-900/20 dark:text-yellow-400"
        >
          <Crown className="h-3 w-3 mr-1" />
          Premium Feature
        </Badge>
      </div>

      <div className="space-y-6">
        {/* Export Configuration */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Database className="h-5 w-5" />
              Export Configuration
            </CardTitle>
            <CardDescription>
              Choose what data to export and the date range
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <label className="text-sm font-medium">Export Type</label>
                <Select value={exportType} onValueChange={setExportType}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="urls">
                      <div className="flex items-center gap-2">
                        <FileText className="h-4 w-4" />
                        Links Data
                      </div>
                    </SelectItem>
                    <SelectItem value="analytics">
                      <div className="flex items-center gap-2">
                        <BarChart3 className="h-4 w-4" />
                        Analytics Data
                      </div>
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">Date Range</label>
                {/* <DateRangePicker value={dateRange} onChange={setDateRange} /> */}
              </div>
            </div>

            <div className="bg-muted/50 p-4 rounded-lg">
              <h4 className="font-medium mb-2">Export Details</h4>
              {exportType === "urls" ? (
                <div className="space-y-1 text-sm text-muted-foreground">
                  <p>• Original URL, Short URL, Short Code</p>
                  <p>• Title, Description, Tags</p>
                  <p>• Click statistics and performance data</p>
                  <p>• Creation date and expiration info</p>
                </div>
              ) : (
                <div className="space-y-1 text-sm text-muted-foreground">
                  <p>• Click timestamps and geographic data</p>
                  <p>• Device, browser, and OS information</p>
                  <p>• Referrer sources and domains</p>
                  <p>• Performance metrics</p>
                </div>
              )}
            </div>

            <Button
              onClick={handleExport}
              disabled={isExporting}
              className="w-full md:w-auto"
            >
              {isExporting ? (
                <>
                  <LoadingSpinner size="sm" className="mr-2" />
                  Exporting...
                </>
              ) : (
                <>
                  <Download className="h-4 w-4 mr-2" />
                  Export as CSV
                </>
              )}
            </Button>
          </CardContent>
        </Card>

        {/* Export History */}
        {exportJobs.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Clock className="h-5 w-5" />
                Export History
              </CardTitle>
              <CardDescription>
                Your recent export jobs and downloads
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {exportJobs.map((job) => (
                  <div
                    key={job.id}
                    className="flex items-center justify-between p-4 border rounded-lg"
                  >
                    <div className="flex items-center gap-3">
                      {getStatusIcon(job.status)}
                      <div>
                        <p className="font-medium capitalize">
                          {job.type} Export
                        </p>
                        <p className="text-sm text-muted-foreground">
                          {new Date(job.createdAt).toLocaleDateString()} at{" "}
                          {new Date(job.createdAt).toLocaleTimeString()}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      {getStatusBadge(job.status)}
                      {job.status === "completed" && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            // Re-trigger download
                            handleExport();
                          }}
                        >
                          <Download className="h-4 w-4" />
                        </Button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Export Limits */}
        <Card>
          <CardHeader>
            <CardTitle>Export Limits & Information</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <h4 className="font-medium text-sm">
                  Current Plan: {user?.plan}
                </h4>
                <div className="space-y-1 text-sm text-muted-foreground">
                  <p>• Maximum 10,000 records per export</p>
                  <p>• Export available in CSV format</p>
                  <p>• Data retention: 90 days</p>
                </div>
              </div>
              <div className="space-y-2">
                <h4 className="font-medium text-sm">Supported Formats</h4>
                <div className="flex gap-2">
                  <Badge variant="outline">CSV</Badge>
                  {user?.plan === "enterprise" && (
                    <Badge variant="outline">JSON</Badge>
                  )}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
