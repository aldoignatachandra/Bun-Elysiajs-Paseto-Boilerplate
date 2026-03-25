import { Elysia } from 'elysia';
import { cors } from '@elysiajs/cors';
import { createOpenApiConfig } from './core/openapi';
import { logger } from './core/logging/logger';
import { loggingPlugin } from './core/logging/middleware';
import { getConnection } from './database/connection';
import { UnitOfWork } from './repositories/unit-of-work';
import { PasswordService } from './core/crypto/password.service';
import { PasetoService } from './core/paseto/paseto.service';
import { AuthService } from './services/auth.service';
import { UsersService } from './services/users.service';
import { ProductsService } from './services/products.service';
import { createAuthRoutes } from './routes/auth.routes';
import { createUsersRoutes } from './routes/users.routes';
import { createProductsRoutes } from './routes/products.routes';
import { AppError } from './core/errors/app-error';
import { registerPlugins } from './plugins';
import { requestId } from './middlewares/request-id.middleware';
import { errorResponse } from './core/http/response';
import { validationErrorHandler } from './middlewares/validation.middleware';

export function createApp() {
  const db = getConnection();
  const unitOfWork = new UnitOfWork(db);
  const passwordService = new PasswordService();
  const pasetoService = new PasetoService({
    issuer: 'bun-elysia-paseto-boilerplate',
    audience: 'bun-elysia-paseto-api',
    symmetricKey: process.env.PASETO_LOCAL_KEY!,
    publicKey: process.env.PASETO_PUBLIC_KEY!,
    secretKey: process.env.PASETO_SECRET_KEY!,
    accessTokenExpiryMinutes: Number(process.env.ACCESS_TOKEN_EXPIRY_MINUTES) || 15,
    refreshTokenExpiryDays: Number(process.env.REFRESH_TOKEN_EXPIRY_DAYS) || 7,
  });

  const authService = new AuthService(unitOfWork, pasetoService, passwordService);
  const usersService = new UsersService(unitOfWork, passwordService);
  const productsService = new ProductsService(unitOfWork);

  const app = new Elysia()
    .use(
      cors({
        origin: process.env.CORS_ORIGIN || '*',
        credentials: process.env.CORS_CREDENTIALS === 'true',
        methods: (process.env.CORS_METHODS || 'GET,POST,PUT,DELETE,PATCH').split(','),
        allowedHeaders: (process.env.CORS_ALLOWED_HEADERS || 'Content-Type,Authorization,X-Request-ID').split(','),
      })
    )
    .use(requestId())
    .use(loggingPlugin)
    .use(registerPlugins)
    .onError(ctx => {
      const { error, set, request } = ctx;
      const requestId =
        typeof (ctx as { requestId?: unknown }).requestId === 'string' ? ((ctx as { requestId?: string }).requestId as string) : undefined;

      // Handle validation errors first
      const validationResponse = validationErrorHandler({ error, set, request, requestId });
      if (validationResponse) {
        return validationResponse;
      }

      logger.error('Unhandled error', error);

      if (error instanceof AppError) {
        set.status = error.status;
        return errorResponse(request, error.code, error.message, error.details, requestId);
      }

      if (error instanceof Error) {
        set.status = 500;
        return errorResponse(
          request,
          'INTERNAL_ERROR',
          'An unexpected error occurred',
          process.env.NODE_ENV === 'development' ? error.message : undefined,
          requestId
        );
      }

      set.status = 500;
      return errorResponse(request, 'INTERNAL_ERROR', 'An unexpected error occurred', undefined, requestId);
    })
    .group('/api/v1', api =>
      api
        .use(createAuthRoutes(new Elysia(), authService, usersService, pasetoService))
        .use(createUsersRoutes(new Elysia(), usersService, authService, pasetoService))
        .use(createProductsRoutes(new Elysia(), productsService, authService, pasetoService))
    )
    .use(createOpenApiConfig())
    .all('*', ctx => {
      const { set, request } = ctx;
      set.status = 404;
      const requestId =
        typeof (ctx as { requestId?: unknown }).requestId === 'string' ? ((ctx as { requestId?: string }).requestId as string) : undefined;
      return errorResponse(request, 'NOT_FOUND', 'Route not found', undefined, requestId);
    });

  logger.info('Application created successfully');

  return app;
}
