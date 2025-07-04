import { Skeleton } from "@/components/ui/skeleton";
import { Card, CardContent, CardHeader } from "@/components/ui/card";

export default function Loading() {
  return (
    <div className="min-h-screen bg-background">
      {/* Header skeleton */}
      <div className="border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="container mx-auto px-4">
          <div className="flex h-16 items-center justify-between">
            {/* Logo skeleton */}
            <Skeleton className="h-8 w-32" />

            {/* Search bar skeleton */}
            <div className="hidden md:flex flex-1 max-w-md mx-8">
              <Skeleton className="h-10 w-full" />
            </div>

            {/* Navigation buttons skeleton */}
            <div className="flex items-center space-x-4">
              <Skeleton className="h-9 w-24 hidden sm:block" />
              <Skeleton className="h-9 w-9 rounded-full" />
            </div>
          </div>
        </div>
      </div>

      {/* Main content skeleton */}
      <main className="container mx-auto px-4 py-6">
        {/* Hero section skeleton */}
        <div className="mb-8">
          <Skeleton className="h-48 w-full rounded-lg mb-4" />
          <div className="text-center space-y-2">
            <Skeleton className="h-8 w-96 mx-auto" />
            <Skeleton className="h-4 w-80 mx-auto" />
          </div>
        </div>

        {/* Categories skeleton */}
        <div className="mb-8">
          <Skeleton className="h-6 w-32 mb-4" />
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
            {Array.from({ length: 6 }).map((_, i) => (
              <Card key={i} className="p-4 hover:shadow-md transition-shadow">
                <CardContent className="p-0 text-center">
                  <Skeleton className="h-12 w-12 rounded-lg mx-auto mb-2" />
                  <Skeleton className="h-4 w-16 mx-auto" />
                </CardContent>
              </Card>
            ))}
          </div>
        </div>

        {/* Featured listings skeleton */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-4">
            <Skeleton className="h-6 w-40" />
            <Skeleton className="h-4 w-16" />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {Array.from({ length: 8 }).map((_, i) => (
              <Card
                key={i}
                className="overflow-hidden group hover:shadow-lg transition-shadow"
              >
                <CardHeader className="p-0">
                  <Skeleton className="aspect-[4/3] w-full" />
                </CardHeader>
                <CardContent className="p-4">
                  <div className="space-y-2">
                    <Skeleton className="h-5 w-full" />
                    <Skeleton className="h-6 w-24" />
                    <div className="flex items-center justify-between">
                      <Skeleton className="h-4 w-20" />
                      <Skeleton className="h-4 w-16" />
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>

        {/* Statistics skeleton */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          {Array.from({ length: 3 }).map((_, i) => (
            <Card key={i} className="text-center p-6">
              <CardContent className="space-y-2">
                <Skeleton className="h-8 w-16 mx-auto" />
                <Skeleton className="h-4 w-24 mx-auto" />
              </CardContent>
            </Card>
          ))}
        </div>
      </main>

      {/* Footer skeleton */}
      <footer className="border-t bg-muted/50 mt-12">
        <div className="container mx-auto px-4 py-8">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="space-y-4">
                <Skeleton className="h-5 w-24" />
                <div className="space-y-2">
                  <Skeleton className="h-4 w-20" />
                  <Skeleton className="h-4 w-16" />
                  <Skeleton className="h-4 w-18" />
                  <Skeleton className="h-4 w-14" />
                </div>
              </div>
            ))}
          </div>

          <div className="border-t mt-8 pt-8 flex flex-col md:flex-row justify-between items-center">
            <Skeleton className="h-4 w-48" />
            <div className="flex space-x-4 mt-4 md:mt-0">
              <Skeleton className="h-8 w-8 rounded" />
              <Skeleton className="h-8 w-8 rounded" />
              <Skeleton className="h-8 w-8 rounded" />
            </div>
          </div>
        </div>
      </footer>

      {/* Loading indicator with animation */}
      <div className="fixed top-4 right-4 z-50">
        <div className="bg-primary text-primary-foreground px-3 py-2 rounded-md shadow-lg flex items-center space-x-2">
          <div className="animate-spin h-4 w-4 border-2 border-current border-t-transparent rounded-full"></div>
          <span className="text-sm font-medium">Loading...</span>
        </div>
      </div>
    </div>
  );
}
