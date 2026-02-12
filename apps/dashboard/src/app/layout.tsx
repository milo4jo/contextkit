import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import { ClerkProvider } from '@clerk/nextjs';

import { PostHogProvider, PostHogIdentify } from '@/components/providers/posthog-provider';
import './globals.css';

const inter = Inter({ subsets: ['latin'] });

export const metadata: Metadata = {
  title: 'ContextKit Dashboard',
  description: 'Manage your ContextKit projects and API keys',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <ClerkProvider>
      <html lang="en">
        <body className={inter.className}>
          <PostHogProvider>
            <PostHogIdentify />
            {children}
          </PostHogProvider>
        </body>
      </html>
    </ClerkProvider>
  );
}
