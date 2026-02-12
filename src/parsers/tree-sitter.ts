/**
 * Tree-sitter Multi-Language Parser
 *
 * Universal AST parsing using tree-sitter WASM bindings.
 * Supports: Python, Go, Rust (and more to come)
 */

import {
  Parser as TreeSitterParser,
  Language as TreeSitterLanguage,
  Tree,
  Node,
} from 'web-tree-sitter';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import type { ParseResult, CodeBoundary } from './typescript.js';

// Cache for loaded languages
const languageCache = new Map<string, TreeSitterLanguage>();

// Parser instance (singleton)
let parserInstance: TreeSitterParser | null = null;

/** Language configuration */
interface LanguageConfig {
  /** npm package name */
  package: string;
  /** WASM file name within the package */
  wasmFile: string;
  /** Node types that represent functions */
  functionTypes: string[];
  /** Node types that represent classes */
  classTypes: string[];
  /** Node types that represent methods */
  methodTypes: string[];
  /** How to extract the name from a node */
  getNodeName: (node: Node) => string | null;
  /** How to extract the signature from a node */
  getSignature: (node: Node, content: string) => string;
  /** Check if a node is exported */
  isExported: (node: Node) => boolean;
}

/** Language configurations */
const LANGUAGE_CONFIGS: Record<string, LanguageConfig> = {
  python: {
    package: 'tree-sitter-python',
    wasmFile: 'tree-sitter-python.wasm',
    functionTypes: ['function_definition'],
    classTypes: ['class_definition'],
    methodTypes: ['function_definition'],
    getNodeName: (node: Node) => {
      const nameNode = node.childForFieldName('name');
      return nameNode?.text ?? null;
    },
    getSignature: (node: Node, content: string) => {
      const text = content.substring(node.startIndex, node.endIndex);
      const lines = text.split('\n');
      const firstLine = lines[0].trim();
      const decorators: string[] = [];
      let prev = node.previousNamedSibling;
      while (prev && prev.type === 'decorator') {
        decorators.unshift(prev.text);
        prev = prev.previousNamedSibling;
      }
      if (decorators.length > 0) {
        return decorators.join('\n') + '\n' + firstLine;
      }
      return firstLine;
    },
    isExported: () => true,
  },

  go: {
    package: 'tree-sitter-go',
    wasmFile: 'tree-sitter-go.wasm',
    functionTypes: ['function_declaration', 'method_declaration'],
    classTypes: ['type_declaration'],
    methodTypes: ['method_declaration'],
    getNodeName: (node: Node) => {
      const nameNode = node.childForFieldName('name');
      return nameNode?.text ?? null;
    },
    getSignature: (node: Node, content: string) => {
      const text = content.substring(node.startIndex, node.endIndex);
      const lines = text.split('\n');

      if (node.type === 'function_declaration' || node.type === 'method_declaration') {
        const funcLine = lines.find((l: string) => l.trim().startsWith('func'));
        if (funcLine) {
          const openBrace = funcLine.indexOf('{');
          return openBrace > 0 ? funcLine.substring(0, openBrace).trim() : funcLine.trim();
        }
      }

      if (node.type === 'type_declaration') {
        return lines[0].trim();
      }

      return lines[0].trim();
    },
    isExported: (node: Node) => {
      const nameNode = node.childForFieldName('name');
      const name = nameNode?.text;
      return name ? name[0] === name[0].toUpperCase() : false;
    },
  },

  rust: {
    package: 'tree-sitter-rust',
    wasmFile: 'tree-sitter-rust.wasm',
    functionTypes: ['function_item'],
    classTypes: ['struct_item', 'enum_item', 'trait_item', 'impl_item'],
    methodTypes: ['function_item'],
    getNodeName: (node: Node) => {
      const nameNode = node.childForFieldName('name');
      return nameNode?.text ?? null;
    },
    getSignature: (node: Node, content: string) => {
      const text = content.substring(node.startIndex, node.endIndex);
      const lines = text.split('\n');

      if (node.type === 'function_item') {
        let sig = '';
        for (const line of lines) {
          sig += line + '\n';
          if (line.includes('{')) {
            sig = sig.substring(0, sig.lastIndexOf('{'));
            break;
          }
        }
        return sig.trim();
      }

      return lines[0].trim();
    },
    isExported: (node: Node) => {
      const parent = node.parent;
      if (parent?.type === 'visibility_modifier') {
        return parent.text.includes('pub');
      }
      let prev = node.previousSibling;
      while (prev) {
        if (prev.type === 'visibility_modifier') {
          return prev.text.includes('pub');
        }
        prev = prev.previousSibling;
      }
      return false;
    },
  },

  java: {
    package: 'tree-sitter-java',
    wasmFile: 'tree-sitter-java.wasm',
    functionTypes: ['method_declaration', 'constructor_declaration'],
    classTypes: [
      'class_declaration',
      'interface_declaration',
      'enum_declaration',
      'record_declaration',
    ],
    methodTypes: ['method_declaration', 'constructor_declaration'],
    getNodeName: (node: Node) => {
      const nameNode = node.childForFieldName('name');
      return nameNode?.text ?? null;
    },
    getSignature: (node: Node, content: string) => {
      const text = content.substring(node.startIndex, node.endIndex);
      const lines = text.split('\n');

      // Get everything before the first {
      let sig = '';
      for (const line of lines) {
        sig += line + '\n';
        if (line.includes('{')) {
          sig = sig.substring(0, sig.lastIndexOf('{'));
          break;
        }
      }
      return sig.trim();
    },
    isExported: (node: Node) => {
      // Check for public modifier
      const modifiers = node.childForFieldName('modifiers');
      if (modifiers) {
        return modifiers.text.includes('public');
      }
      return false;
    },
  },

  csharp: {
    package: 'tree-sitter-c-sharp',
    wasmFile: 'tree-sitter-c_sharp.wasm',
    functionTypes: ['method_declaration', 'constructor_declaration', 'local_function_statement'],
    classTypes: [
      'class_declaration',
      'interface_declaration',
      'struct_declaration',
      'enum_declaration',
      'record_declaration',
    ],
    methodTypes: ['method_declaration', 'constructor_declaration'],
    getNodeName: (node: Node) => {
      const nameNode = node.childForFieldName('name');
      return nameNode?.text ?? null;
    },
    getSignature: (node: Node, content: string) => {
      const text = content.substring(node.startIndex, node.endIndex);
      const lines = text.split('\n');

      // Get everything before the first { or =>
      let sig = '';
      for (const line of lines) {
        sig += line + '\n';
        if (line.includes('{') || line.includes('=>')) {
          const braceIdx = line.indexOf('{');
          const arrowIdx = line.indexOf('=>');
          const idx =
            braceIdx >= 0 && arrowIdx >= 0
              ? Math.min(braceIdx, arrowIdx)
              : Math.max(braceIdx, arrowIdx);
          if (idx > 0) {
            sig = sig.substring(0, sig.lastIndexOf(line) + idx);
          }
          break;
        }
      }
      return sig.trim();
    },
    isExported: (node: Node) => {
      // Check for public modifier
      const modifiers = node.childForFieldName('modifiers');
      if (modifiers) {
        return modifiers.text.includes('public');
      }
      return false;
    },
  },

  php: {
    package: 'tree-sitter-php',
    wasmFile: 'tree-sitter-php.wasm',
    functionTypes: ['function_definition', 'method_declaration'],
    classTypes: [
      'class_declaration',
      'interface_declaration',
      'trait_declaration',
      'enum_declaration',
    ],
    methodTypes: ['method_declaration'],
    getNodeName: (node: Node) => {
      const nameNode = node.childForFieldName('name');
      return nameNode?.text ?? null;
    },
    getSignature: (node: Node, content: string) => {
      const text = content.substring(node.startIndex, node.endIndex);
      const lines = text.split('\n');

      // Get everything before the first {
      let sig = '';
      for (const line of lines) {
        sig += line + '\n';
        if (line.includes('{')) {
          sig = sig.substring(0, sig.lastIndexOf('{'));
          break;
        }
      }
      return sig.trim();
    },
    isExported: (node: Node) => {
      // PHP: public methods/functions are exported
      // Check for visibility modifier
      const modifiers = node.childForFieldName('modifiers');
      if (modifiers) {
        return modifiers.text.includes('public');
      }
      // Top-level functions are always "public"
      if (node.type === 'function_definition') {
        return true;
      }
      return false;
    },
  },
};

/** File extension to language mapping */
const EXTENSION_TO_LANGUAGE: Record<string, string> = {
  py: 'python',
  pyw: 'python',
  go: 'go',
  rs: 'rust',
  java: 'java',
  cs: 'csharp',
  php: 'php',
};

/**
 * Initialize the parser (lazy initialization)
 */
async function getParser(): Promise<TreeSitterParser> {
  if (parserInstance) return parserInstance;

  await TreeSitterParser.init();
  parserInstance = new TreeSitterParser();
  return parserInstance;
}

/**
 * Load a language grammar
 */
async function loadLanguage(languageId: string): Promise<TreeSitterLanguage | null> {
  if (languageCache.has(languageId)) {
    return languageCache.get(languageId)!;
  }

  const config = LANGUAGE_CONFIGS[languageId];
  if (!config) {
    return null;
  }

  try {
    const wasmPath = join(
      dirname(fileURLToPath(import.meta.url)),
      '..',
      '..',
      'node_modules',
      config.package,
      config.wasmFile
    );

    const language = await TreeSitterLanguage.load(wasmPath);
    languageCache.set(languageId, language);
    return language;
  } catch (error) {
    console.error(`Failed to load language ${languageId}:`, error);
    return null;
  }
}

/**
 * Get language ID from file extension
 */
export function getLanguageForFile(filePath: string): string | null {
  const ext = filePath.toLowerCase().split('.').pop();
  if (!ext) return null;
  return EXTENSION_TO_LANGUAGE[ext] ?? null;
}

/**
 * Check if tree-sitter can parse this file type
 */
export function canParseWithTreeSitter(filePath: string): boolean {
  return getLanguageForFile(filePath) !== null;
}

/**
 * Extract code boundaries from a syntax tree
 */
function extractBoundaries(tree: Tree, config: LanguageConfig): CodeBoundary[] {
  const boundaries: CodeBoundary[] = [];

  const visit = (node: Node, parentClass: string | null = null): void => {
    let boundary: CodeBoundary | null = null;

    if (config.functionTypes.includes(node.type)) {
      const name = config.getNodeName(node);
      if (name) {
        const isMethod = parentClass !== null;
        boundary = {
          type: isMethod ? 'method' : 'function',
          name: isMethod ? `${parentClass}.${name}` : name,
          startLine: node.startPosition.row + 1,
          endLine: node.endPosition.row + 1,
          exported: config.isExported(node),
        };
      }
    }

    if (config.classTypes.includes(node.type)) {
      const name = config.getNodeName(node);
      if (name) {
        boundary = {
          type: 'class',
          name,
          startLine: node.startPosition.row + 1,
          endLine: node.endPosition.row + 1,
          exported: config.isExported(node),
        };

        for (const child of node.children) {
          visit(child, name);
        }

        if (boundary) {
          boundaries.push(boundary);
        }
        return;
      }
    }

    if (boundary) {
      boundaries.push(boundary);
    }

    for (const child of node.children) {
      visit(child, parentClass);
    }
  };

  visit(tree.rootNode);
  return boundaries;
}

/**
 * Parse a file using tree-sitter
 */
export async function parseWithTreeSitter(content: string, filePath: string): Promise<ParseResult> {
  const languageId = getLanguageForFile(filePath);
  if (!languageId) {
    return {
      success: false,
      boundaries: [],
      error: `Unsupported file type: ${filePath}`,
    };
  }

  const config = LANGUAGE_CONFIGS[languageId];
  if (!config) {
    return {
      success: false,
      boundaries: [],
      error: `No configuration for language: ${languageId}`,
    };
  }

  try {
    const parser = await getParser();
    const language = await loadLanguage(languageId);

    if (!language) {
      return {
        success: false,
        boundaries: [],
        error: `Failed to load language grammar for: ${languageId}`,
      };
    }

    parser.setLanguage(language);
    const tree = parser.parse(content);

    if (!tree) {
      return {
        success: false,
        boundaries: [],
        error: `Failed to parse file: ${filePath}`,
      };
    }

    const boundaries = extractBoundaries(tree, config);

    return {
      success: true,
      boundaries,
    };
  } catch (error) {
    return {
      success: false,
      boundaries: [],
      error: error instanceof Error ? error.message : String(error),
    };
  }
}

/**
 * Generate a repo map (signatures only) from a parsed file
 */
export async function generateRepoMap(
  fileContent: string,
  filePath: string
): Promise<{ success: boolean; map: string; error?: string }> {
  const languageId = getLanguageForFile(filePath);
  if (!languageId) {
    return {
      success: false,
      map: '',
      error: `Unsupported file type: ${filePath}`,
    };
  }

  const config = LANGUAGE_CONFIGS[languageId];
  if (!config) {
    return {
      success: false,
      map: '',
      error: `No configuration for language: ${languageId}`,
    };
  }

  try {
    const parser = await getParser();
    const language = await loadLanguage(languageId);

    if (!language) {
      return {
        success: false,
        map: '',
        error: `Failed to load language grammar for: ${languageId}`,
      };
    }

    parser.setLanguage(language);
    const tree = parser.parse(fileContent);

    if (!tree) {
      return {
        success: false,
        map: '',
        error: `Failed to parse file: ${filePath}`,
      };
    }

    const lines: string[] = [];
    const addSignature = (node: Node, indent: number = 0): void => {
      const prefix = '│ '.repeat(indent);

      if (config.functionTypes.includes(node.type) || config.methodTypes.includes(node.type)) {
        const sig = config.getSignature(node, fileContent);
        const exported = config.isExported(node);
        const exportPrefix = exported ? '' : '(private) ';
        lines.push(`${prefix}${exportPrefix}${sig}`);
      }

      if (config.classTypes.includes(node.type)) {
        const sig = config.getSignature(node, fileContent);
        const exported = config.isExported(node);
        const exportPrefix = exported ? '' : '(private) ';
        lines.push(`${prefix}${exportPrefix}${sig}`);

        for (const child of node.children) {
          addSignature(child, indent + 1);
        }
        return;
      }

      for (const child of node.children) {
        addSignature(child, indent);
      }
    };

    addSignature(tree.rootNode);

    return {
      success: true,
      map: lines.join('\n'),
    };
  } catch (error) {
    return {
      success: false,
      map: '',
      error: error instanceof Error ? error.message : String(error),
    };
  }
}

/** Get list of supported languages */
export function getSupportedTreeSitterLanguages(): string[] {
  return Object.keys(LANGUAGE_CONFIGS);
}

/** Get file extensions supported by tree-sitter */
export function getTreeSitterExtensions(): string[] {
  return Object.keys(EXTENSION_TO_LANGUAGE);
}
