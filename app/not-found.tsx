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
