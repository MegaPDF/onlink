import Link from "next/link";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Ban, Home } from "lucide-react";

export default function LinkDisabledPage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="mx-auto w-12 h-12 rounded-full bg-orange-100 dark:bg-orange-900 flex items-center justify-center mb-4">
            <Ban className="w-6 h-6 text-orange-600" />
          </div>
          <CardTitle>Link Disabled</CardTitle>
          <CardDescription>
            This link has been disabled by the owner or administrator.
          </CardDescription>
        </CardHeader>
        <CardContent className="text-center">
          <Button asChild>
            <Link href="/">
              <Home className="mr-2 h-4 w-4" />
              Go Home
            </Link>
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
