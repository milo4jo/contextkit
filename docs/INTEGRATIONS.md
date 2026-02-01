# Integrations

How ContextKit fits into the AI tooling ecosystem.

## Design Principle

ContextKit is a **library/CLI first**, with optional cloud features. All integrations build on the same core.

```
                    ┌─────────────────┐
                    │  ContextKit     │
                    │  Core Library   │
                    └────────┬────────┘
                             │
        ┌────────────────────┼────────────────────┐
        │                    │                    │
        ▼                    ▼                    ▼
   ┌─────────┐         ┌─────────┐         ┌─────────┐
   │   CLI   │         │  Skill  │         │   MCP   │
   └─────────┘         └─────────┘         └─────────┘
```

---

## Integration Priority

| Priority | Integration | Rationale |
|----------|-------------|-----------|
| 1 | **CLI** | Foundation. Everything else wraps it. |
| 2 | **Agent Skill** | Direct value for coding agents. |
| 3 | **MCP Server** | Broader ecosystem reach. |
| 4 | **Cloud API** | Team features, hosted option. |

---

## 1. CLI (Foundation)

The CLI is the core interface. All other integrations wrap it.

### Commands

```bash
# Project setup
contextkit init                      # Initialize in current directory
contextkit config                    # Show/edit config

# Source management
contextkit source add <path>         # Add a source
contextkit source list               # List sources
contextkit source remove <id>        # Remove a source

# Indexing
contextkit index                     # Index all sources
contextkit index --source <id>       # Index specific source
contextkit index --status            # Show index status

# Selection (main feature)
contextkit select <query>            # Select context for query
  --budget <tokens>                  # Token budget (default: 8000)
  --sources <ids>                    # Filter sources (comma-separated)
  --format <text|json>               # Output format
  --explain                          # Show selection reasoning
```

### Example Usage

```bash
# Setup
$ cd my-project
$ contextkit init
$ contextkit source add ./src
$ contextkit source add ./docs
$ contextkit index

# Use
$ contextkit select "How does the auth middleware work?" --budget 8000

# Output: structured context ready for LLM
```

---

## 2. Agent Skill (Core Integration)

A skill package that coding agents can use.

### Skill Structure

```
skills/
└── contextkit/
    ├── SKILL.md              # Skill documentation
    ├── package.json          # Dependencies
    └── scripts/
        ├── setup.sh          # Install contextkit CLI
        └── contextkit.sh     # Wrapper script
```

### SKILL.md

```markdown
# ContextKit Skill

Use when you need to:
- Find relevant code/docs for a complex task
- Optimize context before making LLM calls
- Analyze if current context is sufficient

## Prerequisites

Requires `contextkit` CLI installed.

## Usage

### Select relevant context
\`\`\`bash
contextkit select "your query here" --budget 8000
\`\`\`

### Analyze a context file
\`\`\`bash
contextkit analyze ./AGENTS.md
\`\`\`

### Check token count
\`\`\`bash
contextkit tokens ./somefile.md
\`\`\`

## When to use

- Before starting a complex task: get relevant context first
- When context seems insufficient: analyze and expand
- When hitting token limits: optimize selection

## Example

User asks: "Refactor the payment module"

1. Run: \`contextkit select "payment module architecture" --budget 8000\`
2. Review the selected context
3. Use it to inform your refactoring approach
```

### Integration with Agents

```typescript
// Agent pseudo-code
async function handleComplexTask(task: string) {
  // Use ContextKit skill to get relevant context
  const context = await exec('contextkit select', {
    query: task,
    budget: 8000,
  });
  
  // Now make LLM call with optimized context
  const response = await llm.complete({
    prompt: context + '\n\nTask: ' + task,
  });
}
```

---

## 3. MCP Server

Model Context Protocol server for Claude Desktop and compatible clients.

### Tool Definitions

```typescript
const tools = [
  {
    name: "contextkit_select",
    description: "Select optimal context for a query from indexed sources",
    inputSchema: {
      type: "object",
      properties: {
        query: {
          type: "string",
          description: "What you need context for"
        },
        budget: {
          type: "number",
          description: "Max tokens (default 8000)"
        }
      },
      required: ["query"]
    }
  },
  {
    name: "contextkit_analyze",
    description: "Analyze a file's context quality and token count",
    inputSchema: {
      type: "object",
      properties: {
        path: {
          type: "string",
          description: "Path to file to analyze"
        }
      },
      required: ["path"]
    }
  }
];
```

### Implementation

```typescript
// MCP server wraps CLI
import { exec } from 'child_process';

async function handleToolCall(name: string, args: any) {
  switch (name) {
    case 'contextkit_select':
      return exec(`contextkit select "${args.query}" --budget ${args.budget || 8000} --format json`);
    case 'contextkit_analyze':
      return exec(`contextkit analyze "${args.path}"`);
  }
}
```

---

## 4. Cloud API (Future)

Optional hosted service for:
- Team collaboration
- Shared indexes
- Usage analytics
- Heavy compute (large codebases)

### API Design

```
POST /v1/select
{
  "query": "...",
  "budget": 8000,
  "project_id": "..."
}

GET /v1/projects/:id/stats
GET /v1/projects/:id/sources
```

### Sync Model

```
Local Index ←──sync──→ Cloud Index
     │                      │
     │    CLI/Skill/MCP     │
     │         ↓            │
     └──── select() ────────┘
```

Local-first: Works offline. Cloud syncs when available.

---

## Integration Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                     User / Developer                        │
└─────────────────────────────────────────────────────────────┘
                              │
          ┌───────────────────┼───────────────────┐
          │                   │                   │
          ▼                   ▼                   ▼
    ┌───────────┐       ┌───────────┐       ┌───────────┐
    │  Claude   │       │  OpenCode │       │  Cursor   │
    │  Desktop  │       │  Clawdbot │       │  etc.     │
    └─────┬─────┘       └─────┬─────┘       └─────┬─────┘
          │                   │                   │
          │ MCP               │ Skill             │ CLI
          │                   │                   │
          └───────────────────┼───────────────────┘
                              │
                              ▼
                    ┌──────────────────┐
                    │  ContextKit CLI  │
                    │  (Core Engine)   │
                    └────────┬─────────┘
                             │
                             ▼
                    ┌──────────────────┐
                    │  Local Index     │
                    │  (SQLite + VSS)  │
                    └──────────────────┘
                             │
                             │ (optional sync)
                             ▼
                    ┌──────────────────┐
                    │  Cloud API       │
                    │  (Future)        │
                    └──────────────────┘
```

---

## Open Questions

- [ ] How to distribute the skill? npm? GitHub releases?
- [ ] MCP server: standalone binary or requires Node?
- [ ] Cloud: self-hostable or SaaS only?
