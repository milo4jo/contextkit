# Contributing to ContextKit

Thanks for your interest in contributing! 🎉

## Quick Start

```bash
# Clone the monorepo
git clone https://github.com/milo4jo/pixtools.git
cd pixtools

# Install dependencies
pnpm install

# Navigate to ContextKit
cd packages/contextkit

# Build
pnpm build

# Run tests
pnpm test

# Link for local testing
npm link
```

## Development Workflow

1. **Create a branch** from `main`
2. **Make your changes**
3. **Run tests** — `pnpm test`
4. **Run linting** — `pnpm lint`
5. **Submit a PR**

## Project Structure

```
packages/contextkit/
├── src/
│   ├── commands/       # CLI commands (init, source, index, select, mcp)
│   ├── core/           # Core logic (chunking, embedding, search)
│   ├── mcp/            # MCP server implementation
│   ├── utils/          # Utilities (streams, config)
│   └── errors/         # Error types
├── tests/              # Test files
├── docs/               # Documentation
└── dist/               # Built output (git-ignored)
```

## Code Style

- TypeScript strict mode
- ESLint + Prettier for formatting
- Meaningful commit messages

## Testing

We use [Vitest](https://vitest.dev/) for testing.

```bash
# Run all tests
pnpm test

# Run tests in watch mode
pnpm test -- --watch

# Run specific test file
pnpm test -- src/core/chunker.test.ts
```

## Adding a New Command

1. Create file in `src/commands/`
2. Export a `Command` from commander.js
3. Register in `src/index.ts`
4. Add tests
5. Update README

## Reporting Issues

Please include:
- Node.js version (`node -v`)
- OS and version
- Steps to reproduce
- Expected vs actual behavior

## Questions?

Open an issue or reach out on [GitHub Discussions](https://github.com/milo4jo/pixtools/discussions).
