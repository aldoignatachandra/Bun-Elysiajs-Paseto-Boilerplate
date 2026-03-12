import { z } from 'zod';

const envSchema = z.object({
  // Server
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  PORT: z.coerce.number().default(3000),
  HOST: z.string().default('localhost'),

  // Database
  DATABASE_URL: z.string().url(),
  DATABASE_POOL_MIN: z.coerce.number().default(2),
  DATABASE_POOL_MAX: z.coerce.number().default(10),
  DATABASE_SSL: z
    .enum(['true', 'false'])
    .transform(v => v === 'true')
    .default('false'),

  // Redis
  REDIS_HOST: z.string().default('localhost'),
  REDIS_PORT: z.coerce.number().default(6379),
  REDIS_PASSWORD: z.string().optional().default(''),
  REDIS_DB: z.coerce.number().default(0),

  // PASETO - Hybrid approach
  PASETO_LOCAL_KEY: z.string().min(20), // PASERK format: k4.local.xxx...
  PASETO_PUBLIC_KEY: z.string().min(20), // PASERK format: k4.public.xxx...
  PASETO_SECRET_KEY: z.string().min(20), // PASERK format: k4.secret.xxx...

  // Token Expiry
  ACCESS_TOKEN_EXPIRY_MINUTES: z.coerce.number().default(15),
  REFRESH_TOKEN_EXPIRY_DAYS: z.coerce.number().default(7),

  // Rate Limiting
  RATE_LIMIT_ENABLED: z
    .enum(['true', 'false'])
    .transform(v => v === 'true')
    .default('true'),
  RATE_LIMIT_WINDOW_SECONDS: z.coerce.number().default(60),
  RATE_LIMIT_MAX_REQUESTS: z.coerce.number().default(100),

  // Logging
  LOG_LEVEL: z.enum(['debug', 'info', 'warn', 'error']).default('info'),
  LOG_PRETTY: z
    .enum(['true', 'false'])
    .transform(v => v === 'true')
    .default('true'),
  LOG_FORMAT: z.enum(['json', 'pretty']).default('json'),

  // CORS
  CORS_ORIGIN: z.string().default('*'),
  CORS_CREDENTIALS: z
    .enum(['true', 'false'])
    .transform(v => v === 'true')
    .default('true'),
  CORS_METHODS: z.string().default('GET,POST,PUT,DELETE,PATCH'),
  CORS_ALLOWED_HEADERS: z.string().default('Content-Type,Authorization'),

  // Security
  BCRYPT_ROUNDS: z.coerce.number().default(12),
});

export type Env = z.infer<typeof envSchema>;

export function validateEnv(): Env {
  const parsed = envSchema.safeParse(process.env);

  if (!parsed.success) {
    const errors = parsed.error.errors.map(e => `${e.path.join('.')}: ${e.message}`);
    throw new Error(`Environment validation failed:\n${errors.join('\n')}`);
  }

  // Validate PASETO keys (hybrid approach requires all three)
  if (!parsed.data.PASETO_LOCAL_KEY) {
    throw new Error('PASETO_LOCAL_KEY is required (format: k4.local.xxx...)');
  }

  if (!parsed.data.PASETO_PUBLIC_KEY || !parsed.data.PASETO_SECRET_KEY) {
    throw new Error('PASETO_PUBLIC_KEY and PASETO_SECRET_KEY are required (format: k4.public/k4.secret)');
  }

  return parsed.data;
}
