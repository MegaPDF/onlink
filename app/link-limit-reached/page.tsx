import Link from "next/link";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Users, Home } from "lucide-react";

export default function LinkLimitReachedPage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="mx-auto w-12 h-12 rounded-full bg-blue-100 dark:bg-blue-900 flex items-center justify-center mb-4">
            <Users className="w-6 h-6 text-blue-600" />
          </div>
          <CardTitle>Click Limit Reached</CardTitle>
          <CardDescription>
            This link has reached its maximum number of clicks and is no longer
            accessible.
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
