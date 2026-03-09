/**
 * Authentication Routes
 *
 * Defines all authentication-related API endpoints.
 * Uses Elysia framework with type-safe route handlers.
 *
 * Features:
 * - User registration
 * - User login
 * - Token refresh
 * - User logout (requires authentication)
 * - Get current user (requires authentication)
 * - Rate limiting on all endpoints
 * - Zod validation for all inputs
 * - Swagger/OpenAPI documentation
 *
 * @module AuthRoutes
 */

import type { Elysia } from 'elysia';
import type { PasetoService } from '../core/paseto/paseto.service';
import type { AuthService } from '../services/auth.service';
import { z } from 'zod';
import { AuthController } from '../controllers/auth.controller';
import { requireAuth } from '../middlewares/auth.middleware';
import { rateLimit } from '../middlewares/rate-limit.middleware';
import {
  registerSchema,
  loginSchema,
  refreshTokenSchema,
  registerResponseSchema,
  loginResponseSchema,
  refreshTokenResponseSchema,
  meResponseSchema,
  errorResponseSchema,
} from './dto/auth.dto';

/**
 * Create authentication routes
 *
 * Sets up all authentication endpoints with proper middleware,
 * validation, and documentation.
 *
 * @param app - Elysia instance
 * @param authService - Authentication service instance
 * @param pasetoService - PASETO service instance
 * @returns Configured Elysia instance with auth routes
 */
export function createAuthRoutes(
  app: Elysia,
  authService: AuthService,
  pasetoService: PasetoService
): Elysia {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any, @typescript-eslint/no-unsafe-argument
  const authController = new AuthController(authService, pasetoService as any);

  return app.group('/auth', app =>
    app
      // POST /auth/register - Register a new user
      .post(
        '/register',
        async ({ body }) => {
          return await authController.register(body as never);
        },
        {
          body: registerSchema,
          response: {
            200: registerResponseSchema,
            400: errorResponseSchema,
            409: errorResponseSchema,
            422: errorResponseSchema,
            500: errorResponseSchema,
          },
          detail: {
            summary: 'Register a new user',
            description: 'Creates a new user account with the provided credentials',
            tags: ['Authentication'],
            security: [],
          },
        }
      )
      // Apply rate limiting to auth endpoints
      .derive(() => rateLimit({ maxRequests: 10, window: 60 })(app))
      // POST /auth/login - User login
      .post(
        '/login',
        async ({ body }) => {
          return await authController.login(body as never);
        },
        {
          body: loginSchema,
          response: {
            200: loginResponseSchema,
            400: errorResponseSchema,
            401: errorResponseSchema,
            422: errorResponseSchema,
            500: errorResponseSchema,
          },
          detail: {
            summary: 'User login',
            description: 'Authenticates a user with email and password',
            tags: ['Authentication'],
            security: [],
          },
        }
      )
      // POST /auth/refresh - Refresh access token
      .post(
        '/refresh',
        async ({ body }) => {
          return await authController.refreshToken(body as never);
        },
        {
          body: refreshTokenSchema,
          response: {
            200: refreshTokenResponseSchema,
            400: errorResponseSchema,
            401: errorResponseSchema,
            500: errorResponseSchema,
          },
          detail: {
            summary: 'Refresh access token',
            description: 'Refreshes an access token using a valid refresh token',
            tags: ['Authentication'],
            security: [],
          },
        }
      )
      // POST /auth/logout - User logout (requires authentication)
      .post(
        '/logout',
        async ({ user, tokenId }) => {
          // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
          return await authController.logout({ user, tokenId });
        },
        {
          beforeHandle: [
            // @ts-expect-error - requireAuth adds user and tokenId to context
            requireAuth(pasetoService, authService),
          ],
          response: {
            200: z.object({
              message: z.string(),
            }),
            401: errorResponseSchema,
            500: errorResponseSchema,
          },
          detail: {
            summary: 'User logout',
            description: 'Logs out the current user and revokes their refresh token',
            tags: ['Authentication'],
            security: [{ bearerAuth: [] }],
          },
        }
      )
      // GET /auth/me - Get current user (requires authentication)
      .get(
        '/me',
        async ({ user, tokenId }) => {
          // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
          return await authController.me({ user, tokenId });
        },
        {
          beforeHandle: [
            // @ts-expect-error - requireAuth adds user and tokenId to context
            requireAuth(pasetoService, authService),
          ],
          response: {
            200: meResponseSchema,
            401: errorResponseSchema,
            500: errorResponseSchema,
          },
          detail: {
            summary: 'Get current user',
            description: 'Returns the currently authenticated user',
            tags: ['Authentication'],
            security: [{ bearerAuth: [] }],
          },
        }
      )
  );
}
