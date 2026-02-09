import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import { Check } from "lucide-react";

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

export default async function BillingPage() {
  const { userId } = await auth();

  if (!userId) {
    redirect("/sign-in");
  }

  return (
    <div className="container mx-auto py-10">
      <div className="mb-8 text-center">
        <h1 className="text-3xl font-bold">Pricing Plans</h1>
        <p className="text-muted-foreground mt-2">
          Choose the plan that fits your needs
        </p>
      </div>

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
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
                <span className="text-4xl font-bold">{plan.price}</span>
                {plan.period && (
                  <span className="text-muted-foreground">{plan.period}</span>
                )}
              </div>
              <ul className="space-y-2">
                {plan.features.map((feature) => (
                  <li key={feature} className="flex items-center text-sm">
                    <Check className="mr-2 h-4 w-4 text-primary" />
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
                <Button variant="outline" className="w-full">
                  Contact Sales
                </Button>
              ) : (
                <Button
                  className="w-full"
                  variant={plan.highlighted ? "default" : "outline"}
                >
                  Upgrade to {plan.name}
                </Button>
              )}
            </CardFooter>
          </Card>
        ))}
      </div>

      {/* Current subscription */}
      <Card className="mt-12">
        <CardHeader>
          <CardTitle>Current Subscription</CardTitle>
          <CardDescription>
            You are currently on the Free plan
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between">
            <div>
              <p className="font-medium">Free Plan</p>
              <p className="text-sm text-muted-foreground">
                Renews monthly (no charge)
              </p>
            </div>
            <div className="text-right">
              <p className="text-2xl font-bold">$0</p>
              <p className="text-sm text-muted-foreground">per month</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* FAQ */}
      <Card className="mt-8">
        <CardHeader>
          <CardTitle>Frequently Asked Questions</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <h4 className="font-medium">Can I change plans anytime?</h4>
            <p className="text-sm text-muted-foreground">
              Yes! You can upgrade or downgrade at any time. Changes take effect immediately.
            </p>
          </div>
          <div>
            <h4 className="font-medium">What happens if I exceed my limits?</h4>
            <p className="text-sm text-muted-foreground">
              You&apos;ll receive a notification when approaching limits. Once exceeded, 
              queries will be rate-limited until the next billing cycle or upgrade.
            </p>
          </div>
          <div>
            <h4 className="font-medium">Do you offer refunds?</h4>
            <p className="text-sm text-muted-foreground">
              Yes, we offer a 14-day money-back guarantee on all paid plans.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
