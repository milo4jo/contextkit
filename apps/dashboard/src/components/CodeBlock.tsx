"use client";

import { useState, ReactNode } from "react";

interface CodeBlockProps {
  code: string;
  language?: "bash" | "html" | "javascript" | "typescript" | "json" | "url";
  showCopy?: boolean;
}

// Vercel-inspired color palette
const colors = {
  background: "#0a0a0a",
  border: "#262626",
  text: "#e5e5e5",
  comment: "#6b7280",
  keyword: "#c084fc",     // purple-400
  string: "#fbbf24",      // amber-400
  property: "#60a5fa",    // blue-400
  tag: "#f472b6",         // pink-400
  attribute: "#34d399",   // emerald-400
  operator: "#9ca3af",    // gray-400
  number: "#fb923c",      // orange-400
};

function highlightBash(code: string): ReactNode[] {
  return code.split("\n").map((line, i) => {
    const parts: ReactNode[] = [];
    let remaining = line;
    let key = 0;

    // Comments
    if (remaining.trim().startsWith("#")) {
      return <span key={i} style={{ color: colors.comment }}>{line}{"\n"}</span>;
    }

    // Command at start
    const cmdMatch = remaining.match(/^(\s*)(curl|npm|npx|git|cd|echo|export)\b/);
    if (cmdMatch) {
      parts.push(<span key={key++}>{cmdMatch[1]}</span>);
      parts.push(<span key={key++} style={{ color: colors.keyword }}>{cmdMatch[2]}</span>);
      remaining = remaining.slice(cmdMatch[0].length);
    }

    // Flags
    remaining = remaining.replace(/(\s)(--?\w[\w-]*)/g, (_, space, flag) => {
      parts.push(<span key={key++}>{space}</span>);
      parts.push(<span key={key++} style={{ color: colors.property }}>{flag}</span>);
      return "";
    });

    // Strings
    remaining = remaining.replace(/(["'])([^"']*)\1/g, (match) => {
      parts.push(<span key={key++} style={{ color: colors.string }}>{match}</span>);
      return "";
    });

    // URLs
    remaining = remaining.replace(/(https?:\/\/[^\s"']+)/g, (url) => {
      parts.push(<span key={key++} style={{ color: colors.string }}>{url}</span>);
      return "";
    });

    if (remaining) {
      parts.push(<span key={key++}>{remaining}</span>);
    }

    return <span key={i}>{parts}{"\n"}</span>;
  });
}

function highlightHTML(code: string): ReactNode[] {
  const parts: ReactNode[] = [];
  let key = 0;
  
  // Simple regex-based highlighting
  const regex = /(<\/?)([\w-]+)([^>]*)(\/?>)|([^<]+)/g;
  let match;
  
  while ((match = regex.exec(code)) !== null) {
    if (match[1]) {
      // Tag
      parts.push(<span key={key++} style={{ color: colors.operator }}>{match[1]}</span>);
      parts.push(<span key={key++} style={{ color: colors.tag }}>{match[2]}</span>);
      
      // Attributes
      if (match[3]) {
        const attrStr = match[3];
        const attrParts = attrStr.split(/(\w+)=("[^"]*"|'[^']*'|\{[^}]*\})/g);
        attrParts.forEach((part, i) => {
          if (i % 3 === 1) {
            // Attribute name
            parts.push(<span key={key++} style={{ color: colors.attribute }}> {part}</span>);
          } else if (i % 3 === 2) {
            // Attribute value
            parts.push(<span key={key++} style={{ color: colors.operator }}>=</span>);
            parts.push(<span key={key++} style={{ color: colors.string }}>{part}</span>);
          } else if (part.trim()) {
            parts.push(<span key={key++}>{part}</span>);
          }
        });
      }
      
      parts.push(<span key={key++} style={{ color: colors.operator }}>{match[4]}</span>);
    } else if (match[5]) {
      // Text content
      parts.push(<span key={key++}>{match[5]}</span>);
    }
  }
  
  return parts;
}

function highlightJS(code: string): ReactNode[] {
  const parts: ReactNode[] = [];
  let key = 0;
  
  const lines = code.split("\n");
  
  lines.forEach((line, lineIndex) => {
    let remaining = line;
    const lineParts: ReactNode[] = [];
    
    // Comments
    if (remaining.trim().startsWith("//")) {
      lineParts.push(<span key={key++} style={{ color: colors.comment }}>{line}</span>);
    } else {
      // Keywords
      remaining = remaining.replace(
        /\b(const|let|var|function|return|if|else|for|while|import|export|from|async|await|new|class|extends)\b/g,
        (kw) => `§KW§${kw}§/KW§`
      );
      
      // Strings
      remaining = remaining.replace(
        /(["'`])(?:(?!\1)[^\\]|\\.)*\1/g,
        (str) => `§STR§${str}§/STR§`
      );
      
      // Properties/methods
      remaining = remaining.replace(
        /\.(\w+)/g,
        (_, prop) => `.§PROP§${prop}§/PROP§`
      );
      
      // Numbers
      remaining = remaining.replace(
        /\b(\d+)\b/g,
        (num) => `§NUM§${num}§/NUM§`
      );
      
      // Parse markers
      const tokens = remaining.split(/(§\/?(?:KW|STR|PROP|NUM)§)/);
      let currentStyle: React.CSSProperties | undefined;
      
      tokens.forEach((token) => {
        if (token === "§KW§") currentStyle = { color: colors.keyword };
        else if (token === "§STR§") currentStyle = { color: colors.string };
        else if (token === "§PROP§") currentStyle = { color: colors.property };
        else if (token === "§NUM§") currentStyle = { color: colors.number };
        else if (token.startsWith("§/")) currentStyle = undefined;
        else if (token) {
          lineParts.push(
            <span key={key++} style={currentStyle}>{token}</span>
          );
        }
      });
    }
    
    parts.push(<span key={`line-${lineIndex}`}>{lineParts}{lineIndex < lines.length - 1 ? "\n" : ""}</span>);
  });
  
  return parts;
}

function highlightURL(code: string): ReactNode[] {
  const parts: ReactNode[] = [];
  let key = 0;
  
  // Split URL into parts
  const urlMatch = code.match(/^(https?:\/\/)([^/?]+)(\/[^?]*)?\??(.*)$/);
  
  if (urlMatch) {
    const [, protocol, host, path, query] = urlMatch;
    
    parts.push(<span key={key++} style={{ color: colors.comment }}>{protocol}</span>);
    parts.push(<span key={key++} style={{ color: colors.text }}>{host}</span>);
    if (path) {
      parts.push(<span key={key++} style={{ color: colors.property }}>{path}</span>);
    }
    if (query) {
      parts.push(<span key={key++} style={{ color: colors.operator }}>?</span>);
      const params = query.split("&");
      params.forEach((param, i) => {
        const [name, value] = param.split("=");
        if (i > 0) parts.push(<span key={key++} style={{ color: colors.operator }}>&</span>);
        parts.push(<span key={key++} style={{ color: colors.attribute }}>{name}</span>);
        if (value !== undefined) {
          parts.push(<span key={key++} style={{ color: colors.operator }}>=</span>);
          parts.push(<span key={key++} style={{ color: colors.string }}>{value}</span>);
        }
      });
    }
  } else {
    parts.push(<span key={key++}>{code}</span>);
  }
  
  return parts;
}

export function CodeBlock({ code, language = "bash", showCopy = true }: CodeBlockProps) {
  const [copied, setCopied] = useState(false);
  
  const handleCopy = () => {
    navigator.clipboard.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };
  
  let highlighted: ReactNode[];
  
  switch (language) {
    case "bash":
      highlighted = highlightBash(code);
      break;
    case "html":
      highlighted = highlightHTML(code);
      break;
    case "javascript":
    case "typescript":
      highlighted = highlightJS(code);
      break;
    case "url":
      highlighted = highlightURL(code);
      break;
    case "json":
      highlighted = highlightJS(code); // JSON uses similar highlighting
      break;
    default:
      highlighted = [<span key={0}>{code}</span>];
  }
  
  return (
    <div className="relative group">
      <pre 
        className="rounded-lg p-4 overflow-x-auto text-sm font-mono"
        style={{ 
          backgroundColor: colors.background,
          border: `1px solid ${colors.border}`,
          color: colors.text,
        }}
      >
        <code>{highlighted}</code>
      </pre>
      
      {showCopy && (
        <button
          onClick={handleCopy}
          className="absolute top-2 right-2 px-2 py-1 rounded text-xs opacity-0 group-hover:opacity-100 transition-opacity"
          style={{ 
            backgroundColor: colors.border,
            color: colors.text,
          }}
        >
          {copied ? "Copied!" : "Copy"}
        </button>
      )}
    </div>
  );
}

// Inline code component for consistency
export function InlineCode({ children }: { children: React.ReactNode }) {
  return (
    <code 
      className="px-1.5 py-0.5 rounded text-sm font-mono"
      style={{ 
        backgroundColor: "#1a1a1a",
        color: "#e5e5e5",
      }}
    >
      {children}
    </code>
  );
}
