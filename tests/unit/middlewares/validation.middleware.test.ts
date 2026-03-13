/**
 * Validation Middleware Unit Tests
 *
 * Tests for validation error handling and formatting.
 */

import { describe, it, expect } from 'bun:test';
import { ZodError } from 'zod';
import { validationErrorHandler } from '../../../src/middlewares/validation.middleware';
import { FieldError } from '../../../src/middlewares/validation/field-error';
import { formatFieldError, getFieldLabel } from '../../../src/middlewares/validation/formatter';
import { FieldErrorCode, VALIDATION_ERROR_CODES, DEFAULT_ERROR_MESSAGES } from '../../../src/middlewares/validation/constants';
import type { ValidationHandlerContext } from '../../../src/middlewares/validation/types';

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
      expect(result?.data?.code).toBe(VALIDATION_ERROR_CODES.VALIDATION_FAILED);
      expect(result?.data?.message).toBe(DEFAULT_ERROR_MESSAGES.SINGLE_FIELD);
      expect(result?.data?.details).toBeArray();
      expect(result?.data?.details).toHaveLength(1);
    });

    it('should use multiple fields message for multiple errors', () => {
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

      expect(result?.data?.message).toBe(DEFAULT_ERROR_MESSAGES.MULTIPLE_FIELDS);
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
        request: new Request('http://example.com/test'),
        requestId: 'context-request-id',
      };

      const result = validationErrorHandler(ctx);

      expect(result?.meta?.request_id).toBe('context-request-id');
    });
  });

  describe('FieldError', () => {
    it('should create field error from Zod issue', () => {
      const issue = {
        code: 'invalid_type' as const,
        expected: 'string' as const,
        received: 'number' as const,
        path: ['email'],
        message: 'Expected string, received number',
      };

      const fieldError = FieldError.fromZodIssue(issue);

      expect(fieldError.field).toBe('email');
      expect(fieldError.code).toBe(FieldErrorCode.INVALID_TYPE);
      expect(fieldError.message).toContain('Email');
      expect(fieldError.received).toBe('number');
      expect(fieldError.expected).toBe('string');
    });

    it('should convert to JSON for serialization', () => {
      const error = new FieldError('email', 'Invalid email', FieldErrorCode.INVALID_EMAIL);

      const json = error.toJSON();

      expect(json).toEqual({
        field: 'email',
        message: 'Invalid email',
        code: FieldErrorCode.INVALID_EMAIL,
      });
    });

    it('should include received and expected in JSON when present', () => {
      const error = new FieldError('age', 'Too small', FieldErrorCode.TOO_SMALL, 5, '18');

      const json = error.toJSON();

      expect(json).toEqual({
        field: 'age',
        message: 'Too small',
        code: FieldErrorCode.TOO_SMALL,
        received: 5,
        expected: '18',
      });
    });

    it('should handle nested paths correctly', () => {
      const issue = {
        code: 'invalid_type' as const,
        expected: 'string' as const,
        received: 'undefined' as const,
        path: ['user', 'address', 'city'],
        message: 'Required',
      };

      const fieldError = FieldError.fromZodIssue(issue);

      expect(fieldError.field).toBe('user.address.city');
    });

    it('should handle array indices in paths', () => {
      const issue = {
        code: 'invalid_type' as const,
        expected: 'string' as const,
        received: 'number' as const,
        path: ['items', 0, 'name'],
        message: 'Expected string, received number',
      };

      const fieldError = FieldError.fromZodIssue(issue);

      expect(fieldError.field).toBe('items[0].name');
    });
  });

  describe('formatFieldError', () => {
    it('should format required field error', () => {
      const message = formatFieldError(FieldErrorCode.REQUIRED, 'email');

      expect(message).toBe('Email is required');
    });

    it('should format invalid email error', () => {
      const message = formatFieldError(FieldErrorCode.INVALID_EMAIL, 'email');

      expect(message).toBe('Email must be a valid email address');
    });

    it('should format too short error with minimum', () => {
      const issue = {
        code: 'too_small' as const,
        minimum: 8,
        type: 'string' as const,
        inclusive: true,
        path: ['password'],
        message: 'String must contain at least 8 character(s)',
      };

      const message = formatFieldError(FieldErrorCode.TOO_SHORT, 'password', issue);

      expect(message).toBe('Password must be at least 8 characters');
    });

    it('should format too short error with singular', () => {
      const issue = {
        code: 'too_small' as const,
        minimum: 1,
        type: 'string' as const,
        inclusive: true,
        path: ['name'],
        message: 'String must contain at least 1 character(s)',
      };

      const message = formatFieldError(FieldErrorCode.TOO_SHORT, 'name', issue);

      expect(message).toBe('Name must be at least 1 character');
    });

    it('should format too large error', () => {
      const issue = {
        code: 'too_big' as const,
        maximum: 100,
        type: 'number' as const,
        inclusive: true,
        path: ['age'],
        message: 'Number must be less than or equal to 100',
      };

      const message = formatFieldError(FieldErrorCode.TOO_LARGE, 'age', issue);

      expect(message).toBe('Age must not exceed 100');
    });

    it('should format invalid type error with article', () => {
      const issue = {
        code: 'invalid_type' as const,
        expected: 'string' as const,
        received: 'number' as const,
        path: ['email'],
        message: 'Expected string, received number',
      };

      const message = formatFieldError(FieldErrorCode.INVALID_TYPE, 'email', issue);

      expect(message).toBe('Email must be a string');
    });

    it('should format invalid type error with vowel article', () => {
      const issue = {
        code: 'invalid_type' as const,
        expected: 'object' as const,
        received: 'array' as const,
        path: ['metadata'],
        message: 'Expected object, received array',
      };

      const message = formatFieldError(FieldErrorCode.INVALID_TYPE, 'metadata', issue);

      expect(message).toBe('Metadata must be an object');
    });

    it('should format invalid array error', () => {
      const message = formatFieldError(FieldErrorCode.INVALID_ARRAY, 'tags');

      expect(message).toBe('Tags must be an array');
    });

    it('should format too few items error', () => {
      const issue = {
        code: 'too_small' as const,
        minimum: 2,
        type: 'array' as const,
        inclusive: true,
        path: ['tags'],
        message: 'Array must contain at least 2 element(s)',
      };

      const message = formatFieldError(FieldErrorCode.TOO_FEW_ITEMS, 'tags', issue);

      expect(message).toBe('Tags must have at least 2 items');
    });

    it('should use default message for unknown codes', () => {
      const message = formatFieldError(FieldErrorCode.CUSTOM, 'field');

      expect(message).toBe('Field is invalid');
    });
  });

  describe('getFieldLabel', () => {
    it('should convert camelCase to Title Case', () => {
      expect(getFieldLabel('emailAddress')).toBe('Email Address');
    });

    it('should handle nested paths', () => {
      expect(getFieldLabel('user.address.city')).toBe('User → Address → City');
    });

    it('should return "Field" for empty path', () => {
      expect(getFieldLabel('')).toBe('Field');
    });

    it('should handle array bracket notation', () => {
      expect(getFieldLabel('items[0].name')).toBe('Items → 0 → Name');
    });
  });
});
