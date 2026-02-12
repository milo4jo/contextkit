'use client';

import posthog from 'posthog-js';
import { PostHogProvider as PHProvider } from 'posthog-js/react';
import { useEffect } from 'react';
import { useUser } from '@clerk/nextjs';

if (typeof window !== 'undefined' && process.env.NEXT_PUBLIC_POSTHOG_KEY) {
  posthog.init(process.env.NEXT_PUBLIC_POSTHOG_KEY, {
    api_host: process.env.NEXT_PUBLIC_POSTHOG_HOST || 'https://app.posthog.com',
    capture_pageview: false, // We capture manually
    capture_pageleave: true,
  });
}

export function PostHogProvider({ children }: { children: React.ReactNode }) {
  return <PHProvider client={posthog}>{children}</PHProvider>;
}

export function PostHogIdentify() {
  const { user, isLoaded } = useUser();

  useEffect(() => {
    if (isLoaded && user) {
      posthog.identify(user.id, {
        email: user.emailAddresses[0]?.emailAddress,
        name: user.fullName,
      });
    }
  }, [user, isLoaded]);

  return null;
}

// Analytics events
export const analytics = {
  trackPageView: (path: string) => {
    posthog.capture('$pageview', { path });
  },

  trackProjectCreated: (projectId: string) => {
    posthog.capture('project_created', { project_id: projectId });
  },

  trackApiKeyCreated: () => {
    posthog.capture('api_key_created');
  },

  trackQuery: (projectId: string, tokensUsed: number) => {
    posthog.capture('context_query', {
      project_id: projectId,
      tokens_used: tokensUsed,
    });
  },

  trackUpgradeStarted: (plan: string) => {
    posthog.capture('upgrade_started', { plan });
  },

  trackUpgradeCompleted: (plan: string) => {
    posthog.capture('upgrade_completed', { plan });
  },
};
