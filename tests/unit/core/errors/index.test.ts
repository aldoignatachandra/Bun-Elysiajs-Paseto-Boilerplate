/**
 * Core Errors Index Tests
 *
 * Tests barrel exports from @/core/errors
 */

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
  InternalServerError,
} from '@/core/errors';

describe('Core Errors Index', () => {
  describe('Barrel Exports', () => {
    it('should export AppError class', () => {
      expect(AppError).toBeDefined();
      expect(typeof AppError).toBe('function');
    });

    it('should export HttpStatusCode enum', () => {
      expect(HttpStatusCode).toBeDefined();
      expect(typeof HttpStatusCode).toBe('object');
    });

    it('should export BadRequestError class', () => {
      expect(BadRequestError).toBeDefined();
      expect(typeof BadRequestError).toBe('function');
    });

    it('should export UnauthorizedError class', () => {
      expect(UnauthorizedError).toBeDefined();
      expect(typeof UnauthorizedError).toBe('function');
    });

    it('should export ForbiddenError class', () => {
      expect(ForbiddenError).toBeDefined();
      expect(typeof ForbiddenError).toBe('function');
    });

    it('should export NotFoundError class', () => {
      expect(NotFoundError).toBeDefined();
      expect(typeof NotFoundError).toBe('function');
    });

    it('should export ConflictError class', () => {
      expect(ConflictError).toBeDefined();
      expect(typeof ConflictError).toBe('function');
    });

    it('should export ValidationError class', () => {
      expect(ValidationError).toBeDefined();
      expect(typeof ValidationError).toBe('function');
    });

    it('should export InternalServerError class', () => {
      expect(InternalServerError).toBeDefined();
      expect(typeof InternalServerError).toBe('function');
    });
  });

  describe('AppError', () => {
    it('should create error with message and custom code', () => {
      const error = new AppError('Test error', {
        code: 'CUSTOM_ERROR',
      });

      expect(error.message).toBe('Test error');
      expect(error.code).toBe('CUSTOM_ERROR');
      expect(error.name).toBe('AppError');
    });

    it('should use default code when not provided', () => {
      const error = new AppError('Test error');

      expect(error.code).toBe('APP_ERROR');
    });

    it('should include stack trace', () => {
      const error = new AppError('Test error');

      expect(error.stack).toBeDefined();
      expect(typeof error.stack).toBe('string');
    });

    it('should serialize to JSON', () => {
      const error = new AppError('Test error', {
        code: 'TEST_CODE',
        status: HttpStatusCode.BAD_REQUEST,
      });

      const json = error.toJSON();

      expect(json).toEqual({
        name: 'AppError',
        code: 'TEST_CODE',
        message: 'Test error',
        status: 400,
      });
    });
  });

  describe('BadRequestError (400)', () => {
    it('should create error with 400 status', () => {
      const error = new BadRequestError('Invalid input');

      expect(error.message).toBe('Invalid input');
      expect(error.code).toBe('BAD_REQUEST');
      expect(error.status).toBe(HttpStatusCode.BAD_REQUEST);
      expect(error.status).toBe(400);
    });

    it('should accept details parameter', () => {
      const details = { field: 'email', reason: 'Invalid format' };
      const error = new BadRequestError('Invalid input', details);

      expect(error.details).toEqual(details);
    });
  });

  describe('UnauthorizedError (401)', () => {
    it('should create error with 401 status', () => {
      const error = new UnauthorizedError('Authentication required');

      expect(error.message).toBe('Authentication required');
      expect(error.code).toBe('UNAUTHORIZED');
      expect(error.status).toBe(HttpStatusCode.UNAUTHORIZED);
      expect(error.status).toBe(401);
    });

    it('should use default message', () => {
      const error = new UnauthorizedError();

      expect(error.message).toBe('Unauthorized');
      expect(error.code).toBe('UNAUTHORIZED');
      expect(error.status).toBe(401);
    });

    it('should accept details parameter', () => {
      const details = { required: 'Bearer token' };
      const error = new UnauthorizedError('Auth required', details);

      expect(error.details).toEqual(details);
    });
  });

  describe('ForbiddenError (403)', () => {
    it('should create error with 403 status', () => {
      const error = new ForbiddenError('Access denied');

      expect(error.message).toBe('Access denied');
      expect(error.code).toBe('FORBIDDEN');
      expect(error.status).toBe(HttpStatusCode.FORBIDDEN);
      expect(error.status).toBe(403);
    });

    it('should use default message', () => {
      const error = new ForbiddenError();

      expect(error.message).toBe('Forbidden');
      expect(error.code).toBe('FORBIDDEN');
      expect(error.status).toBe(403);
    });

    it('should accept details parameter', () => {
      const details = { required: 'admin' };
      const error = new ForbiddenError('Not allowed', details);

      expect(error.details).toEqual(details);
    });
  });

  describe('NotFoundError (404)', () => {
    it('should create error with 404 status', () => {
      const error = new NotFoundError('User not found');

      expect(error.message).toBe('User not found');
      expect(error.code).toBe('NOT_FOUND');
      expect(error.status).toBe(HttpStatusCode.NOT_FOUND);
      expect(error.status).toBe(404);
    });

    it('should use default message', () => {
      const error = new NotFoundError();

      expect(error.message).toBe('Resource not found');
      expect(error.code).toBe('NOT_FOUND');
      expect(error.status).toBe(404);
    });

    it('should accept details parameter', () => {
      const details = { resource: 'User', id: '123' };
      const error = new NotFoundError('Not found', details);

      expect(error.details).toEqual(details);
    });
  });

  describe('ConflictError (409)', () => {
    it('should create error with 409 status', () => {
      const error = new ConflictError('Email already exists');

      expect(error.message).toBe('Email already exists');
      expect(error.code).toBe('CONFLICT');
      expect(error.status).toBe(HttpStatusCode.CONFLICT);
      expect(error.status).toBe(409);
    });

    it('should accept details parameter', () => {
      const details = { field: 'email', value: 'test@example.com' };
      const error = new ConflictError('Duplicate entry', details);

      expect(error.details).toEqual(details);
    });
  });

  describe('ValidationError (422)', () => {
    it('should create error with 422 status', () => {
      const error = new ValidationError('Invalid data format');

      expect(error.message).toBe('Invalid data format');
      expect(error.code).toBe('VALIDATION_ERROR');
      expect(error.status).toBe(HttpStatusCode.UNPROCESSABLE_ENTITY);
      expect(error.status).toBe(422);
    });

    it('should accept details parameter', () => {
      const details = { fields: ['email', 'password'] };
      const error = new ValidationError('Validation failed', details);

      expect(error.details).toEqual(details);
    });
  });

  describe('InternalServerError (500)', () => {
    it('should create error with 500 status', () => {
      const error = new InternalServerError('Database connection failed');

      expect(error.message).toBe('Database connection failed');
      expect(error.code).toBe('INTERNAL_SERVER_ERROR');
      expect(error.status).toBe(HttpStatusCode.INTERNAL_SERVER_ERROR);
      expect(error.status).toBe(500);
    });

    it('should use default message', () => {
      const error = new InternalServerError();

      expect(error.message).toBe('Internal server error');
      expect(error.code).toBe('INTERNAL_SERVER_ERROR');
      expect(error.status).toBe(500);
    });

    it('should accept details parameter', () => {
      const details = { originalError: 'Connection timeout' };
      const error = new InternalServerError('Server error', details);

      expect(error.details).toEqual(details);
    });

    it('should mark as non-operational by default', () => {
      const error = new InternalServerError();

      expect(error.isOperational).toBe(false);
    });
  });

  describe('HttpStatusCode enum', () => {
    it('should have correct client error codes', () => {
      expect(HttpStatusCode.BAD_REQUEST).toBe(400);
      expect(HttpStatusCode.UNAUTHORIZED).toBe(401);
      expect(HttpStatusCode.FORBIDDEN).toBe(403);
      expect(HttpStatusCode.NOT_FOUND).toBe(404);
      expect(HttpStatusCode.CONFLICT).toBe(409);
      expect(HttpStatusCode.UNPROCESSABLE_ENTITY).toBe(422);
    });

    it('should have correct server error codes', () => {
      expect(HttpStatusCode.INTERNAL_SERVER_ERROR).toBe(500);
      expect(HttpStatusCode.SERVICE_UNAVAILABLE).toBe(503);
    });

    it('should have correct success codes', () => {
      expect(HttpStatusCode.OK).toBe(200);
      expect(HttpStatusCode.CREATED).toBe(201);
      expect(HttpStatusCode.NO_CONTENT).toBe(204);
    });
  });

  describe('Error inheritance chain', () => {
    it('should maintain proper instanceof chain', () => {
      const badRequest = new BadRequestError('test');
      const unauthorized = new UnauthorizedError('test');
      const forbidden = new ForbiddenError('test');
      const notFound = new NotFoundError('test');
      const conflict = new ConflictError('test');
      const validation = new ValidationError('test');
      const internal = new InternalServerError('test');

      expect(badRequest instanceof AppError).toBe(true);
      expect(badRequest instanceof Error).toBe(true);

      expect(unauthorized instanceof AppError).toBe(true);
      expect(unauthorized instanceof Error).toBe(true);

      expect(forbidden instanceof AppError).toBe(true);
      expect(forbidden instanceof Error).toBe(true);

      expect(notFound instanceof AppError).toBe(true);
      expect(notFound instanceof Error).toBe(true);

      expect(conflict instanceof AppError).toBe(true);
      expect(conflict instanceof Error).toBe(true);

      expect(validation instanceof AppError).toBe(true);
      expect(validation instanceof Error).toBe(true);

      expect(internal instanceof AppError).toBe(true);
      expect(internal instanceof Error).toBe(true);
    });
  });

  describe('Error isOperational flag', () => {
    it('should default to operational for custom errors', () => {
      const badRequest = new BadRequestError('test');
      const unauthorized = new UnauthorizedError('test');
      const forbidden = new ForbiddenError('test');
      const notFound = new NotFoundError('test');
      const conflict = new ConflictError('test');
      const validation = new ValidationError('test');

      expect(badRequest.isOperational).toBe(true);
      expect(unauthorized.isOperational).toBe(true);
      expect(forbidden.isOperational).toBe(true);
      expect(notFound.isOperational).toBe(true);
      expect(conflict.isOperational).toBe(true);
      expect(validation.isOperational).toBe(true);
    });

    it('should allow custom isOperational in AppError', () => {
      const operational = new AppError('test', { isOperational: true });
      const nonOperational = new AppError('test', { isOperational: false });

      expect(operational.isOperational).toBe(true);
      expect(nonOperational.isOperational).toBe(false);
    });
  });
});
