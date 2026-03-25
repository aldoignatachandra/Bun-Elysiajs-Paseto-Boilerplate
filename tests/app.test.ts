import { describe, expect, it } from 'bun:test';

// Keep test runtime deterministic and independent from local machine defaults.
process.env.NODE_ENV = 'test';
process.env.PORT = process.env.PORT ?? '3000';
process.env.HOST = process.env.HOST ?? 'localhost';
process.env.DATABASE_URL = process.env.DATABASE_URL ?? 'postgresql://postgres:postgres@localhost:5432/bun_elysia_paseto';
process.env.DATABASE_POOL_MIN = process.env.DATABASE_POOL_MIN ?? '1';
process.env.DATABASE_POOL_MAX = process.env.DATABASE_POOL_MAX ?? '2';
process.env.DATABASE_SSL = process.env.DATABASE_SSL ?? 'false';
process.env.REDIS_HOST = process.env.REDIS_HOST ?? 'localhost';
process.env.REDIS_PORT = process.env.REDIS_PORT ?? '6379';
process.env.REDIS_DB = process.env.REDIS_DB ?? '0';
process.env.PASETO_LOCAL_KEY = process.env.PASETO_LOCAL_KEY ?? 'k4.local.test_local_key_for_nonprod_only_xxxxxxxxxxxxxxxxxxx';
process.env.PASETO_PUBLIC_KEY = process.env.PASETO_PUBLIC_KEY ?? 'k4.public.test_public_key_xxxxxxxxxxxxxxxxxxx';
process.env.PASETO_SECRET_KEY = process.env.PASETO_SECRET_KEY ?? 'k4.secret.test_secret_key_for_nonprod_only_xxxxxxxxxxxxxxxxxxx';
process.env.ACCESS_TOKEN_EXPIRY_MINUTES = process.env.ACCESS_TOKEN_EXPIRY_MINUTES ?? '15';
process.env.REFRESH_TOKEN_EXPIRY_DAYS = process.env.REFRESH_TOKEN_EXPIRY_DAYS ?? '7';
process.env.RATE_LIMIT_ENABLED = process.env.RATE_LIMIT_ENABLED ?? 'true';
process.env.RATE_LIMIT_WINDOW_SECONDS = process.env.RATE_LIMIT_WINDOW_SECONDS ?? '60';
process.env.RATE_LIMIT_MAX_REQUESTS = process.env.RATE_LIMIT_MAX_REQUESTS ?? '100';
process.env.LOG_LEVEL = process.env.LOG_LEVEL ?? 'info';
process.env.LOG_PRETTY = process.env.LOG_PRETTY ?? 'false';
process.env.LOG_FORMAT = process.env.LOG_FORMAT ?? 'json';
process.env.CORS_ORIGIN = process.env.CORS_ORIGIN ?? '*';
process.env.CORS_CREDENTIALS = process.env.CORS_CREDENTIALS ?? 'true';
process.env.CORS_METHODS = process.env.CORS_METHODS ?? 'GET,POST,PUT,DELETE,PATCH';
process.env.CORS_ALLOWED_HEADERS = process.env.CORS_ALLOWED_HEADERS ?? 'Content-Type,Authorization,X-Request-ID';
process.env.BCRYPT_ROUNDS = process.env.BCRYPT_ROUNDS ?? '12';

const appPromise = import('../src/app').then(m => m.createApp());

describe('app', () => {
  it('returns liveness health response', async () => {
    const app = await appPromise;
    const res = await app.handle(new Request('http://localhost/health/live'));
    const body = (await res.json()) as { status: string };

    expect(res.status).toBe(200);
    expect(body.status).toBe('alive');
  });

  it('exposes openapi documentation', async () => {
    const app = await appPromise;
    const res = await app.handle(new Request('http://localhost/openapi'));

    expect(res.status).toBe(200);
  });

  it('returns standardized not-found response for unknown route', async () => {
    const app = await appPromise;
    const res = await app.handle(new Request('http://localhost/unknown-route'));
    const body = (await res.json()) as {
      success: boolean;
      data?: { code: string; message: string };
    };

    expect(res.status).toBe(404);
    expect(body.success).toBe(false);
    expect(body.data?.code).toBe('NOT_FOUND');
  });
});
