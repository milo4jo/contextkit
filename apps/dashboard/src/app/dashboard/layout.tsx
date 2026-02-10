import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import { UserButton } from "@clerk/nextjs";
import Link from "next/link";
import { MobileNav } from "@/components/mobile-nav";

const navItems = [
  { href: "/dashboard", label: "Dashboard" },
  { href: "/dashboard/projects", label: "Projects" },
  { href: "/dashboard/api-keys", label: "API Keys" },
  { href: "/dashboard/usage", label: "Usage" },
  { href: "/dashboard/billing", label: "Billing" },
];

export default async function DashboardLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const { userId } = await auth();

  if (!userId) {
    redirect("/sign-in");
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Navigation */}
      <nav className="border-b sticky top-0 bg-background z-50">
        <div className="container mx-auto flex h-14 sm:h-16 items-center px-4">
          {/* Logo */}
          <Link href="/dashboard" className="flex items-center space-x-2">
            <span className="text-lg sm:text-xl font-bold">🎯 ContextKit</span>
          </Link>
          
          {/* Desktop Navigation */}
          <div className="hidden md:flex ml-8 items-center space-x-4 lg:space-x-6">
            {navItems.map((item) => (
              <Link 
                key={item.href}
                href={item.href} 
                className="text-sm font-medium text-muted-foreground transition-colors hover:text-primary"
              >
                {item.label}
              </Link>
            ))}
          </div>

          {/* Right Side */}
          <div className="ml-auto flex items-center space-x-2 sm:space-x-4">
            <a 
              href="https://docs.contextkit.dev" 
              target="_blank"
              rel="noopener noreferrer"
              className="hidden sm:block text-sm font-medium text-muted-foreground transition-colors hover:text-primary"
            >
              Docs
            </a>
            <UserButton afterSignOutUrl="/" />
            
            {/* Mobile Menu */}
            <MobileNav items={navItems} />
          </div>
        </div>
      </nav>

      {/* Main Content */}
      <main className="pb-8">{children}</main>
    </div>
  );
}
