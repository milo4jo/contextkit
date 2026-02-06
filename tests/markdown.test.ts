/**
 * Tests for Markdown parser
 */

import { describe, test, expect } from 'vitest';
import { parseMarkdown, isMarkdown, getMarkdownExtensions } from '../src/parsers/markdown.js';

describe('parseMarkdown', () => {
  describe('headers/sections', () => {
    test('parses single header', () => {
      const content = `# Main Title

Some content here.`;

      const result = parseMarkdown(content);

      expect(result.success).toBe(true);
      expect(result.boundaries).toHaveLength(1);
      expect(result.boundaries[0]).toMatchObject({
        type: 'class',
        name: 'Main Title',
        startLine: 1,
        endLine: 3,
        exported: true, // H1 is exported
      });
    });

    test('parses multiple headers at same level', () => {
      const content = `# First Section

Content 1

# Second Section

Content 2`;

      const result = parseMarkdown(content);

      expect(result.success).toBe(true);
      expect(result.boundaries).toHaveLength(2);
      expect(result.boundaries[0].name).toBe('First Section');
      expect(result.boundaries[1].name).toBe('Second Section');
    });

    test('parses nested headers', () => {
      const content = `# Main

## Sub Section

Content

## Another Sub

More content`;

      const result = parseMarkdown(content);

      expect(result.success).toBe(true);
      // Should have: Main section, Sub Section, Another Sub
      const sectionNames = result.boundaries.map(b => b.name);
      expect(sectionNames).toContain('Main');
      expect(sectionNames).toContain('Sub Section');
      expect(sectionNames).toContain('Another Sub');
    });

    test('marks only H1 as exported', () => {
      const content = `# Top Level

## Second Level

### Third Level`;

      const result = parseMarkdown(content);

      const h1 = result.boundaries.find(b => b.name === 'Top Level');
      const h2 = result.boundaries.find(b => b.name === 'Second Level');
      const h3 = result.boundaries.find(b => b.name === 'Third Level');

      expect(h1?.exported).toBe(true);
      expect(h2?.exported).toBe(false);
      expect(h3?.exported).toBe(false);
    });
  });

  describe('code blocks', () => {
    test('parses code block without language', () => {
      const content = `# Example

\`\`\`
const x = 1;
\`\`\``;

      const result = parseMarkdown(content);

      const codeBlock = result.boundaries.find(b => b.name.startsWith('codeblock'));
      expect(codeBlock).toBeDefined();
      expect(codeBlock?.type).toBe('function');
    });

    test('parses code block with language', () => {
      const content = `# Example

\`\`\`typescript
const x: number = 1;
\`\`\``;

      const result = parseMarkdown(content);

      const codeBlock = result.boundaries.find(b => b.name === 'codeblock:typescript');
      expect(codeBlock).toBeDefined();
      expect(codeBlock?.startLine).toBe(3);
      expect(codeBlock?.endLine).toBe(5);
    });

    test('parses multiple code blocks', () => {
      const content = `# Examples

\`\`\`javascript
const a = 1;
\`\`\`

\`\`\`python
x = 1
\`\`\``;

      const result = parseMarkdown(content);

      const codeBlocks = result.boundaries.filter(b => b.name.startsWith('codeblock'));
      expect(codeBlocks).toHaveLength(2);
      expect(codeBlocks[0].name).toBe('codeblock:javascript');
      expect(codeBlocks[1].name).toBe('codeblock:python');
    });
  });

  describe('front matter', () => {
    test('parses YAML front matter', () => {
      const content = `---
title: My Document
author: Milo
---

# Content`;

      const result = parseMarkdown(content);

      const frontMatter = result.boundaries.find(b => b.name === 'frontmatter');
      expect(frontMatter).toBeDefined();
      expect(frontMatter?.type).toBe('constant');
      expect(frontMatter?.startLine).toBe(1);
      expect(frontMatter?.endLine).toBe(4);
    });

    test('does not parse --- in middle of document as front matter', () => {
      const content = `# Title

Some content

---

More content after divider`;

      const result = parseMarkdown(content);

      const frontMatter = result.boundaries.find(b => b.name === 'frontmatter');
      expect(frontMatter).toBeUndefined();
    });
  });

  describe('complex documents', () => {
    test('parses README-style document', () => {
      const content = `---
title: ContextKit
---

# ContextKit

AI-powered context selection for code.

## Installation

\`\`\`bash
npm install @milo4jo/contextkit
\`\`\`

## Usage

\`\`\`typescript
import { select } from '@milo4jo/contextkit';
const result = await select('find auth');
\`\`\`

## API Reference

### select()

Main function for context selection.`;

      const result = parseMarkdown(content);

      expect(result.success).toBe(true);

      // Should have front matter
      expect(result.boundaries.find(b => b.name === 'frontmatter')).toBeDefined();

      // Should have main sections
      const sectionNames = result.boundaries.filter(b => b.type === 'class').map(b => b.name);
      expect(sectionNames).toContain('ContextKit');
      expect(sectionNames).toContain('Installation');
      expect(sectionNames).toContain('Usage');
      expect(sectionNames).toContain('API Reference');

      // Should have code blocks
      const codeBlocks = result.boundaries.filter(b => b.name.startsWith('codeblock'));
      expect(codeBlocks.length).toBeGreaterThanOrEqual(2);
    });

    test('handles code block inside section correctly', () => {
      const content = `# Setup

Install the package:

\`\`\`bash
npm install pkg
\`\`\`

Then configure it.

# Usage

Use it like this.`;

      const result = parseMarkdown(content);

      // Code block should have correct line numbers
      const codeBlock = result.boundaries.find(b => b.name === 'codeblock:bash');
      expect(codeBlock?.startLine).toBe(5);
      expect(codeBlock?.endLine).toBe(7);

      // Sections should exist
      const sections = result.boundaries.filter(b => b.type === 'class');
      expect(sections.some(s => s.name === 'Setup')).toBe(true);
      expect(sections.some(s => s.name === 'Usage')).toBe(true);
    });
  });

  describe('edge cases', () => {
    test('handles empty document', () => {
      const result = parseMarkdown('');

      expect(result.success).toBe(true);
      expect(result.boundaries).toHaveLength(0);
    });

    test('handles document with only text (no structure)', () => {
      const content = `Just some plain text
without any headers
or code blocks.`;

      const result = parseMarkdown(content);

      expect(result.success).toBe(true);
      expect(result.boundaries).toHaveLength(0);
    });

    test('handles unclosed code block', () => {
      const content = `# Example

\`\`\`typescript
const x = 1;
// never closed`;

      const result = parseMarkdown(content);

      expect(result.success).toBe(true);
      const codeBlock = result.boundaries.find(b => b.name === 'codeblock:typescript');
      expect(codeBlock).toBeDefined();
      expect(codeBlock?.endLine).toBe(5);
    });

    test('handles header in code block (should ignore)', () => {
      const content = `# Real Header

\`\`\`markdown
# This is NOT a header
It's inside a code block
\`\`\``;

      const result = parseMarkdown(content);

      const sections = result.boundaries.filter(b => b.type === 'class');
      expect(sections).toHaveLength(1);
      expect(sections[0].name).toBe('Real Header');
    });
  });
});

describe('isMarkdown', () => {
  test('returns true for .md files', () => {
    expect(isMarkdown('README.md')).toBe(true);
    expect(isMarkdown('docs/guide.md')).toBe(true);
  });

  test('returns true for .mdx files', () => {
    expect(isMarkdown('component.mdx')).toBe(true);
  });

  test('returns true for .markdown files', () => {
    expect(isMarkdown('long.markdown')).toBe(true);
  });

  test('returns true for .qmd files (Quarto)', () => {
    expect(isMarkdown('analysis.qmd')).toBe(true);
  });

  test('returns false for non-markdown files', () => {
    expect(isMarkdown('code.ts')).toBe(false);
    expect(isMarkdown('style.css')).toBe(false);
    expect(isMarkdown('data.json')).toBe(false);
  });
});

describe('getMarkdownExtensions', () => {
  test('returns all supported extensions', () => {
    const exts = getMarkdownExtensions();
    expect(exts).toContain('md');
    expect(exts).toContain('mdx');
    expect(exts).toContain('markdown');
    expect(exts).toContain('qmd');
  });
});
