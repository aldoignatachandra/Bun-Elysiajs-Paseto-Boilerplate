/**
 * Users Routes
 *
 * Defines all user management-related API endpoints.
 * Uses Elysia framework with type-safe route handlers.
 *
 * Features:
 * - GET /users/me - Get current user profile (requires authentication)
 * - PATCH /users/me - Update current user profile (requires authentication)
 * - PATCH /users/me/password - Change password (requires authentication)
 * - GET /users - List users (paginated) (requires authentication)
 * - GET /users/:id - Get user by ID (requires authentication)
 * - POST /users - Create user (admin) (requires authentication)
 * - PATCH /users/:id - Update user (admin) (requires authentication)
 * - DELETE /users/:id - Delete user (admin) (requires authentication)
 * - GET /users/stats - Get user statistics (requires authentication)
 * - Rate limiting on all endpoints
 * - Zod validation for all inputs
 * - Swagger/OpenAPI documentation
 *
 * @module UsersRoutes
 */

/* eslint-disable @typescript-eslint/no-unsafe-assignment */

import type { Elysia } from 'elysia';
import type { UsersService } from '../services/users.service';
import type { PasetoService } from '../core/paseto/paseto.service';
import type { AuthService } from '../services/auth.service';
import { z } from 'zod';
import { UsersController } from '../controllers/users.controller';
import { requireAuth } from '../middlewares/auth.middleware';
import { rateLimit } from '../middlewares/rate-limit.middleware';
import { uuidSchema } from '../core/validation/common.schema';
import {
  updateProfileSchema,
  updatePasswordSchema,
  getUsersQuerySchema,
  createUserSchema,
  updateUserSchema,
  userResponseSchema,
  usersListResponseSchema,
  updateProfileResponseSchema,
  updatePasswordResponseSchema,
  createUserResponseSchema,
  updateUserResponseSchema,
  deleteUserResponseSchema,
  userStatsResponseSchema,
  errorResponseSchema,
} from './dto/users.dto';

/**
 * Create users routes
 *
 * Sets up all user management endpoints with proper middleware,
 * validation, and documentation.
 *
 * @param app - Elysia instance
 * @param usersService - Users service instance
 * @param authService - Authentication service instance
 * @param pasetoService - PASETO service instance
 * @returns Configured Elysia instance with users routes
 */
export function createUsersRoutes(
  app: Elysia,
  usersService: UsersService,
  authService: AuthService,
  pasetoService: PasetoService
): Elysia {
  const usersController = new UsersController(usersService);

  return app.group('/users', app =>
    app
      // Apply rate limiting to users endpoints
      // @ts-expect-error - rateLimit return type is compatible
      .derive(() => rateLimit({ maxRequests: 50, window: 60 })(app))
      // GET /users/me - Get current user profile
      .get(
        '/me',
        async ({ user, tokenId }) => {
          return await usersController.getMe({ user, tokenId });
        },
        {
          beforeHandle: [
            // @ts-expect-error - requireAuth adds user and tokenId to context
            requireAuth(pasetoService, authService),
          ],
          response: {
            200: userResponseSchema,
            401: errorResponseSchema,
            404: errorResponseSchema,
            500: errorResponseSchema,
          },
          detail: {
            summary: 'Get current user profile',
            description: 'Returns the profile of the currently authenticated user',
            tags: ['Users'],
            security: [{ bearerAuth: [] }],
          },
        }
      )
      // PATCH /users/me - Update current user profile
      .patch(
        '/me',
        async ({ user, tokenId, body }) => {
          return await usersController.updateMe(body as never, { user, tokenId });
        },
        {
          beforeHandle: [
            // @ts-expect-error - requireAuth adds user and tokenId to context
            requireAuth(pasetoService, authService),
          ],
          body: updateProfileSchema,
          response: {
            200: updateProfileResponseSchema,
            400: errorResponseSchema,
            401: errorResponseSchema,
            404: errorResponseSchema,
            422: errorResponseSchema,
            500: errorResponseSchema,
          },
          detail: {
            summary: 'Update current user profile',
            description: 'Updates the profile of the currently authenticated user',
            tags: ['Users'],
            security: [{ bearerAuth: [] }],
          },
        }
      )
      // PATCH /users/me/password - Change password
      .patch(
        '/me/password',
        async ({ user, tokenId, body }) => {
          return await usersController.changePassword(body as never, { user, tokenId });
        },
        {
          beforeHandle: [
            // @ts-expect-error - requireAuth adds user and tokenId to context
            requireAuth(pasetoService, authService),
          ],
          body: updatePasswordSchema,
          response: {
            200: updatePasswordResponseSchema,
            400: errorResponseSchema,
            401: errorResponseSchema,
            404: errorResponseSchema,
            422: errorResponseSchema,
            500: errorResponseSchema,
          },
          detail: {
            summary: 'Change password',
            description: 'Changes the password of the currently authenticated user',
            tags: ['Users'],
            security: [{ bearerAuth: [] }],
          },
        }
      )
      // GET /users - List users (paginated)
      .get(
        '/',
        async ({ user, tokenId, query }) => {
          return await usersController.getUsers(query as never, { user, tokenId });
        },
        {
          beforeHandle: [
            // @ts-expect-error - requireAuth adds user and tokenId to context
            requireAuth(pasetoService, authService),
          ],
          query: getUsersQuerySchema,
          response: {
            200: usersListResponseSchema,
            401: errorResponseSchema,
            500: errorResponseSchema,
          },
          detail: {
            summary: 'List users',
            description: 'Returns a paginated list of users',
            tags: ['Users'],
            security: [{ bearerAuth: [] }],
          },
        }
      )
      // GET /users/stats - Get user statistics
      .get(
        '/stats',
        async ({ user, tokenId }) => {
          return await usersController.getUserStats({ user, tokenId });
        },
        {
          beforeHandle: [
            // @ts-expect-error - requireAuth adds user and tokenId to context
            requireAuth(pasetoService, authService),
          ],
          response: {
            200: userStatsResponseSchema,
            401: errorResponseSchema,
            500: errorResponseSchema,
          },
          detail: {
            summary: 'Get user statistics',
            description: 'Returns aggregate statistics about users',
            tags: ['Users'],
            security: [{ bearerAuth: [] }],
          },
        }
      )
      // GET /users/:id - Get user by ID
      .get(
        '/:id',
        async ({ user, tokenId, params }) => {
          return await usersController.getUserById(params.id, { user, tokenId });
        },
        {
          beforeHandle: [
            // @ts-expect-error - requireAuth adds user and tokenId to context
            requireAuth(pasetoService, authService),
          ],
          params: z.object({
            id: uuidSchema,
          }),
          response: {
            200: userResponseSchema,
            401: errorResponseSchema,
            404: errorResponseSchema,
            500: errorResponseSchema,
          },
          detail: {
            summary: 'Get user by ID',
            description: 'Returns a user by their ID',
            tags: ['Users'],
            security: [{ bearerAuth: [] }],
          },
        }
      )
      // POST /users - Create user (admin)
      .post(
        '/',
        async ({ user, tokenId, body }) => {
          return await usersController.createUser(body as never, { user, tokenId });
        },
        {
          beforeHandle: [
            // @ts-expect-error - requireAuth adds user and tokenId to context
            requireAuth(pasetoService, authService),
          ],
          body: createUserSchema,
          response: {
            201: createUserResponseSchema,
            400: errorResponseSchema,
            401: errorResponseSchema,
            409: errorResponseSchema,
            422: errorResponseSchema,
            500: errorResponseSchema,
          },
          detail: {
            summary: 'Create user',
            description: 'Creates a new user account (admin function)',
            tags: ['Users'],
            security: [{ bearerAuth: [] }],
          },
        }
      )
      // PATCH /users/:id - Update user (admin)
      .patch(
        '/:id',
        async ({ user, tokenId, params, body }) => {
          return await usersController.updateUser(params.id, body as never, { user, tokenId });
        },
        {
          beforeHandle: [
            // @ts-expect-error - requireAuth adds user and tokenId to context
            requireAuth(pasetoService, authService),
          ],
          params: z.object({
            id: uuidSchema,
          }),
          body: updateUserSchema,
          response: {
            200: updateUserResponseSchema,
            400: errorResponseSchema,
            401: errorResponseSchema,
            404: errorResponseSchema,
            409: errorResponseSchema,
            422: errorResponseSchema,
            500: errorResponseSchema,
          },
          detail: {
            summary: 'Update user',
            description: 'Updates a user by their ID (admin function)',
            tags: ['Users'],
            security: [{ bearerAuth: [] }],
          },
        }
      )
      // DELETE /users/:id - Delete user (admin)
      .delete(
        '/:id',
        async ({ user, tokenId, params }) => {
          return await usersController.deleteUser(params.id, { user, tokenId });
        },
        {
          beforeHandle: [
            // @ts-expect-error - requireAuth adds user and tokenId to context
            requireAuth(pasetoService, authService),
          ],
          params: z.object({
            id: uuidSchema,
          }),
          response: {
            200: deleteUserResponseSchema,
            401: errorResponseSchema,
            404: errorResponseSchema,
            500: errorResponseSchema,
          },
          detail: {
            summary: 'Delete user',
            description: 'Deletes a user by their ID (admin function)',
            tags: ['Users'],
            security: [{ bearerAuth: [] }],
          },
        }
      )
  );
}
