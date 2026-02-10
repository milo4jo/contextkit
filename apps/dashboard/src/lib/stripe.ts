import Stripe from "stripe";

// Lazy initialization to avoid build-time errors when STRIPE_SECRET_KEY is not set
let _stripe: Stripe | null = null;

export function getStripe(): Stripe {
  if (!_stripe) {
    const key = process.env.STRIPE_SECRET_KEY;
    if (!key) {
      throw new Error("STRIPE_SECRET_KEY is not set");
    }
    _stripe = new Stripe(key, {
      apiVersion: "2023-10-16",
      typescript: true,
    });
  }
  return _stripe;
}

// Proxy that lazily initializes Stripe
export const stripe = new Proxy({} as Stripe, {
  get(_, prop) {
    return getStripe()[prop as keyof Stripe];
  },
});

// Price IDs from Stripe Dashboard
export const PRICE_IDS = {
  pro: process.env.STRIPE_PRO_PRICE_ID || "price_pro",
  team: process.env.STRIPE_TEAM_PRICE_ID || "price_team",
} as const;

// Plan limits
export const PLAN_LIMITS = {
  free: {
    queries: 1000,
    storage: 100 * 1024 * 1024, // 100 MB
    projects: 1,
    rateLimit: 20,
  },
  pro: {
    queries: 50000,
    storage: 1024 * 1024 * 1024, // 1 GB
    projects: 5,
    rateLimit: 100,
  },
  team: {
    queries: null, // unlimited
    storage: 10 * 1024 * 1024 * 1024, // 10 GB
    projects: null, // unlimited
    rateLimit: 500,
  },
  enterprise: {
    queries: null,
    storage: null,
    projects: null,
    rateLimit: 1000,
  },
} as const;

export type Plan = keyof typeof PLAN_LIMITS;
