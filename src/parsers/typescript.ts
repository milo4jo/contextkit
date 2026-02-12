/**
 * TypeScript/JavaScript AST Parser
 *
 * Parses TS/JS files to identify code boundaries for intelligent chunking.
 * Uses acorn for parsing JavaScript (ignores TypeScript-specific syntax).
 */

import * as acorn from 'acorn';

/** Type of code unit identified by the parser */
export type CodeUnitType = 'function' | 'class' | 'method' | 'constant' | 'block';

/** A code boundary identified by the parser */
export interface CodeBoundary {
  /** Type of code unit */
  type: CodeUnitType;
  /** Name of the unit (function name, class name, etc.) */
  name: string;
  /** Start line (1-indexed) */
  startLine: number;
  /** End line (1-indexed, inclusive) */
  endLine: number;
  /** Whether this is exported */
  exported: boolean;
}

/** Result of parsing a file */
export interface ParseResult {
  /** Whether parsing succeeded */
  success: boolean;
  /** Identified code boundaries */
  boundaries: CodeBoundary[];
  /** Error message if parsing failed */
  error?: string;
}

// ESTree node types we care about
interface BaseNode {
  type: string;
  loc?: {
    start: { line: number; column: number };
    end: { line: number; column: number };
  };
}

interface IdentifierNode extends BaseNode {
  type: 'Identifier';
  name: string;
}

interface FunctionDeclarationNode extends BaseNode {
  type: 'FunctionDeclaration';
  id: IdentifierNode | null;
}

interface ClassDeclarationNode extends BaseNode {
  type: 'ClassDeclaration';
  id: IdentifierNode | null;
  body: ClassBodyNode;
}

interface ClassBodyNode extends BaseNode {
  type: 'ClassBody';
  body: MethodDefinitionNode[];
}

interface MethodDefinitionNode extends BaseNode {
  type: 'MethodDefinition';
  key: IdentifierNode | BaseNode;
  kind: 'constructor' | 'method' | 'get' | 'set';
}

interface VariableDeclarationNode extends BaseNode {
  type: 'VariableDeclaration';
  kind: 'var' | 'let' | 'const';
  declarations: VariableDeclaratorNode[];
}

interface VariableDeclaratorNode extends BaseNode {
  type: 'VariableDeclarator';
  id: IdentifierNode | BaseNode;
}

interface ExportNamedDeclarationNode extends BaseNode {
  type: 'ExportNamedDeclaration';
  declaration: BaseNode | null;
}

interface ExportDefaultDeclarationNode extends BaseNode {
  type: 'ExportDefaultDeclaration';
  declaration: BaseNode;
}

interface ProgramNode extends BaseNode {
  type: 'Program';
  body: BaseNode[];
}

/**
 * Strip TypeScript-specific syntax to make the code parseable by acorn.
 * This is a simple preprocessing step that handles common TS patterns.
 */
function stripTypeScript(code: string): string {
  // Remove type annotations: `: Type`, `: Type[]`, `: Type<Generic>`
  // This regex handles common cases but isn't perfect for all TS syntax
  let stripped = code;

  // Remove type imports: import type { ... } from '...'
  stripped = stripped.replace(/import\s+type\s+\{[^}]*\}\s+from\s+['"][^'"]*['"];?/g, '');
  stripped = stripped.replace(/import\s+type\s+\w+\s+from\s+['"][^'"]*['"];?/g, '');

  // Remove "type" keyword in imports: import { type Foo, Bar } from '...'
  stripped = stripped.replace(/,\s*type\s+\w+/g, '');
  stripped = stripped.replace(/\{\s*type\s+\w+\s*,/g, '{');
  stripped = stripped.replace(/\{\s*type\s+\w+\s*\}/g, '{}');

  // Remove interface declarations
  stripped = stripped.replace(/interface\s+\w+(?:<[^>]*>)?\s*(?:extends[^{]*)?\{[^}]*\}/gs, '');

  // Remove type aliases
  stripped = stripped.replace(/type\s+\w+(?:<[^>]*>)?\s*=\s*[^;]+;/g, '');

  // Remove type assertions: as Type, as const
  stripped = stripped.replace(/\s+as\s+(?:const|\w+(?:<[^>]*>)?)/g, '');

  // Remove generic type parameters from functions/classes: <T, U>
  stripped = stripped.replace(/<[^<>()]*(?:<[^<>]*>[^<>()]*)*>\s*(?=\()/g, '');

  // Remove type annotations from parameters: (x: Type) => (x)
  // This is tricky - we need to be careful not to break the code
  stripped = stripped.replace(
    /:\s*\w+(?:<[^>]*>)?(?:\[\])?(?:\s*\|\s*\w+(?:<[^>]*>)?(?:\[\])?)*(?=\s*[,)=])/g,
    ''
  );

  // Remove return type annotations: ): Type {
  stripped = stripped.replace(
    /\):\s*\w+(?:<[^>]*>)?(?:\[\])?(?:\s*\|\s*\w+(?:<[^>]*>)?(?:\[\])?)*\s*(?=\{|=>)/g,
    ') '
  );

  // Remove non-null assertions: foo!.bar -> foo.bar
  stripped = stripped.replace(/!(?=\.|\[)/g, '');

  // Remove declare keyword
  stripped = stripped.replace(/declare\s+/g, '');

  // Remove readonly keyword
  stripped = stripped.replace(/readonly\s+/g, '');

  // Remove abstract keyword
  stripped = stripped.replace(/abstract\s+/g, '');

  // Remove public/private/protected modifiers
  stripped = stripped.replace(/(?:public|private|protected)\s+/g, '');

  // Remove implements clause
  stripped = stripped.replace(/implements\s+[\w,\s<>]+(?=\s*\{)/g, '');

  return stripped;
}

/**
 * Parse TypeScript/JavaScript code and extract code boundaries.
 *
 * @param content - The file content to parse
 * @param _filePath - Path to the file (for error messages, unused currently)
 * @returns Parse result with boundaries or error
 */
export function parseTypeScript(content: string, _filePath?: string): ParseResult {
  const boundaries: CodeBoundary[] = [];

  // Try to parse as JavaScript first, then try stripping TypeScript syntax
  let ast: ProgramNode;

  try {
    ast = acorn.parse(content, {
      ecmaVersion: 'latest',
      sourceType: 'module',
      locations: true,
      allowHashBang: true,
      allowAwaitOutsideFunction: true,
      allowImportExportEverywhere: true,
    }) as ProgramNode;
  } catch {
    // Try stripping TypeScript syntax and parse again
    try {
      const stripped = stripTypeScript(content);
      ast = acorn.parse(stripped, {
        ecmaVersion: 'latest',
        sourceType: 'module',
        locations: true,
        allowHashBang: true,
        allowAwaitOutsideFunction: true,
        allowImportExportEverywhere: true,
      }) as ProgramNode;
    } catch (e) {
      return {
        success: false,
        boundaries: [],
        error: e instanceof Error ? e.message : 'Parse error',
      };
    }
  }

  // Track what's been exported
  const exportedNames = new Set<string>();

  // First pass: collect exports
  for (const node of ast.body) {
    if (node.type === 'ExportNamedDeclaration') {
      const exportNode = node as ExportNamedDeclarationNode;
      if (exportNode.declaration) {
        const decl = exportNode.declaration;
        if (decl.type === 'FunctionDeclaration') {
          const fn = decl as FunctionDeclarationNode;
          if (fn.id?.name) exportedNames.add(fn.id.name);
        } else if (decl.type === 'ClassDeclaration') {
          const cls = decl as ClassDeclarationNode;
          if (cls.id?.name) exportedNames.add(cls.id.name);
        } else if (decl.type === 'VariableDeclaration') {
          const varDecl = decl as VariableDeclarationNode;
          for (const declarator of varDecl.declarations) {
            if (declarator.id.type === 'Identifier') {
              exportedNames.add((declarator.id as IdentifierNode).name);
            }
          }
        }
      }
    } else if (node.type === 'ExportDefaultDeclaration') {
      exportedNames.add('default');
    }
  }

  // Second pass: extract boundaries
  for (const node of ast.body) {
    if (!node.loc) continue;

    const startLine = node.loc.start.line;
    const endLine = node.loc.end.line;

    if (node.type === 'FunctionDeclaration') {
      const fn = node as FunctionDeclarationNode;
      const name = fn.id?.name || 'anonymous';
      boundaries.push({
        type: 'function',
        name,
        startLine,
        endLine,
        exported: exportedNames.has(name),
      });
    } else if (node.type === 'ClassDeclaration') {
      const cls = node as ClassDeclarationNode;
      const className = cls.id?.name || 'AnonymousClass';

      // Add the class itself
      boundaries.push({
        type: 'class',
        name: className,
        startLine,
        endLine,
        exported: exportedNames.has(className),
      });

      // Also add methods as separate boundaries (for large classes)
      if (cls.body?.body) {
        for (const member of cls.body.body) {
          if (member.type === 'MethodDefinition' && member.loc) {
            const method = member as MethodDefinitionNode;
            let methodName = 'anonymous';
            if (method.key.type === 'Identifier') {
              methodName = (method.key as IdentifierNode).name;
            }
            boundaries.push({
              type: 'method',
              name: `${className}.${methodName}`,
              startLine: member.loc.start.line,
              endLine: member.loc.end.line,
              exported: false,
            });
          }
        }
      }
    } else if (node.type === 'VariableDeclaration') {
      const varDecl = node as VariableDeclarationNode;

      // Only track const declarations (likely to be important exports/configs)
      if (varDecl.kind === 'const') {
        for (const declarator of varDecl.declarations) {
          if (declarator.id.type === 'Identifier') {
            const name = (declarator.id as IdentifierNode).name;
            // Check if it's an arrow function or function expression
            const init = (declarator as { init?: BaseNode }).init;
            const isFunction =
              init?.type === 'ArrowFunctionExpression' || init?.type === 'FunctionExpression';

            boundaries.push({
              type: isFunction ? 'function' : 'constant',
              name,
              startLine,
              endLine,
              exported: exportedNames.has(name),
            });
          }
        }
      }
    } else if (node.type === 'ExportNamedDeclaration') {
      const exportNode = node as ExportNamedDeclarationNode;
      if (exportNode.declaration) {
        // The declaration inside the export has already been processed above
        // due to our pre-pass. Mark the boundaries as exported.
        const decl = exportNode.declaration;

        if (decl.type === 'FunctionDeclaration') {
          const fn = decl as FunctionDeclarationNode;
          const name = fn.id?.name || 'anonymous';
          boundaries.push({
            type: 'function',
            name,
            startLine,
            endLine,
            exported: true,
          });
        } else if (decl.type === 'ClassDeclaration') {
          const cls = decl as ClassDeclarationNode;
          const className = cls.id?.name || 'AnonymousClass';
          boundaries.push({
            type: 'class',
            name: className,
            startLine,
            endLine,
            exported: true,
          });

          // Add methods
          if (cls.body?.body) {
            for (const member of cls.body.body) {
              if (member.type === 'MethodDefinition' && member.loc) {
                const method = member as MethodDefinitionNode;
                let methodName = 'anonymous';
                if (method.key.type === 'Identifier') {
                  methodName = (method.key as IdentifierNode).name;
                }
                boundaries.push({
                  type: 'method',
                  name: `${className}.${methodName}`,
                  startLine: member.loc.start.line,
                  endLine: member.loc.end.line,
                  exported: false,
                });
              }
            }
          }
        } else if (decl.type === 'VariableDeclaration') {
          const varDecl = decl as VariableDeclarationNode;
          if (varDecl.kind === 'const') {
            for (const declarator of varDecl.declarations) {
              if (declarator.id.type === 'Identifier') {
                const name = (declarator.id as IdentifierNode).name;
                const init = (declarator as { init?: BaseNode }).init;
                const isFunction =
                  init?.type === 'ArrowFunctionExpression' || init?.type === 'FunctionExpression';

                boundaries.push({
                  type: isFunction ? 'function' : 'constant',
                  name,
                  startLine,
                  endLine,
                  exported: true,
                });
              }
            }
          }
        }
      }
    } else if (node.type === 'ExportDefaultDeclaration') {
      const exportDefault = node as ExportDefaultDeclarationNode;
      const decl = exportDefault.declaration;

      let type: CodeUnitType = 'block';
      let name = 'default';

      if (decl.type === 'FunctionDeclaration' || decl.type === 'FunctionExpression') {
        type = 'function';
        if ((decl as FunctionDeclarationNode).id?.name) {
          name = (decl as FunctionDeclarationNode).id!.name;
        }
      } else if (decl.type === 'ClassDeclaration') {
        type = 'class';
        if ((decl as ClassDeclarationNode).id?.name) {
          name = (decl as ClassDeclarationNode).id!.name;
        }
      } else if (decl.type === 'ArrowFunctionExpression') {
        type = 'function';
      }

      boundaries.push({
        type,
        name,
        startLine,
        endLine,
        exported: true,
      });
    }
  }

  // Sort boundaries by start line
  boundaries.sort((a, b) => a.startLine - b.startLine);

  return {
    success: true,
    boundaries,
  };
}

/**
 * Check if a file extension is supported by this parser.
 */
export function isTypeScriptOrJavaScript(filePath: string): boolean {
  const ext = filePath.toLowerCase().split('.').pop();
  return ['ts', 'tsx', 'js', 'jsx', 'mjs', 'cjs', 'mts', 'cts'].includes(ext || '');
}
