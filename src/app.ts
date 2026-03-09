/**
 * Main Application File
 *
 * Creates and configures the Elysia application with all middleware,
 * routes, and error handling. This is the central entry point that
 * ties all components together into a working API server.
 *
 * Features:
 * - CORS configuration
 * - Request/response logging
 * - Global error handling
 * - Health check endpoint
 * - API routes (auth, users)
 * - Swagger documentation
 * - 404 handling
 *
 * @module App
 */

import { Elysia } from 'elysia';
import { cors } from '@elysiajs/cors';
import { swagger } from '@elysiajs/swagger';
import { logger } from './core/logging/logger';
import { loggingPlugin } from './core/logging/middleware';
import { getConnection } from './database/connection';
import { UnitOfWork } from './repositories/unit-of-work';
import { PasswordService } from './core/crypto/password.service';
import { PasetoService } from './core/paseto/paseto.service';
import { AuthService } from './services/auth.service';
import { UsersService } from './services/users.service';
import { createAuthRoutes } from './routes/auth.routes';
import { createUsersRoutes } from './routes/users.routes';
import { AppError } from './core/errors/app-error';

/**
 * Create and configure the Elysia application
 *
 * Sets up all middleware, routes, error handlers, and documentation.
 * Initializes all required services and dependencies.
 *
 * @returns Configured Elysia application instance
 */
export function createApp(): Elysia {
  // Initialize dependencies
  const db = getConnection();
  const unitOfWork = new UnitOfWork(db);
  const passwordService = new PasswordService();
  const pasetoService = new PasetoService({
    localKey: process.env.PASETO_LOCAL_KEY!,
    publicKey: process.env.PASETO_PUBLIC_KEY!,
    secretKey: process.env.PASETO_SECRET_KEY!,
    accessTokenExpiry: {
      value: Number(process.env.ACCESS_TOKEN_EXPIRY_MINUTES) || 15,
      unit: 'm',
    },
    refreshTokenExpiry: {
      value: Number(process.env.REFRESH_TOKEN_EXPIRY_DAYS) || 7,
      unit: 'd',
    },
  });
  const authService = new AuthService(unitOfWork, pasetoService, passwordService);
  const usersService = new UsersService(unitOfWork, passwordService);

  const app = new Elysia()
    // CORS configuration
    .use(
      cors({
        origin: process.env.CORS_ORIGIN || '*',
        credentials: process.env.CORS_CREDENTIALS === 'true',
        methods: (process.env.CORS_METHODS || 'GET,POST,PUT,DELETE,PATCH').split(','),
        allowedHeaders: (process.env.CORS_ALLOWED_HEADERS || 'Content-Type,Authorization').split(
          ','
        ),
      })
    )
    // Logging middleware
    .use(loggingPlugin())
    // Global error handler
    .onError(({ error, set }) => {
      logger.error('Unhandled error', error);

      // Handle AppError instances
      if (error instanceof AppError) {
        set.status = error.status;
        /* eslint-disable @typescript-eslint/no-unsafe-assignment */
        return {
          success: false,
          error: {
            code: error.code,
            message: error.message,
            ...(error.details && { details: error.details }),
            statusCode: error.status,
          },
        };
        /* eslint-enable @typescript-eslint/no-unsafe-assignment */
      }

      // Handle standard errors
      if (error instanceof Error) {
        set.status = 500;
        return {
          success: false,
          error: {
            code: 'INTERNAL_ERROR',
            message: 'An unexpected error occurred',
            ...(process.env.NODE_ENV === 'development' && { details: error.message }),
            statusCode: 500,
          },
        };
      }

      // Handle unknown errors
      set.status = 500;
      return {
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: 'An unexpected error occurred',
          statusCode: 500,
        },
      };
    })
    // Health check endpoint
    .get('/health', () => ({
      status: 'ok',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
    }))
    // API Routes
    .use(createAuthRoutes(new Elysia(), authService, pasetoService))
    .use(createUsersRoutes(new Elysia(), usersService, authService, pasetoService))
    // Swagger documentation (available in all environments for development)
    .use(
      swagger({
        documentation: {
          info: {
            title: 'Bun Elysia PASETO API',
            version: '1.0.0',
            description: 'Production-ready monolith REST API with PASETO v4 authentication',
          },
          tags: [
            { name: 'Authentication', description: 'User authentication endpoints' },
            { name: 'Users', description: 'User management endpoints' },
          ],
        },
      })
    )
    // 404 handler - must be last
    .all('*', ({ set }) => {
      set.status = 404;
      return {
        success: false,
        error: {
          code: 'NOT_FOUND',
          message: 'Route not found',
          statusCode: 404,
        },
      };
    });

  logger.info('Application created successfully');
  return app;
}
