import { describe, it, expect, beforeEach } from 'bun:test';
import { validateEnv } from '@/config/env.schema';
import type { Env } from '@/config/env.schema';
import { z } from 'zod';

describe('Env Schema Validation', () => {
  beforeEach(() => {
    // Clear all test environment variables
    Object.keys(process.env).forEach(key => {
      if (
        key.startsWith('PASETO') ||
        key.startsWith('DATABASE') ||
        key.startsWith('REDIS') ||
        key.startsWith('RATE_LIMIT') ||
        key.startsWith('LOG_') ||
        key.startsWith('CORS_') ||
        key === 'NODE_ENV' ||
        key === 'PORT' ||
        key === 'HOST' ||
        key === 'BCRYPT_ROUNDS' ||
        key === 'ACCESS_TOKEN_EXPIRY_MINUTES' ||
        key === 'REFRESH_TOKEN_EXPIRY_DAYS'
      ) {
        delete process.env[key];
      }
    });
  });

  const getValidEnv = (): Record<string, string> => ({
    NODE_ENV: 'development',
    PORT: '3000',
    HOST: 'localhost',
    DATABASE_URL: 'postgresql://localhost:5432/test',
    DATABASE_POOL_MIN: '2',
    DATABASE_POOL_MAX: '10',
    DATABASE_SSL: 'false',
    REDIS_HOST: 'localhost',
    REDIS_PORT: '6379',
    REDIS_PASSWORD: '',
    REDIS_DB: '0',
    PASETO_LOCAL_KEY: 'k4.local.abcdefghijklmnopqrstuvwxyz123456789012',
    PASETO_PUBLIC_KEY: 'k4.public.abcdefghijklmnopqrstuvwxyz123456789012',
    PASETO_SECRET_KEY: 'k4.secret.abcdefghijklmnopqrstuvwxyz123456789012',
    ACCESS_TOKEN_EXPIRY_MINUTES: '15',
    REFRESH_TOKEN_EXPIRY_DAYS: '7',
    RATE_LIMIT_ENABLED: 'true',
    RATE_LIMIT_WINDOW_SECONDS: '60',
    RATE_LIMIT_MAX_REQUESTS: '100',
    LOG_LEVEL: 'info',
    LOG_PRETTY: 'true',
    LOG_FORMAT: 'json',
    CORS_ORIGIN: '*',
    CORS_CREDENTIALS: 'true',
    CORS_METHODS: 'GET,POST,PUT,DELETE,PATCH',
    CORS_ALLOWED_HEADERS: 'Content-Type,Authorization',
    BCRYPT_ROUNDS: '12',
  });

  // Rebuild envSchema locally for testing since it's not exported
  const envSchema = z.object({
    NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
    PORT: z.coerce.number().default(3000),
    HOST: z.string().default('localhost'),
    DATABASE_URL: z.string().url(),
    DATABASE_POOL_MIN: z.coerce.number().default(2),
    DATABASE_POOL_MAX: z.coerce.number().default(10),
    DATABASE_SSL: z
      .enum(['true', 'false'])
      .transform(v => v === 'true')
      .default('false'),
    REDIS_HOST: z.string().default('localhost'),
    REDIS_PORT: z.coerce.number().default(6379),
    REDIS_PASSWORD: z.string().optional().default(''),
    REDIS_DB: z.coerce.number().default(0),
    PASETO_LOCAL_KEY: z.string().min(20),
    PASETO_PUBLIC_KEY: z.string().min(20),
    PASETO_SECRET_KEY: z.string().min(20),
    ACCESS_TOKEN_EXPIRY_MINUTES: z.coerce.number().default(15),
    REFRESH_TOKEN_EXPIRY_DAYS: z.coerce.number().default(7),
    RATE_LIMIT_ENABLED: z
      .enum(['true', 'false'])
      .transform(v => v === 'true')
      .default('true'),
    RATE_LIMIT_WINDOW_SECONDS: z.coerce.number().default(60),
    RATE_LIMIT_MAX_REQUESTS: z.coerce.number().default(100),
    LOG_LEVEL: z.enum(['debug', 'info', 'warn', 'error']).default('info'),
    LOG_PRETTY: z
      .enum(['true', 'false'])
      .transform(v => v === 'true')
      .default('true'),
    LOG_FORMAT: z.enum(['json', 'pretty']).default('json'),
    CORS_ORIGIN: z.string().default('*'),
    CORS_CREDENTIALS: z
      .enum(['true', 'false'])
      .transform(v => v === 'true')
      .default('true'),
    CORS_METHODS: z.string().default('GET,POST,PUT,DELETE,PATCH'),
    CORS_ALLOWED_HEADERS: z.string().default('Content-Type,Authorization'),
    BCRYPT_ROUNDS: z.coerce.number().default(12),
  });

  describe('envSchema', () => {
    it('should not export envSchema (implementation detail)', async () => {
      const schema = await import('@/config/env.schema');
      // @ts-expect-error - Testing that envSchema is not exported
      expect(schema.envSchema).toBeUndefined();
    });

    it('should validate valid environment', () => {
      const validEnv = getValidEnv();
      const result = envSchema.safeParse(validEnv);
      expect(result.success).toBe(true);
    });

    it('should fail with missing required DATABASE_URL', () => {
      const validEnv = getValidEnv();
      delete validEnv.DATABASE_URL;
      const result = envSchema.safeParse(validEnv);
      expect(result.success).toBe(false);
    });

    it('should fail with missing required PASETO keys', () => {
      const validEnv = getValidEnv();
      delete validEnv.PASETO_LOCAL_KEY;
      const result = envSchema.safeParse(validEnv);
      expect(result.success).toBe(false);
    });

    it('should fail with invalid NODE_ENV', () => {
      const validEnv = getValidEnv();
      validEnv.NODE_ENV = 'invalid' as any;
      const result = envSchema.safeParse(validEnv);
      expect(result.success).toBe(false);
    });

    it('should fail with invalid LOG_LEVEL', () => {
      const validEnv = getValidEnv();
      validEnv.LOG_LEVEL = 'invalid' as any;
      const result = envSchema.safeParse(validEnv);
      expect(result.success).toBe(false);
    });

    it('should parse PORT as number', () => {
      const validEnv = getValidEnv();
      validEnv.PORT = '8080';
      const result = envSchema.safeParse(validEnv);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(typeof result.data.PORT).toBe('number');
        expect(result.data.PORT).toBe(8080);
      }
    });

    it('should parse boolean strings as boolean', () => {
      const validEnv = getValidEnv();
      validEnv.DATABASE_SSL = 'true';
      validEnv.RATE_LIMIT_ENABLED = 'true';
      validEnv.LOG_PRETTY = 'false';
      validEnv.CORS_CREDENTIALS = 'true';

      const result = envSchema.safeParse(validEnv);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(typeof result.data.DATABASE_SSL).toBe('boolean');
        expect(typeof result.data.RATE_LIMIT_ENABLED).toBe('boolean');
        expect(typeof result.data.LOG_PRETTY).toBe('boolean');
        expect(typeof result.data.CORS_CREDENTIALS).toBe('boolean');
        expect(result.data.DATABASE_SSL).toBe(true);
        expect(result.data.RATE_LIMIT_ENABLED).toBe(true);
        expect(result.data.LOG_PRETTY).toBe(false);
        expect(result.data.CORS_CREDENTIALS).toBe(true);
      }
    });

    it('should provide defaults for optional fields', () => {
      const minimalEnv: Record<string, string> = {
        DATABASE_URL: 'postgresql://localhost:5432/test',
        PASETO_LOCAL_KEY: 'k4.local.abcdefghijklmnopqrstuvwxyz123456789012',
        PASETO_PUBLIC_KEY: 'k4.public.abcdefghijklmnopqrstuvwxyz123456789012',
        PASETO_SECRET_KEY: 'k4.secret.abcdefghijklmnopqrstuvwxyz123456789012',
      };

      const result = envSchema.safeParse(minimalEnv);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.NODE_ENV).toBe('development');
        expect(result.data.PORT).toBe(3000);
        expect(result.data.HOST).toBe('localhost');
        expect(result.data.DATABASE_POOL_MIN).toBe(2);
        expect(result.data.DATABASE_POOL_MAX).toBe(10);
        expect(result.data.REDIS_HOST).toBe('localhost');
        expect(result.data.REDIS_PORT).toBe(6379);
        expect(result.data.REDIS_PASSWORD).toBe('');
        expect(result.data.REDIS_DB).toBe(0);
        expect(result.data.ACCESS_TOKEN_EXPIRY_MINUTES).toBe(15);
        expect(result.data.REFRESH_TOKEN_EXPIRY_DAYS).toBe(7);
        expect(result.data.RATE_LIMIT_ENABLED).toBe(true);
        expect(result.data.RATE_LIMIT_WINDOW_SECONDS).toBe(60);
        expect(result.data.RATE_LIMIT_MAX_REQUESTS).toBe(100);
        expect(result.data.LOG_LEVEL).toBe('info');
        expect(result.data.LOG_PRETTY).toBe(true);
        expect(result.data.LOG_FORMAT).toBe('json');
        expect(result.data.CORS_ORIGIN).toBe('*');
        expect(result.data.CORS_CREDENTIALS).toBe(true);
        expect(result.data.CORS_METHODS).toBe('GET,POST,PUT,DELETE,PATCH');
        expect(result.data.CORS_ALLOWED_HEADERS).toBe('Content-Type,Authorization');
        expect(result.data.BCRYPT_ROUNDS).toBe(12);
      }
    });

    it('should accept valid NODE_ENV values', () => {
      const validEnv = getValidEnv();
      const validValues = ['development', 'production', 'test'] as const;

      validValues.forEach(value => {
        validEnv.NODE_ENV = value;
        const result = envSchema.safeParse(validEnv);
        expect(result.success).toBe(true);
        if (result.success) {
          expect(result.data.NODE_ENV).toBe(value);
        }
      });
    });

    it('should accept valid LOG_LEVEL values', () => {
      const validEnv = getValidEnv();
      const validValues = ['debug', 'info', 'warn', 'error'] as const;

      validValues.forEach(value => {
        validEnv.LOG_LEVEL = value;
        const result = envSchema.safeParse(validEnv);
        expect(result.success).toBe(true);
        if (result.success) {
          expect(result.data.LOG_LEVEL).toBe(value);
        }
      });
    });

    it('should accept valid LOG_FORMAT values', () => {
      const validEnv = getValidEnv();
      const validValues = ['json', 'pretty'] as const;

      validValues.forEach(value => {
        validEnv.LOG_FORMAT = value;
        const result = envSchema.safeParse(validEnv);
        expect(result.success).toBe(true);
        if (result.success) {
          expect(result.data.LOG_FORMAT).toBe(value);
        }
      });
    });

    it('should validate DATABASE_URL as URL', () => {
      const validEnv = getValidEnv();
      validEnv.DATABASE_URL = 'not-a-url';
      const result = envSchema.safeParse(validEnv);
      expect(result.success).toBe(false);
    });

    it('should allow optional REDIS_PASSWORD', () => {
      const validEnv = getValidEnv();
      delete validEnv.REDIS_PASSWORD;
      const result = envSchema.safeParse(validEnv);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.REDIS_PASSWORD).toBeDefined();
      }
    });

    it('should require PASETO_LOCAL_KEY with minimum length', () => {
      const validEnv = getValidEnv();
      validEnv.PASETO_LOCAL_KEY = 'short';
      const result = envSchema.safeParse(validEnv);
      expect(result.success).toBe(false);
    });

    it('should require PASETO_PUBLIC_KEY with minimum length', () => {
      const validEnv = getValidEnv();
      validEnv.PASETO_PUBLIC_KEY = 'short';
      const result = envSchema.safeParse(validEnv);
      expect(result.success).toBe(false);
    });

    it('should require PASETO_SECRET_KEY with minimum length', () => {
      const validEnv = getValidEnv();
      validEnv.PASETO_SECRET_KEY = 'short';
      const result = envSchema.safeParse(validEnv);
      expect(result.success).toBe(false);
    });
  });

  describe('validateEnv', () => {
    it('should export validateEnv function', async () => {
      const schema = await import('@/config/env.schema');
      expect(typeof schema.validateEnv).toBe('function');
    });

    it('should validate valid environment and return Env', () => {
      const validEnv = getValidEnv();
      Object.assign(process.env, validEnv);
      const result = validateEnv();
      expect(result).toBeDefined();
      expect(typeof result).toBe('object');
    });

    it('should throw error with missing required fields', () => {
      // Clear all environment variables
      Object.keys(process.env).forEach(key => {
        if (key.startsWith('PASETO') || key.startsWith('DATABASE') || key === 'NODE_ENV') {
          delete process.env[key];
        }
      });

      expect(() => validateEnv()).toThrow('Environment validation failed');
    });

    it('should throw error with invalid NODE_ENV', () => {
      const validEnv = getValidEnv();
      validEnv.NODE_ENV = 'invalid' as any;
      Object.assign(process.env, validEnv);
      expect(() => validateEnv()).toThrow();
    });

    it('should parse port as number', () => {
      const validEnv = getValidEnv();
      validEnv.PORT = '8080';
      Object.assign(process.env, validEnv);
      const result = validateEnv();
      expect(result.PORT).toBe(8080);
      expect(typeof result.PORT).toBe('number');
    });

    it('should provide defaults for optional fields', () => {
      const minimalEnv: Record<string, string> = {
        DATABASE_URL: 'postgresql://localhost:5432/test',
        PASETO_LOCAL_KEY: 'k4.local.abcdefghijklmnopqrstuvwxyz123456789012',
        PASETO_PUBLIC_KEY: 'k4.public.abcdefghijklmnopqrstuvwxyz123456789012',
        PASETO_SECRET_KEY: 'k4.secret.abcdefghijklmnopqrstuvwxyz123456789012',
      };
      Object.assign(process.env, minimalEnv);

      const result = validateEnv();
      expect(result.NODE_ENV).toBe('development');
      expect(result.PORT).toBe(3000);
      expect(result.HOST).toBe('localhost');
      expect(result.DATABASE_POOL_MIN).toBe(2);
      expect(result.DATABASE_POOL_MAX).toBe(10);
    });

    it('should throw error when PASETO_LOCAL_KEY is missing', () => {
      const validEnv = getValidEnv();
      delete validEnv.PASETO_LOCAL_KEY;
      Object.assign(process.env, validEnv);
      expect(() => validateEnv()).toThrow('PASETO_LOCAL_KEY');
    });

    it('should throw error when PASETO_PUBLIC_KEY is missing', () => {
      const validEnv = getValidEnv();
      delete validEnv.PASETO_PUBLIC_KEY;
      Object.assign(process.env, validEnv);
      expect(() => validateEnv()).toThrow('PASETO_PUBLIC_KEY');
    });

    it('should throw error when PASETO_SECRET_KEY is missing', () => {
      const validEnv = getValidEnv();
      delete validEnv.PASETO_SECRET_KEY;
      Object.assign(process.env, validEnv);
      expect(() => validateEnv()).toThrow('PASETO_SECRET_KEY');
    });
  });

  describe('Env Type Export', () => {
    it('should export Env type', () => {
      const validEnv = getValidEnv();
      Object.assign(process.env, validEnv);
      const env: Env = validateEnv();
      expect(env).toBeDefined();
      expect(typeof env).toBe('object');
    });
  });
});
