/**
 * Validation Middleware Unit Tests
 *
 * Tests for validation error handling and formatting.
 */

import { describe, it, expect } from 'bun:test';
import { ZodError } from 'zod';
import { validationErrorHandler } from '../../../src/middlewares/validation.middleware';
import type { ValidationHandlerContext } from '../../../src/middlewares/validation/types';
import type { ValidationErrorBody } from '../../../src/core/http/response';

describe('Validation Middleware', () => {
  describe('validationErrorHandler', () => {
    it('should return undefined for non-Zod errors', () => {
      const ctx: ValidationHandlerContext = {
        error: new Error('Regular error'),
        set: { status: 0 },
        request: new Request('http://example.com'),
      };

      const result = validationErrorHandler(ctx);

      expect(result).toBeUndefined();
    });

    it('should handle Zod validation errors', () => {
      const zodError = new ZodError([
        {
          code: 'invalid_type',
          expected: 'string',
          received: 'number',
          path: ['email'],
          message: 'Expected string, received number',
        },
      ]);

      const ctx: ValidationHandlerContext = {
        error: zodError,
        set: { status: 0 },
        request: new Request('http://example.com/test'),
      };

      const result = validationErrorHandler(ctx);

      expect(result).toBeDefined();
      expect(ctx.set.status).toBe(422);
      expect(result?.success).toBe(false);
      const errorBody = result?.error as ValidationErrorBody | undefined;
      expect(errorBody?.code).toBe('VALIDATION_ERROR');
      // The first field error message should be the main message
      expect(errorBody?.message).toBe('Expected string, received number');
      expect(errorBody?.fields).toBeArray();
      expect(errorBody?.fields).toHaveLength(1);
    });

    it('should use first field error message for multiple errors', () => {
      const zodError = new ZodError([
        {
          code: 'invalid_type',
          expected: 'string',
          received: 'number',
          path: ['email'],
          message: 'Expected string, received number',
        },
        {
          code: 'too_small',
          minimum: 8,
          type: 'string',
          inclusive: true,
          path: ['password'],
          message: 'String must contain at least 8 character(s)',
        },
      ]);

      const ctx: ValidationHandlerContext = {
        error: zodError,
        set: { status: 0 },
        request: new Request('http://example.com/test'),
      };

      const result = validationErrorHandler(ctx);
      const errorBody = result?.error as ValidationErrorBody | undefined;

      // The first field error message should be the main message
      expect(errorBody?.message).toBe('Expected string, received number');
      expect(errorBody?.fields).toHaveLength(2);
    });

    it('should include request ID when available', () => {
      const zodError = new ZodError([
        {
          code: 'invalid_type',
          expected: 'string',
          received: 'number',
          path: ['email'],
          message: 'Expected string, received number',
        },
      ]);

      const ctx: ValidationHandlerContext = {
        error: zodError,
        set: { status: 0 },
        request: new Request('http://example.com/test', {
          headers: { 'X-Request-ID': 'test-123' },
        }),
      };

      const result = validationErrorHandler(ctx);

      expect(result?.meta?.request_id).toBe('test-123');
    });

    it('should extract request ID from context first', () => {
      const zodError = new ZodError([
        {
          code: 'invalid_type',
          expected: 'string',
          received: 'number',
          path: ['email'],
          message: 'Expected string, received number',
        },
      ]);

      const ctx: ValidationHandlerContext = {
        error: zodError,
        set: { status: 0 },
        request: new Request('http://example.com/test', {
          headers: { 'X-Request-ID': 'header-id' },
        }),
        requestId: 'context-id',
      };

      const result = validationErrorHandler(ctx);

      expect(result?.meta?.request_id).toBe('context-id');
    });

    it('should handle stringified validation errors from Elysia body validation', () => {
      // This simulates an error from Elysia's body validation
      const stringifiedError = new Error(
        JSON.stringify({
          type: 'validation',
          on: 'body',
          property: 'password',
          message: 'Password must contain at least one special character',
          errors: [
            {
              validation: 'regex',
              code: 'invalid_string',
              message: 'Password must contain at least one special character',
              path: ['password'],
            },
            {
              validation: 'regex',
              code: 'invalid_string',
              message: 'Password must contain at least one special character',
              path: ['confirmPassword'],
            },
          ],
        })
      );

      const ctx: ValidationHandlerContext = {
        error: stringifiedError,
        set: { status: 0 },
        request: new Request('http://example.com/test'),
      };

      const result = validationErrorHandler(ctx);

      expect(result).toBeDefined();
      expect(ctx.set.status).toBe(422);
      expect(result?.success).toBe(false);
      const errorBody = result?.error as ValidationErrorBody | undefined;
      expect(errorBody?.code).toBe('VALIDATION_ERROR');
      expect(errorBody?.fields).toBeArray();
      expect(errorBody?.fields).toHaveLength(2);
      // The first field error message should be the main message
      expect(result?.message).toBe('Password must contain at least one special character');
    });

    it('should handle stringified single field error', () => {
      const stringifiedError = new Error(
        JSON.stringify({
          type: 'validation',
          on: 'body',
          property: 'email',
          message: 'Invalid email format',
          errors: [
            {
              validation: 'email',
              code: 'invalid_string',
              message: 'Invalid email format',
              path: ['email'],
            },
          ],
        })
      );

      const ctx: ValidationHandlerContext = {
        error: stringifiedError,
        set: { status: 0 },
        request: new Request('http://example.com/test'),
      };

      const result = validationErrorHandler(ctx);

      expect(result?.message).toBe('Invalid email format');
      const errorBody = result?.error as ValidationErrorBody | undefined;
      expect(errorBody?.fields).toHaveLength(1);
      expect(errorBody?.fields[0]?.field).toBe('email');
    });
  });
});
