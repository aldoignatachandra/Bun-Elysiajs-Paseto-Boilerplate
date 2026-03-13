import { describe, it, expect, beforeEach, afterEach } from 'bun:test';

describe('Database Connection Module', () => {
  beforeEach(async () => {
    // Reset connection state before each test
    try {
      const connection = await import('@/database/connection');
      if (connection.__resetConnectionState) {
        connection.__resetConnectionState();
      }
    } catch {
      // Module not loaded yet
    }
  });

  afterEach(async () => {
    // Clean up after each test
    try {
      const connection = await import('@/database/connection');
      if (connection.__resetConnectionState) {
        connection.__resetConnectionState();
      }
    } catch {
      // Module not loaded
    }
  });

  describe('getConnection', () => {
    it('should export getConnection function', async () => {
      const { getConnection } = await import('@/database/connection');
      expect(typeof getConnection).toBe('function');
    });

    it('should return db instance', async () => {
      const { getConnection } = await import('@/database/connection');
      const db = getConnection();

      expect(db).toBeDefined();
      expect(typeof db).toBe('object');
    });

    it('should return same instance on subsequent calls', async () => {
      const { getConnection } = await import('@/database/connection');
      const db1 = getConnection();
      const db2 = getConnection();

      expect(db1).toBe(db2);
    });

    it('should return object with query methods', async () => {
      const { getConnection } = await import('@/database/connection');
      const db = getConnection();

      expect(db).toHaveProperty('select');
      expect(db).toHaveProperty('insert');
      expect(db).toHaveProperty('update');
      expect(db).toHaveProperty('delete');
      expect(typeof db.select).toBe('function');
    });
  });

  describe('closeConnection', () => {
    it('should export closeConnection function', async () => {
      const { closeConnection } = await import('@/database/connection');
      expect(typeof closeConnection).toBe('function');
    });

    it('should close connection', async () => {
      const { getConnection, closeConnection } = await import('@/database/connection');
      getConnection();

      await closeConnection();

      // Should resolve without error
      expect(true).toBe(true);
    });

    it('should resolve immediately when no pool exists', async () => {
      const { closeConnection } = await import('@/database/connection');

      // Close without opening first
      const result = await closeConnection();

      expect(result).toBeUndefined();
    });

    it('should allow closing multiple times', async () => {
      const { getConnection, closeConnection } = await import('@/database/connection');
      getConnection();

      await closeConnection();

      // Second close should also work
      await closeConnection();

      expect(true).toBe(true);
    });
  });

  describe('isPoolHealthy', () => {
    it('should export isPoolHealthy function', async () => {
      const { isPoolHealthy } = await import('@/database/connection');
      expect(typeof isPoolHealthy).toBe('function');
    });

    it('should return false when no pool exists', async () => {
      const { isPoolHealthy } = await import('@/database/connection');
      const isHealthy = isPoolHealthy();

      expect(isHealthy).toBe(false);
    });

    it('should return boolean indicating pool health', async () => {
      const { getConnection, isPoolHealthy } = await import('@/database/connection');
      getConnection();

      const isHealthy = isPoolHealthy();

      // Should return a boolean (true if pool has connections, false otherwise)
      expect(typeof isHealthy).toBe('boolean');
    });
  });

  describe('getPoolStatistics', () => {
    it('should export getPoolStatistics function', async () => {
      const { getPoolStatistics } = await import('@/database/connection');
      expect(typeof getPoolStatistics).toBe('function');
    });

    it('should return pool statistics when pool exists', async () => {
      const { getConnection, getPoolStatistics } = await import('@/database/connection');
      getConnection();

      const stats = getPoolStatistics();

      expect(stats).toBeDefined();
      expect(stats).toHaveProperty('totalCount');
      expect(stats).toHaveProperty('idleCount');
      expect(stats).toHaveProperty('waitingCount');
      expect(typeof stats.totalCount).toBe('number');
      expect(typeof stats.idleCount).toBe('number');
      expect(typeof stats.waitingCount).toBe('number');
    });

    it('should return null when no pool exists', async () => {
      const { getPoolStatistics } = await import('@/database/connection');
      const stats = getPoolStatistics();

      expect(stats).toBeNull();
    });
  });

  describe('__resetConnectionState', () => {
    it('should export __resetConnectionState function', async () => {
      const { __resetConnectionState } = await import('@/database/connection');
      expect(typeof __resetConnectionState).toBe('function');
    });

    it('should reset connection state', async () => {
      const { getConnection, __resetConnectionState, isPoolHealthy } = await import('@/database/connection');
      getConnection();

      __resetConnectionState();

      const isHealthy = isPoolHealthy();
      expect(isHealthy).toBe(false);
    });
  });

  describe('Database Type Export', () => {
    it('should have Database type', async () => {
      const connection = await import('@/database/connection');
      // Database is a type export, so we verify the module has the expected exports
      expect(connection).toHaveProperty('getConnection');
      expect(connection).toHaveProperty('closeConnection');
      expect(connection).toHaveProperty('isPoolHealthy');
      expect(connection).toHaveProperty('getPoolStatistics');
    });
  });

  describe('Integration Scenarios', () => {
    it('should handle full connection lifecycle', async () => {
      const { getConnection, isPoolHealthy, getPoolStatistics, closeConnection } = await import('@/database/connection');

      // Initial state
      expect(isPoolHealthy()).toBe(false);

      // Connect
      const db = getConnection();
      expect(db).toBeDefined();
      // Health depends on actual pool state
      expect(typeof isPoolHealthy()).toBe('boolean');

      // Get statistics
      const stats = getPoolStatistics();
      expect(stats).toBeDefined();

      // Close
      await closeConnection();
      expect(isPoolHealthy()).toBe(false);
    });

    it('should allow reconnection after closing', async () => {
      const { getConnection, closeConnection } = await import('@/database/connection');

      // First connection
      const db1 = getConnection();

      await closeConnection();

      // Second connection
      const db2 = getConnection();

      // Should be different instances since we reset
      expect(db1).not.toBe(db2);
    });

    it('should provide consistent interface across multiple calls', async () => {
      const { getConnection, closeConnection } = await import('@/database/connection');

      const db1 = getConnection();
      const db2 = getConnection();
      const db3 = getConnection();

      expect(db1).toBe(db2);
      expect(db2).toBe(db3);

      await closeConnection();
    });
  });
});
