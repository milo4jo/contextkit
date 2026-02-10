"use client";

import { useState } from "react";
import { useSearchParams } from "next/navigation";
import { Check, Loader2 } from "lucide-react";

import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

const plans = [
  {
    name: "Free",
    price: "$0",
    description: "For individual developers",
    features: [
      "1 project",
      "1,000 queries/month",
      "100 MB storage",
      "20 requests/minute",
      "Community support",
    ],
    current: true,
  },
  {
    name: "Pro",
    price: "$19",
    period: "/month",
    description: "For power users",
    features: [
      "5 projects",
      "50,000 queries/month",
      "1 GB storage",
      "100 requests/minute",
      "Email support",
      "Priority indexing",
    ],
    highlighted: true,
  },
  {
    name: "Team",
    price: "$12",
    period: "/user/month",
    description: "For small teams",
    features: [
      "Unlimited projects",
      "Unlimited queries",
      "10 GB storage",
      "500 requests/minute",
      "Shared indexes",
      "Team analytics",
      "Priority support",
    ],
  },
  {
    name: "Enterprise",
    price: "Custom",
    description: "For large organizations",
    features: [
      "Everything in Team",
      "Self-hosted option",
      "SSO / SAML",
      "Audit logging",
      "Custom SLA",
      "Dedicated support",
      "Custom integrations",
    ],
  },
];

export default function BillingPage() {
  const searchParams = useSearchParams();
  const [loadingPlan, setLoadingPlan] = useState<string | null>(null);

  const success = searchParams.get("success");
  const canceled = searchParams.get("canceled");

  async function handleUpgrade(plan: "pro" | "team") {
    setLoadingPlan(plan);
    try {
      const response = await fetch("/api/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ plan }),
      });

      const data = await response.json();

      if (data.url) {
        window.location.href = data.url;
      } else {
        console.error("No checkout URL returned");
      }
    } catch (error) {
      console.error("Checkout error:", error);
    } finally {
      setLoadingPlan(null);
    }
  }

  return (
    <div className="container mx-auto py-6 px-4 sm:py-10 sm:px-6">
      {/* Success/Cancel alerts */}
      {success && (
        <div className="mb-4 sm:mb-6 p-3 sm:p-4 bg-green-50 dark:bg-green-950 border border-green-200 dark:border-green-800 rounded-lg">
          <p className="text-green-700 dark:text-green-300 font-medium text-sm sm:text-base">
            🎉 Welcome to ContextKit Pro! Your subscription is now active.
          </p>
        </div>
      )}
      {canceled && (
        <div className="mb-4 sm:mb-6 p-3 sm:p-4 bg-yellow-50 dark:bg-yellow-950 border border-yellow-200 dark:border-yellow-800 rounded-lg">
          <p className="text-yellow-700 dark:text-yellow-300 text-sm sm:text-base">
            Checkout was canceled. Feel free to try again when you&apos;re ready.
          </p>
        </div>
      )}

      <div className="mb-6 sm:mb-8 text-center">
        <h1 className="text-2xl sm:text-3xl font-bold">Pricing Plans</h1>
        <p className="text-muted-foreground mt-2 text-sm sm:text-base">
          Choose the plan that fits your needs
        </p>
      </div>

      <div className="grid gap-4 sm:gap-6 sm:grid-cols-2 lg:grid-cols-4">
        {plans.map((plan) => (
          <Card
            key={plan.name}
            className={plan.highlighted ? "border-primary shadow-lg" : ""}
          >
            <CardHeader>
              {plan.highlighted && (
                <div className="text-xs font-semibold text-primary mb-2">
                  MOST POPULAR
                </div>
              )}
              <CardTitle>{plan.name}</CardTitle>
              <CardDescription>{plan.description}</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="mb-4">
                <span className="text-3xl sm:text-4xl font-bold">{plan.price}</span>
                {plan.period && (
                  <span className="text-muted-foreground text-sm sm:text-base">{plan.period}</span>
                )}
              </div>
              <ul className="space-y-2">
                {plan.features.map((feature) => (
                  <li key={feature} className="flex items-center text-xs sm:text-sm">
                    <Check className="mr-2 h-3 w-3 sm:h-4 sm:w-4 text-primary shrink-0" />
                    {feature}
                  </li>
                ))}
              </ul>
            </CardContent>
            <CardFooter>
              {plan.current ? (
                <Button variant="outline" className="w-full" disabled>
                  Current Plan
                </Button>
              ) : plan.name === "Enterprise" ? (
                <Button variant="outline" className="w-full" asChild>
                  <a href="mailto:enterprise@contextkit.dev">Contact Sales</a>
                </Button>
              ) : (
                <Button
                  className="w-full"
                  variant={plan.highlighted ? "default" : "outline"}
                  onClick={() => handleUpgrade(plan.name.toLowerCase() as "pro" | "team")}
                  disabled={loadingPlan !== null}
                >
                  {loadingPlan === plan.name.toLowerCase() ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Loading...
                    </>
                  ) : (
                    `Upgrade to ${plan.name}`
                  )}
                </Button>
              )}
            </CardFooter>
          </Card>
        ))}
      </div>

      {/* Current subscription */}
      <Card className="mt-8 sm:mt-12">
        <CardHeader>
          <CardTitle className="text-lg sm:text-xl">Current Subscription</CardTitle>
          <CardDescription className="text-sm">
            You are currently on the Free plan
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 sm:gap-4">
            <div>
              <p className="font-medium">Free Plan</p>
              <p className="text-xs sm:text-sm text-muted-foreground">
                Renews monthly (no charge)
              </p>
            </div>
            <div className="sm:text-right">
              <p className="text-xl sm:text-2xl font-bold">$0</p>
              <p className="text-xs sm:text-sm text-muted-foreground">per month</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* FAQ */}
      <Card className="mt-6 sm:mt-8">
        <CardHeader>
          <CardTitle className="text-lg sm:text-xl">Frequently Asked Questions</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <h4 className="font-medium text-sm sm:text-base">Can I change plans anytime?</h4>
            <p className="text-xs sm:text-sm text-muted-foreground">
              Yes! You can upgrade or downgrade at any time. Changes take effect immediately.
            </p>
          </div>
          <div>
            <h4 className="font-medium text-sm sm:text-base">What happens if I exceed my limits?</h4>
            <p className="text-xs sm:text-sm text-muted-foreground">
              You&apos;ll receive a notification when approaching limits. Once exceeded, 
              queries will be rate-limited until the next billing cycle or upgrade.
            </p>
          </div>
          <div>
            <h4 className="font-medium text-sm sm:text-base">Do you offer refunds?</h4>
            <p className="text-xs sm:text-sm text-muted-foreground">
              Yes, we offer a 14-day money-back guarantee on all paid plans.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
