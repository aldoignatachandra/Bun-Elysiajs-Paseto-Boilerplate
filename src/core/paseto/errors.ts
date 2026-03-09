/**
 * PASETO Error Classes
 *
 * Custom error classes for PASETO operations
 */

export class PasetoError extends Error {
  constructor(
    message: string,
    public code: string
  ) {
    super(message);
    this.name = 'PasetoError';
  }
}

export class TokenValidationError extends PasetoError {
  constructor(message: string) {
    super(message, 'TOKEN_VALIDATION_ERROR');
    this.name = 'TokenValidationError';
  }
}

export class TokenExpiredError extends PasetoError {
  constructor() {
    super('Token has expired', 'TOKEN_EXPIRED');
    this.name = 'TokenExpiredError';
  }
}

export class InvalidTokenPayloadError extends PasetoError {
  constructor(message: string) {
    super(message, 'INVALID_PAYLOAD');
    this.name = 'InvalidTokenPayloadError';
  }
}

export class KeyConfigError extends PasetoError {
  constructor(message: string) {
    super(message, 'KEY_CONFIG_ERROR');
    this.name = 'KeyConfigError';
  }
}
