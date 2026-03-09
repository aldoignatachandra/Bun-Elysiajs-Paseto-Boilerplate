import { describe, it, expect } from 'bun:test';
import { Elysia } from 'elysia';
import { registerPlugins, type PluginConfig } from '@/plugins';

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

describe('Plugin Registry', () => {
  it('should register health plugin by default', async () => {
    const app = new Elysia();
    const configuredApp = registerPlugins(app);

    const response = (await configuredApp
      .handle(new Request('http://localhost/health'))
      .then(res => res.json())) as HealthResponse;

    expect(response).toBeDefined();
    expect(response.checks).toBeDefined();
    expect(response.checks.database).toBeDefined();
    expect(response.checks.redis).toBeDefined();
  });

  it('should register health plugin when explicitly enabled', async () => {
    const app = new Elysia();
    const config: PluginConfig = { health: true };
    const configuredApp = registerPlugins(app, config);

    const response = (await configuredApp
      .handle(new Request('http://localhost/health'))
      .then(res => res.json())) as HealthResponse;

    expect(response).toBeDefined();
    expect(response.checks).toBeDefined();
  });

  it('should not register health plugin when disabled', async () => {
    const app = new Elysia();
    const config: PluginConfig = { health: false };
    const configuredApp = registerPlugins(app, config);

    const response = await configuredApp.handle(new Request('http://localhost/health'));

    // Should return 404 since the health plugin is not registered
    expect(response.status).toBe(404);
  });

  it('should register metrics plugin when enabled', () => {
    const app = new Elysia();
    const config: PluginConfig = { metrics: true };
    const configuredApp = registerPlugins(app, config);

    expect(configuredApp).toBeDefined();
  });

  it('should register tracing plugin when enabled', () => {
    const app = new Elysia();
    const config: PluginConfig = { tracing: true };
    const configuredApp = registerPlugins(app, config);

    expect(configuredApp).toBeDefined();
  });

  it('should register all plugins when all enabled', async () => {
    const app = new Elysia();
    const config: PluginConfig = {
      health: true,
      metrics: true,
      tracing: true,
    };
    const configuredApp = registerPlugins(app, config);

    const response = (await configuredApp
      .handle(new Request('http://localhost/health'))
      .then(res => res.json())) as HealthResponse;

    expect(response).toBeDefined();
    expect(response.checks).toBeDefined();
  });

  it('should return the same app instance', () => {
    const app = new Elysia();
    const configuredApp = registerPlugins(app);

    expect(configuredApp).toBe(app);
  });
});
