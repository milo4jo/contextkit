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
  constructor() {
    super(
      'No .contextkit directory found. Run "contextkit init" first.',
      'NOT_INITIALIZED'
    );
  }
}

export class SourceNotFoundError extends ContextKitError {
  constructor(name: string) {
    super(`Source "${name}" not found.`, 'SOURCE_NOT_FOUND');
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
  constructor(name: string) {
    super(`Source "${name}" already exists.`, 'SOURCE_EXISTS');
  }
}

export class AlreadyInitializedError extends ContextKitError {
  constructor() {
    super(
      'Already initialized. Use --force to reinitialize.',
      'ALREADY_INITIALIZED'
    );
  }
}

export class InvalidUsageError extends ContextKitError {
  constructor(message: string) {
    super(message, 'INVALID_USAGE');
  }
}
