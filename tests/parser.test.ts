/**
 * Parser Tests
 *
 * Tests for the AST parsing functionality.
 */

import { describe, it, expect } from 'vitest';
import {
  parseTypeScript,
  isTypeScriptOrJavaScript,
} from '../src/parsers/typescript.js';
import { parseFile, canParse, getSupportedExtensions } from '../src/parsers/index.js';

describe('TypeScript Parser', () => {
  describe('parseTypeScript', () => {
    it('should parse a simple function declaration', () => {
      const code = `function hello() {
  return "world";
}`;
      const result = parseTypeScript(code);

      expect(result.success).toBe(true);
      expect(result.boundaries).toHaveLength(1);
      expect(result.boundaries[0]).toMatchObject({
        type: 'function',
        name: 'hello',
        startLine: 1,
        endLine: 3,
        exported: false,
      });
    });

    it('should parse an exported function', () => {
      const code = `export function greet(name) {
  return "Hello, " + name;
}`;
      const result = parseTypeScript(code);

      expect(result.success).toBe(true);
      expect(result.boundaries).toHaveLength(1);
      expect(result.boundaries[0]).toMatchObject({
        type: 'function',
        name: 'greet',
        exported: true,
      });
    });

    it('should parse a class with methods', () => {
      const code = `class Calculator {
  constructor() {
    this.value = 0;
  }

  add(x) {
    this.value += x;
    return this;
  }

  getValue() {
    return this.value;
  }
}`;
      const result = parseTypeScript(code);

      expect(result.success).toBe(true);

      // Should have class and methods
      const classB = result.boundaries.find((b) => b.type === 'class');
      expect(classB).toBeDefined();
      expect(classB?.name).toBe('Calculator');

      const methods = result.boundaries.filter((b) => b.type === 'method');
      expect(methods.length).toBe(3); // constructor, add, getValue
    });

    it('should parse const declarations', () => {
      const code = `const CONFIG = {
  apiUrl: "https://api.example.com",
  timeout: 5000,
};

const helper = (x) => x * 2;`;
      const result = parseTypeScript(code);

      expect(result.success).toBe(true);

      const config = result.boundaries.find((b) => b.name === 'CONFIG');
      expect(config).toBeDefined();
      expect(config?.type).toBe('constant');

      const helper = result.boundaries.find((b) => b.name === 'helper');
      expect(helper).toBeDefined();
      expect(helper?.type).toBe('function'); // Arrow function
    });

    it('should parse export default', () => {
      const code = `export default function main() {
  console.log("main");
}`;
      const result = parseTypeScript(code);

      expect(result.success).toBe(true);
      expect(result.boundaries).toHaveLength(1);
      expect(result.boundaries[0]).toMatchObject({
        type: 'function',
        name: 'main',
        exported: true,
      });
    });

    it('should handle TypeScript type annotations', () => {
      const code = `function add(a: number, b: number): number {
  return a + b;
}

interface Config {
  apiUrl: string;
}

type Handler = (event: Event) => void;`;
      const result = parseTypeScript(code);

      // Should succeed (either by parsing JS-only parts or stripping TS)
      expect(result.success).toBe(true);

      // Should find the function
      const fn = result.boundaries.find((b) => b.type === 'function');
      expect(fn).toBeDefined();
      expect(fn?.name).toBe('add');
    });

    it('should handle malformed code gracefully', () => {
      const code = `function broken( {
  this is not valid javascript at all!!!
  {{{{ missing closing braces`;
      const result = parseTypeScript(code);

      // Should fail gracefully
      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
      expect(result.boundaries).toEqual([]);
    });

    it('should handle empty file', () => {
      const result = parseTypeScript('');

      expect(result.success).toBe(true);
      expect(result.boundaries).toEqual([]);
    });

    it('should parse multiple functions', () => {
      const code = `function first() {
  return 1;
}

function second() {
  return 2;
}

function third() {
  return 3;
}`;
      const result = parseTypeScript(code);

      expect(result.success).toBe(true);
      expect(result.boundaries).toHaveLength(3);

      const names = result.boundaries.map((b) => b.name);
      expect(names).toContain('first');
      expect(names).toContain('second');
      expect(names).toContain('third');
    });

    it('should preserve line numbers correctly', () => {
      const code = `// Comment at top
import { foo } from './foo';

export function myFunction() {
  return foo();
}

// More comments
const x = 1;`;
      const result = parseTypeScript(code);

      expect(result.success).toBe(true);

      const fn = result.boundaries.find((b) => b.name === 'myFunction');
      expect(fn).toBeDefined();
      expect(fn?.startLine).toBe(4);
      expect(fn?.endLine).toBe(6);
    });
  });

  describe('isTypeScriptOrJavaScript', () => {
    it('should return true for TypeScript files', () => {
      expect(isTypeScriptOrJavaScript('file.ts')).toBe(true);
      expect(isTypeScriptOrJavaScript('file.tsx')).toBe(true);
      expect(isTypeScriptOrJavaScript('file.mts')).toBe(true);
      expect(isTypeScriptOrJavaScript('file.cts')).toBe(true);
    });

    it('should return true for JavaScript files', () => {
      expect(isTypeScriptOrJavaScript('file.js')).toBe(true);
      expect(isTypeScriptOrJavaScript('file.jsx')).toBe(true);
      expect(isTypeScriptOrJavaScript('file.mjs')).toBe(true);
      expect(isTypeScriptOrJavaScript('file.cjs')).toBe(true);
    });

    it('should return false for other files', () => {
      expect(isTypeScriptOrJavaScript('file.py')).toBe(false);
      expect(isTypeScriptOrJavaScript('file.rs')).toBe(false);
      expect(isTypeScriptOrJavaScript('file.go')).toBe(false);
      expect(isTypeScriptOrJavaScript('file.md')).toBe(false);
    });
  });
});

describe('Parser Registry', () => {
  describe('canParse', () => {
    it('should return true for supported extensions', () => {
      expect(canParse('test.ts')).toBe(true);
      expect(canParse('test.js')).toBe(true);
      expect(canParse('src/utils/helper.tsx')).toBe(true);
    });

    it('should return true for tree-sitter supported extensions', () => {
      expect(canParse('test.py')).toBe(true);
      expect(canParse('test.rs')).toBe(true);
      expect(canParse('test.go')).toBe(true);
    });

    it('should return false for unsupported extensions', () => {
      expect(canParse('README.md')).toBe(false);
      expect(canParse('data.json')).toBe(false);
      expect(canParse('styles.css')).toBe(false);
    });
  });

  describe('parseFile', () => {
    it('should parse TypeScript files', () => {
      const code = `export const value = 42;`;
      const result = parseFile(code, 'test.ts');

      expect(result.success).toBe(true);
      expect(result.boundaries.length).toBeGreaterThan(0);
    });

    it('should indicate async parsing needed for tree-sitter files', () => {
      const code = `print("hello")`;
      const result = parseFile(code, 'test.py');

      // Python requires async parsing via parseFileAsync
      expect(result.success).toBe(false);
      expect(result.error).toContain('async parsing');
    });

    it('should return failure for truly unsupported files', () => {
      const code = `# Some markdown content`;
      const result = parseFile(code, 'README.md');

      expect(result.success).toBe(false);
      expect(result.error).toContain('No parser available');
    });
  });

  describe('getSupportedExtensions', () => {
    it('should return list of supported extensions', () => {
      const extensions = getSupportedExtensions();

      expect(extensions).toContain('ts');
      expect(extensions).toContain('js');
      expect(extensions).toContain('tsx');
      expect(extensions).toContain('jsx');
    });
  });
});
