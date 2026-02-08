/**
 * Custom error classes for ContextKit
 * Based on ARCHITECTURE.md specification
 */

export class ContextKitError extends Error {
  readonly code: string;
  readonly recoverable: boolean;

  constructor(message: string, code: string, recoverable = false) {
    super(message);
    this.name = 'ContextKitError';
    this.code = code;
    this.recoverable = recoverable;
  }
}

export class NotInitializedError extends ContextKitError {
  readonly suggestion = 'contextkit init';

  constructor() {
    super(
      'Not initialized. Run `contextkit init` to set up ContextKit in this directory.',
      'NOT_INITIALIZED'
    );
  }
}

export class SourceNotFoundError extends ContextKitError {
  readonly suggestion = 'contextkit source list';

  constructor(name: string) {
    super(
      `Source "${name}" not found. Run \`contextkit source list\` to see available sources.`,
      'SOURCE_NOT_FOUND'
    );
  }
}

export class PathNotFoundError extends ContextKitError {
  constructor(path: string, suggestion?: string) {
    const msg = suggestion
      ? `Path "${path}" not found. Did you mean "${suggestion}"?`
      : `Path "${path}" not found.`;
    super(msg, 'PATH_NOT_FOUND');
  }
}

export class SourceExistsError extends ContextKitError {
  constructor(name: string, existingPath?: string) {
    const hint = existingPath ? ` It points to "${existingPath}".` : '';
    super(
      `Source "${name}" already exists.${hint} Use a different name or remove it first with \`contextkit source remove ${name}\`.`,
      'SOURCE_EXISTS'
    );
  }
}

export class AlreadyInitializedError extends ContextKitError {
  constructor() {
    super('Already initialized. Use --force to reinitialize.', 'ALREADY_INITIALIZED');
  }
}

export class InvalidUsageError extends ContextKitError {
  constructor(message: string) {
    super(message, 'INVALID_USAGE');
  }
}

export class IndexEmptyError extends ContextKitError {
  constructor() {
    super(
      'Index is empty. Run `contextkit index` after adding sources.',
      'INDEX_EMPTY',
      true // recoverable
    );
  }
}

export class NoSourcesError extends ContextKitError {
  constructor() {
    super(
      'No sources configured. Add sources with `contextkit source add ./src`',
      'NO_SOURCES',
      true
    );
  }
}

export class EmbeddingError extends ContextKitError {
  constructor(detail?: string) {
    const msg = detail
      ? `Embedding generation failed: ${detail}`
      : 'Embedding generation failed. Try `contextkit index --force` to rebuild.';
    super(msg, 'EMBEDDING_ERROR', true);
  }
}

export class QueryError extends ContextKitError {
  constructor(message: string) {
    super(
      `Query failed: ${message}. Run \`contextkit doctor\` to diagnose.`,
      'QUERY_ERROR',
      true
    );
  }
}

export class DatabaseError extends ContextKitError {
  constructor(operation: string, detail?: string) {
    const msg = detail
      ? `Database ${operation} failed: ${detail}`
      : `Database ${operation} failed. Try removing .contextkit/index.db and re-indexing.`;
    super(msg, 'DATABASE_ERROR');
  }
}
