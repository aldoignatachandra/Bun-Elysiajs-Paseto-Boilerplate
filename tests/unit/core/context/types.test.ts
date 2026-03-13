/* eslint-disable @typescript-eslint/no-explicit-any */
import { describe, it, expect } from 'bun:test';
import type { RequestMetadata, PerformanceMetrics, RequestContext, ContextEnhancerOptions } from '@core/context/types';

describe('Context Types', () => {
  describe('RequestMetadata', () => {
    it('should accept valid request metadata structure', () => {
      const metadata: RequestMetadata = {
        requestId: 'test-123',
        clientIp: '127.0.0.1',
        originalIp: '192.168.1.1',
        userAgent: 'TestAgent/1.0',
        method: 'GET',
        path: '/api/test',
        url: 'http://localhost/api/test',
        query: { foo: 'bar' },
        origin: 'http://localhost',
        contentType: 'application/json',
        accept: 'application/json',
        acceptLanguage: 'en-US',
        hasAuthorization: true,
        timestamp: new Date().toISOString(),
        ipChain: ['192.168.1.1', '10.0.0.1'],
      };

      expect(metadata.requestId).toBe('test-123');
      expect(metadata.clientIp).toBe('127.0.0.1');
      expect(metadata.ipChain).toEqual(['192.168.1.1', '10.0.0.1']);
    });

    it('should accept minimal request metadata', () => {
      const metadata: RequestMetadata = {
        requestId: 'test-123',
        clientIp: '127.0.0.1',
        userAgent: 'unknown',
        method: 'GET',
        path: '/',
        url: 'http://localhost/',
        query: {},
        origin: 'http://localhost',
        hasAuthorization: false,
        timestamp: new Date().toISOString(),
      };

      expect(metadata.requestId).toBeDefined();
      expect(metadata.contentType).toBeUndefined();
      expect(metadata.originalIp).toBeUndefined();
    });
  });

  describe('PerformanceMetrics', () => {
    it('should accept valid performance metrics structure', () => {
      const metrics: PerformanceMetrics = {
        startTime: performance.now(),
        endTime: performance.now() + 1000,
        duration: 1000,
        markers: new Map([['marker1', 100]]),
      };

      expect(metrics.startTime).toBeGreaterThan(0);
      expect(metrics.endTime).toBeDefined();
      expect(metrics.duration).toBe(1000);
      expect(metrics.markers.get('marker1')).toBe(100);
    });

    it('should accept initial performance metrics without end time', () => {
      const metrics: PerformanceMetrics = {
        startTime: performance.now(),
        markers: new Map(),
      };

      expect(metrics.startTime).toBeDefined();
      expect(metrics.endTime).toBeUndefined();
      expect(metrics.duration).toBeUndefined();
    });
  });

  describe('RequestContext', () => {
    it('should accept valid request context structure', () => {
      const context: RequestContext = {
        metadata: {
          requestId: 'test-123',
          clientIp: '127.0.0.1',
          userAgent: 'TestAgent/1.0',
          method: 'GET',
          path: '/',
          url: 'http://localhost/',
          query: {},
          origin: 'http://localhost',
          hasAuthorization: false,
          timestamp: new Date().toISOString(),
        },
        performance: {
          startTime: performance.now(),
          markers: new Map(),
        },
        user: {
          id: 'user-123',
          email: 'test@example.com',
          role: 'USER',
        },
        tokenId: 'token-456',
      };

      expect(context.metadata.requestId).toBe('test-123');
      expect(context.user?.id).toBe('user-123');
      expect(context.tokenId).toBe('token-456');
    });

    it('should accept request context without user', () => {
      const context: RequestContext = {
        metadata: {
          requestId: 'test-123',
          clientIp: '127.0.0.1',
          userAgent: 'unknown',
          method: 'GET',
          path: '/',
          url: 'http://localhost/',
          query: {},
          origin: 'http://localhost',
          hasAuthorization: false,
          timestamp: new Date().toISOString(),
        },
        performance: {
          startTime: performance.now(),
          markers: new Map(),
        },
      };

      expect(context.user).toBeUndefined();
      expect(context.tokenId).toBeUndefined();
    });
  });

  describe('ContextEnhancerOptions', () => {
    it('should accept valid options structure', () => {
      const options: ContextEnhancerOptions = {
        requestIdHeader: 'X-Correlation-ID',
        ipHeaders: ['x-forwarded-for', 'x-real-ip'],
        trustProxy: true,
        maxProxyDepth: 5,
      };

      expect(options.requestIdHeader).toBe('X-Correlation-ID');
      expect(options.ipHeaders).toEqual(['x-forwarded-for', 'x-real-ip']);
      expect(options.trustProxy).toBe(true);
      expect(options.maxProxyDepth).toBe(5);
    });

    it('should accept partial options', () => {
      const options: ContextEnhancerOptions = {
        requestIdHeader: 'X-Custom-ID',
      };

      expect(options.requestIdHeader).toBe('X-Custom-ID');
      expect(options.ipHeaders).toBeUndefined();
      expect(options.trustProxy).toBeUndefined();
    });
  });
});
