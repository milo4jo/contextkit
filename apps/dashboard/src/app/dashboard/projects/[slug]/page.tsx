import { auth } from '@clerk/nextjs/server';
import { redirect, notFound } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, Folder, RefreshCw, Settings, Trash2, Play } from 'lucide-react';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { getProject } from '@/lib/api';

interface ProjectPageProps {
  params: Promise<{ slug: string }>;
}

export default async function ProjectPage({ params }: ProjectPageProps) {
  const { userId, getToken } = await auth();
  const { slug } = await params;

  if (!userId) {
    redirect('/sign-in');
  }

  const token = await getToken();
  if (!token) {
    redirect('/sign-in');
  }

  let project;
  try {
    const response = await getProject(token, slug);
    project = response.project;
  } catch (error) {
    console.error('Failed to fetch project:', error);
    notFound();
  }

  if (!project) {
    notFound();
  }

  const statusColors: Record<string, string> = {
    indexed: 'bg-green-500',
    indexing: 'bg-yellow-500',
    failed: 'bg-red-500',
    pending: 'bg-gray-500',
  };

  const indexStatus = project.indexStatus || {
    files: 0,
    chunks: 0,
    tokens: 0,
    lastIndexed: null,
    status: 'pending',
  };

  return (
    <div className="container mx-auto py-6 px-4 sm:py-10 sm:px-6">
      {/* Header */}
      <div className="mb-6 sm:mb-8">
        <Link
          href="/dashboard/projects"
          className="inline-flex items-center text-sm text-muted-foreground hover:text-foreground mb-4"
        >
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back to Projects
        </Link>
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="flex items-center gap-3">
            <Folder className="h-8 w-8 text-primary" />
            <div>
              <h1 className="text-2xl sm:text-3xl font-bold">{project.name}</h1>
              <p className="text-muted-foreground">{project.description || 'No description'}</p>
            </div>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" size="sm">
              <RefreshCw className="mr-2 h-4 w-4" />
              <span className="hidden sm:inline">Re-index</span>
              <span className="sm:hidden">Reindex</span>
            </Button>
            <Button variant="outline" size="sm">
              <Settings className="mr-2 h-4 w-4" />
              <span className="hidden sm:inline">Settings</span>
            </Button>
          </div>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid gap-4 grid-cols-2 lg:grid-cols-4 mb-6 sm:mb-8">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Status</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              <div
                className={`h-2 w-2 rounded-full ${statusColors[indexStatus.status] || 'bg-gray-500'}`}
              />
              <span className="font-semibold capitalize">{indexStatus.status}</span>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Files</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{indexStatus.files}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Chunks</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{indexStatus.chunks.toLocaleString()}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Last Indexed
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-sm font-medium">
              {indexStatus.lastIndexed
                ? new Date(indexStatus.lastIndexed).toLocaleDateString()
                : 'Not indexed'}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Details */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* Project Info */}
        <Card>
          <CardHeader>
            <CardTitle>Project Details</CardTitle>
            <CardDescription>Repository and indexing information</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <label className="text-sm font-medium text-muted-foreground">Slug</label>
              <p className="text-sm mt-1 font-mono">{project.slug}</p>
            </div>
            <div>
              <label className="text-sm font-medium text-muted-foreground">Created</label>
              <p className="text-sm mt-1">{new Date(project.createdAt).toLocaleDateString()}</p>
            </div>
            <div>
              <label className="text-sm font-medium text-muted-foreground">Updated</label>
              <p className="text-sm mt-1">{new Date(project.updatedAt).toLocaleDateString()}</p>
            </div>
          </CardContent>
        </Card>

        {/* Quick Start */}
        <Card>
          <CardHeader>
            <CardTitle>Quick Start</CardTitle>
            <CardDescription>Index your codebase</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm text-muted-foreground">Use the CLI to index your code:</p>
            <pre className="bg-muted p-3 rounded-lg text-sm overflow-x-auto">
              <code>contextkit index --project {project.slug}</code>
            </pre>
            <p className="text-sm text-muted-foreground">Then query for relevant context:</p>
            <pre className="bg-muted p-3 rounded-lg text-sm overflow-x-auto">
              <code>contextkit select &quot;How does auth work?&quot;</code>
            </pre>
          </CardContent>
        </Card>
      </div>

      {/* Query Playground */}
      <Card className="mt-6">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Play className="h-5 w-5" />
            Query Playground
          </CardTitle>
          <CardDescription>Test context selection for this project</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="bg-muted/50 rounded-lg p-6 sm:p-8 text-center">
            <p className="text-muted-foreground mb-4">
              Query playground coming soon. Use the CLI for now:
            </p>
            <code className="bg-background px-3 py-2 rounded text-sm block overflow-x-auto">
              contextkit select &quot;your query&quot; --project {project.slug}
            </code>
          </div>
        </CardContent>
      </Card>

      {/* Danger Zone */}
      <Card className="mt-6 border-destructive/50">
        <CardHeader>
          <CardTitle className="text-destructive">Danger Zone</CardTitle>
          <CardDescription>Irreversible actions</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <p className="font-medium">Delete Project</p>
              <p className="text-sm text-muted-foreground">
                Permanently delete this project and all indexed data
              </p>
            </div>
            <Button variant="destructive" size="sm">
              <Trash2 className="mr-2 h-4 w-4" />
              Delete
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
