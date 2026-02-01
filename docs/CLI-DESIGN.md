# CLI Design Principles

Based on [Command Line Interface Guidelines](https://clig.dev/).

## Core Philosophy

### Human-First Design
The CLI is for humans first, scripts second. Make it intuitive, helpful, and forgiving.

### Robustness
Handle unexpected input gracefully. Never crash with a stack trace. Always give useful feedback.

### Conversation as Norm
Users learn through trial and error. Design for this: suggest corrections, show next steps, confirm before destructive actions.

---

## Rules We Follow

### 1. Exit Codes

```
0   = Success
1   = General error
2   = Invalid usage / bad arguments
64+ = Specific error codes (optional)
```

Every command must return appropriate exit codes. Scripts depend on this.

### 2. Output Streams

| Stream | Use For |
|--------|---------|
| stdout | Primary output (results, data) |
| stderr | Progress, logs, errors, prompts |

**Why?** Allows piping: `contextkit select "query" | pbcopy`

### 3. Help Text

**Always support:**
- `contextkit --help`
- `contextkit -h`
- `contextkit <command> --help`
- `contextkit help <command>`

**Concise help when called without arguments:**
```
$ contextkit

contextkit - Smart context selection for LLMs

Usage: contextkit <command> [options]

Commands:
  init          Initialize ContextKit in current directory
  source        Manage sources (add, list, remove)
  index         Index all sources
  select        Select context for a query

Examples:
  $ contextkit init
  $ contextkit source add ./src
  $ contextkit select "How does auth work?"

Run 'contextkit <command> --help' for more information.
```

**Full help with --help:**
```
$ contextkit select --help

Select optimal context for a query.

Usage: contextkit select <query> [options]

Arguments:
  query          What you need context for

Options:
  -b, --budget   Max tokens (default: 8000)
  -f, --format   Output format: text, json (default: text)
  -s, --sources  Filter to specific sources (comma-separated)
  --explain      Show selection reasoning
  --plain        Disable formatting (for piping)

Examples:
  # Basic selection
  $ contextkit select "How does the auth middleware work?"
  
  # With budget limit
  $ contextkit select "database schema" --budget 4000
  
  # JSON output for scripting
  $ contextkit select "api endpoints" --format json
  
  # Explain why chunks were selected
  $ contextkit select "error handling" --explain
```

### 4. Examples First

Help text leads with examples, not flag references. Users learn by example.

```
Examples:
  $ contextkit select "How does auth work?"
  $ contextkit select "api routes" --budget 4000 --format json

Options:
  -b, --budget   Max tokens (default: 8000)
  ...
```

### 5. Progress Indicators

Never leave the user wondering if something is happening.

```
$ contextkit index

Indexing sources...
  [src]  ████████████████████ 147/147 files
  [docs] ████████████████████  23/23 files
  
Generating embeddings...
  ████████████████████ 1,423/1,423 chunks

✓ Indexed 1,423 chunks in 12.3s
```

For long operations, show:
- What's happening
- Progress (if measurable)
- Time estimate (if possible)

### 6. Machine-Readable Output

**`--json` flag** for structured output:
```
$ contextkit select "auth" --format json
{
  "id": "sel_abc123",
  "chunks": [...],
  "stats": {
    "tokens": 3847,
    "chunks_included": 8
  }
}
```

**`--plain` flag** for pipe-friendly output:
```
$ contextkit source list --plain
src	./src	directory	147
docs	./docs	directory	23
```

### 7. TTY Detection

Detect if output is going to a terminal or being piped.

**Interactive (TTY):**
- Colors and formatting
- Progress bars
- Prompts for confirmation

**Piped (not TTY):**
- No colors/formatting
- No progress bars
- No interactive prompts

```typescript
import { isatty } from 'tty';

const isTTY = isatty(process.stdout.fd);
if (isTTY) {
  // Show colors, progress bars
} else {
  // Plain output
}
```

### 8. Error Messages

**Bad:**
```
Error: ENOENT
```

**Good:**
```
Error: Source not found

The source 'src' doesn't exist. Did you mean one of these?
  - ./src
  - ./source

Run 'contextkit source list' to see all sources.
```

Include:
- What went wrong
- Why it might have happened
- How to fix it

### 9. Suggestions & Corrections

When user input is close to valid, suggest corrections:

```
$ contextkit sorce add ./src
                ^^^^
Error: Unknown command 'sorce'

Did you mean 'source'? [Y/n]
```

### 10. Confirmations for Destructive Actions

```
$ contextkit source remove docs

This will remove 'docs' from indexing.
23 files will no longer be searchable.

Are you sure? [y/N]
```

- Default to safe option (N)
- Allow `--yes` / `-y` to skip for scripting

### 11. Color Usage

| Color | Meaning |
|-------|---------|
| Green | Success, safe |
| Yellow | Warning, attention |
| Red | Error, danger |
| Blue | Info, links |
| Dim | Secondary info |

Always respect `NO_COLOR` environment variable.

```typescript
const useColor = process.env.NO_COLOR === undefined && isTTY;
```

### 12. Subcommand Structure

Follow git-style subcommands:

```
contextkit <command> <subcommand> [options]

contextkit source add ./src
contextkit source list
contextkit source remove docs
```

### 13. Common Flags

These should work globally:

| Flag | Description |
|------|-------------|
| `-h, --help` | Show help |
| `-v, --version` | Show version |
| `--quiet` | Less output |
| `--json` | JSON output |
| `--plain` | Plain output (no formatting) |
| `--yes, -y` | Skip confirmations |

### 14. Version Information

```
$ contextkit --version
contextkit 0.1.0

$ contextkit --version --verbose
contextkit 0.1.0
node v20.10.0
darwin arm64
```

---

## Checklist for Every Command

- [ ] Returns correct exit code
- [ ] Outputs data to stdout
- [ ] Outputs messages to stderr  
- [ ] Has `-h` / `--help`
- [ ] Shows examples in help
- [ ] Shows progress for long operations
- [ ] Supports `--json` if applicable
- [ ] Handles errors gracefully with helpful messages
- [ ] Respects `NO_COLOR`
- [ ] Works when piped (no TTY)
