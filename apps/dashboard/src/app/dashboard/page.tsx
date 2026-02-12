import { auth, currentUser } from '@clerk/nextjs/server';
import { redirect } from 'next/navigation';
import Link from 'next/link';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { getProjects, getApiKeys, getUsage } from '@/lib/api';

export default async function DashboardPage() {
  const { userId, getToken } = await auth();
  const user = await currentUser();

  if (!userId) {
    redirect('/sign-in');
  }

  // Get Clerk session token for API auth
  const token = await getToken();

  // Fetch data from API
  let projectCount = 0;
  let queryCount = 0;
  let queryLimit = 1000;
  let apiKeyCount = 0;
  let plan = 'free';

  if (token) {
    try {
      const [projectsRes, usageRes, keysRes] = await Promise.all([
        getProjects(token).catch(() => ({ projects: [] })),
        getUsage(token).catch(() => ({
          usage: { queries: { used: 0, limit: 1000 } },
          plan: 'free',
        })),
        getApiKeys(token).catch(() => ({ apiKeys: [] })),
      ]);

      projectCount = projectsRes.projects.length;
      queryCount = usageRes.usage.queries.used;
      queryLimit = usageRes.usage.queries.limit;
      plan = usageRes.plan;
      apiKeyCount = keysRes.apiKeys.length;
    } catch (error) {
      console.error('Failed to fetch dashboard data:', error);
    }
  }

  return (
    <div className="container mx-auto py-6 px-4 sm:py-10 sm:px-6">
      <div className="mb-6 sm:mb-8">
        <h1 className="text-2xl sm:text-3xl font-bold">
          Welcome back, {user?.firstName || 'Developer'}!
        </h1>
        <p className="text-muted-foreground mt-2 text-sm sm:text-base">
          Manage your projects and monitor your usage.
        </p>
      </div>

      {/* Quick Stats */}
      <div className="grid gap-3 sm:gap-4 grid-cols-2 lg:grid-cols-4 mb-6 sm:mb-8">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Projects</CardTitle>
            <svg
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth="2"
              className="h-4 w-4 text-muted-foreground"
            >
              <path d="M12 2v20M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" />
            </svg>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{projectCount}</div>
            <p className="text-xs text-muted-foreground">
              {projectCount === 0
                ? 'Create your first project'
                : `${projectCount} project${projectCount === 1 ? '' : 's'}`}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Queries This Month</CardTitle>
            <svg
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth="2"
              className="h-4 w-4 text-muted-foreground"
            >
              <path d="M22 12h-4l-3 9L9 3l-3 9H2" />
            </svg>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{queryCount.toLocaleString()}</div>
            <p className="text-xs text-muted-foreground">
              {queryCount.toLocaleString()} /{' '}
              {queryLimit === -1 ? '∞' : queryLimit.toLocaleString()} on {plan} plan
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">API Keys</CardTitle>
            <svg
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth="2"
              className="h-4 w-4 text-muted-foreground"
            >
              <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
              <circle cx="9" cy="7" r="4" />
              <path d="M22 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75" />
            </svg>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{apiKeyCount}</div>
            <p className="text-xs text-muted-foreground">
              {apiKeyCount === 0
                ? 'Generate your first key'
                : `${apiKeyCount} active key${apiKeyCount === 1 ? '' : 's'}`}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Current Plan</CardTitle>
            <svg
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth="2"
              className="h-4 w-4 text-muted-foreground"
            >
              <rect width="20" height="14" x="2" y="5" rx="2" />
              <path d="M2 10h20" />
            </svg>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold capitalize">{plan}</div>
            <p className="text-xs text-muted-foreground">
              {plan === 'free' ? (
                <Link href="/dashboard/billing" className="text-primary hover:underline">
                  Upgrade to Pro
                </Link>
              ) : (
                <Link href="/dashboard/billing" className="text-primary hover:underline">
                  Manage subscription
                </Link>
              )}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Quick Actions */}
      <div className="grid gap-3 sm:gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <Card>
          <CardHeader>
            <CardTitle>Create Project</CardTitle>
            <CardDescription>Index a codebase and start querying</CardDescription>
          </CardHeader>
          <CardContent>
            <Link href="/dashboard/projects/new">
              <Button>New Project</Button>
            </Link>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Generate API Key</CardTitle>
            <CardDescription>Create a key to use the Context API</CardDescription>
          </CardHeader>
          <CardContent>
            <Link href="/dashboard/api-keys">
              <Button variant="outline">Manage Keys</Button>
            </Link>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Read the Docs</CardTitle>
            <CardDescription>Learn how to integrate ContextKit</CardDescription>
          </CardHeader>
          <CardContent>
            <a
              href="https://github.com/milo4jo/contextkit#readme"
              target="_blank"
              rel="noopener noreferrer"
            >
              <Button variant="outline">Documentation</Button>
            </a>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
