import Link from 'next/link';
import { readdirSync, readFileSync } from 'fs';
import { join } from 'path';

interface BlogPost {
  slug: string;
  date: string;
  title: string;
  description: string;
  tags: string[];
}

function getBlogPosts(): BlogPost[] {
  const blogDir = join(process.cwd(), 'src/content/blog');

  try {
    const files = readdirSync(blogDir).filter((f) => f.endsWith('.json'));

    const posts = files.map((file) => {
      const content = readFileSync(join(blogDir, file), 'utf-8');
      return JSON.parse(content) as BlogPost;
    });

    // Sort by date descending
    return posts.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  } catch {
    return [];
  }
}

export default function BlogPage() {
  const posts = getBlogPosts();

  return (
    <div className="pt-28 pb-20 px-6">
      <div className="max-w-3xl mx-auto">
        {/* Header */}
        <div className="mb-12">
          <h1 className="text-3xl font-bold mb-4">Blog</h1>
          <p className="text-neutral-400">
            Thoughts on AI development tools, context management, and building in public.
          </p>
        </div>

        {/* Posts */}
        {posts.length === 0 ? (
          <p className="text-neutral-500">No posts yet.</p>
        ) : (
          <div className="space-y-8">
            {posts.map((post) => (
              <article key={post.slug} className="group">
                <Link href={`/blog/${post.slug}`}>
                  <div className="border border-neutral-800 rounded-lg p-6 hover:border-neutral-700 transition-colors">
                    <time className="text-xs text-neutral-500 font-mono">
                      {new Date(post.date).toLocaleDateString('en-US', {
                        year: 'numeric',
                        month: 'long',
                        day: 'numeric',
                      })}
                    </time>
                    <h2 className="text-xl font-semibold mt-2 mb-2 group-hover:text-neutral-300 transition-colors">
                      {post.title}
                    </h2>
                    <p className="text-neutral-400 text-sm mb-4">{post.description}</p>
                    <div className="flex gap-2">
                      {post.tags.map((tag) => (
                        <span
                          key={tag}
                          className="text-xs px-2 py-1 bg-neutral-900 text-neutral-400 rounded"
                        >
                          {tag}
                        </span>
                      ))}
                    </div>
                  </div>
                </Link>
              </article>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

export const metadata = {
  title: 'Blog | ContextKit',
  description: 'Thoughts on AI development tools and context management',
};
