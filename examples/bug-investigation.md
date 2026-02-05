# Bug Investigation with ContextKit

When you're debugging an issue, ContextKit helps you quickly gather relevant code context without manually searching through files.

## Scenario

You receive a bug report:
> "Users are getting logged out after 30 minutes even though they're actively using the app"

## Step 1: Find Session-Related Code

```bash
contextkit select "session timeout and token expiration"
```

This returns chunks about:
- Session middleware
- Token validation logic
- Timeout configuration

## Step 2: Drill Down with Import Graph

Once you identify key files, include their dependencies:

```bash
contextkit select "token refresh and session renewal" --include-imports --budget 12000
```

Now you see not just the session code, but the utility functions and config it depends on.

## Step 3: Feed to AI for Analysis

Copy the context and paste into Claude/ChatGPT with your question:

```
<paste contextkit output here>

---

Bug report: Users are getting logged out after 30 minutes even though they're actively using the app.

Based on this codebase context:
1. What manages session lifetime?
2. Where is the timeout configured?
3. What might cause premature session expiration?
```

## Step 4: Investigate Specific Functions

If the AI points to a specific function, query for more detail:

```bash
contextkit select "refreshToken function implementation"
```

## Real Example Output

```bash
$ contextkit select "session timeout token expiration" --budget 6000
```

```markdown
## auth/session.ts (lines 12-58)
```typescript
const SESSION_TIMEOUT = process.env.SESSION_TIMEOUT_MS || 30 * 60 * 1000;

export function createSession(userId: string): Session {
  return {
    userId,
    expiresAt: Date.now() + SESSION_TIMEOUT,
    lastActivity: Date.now(),
  };
}

export function validateSession(session: Session): boolean {
  // BUG: Only checks expiresAt, ignores lastActivity!
  return session.expiresAt > Date.now();
}
\```

## auth/middleware.ts (lines 1-25)
```typescript
export const sessionMiddleware = async (req, res, next) => {
  const session = await getSession(req);
  if (!validateSession(session)) {
    return res.status(401).json({ error: 'Session expired' });
  }
  // NOTE: We update lastActivity but validateSession doesn't use it
  session.lastActivity = Date.now();
  await saveSession(session);
  next();
};
\```

---
📊 847 tokens | 2 chunks | 2 files
```

**Boom.** In 5 seconds you've found the bug: `validateSession` checks `expiresAt` but ignores `lastActivity`. The session middleware updates `lastActivity` but it's never used to extend the session.

## Tips for Bug Investigation

1. **Start broad, then narrow** — first query finds the area, second gets details
2. **Use --include-imports** — bugs often hide in utility functions
3. **Query error messages** — if you have an error string, search for it
4. **Check tests** — `contextkit select "session timeout test"` might reveal expected behavior
5. **Lower budget for quick scans** — 2000-4000 tokens is enough to find entry points
