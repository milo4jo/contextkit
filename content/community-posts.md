# Community Post Templates

## Reddit r/ClaudeAI

**Title:** I built a tool that gives Claude Desktop perfect code context via MCP

**Body:**

I was frustrated with manually copy-pasting code into Claude. Either I'd miss something important, or I'd paste too much and hit token limits.

So I built ContextKit — it indexes your codebase locally and selects the most relevant code for any query.

The cool part: it includes an MCP server, so Claude Desktop can fetch context directly.

**Setup:**
```bash
npm install -g @milo4jo/contextkit
contextkit init && contextkit source add ./src && contextkit index
```

Add to `claude_desktop_config.json`:
```json
{
  "mcpServers": {
    "contextkit": {
      "command": "contextkit-mcp"
    }
  }
}
```

Now you can just ask Claude: "Find the code related to authentication" and it will use the tool to get the right context.

Open source: https://github.com/milo4jo/pixtools

What do you think? Any features you'd want?

---

## Reddit r/LocalLLaMA

**Title:** ContextKit: Local-first context selection for coding with LLMs

**Body:**

Sharing a tool I built for selecting the right code context when working with LLMs.

**The problem:** When you ask an LLM about your code, you need to give it context. Too much = expensive and confusing. Too little = hallucinations. Manual selection = tedious.

**The solution:** ContextKit indexes your codebase locally (using gte-small for embeddings), then semantically searches to find the most relevant chunks for any query.

Key features:
- 100% local — your code never leaves your machine
- Model-agnostic — works with any LLM
- Token-budget aware — specify how many tokens you want to use
- MCP server included — works with Claude Desktop

```bash
npm install -g @milo4jo/contextkit
contextkit init
contextkit source add ./src
contextkit index
contextkit select "How does error handling work?"
```

It outputs formatted markdown with the relevant code chunks, ready to paste into any LLM chat.

Open source (MIT): https://github.com/milo4jo/pixtools

Feedback welcome!

---

## Reddit r/programming

**Title:** Context is the new prompt engineering — a tool for selecting the right code context for LLMs

**Body:**

After months of using AI coding assistants, I've realized the model matters less than the context you give it.

A mediocre model with perfect context beats a great model with garbage context every time.

So I built a tool to solve this: **ContextKit**

It indexes your codebase locally, then uses semantic search to select the most relevant chunks for any query — fitting them into your token budget.

```bash
contextkit select "Why is the API returning 401?"
```

Outputs the exact files and functions related to auth, formatted and ready to paste.

**Features:**
- Local-first (no API keys, your code stays on your machine)
- Model-agnostic (works with Claude, GPT, Llama, whatever)
- Token-budget aware (you specify the limit, it optimizes)
- MCP server (for Claude Desktop integration)

It's open source: https://github.com/milo4jo/pixtools

I'm curious — how do you currently manage context when using AI for coding?

---

## Hacker News

**Title:** Show HN: ContextKit – Smart context selection for AI coding assistants

**Body:**

Hi HN,

I've been using AI coding assistants heavily this year, and the #1 friction point is context: too much = expensive and noisy, too little = hallucinations.

So I built ContextKit: it indexes your codebase locally and semantically selects the most relevant chunks for any query, fitting them into your token budget.

```
contextkit select "How does authentication work?"
→ Returns the exact files/functions, formatted, with token count
```

Key design decisions:
- Local-first: Embeddings computed and stored on your machine. No API keys.
- Model-agnostic: Just outputs text. Use it with Claude, GPT, Llama, anything.
- Token-aware: Specify budget, get optimized selection.
- MCP server: Claude Desktop can call it as a tool.

Tech: TypeScript, gte-small for embeddings (runs locally via onnxruntime), SQLite for the index.

Open source (MIT): https://github.com/milo4jo/pixtools

I'm particularly interested in feedback on:
1. The MCP integration — is this the right direction for tool UX?
2. What embedding model would you prefer? (currently gte-small for size/speed)
3. Would you pay for a cloud-sync feature?

Thanks!

---

## Twitter/X Thread

**Tweet 1:**
I built ContextKit — a tool that gives AI coding assistants the *right* context.

Stop dumping your entire codebase into prompts. Stop manually copy-pasting files.

```
contextkit select "How does auth work?"
→ Returns exact relevant code, optimized for token budget
```

🧵 How it works:

**Tweet 2:**
The problem: AI assistants are only as good as the context you give them.

Too much context = expensive, noisy
Too little = hallucinations
Manual selection = doesn't scale

**Tweet 3:**
The solution:

1. Index your codebase (locally, ~500MB for the model)
2. Query in natural language
3. Get semantically-relevant code chunks
4. Copy into any AI chat

Or use the MCP server and let Claude fetch context directly.

**Tweet 4:**
Key design decisions:

✅ Local-first (code never leaves your machine)
✅ Model-agnostic (works with any LLM)
✅ Token-budget aware (you set the limit)
✅ MCP integration (Claude Desktop support)

**Tweet 5:**
Open source (MIT): github.com/milo4jo/pixtools

Install:
```
npm install -g @milo4jo/contextkit
```

Would love feedback. What features would make this useful for you?

🦊
