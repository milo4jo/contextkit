import Link from 'next/link';
import { SignedIn, SignedOut, SignInButton } from '@clerk/nextjs';
import { MarketingNav } from '@/components/marketing-nav';
import { Check } from 'lucide-react';

const plans = [
  {
    name: 'Free',
    price: '$0',
    description: 'For individual developers',
    features: [
      '1 project',
      '1,000 queries/month',
      '100 MB storage',
      '20 requests/minute',
      'Community support',
    ],
    cta: 'Get Started',
    href: '/sign-up',
  },
  {
    name: 'Pro',
    price: '$19',
    period: '/month',
    description: 'For power users',
    features: [
      '5 projects',
      '50,000 queries/month',
      '1 GB storage',
      '100 requests/minute',
      'Email support',
      'Priority indexing',
    ],
    cta: 'Start Free Trial',
    href: '/sign-up',
    highlighted: true,
  },
  {
    name: 'Team',
    price: '$12',
    period: '/user/month',
    description: 'For small teams',
    features: [
      'Unlimited projects',
      'Unlimited queries',
      '10 GB storage',
      '500 requests/minute',
      'Shared indexes',
      'Team analytics',
      'Priority support',
    ],
    cta: 'Contact Sales',
    href: 'mailto:team@contextkit.dev',
  },
];

export default function PricingPage() {
  return (
    <main className="min-h-screen bg-black text-white">
      <MarketingNav />

      <section className="pt-28 pb-20 px-6">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-16">
            <h1 className="text-4xl sm:text-5xl font-bold mb-4">Simple, transparent pricing</h1>
            <p className="text-neutral-400 text-lg max-w-2xl mx-auto">
              Start free. Upgrade when you need more. No hidden fees.
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-6 mb-16">
            {plans.map((plan) => (
              <div
                key={plan.name}
                className={`p-6 rounded-xl border ${
                  plan.highlighted
                    ? 'border-green-700 bg-green-950/20'
                    : 'border-neutral-800 bg-neutral-950'
                }`}
              >
                {plan.highlighted && (
                  <div className="text-xs font-semibold text-green-400 mb-2 uppercase tracking-wider">
                    Most Popular
                  </div>
                )}
                <h3 className="text-xl font-bold mb-1">{plan.name}</h3>
                <p className="text-neutral-500 text-sm mb-4">{plan.description}</p>
                <div className="mb-6">
                  <span className="text-4xl font-bold">{plan.price}</span>
                  {plan.period && <span className="text-neutral-500">{plan.period}</span>}
                </div>
                <ul className="space-y-3 mb-6">
                  {plan.features.map((feature) => (
                    <li key={feature} className="flex items-center gap-2 text-sm text-neutral-300">
                      <Check className="w-4 h-4 text-green-500 shrink-0" />
                      {feature}
                    </li>
                  ))}
                </ul>
                {plan.href.startsWith('mailto') ? (
                  <a
                    href={plan.href}
                    className={`block text-center py-2 px-4 rounded-lg font-medium transition-colors ${
                      plan.highlighted
                        ? 'bg-green-600 hover:bg-green-700 text-white'
                        : 'bg-neutral-800 hover:bg-neutral-700 text-white'
                    }`}
                  >
                    {plan.cta}
                  </a>
                ) : (
                  <SignedOut>
                    <SignInButton mode="modal">
                      <button
                        className={`w-full py-2 px-4 rounded-lg font-medium transition-colors ${
                          plan.highlighted
                            ? 'bg-green-600 hover:bg-green-700 text-white'
                            : 'bg-neutral-800 hover:bg-neutral-700 text-white'
                        }`}
                      >
                        {plan.cta}
                      </button>
                    </SignInButton>
                  </SignedOut>
                )}
                <SignedIn>
                  <Link
                    href="/dashboard/billing"
                    className={`block text-center py-2 px-4 rounded-lg font-medium transition-colors ${
                      plan.highlighted
                        ? 'bg-green-600 hover:bg-green-700 text-white'
                        : 'bg-neutral-800 hover:bg-neutral-700 text-white'
                    }`}
                  >
                    Go to Dashboard
                  </Link>
                </SignedIn>
              </div>
            ))}
          </div>

          {/* FAQ */}
          <div className="max-w-2xl mx-auto">
            <h2 className="text-2xl font-bold mb-8 text-center">Frequently Asked Questions</h2>
            <div className="space-y-6">
              <div>
                <h3 className="font-medium mb-2">Is the CLI free to use?</h3>
                <p className="text-neutral-500 text-sm">
                  Yes! The CLI is 100% free and open source. You can index and query locally without
                  any account. Cloud features (sync, team sharing) are part of paid plans.
                </p>
              </div>
              <div>
                <h3 className="font-medium mb-2">Can I change plans anytime?</h3>
                <p className="text-neutral-500 text-sm">
                  Yes. Upgrade or downgrade at any time. Changes take effect immediately.
                </p>
              </div>
              <div>
                <h3 className="font-medium mb-2">What happens if I exceed limits?</h3>
                <p className="text-neutral-500 text-sm">
                  You&apos;ll get a notification when approaching limits. Once exceeded, cloud
                  queries are rate-limited until the next billing cycle or upgrade.
                </p>
              </div>
              <div>
                <h3 className="font-medium mb-2">Do you offer refunds?</h3>
                <p className="text-neutral-500 text-sm">
                  Yes. 14-day money-back guarantee on all paid plans. No questions asked.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-8 px-6 border-t border-neutral-900">
        <div className="max-w-5xl mx-auto flex flex-col sm:flex-row justify-between items-center gap-4 text-sm text-neutral-600">
          <p>© 2026 ContextKit. MIT License.</p>
          <div className="flex gap-6">
            <Link href="/" className="hover:text-white transition-colors">
              Home
            </Link>
            <Link href="/docs" className="hover:text-white transition-colors">
              Docs
            </Link>
            <a
              href="https://github.com/milo4jo/contextkit"
              className="hover:text-white transition-colors"
            >
              GitHub
            </a>
          </div>
        </div>
      </footer>
    </main>
  );
}
