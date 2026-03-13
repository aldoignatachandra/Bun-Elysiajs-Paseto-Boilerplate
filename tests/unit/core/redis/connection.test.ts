/* eslint-disable @typescript-eslint/no-explicit-any */
import { describe, it, expect } from 'bun:test';

describe('Redis Connection', () => {
  describe('getRedisConnection', () => {
    it('should export getRedisConnection function', async () => {
      const { getRedisConnection } = await import('../../../../src/core/redis/connection');
      expect(typeof getRedisConnection).toBe('function');
    });
  });

  describe('isRedisHealthy', () => {
    it.skip('should export isRedisHealthy function', async () => {
      const { isRedisHealthy } = await import('../../../../src/core/redis/connection');
      expect(typeof isRedisHealthy).toBe('function');
    });
  });

  describe('closeRedisConnection', () => {
    it.skip('should export closeRedisConnection function', async () => {
      const { closeRedisConnection } = await import('../../../../src/core/redis/connection');
      expect(typeof closeRedisConnection).toBe('function');
    });
  });

  describe('getRedisConnectionInfo', () => {
    it.skip('should export getRedisConnectionInfo function', async () => {
      const { getRedisConnectionInfo } = await import('../../../../src/core/redis/connection');
      expect(typeof getRedisConnectionInfo).toBe('function');
    });

    it.skip('should return connection info object', async () => {
      const { getRedisConnectionInfo } = await import('../../../../src/core/redis/connection');
      const info = getRedisConnectionInfo();

      expect(info).toHaveProperty('connected');
      expect(info).toHaveProperty('host');
      expect(info).toHaveProperty('port');
      expect(info).toHaveProperty('db');
    });
  });
});
