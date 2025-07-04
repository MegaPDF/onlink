"use client";
import Link from "next/link";
import { ArrowLeft, Home, Search, Plus, HelpCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";

export default function NotFound() {
  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <div className="max-w-2xl w-full text-center space-y-8">
        {/* 404 Visual */}
        <div className="relative">
          <div className="text-9xl font-bold text-muted-foreground/20 select-none">
            404
          </div>
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="bg-primary/10 rounded-full p-8">
              <Search className="h-16 w-16 text-primary" />
            </div>
          </div>
        </div>

        {/* Title and Description */}
        <div className="space-y-4">
          <h1 className="text-4xl font-bold tracking-tight">Page Not Found</h1>
          <p className="text-xl text-muted-foreground max-w-lg mx-auto">
            Sorry, we couldn't find the page you're looking for. It might have
            been moved, deleted, or the URL might be incorrect.
          </p>
        </div>

        {/* Quick Search */}
        <Card className="max-w-md mx-auto">
          <CardHeader className="pb-3">
            <CardTitle className="text-lg flex items-center justify-center gap-2">
              <Search className="h-5 w-5" />
              Quick Search
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex gap-2">
              <Input
                placeholder="Search for products, categories..."
                className="flex-1"
                id="quick-search"
              />
              <Button type="submit" size="icon">
                <Search className="h-4 w-4" />
                <span className="sr-only">Search</span>
              </Button>
            </div>
            <p className="text-sm text-muted-foreground">
              Try searching for what you were looking for
            </p>
          </CardContent>
        </Card>

        {/* Navigation Options */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 max-w-4xl mx-auto">
          <Button
            asChild
            variant="outline"
            className="h-auto p-4 flex-col gap-2"
          >
            <Link href="/">
              <Home className="h-6 w-6" />
              <span className="font-medium">Home</span>
              <span className="text-xs text-muted-foreground">
                Back to homepage
              </span>
            </Link>
          </Button>

          <Button
            asChild
            variant="outline"
            className="h-auto p-4 flex-col gap-2"
          >
            <Link href="/search">
              <Search className="h-6 w-6" />
              <span className="font-medium">Browse</span>
              <span className="text-xs text-muted-foreground">
                All categories
              </span>
            </Link>
          </Button>

          <Button
            asChild
            variant="outline"
            className="h-auto p-4 flex-col gap-2"
          >
            <Link href="/post">
              <Plus className="h-6 w-6" />
              <span className="font-medium">Sell</span>
              <span className="text-xs text-muted-foreground">Post an ad</span>
            </Link>
          </Button>

          <Button
            asChild
            variant="outline"
            className="h-auto p-4 flex-col gap-2"
          >
            <Link href="/help">
              <HelpCircle className="h-6 w-6" />
              <span className="font-medium">Help</span>
              <span className="text-xs text-muted-foreground">Get support</span>
            </Link>
          </Button>
        </div>

        {/* Popular Categories */}
        <Card className="max-w-lg mx-auto">
          <CardHeader className="pb-3">
            <CardTitle className="text-lg">Popular Categories</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-2">
              <Button
                asChild
                variant="ghost"
                size="sm"
                className="justify-start"
              >
                <Link href="/search?category=electronics">Electronics</Link>
              </Button>
              <Button
                asChild
                variant="ghost"
                size="sm"
                className="justify-start"
              >
                <Link href="/search?category=vehicles">Vehicles</Link>
              </Button>
              <Button
                asChild
                variant="ghost"
                size="sm"
                className="justify-start"
              >
                <Link href="/search?category=home-garden">Home & Garden</Link>
              </Button>
              <Button
                asChild
                variant="ghost"
                size="sm"
                className="justify-start"
              >
                <Link href="/search?category=fashion-beauty">Fashion</Link>
              </Button>
              <Button
                asChild
                variant="ghost"
                size="sm"
                className="justify-start"
              >
                <Link href="/search?category=sports-hobbies">Sports</Link>
              </Button>
              <Button
                asChild
                variant="ghost"
                size="sm"
                className="justify-start"
              >
                <Link href="/search?category=jobs">Jobs</Link>
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Back Button */}
        <div className="pt-4">
          <Button
            onClick={() => window.history.back()}
            variant="ghost"
            className="gap-2"
          >
            <ArrowLeft className="h-4 w-4" />
            Go Back
          </Button>
        </div>

        {/* Additional Help */}
        <div className="text-sm text-muted-foreground space-y-2">
          <p>Still can't find what you're looking for?</p>
          <div className="flex justify-center gap-4">
            <Link
              href="/contact"
              className="underline underline-offset-4 hover:text-foreground transition-colors"
            >
              Contact Us
            </Link>
            <Link
              href="/help"
              className="underline underline-offset-4 hover:text-foreground transition-colors"
            >
              Help Center
            </Link>
            <Link
              href="/sitemap"
              className="underline underline-offset-4 hover:text-foreground transition-colors"
            >
              Sitemap
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
