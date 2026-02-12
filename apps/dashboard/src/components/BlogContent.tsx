"use client";

import { CodeBlock, InlineCode } from "./CodeBlock";
import React from "react";

interface BlogContentProps {
  content: string;
}

export function BlogContent({ content }: BlogContentProps) {
  const elements = renderContent(content);
  return <div className="prose prose-invert max-w-none">{elements}</div>;
}

function renderContent(content: string): React.ReactNode[] {
  const lines = content.split("\n");
  const elements: React.ReactNode[] = [];
  let inCodeBlock = false;
  let codeContent: string[] = [];
  let codeLanguage = "";

  lines.forEach((line, i) => {
    // Code block start
    if (line.startsWith("```") && !inCodeBlock) {
      inCodeBlock = true;
      codeLanguage = line.slice(3).trim() || "bash";
      codeContent = [];
      return;
    }

    // Code block end
    if (line.startsWith("```") && inCodeBlock) {
      inCodeBlock = false;
      const lang = mapLanguage(codeLanguage);
      elements.push(
        <div key={`code-${i}`} className="my-4">
          <CodeBlock
            code={codeContent.join("\n")}
            language={lang}
            showCopy={true}
          />
        </div>
      );
      return;
    }

    // Inside code block
    if (inCodeBlock) {
      codeContent.push(line);
      return;
    }

    // Headers
    if (line.startsWith("## ")) {
      elements.push(
        <h2 key={i} className="text-xl font-semibold mt-8 mb-4 text-white">
          {line.slice(3)}
        </h2>
      );
      return;
    }

    if (line.startsWith("### ")) {
      elements.push(
        <h3 key={i} className="text-lg font-semibold mt-6 mb-3 text-white">
          {line.slice(4)}
        </h3>
      );
      return;
    }

    // Blockquote
    if (line.startsWith("> ")) {
      elements.push(
        <blockquote
          key={i}
          className="border-l-2 border-neutral-700 pl-4 my-4 text-neutral-400 italic"
        >
          {line.slice(2)}
        </blockquote>
      );
      return;
    }

    // List items
    if (line.startsWith("- ")) {
      elements.push(
        <li key={i} className="ml-4 text-neutral-300">
          {renderInlineFormatting(line.slice(2))}
        </li>
      );
      return;
    }

    // Empty line = paragraph break
    if (line.trim() === "") {
      elements.push(<div key={i} className="h-4" />);
      return;
    }

    // Regular paragraph
    elements.push(
      <p key={i} className="text-neutral-300 leading-relaxed">
        {renderInlineFormatting(line)}
      </p>
    );
  });

  return elements;
}

function mapLanguage(
  lang: string
): "bash" | "html" | "javascript" | "typescript" | "json" | "url" {
  const map: Record<string, "bash" | "html" | "javascript" | "typescript" | "json" | "url"> = {
    bash: "bash",
    sh: "bash",
    shell: "bash",
    zsh: "bash",
    html: "html",
    js: "javascript",
    javascript: "javascript",
    ts: "typescript",
    typescript: "typescript",
    json: "json",
    url: "url",
  };
  return map[lang.toLowerCase()] || "bash";
}

function renderInlineFormatting(text: string): React.ReactNode {
  const parts: React.ReactNode[] = [];
  let remaining = text;
  let key = 0;

  // Process the text iteratively
  while (remaining.length > 0) {
    // Bold (**text**)
    const boldMatch = remaining.match(/^\*\*([^*]+)\*\*/);
    if (boldMatch) {
      parts.push(
        <strong key={key++} className="text-white font-medium">
          {boldMatch[1]}
        </strong>
      );
      remaining = remaining.slice(boldMatch[0].length);
      continue;
    }

    // Inline code (`code`)
    const codeMatch = remaining.match(/^`([^`]+)`/);
    if (codeMatch) {
      parts.push(<InlineCode key={key++}>{codeMatch[1]}</InlineCode>);
      remaining = remaining.slice(codeMatch[0].length);
      continue;
    }

    // Emphasis (*text* or _text_)
    const emMatch = remaining.match(/^[*_]([^*_]+)[*_]/);
    if (emMatch) {
      parts.push(
        <em key={key++} className="text-neutral-200">
          {emMatch[1]}
        </em>
      );
      remaining = remaining.slice(emMatch[0].length);
      continue;
    }

    // Regular text until next special character
    const nextSpecial = remaining.search(/[*`_]/);
    if (nextSpecial === -1) {
      parts.push(<span key={key++}>{remaining}</span>);
      break;
    } else if (nextSpecial === 0) {
      // Special char at start but didn't match pattern, treat as regular
      parts.push(<span key={key++}>{remaining[0]}</span>);
      remaining = remaining.slice(1);
    } else {
      parts.push(<span key={key++}>{remaining.slice(0, nextSpecial)}</span>);
      remaining = remaining.slice(nextSpecial);
    }
  }

  return parts;
}
