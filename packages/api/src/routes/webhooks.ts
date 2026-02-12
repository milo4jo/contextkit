/**
 * Webhook Routes
 *
 * Handles webhooks from Clerk (user events) and Lemon Squeezy (payments)
 */

import { Hono } from 'hono';
import type { Env } from '../index';
import { getDb } from '../db/client';

export const webhookRoutes = new Hono<{ Bindings: Env }>();

/**
 * Clerk webhook - user events
 */
webhookRoutes.post('/clerk', async (c) => {
  // TODO: Verify Clerk webhook signature
  const payload = await c.req.json();
  const db = getDb(c.env.TURSO_URL, c.env.TURSO_AUTH_TOKEN);

  const { type, data } = payload;

  switch (type) {
    case 'user.created':
      await db.execute({
        sql: `
          INSERT INTO users (id, email, name, avatar_url)
          VALUES (?, ?, ?, ?)
          ON CONFLICT(id) DO UPDATE SET
            email = excluded.email,
            name = excluded.name,
            avatar_url = excluded.avatar_url,
            updated_at = unixepoch()
        `,
        args: [
          data.id,
          data.email_addresses?.[0]?.email_address || '',
          `${data.first_name || ''} ${data.last_name || ''}`.trim() || null,
          data.image_url || null,
        ],
      });
      break;

    case 'user.updated':
      await db.execute({
        sql: `
          UPDATE users SET
            email = ?,
            name = ?,
            avatar_url = ?,
            updated_at = unixepoch()
          WHERE id = ?
        `,
        args: [
          data.email_addresses?.[0]?.email_address || '',
          `${data.first_name || ''} ${data.last_name || ''}`.trim() || null,
          data.image_url || null,
          data.id,
        ],
      });
      break;

    case 'user.deleted':
      // Soft delete or hard delete based on policy
      // For now, just mark projects as orphaned
      await db.execute({
        sql: 'DELETE FROM users WHERE id = ?',
        args: [data.id],
      });
      break;
  }

  return c.json({ received: true });
});

/**
 * Lemon Squeezy webhook - subscription events
 */
webhookRoutes.post('/lemonsqueezy', async (c) => {
  // Verify webhook signature
  const signature = c.req.header('X-Signature');
  const body = await c.req.text();

  // TODO: Implement signature verification
  // const isValid = await verifyLemonSqueezySignature(
  //   body,
  //   signature,
  //   c.env.LEMONSQUEEZY_WEBHOOK_SECRET
  // );

  const payload = JSON.parse(body);
  const db = getDb(c.env.TURSO_URL, c.env.TURSO_AUTH_TOKEN);

  const { meta, data } = payload;
  const eventType = meta.event_name;
  const customData = meta.custom_data || {};

  switch (eventType) {
    case 'subscription_created':
    case 'subscription_updated':
      // Update user's plan
      if (customData.user_id) {
        const plan = data.attributes.status === 'active' ? 'pro' : 'free';
        await db.execute({
          sql: `
            UPDATE users SET 
              plan = ?,
              stripe_customer_id = ?,
              updated_at = unixepoch()
            WHERE id = ?
          `,
          args: [plan, data.attributes.customer_id, customData.user_id],
        });
      }
      break;

    case 'subscription_cancelled':
    case 'subscription_expired':
      if (customData.user_id) {
        await db.execute({
          sql: `
            UPDATE users SET 
              plan = 'free',
              updated_at = unixepoch()
            WHERE id = ?
          `,
          args: [customData.user_id],
        });
      }
      break;

    case 'subscription_payment_failed':
      // TODO: Send email notification
      console.warn('Payment failed for user:', customData.user_id);
      break;
  }

  return c.json({ received: true });
});
