# Demo Project — ContextKit Example

This is a sample project to demonstrate how ContextKit works.

It's a simple Express.js API with authentication — the kind of codebase you'd actually use ContextKit with.

## Try It

First, install ContextKit globally:

```bash
npm install -g @milo4jo/contextkit
```

Then, from this directory:

```bash
# Initialize ContextKit
contextkit init

# Add the source directory
contextkit source add ./src

# Index the code
contextkit index
```

## Example Queries

Try these queries to see how ContextKit finds relevant context:

```bash
# Find authentication-related code
contextkit select "How does authentication work?"

# Find JWT token handling
contextkit select "How are JWT tokens created and verified?"

# Find password validation
contextkit select "What are the password requirements?"

# Find user database operations
contextkit select "How do I query users from the database?"

# Find API routes
contextkit select "What endpoints are available for login?"
```

## What You'll See

Each query returns the most relevant code chunks, formatted and ready to paste into an AI chat.

For example, `contextkit select "How does authentication work?"` might return:

- `src/auth/middleware.ts` — The main auth middleware
- `src/auth/jwt.ts` — Token creation and verification
- `src/routes/auth.ts` — The auth API endpoints

All within your token budget, ranked by relevance.

## Project Structure

```
src/
├── auth/
│   ├── middleware.ts  # Express auth middleware
│   └── jwt.ts         # JWT token utilities
├── users/
│   ├── repository.ts  # Database queries
│   └── password.ts    # Password hashing
├── routes/
│   └── auth.ts        # API endpoints
└── database.ts        # PostgreSQL connection
```

## Learn More

See the main [ContextKit README](../../README.md) for full documentation.
