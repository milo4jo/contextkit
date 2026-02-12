import Link from 'next/link';
import { SignedIn, SignedOut, SignInButton } from '@clerk/nextjs';
import { MarketingNav } from '@/components/marketing-nav';
import { CopyButton } from '@/components/copy-button';
import { Check, X } from 'lucide-react';

export default function LandingPage() {
  return (
    <main className="min-h-screen bg-black text-white">
      <MarketingNav />

      {/* Hero */}
      <section className="pt-28 pb-16 px-6">
        <div className="max-w-4xl mx-auto text-center">
          {/* Badge */}
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-neutral-900 border border-neutral-800 text-xs text-neutral-400 mb-8">
            <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></span>
            v0.6.3 — Cloud Sync + Doctor Command
          </div>

          <h1 className="text-4xl sm:text-5xl md:text-6xl font-bold tracking-tight mb-6">
            The right context.
            <br />
            <span className="text-neutral-500">Every time.</span>
          </h1>

          <p className="text-lg sm:text-xl text-neutral-400 mb-8 max-w-2xl mx-auto">
            Stop dumping your entire codebase into AI prompts. ContextKit selects the most relevant
            code for any query —<span className="text-white"> saving 90%+ tokens</span> and getting
            better answers.
          </p>

          {/* Install command */}
          <div className="flex flex-col sm:flex-row gap-4 justify-center items-center mb-8">
            <code className="bg-neutral-900 border border-neutral-800 px-5 py-3 rounded-lg font-mono text-sm flex items-center gap-3">
              <span className="text-neutral-500">$</span>
              <span>npm i -g @milo4jo/contextkit</span>
              <CopyButton text="npm i -g @milo4jo/contextkit" />
            </code>
          </div>

          {/* Social proof */}
          <div className="flex flex-wrap justify-center gap-4 sm:gap-6 text-sm text-neutral-500">
            <a
              href="https://www.npmjs.com/package/@milo4jo/contextkit"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-2 hover:text-white transition-colors"
            >
              <img
                src="https://img.shields.io/npm/dw/@milo4jo/contextkit?style=flat&color=22c55e&labelColor=171717"
                alt="npm downloads"
                className="h-5"
              />
            </a>
            <span className="flex items-center gap-2">
              <span className="text-green-500">✓</span> 100% Local
            </span>
            <span className="flex items-center gap-2">
              <span className="text-green-500">✓</span> No API Keys
            </span>
          </div>
        </div>
      </section>

      {/* Demo */}
      <section className="py-12 px-6">
        <div className="max-w-4xl mx-auto">
          <div className="bg-neutral-950 border border-neutral-800 rounded-xl overflow-hidden shadow-2xl">
            <div className="flex items-center gap-2 px-4 py-3 bg-neutral-900 border-b border-neutral-800">
              <div className="flex gap-1.5">
                <div className="w-3 h-3 rounded-full bg-red-500/80"></div>
                <div className="w-3 h-3 rounded-full bg-yellow-500/80"></div>
                <div className="w-3 h-3 rounded-full bg-green-500/80"></div>
              </div>
              <span className="text-xs text-neutral-500 ml-2">terminal</span>
            </div>
            <div className="p-6 font-mono text-sm overflow-x-auto">
              <div className="text-neutral-500">
                $ contextkit select &quot;How does auth work?&quot;
              </div>
              <div className="mt-4 text-neutral-300">
                <span className="text-blue-400">Finding relevant context...</span>
              </div>
              <div className="mt-4">
                <div className="text-green-400">## src/auth/middleware.ts</div>
                <div className="text-neutral-400 mt-1 pl-4 border-l-2 border-neutral-800">
                  <div className="text-purple-400">export</div>
                  <div>{`const authMiddleware = async (req, res, next) => {`}</div>
                  <div className="pl-4">{`const token = req.headers.authorization;`}</div>
                  <div className="pl-4">{`const user = await validateToken(token);`}</div>
                  <div>{`}`}</div>
                </div>
              </div>
              <div className="mt-4 pt-4 border-t border-neutral-800 text-neutral-500">
                📊 2,847 tokens | 6 chunks | 2 files
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Why ContextKit */}
      <section className="py-20 px-6 border-t border-neutral-900">
        <div className="max-w-4xl mx-auto">
          <h2 className="text-xs font-medium text-neutral-500 uppercase tracking-widest mb-4">
            Why ContextKit?
          </h2>
          <p className="text-2xl sm:text-3xl font-medium text-neutral-200 mb-12 max-w-3xl">
            AI assistants are only as good as the context you give them.
          </p>

          <div className="grid md:grid-cols-3 gap-6 mb-12">
            <div className="p-6 bg-neutral-950 border border-neutral-800 rounded-xl">
              <div className="text-3xl mb-4">📦</div>
              <h3 className="font-semibold text-lg mb-2">Too much context</h3>
              <p className="text-neutral-500 text-sm">
                200k tokens for a 50k line codebase. Expensive. Slow. The model loses focus.
              </p>
            </div>
            <div className="p-6 bg-neutral-950 border border-neutral-800 rounded-xl">
              <div className="text-3xl mb-4">🫥</div>
              <h3 className="font-semibold text-lg mb-2">Too little context</h3>
              <p className="text-neutral-500 text-sm">
                Miss a key file and get hallucinations. Wrong imports. Broken code.
              </p>
            </div>
            <div className="p-6 bg-green-950/30 border border-green-900/50 rounded-xl">
              <div className="text-3xl mb-4">🎯</div>
              <h3 className="font-semibold text-lg mb-2 text-green-400">Right context</h3>
              <p className="text-neutral-400 text-sm">
                ContextKit gives you the 3-8k tokens that matter. 96% savings, better answers.
              </p>
            </div>
          </div>

          {/* Comparison */}
          <div className="grid md:grid-cols-2 gap-6">
            <div className="p-6 border border-neutral-800 rounded-xl">
              <h3 className="font-medium mb-4 text-neutral-400 flex items-center gap-2">
                <X className="w-4 h-4 text-red-500" /> Without ContextKit
              </h3>
              <ul className="space-y-2 text-sm text-neutral-500">
                <li>Copy-paste random files</li>
                <li>Hit token limits constantly</li>
                <li>Miss important dependencies</li>
                <li>Get hallucinated code</li>
              </ul>
            </div>
            <div className="p-6 border border-green-900/50 bg-green-950/20 rounded-xl">
              <h3 className="font-medium mb-4 text-green-400 flex items-center gap-2">
                <Check className="w-4 h-4" /> With ContextKit
              </h3>
              <ul className="space-y-2 text-sm text-neutral-300">
                <li>Semantic search finds relevant code</li>
                <li>Token budget respected</li>
                <li>Import graph included</li>
                <li>Accurate, grounded answers</li>
              </ul>
            </div>
          </div>
        </div>
      </section>

      {/* How it works */}
      <section className="py-20 px-6 border-t border-neutral-900 bg-neutral-950">
        <div className="max-w-4xl mx-auto">
          <h2 className="text-xs font-medium text-neutral-500 uppercase tracking-widest mb-12">
            Three Commands. That&apos;s it.
          </h2>
          <div className="grid md:grid-cols-3 gap-8">
            <div>
              <div className="text-5xl font-bold text-neutral-800 mb-4">1</div>
              <h3 className="font-semibold mb-2">Index</h3>
              <code className="text-sm text-green-400">contextkit index</code>
              <p className="text-sm text-neutral-500 mt-2">
                Embeds your code locally. Runs in seconds, updates incrementally.
              </p>
            </div>
            <div>
              <div className="text-5xl font-bold text-neutral-800 mb-4">2</div>
              <h3 className="font-semibold mb-2">Select</h3>
              <code className="text-sm text-green-400">contextkit select &quot;query&quot;</code>
              <p className="text-sm text-neutral-500 mt-2">
                Finds the most relevant chunks. Respects your token budget.
              </p>
            </div>
            <div>
              <div className="text-5xl font-bold text-neutral-800 mb-4">3</div>
              <h3 className="font-semibold mb-2">Use</h3>
              <code className="text-sm text-green-400">| pbcopy</code>
              <p className="text-sm text-neutral-500 mt-2">
                Paste into Claude, GPT, or any LLM. Or use MCP for auto-fetch.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="py-20 px-6 border-t border-neutral-900">
        <div className="max-w-4xl mx-auto">
          <h2 className="text-xs font-medium text-neutral-500 uppercase tracking-widest mb-12">
            Everything you need
          </h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 sm:gap-6">
            {[
              { icon: '🔒', title: 'Local-first', desc: 'Your code never leaves your machine' },
              { icon: '🤖', title: 'MCP Server', desc: 'Claude Desktop auto-fetches context' },
              { icon: '🔍', title: 'Symbol Search', desc: 'Find functions by name instantly' },
              { icon: '⚡', title: 'Incremental', desc: 'Only re-indexes changed files' },
              { icon: '🗺️', title: 'Map Mode', desc: 'Signatures only for overviews' },
              { icon: '🌐', title: 'Multi-language', desc: 'TS, JS, Python, Go, Rust...' },
              { icon: '📊', title: 'Token Budget', desc: 'Specify max tokens' },
              { icon: '☁️', title: 'Cloud Sync', desc: 'Share indexes across machines' },
            ].map((feature) => (
              <div key={feature.title} className="p-4">
                <div className="text-xl mb-2">{feature.icon}</div>
                <h3 className="font-medium text-sm mb-1">{feature.title}</h3>
                <p className="text-xs text-neutral-500">{feature.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-24 px-6 border-t border-neutral-900 bg-gradient-to-b from-neutral-950 to-black">
        <div className="max-w-3xl mx-auto text-center">
          <h2 className="text-3xl sm:text-4xl font-bold mb-4">Better context = Better answers</h2>
          <p className="text-neutral-400 mb-8">
            Install ContextKit and start getting the right code context in seconds.
          </p>
          <code className="inline-block bg-neutral-900 border border-neutral-800 px-6 py-3 rounded-lg font-mono text-sm mb-8">
            npm install -g @milo4jo/contextkit
          </code>
          <div className="flex flex-wrap justify-center gap-4 text-sm">
            <Link
              href="/docs"
              className="px-4 py-2 bg-white text-black rounded-lg font-medium hover:bg-neutral-200 transition-colors"
            >
              Read the docs
            </Link>
            <SignedOut>
              <SignInButton mode="modal">
                <button className="px-4 py-2 border border-green-700 text-green-400 rounded-lg font-medium hover:bg-green-900/20 transition-colors">
                  Sign up free →
                </button>
              </SignInButton>
            </SignedOut>
            <SignedIn>
              <Link
                href="/dashboard"
                className="px-4 py-2 border border-green-700 text-green-400 rounded-lg font-medium hover:bg-green-900/20 transition-colors"
              >
                Open Dashboard →
              </Link>
            </SignedIn>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-12 px-6 border-t border-neutral-900">
        <div className="max-w-4xl mx-auto">
          <div className="flex flex-col md:flex-row justify-between items-start gap-8">
            <div>
              <div className="font-semibold text-lg flex items-center gap-2 mb-2">
                <span>🎯</span> ContextKit
              </div>
              <p className="text-sm text-neutral-500 max-w-xs">
                The right context for AI coding assistants. Local-first, open source.
              </p>
            </div>
            <div className="flex gap-12 text-sm">
              <div>
                <h4 className="font-medium mb-3 text-neutral-400">Product</h4>
                <ul className="space-y-2 text-neutral-500">
                  <li>
                    <Link href="/docs" className="hover:text-white transition-colors">
                      Docs
                    </Link>
                  </li>
                  <li>
                    <Link href="/pricing" className="hover:text-white transition-colors">
                      Pricing
                    </Link>
                  </li>
                  <li>
                    <a
                      href="https://github.com/milo4jo/contextkit/blob/main/CHANGELOG.md"
                      className="hover:text-white transition-colors"
                    >
                      Changelog
                    </a>
                  </li>
                </ul>
              </div>
              <div>
                <h4 className="font-medium mb-3 text-neutral-400">Links</h4>
                <ul className="space-y-2 text-neutral-500">
                  <li>
                    <a
                      href="https://github.com/milo4jo/contextkit"
                      className="hover:text-white transition-colors"
                    >
                      GitHub
                    </a>
                  </li>
                  <li>
                    <a
                      href="https://www.npmjs.com/package/@milo4jo/contextkit"
                      className="hover:text-white transition-colors"
                    >
                      npm
                    </a>
                  </li>
                </ul>
              </div>
            </div>
          </div>
          <div className="mt-12 pt-8 border-t border-neutral-900 flex flex-col sm:flex-row justify-between items-center gap-4 text-sm text-neutral-600">
            <p>MIT License</p>
            <p>
              Built by{' '}
              <a
                href="https://github.com/milo4jo"
                className="text-neutral-400 hover:text-white transition-colors"
              >
                Milo 🦊
              </a>
            </p>
          </div>
        </div>
      </footer>
    </main>
  );
}
