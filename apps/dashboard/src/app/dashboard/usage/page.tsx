import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import Link from "next/link";
import { BarChart3, Database, Zap, Calendar } from "lucide-react";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { getUsage } from "@/lib/api";

function formatBytes(bytes: number): string {
  if (bytes === 0) return "0 B";
  const k = 1024;
  const sizes = ["B", "KB", "MB", "GB", "TB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
}

function formatNumber(n: number): string {
  if (n >= 1000000) return (n / 1000000).toFixed(1) + "M";
  if (n >= 1000) return (n / 1000).toFixed(1) + "K";
  return n.toString();
}

export default async function UsagePage() {
  const { userId, getToken } = await auth();

  if (!userId) {
    redirect("/sign-in");
  }

  const token = await getToken();
  
  let usage = {
    queries: { used: 0, limit: 1000 },
    storage: { used: 0, limit: 100 * 1024 * 1024 },
    tokens: { used: 0 },
  };
  let plan = "free";

  if (token) {
    try {
      const response = await getUsage(token);
      usage = response.usage;
      plan = response.plan;
    } catch (error) {
      console.error("Failed to fetch usage:", error);
    }
  }

  const queryPercent = usage.queries.limit > 0 
    ? (usage.queries.used / usage.queries.limit) * 100 
    : 0;
  const storagePercent = usage.storage.limit > 0 
    ? (usage.storage.used / usage.storage.limit) * 100 
    : 0;

  const now = new Date();
  const monthName = now.toLocaleDateString("en-US", { month: "long", year: "numeric" });

  return (
    <div className="container mx-auto py-6 px-4 sm:py-10 sm:px-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6 sm:mb-8">
        <div>
          <h1 className="text-3xl font-bold">Usage</h1>
          <p className="text-muted-foreground mt-2">
            Monitor your ContextKit usage for {monthName}
          </p>
        </div>
        <Link href="/dashboard/billing">
          <Button variant="outline">Manage Billing</Button>
        </Link>
      </div>

      {/* Current Plan */}
      <Card className="mb-6">
        <CardHeader className="flex flex-row items-center justify-between pb-2">
          <div>
            <CardTitle className="text-lg">Current Plan</CardTitle>
            <CardDescription>Your subscription details</CardDescription>
          </div>
          <div className="text-right">
            <div className="text-2xl font-bold capitalize">{plan}</div>
            {plan === "free" && (
              <Link href="/dashboard/billing">
                <Button size="sm" className="mt-2">Upgrade</Button>
              </Link>
            )}
          </div>
        </CardHeader>
      </Card>

      {/* Usage Stats */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 mb-8">
        {/* Queries */}
        <Card>
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm font-medium">Queries</CardTitle>
              <BarChart3 className="h-4 w-4 text-muted-foreground" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {formatNumber(usage.queries.used)}
            </div>
            <p className="text-xs text-muted-foreground mb-3">
              of {usage.queries.limit === -1 ? "unlimited" : formatNumber(usage.queries.limit)} this month
            </p>
            {usage.queries.limit > 0 && (
              <div className="h-2 bg-muted rounded-full overflow-hidden">
                <div
                  className={`h-full transition-all ${
                    queryPercent > 90 ? "bg-red-500" : queryPercent > 70 ? "bg-yellow-500" : "bg-green-500"
                  }`}
                  style={{ width: `${Math.min(queryPercent, 100)}%` }}
                />
              </div>
            )}
          </CardContent>
        </Card>

        {/* Storage */}
        <Card>
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm font-medium">Storage</CardTitle>
              <Database className="h-4 w-4 text-muted-foreground" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {formatBytes(usage.storage.used)}
            </div>
            <p className="text-xs text-muted-foreground mb-3">
              of {usage.storage.limit === -1 ? "unlimited" : formatBytes(usage.storage.limit)}
            </p>
            {usage.storage.limit > 0 && (
              <div className="h-2 bg-muted rounded-full overflow-hidden">
                <div
                  className={`h-full transition-all ${
                    storagePercent > 90 ? "bg-red-500" : storagePercent > 70 ? "bg-yellow-500" : "bg-green-500"
                  }`}
                  style={{ width: `${Math.min(storagePercent, 100)}%` }}
                />
              </div>
            )}
          </CardContent>
        </Card>

        {/* Tokens */}
        <Card>
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm font-medium">Tokens Processed</CardTitle>
              <Zap className="h-4 w-4 text-muted-foreground" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {formatNumber(usage.tokens.used)}
            </div>
            <p className="text-xs text-muted-foreground">
              Total tokens processed this month
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Billing Period */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Calendar className="h-5 w-5 text-muted-foreground" />
            <CardTitle>Billing Period</CardTitle>
          </div>
          <CardDescription>
            Usage resets on the 1st of each month
          </CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            Current period: {monthName}
          </p>
          <p className="text-sm text-muted-foreground mt-1">
            Next reset: {new Date(now.getFullYear(), now.getMonth() + 1, 1).toLocaleDateString()}
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
