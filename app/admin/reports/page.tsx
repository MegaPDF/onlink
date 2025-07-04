"use client";

import React, { useState, useEffect } from "react";
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
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import {
  FileText,
  Download,
  Calendar,
  Filter,
  BarChart3,
  Users,
  LinkIcon,
  DollarSign,
  TrendingUp,
  Globe,
  Activity,
  Clock,
  CheckCircle,
  AlertTriangle,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { formatDate } from "date-fns";

interface ReportTemplate {
  id: string;
  name: string;
  description: string;
  type: "analytics" | "users" | "revenue" | "security" | "performance";
  frequency: "daily" | "weekly" | "monthly" | "quarterly";
  format: "pdf" | "xlsx" | "csv";
  isActive: boolean;
  lastGenerated?: string;
  nextGeneration?: string;
}

interface ReportHistory {
  id: string;
  templateId: string;
  templateName: string;
  type: string;
  format: string;
  status: "generating" | "completed" | "failed";
  generatedAt: string;
  downloadUrl?: string;
  fileSize?: number;
  parameters: Record<string, any>;
}

export default function AdminReportsPage() {
  const toast = useToast();
  const [templates, setTemplates] = useState<ReportTemplate[]>([]);
  const [history, setHistory] = useState<ReportHistory[]>([]);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState<string | null>(null);

  const [customReport, setCustomReport] = useState({
    name: "",
    type: "analytics",
    format: "pdf",
    dateRange: "30d",
    metrics: [] as string[],
    filters: {} as Record<string, any>,
  });

  useEffect(() => {
    fetchReportsData();
  }, []);

  const fetchReportsData = async () => {
    try {
      const [templatesRes, historyRes] = await Promise.all([
        fetch("/api/admin/reports/templates"),
        fetch("/api/admin/reports/history?limit=20"),
      ]);

      if (templatesRes.ok) {
        const templatesData = await templatesRes.json();
        setTemplates(templatesData.data);
      }

      if (historyRes.ok) {
        const historyData = await historyRes.json();
        setHistory(historyData.data);
      }
    } catch (error) {
      console.error("Failed to fetch reports data:", error);
    } finally {
      setLoading(false);
    }
  };

  const generateReport = async (templateId?: string, customParams?: any) => {
    const params = templateId
      ? { templateId }
      : { custom: true, ...(customParams || customReport) };

    setGenerating(templateId || "custom");

    try {
      const response = await fetch("/api/admin/reports/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(params),
      });

      if (response.ok) {
        const result = await response.json();
        toast.success("Report generation started");

        // If it's a quick report, download immediately
        if (result.data.downloadUrl) {
          window.open(result.data.downloadUrl, "_blank");
        } else {
          // Otherwise, refresh history to show generating status
          fetchReportsData();
        }
      } else {
        const result = await response.json();
        throw new Error(result.error);
      }
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Failed to generate report"
      );
    } finally {
      setGenerating(null);
    }
  };

  const downloadReport = (downloadUrl: string, filename: string) => {
    const link = document.createElement("a");
    link.href = downloadUrl;
    link.download = filename;
    link.click();
  };

  const getStatusBadge = (status: string) => {
    const variants = {
      generating: "secondary",
      completed: "default",
      failed: "destructive",
    } as const;

    const icons = {
      generating: Clock,
      completed: CheckCircle,
      failed: AlertTriangle,
    } as const;

    const Icon = icons[status as keyof typeof icons];

    return (
      <Badge variant={variants[status as keyof typeof variants]}>
        <Icon className="w-3 h-3 mr-1" />
        {status.charAt(0).toUpperCase() + status.slice(1)}
      </Badge>
    );
  };

  const reportTypes = [
    { value: "analytics", label: "Analytics", icon: BarChart3 },
    { value: "users", label: "Users", icon: Users },
    { value: "revenue", label: "Revenue", icon: DollarSign },
    { value: "security", label: "Security", icon: AlertTriangle },
    { value: "performance", label: "Performance", icon: TrendingUp },
  ];

  const availableMetrics = {
    analytics: [
      "page_views",
      "unique_visitors",
      "click_through_rate",
      "bounce_rate",
    ],
    users: ["total_users", "active_users", "new_signups", "churn_rate"],
    revenue: ["mrr", "arr", "ltv", "churn"],
    security: ["threats_detected", "threats_blocked", "security_events"],
    performance: ["response_time", "uptime", "error_rate", "throughput"],
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">
            Reports & Analytics
          </h1>
          <p className="text-muted-foreground">
            Generate and manage system reports
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button variant="outline" onClick={fetchReportsData}>
            <Download className="mr-2 h-4 w-4" />
            Refresh
          </Button>
        </div>
      </div>

      <Tabs defaultValue="templates" className="space-y-6">
        <TabsList>
          <TabsTrigger value="templates">Report Templates</TabsTrigger>
          <TabsTrigger value="custom">Custom Report</TabsTrigger>
          <TabsTrigger value="history">Report History</TabsTrigger>
        </TabsList>

        <TabsContent value="templates">
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {templates.map((template) => (
              <Card key={template.id}>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-base">{template.name}</CardTitle>
                    <Badge
                      variant={template.isActive ? "default" : "secondary"}
                    >
                      {template.isActive ? "Active" : "Inactive"}
                    </Badge>
                  </div>
                  <CardDescription>{template.description}</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    <div className="flex justify-between text-sm">
                      <span>Type:</span>
                      <Badge variant="outline">{template.type}</Badge>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span>Frequency:</span>
                      <span>{template.frequency}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span>Format:</span>
                      <span>{template.format.toUpperCase()}</span>
                    </div>
                    {template.lastGenerated && (
                      <div className="flex justify-between text-sm">
                        <span>Last Generated:</span>
                        <span>{formatDate(template.lastGenerated, "yyyy-MM-dd")}</span>
                      </div>
                    )}

                    <Button
                      className="w-full"
                      onClick={() => generateReport(template.id)}
                      disabled={generating === template.id}
                    >
                      {generating === template.id ? (
                        <>
                          <Clock className="mr-2 h-4 w-4 animate-spin" />
                          Generating...
                        </>
                      ) : (
                        <>
                          <Download className="mr-2 h-4 w-4" />
                          Generate Report
                        </>
                      )}
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="custom">
          <Card>
            <CardHeader>
              <CardTitle>Create Custom Report</CardTitle>
              <CardDescription>
                Generate a custom report with specific metrics and date ranges
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="report-name">Report Name</Label>
                  <Input
                    id="report-name"
                    placeholder="My Custom Report"
                    value={customReport.name}
                    onChange={(e) =>
                      setCustomReport({ ...customReport, name: e.target.value })
                    }
                  />
                </div>

                <div className="space-y-2">
                  <Label>Report Type</Label>
                  <Select
                    value={customReport.type}
                    onValueChange={(value) =>
                      setCustomReport({
                        ...customReport,
                        type: value,
                        metrics: [],
                      })
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {reportTypes.map((type) => (
                        <SelectItem key={type.value} value={type.value}>
                          <div className="flex items-center gap-2">
                            <type.icon className="w-4 h-4" />
                            {type.label}
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>Format</Label>
                  <Select
                    value={customReport.format}
                    onValueChange={(value) =>
                      setCustomReport({ ...customReport, format: value })
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="pdf">PDF</SelectItem>
                      <SelectItem value="xlsx">Excel</SelectItem>
                      <SelectItem value="csv">CSV</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>Date Range</Label>
                  <Select
                    value={customReport.dateRange}
                    onValueChange={(value) =>
                      setCustomReport({ ...customReport, dateRange: value })
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="7d">Last 7 days</SelectItem>
                      <SelectItem value="30d">Last 30 days</SelectItem>
                      <SelectItem value="90d">Last 90 days</SelectItem>
                      <SelectItem value="1y">Last year</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* Metrics Selection */}
              <div className="space-y-3">
                <Label>Metrics to Include</Label>
                <div className="grid gap-2 md:grid-cols-2">
                  {availableMetrics[
                    customReport.type as keyof typeof availableMetrics
                  ]?.map((metric) => (
                    <div key={metric} className="flex items-center space-x-2">
                      <Checkbox
                        id={metric}
                        checked={customReport.metrics.includes(metric)}
                        onCheckedChange={(checked) => {
                          if (checked) {
                            setCustomReport({
                              ...customReport,
                              metrics: [...customReport.metrics, metric],
                            });
                          } else {
                            setCustomReport({
                              ...customReport,
                              metrics: customReport.metrics.filter(
                                (m) => m !== metric
                              ),
                            });
                          }
                        }}
                      />
                      <Label htmlFor={metric} className="text-sm">
                        {metric
                          .replace("_", " ")
                          .replace(/\b\w/g, (l) => l.toUpperCase())}
                      </Label>
                    </div>
                  ))}
                </div>
              </div>

              <Button
                onClick={() => generateReport(undefined, customReport)}
                disabled={
                  !customReport.name ||
                  customReport.metrics.length === 0 ||
                  generating === "custom"
                }
                className="w-full"
              >
                {generating === "custom" ? (
                  <>
                    <Clock className="mr-2 h-4 w-4 animate-spin" />
                    Generating Report...
                  </>
                ) : (
                  <>
                    <FileText className="mr-2 h-4 w-4" />
                    Generate Custom Report
                  </>
                )}
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="history">
          <Card>
            <CardHeader>
              <CardTitle>Report History</CardTitle>
              <CardDescription>
                Previously generated reports and their status
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {history.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    <FileText className="mx-auto h-12 w-12 mb-4 opacity-50" />
                    <p>No reports generated yet</p>
                  </div>
                ) : (
                  history.map((report) => (
                    <div
                      key={report.id}
                      className="flex items-center justify-between p-4 border rounded-lg"
                    >
                      <div className="flex items-center gap-4">
                        <div className="w-10 h-10 rounded-full bg-muted flex items-center justify-center">
                          <FileText className="w-5 h-5" />
                        </div>
                        <div>
                          <div className="font-medium">
                            {report.templateName}
                          </div>
                          <div className="text-sm text-muted-foreground">
                            {report.type.charAt(0).toUpperCase() +
                              report.type.slice(1)}{" "}
                            • {report.format.toUpperCase()}
                          </div>
                          <div className="text-xs text-muted-foreground">
                            Generated {formatDate(report.generatedAt, "yyyy-MM-dd")}
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-3">
                        {getStatusBadge(report.status)}
                        {report.fileSize && (
                          <span className="text-sm text-muted-foreground">
                            {(report.fileSize / 1024 / 1024).toFixed(1)} MB
                          </span>
                        )}
                        {report.downloadUrl &&
                          report.status === "completed" && (
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() =>
                                downloadReport(
                                  report.downloadUrl!,
                                  `${report.templateName}.${report.format}`
                                )
                              }
                            >
                              <Download className="mr-2 h-4 w-4" />
                              Download
                            </Button>
                          )}
                      </div>
                    </div>
                  ))
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
