# Contributing to ContextKit

Thanks for your interest in contributing! 🎉

## Quick Start

```bash
# Clone the repo
git clone https://github.com/milo4jo/contextkit.git
cd contextkit

# Install dependencies
npm install

# Build
npm run build

# Run tests
npm test

# Link for local testing
npm link
```

## Development Workflow

1. **Create a branch** from `main`
2. **Make your changes**
3. **Run tests** — `npm test`
4. **Run linting** — `npm run lint`
5. **Submit a PR**

## Project Structure

```
contextkit/
├── src/
│   ├── commands/       # CLI commands (init, source, index, select, mcp)
│   ├── config/         # Configuration management
│   ├── db/             # Database operations
│   ├── indexer/        # Chunking, embedding, discovery
│   ├── selector/       # Search, scoring, budget, formatting
│   ├── mcp/            # MCP server implementation
│   ├── utils/          # Utilities (streams, prompts, format)
│   └── errors/         # Error types
├── tests/              # Test files
├── docs/               # Documentation
├── examples/           # Demo project
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
npm test

# Run tests in watch mode
npm test -- --watch

# Run specific test file
npm test -- tests/chunker.test.ts
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

Open an issue on [GitHub](https://github.com/milo4jo/contextkit/issues).
