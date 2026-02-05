# Scripting & Automation with ContextKit

ContextKit's JSON output and CLI interface make it easy to integrate into scripts and automation workflows.

## JSON Output

Use `--format json` for structured output:

```bash
contextkit select "authentication" --format json
```

```json
{
  "query": "authentication",
  "context": "## auth/middleware.ts...",
  "chunks": [
    {
      "file": "auth/middleware.ts",
      "lines": [1, 45],
      "tokens": 312,
      "score": 0.847
    },
    {
      "file": "auth/utils.ts",
      "lines": [12, 30],
      "tokens": 156,
      "score": 0.723
    }
  ],
  "stats": {
    "totalTokens": 468,
    "chunksConsidered": 95,
    "chunksIncluded": 2,
    "filesIncluded": 2,
    "timeMs": 234
  }
}
```

## Shell Scripts

### Get File List
```bash
# Extract just the file paths
contextkit select "database queries" --format json | jq -r '.chunks[].file' | sort -u
```

### Check if Context Exists
```bash
if contextkit select "payment processing" --format json | jq -e '.chunks | length > 0' > /dev/null; then
  echo "Found payment code"
else
  echo "No payment code found"
fi
```

### Auto-generate Context File
```bash
#!/bin/bash
# generate-context.sh

QUERY="$1"
OUTPUT="${2:-context.md}"

contextkit select "$QUERY" --budget 10000 > "$OUTPUT"
echo "Saved context to $OUTPUT"
echo "Tokens: $(contextkit select "$QUERY" --format json | jq '.stats.totalTokens')"
```

## CI/CD Integration

### Pre-commit Hook

Create `.git/hooks/pre-commit`:

```bash
#!/bin/bash
# Re-index before commit to keep embeddings fresh

if [ -d ".contextkit" ]; then
  echo "Updating ContextKit index..."
  contextkit index --quiet
fi
```

### Documentation Generation

```bash
#!/bin/bash
# Generate context docs for key modules

modules=("auth" "payments" "api" "database")

for module in "${modules[@]}"; do
  contextkit select "how does $module work?" --budget 8000 > "docs/context-$module.md"
done
```

## Node.js Integration

```javascript
import { execSync } from 'child_process';

function getContext(query, options = {}) {
  const budget = options.budget || 8000;
  const cmd = `contextkit select "${query}" --format json --budget ${budget}`;
  
  const result = execSync(cmd, { encoding: 'utf-8' });
  return JSON.parse(result);
}

// Usage
const context = getContext('user authentication');
console.log(`Found ${context.chunks.length} relevant chunks`);
console.log(`Total tokens: ${context.stats.totalTokens}`);
```

## Python Integration

```python
import subprocess
import json

def get_context(query, budget=8000):
    result = subprocess.run(
        ['contextkit', 'select', query, '--format', 'json', '--budget', str(budget)],
        capture_output=True,
        text=True
    )
    return json.loads(result.stdout)

# Usage
context = get_context('error handling')
for chunk in context['chunks']:
    print(f"{chunk['file']}:{chunk['lines'][0]}-{chunk['lines'][1]}")
```

## GitHub Actions

```yaml
name: Generate Context Docs

on:
  push:
    paths:
      - 'src/**'

jobs:
  generate-docs:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      
      - uses: actions/setup-node@v4
        with:
          node-version: '20'
      
      - name: Install ContextKit
        run: npm install -g @milo4jo/contextkit
      
      - name: Initialize and Index
        run: |
          contextkit init --force
          contextkit source add ./src
          contextkit index
      
      - name: Generate Context Report
        run: |
          contextkit select "API endpoints" > docs/api-context.md
          contextkit select "Database models" > docs/db-context.md
      
      - name: Commit docs
        run: |
          git config user.name "GitHub Actions"
          git config user.email "actions@github.com"
          git add docs/*.md
          git commit -m "Update context docs" || exit 0
          git push
```

## Tips

- **Use `--quiet`** to suppress progress output in scripts
- **Cache results** — identical queries return cached results instantly
- **Check exit codes** — non-zero means an error occurred
- **Set `NO_COLOR=1`** to disable ANSI colors in output
