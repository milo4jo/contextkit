/**
 * ContextKit Cloud API
 *
 * Hono app running on Cloudflare Workers
 */

import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { logger } from 'hono/logger';
import { authRoutes } from './routes/auth';
import { projectRoutes } from './routes/projects';
import { syncRoutes } from './routes/sync';
import { webhookRoutes } from './routes/webhooks';

export interface Env {
  // Secrets
  CLERK_SECRET_KEY: string;
  TURSO_URL: string;
  TURSO_AUTH_TOKEN: string;
  LEMONSQUEEZY_WEBHOOK_SECRET: string;

  // Bindings
  STORAGE: R2Bucket;

  // Variables
  ENVIRONMENT: string;
}

const app = new Hono<{ Bindings: Env }>();

// Middleware
app.use('*', logger());
app.use(
  '*',
  cors({
    origin: ['http://localhost:3000', 'https://app.contextkit.dev', 'https://contextkit.dev'],
    credentials: true,
  })
);

// Health check
app.get('/', (c) => {
  return c.json({
    name: 'ContextKit API',
    version: '0.1.0',
    status: 'ok',
  });
});

app.get('/health', (c) => c.json({ status: 'ok' }));

// Routes
app.route('/auth', authRoutes);
app.route('/projects', projectRoutes);
app.route('/sync', syncRoutes);
app.route('/webhooks', webhookRoutes);

// 404
app.notFound((c) => {
  return c.json({ error: 'Not found' }, 404);
});

// Error handler
app.onError((err, c) => {
  console.error('API Error:', err);
  return c.json(
    {
      error: c.env.ENVIRONMENT === 'production' ? 'Internal server error' : err.message,
    },
    500
  );
});

export default app;
