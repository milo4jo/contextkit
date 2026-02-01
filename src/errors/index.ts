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
