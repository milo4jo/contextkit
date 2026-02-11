# ContextKit Improvement Plan

> Polishing features, fixing bugs, and extending functionality

## 🐛 Bugs to Fix

### 1. Call Graph Returns Wrong Data ✅ FIXED
**Priority:** High
**Issue:** `contextkit graph "login"` shows incorrect callers
**Expected:** Should show `authenticate` calls `login`
**Actual:** Shows `generateToken` calls `login` (wrong)
**Fix:** Chunk overlap was overwriting function entries. Now skip if already exists.

### 2. Symbol Line Numbers Off ✅ FIXED
**Priority:** Medium
**Issue:** `contextkit symbol "AuthService"` shows "line 1" instead of actual line
**Expected:** Should show correct line number (line 9)
**Fix:** Now uses chunk's start_line from database to calculate absolute line numbers.

### 3. --explain Flag ✅ FIXED
**Priority:** Medium
**Issue:** `--explain` shows same output as without flag
**Expected:** Should show scoring breakdown (similarity score, term matches, etc.)
**Status:** Working correctly - shows Scoring Details section with similarity/path/content/symbol scores

---

## ✨ Polish Opportunities

### 1. Add `--copy` Flag for Clipboard
**Impact:** High (UX improvement)
**Current:** `contextkit select "query" | pbcopy`
**Proposed:** `contextkit select "query" --copy`
```typescript
// Detect OS and copy:
// macOS: pbcopy
// Linux: xclip -selection clipboard
// Windows: clip
```

### 2. Add `contextkit status` Command
**Impact:** Medium (discoverability)
**Shows:**
- Index stats (files, chunks, size)
- Last indexed time
- Cloud sync status
- Quick health check

### 3. Cleaner Map Mode Output
**Impact:** Medium (quality)
**Current:** Shows internal lines like `const token = ...`
**Proposed:** Only show actual signatures (functions, classes, exports)

### 4. Add Command Aliases ✅ DONE
**Impact:** Low (convenience)
```
contextkit search → contextkit select ✅
contextkit query → contextkit select ✅
contextkit find → contextkit symbol ✅
contextkit info → contextkit status ✅
```

### 5. Better Error Messages
**Impact:** Medium (UX)
- "Not initialized" → Include `contextkit init` command
- "No sources" → Include `contextkit source add ./src` command
- "No embeddings" → Include `contextkit index` command

---

## 🚀 New Features (High Impact)

### 1. Interactive Mode ✅ DONE
**Impact:** High
**Command:** `contextkit interactive` or `contextkit -i`
```
ContextKit Interactive Mode
Type a query, press Enter. Type 'exit' to quit.

> how does auth work?
[shows results]

> /symbol UserService
[shows symbol]

> /graph login
[shows graph]
```
**Status:** Shipped in v0.6.4 — includes /select, /symbol, /graph, /status, /clear, /copy, /last, /help, /exit

### 2. Diff Mode ✅ DONE
**Impact:** Medium
**Command:** `contextkit diff`
Shows what changed since last index:
```
Changed files:
  M src/auth.ts (3 chunks affected)
  A src/newfile.ts (new, not indexed)
  D src/old.ts (removed from index)

Run 'contextkit index' to update.
```
**Status:** Shipped in v0.6.5 — also available in interactive mode as `/diff`

### 3. Export/Import Index ✅ DONE
**Impact:** Medium
**Commands:**
```bash
contextkit export > index.json  # For debugging/sharing
contextkit import index.json    # Restore from export
```
**Status:** Shipped in v0.6.6

### 4. Config Presets ✅ DONE
**Impact:** Medium
```bash
contextkit init --preset react     # Optimized for React projects
contextkit init --preset python    # Optimized for Python
contextkit init --preset monorepo  # Multiple packages
```
**Status:** Shipped in v0.6.7 — includes react, node, python, monorepo, fullstack presets

### 5. Query History
**Impact:** Low
```bash
contextkit history        # Show past queries
contextkit history --run 3  # Re-run query #3
```

---

## 📊 Quick Wins (Can Do Today)

| Task | Effort | Impact |
|------|--------|--------|
| ~~Fix `--explain` to show scores~~ | ✅ | Done |
| ~~Add `--copy` clipboard flag~~ | ✅ | Done |
| ~~Add `contextkit status`~~ | ✅ | Done |
| ~~Fix error messages with suggestions~~ | ✅ | Done |
| ~~Add aliases (search, find, info)~~ | ✅ | Done |

---

## 🎯 Recommended Priority

### This Week
1. ✅ Fix `--explain` flag
2. ✅ Add `--copy` flag  
3. ✅ Add `contextkit status`
4. ✅ Better error messages

### Next Week
1. ~~Fix call graph accuracy~~ ✅ Done
2. ~~Fix symbol line numbers~~ ✅ Done
3. ~~Interactive mode (MVP)~~ ✅ Done

### Later
1. ~~Diff mode~~ ✅ Done
2. Export/import
3. Config presets
4. Query history

---

## Implementation Notes

### --copy Flag Implementation
```typescript
import { exec } from 'child_process';

function copyToClipboard(text: string): Promise<void> {
  const cmd = process.platform === 'darwin' 
    ? 'pbcopy'
    : process.platform === 'win32'
    ? 'clip'
    : 'xclip -selection clipboard';
  
  return new Promise((resolve, reject) => {
    const proc = exec(cmd, (err) => err ? reject(err) : resolve());
    proc.stdin?.write(text);
    proc.stdin?.end();
  });
}
```

### Status Command Output
```
📊 ContextKit Status

Project:     /path/to/project
Initialized: Yes
Sources:     2 (src, lib)

Index:
  Files:     42
  Chunks:    186
  Size:      12.5 MB
  Updated:   2 minutes ago

Cloud:
  Status:    Synced ✓
  Project:   my-project
  Version:   3

Health:      All good ✓
```

---

*Last updated: 2026-02-11*
