"use client";

import React, { useState, useEffect } from "react";
import { LinksTable } from "@/components/dashboard/links-table";
import { UrlShortener } from "@/components/dashboard/url-shortener";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Dialog, DialogContent, DialogTrigger } from "@/components/ui/dialog";
import {
  Plus,
  Search,
  Filter,
  LinkIcon,
  Archive,
  Star,
  Download,
  Upload,
  Folder,
  Tags,
  Calendar,
  SortAsc,
  SortDesc,
} from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
import { useSearchParams, useRouter } from "next/navigation";

interface LinksPageFilters {
  search: string;
  folder: string;
  status: "all" | "active" | "expired" | "archived";
  sortBy: "created" | "clicks" | "title" | "lastClick";
  sortOrder: "asc" | "desc";
  tags: string[];
}

export default function LinksPage() {
  const { user } = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();
  const showNewForm = searchParams.get("new") === "true";

  const [filters, setFilters] = useState<LinksPageFilters>({
    search: "",
    folder: "",
    status: "all",
    sortBy: "created",
    sortOrder: "desc",
    tags: [],
  });

  const [folders, setFolders] = useState([]);
  const [availableTags, setAvailableTags] = useState([]);
  const [showCreateDialog, setShowCreateDialog] = useState(showNewForm);
  const [showBulkUpload, setShowBulkUpload] = useState(false);

  useEffect(() => {
    fetchFolders();
    fetchTags();
  }, []);

  const fetchFolders = async () => {
    try {
      const response = await fetch("/api/client/folders");
      if (response.ok) {
        const data = await response.json();
        setFolders(data.data || []);
      }
    } catch (error) {
      console.error("Failed to fetch folders:", error);
    }
  };

  const fetchTags = async () => {
    try {
      const response = await fetch("/api/client/links/tags");
      if (response.ok) {
        const data = await response.json();
        setAvailableTags(data.data || []);
      }
    } catch (error) {
      console.error("Failed to fetch tags:", error);
    }
  };

  const handleUrlCreated = () => {
    setShowCreateDialog(false);
    router.push("/dashboard/links");
  };

  const handleBulkUpload = async (file: File) => {
    if (user?.plan === "free") {
      router.push("/dashboard/billing");
      return;
    }

    const formData = new FormData();
    formData.append("file", file);

    try {
      const response = await fetch("/api/client/links/bulk-upload", {
        method: "POST",
        body: formData,
      });

      if (response.ok) {
        setShowBulkUpload(false);
        // Refresh the links table
        window.location.reload();
      }
    } catch (error) {
      console.error("Bulk upload failed:", error);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">My Links</h1>
          <p className="text-muted-foreground">
            Manage and organize all your shortened links
          </p>
        </div>

        <div className="flex items-center gap-2">
          {user?.plan !== "free" && (
            <>
              <Button variant="outline" onClick={() => setShowBulkUpload(true)}>
                <Upload className="mr-2 h-4 w-4" />
                Bulk Upload
              </Button>

              <Button variant="outline">
                <Download className="mr-2 h-4 w-4" />
                Export
              </Button>
            </>
          )}

          <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="mr-2 h-4 w-4" />
                Create Link
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl">
              <UrlShortener folders={folders} onSuccess={handleUrlCreated} />
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Filters and Search */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Filter className="h-5 w-5" />
            Filters & Search
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-6">
            <div className="md:col-span-2">
              <div className="relative">
                <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search links..."
                  value={filters.search}
                  onChange={(e) =>
                    setFilters({ ...filters, search: e.target.value })
                  }
                  className="pl-9"
                />
              </div>
            </div>

            <div>
              <Select
                value={filters.folder}
                onValueChange={(value) =>
                  setFilters({ ...filters, folder: value })
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="All folders" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">All folders</SelectItem>
                  {folders.map((folder: any) => (
                    <SelectItem key={folder.id} value={folder.id}>
                      <div className="flex items-center gap-2">
                        <div
                          className="w-3 h-3 rounded-full"
                          style={{ backgroundColor: folder.color }}
                        />
                        {folder.name}
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Select
                value={filters.status}
                onValueChange={(value: any) =>
                  setFilters({ ...filters, status: value })
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All links</SelectItem>
                  <SelectItem value="active">Active</SelectItem>
                  <SelectItem value="expired">Expired</SelectItem>
                  <SelectItem value="archived">Archived</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Select
                value={filters.sortBy}
                onValueChange={(value: any) =>
                  setFilters({ ...filters, sortBy: value })
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="created">Created date</SelectItem>
                  <SelectItem value="clicks">Click count</SelectItem>
                  <SelectItem value="title">Title</SelectItem>
                  <SelectItem value="lastClick">Last click</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Button
                variant="outline"
                onClick={() =>
                  setFilters({
                    ...filters,
                    sortOrder: filters.sortOrder === "asc" ? "desc" : "asc",
                  })
                }
                className="w-full"
              >
                {filters.sortOrder === "asc" ? (
                  <>
                    <SortAsc className="mr-2 h-4 w-4" />
                    Ascending
                  </>
                ) : (
                  <>
                    <SortDesc className="mr-2 h-4 w-4" />
                    Descending
                  </>
                )}
              </Button>
            </div>
          </div>

          {/* Tags Filter */}
          {availableTags.length > 0 && (
            <div className="mt-4">
              <div className="flex flex-wrap gap-2">
                {availableTags.map((tag: any) => (
                  <Badge
                    key={tag}
                    variant={filters.tags.includes(tag) ? "default" : "outline"}
                    className="cursor-pointer"
                    onClick={() => {
                      const newTags = filters.tags.includes(tag)
                        ? filters.tags.filter((t) => t !== tag)
                        : [...filters.tags, tag];
                      setFilters({ ...filters, tags: newTags });
                    }}
                  >
                    <Tags className="w-3 h-3 mr-1" />
                    {tag}
                  </Badge>
                ))}
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Links Table */}
      <LinksTable
        filters={filters}
        showFolderFilter={false}
        onFiltersChange={setFilters}
      />

      {/* Bulk Upload Dialog */}
      {showBulkUpload && (
        <Dialog open={showBulkUpload} onOpenChange={setShowBulkUpload}>
          <DialogContent>
            <div className="space-y-4">
              <div>
                <h3 className="text-lg font-semibold">Bulk Upload Links</h3>
                <p className="text-sm text-muted-foreground">
                  Upload a CSV file with your URLs to create multiple links at
                  once.
                </p>
              </div>

              <div className="border-2 border-dashed border-muted-foreground/25 rounded-lg p-6 text-center">
                <Upload className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
                <p className="text-sm text-muted-foreground mb-2">
                  Drop your CSV file here or click to browse
                </p>
                <input
                  type="file"
                  accept=".csv"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) handleBulkUpload(file);
                  }}
                  className="hidden"
                  id="bulk-upload"
                />
                <Button asChild>
                  <label htmlFor="bulk-upload">Choose File</label>
                </Button>
              </div>

              <div className="text-xs text-muted-foreground">
                <p>
                  CSV format: url, title (optional), folder (optional), tags
                  (optional)
                </p>
                <p>
                  Example: https://example.com, "Example Site", "Work",
                  "important,website"
                </p>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}
