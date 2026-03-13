/**
 * Core HTTP Index Tests
 *
 * Tests barrel exports from @/core/http
 */

import { describe, it, expect } from 'bun:test';
import {
  buildMeta,
  successResponse,
  errorResponse,
  type ApiMeta,
  type ApiResponse,
  type ApiErrorBody,
  parsePagination,
  sanitizeQuery,
  type PaginationParams,
  type PaginationResult,
  isValidPaginationParam,
} from '@/core/http';

describe('Core HTTP Index', () => {
  const mockRequest = new Request('http://localhost/api/test');

  describe('Barrel Exports', () => {
    it('should export response builder functions', () => {
      expect(buildMeta).toBeDefined();
      expect(typeof buildMeta).toBe('function');

      expect(successResponse).toBeDefined();
      expect(typeof successResponse).toBe('function');

      expect(errorResponse).toBeDefined();
      expect(typeof errorResponse).toBe('function');
    });

    it('should export utility functions', () => {
      expect(parsePagination).toBeDefined();
      expect(typeof parsePagination).toBe('function');

      expect(sanitizeQuery).toBeDefined();
      expect(typeof sanitizeQuery).toBe('function');

      expect(isValidPaginationParam).toBeDefined();
      expect(typeof isValidPaginationParam).toBe('function');
    });

    it('should export TypeScript types', () => {
      // Types are available at compile time, we verify they exist by usage
      const meta: ApiMeta = { timestamp: new Date().toISOString() };
      expect(meta).toBeDefined();

      const response: ApiResponse = { success: true, meta };
      expect(response).toBeDefined();

      const errorBody: ApiErrorBody = { code: 'TEST', message: 'Test error' };
      expect(errorBody).toBeDefined();

      const paginationParams: PaginationParams = {};
      expect(paginationParams).toBeDefined();

      const paginationResult: PaginationResult = { page: 1, limit: 10, offset: 0 };
      expect(paginationResult).toBeDefined();
    });
  });

  describe('buildMeta', () => {
    it('should build metadata with timestamp', () => {
      const meta = buildMeta(mockRequest);

      expect(meta).toHaveProperty('timestamp');
      expect(meta.timestamp).toBeDefined();
      expect(typeof meta.timestamp).toBe('string');
    });

    it('should include request id from header', () => {
      const requestWithId = new Request('http://localhost', {
        headers: { 'x-request-id': 'test-request-id' },
      });

      const meta = buildMeta(requestWithId);

      expect(meta.request_id).toBe('test-request-id');
    });

    it('should use provided request id over header', () => {
      const requestWithId = new Request('http://localhost', {
        headers: { 'x-request-id': 'header-request-id' },
      });

      const meta = buildMeta(requestWithId, 'custom-request-id');

      expect(meta.request_id).toBe('custom-request-id');
    });

    it('should handle uppercase X-Request-ID header', () => {
      const requestWithId = new Request('http://localhost', {
        headers: { 'X-Request-ID': 'uppercase-request-id' },
      });

      const meta = buildMeta(requestWithId);

      expect(meta.request_id).toBe('uppercase-request-id');
    });

    it('should not include request_id when not provided', () => {
      const meta = buildMeta(mockRequest);

      expect(meta.request_id).toBeUndefined();
    });
  });

  describe('successResponse', () => {
    it('should create success response without data', () => {
      const response = successResponse(mockRequest);

      expect(response.success).toBe(true);
      expect(response.meta).toBeDefined();
      expect(response.data).toBeUndefined();
      expect(response.message).toBeUndefined();
    });

    it('should create success response with data', () => {
      const data = { id: '123', name: 'Test' };
      const response = successResponse(mockRequest, data);

      expect(response.success).toBe(true);
      expect(response.data).toEqual(data);
    });

    it('should create success response with message', () => {
      const response = successResponse(mockRequest, undefined, 'Operation successful');

      expect(response.success).toBe(true);
      expect(response.message).toBe('Operation successful');
    });

    it('should create success response with all options', () => {
      const data = { id: '123' };
      const response = successResponse(mockRequest, data, 'Success', 'req-123');

      expect(response.success).toBe(true);
      expect(response.data).toEqual(data);
      expect(response.message).toBe('Success');
      expect(response.meta.request_id).toBe('req-123');
      expect(response.meta.timestamp).toBeDefined();
    });

    it('should not include message when not provided', () => {
      const response = successResponse(mockRequest, { id: '123' });

      expect('message' in response).toBe(false);
    });
  });

  describe('errorResponse', () => {
    it('should create error response with required fields', () => {
      const response = errorResponse(mockRequest, 'ERROR_CODE', 'Error message');

      expect(response.success).toBe(false);
      expect(response.message).toBe('Error message');
      expect(response.data).toEqual({
        code: 'ERROR_CODE',
        message: 'Error message',
      });
      expect(response.meta.timestamp).toBeDefined();
    });

    it('should include error details', () => {
      const details = { field: 'email', reason: 'Invalid format' };
      const response = errorResponse(mockRequest, 'VALIDATION_ERROR', 'Invalid input', details);

      expect(response.data).toEqual({
        code: 'VALIDATION_ERROR',
        message: 'Invalid input',
        details: { field: 'email', reason: 'Invalid format' },
      });
    });

    it('should include request id in meta', () => {
      const response = errorResponse(mockRequest, 'ERROR_CODE', 'Error message', undefined, 'req-123');

      expect(response.meta.request_id).toBe('req-123');
    });

    it('should handle complex details objects', () => {
      const details = {
        errors: [
          { field: 'email', message: 'Required' },
          { field: 'password', message: 'Too short' },
        ],
      };
      const response = errorResponse(mockRequest, 'VALIDATION_ERROR', 'Validation failed', details);

      expect(response.data?.details).toEqual(details);
    });
  });

  describe('parsePagination', () => {
    it('should use default values when no params provided', () => {
      const result = parsePagination({});

      expect(result).toEqual({
        page: 1,
        limit: 10,
        offset: 0,
      });
    });

    it('should parse valid page and limit as numbers', () => {
      const result = parsePagination({ page: 3, limit: 25 });

      expect(result).toEqual({
        page: 3,
        limit: 25,
        offset: 50,
      });
    });

    it('should parse valid page and limit as strings', () => {
      const result = parsePagination({ page: '5', limit: '20' });

      expect(result).toEqual({
        page: 5,
        limit: 20,
        offset: 80,
      });
    });

    it('should enforce max limit of 100', () => {
      const result = parsePagination({ limit: 200 });

      expect(result.limit).toBe(100);
      expect(result).toEqual({
        page: 1,
        limit: 100,
        offset: 0,
      });
    });

    it('should enforce max limit of 100 for string input', () => {
      const result = parsePagination({ limit: '999' });

      expect(result.limit).toBe(100);
    });

    it('should enforce min page of 1', () => {
      const result = parsePagination({ page: 0 });

      expect(result.page).toBe(1);
      expect(result.offset).toBe(0);
    });

    it('should enforce min page of 1 for negative values', () => {
      const result = parsePagination({ page: -5 });

      expect(result.page).toBe(1);
    });

    it('should handle invalid page input', () => {
      const result = parsePagination({ page: 'invalid' });

      expect(result.page).toBe(1);
      expect(result.limit).toBe(10);
      expect(result.offset).toBe(0);
    });

    it('should handle invalid limit input', () => {
      const result = parsePagination({ limit: 'abc' });

      expect(result.page).toBe(1);
      expect(result.limit).toBe(10);
      expect(result.offset).toBe(0);
    });

    it('should handle null values', () => {
      const result = parsePagination({ page: null, limit: null });

      expect(result).toEqual({
        page: 1,
        limit: 10,
        offset: 0,
      });
    });

    it('should handle undefined values', () => {
      const result = parsePagination({ page: undefined, limit: undefined });

      expect(result).toEqual({
        page: 1,
        limit: 10,
        offset: 0,
      });
    });

    it('should handle empty strings', () => {
      const result = parsePagination({ page: '', limit: '' });

      expect(result).toEqual({
        page: 1,
        limit: 10,
        offset: 0,
      });
    });

    it('should handle zero limit (use default)', () => {
      const result = parsePagination({ limit: 0 });

      expect(result.limit).toBe(10);
    });

    it('should handle negative limit (use default)', () => {
      const result = parsePagination({ limit: -10 });

      expect(result.limit).toBe(10);
    });

    it('should calculate offset correctly for page 1', () => {
      const result = parsePagination({ page: 1, limit: 10 });

      expect(result.offset).toBe(0);
    });

    it('should calculate offset correctly for page 2', () => {
      const result = parsePagination({ page: 2, limit: 25 });

      expect(result.offset).toBe(25);
    });

    it('should calculate offset correctly for large page numbers', () => {
      const result = parsePagination({ page: 100, limit: 50 });

      expect(result.offset).toBe(4950);
    });

    it('should handle decimal page numbers', () => {
      const result = parsePagination({ page: 2.7 });

      expect(result.page).toBe(2);
    });

    it('should handle decimal limit numbers', () => {
      const result = parsePagination({ limit: 15.8 });

      expect(result.limit).toBe(15);
    });

    it('should handle string decimal numbers', () => {
      const result = parsePagination({ page: '3.9', limit: '20.5' });

      expect(result.page).toBe(3);
      expect(result.limit).toBe(20);
    });
  });

  describe('sanitizeQuery', () => {
    it('should preserve safe input', () => {
      const result = sanitizeQuery('hello world');

      expect(result).toBe('hello world');
    });

    it('should handle null input', () => {
      const result = sanitizeQuery(null);

      expect(result).toBe('');
    });

    it('should handle undefined input', () => {
      const result = sanitizeQuery(undefined);

      expect(result).toBe('');
    });

    it('should handle empty string', () => {
      const result = sanitizeQuery('');

      expect(result).toBe('');
    });

    it('should handle whitespace-only input', () => {
      const result = sanitizeQuery('   ');

      expect(result).toBe('');
    });

    it('should trim whitespace', () => {
      const result = sanitizeQuery('  hello world  ');

      expect(result).toBe('hello world');
    });

    it('should remove SELECT statement', () => {
      const result = sanitizeQuery('SELECT * FROM users');

      expect(result).toBe(' * FROM users');
      expect(result).not.toContain('SELECT');
    });

    it('should remove INSERT statement', () => {
      const result = sanitizeQuery('INSERT INTO users VALUES (1, "test")');

      expect(result).not.toContain('INSERT');
    });

    it('should remove UPDATE statement', () => {
      const result = sanitizeQuery('UPDATE users SET name = "test"');

      expect(result).not.toContain('UPDATE');
    });

    it('should remove DELETE statement', () => {
      const result = sanitizeQuery('DELETE FROM users');

      expect(result).not.toContain('DELETE');
    });

    it('should remove DROP statement', () => {
      const result = sanitizeQuery('DROP TABLE users');

      expect(result).not.toContain('DROP');
    });

    it('should remove CREATE statement', () => {
      const result = sanitizeQuery('CREATE TABLE users');

      expect(result).not.toContain('CREATE');
    });

    it('should remove ALTER statement', () => {
      const result = sanitizeQuery('ALTER TABLE users');

      expect(result).not.toContain('ALTER');
    });

    it('should remove UNION operator', () => {
      const result = sanitizeQuery('SELECT * FROM users UNION SELECT * FROM admins');

      expect(result).not.toContain('UNION');
    });

    it('should remove WHERE clause', () => {
      const result = sanitizeQuery('SELECT * FROM users WHERE id = 1');

      expect(result).not.toContain('WHERE');
    });

    it('should remove SQL comments --', () => {
      const result = sanitizeQuery('test -- comment');

      expect(result).not.toContain('--');
    });

    it('should remove SQL comment block /* */', () => {
      const result = sanitizeQuery('test /* comment */ more');

      expect(result).not.toContain('/*');
      expect(result).not.toContain('*/');
    });

    it('should remove semicolon statement separator', () => {
      const result = sanitizeQuery('test; DROP TABLE users');

      expect(result).not.toContain(';');
    });

    it('should remove OR 1=1 pattern', () => {
      const result = sanitizeQuery('test OR 1=1');

      expect(result).not.toContain('OR 1=1');
    });

    it('should remove AND 1=1 pattern', () => {
      const result = sanitizeQuery('test AND 1=1');

      expect(result).not.toContain('AND 1=1');
    });

    it('should remove OR with string equality', () => {
      const result = sanitizeQuery("test OR 'a'='a'");

      expect(result).not.toMatch(/OR.*['"]a['"].*['"]a['"]/);
    });

    it('should remove single quotes', () => {
      const result = sanitizeQuery("test's value");

      expect(result).toBe('tests value');
    });

    it('should remove double quotes', () => {
      const result = sanitizeQuery('test"value');

      expect(result).toBe('testvalue');
    });

    it('should remove logical operators || and &&', () => {
      const result = sanitizeQuery('test || true && false');

      expect(result).not.toContain('||');
      expect(result).not.toContain('&&');
    });

    it('should handle mixed SQL injection attempts', () => {
      const result = sanitizeQuery("admin' OR '1'='1' --");

      expect(result).not.toContain('OR');
      expect(result).not.toContain("'1'='1'");
      expect(result).not.toContain('--');
    });

    it('should preserve safe special characters', () => {
      const result = sanitizeQuery('test@example.com');

      expect(result).toBe('test@example.com');
    });

    it('should handle numbers and special safe characters', () => {
      const result = sanitizeQuery('user123_test-name');

      expect(result).toBe('user123_test-name');
    });

    it('should convert non-string input to string', () => {
      const result = sanitizeQuery(12345 as unknown as string);

      expect(result).toBe('12345');
    });

    it('should handle boolean input', () => {
      const result = sanitizeQuery(true as unknown as string);

      expect(result).toBe('true');
    });

    it('should handle object input (toString)', () => {
      const result = sanitizeQuery({ key: 'value' } as unknown as string);

      expect(result).toBeTruthy();
      expect(typeof result).toBe('string');
    });
  });

  describe('isValidPaginationParam', () => {
    it('should return true for valid number', () => {
      expect(isValidPaginationParam(10)).toBe(true);
    });

    it('should return true for valid string number', () => {
      expect(isValidPaginationParam('10')).toBe(true);
    });

    it('should return true for non-numeric string', () => {
      expect(isValidPaginationParam('abc')).toBe(true);
    });

    it('should return false for null', () => {
      expect(isValidPaginationParam(null)).toBe(false);
    });

    it('should return false for undefined', () => {
      expect(isValidPaginationParam(undefined)).toBe(false);
    });

    it('should return false for empty string', () => {
      expect(isValidPaginationParam('')).toBe(false);
    });

    it('should return true for zero', () => {
      expect(isValidPaginationParam(0)).toBe(true);
    });

    it('should return true for negative number', () => {
      expect(isValidPaginationParam(-1)).toBe(true);
    });

    it('should return true for decimal number', () => {
      expect(isValidPaginationParam(1.5)).toBe(true);
    });
  });

  describe('Integration Tests', () => {
    it('should handle complete API response flow', () => {
      const meta = buildMeta(mockRequest, 'req-123');
      const success = successResponse(mockRequest, { id: '123' }, 'Created', 'req-123');
      const error = errorResponse(mockRequest, 'ERROR_CODE', 'Failed', { reason: 'test' }, 'req-123');

      expect(meta.request_id).toBe('req-123');
      expect(success.success).toBe(true);
      expect(success.data).toEqual({ id: '123' });
      expect(success.meta.request_id).toBe('req-123');
      expect(error.success).toBe(false);
      expect(error.meta.request_id).toBe('req-123');
      expect(error.data?.details).toEqual({ reason: 'test' });
    });

    it('should handle pagination with sanitization', () => {
      const pagination = parsePagination({ page: '2', limit: '20' });
      const sanitized = sanitizeQuery('search term');

      expect(pagination.page).toBe(2);
      expect(pagination.limit).toBe(20);
      expect(pagination.offset).toBe(20);
      expect(sanitized).toBe('search term');
    });

    it('should handle edge cases in combination', () => {
      const edgePagination = parsePagination({ page: -1, limit: 999 });
      const edgeSanitized = sanitizeQuery(null);

      expect(edgePagination.page).toBe(1);
      expect(edgePagination.limit).toBe(100);
      expect(edgeSanitized).toBe('');
    });
  });
});
