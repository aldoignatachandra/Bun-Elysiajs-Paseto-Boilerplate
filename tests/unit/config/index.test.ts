import { describe, it, expect, beforeEach } from 'bun:test';

describe('Config Module', () => {
  beforeEach(() => {
    // Set minimal required environment variables for testing
    process.env.DATABASE_URL = 'postgresql://localhost:5432/test';
    process.env.PASETO_LOCAL_KEY = 'k4.local.abcdefghijklmnopqrstuvwxyz123456789012';
    process.env.PASETO_PUBLIC_KEY = 'k4.public.abcdefghijklmnopqrstuvwxyz123456789012';
    process.env.PASETO_SECRET_KEY = 'k4.secret.abcdefghijklmnopqrstuvwxyz123456789012';
  });

  describe('getConfig', () => {
    it('should export getConfig function', async () => {
      const config = await import('@/config/index');
      expect(typeof config.getConfig).toBe('function');
    });

    it('should return Env type', async () => {
      const { getConfig } = await import('@/config/index');
      const config = getConfig();
      expect(config).toBeDefined();
      expect(typeof config).toBe('object');
    });

    it('should return database configuration', async () => {
      const { getConfig } = await import('@/config/index');
      const config = getConfig();
      expect(config).toHaveProperty('DATABASE_URL');
      expect(config).toHaveProperty('DATABASE_POOL_MIN');
      expect(config).toHaveProperty('DATABASE_POOL_MAX');
      expect(config).toHaveProperty('DATABASE_SSL');
      expect(typeof config.DATABASE_URL).toBe('string');
      expect(typeof config.DATABASE_POOL_MIN).toBe('number');
      expect(typeof config.DATABASE_POOL_MAX).toBe('number');
      expect(typeof config.DATABASE_SSL).toBe('boolean');
    });

    it('should return redis configuration', async () => {
      const { getConfig } = await import('@/config/index');
      const config = getConfig();
      expect(config).toHaveProperty('REDIS_HOST');
      expect(config).toHaveProperty('REDIS_PORT');
      expect(config).toHaveProperty('REDIS_PASSWORD');
      expect(config).toHaveProperty('REDIS_DB');
      expect(typeof config.REDIS_HOST).toBe('string');
      expect(typeof config.REDIS_PORT).toBe('number');
      expect(typeof config.REDIS_DB).toBe('number');
    });

    it('should return paseto configuration', async () => {
      const { getConfig } = await import('@/config/index');
      const config = getConfig();
      expect(config).toHaveProperty('PASETO_LOCAL_KEY');
      expect(config).toHaveProperty('PASETO_PUBLIC_KEY');
      expect(config).toHaveProperty('PASETO_SECRET_KEY');
      expect(typeof config.PASETO_LOCAL_KEY).toBe('string');
      expect(typeof config.PASETO_PUBLIC_KEY).toBe('string');
      expect(typeof config.PASETO_SECRET_KEY).toBe('string');
    });

    it('should return server configuration', async () => {
      const { getConfig } = await import('@/config/index');
      const config = getConfig();
      expect(config).toHaveProperty('NODE_ENV');
      expect(config).toHaveProperty('PORT');
      expect(config).toHaveProperty('HOST');
      expect(typeof config.NODE_ENV).toBe('string');
      expect(typeof config.PORT).toBe('number');
      expect(typeof config.HOST).toBe('string');
    });

    it('should return rate limit configuration', async () => {
      const { getConfig } = await import('@/config/index');
      const config = getConfig();
      expect(config).toHaveProperty('RATE_LIMIT_ENABLED');
      expect(config).toHaveProperty('RATE_LIMIT_WINDOW_SECONDS');
      expect(config).toHaveProperty('RATE_LIMIT_MAX_REQUESTS');
      expect(typeof config.RATE_LIMIT_ENABLED).toBe('boolean');
      expect(typeof config.RATE_LIMIT_WINDOW_SECONDS).toBe('number');
      expect(typeof config.RATE_LIMIT_MAX_REQUESTS).toBe('number');
    });

    it('should return token expiry configuration', async () => {
      const { getConfig } = await import('@/config/index');
      const config = getConfig();
      expect(config).toHaveProperty('ACCESS_TOKEN_EXPIRY_MINUTES');
      expect(config).toHaveProperty('REFRESH_TOKEN_EXPIRY_DAYS');
      expect(typeof config.ACCESS_TOKEN_EXPIRY_MINUTES).toBe('number');
      expect(typeof config.REFRESH_TOKEN_EXPIRY_DAYS).toBe('number');
    });

    it('should return logging configuration', async () => {
      const { getConfig } = await import('@/config/index');
      const config = getConfig();
      expect(config).toHaveProperty('LOG_LEVEL');
      expect(config).toHaveProperty('LOG_PRETTY');
      expect(config).toHaveProperty('LOG_FORMAT');
      expect(typeof config.LOG_LEVEL).toBe('string');
      expect(typeof config.LOG_PRETTY).toBe('boolean');
      expect(typeof config.LOG_FORMAT).toBe('string');
    });

    it('should return CORS configuration', async () => {
      const { getConfig } = await import('@/config/index');
      const config = getConfig();
      expect(config).toHaveProperty('CORS_ORIGIN');
      expect(config).toHaveProperty('CORS_CREDENTIALS');
      expect(config).toHaveProperty('CORS_METHODS');
      expect(config).toHaveProperty('CORS_ALLOWED_HEADERS');
      expect(typeof config.CORS_ORIGIN).toBe('string');
      expect(typeof config.CORS_CREDENTIALS).toBe('boolean');
      expect(typeof config.CORS_METHODS).toBe('string');
      expect(typeof config.CORS_ALLOWED_HEADERS).toBe('string');
    });

    it('should return security configuration', async () => {
      const { getConfig } = await import('@/config/index');
      const config = getConfig();
      expect(config).toHaveProperty('BCRYPT_ROUNDS');
      expect(typeof config.BCRYPT_ROUNDS).toBe('number');
    });

    it('should cache configuration after first call', async () => {
      const { getConfig } = await import('@/config/index');
      const config1 = getConfig();
      const config2 = getConfig();
      expect(config1).toBe(config2);
    });

    it('should use cached config from environment when valid', async () => {
      // This test verifies that when valid env is already set, config is returned
      const { getConfig } = await import('@/config/index');
      const config = getConfig();
      expect(config.DATABASE_URL).toBeDefined();
      expect(typeof config.DATABASE_URL).toBe('string');
      expect(config.DATABASE_URL).toMatch(/^postgresql:\/\//);
    });
  });

  describe('Env Type Export', () => {
    it('should export Env type', async () => {
      const module = await import('@/config/index');
      const { getConfig } = module;

      const config = getConfig();
      expect(config).toBeDefined();
      expect(typeof config).toBe('object');
    });
  });
});
