/**
 * Custom Application Error
 *
 * Base error class for all application-specific errors.
 * Provides consistent error structure with HTTP status codes.
 */

export enum HttpStatusCode {
  OK = 200,
  CREATED = 201,
  NO_CONTENT = 204,
  BAD_REQUEST = 400,
  UNAUTHORIZED = 401,
  FORBIDDEN = 403,
  NOT_FOUND = 404,
  CONFLICT = 409,
  UNPROCESSABLE_ENTITY = 422,
  PAYLOAD_TOO_LARGE = 413,
  TOO_MANY_REQUESTS = 429,
  INTERNAL_SERVER_ERROR = 500,
  SERVICE_UNAVAILABLE = 503,
}

export interface AppErrorOptions {
  code?: string;
  status?: HttpStatusCode;
  details?: unknown;
  isOperational?: boolean;
}

export class AppError extends Error {
  public readonly code: string;
  public readonly status: HttpStatusCode;
  public readonly details?: unknown;
  public readonly isOperational: boolean;

  constructor(message: string, options: AppErrorOptions = {}) {
    super(message);

    this.name = this.constructor.name;
    this.code = options.code || 'APP_ERROR';
    this.status = options.status || HttpStatusCode.INTERNAL_SERVER_ERROR;
    this.details = options.details;
    this.isOperational = options.isOperational ?? true;

    // Maintains proper stack trace for where our error was thrown (only available on V8)
    Error.captureStackTrace(this, this.constructor);
  }

  toJSON(): Record<string, unknown> {
    // eslint-disable-next-line @typescript-eslint/no-unsafe-return
    return {
      name: this.name,
      code: this.code,
      message: this.message,
      status: this.status,
      ...(this.details && { details: this.details }),
    };
  }
}

/**
 * Pre-defined error classes for common scenarios
 */

export class BadRequestError extends AppError {
  constructor(message: string, details?: unknown) {
    super(message, {
      code: 'BAD_REQUEST',
      status: HttpStatusCode.BAD_REQUEST,
      details,
    });
  }
}

export class UnauthorizedError extends AppError {
  constructor(message: string = 'Unauthorized', details?: unknown) {
    super(message, {
      code: 'UNAUTHORIZED',
      status: HttpStatusCode.UNAUTHORIZED,
      details,
    });
  }
}

export class ForbiddenError extends AppError {
  constructor(message: string = 'Forbidden', details?: unknown) {
    super(message, {
      code: 'FORBIDDEN',
      status: HttpStatusCode.FORBIDDEN,
      details,
    });
  }
}

export class NotFoundError extends AppError {
  constructor(message: string = 'Resource not found', details?: unknown) {
    super(message, {
      code: 'NOT_FOUND',
      status: HttpStatusCode.NOT_FOUND,
      details,
    });
  }
}

export class ConflictError extends AppError {
  constructor(message: string, details?: unknown) {
    super(message, {
      code: 'CONFLICT',
      status: HttpStatusCode.CONFLICT,
      details,
    });
  }
}

export class ValidationError extends AppError {
  constructor(message: string, details?: unknown) {
    super(message, {
      code: 'VALIDATION_ERROR',
      status: HttpStatusCode.UNPROCESSABLE_ENTITY,
      details,
    });
  }
}

export class AuthenticationError extends AppError {
  constructor(message: string = 'Authentication failed', details?: unknown) {
    super(message, {
      code: 'AUTHENTICATION_ERROR',
      status: HttpStatusCode.UNAUTHORIZED,
      details,
    });
  }
}

export class TokenExpiredError extends AppError {
  constructor(message: string = 'Token has expired', details?: unknown) {
    super(message, {
      code: 'TOKEN_EXPIRED',
      status: HttpStatusCode.UNAUTHORIZED,
      details,
    });
  }
}

export class InvalidTokenError extends AppError {
  constructor(message: string = 'Invalid token', details?: unknown) {
    super(message, {
      code: 'INVALID_TOKEN',
      status: HttpStatusCode.UNAUTHORIZED,
      details,
    });
  }
}

export class TooManyRequestsError extends AppError {
  constructor(message: string = 'Too many requests', details?: unknown) {
    super(message, {
      code: 'TOO_MANY_REQUESTS',
      status: HttpStatusCode.TOO_MANY_REQUESTS,
      details,
    });
  }
}

export class PayloadTooLargeError extends AppError {
  constructor(message: string = 'Payload too large', details?: unknown) {
    super(message, {
      code: 'PAYLOAD_TOO_LARGE',
      status: HttpStatusCode.PAYLOAD_TOO_LARGE,
      details,
    });
  }
}

export class InternalServerError extends AppError {
  constructor(message: string = 'Internal server error', details?: unknown) {
    super(message, {
      code: 'INTERNAL_SERVER_ERROR',
      status: HttpStatusCode.INTERNAL_SERVER_ERROR,
      isOperational: false,
      details,
    });
  }
}
