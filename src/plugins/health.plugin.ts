import { Elysia } from 'elysia';
import { sql } from 'drizzle-orm';
import { getConnection } from '@database/connection';
import { getRedisConnection } from '@core/redis/connection';
import { logger } from '@core/logging/logger';

/**
 * Health check result for a single service
 */
interface HealthCheckResult {
  status: 'ok' | 'error';
  latency?: number;
  error?: string;
}

/**
 * Overall health check response
 */
interface HealthResponse {
  status: 'ok' | 'degraded';
  timestamp: string;
  checks: {
    database: HealthCheckResult;
    redis: HealthCheckResult;
  };
}

/**
 * Readiness/Liveness probe response
 */
interface ProbeResponse {
  status: string;
  timestamp: string;
}

/**
 * Check database health
 */
async function checkDatabaseHealth(): Promise<HealthCheckResult> {
  const startTime = performance.now();

  try {
    const db = getConnection();
    await db.execute(sql`SELECT 1`);
    const latency = performance.now() - startTime;

    return {
      status: 'ok',
      latency,
    };
  } catch (error) {
    const latency = performance.now() - startTime;
    logger.error('Database health check failed', { error });

    return {
      status: 'error',
      latency,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

/**
 * Check Redis health
 */
async function checkRedisHealth(): Promise<HealthCheckResult> {
  const startTime = performance.now();

  try {
    const redis = getRedisConnection();
    await redis.ping();
    const latency = performance.now() - startTime;

    return {
      status: 'ok',
      latency,
    };
  } catch (error) {
    const latency = performance.now() - startTime;
    logger.error('Redis health check failed', { error });

    return {
      status: 'error',
      latency,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

/**
 * Determine overall health status
 */
function getOverallStatus(database: HealthCheckResult, redis: HealthCheckResult): 'ok' | 'degraded' {
  if (database.status === 'ok' && redis.status === 'ok') {
    return 'ok';
  }
  return 'degraded';
}

/**
 * Get appropriate HTTP status code based on health
 */
function getStatusCode(overallStatus: 'ok' | 'degraded'): number {
  return overallStatus === 'ok' ? 200 : 503;
}

/**
 * Health check plugin
 *
 * Provides endpoints for monitoring application health:
 * - GET /health - Comprehensive health check with all services
 * - GET /health/ready - Readiness probe (Kubernetes)
 * - GET /health/live - Liveness probe (Kubernetes)
 *
 * @example
 * ```typescript
 * import { Elysia } from 'elysia';
 * import { healthPlugin } from '@/plugins/health.plugin';
 *
 * const app = new Elysia().use(healthPlugin());
 * ```
 */
export function healthPlugin() {
  return new Elysia({ name: 'health-plugin' })
    .get(
      '/health',
      async () => {
        const [database, redis] = await Promise.all([checkDatabaseHealth(), checkRedisHealth()]);

        const overallStatus = getOverallStatus(database, redis);
        const statusCode = getStatusCode(overallStatus);

        const response: HealthResponse = {
          status: overallStatus,
          timestamp: new Date().toISOString(),
          checks: {
            database,
            redis,
          },
        };

        logger.debug('Health check performed', {
          overallStatus,
          database: database.status,
          redis: redis.status,
        });

        return new Response(JSON.stringify(response), {
          status: statusCode,
          headers: {
            'Content-Type': 'application/json',
          },
        });
      },
      {
        detail: {
          summary: 'Health check endpoint',
          description: 'Returns the health status of the application and its dependencies',
          tags: ['Health'],
        },
      }
    )
    .get(
      '/health/ready',
      () => {
        const response: ProbeResponse = {
          status: 'ready',
          timestamp: new Date().toISOString(),
        };

        return new Response(JSON.stringify(response), {
          status: 200,
          headers: {
            'Content-Type': 'application/json',
          },
        });
      },
      {
        detail: {
          summary: 'Readiness probe',
          description: 'Kubernetes readiness probe endpoint',
          tags: ['Health'],
        },
      }
    )
    .get(
      '/health/live',
      () => {
        const response: ProbeResponse = {
          status: 'alive',
          timestamp: new Date().toISOString(),
        };

        return new Response(JSON.stringify(response), {
          status: 200,
          headers: {
            'Content-Type': 'application/json',
          },
        });
      },
      {
        detail: {
          summary: 'Liveness probe',
          description: 'Kubernetes liveness probe endpoint',
          tags: ['Health'],
        },
      }
    );
}
