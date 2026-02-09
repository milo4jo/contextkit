import { auth } from "@clerk/nextjs";
import { redirect } from "next/navigation";
import { UserButton } from "@clerk/nextjs";
import Link from "next/link";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { userId } = auth();

  if (!userId) {
    redirect("/sign-in");
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Navigation */}
      <nav className="border-b">
        <div className="container mx-auto flex h-16 items-center px-4">
          <Link href="/dashboard" className="flex items-center space-x-2">
            <span className="text-xl font-bold">🎯 ContextKit</span>
          </Link>
          
          <div className="ml-8 flex items-center space-x-4">
            <Link 
              href="/dashboard" 
              className="text-sm font-medium transition-colors hover:text-primary"
            >
              Dashboard
            </Link>
            <Link 
              href="/dashboard/projects" 
              className="text-sm font-medium text-muted-foreground transition-colors hover:text-primary"
            >
              Projects
            </Link>
            <Link 
              href="/dashboard/api-keys" 
              className="text-sm font-medium text-muted-foreground transition-colors hover:text-primary"
            >
              API Keys
            </Link>
            <Link 
              href="/dashboard/usage" 
              className="text-sm font-medium text-muted-foreground transition-colors hover:text-primary"
            >
              Usage
            </Link>
            <Link 
              href="/dashboard/billing" 
              className="text-sm font-medium text-muted-foreground transition-colors hover:text-primary"
            >
              Billing
            </Link>
          </div>

          <div className="ml-auto flex items-center space-x-4">
            <a 
              href="https://docs.contextkit.dev" 
              target="_blank"
              rel="noopener noreferrer"
              className="text-sm font-medium text-muted-foreground transition-colors hover:text-primary"
            >
              Docs
            </a>
            <UserButton afterSignOutUrl="/" />
          </div>
        </div>
      </nav>

      {/* Main Content */}
      <main>{children}</main>
    </div>
  );
}
