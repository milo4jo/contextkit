/**
 * ContextKit Cloud API
 *
 * Main entry point for the Cloudflare Workers API
 */

import { Hono } from "hono";
import { cors } from "hono/cors";
import { logger } from "hono/logger";
import { secureHeaders } from "hono/secure-headers";
import { timing } from "hono/timing";

import { authMiddleware } from "./middleware/auth";
import { rateLimitMiddleware } from "./middleware/rate-limit";
import { errorHandler } from "./middleware/error-handler";

import { contextRoutes } from "./routes/context";
import { projectRoutes } from "./routes/projects";
import { indexRoutes } from "./routes/index-sync";
import { symbolRoutes } from "./routes/symbols";
import { graphRoutes } from "./routes/graph";
import { usageRoutes } from "./routes/usage";

import type { Env, Variables } from "./types";

const app = new Hono<{ Bindings: Env; Variables: Variables }>();

// Global middleware
app.use("*", timing());
app.use("*", logger());
app.use("*", secureHeaders());
app.use(
  "*",
  cors({
    origin: [
      "https://contextkit.dev",
      "https://dashboard.contextkit.dev",
      "http://localhost:3000",
    ],
    allowMethods: ["GET", "POST", "PATCH", "DELETE", "OPTIONS"],
    allowHeaders: ["Content-Type", "Authorization"],
    exposeHeaders: [
      "X-RateLimit-Limit",
      "X-RateLimit-Remaining",
      "X-RateLimit-Reset",
    ],
    maxAge: 86400,
  })
);

// Error handling
app.onError(errorHandler);

// Health check (no auth required)
app.get("/health", (c) => {
  return c.json({
    status: "ok",
    version: "1.0.0",
    timestamp: new Date().toISOString(),
  });
});

// API v1 routes (auth required)
const v1 = new Hono<{ Bindings: Env; Variables: Variables }>();

v1.use("*", authMiddleware);
v1.use("*", rateLimitMiddleware);

v1.route("/context", contextRoutes);
v1.route("/projects", projectRoutes);
v1.route("/index", indexRoutes);
v1.route("/symbols", symbolRoutes);
v1.route("/graph", graphRoutes);
v1.route("/usage", usageRoutes);

app.route("/v1", v1);

// 404 handler
app.notFound((c) => {
  return c.json(
    {
      type: "https://contextkit.dev/errors/not-found",
      title: "Not Found",
      status: 404,
      detail: `Route ${c.req.method} ${c.req.path} not found`,
    },
    404
  );
});

export default app;
