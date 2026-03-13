/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable @typescript-eslint/no-unused-vars */
/* eslint-disable @typescript-eslint/await-thenable */
/* eslint-disable @typescript-eslint/no-unsafe-argument */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
import { describe, it, expect } from 'bun:test';
import { buildMeta, successResponse, errorResponse, type ApiMeta, type ApiResponse } from '../../../../src/core/http/response';

describe('HTTP Response', () => {
  const mockRequest = new Request('http://localhost/api/test');

  describe('buildMeta', () => {
    it('should build metadata with timestamp', () => {
      const meta = buildMeta(mockRequest);

      expect(meta).toHaveProperty('timestamp');
      expect(meta.timestamp).toBeDefined();
    });

    it('should include request id from header', () => {
      const requestWithId = new Request('http://localhost', {
        headers: { 'x-request-id': 'test-request-id' },
      });

      const meta = buildMeta(requestWithId);

      expect(meta.request_id).toBe('test-request-id');
    });

    it('should use provided request id', () => {
      const meta = buildMeta(mockRequest, 'custom-request-id');

      expect(meta.request_id).toBe('custom-request-id');
    });
  });

  describe('successResponse', () => {
    it('should create success response without data', () => {
      const response = successResponse(mockRequest);

      expect(response.success).toBe(true);
      expect(response.meta).toBeDefined();
    });

    it('should create success response with data', () => {
      const response = successResponse(mockRequest, { id: '123' });

      expect(response.success).toBe(true);
      expect(response.data).toEqual({ id: '123' });
    });

    it('should create success response with message', () => {
      const response = successResponse(mockRequest, undefined, 'Operation successful');

      expect(response.success).toBe(true);
      expect(response.message).toBe('Operation successful');
    });

    it('should create success response with all options', () => {
      const response = successResponse(mockRequest, { id: '123' }, 'Success', 'req-123');

      expect(response.success).toBe(true);
      expect(response.data).toEqual({ id: '123' });
      expect(response.message).toBe('Success');
      expect(response.meta.request_id).toBe('req-123');
    });
  });

  describe('errorResponse', () => {
    it('should create error response', () => {
      const response = errorResponse(mockRequest, 'ERROR_CODE', 'Error message');

      expect(response.success).toBe(false);
      expect(response.message).toBe('Error message');
      expect(response.data).toEqual({
        code: 'ERROR_CODE',
        message: 'Error message',
      });
    });

    it('should include error details', () => {
      const response = errorResponse(mockRequest, 'ERROR_CODE', 'Error message', { field: 'value' });

      expect(response.data).toEqual({
        code: 'ERROR_CODE',
        message: 'Error message',
        details: { field: 'value' },
      });
    });

    it('should include request id', () => {
      const response = errorResponse(mockRequest, 'ERROR_CODE', 'Error message', undefined, 'req-123');

      expect(response.meta.request_id).toBe('req-123');
    });
  });
});
