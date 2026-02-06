/**
 * Markdown Parser
 *
 * Structure-aware parsing for Markdown files.
 * Extracts sections based on headers, keeps code blocks intact.
 *
 * Inspired by QMD (Quarto) structure:
 * - YAML front matter extraction
 * - Header-based sections
 * - Code block preservation
 */

import type { ParseResult, CodeBoundary } from './typescript.js';

/**
 * Parse a Markdown file and extract structural boundaries.
 *
 * @param content - Markdown file content
 * @param _filePath - Optional file path for context (unused, for API consistency)
 * @returns Parse result with section/code block boundaries
 */
export function parseMarkdown(content: string, _filePath?: string): ParseResult {
  const lines = content.split('\n');
  const boundaries: CodeBoundary[] = [];

  let inFrontMatter = false;
  let frontMatterStart = 0;
  let inCodeBlock = false;
  let codeBlockStart = 0;
  let codeBlockLang = '';
  let currentSection: {
    name: string;
    level: number;
    startLine: number;
  } | null = null;

  // Check for YAML front matter at the start
  if (lines[0]?.trim() === '---') {
    inFrontMatter = true;
    frontMatterStart = 1;
  }

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const lineNum = i + 1;

    // Handle front matter
    if (inFrontMatter) {
      if (line.trim() === '---' && lineNum > frontMatterStart) {
        // End of front matter
        boundaries.push({
          type: 'constant', // Use 'constant' for front matter (document metadata)
          name: 'frontmatter',
          startLine: frontMatterStart,
          endLine: lineNum,
          exported: false,
        });
        inFrontMatter = false;
      }
      continue;
    }

    // Handle code blocks
    const codeBlockMatch = line.match(/^```(\w*)/);
    if (codeBlockMatch) {
      if (!inCodeBlock) {
        // Start of code block
        inCodeBlock = true;
        codeBlockStart = lineNum;
        codeBlockLang = codeBlockMatch[1] || 'text';
      } else {
        // End of code block
        const blockName = codeBlockLang ? `codeblock:${codeBlockLang}` : 'codeblock';
        boundaries.push({
          type: 'function', // Use 'function' for code blocks (executable content)
          name: blockName,
          startLine: codeBlockStart,
          endLine: lineNum,
          exported: false,
        });
        inCodeBlock = false;
      }
      continue;
    }

    // Skip content inside code blocks
    if (inCodeBlock) {
      continue;
    }

    // Handle headers
    const headerMatch = line.match(/^(#{1,6})\s+(.+)$/);
    if (headerMatch) {
      const level = headerMatch[1].length;
      const title = headerMatch[2].trim();

      // Always close previous section when we encounter a new header
      // Each header defines a new section
      if (currentSection) {
        boundaries.push({
          type: 'class', // Use 'class' for sections (containers of content)
          name: currentSection.name,
          startLine: currentSection.startLine,
          endLine: lineNum - 1,
          exported: currentSection.level === 1, // Top-level headers are "exported"
        });
      }

      // Start new section
      currentSection = {
        name: title,
        level,
        startLine: lineNum,
      };
    }
  }

  // Close final section
  if (currentSection) {
    boundaries.push({
      type: 'class',
      name: currentSection.name,
      startLine: currentSection.startLine,
      endLine: lines.length,
      exported: currentSection.level === 1,
    });
  }

  // Handle unclosed code block
  if (inCodeBlock) {
    boundaries.push({
      type: 'function',
      name: codeBlockLang ? `codeblock:${codeBlockLang}` : 'codeblock',
      startLine: codeBlockStart,
      endLine: lines.length,
      exported: false,
    });
  }

  // Sort boundaries by start line
  boundaries.sort((a, b) => a.startLine - b.startLine);

  return {
    success: true,
    boundaries,
  };
}

/**
 * Check if a file is a Markdown file.
 */
export function isMarkdown(filePath: string): boolean {
  const ext = filePath.toLowerCase().split('.').pop();
  return ext === 'md' || ext === 'mdx' || ext === 'markdown' || ext === 'qmd';
}

/**
 * Get supported Markdown extensions.
 */
export function getMarkdownExtensions(): string[] {
  return ['md', 'mdx', 'markdown', 'qmd'];
}
