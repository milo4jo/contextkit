/**
 * Error handling middleware
 */

import type { Context } from 'hono';
import { ApiError } from '../types';
import type { Env, Variables } from '../types';

/**
 * Global error handler
 */
export function errorHandler(
  err: Error,
  c: Context<{ Bindings: Env; Variables: Variables }>
): Response {
  const requestId = c.get('requestId') ?? 'unknown';

  // Handle known API errors
  if (err instanceof ApiError) {
    console.error(`[${requestId}] API Error:`, err.title, err.detail);

    return c.json(err.toJSON(), err.status as 400 | 401 | 403 | 404 | 429 | 409);
  }

  // Handle Zod validation errors
  if (err.name === 'ZodError') {
    const zodError = err as unknown as { errors: Array<{ path: string[]; message: string }> };
    const detail = zodError.errors.map((e) => `${e.path.join('.')}: ${e.message}`).join(', ');

    console.error(`[${requestId}] Validation Error:`, detail);

    return c.json(
      {
        type: 'https://contextkit.dev/errors/validation',
        title: 'Validation Error',
        status: 400,
        detail,
        errors: zodError.errors,
      },
      400
    );
  }

  // Handle unexpected errors
  console.error(`[${requestId}] Unexpected Error:`, err);

  // Don't leak internal error details in production
  const isProduction = c.env.ENVIRONMENT === 'production';
  const detail = isProduction ? 'An unexpected error occurred. Please try again.' : err.message;

  return c.json(
    {
      type: 'https://contextkit.dev/errors/internal',
      title: 'Internal Server Error',
      status: 500,
      detail,
      request_id: requestId,
    },
    500
  );
}
