import { MetadataRoute } from 'next';
import { readdirSync } from 'fs';
import { join } from 'path';

function getBlogSlugs(): string[] {
  const blogDir = join(process.cwd(), 'src/content/blog');
  try {
    return readdirSync(blogDir)
      .filter((f) => f.endsWith('.json'))
      .map((f) => f.replace('.json', ''));
  } catch {
    return [];
  }
}

export default function sitemap(): MetadataRoute.Sitemap {
  const baseUrl = 'https://contextkit.dev';
  const blogSlugs = getBlogSlugs();

  const staticPages = [
    { url: baseUrl, priority: 1, changeFrequency: 'weekly' as const },
    { url: `${baseUrl}/docs`, priority: 0.8, changeFrequency: 'weekly' as const },
    { url: `${baseUrl}/pricing`, priority: 0.8, changeFrequency: 'monthly' as const },
    { url: `${baseUrl}/blog`, priority: 0.7, changeFrequency: 'weekly' as const },
  ];

  const blogPages = blogSlugs.map((slug) => ({
    url: `${baseUrl}/blog/${slug}`,
    priority: 0.6,
    changeFrequency: 'monthly' as const,
  }));

  return [...staticPages, ...blogPages].map((page) => ({
    ...page,
    lastModified: new Date(),
  }));
}
