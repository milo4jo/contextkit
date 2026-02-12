import { auth } from '@clerk/nextjs/server';
import { redirect } from 'next/navigation';
import Link from 'next/link';
import { Plus, Folder, Clock, Hash } from 'lucide-react';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { getProjects } from '@/lib/api';

export default async function ProjectsPage() {
  const { userId, getToken } = await auth();

  if (!userId) {
    redirect('/sign-in');
  }

  const token = await getToken();
  let projects: Awaited<ReturnType<typeof getProjects>>['projects'] = [];

  if (token) {
    try {
      const response = await getProjects(token);
      projects = response.projects;
    } catch (error) {
      console.error('Failed to fetch projects:', error);
    }
  }

  return (
    <div className="container mx-auto py-6 px-4 sm:py-10 sm:px-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6 sm:mb-8">
        <div>
          <h1 className="text-3xl font-bold">Projects</h1>
          <p className="text-muted-foreground mt-2">Manage your indexed codebases</p>
        </div>
        <Link href="/dashboard/projects/new">
          <Button>
            <Plus className="mr-2 h-4 w-4" />
            New Project
          </Button>
        </Link>
      </div>

      {projects.length === 0 ? (
        <Card className="text-center py-12">
          <CardContent>
            <Folder className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
            <h3 className="text-lg font-semibold mb-2">No projects yet</h3>
            <p className="text-muted-foreground mb-4">
              Create your first project to start indexing code
            </p>
            <Link href="/dashboard/projects/new">
              <Button>
                <Plus className="mr-2 h-4 w-4" />
                Create Project
              </Button>
            </Link>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-3 sm:gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {projects.map((project) => (
            <Link key={project.id} href={`/dashboard/projects/${project.slug}`}>
              <Card className="hover:border-primary transition-colors cursor-pointer">
                <CardHeader>
                  <CardTitle className="flex items-center">
                    <Folder className="mr-2 h-5 w-5" />
                    {project.name}
                  </CardTitle>
                  <CardDescription>{project.description || 'No description'}</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center gap-4 text-sm text-muted-foreground">
                    <span className="flex items-center">
                      <Hash className="mr-1 h-3 w-3" />
                      {project.indexStatus.files} files
                    </span>
                    <span className="flex items-center">
                      <Clock className="mr-1 h-3 w-3" />
                      {project.indexStatus.lastIndexed
                        ? new Date(project.indexStatus.lastIndexed).toLocaleDateString()
                        : 'Not indexed'}
                    </span>
                  </div>
                  <div className="mt-2">
                    <div className="text-xs text-muted-foreground">
                      {project.indexStatus.chunks} chunks indexed
                    </div>
                  </div>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
