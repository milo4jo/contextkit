/**
 * Import Parser Tests
 */

import { describe, it, expect } from 'vitest';
import {
  parseImports,
  extractImportSpecifiers,
  isJsTsFile,
  classifyImportType,
} from '../src/retrieval/imports.js';

describe('parseImports', () => {
  describe('ES6 named imports', () => {
    it('should parse named imports', () => {
      const code = `import { foo, bar } from './utils';`;
      const imports = parseImports(code);

      expect(imports).toHaveLength(1);
      expect(imports[0].specifier).toBe('./utils');
      expect(imports[0].type).toBe('relative');
      expect(imports[0].namedImports).toEqual(['foo', 'bar']);
    });

    it('should parse named imports with aliases', () => {
      const code = `import { foo as f, bar as b } from './utils';`;
      const imports = parseImports(code);

      expect(imports).toHaveLength(1);
      expect(imports[0].namedImports).toEqual(['foo', 'bar']);
    });

    it('should parse type-only imports', () => {
      const code = `import type { Foo, Bar } from './types';`;
      const imports = parseImports(code);

      expect(imports).toHaveLength(1);
      expect(imports[0].isTypeOnly).toBe(true);
      expect(imports[0].namedImports).toEqual(['Foo', 'Bar']);
    });
  });

  describe('ES6 default imports', () => {
    it('should parse default imports', () => {
      const code = `import React from 'react';`;
      const imports = parseImports(code);

      expect(imports).toHaveLength(1);
      expect(imports[0].specifier).toBe('react');
      expect(imports[0].type).toBe('package');
      expect(imports[0].defaultImport).toBe('React');
    });

    it('should parse default + named imports', () => {
      const code = `import React, { useState, useEffect } from 'react';`;
      const imports = parseImports(code);

      expect(imports).toHaveLength(1);
      expect(imports[0].defaultImport).toBe('React');
      expect(imports[0].namedImports).toEqual(['useState', 'useEffect']);
    });
  });

  describe('ES6 namespace imports', () => {
    it('should parse namespace imports', () => {
      const code = `import * as utils from './utils';`;
      const imports = parseImports(code);

      expect(imports).toHaveLength(1);
      expect(imports[0].specifier).toBe('./utils');
      expect(imports[0].defaultImport).toBe('utils');
    });
  });

  describe('side-effect imports', () => {
    it('should parse side-effect only imports', () => {
      const code = `import './polyfills';`;
      const imports = parseImports(code);

      expect(imports).toHaveLength(1);
      expect(imports[0].specifier).toBe('./polyfills');
      expect(imports[0].type).toBe('relative');
    });
  });

  describe('export from', () => {
    it('should parse export...from', () => {
      const code = `export { foo, bar } from './utils';`;
      const imports = parseImports(code);

      expect(imports).toHaveLength(1);
      expect(imports[0].specifier).toBe('./utils');
    });

    it('should parse export * from', () => {
      const code = `export * from './utils';`;
      const imports = parseImports(code);

      expect(imports).toHaveLength(1);
      expect(imports[0].specifier).toBe('./utils');
    });
  });

  describe('CommonJS require', () => {
    it('should parse require()', () => {
      const code = `const fs = require('fs');`;
      const imports = parseImports(code);

      expect(imports).toHaveLength(1);
      expect(imports[0].specifier).toBe('fs');
      expect(imports[0].type).toBe('package');
    });

    it('should parse require() with relative path', () => {
      const code = `const utils = require('./utils');`;
      const imports = parseImports(code);

      expect(imports).toHaveLength(1);
      expect(imports[0].specifier).toBe('./utils');
      expect(imports[0].type).toBe('relative');
    });
  });

  describe('dynamic import', () => {
    it('should parse dynamic import()', () => {
      const code = `const module = await import('./module');`;
      const imports = parseImports(code);

      expect(imports).toHaveLength(1);
      expect(imports[0].specifier).toBe('./module');
    });

    it('should parse dynamic import without await', () => {
      const code = `import('./module').then(m => m.default);`;
      const imports = parseImports(code);

      expect(imports).toHaveLength(1);
      expect(imports[0].specifier).toBe('./module');
    });
  });

  describe('multiple imports', () => {
    it('should parse multiple import statements', () => {
      const code = `
import { foo } from './foo';
import bar from './bar';
import * as utils from './utils';
const fs = require('fs');
`;
      const imports = parseImports(code);

      expect(imports).toHaveLength(4);
      expect(imports.map((i) => i.specifier)).toEqual([
        './foo',
        './bar',
        './utils',
        'fs',
      ]);
    });
  });

  describe('line numbers', () => {
    it('should track line numbers correctly', () => {
      const code = `
import { foo } from './foo';

import { bar } from './bar';
`;
      const imports = parseImports(code);

      expect(imports[0].line).toBe(2);
      expect(imports[1].line).toBe(4);
    });
  });
});

describe('extractImportSpecifiers', () => {
  it('should extract all import specifiers quickly', () => {
    const code = `
import { foo } from './foo';
import bar from 'bar';
const x = require('lodash');
`;
    const specifiers = extractImportSpecifiers(code);

    expect(specifiers).toContain('./foo');
    expect(specifiers).toContain('bar');
    expect(specifiers).toContain('lodash');
  });
});

describe('isJsTsFile', () => {
  it('should return true for TypeScript files', () => {
    expect(isJsTsFile('foo.ts')).toBe(true);
    expect(isJsTsFile('foo.tsx')).toBe(true);
  });

  it('should return true for JavaScript files', () => {
    expect(isJsTsFile('foo.js')).toBe(true);
    expect(isJsTsFile('foo.jsx')).toBe(true);
    expect(isJsTsFile('foo.mjs')).toBe(true);
    expect(isJsTsFile('foo.cjs')).toBe(true);
  });

  it('should return false for other files', () => {
    expect(isJsTsFile('foo.py')).toBe(false);
    expect(isJsTsFile('foo.json')).toBe(false);
    expect(isJsTsFile('foo.md')).toBe(false);
  });
});

describe('import type classification', () => {
  it('should classify relative imports', () => {
    expect(classifyImportType('./foo')).toBe('relative');
    expect(classifyImportType('../bar')).toBe('relative');
    expect(classifyImportType('./nested/path')).toBe('relative');
  });

  it('should classify absolute imports', () => {
    expect(classifyImportType('/absolute/path')).toBe('absolute');
    expect(classifyImportType('C:\\windows\\path')).toBe('absolute');
  });

  it('should classify package imports', () => {
    expect(classifyImportType('react')).toBe('package');
    expect(classifyImportType('lodash')).toBe('package');
    expect(classifyImportType('@scope/package')).toBe('package');
  });
});
