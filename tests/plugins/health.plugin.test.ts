import { describe, it, expect } from 'bun:test';
import { Elysia } from 'elysia';
import { healthPlugin } from '@/plugins/health.plugin';

// Define interfaces for test typing
interface HealthCheckResult {
  status: 'ok' | 'error';
  latency?: number;
  error?: string;
}

interface HealthResponse {
  status: 'ok' | 'degraded';
  timestamp: string;
  checks: {
    database: HealthCheckResult;
    redis: HealthCheckResult;
  };
}

interface ProbeResponse {
  status: string;
  timestamp: string;
}

describe('Health Plugin', () => {
  describe('GET /health', () => {
    it('should return health check response with proper structure', async () => {
      const app = new Elysia().use(healthPlugin());
      const response = (await app
        .handle(new Request('http://localhost/health'))
        .then(res => res.json())) as HealthResponse;

      expect(response).toBeDefined();
      expect(['ok', 'degraded']).toContain(response.status);
      expect(response.checks).toBeDefined();
      expect(response.checks.database).toBeDefined();
      expect(response.checks.redis).toBeDefined();
      expect(response.timestamp).toBeDefined();
    });

    it.skip('should return 503 when database fails', () => {
      // TODO: Implement this test with proper mocking of the database connection
      // The test should:
      // 1. Mock the database connection to throw an error or return failure
      // 2. Call the /health endpoint
      // 3. Verify the response status is 503
      // 4. Verify the response contains error details for the database check
      //
      // Example implementation approach:
      // - Use vi.mock() to mock the database connection module
      // - Mock getConnection() to return a connection that fails queries
      // - Or use dependency injection to provide a mock connection
    });

    it.skip('should return 503 when Redis fails', () => {
      // TODO: Implement this test with proper mocking of the Redis connection
      // The test should:
      // 1. Mock the Redis connection to throw an error or return failure
      // 2. Call the /health endpoint
      // 3. Verify the response status is 503
      // 4. Verify the response contains error details for the Redis check
      //
      // Example implementation approach:
      // - Use vi.mock() to mock the Redis connection module
      // - Mock the Redis client to simulate connection failures
      // - Or use dependency injection to provide a mock Redis client
    });

    it('should include latency measurements for each check', async () => {
      const app = new Elysia().use(healthPlugin());
      const response = (await app
        .handle(new Request('http://localhost/health'))
        .then(res => res.json())) as HealthResponse;

      expect(response.checks.database.latency).toBeDefined();
      expect(typeof response.checks.database.latency).toBe('number');
      expect(response.checks.redis.latency).toBeDefined();
      expect(typeof response.checks.redis.latency).toBe('number');
    });
  });

  describe('GET /health/ready', () => {
    it('should return 200 for readiness probe', async () => {
      const app = new Elysia().use(healthPlugin());
      const response = (await app.handle(new Request('http://localhost/health/ready')).then(res => {
        expect(res.status).toBe(200);
        return res.json();
      })) as ProbeResponse;

      expect(response.status).toBe('ready');
    });
  });

  describe('GET /health/live', () => {
    it('should return 200 for liveness probe', async () => {
      const app = new Elysia().use(healthPlugin());
      const response = (await app.handle(new Request('http://localhost/health/live')).then(res => {
        expect(res.status).toBe(200);
        return res.json();
      })) as ProbeResponse;

      expect(response.status).toBe('alive');
    });
  });
});
