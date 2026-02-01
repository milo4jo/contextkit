# Integrations

How ContextKit fits into the AI tooling ecosystem.

## Target Integrations

### 1. MCP Server (Model Context Protocol)

ContextKit as an MCP server that any compatible agent can use.

```typescript
// MCP Tool Definition
{
  name: "contextkit_select",
  description: "Select optimal context for a query",
  parameters: {
    query: "string - what the user wants to do",
    sources: "array - which sources to consider",
    budget: "number - max tokens"
  }
}
```

**Supported Agents:**
- Claude Desktop
- Any MCP-compatible client

---

### 2. CLI Tool

Standalone CLI for use in scripts and pipelines.

```bash
# Get optimized context
$ contextkit select \
    --query "implement user authentication" \
    --sources ./src,./docs \
    --budget 8000 \
    --output context.md

# Analyze current context
$ contextkit analyze ./AGENTS.md

# Generate AGENTS.md from codebase
$ contextkit generate-agents --repo . --output AGENTS.md
```

**Use Cases:**
- Pre-processing before agent runs
- CI/CD pipelines
- Batch processing

---

### 3. Agent Skill (🔑 Core Integration)

A skill that any agent (OpenCode, Claude Code, Clawdbot) can use.

```
skills/
└── contextkit/
    ├── SKILL.md
    ├── scripts/
    │   ├── select.sh
    │   ├── analyze.sh
    │   └── generate.sh
    └── templates/
        └── agents-template.md
```

**SKILL.md:**
```markdown
# ContextKit Skill

Use this skill when you need to:
- Optimize context for a complex task
- Analyze if current context is sufficient
- Generate or update AGENTS.md

## Commands

### Select Context
\`contextkit select --query "..." --budget 8000\`
Returns optimized context for the query.

### Analyze Context
\`contextkit analyze [file]\`
Shows token count, relevance scores, suggestions.

### Generate AGENTS.md
\`contextkit generate-agents\`
Creates optimized AGENTS.md from codebase analysis.
```

**Why this is key:**
- Agent-native, not IDE-specific
- Works with any agent that supports skills
- Programmatic access
- Part of the ecosystem

---

### 4. AGENTS.md Auto-Updater

Background service that keeps context files fresh.

```yaml
# contextkit.yaml
watch:
  - path: ./src
    triggers: [AGENTS.md, docs/ARCHITECTURE.md]
  - path: ./docs
    triggers: [AGENTS.md]

schedule:
  - cron: "0 9 * * *"  # Daily at 9am
    action: regenerate-agents
```

**Features:**
- Watches for code changes
- Updates context files automatically
- Notifies when context is stale

---

## Integration Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                     User / Developer                        │
└─────────────────────────────────────────────────────────────┘
                              │
              ┌───────────────┼───────────────┐
              │               │               │
              ▼               ▼               ▼
        ┌──────────┐   ┌──────────┐   ┌──────────┐
        │  Claude  │   │ OpenCode │   │  Cursor  │
        │   Code   │   │          │   │          │
        └────┬─────┘   └────┬─────┘   └────┬─────┘
              │               │               │
              └───────────────┼───────────────┘
                              │
                              ▼
                    ┌──────────────────┐
                    │   ContextKit     │
                    │                  │
                    │  • MCP Server    │
                    │  • Agent Skill   │
                    │  • CLI           │
                    │  • API           │
                    └──────────────────┘
                              │
              ┌───────────────┼───────────────┐
              │               │               │
              ▼               ▼               ▼
        ┌──────────┐   ┌──────────┐   ┌──────────┐
        │ Codebase │   │   Docs   │   │  Memory  │
        │          │   │          │   │          │
        └──────────┘   └──────────┘   └──────────┘
```

## Priority Order

1. **Agent Skill** — Immediate value, easy to build
2. **CLI Tool** — Foundation for everything else
3. **MCP Server** — Broader reach
4. **Auto-Updater** — Nice to have

## Open Questions

- [ ] How to package skills for easy installation?
- [ ] Should the skill call a hosted API or run locally?
- [ ] How to handle credentials/API keys in skill context?
