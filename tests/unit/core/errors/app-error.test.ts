/* eslint-disable @typescript-eslint/no-explicit-any */
import { describe, it, expect } from 'bun:test';
import {
  AppError,
  HttpStatusCode,
  BadRequestError,
  UnauthorizedError,
  ForbiddenError,
  NotFoundError,
  ConflictError,
  ValidationError,
  AuthenticationError,
  TokenExpiredError,
  InvalidTokenError,
  TooManyRequestsError,
  PayloadTooLargeError,
  InternalServerError,
} from '../../../../src/core/errors/app-error';

describe('AppError', () => {
  it('should create error with default options', () => {
    const error = new AppError('Test error');

    expect(error.message).toBe('Test error');
    expect(error.name).toBe('AppError');
    expect(error.code).toBe('APP_ERROR');
    expect(error.status).toBe(HttpStatusCode.INTERNAL_SERVER_ERROR);
    expect(error.isOperational).toBe(true);
  });

  it('should create error with custom options', () => {
    const error = new AppError('Test error', {
      code: 'CUSTOM_CODE',
      status: HttpStatusCode.BAD_REQUEST,
      details: { field: 'value' },
    });

    expect(error.message).toBe('Test error');
    expect(error.code).toBe('CUSTOM_CODE');
    expect(error.status).toBe(HttpStatusCode.BAD_REQUEST);
    expect(error.details).toEqual({ field: 'value' });
  });

  it('should serialize to JSON correctly', () => {
    const error = new AppError('Test error', {
      code: 'TEST_CODE',
      status: HttpStatusCode.BAD_REQUEST,
      details: { field: 'value' },
    });

    const json = error.toJSON();

    expect(json.name).toBe('AppError');
    expect(json.code).toBe('TEST_CODE');
    expect(json.message).toBe('Test error');
    expect(json.status).toBe(HttpStatusCode.BAD_REQUEST);
    expect(json.details).toEqual({ field: 'value' });
  });
});

describe('BadRequestError', () => {
  it('should create bad request error', () => {
    const error = new BadRequestError('Invalid input');

    expect(error.message).toBe('Invalid input');
    expect(error.code).toBe('BAD_REQUEST');
    expect(error.status).toBe(HttpStatusCode.BAD_REQUEST);
  });
});

describe('UnauthorizedError', () => {
  it('should create unauthorized error with default message', () => {
    const error = new UnauthorizedError();

    expect(error.message).toBe('Unauthorized');
    expect(error.code).toBe('UNAUTHORIZED');
    expect(error.status).toBe(HttpStatusCode.UNAUTHORIZED);
  });

  it('should create unauthorized error with custom message', () => {
    const error = new UnauthorizedError('Please login');

    expect(error.message).toBe('Please login');
  });
});

describe('ForbiddenError', () => {
  it('should create forbidden error', () => {
    const error = new ForbiddenError('Access denied');

    expect(error.message).toBe('Access denied');
    expect(error.code).toBe('FORBIDDEN');
    expect(error.status).toBe(HttpStatusCode.FORBIDDEN);
  });
});

describe('NotFoundError', () => {
  it('should create not found error with default message', () => {
    const error = new NotFoundError();

    expect(error.message).toBe('Resource not found');
    expect(error.code).toBe('NOT_FOUND');
    expect(error.status).toBe(HttpStatusCode.NOT_FOUND);
  });
});

describe('ConflictError', () => {
  it('should create conflict error', () => {
    const error = new ConflictError('Email already exists');

    expect(error.message).toBe('Email already exists');
    expect(error.code).toBe('CONFLICT');
    expect(error.status).toBe(HttpStatusCode.CONFLICT);
  });
});

describe('ValidationError', () => {
  it('should create validation error', () => {
    const error = new ValidationError('Invalid data');

    expect(error.message).toBe('Invalid data');
    expect(error.code).toBe('VALIDATION_ERROR');
    expect(error.status).toBe(HttpStatusCode.UNPROCESSABLE_ENTITY);
  });
});

describe('AuthenticationError', () => {
  it('should create authentication error with default message', () => {
    const error = new AuthenticationError();

    expect(error.message).toBe('Authentication failed');
    expect(error.code).toBe('AUTHENTICATION_ERROR');
    expect(error.status).toBe(HttpStatusCode.UNAUTHORIZED);
  });
});

describe('TokenExpiredError', () => {
  it('should create token expired error', () => {
    const error = new TokenExpiredError();

    expect(error.message).toBe('Token has expired');
    expect(error.code).toBe('TOKEN_EXPIRED');
    expect(error.status).toBe(HttpStatusCode.UNAUTHORIZED);
  });
});

describe('InvalidTokenError', () => {
  it('should create invalid token error', () => {
    const error = new InvalidTokenError();

    expect(error.message).toBe('Invalid token');
    expect(error.code).toBe('INVALID_TOKEN');
    expect(error.status).toBe(HttpStatusCode.UNAUTHORIZED);
  });
});

describe('TooManyRequestsError', () => {
  it('should create too many requests error', () => {
    const error = new TooManyRequestsError();

    expect(error.message).toBe('Too many requests');
    expect(error.code).toBe('TOO_MANY_REQUESTS');
    expect(error.status).toBe(HttpStatusCode.TOO_MANY_REQUESTS);
  });

  it('should include rate limit details', () => {
    const error = new TooManyRequestsError('Rate limit exceeded', {
      limit: 100,
      remaining: 0,
      reset: 1234567890,
    });

    expect(error.details).toEqual({
      limit: 100,
      remaining: 0,
      reset: 1234567890,
    });
  });
});

describe('PayloadTooLargeError', () => {
  it('should create payload too large error', () => {
    const error = new PayloadTooLargeError();

    expect(error.message).toBe('Payload too large');
    expect(error.code).toBe('PAYLOAD_TOO_LARGE');
    expect(error.status).toBe(HttpStatusCode.PAYLOAD_TOO_LARGE);
  });
});

describe('InternalServerError', () => {
  it('should create internal server error', () => {
    const error = new InternalServerError();

    expect(error.message).toBe('Internal server error');
    expect(error.code).toBe('INTERNAL_SERVER_ERROR');
    expect(error.status).toBe(HttpStatusCode.INTERNAL_SERVER_ERROR);
    expect(error.isOperational).toBe(false);
  });
});

describe('HttpStatusCode', () => {
  it('should have correct status codes', () => {
    expect(HttpStatusCode.OK).toBe(200);
    expect(HttpStatusCode.CREATED).toBe(201);
    expect(HttpStatusCode.NO_CONTENT).toBe(204);
    expect(HttpStatusCode.BAD_REQUEST).toBe(400);
    expect(HttpStatusCode.UNAUTHORIZED).toBe(401);
    expect(HttpStatusCode.FORBIDDEN).toBe(403);
    expect(HttpStatusCode.NOT_FOUND).toBe(404);
    expect(HttpStatusCode.CONFLICT).toBe(409);
    expect(HttpStatusCode.UNPROCESSABLE_ENTITY).toBe(422);
    expect(HttpStatusCode.PAYLOAD_TOO_LARGE).toBe(413);
    expect(HttpStatusCode.TOO_MANY_REQUESTS).toBe(429);
    expect(HttpStatusCode.INTERNAL_SERVER_ERROR).toBe(500);
    expect(HttpStatusCode.SERVICE_UNAVAILABLE).toBe(503);
  });
});
