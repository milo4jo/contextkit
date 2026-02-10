import { auth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";

// TODO: Replace with actual database queries
// For now, we use mock data

interface Project {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  index_status: { files: number; chunks: number; last_indexed: string | null };
  created_at: string;
  updated_at: string;
}

const mockProjects = new Map<string, Project>([
  [
    "proj_1",
    {
      id: "proj_1",
      name: "Frontend App",
      slug: "frontend-app",
      description: "React frontend application",
      index_status: { files: 127, chunks: 892, last_indexed: "2026-02-09T10:30:00Z" },
      created_at: "2026-01-15T08:00:00Z",
      updated_at: "2026-02-09T10:30:00Z",
    },
  ],
]);

export async function GET() {
  const { userId } = await auth();

  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // TODO: Fetch projects from database filtered by user's org
  const projects = Array.from(mockProjects.values());

  return NextResponse.json({
    projects,
    total: projects.length,
    limit: 20,
    offset: 0,
  });
}

export async function POST(req: Request) {
  const { userId } = await auth();

  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json();
  const { name, description, slug } = body;

  if (!name) {
    return NextResponse.json({ error: "Name is required" }, { status: 400 });
  }

  // TODO: Create project in database
  const newProject = {
    id: `proj_${Date.now()}`,
    name,
    slug: slug || name.toLowerCase().replace(/[^a-z0-9]+/g, "-"),
    description: description || null,
    index_status: { files: 0, chunks: 0, last_indexed: null },
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };

  mockProjects.set(newProject.id, newProject);

  return NextResponse.json(newProject, { status: 201 });
}
