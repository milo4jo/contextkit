"use client";

import { useState } from "react";
import Link from "next/link";
import { Menu, X, ExternalLink } from "lucide-react";
import { SignedIn, SignedOut, SignInButton, UserButton } from "@clerk/nextjs";

const navLinks = [
  { href: "/docs", label: "Docs" },
  { href: "/pricing", label: "Pricing" },
  { href: "https://github.com/milo4jo/contextkit", label: "GitHub", external: true },
];

export function MarketingNav() {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <nav className="fixed top-0 left-0 right-0 z-50 bg-black/80 backdrop-blur-sm border-b border-neutral-900">
      <div className="max-w-5xl mx-auto px-4 sm:px-6 h-14 flex items-center justify-between">
        <Link href="/" className="font-semibold text-lg flex items-center gap-2 text-white">
          <span className="text-xl">🎯</span>
          <span className="hidden xs:inline">ContextKit</span>
        </Link>
        
        {/* Desktop Navigation */}
        <div className="hidden md:flex items-center gap-6 text-sm">
          {navLinks.map((link) => (
            link.external ? (
              <a
                key={link.href}
                href={link.href}
                target="_blank"
                rel="noopener noreferrer"
                className="text-neutral-400 hover:text-white transition-colors flex items-center gap-1"
              >
                {link.label}
                <ExternalLink className="w-3 h-3" />
              </a>
            ) : (
              <Link
                key={link.href}
                href={link.href}
                className="text-neutral-400 hover:text-white transition-colors"
              >
                {link.label}
              </Link>
            )
          ))}
          <SignedIn>
            <Link
              href="/dashboard"
              className="text-neutral-400 hover:text-white transition-colors"
            >
              Dashboard
            </Link>
            <UserButton afterSignOutUrl="/" />
          </SignedIn>
          <SignedOut>
            <SignInButton mode="modal">
              <button className="px-3 py-1.5 bg-white text-black text-sm rounded-md font-medium hover:bg-neutral-200 transition-colors">
                Sign In
              </button>
            </SignInButton>
          </SignedOut>
        </div>
        
        {/* Mobile Navigation */}
        <div className="flex md:hidden items-center gap-3">
          <SignedIn>
            <UserButton afterSignOutUrl="/" />
          </SignedIn>
          <SignedOut>
            <SignInButton mode="modal">
              <button className="px-3 py-1.5 bg-white text-black text-sm rounded-md font-medium hover:bg-neutral-200 transition-colors">
                Sign In
              </button>
            </SignInButton>
          </SignedOut>
          <button
            onClick={() => setIsOpen(!isOpen)}
            className="p-2 text-neutral-400 hover:text-white"
            aria-label="Toggle menu"
          >
            {isOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
        </div>
      </div>

      {/* Mobile Menu */}
      {isOpen && (
        <div className="md:hidden border-t border-neutral-800 bg-black/95 backdrop-blur-sm">
          <div className="px-4 py-4 space-y-3">
            {navLinks.map((link) => (
              link.external ? (
                <a
                  key={link.href}
                  href={link.href}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="block text-neutral-400 hover:text-white transition-colors py-2"
                  onClick={() => setIsOpen(false)}
                >
                  {link.label}
                </a>
              ) : (
                <Link
                  key={link.href}
                  href={link.href}
                  className="block text-neutral-400 hover:text-white transition-colors py-2"
                  onClick={() => setIsOpen(false)}
                >
                  {link.label}
                </Link>
              )
            ))}
            <SignedIn>
              <Link
                href="/dashboard"
                className="block text-white font-medium py-2"
                onClick={() => setIsOpen(false)}
              >
                Dashboard →
              </Link>
            </SignedIn>
          </div>
        </div>
      )}
    </nav>
  );
}
