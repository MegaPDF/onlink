"use client";

import React, { useState, useCallback } from "react";
import { useAuth } from "@/hooks/use-auth";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Progress } from "@/components/ui/progress";
import {
  Upload,
  FileText,
  Link,
  Copy,
  Download,
  CheckCircle,
  XCircle,
  AlertCircle,
  Trash2,
  Plus,
  Crown,
  Globe,
  Tag,
  Folder,
} from "lucide-react";
import { formatNumber } from "@/lib/utils";
import { LoadingSpinner } from "@/components/ui/loading-spinner";
import { EmptyState } from "@/components/ui/empty-state";

interface BulkResult {
  originalUrl: string;
  shortUrl?: string;
  shortCode?: string;
  error?: string;
  id?: string;
  createdAt?: Date;
}

interface BulkShortenerProps {
  folders?: Array<{ id: string; name: string; color?: string }>;
}

export function BulkShortener({ folders = [] }: BulkShortenerProps) {
  const { user } = useAuth();
  const toast = useToast();
  const [activeTab, setActiveTab] = useState("csv");
  const [isProcessing, setIsProcessing] = useState(false);
  const [progress, setProgress] = useState(0);
  const [results, setResults] = useState<BulkResult[]>([]);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [textInput, setTextInput] = useState("");
  const [selectedFolder, setSelectedFolder] = useState("");
  const [tags, setTags] = useState("");
  const [isDragOver, setIsDragOver] = useState(false);
  const [processingStats, setProcessingStats] = useState({
    total: 0,
    processed: 0,
    successful: 0,
    failed: 0,
  });

  const checkPremiumAccess = () => {
    if (user?.plan === "free") {
      toast.error("Bulk operations require a premium plan");
      return false;
    }
    return true;
  };

  const handleFileUpload = useCallback(
    (file: File) => {
      if (!file.type.includes("csv") && !file.name.endsWith(".csv")) {
        toast.error("Please upload a CSV file");
        return;
      }

      if (file.size > 5 * 1024 * 1024) {
        // 5MB limit
        toast.error("File size must be less than 5MB");
        return;
      }

      setSelectedFile(file);
      setResults([]);
      toast.success("File uploaded successfully");
    },
    [toast]
  );

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setIsDragOver(false);

      const files = Array.from(e.dataTransfer.files);
      if (files.length > 0) {
        handleFileUpload(files[0]);
      }
    },
    [handleFileUpload]
  );

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
  }, []);

  const processUrls = async (urls: string[]) => {
    if (!checkPremiumAccess()) return;

    if (urls.length === 0) {
      toast.error("No URLs found to process");
      return;
    }

    if (urls.length > 100) {
      toast.error("Maximum 100 URLs allowed per batch");
      return;
    }

    setIsProcessing(true);
    setProgress(0);
    setResults([]);
    setProcessingStats({
      total: urls.length,
      processed: 0,
      successful: 0,
      failed: 0,
    });

    try {
      const formData = new FormData();

      if (activeTab === "csv" && selectedFile) {
        formData.append("file", selectedFile);
      } else {
        // For text input, create a virtual file
        const blob = new Blob([urls.join("\n")], { type: "text/plain" });
        const file = new File([blob], "urls.txt", { type: "text/plain" });
        formData.append("file", file);
      }

      if (selectedFolder) {
        formData.append("folderId", selectedFolder);
      }

      if (tags) {
        const tagArray = tags
          .split(",")
          .map((tag) => tag.trim())
          .filter(Boolean);
        formData.append("tags", JSON.stringify(tagArray));
      }

      const response = await fetch("/api/client/bulk-shorten", {
        method: "POST",
        body: formData,
      });

      const result = await response.json();

      if (response.ok) {
        setResults(result.results);
        setProcessingStats({
          total: result.results.length,
          processed: result.results.length,
          successful: result.successful,
          failed: result.results.length - result.successful,
        });
        setProgress(100);

        toast.success(
          `Bulk operation completed! ${result.successful}/${result.results.length} URLs processed successfully`
        );
      } else {
        toast.error(result.error || "Failed to process URLs");
      }
    } catch (error) {
      toast.error("Error processing URLs");
    } finally {
      setIsProcessing(false);
    }
  };

  const handleCsvUpload = async () => {
    if (!selectedFile) {
      toast.error("Please select a CSV file");
      return;
    }

    // Parse CSV to extract URLs
    try {
      const text = await selectedFile.text();
      const lines = text.split("\n").filter((line) => line.trim());

      // Extract URLs from CSV (support different column names)
      const urls: string[] = [];

      lines.forEach((line, index) => {
        if (index === 0) {
          // Skip header if it doesn't look like a URL
          if (!line.includes("http")) return;
        }

        // Split by comma and find URL-like values
        const cells = line
          .split(",")
          .map((cell) => cell.trim().replace(/"/g, ""));
        const urlCell = cells.find(
          (cell) => cell.startsWith("http://") || cell.startsWith("https://")
        );

        if (urlCell) {
          urls.push(urlCell);
        }
      });

      await processUrls(urls);
    } catch (error) {
      toast.error("Error parsing CSV file");
    }
  };

  const handleTextInput = async () => {
    if (!textInput.trim()) {
      toast.error("Please enter URLs");
      return;
    }

    // Parse text input for URLs
    const lines = textInput.split("\n").filter((line) => line.trim());
    const urls = lines
      .map((line) => line.trim())
      .filter(
        (line) => line.startsWith("http://") || line.startsWith("https://")
      );

    if (urls.length === 0) {
      toast.error("No valid URLs found");
      return;
    }

    await processUrls(urls);
  };

  const copyAllShortUrls = () => {
    const successfulUrls = results
      .filter((result) => result.shortUrl)
      .map((result) => result.shortUrl)
      .join("\n");

    if (successfulUrls) {
      navigator.clipboard.writeText(successfulUrls);
      toast.success("All short URLs copied to clipboard");
    }
  };

  const exportResults = () => {
    if (results.length === 0) {
      toast.error("No results to export");
      return;
    }

    const csvContent = [
      "Original URL,Short URL,Short Code,Status,Error",
      ...results.map((result) => {
        const status = result.shortUrl ? "Success" : "Failed";
        const error = result.error || "";
        return `"${result.originalUrl}","${result.shortUrl || ""}","${
          result.shortCode || ""
        }","${status}","${error}"`;
      }),
    ].join("\n");

    const blob = new Blob([csvContent], { type: "text/csv" });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `bulk-shorten-results-${
      new Date().toISOString().split("T")[0]
    }.csv`;
    document.body.appendChild(a);
    a.click();
    window.URL.revokeObjectURL(url);
    document.body.removeChild(a);

    toast.success("Results exported successfully");
  };

  const clearResults = () => {
    setResults([]);
    setSelectedFile(null);
    setTextInput("");
    setProgress(0);
    setProcessingStats({
      total: 0,
      processed: 0,
      successful: 0,
      failed: 0,
    });
  };

  const getStatusIcon = (result: BulkResult) => {
    if (result.shortUrl) {
      return <CheckCircle className="h-4 w-4 text-green-500" />;
    } else {
      return <XCircle className="h-4 w-4 text-red-500" />;
    }
  };

  const getStatusBadge = (result: BulkResult) => {
    if (result.shortUrl) {
      return <Badge className="bg-green-500 hover:bg-green-600">Success</Badge>;
    } else {
      return <Badge variant="destructive">Failed</Badge>;
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Upload className="h-5 w-5" />
                Bulk URL Shortener
              </CardTitle>
              <CardDescription>
                Shorten multiple URLs at once using CSV upload or text input
              </CardDescription>
            </div>
            {user?.plan === "free" && (
              <Badge variant="outline" className="flex items-center gap-1">
                <Crown className="h-3 w-3" />
                Premium Feature
              </Badge>
            )}
          </div>
        </CardHeader>
      </Card>

      {/* Input Section */}
      <Card>
        <CardHeader>
          <CardTitle>Input Methods</CardTitle>
          <CardDescription>
            Choose how you'd like to provide your URLs for shortening
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="csv">CSV Upload</TabsTrigger>
              <TabsTrigger value="text">Text Input</TabsTrigger>
            </TabsList>

            <TabsContent value="csv" className="space-y-4">
              <div
                className={`border-2 border-dashed rounded-lg p-8 text-center transition-colors ${
                  isDragOver
                    ? "border-primary bg-primary/5"
                    : "border-muted-foreground/25"
                }`}
                onDrop={handleDrop}
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
              >
                <Upload className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
                <h3 className="text-lg font-semibold mb-2">
                  {selectedFile ? selectedFile.name : "Upload CSV File"}
                </h3>
                <p className="text-muted-foreground mb-4">
                  Drag and drop your CSV file here, or click to browse
                </p>
                <Input
                  type="file"
                  accept=".csv"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) handleFileUpload(file);
                  }}
                  className="hidden"
                  id="csv-upload"
                />
                <Label htmlFor="csv-upload">
                  <Button variant="outline" className="cursor-pointer">
                    <FileText className="h-4 w-4 mr-2" />
                    Choose File
                  </Button>
                </Label>
                {selectedFile && (
                  <div className="mt-4 p-3 bg-muted rounded-lg">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <FileText className="h-4 w-4" />
                        <span className="text-sm font-medium">
                          {selectedFile.name}
                        </span>
                        <Badge variant="secondary">
                          {(selectedFile.size / 1024).toFixed(1)} KB
                        </Badge>
                      </div>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => setSelectedFile(null)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                )}
              </div>

              <div className="bg-muted/50 p-4 rounded-lg">
                <h4 className="font-medium mb-2">CSV Format Requirements:</h4>
                <ul className="text-sm text-muted-foreground space-y-1">
                  <li>
                    • Column header should be "url", "URL", "link", or
                    "originalUrl"
                  </li>
                  <li>• One URL per row</li>
                  <li>• Maximum 100 URLs per file</li>
                  <li>• File size limit: 5MB</li>
                </ul>
              </div>
            </TabsContent>

            <TabsContent value="text" className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="urls">URLs (one per line)</Label>
                <Textarea
                  id="urls"
                  placeholder={`https://example.com/page1
https://example.com/page2
https://example.com/page3`}
                  value={textInput}
                  onChange={(e) => setTextInput(e.target.value)}
                  rows={8}
                  className="font-mono text-sm"
                />
                <p className="text-xs text-muted-foreground">
                  Enter one URL per line. Maximum 100 URLs.
                </p>
              </div>
            </TabsContent>
          </Tabs>

          {/* Options */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-6">
            <div className="space-y-2">
              <Label htmlFor="folder">Folder (Optional)</Label>
              <Select value={selectedFolder} onValueChange={setSelectedFolder}>
                <SelectTrigger>
                  <SelectValue placeholder="Select folder" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">No Folder</SelectItem>
                  {folders.map((folder) => (
                    <SelectItem key={folder.id} value={folder.id}>
                      <div className="flex items-center gap-2">
                        <div
                          className="w-3 h-3 rounded-full"
                          style={{ backgroundColor: folder.color || "#3B82F6" }}
                        />
                        {folder.name}
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="tags">Tags (comma-separated)</Label>
              <Input
                id="tags"
                placeholder="marketing, campaign, social"
                value={tags}
                onChange={(e) => setTags(e.target.value)}
              />
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex gap-2 mt-6">
            <Button
              onClick={activeTab === "csv" ? handleCsvUpload : handleTextInput}
              disabled={
                isProcessing ||
                (activeTab === "csv" && !selectedFile) ||
                (activeTab === "text" && !textInput.trim()) ||
                user?.plan === "free"
              }
              className="flex-1"
            >
              {isProcessing ? (
                <>
                  <LoadingSpinner size="sm" className="mr-2" />
                  Processing...
                </>
              ) : (
                <>
                  <Upload className="h-4 w-4 mr-2" />
                  Start Bulk Shortening
                </>
              )}
            </Button>

            {results.length > 0 && (
              <Button variant="outline" onClick={clearResults}>
                <Trash2 className="h-4 w-4 mr-2" />
                Clear
              </Button>
            )}
          </div>

          {/* Processing Progress */}
          {isProcessing && (
            <div className="space-y-2 mt-4">
              <div className="flex items-center justify-between text-sm">
                <span>Processing URLs...</span>
                <span>{Math.round(progress)}%</span>
              </div>
              <Progress value={progress} className="w-full" />
            </div>
          )}
        </CardContent>
      </Card>

      {/* Results Section */}
      {results.length > 0 && (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>Processing Results</CardTitle>
                <CardDescription>
                  Results from your bulk URL shortening operation
                </CardDescription>
              </div>
              <div className="flex items-center gap-2">
                {processingStats.successful > 0 && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={copyAllShortUrls}
                  >
                    <Copy className="h-4 w-4 mr-2" />
                    Copy All Short URLs
                  </Button>
                )}
                <Button variant="outline" size="sm" onClick={exportResults}>
                  <Download className="h-4 w-4 mr-2" />
                  Export Results
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {/* Stats Summary */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
              <div className="text-center p-3 bg-muted/50 rounded-lg">
                <div className="text-2xl font-bold">
                  {processingStats.total}
                </div>
                <div className="text-xs text-muted-foreground">Total URLs</div>
              </div>
              <div className="text-center p-3 bg-green-50 rounded-lg">
                <div className="text-2xl font-bold text-green-600">
                  {processingStats.successful}
                </div>
                <div className="text-xs text-muted-foreground">Successful</div>
              </div>
              <div className="text-center p-3 bg-red-50 rounded-lg">
                <div className="text-2xl font-bold text-red-600">
                  {processingStats.failed}
                </div>
                <div className="text-xs text-muted-foreground">Failed</div>
              </div>
              <div className="text-center p-3 bg-blue-50 rounded-lg">
                <div className="text-2xl font-bold text-blue-600">
                  {processingStats.total > 0
                    ? Math.round(
                        (processingStats.successful / processingStats.total) *
                          100
                      )
                    : 0}
                  %
                </div>
                <div className="text-xs text-muted-foreground">
                  Success Rate
                </div>
              </div>
            </div>

            {/* Results Table */}
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Status</TableHead>
                    <TableHead>Original URL</TableHead>
                    <TableHead>Short URL</TableHead>
                    <TableHead>Error</TableHead>
                    <TableHead className="w-[50px]"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {results.map((result, index) => (
                    <TableRow key={index}>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          {getStatusIcon(result)}
                          {getStatusBadge(result)}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div
                          className="max-w-[300px] truncate"
                          title={result.originalUrl}
                        >
                          {result.originalUrl}
                        </div>
                      </TableCell>
                      <TableCell>
                        {result.shortUrl ? (
                          <div className="flex items-center gap-2">
                            <code className="text-sm bg-muted px-2 py-1 rounded">
                              {result.shortCode}
                            </code>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-6 w-6"
                              onClick={() => {
                                navigator.clipboard.writeText(result.shortUrl!);
                                toast.success("Copied to clipboard");
                              }}
                            >
                              <Copy className="h-3 w-3" />
                            </Button>
                          </div>
                        ) : (
                          <span className="text-muted-foreground">-</span>
                        )}
                      </TableCell>
                      <TableCell>
                        {result.error ? (
                          <span className="text-red-600 text-sm">
                            {result.error}
                          </span>
                        ) : (
                          <span className="text-muted-foreground">-</span>
                        )}
                      </TableCell>
                      <TableCell>
                        {result.shortUrl && (
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() =>
                              window.open(result.shortUrl, "_blank")
                            }
                          >
                            <Globe className="h-4 w-4" />
                          </Button>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Premium Upgrade Notice */}
      {user?.plan === "free" && (
        <Card className="border-orange-200 bg-orange-50">
          <CardContent className="p-6">
            <div className="flex items-center gap-4">
              <div className="p-2 bg-orange-100 rounded-full">
                <Crown className="h-6 w-6 text-orange-600" />
              </div>
              <div className="flex-1">
                <h3 className="font-semibold text-orange-800">
                  Upgrade to Premium for Bulk Operations
                </h3>
                <p className="text-sm text-orange-700 mt-1">
                  Process up to 100 URLs at once, organize with folders, and
                  access advanced analytics. Upgrade now to unlock bulk
                  shortening.
                </p>
              </div>
              <Button className="bg-orange-600 hover:bg-orange-700">
                Upgrade Now
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
