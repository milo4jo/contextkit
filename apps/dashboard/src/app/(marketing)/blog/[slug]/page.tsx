import Link from 'next/link';
import { readdirSync, readFileSync } from 'fs';
import { join } from 'path';
import { notFound } from 'next/navigation';
import type { Metadata } from 'next';
import { BlogContent } from '@/components/BlogContent';

interface BlogPost {
  slug: string;
  date: string;
  title: string;
  description: string;
  tags: string[];
  content: string;
}

function getBlogPost(slug: string): BlogPost | null {
  const blogDir = join(process.cwd(), 'src/content/blog');
  const filePath = join(blogDir, `${slug}.json`);

  try {
    const content = readFileSync(filePath, 'utf-8');
    return JSON.parse(content) as BlogPost;
  } catch {
    return null;
  }
}

function getAllSlugs(): string[] {
  const blogDir = join(process.cwd(), 'src/content/blog');

  try {
    return readdirSync(blogDir)
      .filter((f) => f.endsWith('.json'))
      .map((f) => f.replace('.json', ''));
  } catch {
    return [];
  }
}

export async function generateStaticParams() {
  const slugs = getAllSlugs();
  return slugs.map((slug) => ({ slug }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const post = getBlogPost(slug);

  if (!post) {
    return { title: 'Not Found | ContextKit' };
  }

  return {
    title: `${post.title} | ContextKit Blog`,
    description: post.description,
  };
}

export default async function BlogPostPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const post = getBlogPost(slug);

  if (!post) {
    notFound();
  }

  return (
    <article className="pt-28 pb-20 px-6">
      <div className="max-w-3xl mx-auto">
        {/* Back link */}
        <Link
          href="/blog"
          className="text-sm text-neutral-500 hover:text-white transition-colors inline-flex items-center gap-1 mb-8"
        >
          ← Back to blog
        </Link>

        {/* Header */}
        <header className="mb-12">
          <time className="text-sm text-neutral-500 font-mono">
            {new Date(post.date).toLocaleDateString('en-US', {
              year: 'numeric',
              month: 'long',
              day: 'numeric',
            })}
          </time>
          <h1 className="text-3xl sm:text-4xl font-bold mt-3 mb-4">{post.title}</h1>
          <p className="text-lg text-neutral-400">{post.description}</p>
          <div className="flex gap-2 mt-4">
            {post.tags.map((tag) => (
              <span
                key={tag}
                className="text-xs px-2 py-1 bg-neutral-900 text-neutral-400 rounded"
              >
                {tag}
              </span>
            ))}
          </div>
        </header>

        {/* Content */}
        <BlogContent content={post.content} />

        {/* CTA */}
        <div className="mt-16 p-6 border border-neutral-800 rounded-lg">
          <h3 className="font-semibold mb-2">Ready to try ContextKit?</h3>
          <p className="text-neutral-400 text-sm mb-4">
            Install in 30 seconds and start finding the right context for your AI prompts.
          </p>
          <code className="inline-block bg-neutral-900 px-4 py-2 rounded font-mono text-sm">
            npm install -g @milo4jo/contextkit
          </code>
        </div>
      </div>
    </article>
  );
}
