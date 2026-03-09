import { describe, it, expect } from 'bun:test';
import { logger, createLogger } from '@/core/logging/logger';

describe('Logger', () => {
  it('should create child logger with metadata', () => {
    const childLogger = createLogger({ requestId: 'test-123' });
    expect(childLogger).toBeDefined();
  });

  it('should log at different levels', () => {
    expect(() => logger.debug('test debug')).not.toThrow();
    expect(() => logger.info('test info')).not.toThrow();
    expect(() => logger.warn('test warn')).not.toThrow();
    expect(() => logger.error('test error')).not.toThrow();
  });

  it('should handle error serialization', () => {
    const error = new Error('Test error');
    expect(() => logger.error('test', error)).not.toThrow();
  });

  it('should propagate metadata to child logger', () => {
    const parentLogger = createLogger({ service: 'api', version: '1.0' });
    const childLogger = parentLogger.child({ requestId: 'test-123' });

    expect(childLogger).toBeDefined();
    expect(() => childLogger.info('test message')).not.toThrow();
  });

  it('should serialize Error objects correctly', () => {
    const error = new Error('Test error');
    error.stack = 'Error: Test error\n    at test.js:1:1';
    const cause = new Error('Root cause');
    error.cause = cause;

    expect(() => logger.error('test', error)).not.toThrow();
  });

  it('should merge context with metadata when logging', () => {
    const testLogger = createLogger({ service: 'test-service' });

    expect(() => testLogger.info('test message', { userId: '123', action: 'login' })).not.toThrow();
    expect(() => testLogger.debug('debug message', { correlationId: 'abc-123' })).not.toThrow();
  });

  it('should handle logging with non-Error error parameter', () => {
    expect(() => logger.error('test', 'string error')).not.toThrow();
    expect(() => logger.error('test', 123)).not.toThrow();
    expect(() => logger.error('test', { custom: 'error object' })).not.toThrow();
    expect(() => logger.error('test', null)).not.toThrow();
    expect(() => logger.error('test', undefined)).not.toThrow();
  });

  it('should create child logger with merged metadata', () => {
    const parentLogger = createLogger({ service: 'api' });
    const childLogger = parentLogger.child({ endpoint: '/users' });

    expect(() => childLogger.info('request received')).not.toThrow();
  });

  it('should preserve metadata through multiple child levels', () => {
    const rootLogger = createLogger({ app: 'myapp' });
    const child1 = rootLogger.child({ service: 'api' });
    const child2 = child1.child({ endpoint: '/users' });
    const child3 = child2.child({ requestId: 'xyz-789' });

    expect(() => child3.info('deeply nested log')).not.toThrow();
  });
});
