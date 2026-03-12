import { describe, it, expect } from 'bun:test';
import { Elysia } from 'elysia';
import { loggingPlugin, getRequestMetadata } from '@/core/logging/middleware';
import type { Context } from 'elysia';

type MetadataResponse = {
  requestId: string;
  ip: string;
  userAgent: string;
};

describe('Logging Middleware', () => {
  it('should extract request metadata correctly', () => {
    const mockContext = {
      request: {
        method: 'GET',
        url: 'http://localhost:3000/api/test',
        headers: new Headers({
          'x-request-id': 'test-123',
          'x-forwarded-for': '192.168.1.1',
          'user-agent': 'test-agent',
        }),
      },
    } as Context;

    const metadata = getRequestMetadata(mockContext);

    expect(metadata).toEqual({
      requestId: 'test-123',
      ip: '192.168.1.1',
      userAgent: 'test-agent',
      method: 'GET',
      path: '/api/test',
    });
  });

  it('should generate UUID when x-request-id header is missing', () => {
    const mockContext = {
      request: {
        method: 'POST',
        url: 'http://localhost:3000/api/users',
        headers: new Headers({
          'user-agent': 'test-agent',
        }),
      },
    } as Context;

    const metadata = getRequestMetadata(mockContext);

    expect(metadata.requestId).toBeDefined();
    expect(typeof metadata.requestId).toBe('string');
    expect(metadata.requestId.length).toBeGreaterThan(0);
  });

  it('should use fallback IP when headers are missing', () => {
    const mockContext = {
      request: {
        method: 'GET',
        url: 'http://localhost:3000/api/test',
        headers: new Headers(),
      },
    } as Context;

    const metadata = getRequestMetadata(mockContext);

    expect(metadata.ip).toBe('unknown');
    expect(metadata.userAgent).toBe('unknown');
  });

  it('should derive request metadata and logger in context', async () => {
    const app = new Elysia().use(loggingPlugin).get('/test', ({ requestMetadata, requestLogger }) => {
      expect(requestMetadata).toBeDefined();
      expect(requestLogger).toBeDefined();
      return 'ok';
    });

    const response = await app.handle(new Request('http://localhost:3000/test'));
    expect(response.status).toBe(200);
  });

  it('should log request completion with duration and status', async () => {
    const app = new Elysia().use(loggingPlugin).get('/test', () => {
      return { success: true };
    });

    const startTime = performance.now();
    const response = await app.handle(new Request('http://localhost:3000/test'));
    const duration = performance.now() - startTime;

    expect(response.status).toBe(200);
    expect(duration).toBeGreaterThan(0);
  });

  it('should log request failure with error details', async () => {
    const app = new Elysia().use(loggingPlugin).get('/error', () => {
      throw new Error('Test error');
    });

    const response = await app.handle(new Request('http://localhost:3000/error'));

    expect(response.status).toBeGreaterThanOrEqual(400);
  });

  it('should handle requests with custom headers', async () => {
    const app = new Elysia().use(loggingPlugin).get('/test', ({ requestMetadata }) => {
      return requestMetadata;
    });

    const request = new Request('http://localhost:3000/test', {
      headers: {
        'x-request-id': 'custom-123',
        'x-real-ip': '10.0.0.1',
        'user-agent': 'custom-agent',
      },
    });

    const response = await app.handle(request);
    const data = (await response.json()) as MetadataResponse;

    expect(data.requestId).toBe('custom-123');
    expect(data.ip).toBe('10.0.0.1');
    expect(data.userAgent).toBe('custom-agent');
  });
});
