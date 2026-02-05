# ContextKit Examples

Real-world examples of using ContextKit to improve AI-assisted coding.

## Use Cases

### 1. [Code Review Prep](./code-review-prep.md)
Gather context before reviewing a PR or understanding a new feature.

### 2. [Bug Investigation](./bug-investigation.md)
Quickly find related code when debugging an issue.

### 3. [Feature Planning](./feature-planning.md)
Understand existing patterns before adding new functionality.

### 4. [Scripting & Automation](./scripting.md)
Use ContextKit in shell scripts and CI pipelines.

## Quick Examples

### Find All Authentication Code
```bash
contextkit select "authentication and login" --budget 12000
```

### Understand a Specific Module
```bash
contextkit select "how does the payment processing module work?" --include-imports
```

### Get Context for a Bug Fix
```bash
contextkit select "user session timeout handling"
```

### Prepare for Code Review
```bash
contextkit select "what does the UserService class do?" --format plain
```

### Export for Documentation
```bash
contextkit select "API endpoint handlers" --format json > api-context.json
```

## Tips

1. **Be specific** — "database connection pooling" beats "database stuff"
2. **Use --include-imports** — pulls in related dependencies automatically
3. **Adjust budget** — start with 4000 for quick questions, 12000+ for deep dives
4. **Try different formats** — JSON for scripts, markdown for pasting to AI
