import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";

// Mock data
// TODO: Fetch from API when database is connected
const mockUsage = {
  queries: { used: 0, limit: 1000 },
  storage: { used: 0, limit: 100 * 1024 * 1024 }, // bytes
  tokens: { used: 0 },
  plan: "free" as const,
};

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  if (bytes < 1024 * 1024 * 1024) return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
  return `${(bytes / 1024 / 1024 / 1024).toFixed(1)} GB`;
}

function formatNumber(num: number): string {
  if (num < 1000) return num.toString();
  if (num < 1_000_000) return `${(num / 1000).toFixed(1)}K`;
  return `${(num / 1_000_000).toFixed(1)}M`;
}

export default async function UsagePage() {
  const { userId } = await auth();

  if (!userId) {
    redirect("/sign-in");
  }

  // TODO: Fetch usage from API
  const usage = mockUsage;
  const queryPercent = (usage.queries.used / usage.queries.limit) * 100;
  const storagePercent = (usage.storage.used / usage.storage.limit) * 100;

  // Get current month
  const now = new Date();
  const monthName = now.toLocaleString("default", { month: "long", year: "numeric" });

  return (
    <div className="container mx-auto py-6 px-4 sm:py-10 sm:px-6">
      <div className="mb-6 sm:mb-8">
        <h1 className="text-2xl sm:text-3xl font-bold">Usage</h1>
        <p className="text-muted-foreground mt-2 text-sm sm:text-base">
          Monitor your API usage for {monthName}
        </p>
      </div>

      <div className="grid gap-4 sm:gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {/* Queries */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Queries</CardTitle>
            <CardDescription>Context selections this month</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-2xl sm:text-3xl font-bold">
              {formatNumber(usage.queries.used)}
              <span className="text-base sm:text-lg font-normal text-muted-foreground">
                {" "}/ {formatNumber(usage.queries.limit)}
              </span>
            </div>
            <Progress value={queryPercent} className="mt-3 sm:mt-4" />
            <p className="text-xs sm:text-sm text-muted-foreground mt-2">
              {(100 - queryPercent).toFixed(0)}% remaining
            </p>
          </CardContent>
        </Card>

        {/* Storage */}
        <Card>
          <CardHeader className="pb-2 sm:pb-4">
            <CardTitle className="text-base sm:text-lg">Storage</CardTitle>
            <CardDescription className="text-xs sm:text-sm">Indexed codebase size</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-2xl sm:text-3xl font-bold">
              {formatBytes(usage.storage.used)}
              <span className="text-base sm:text-lg font-normal text-muted-foreground">
                {" "}/ {formatBytes(usage.storage.limit)}
              </span>
            </div>
            <Progress value={storagePercent} className="mt-3 sm:mt-4" />
            <p className="text-xs sm:text-sm text-muted-foreground mt-2">
              {formatBytes(usage.storage.limit - usage.storage.used)} remaining
            </p>
          </CardContent>
        </Card>

        {/* Tokens */}
        <Card>
          <CardHeader className="pb-2 sm:pb-4">
            <CardTitle className="text-base sm:text-lg">Tokens Processed</CardTitle>
            <CardDescription className="text-xs sm:text-sm">Total tokens in context results</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-2xl sm:text-3xl font-bold">
              {formatNumber(usage.tokens.used)}
            </div>
            <p className="text-xs sm:text-sm text-muted-foreground mt-3 sm:mt-4">
              Estimated savings vs. full codebase: ~{formatNumber(usage.tokens.used * 10)}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Plan info */}
      <Card className="mt-8">
        <CardHeader>
          <CardTitle>Current Plan: {usage.plan.charAt(0).toUpperCase() + usage.plan.slice(1)}</CardTitle>
          <CardDescription>
            {usage.plan === "free" && "Upgrade to Pro for more queries and storage"}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 sm:grid-cols-3">
            <div>
              <p className="text-sm font-medium">Queries/month</p>
              <p className="text-2xl font-bold">{formatNumber(usage.queries.limit)}</p>
            </div>
            <div>
              <p className="text-sm font-medium">Storage</p>
              <p className="text-2xl font-bold">{formatBytes(usage.storage.limit)}</p>
            </div>
            <div>
              <p className="text-sm font-medium">Rate Limit</p>
              <p className="text-2xl font-bold">20/min</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
