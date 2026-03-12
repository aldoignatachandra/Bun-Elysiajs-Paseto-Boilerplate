import type { Elysia } from 'elysia';
import { z } from 'zod';
import type { UsersService } from '../services/users.service';
import type { PasetoService } from '../core/paseto/paseto.service';
import type { AuthService } from '../services/auth.service';
import { UsersController } from '../controllers/users.controller';
import { requireAuth } from '../middlewares/auth.middleware';
import { enforceRateLimit } from '../middlewares/rate-limit.middleware';
import { successResponse } from '../core/http/response';

const updateProfileSchema = z.object({
  firstName: z.string().min(1).optional(),
  lastName: z.string().min(1).optional(),
});

const getUsersQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(10),
  search: z.string().optional(),
  include_deleted: z.coerce.boolean().optional().default(false),
  only_deleted: z.coerce.boolean().optional().default(false),
});

const activityQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(10),
  user_id: z.string().uuid().optional(),
  action: z.string().optional(),
  resource: z.string().optional(),
});

export function createUsersRoutes(
  app: Elysia,
  usersService: UsersService,
  authService: AuthService,
  pasetoService: PasetoService
): Elysia {
  const controller = new UsersController(usersService);
  const auth = requireAuth(pasetoService, authService);
  const limiter = enforceRateLimit({
    maxRequests: 120,
    window: 60,
    strategy: 'user_or_ip',
  });

  return app
    .group('/users', app =>
      app
        .get(
          '/me',
          async ctx => {
            const data = await controller.getMe({ user: ctx.user, tokenId: ctx.tokenId });
            return successResponse(ctx.request, data);
          },
          {
            beforeHandle: [auth, limiter],
          }
        )
        .patch(
          '/me',
          async ctx => {
            const data = await controller.updateMe(ctx.body, { user: ctx.user, tokenId: ctx.tokenId });
            return successResponse(ctx.request, data);
          },
          {
            beforeHandle: [auth, limiter],
            body: updateProfileSchema,
          }
        )
        .get(
          '/',
          async ctx => {
            const data = await controller.getUsers(ctx.query, {
              user: ctx.user,
              tokenId: ctx.tokenId,
            });
            return successResponse(ctx.request, data);
          },
          {
            beforeHandle: [auth, limiter],
            query: getUsersQuerySchema,
          }
        )
        .get(
          '/stats',
          async ctx => {
            const data = await controller.getUserStats({
              user: ctx.user,
              tokenId: ctx.tokenId,
            });
            return successResponse(ctx.request, data);
          },
          {
            beforeHandle: [auth, limiter],
          }
        )
        .get(
          '/:id',
          async ctx => {
            const data = await controller.getUserById(ctx.params.id, {
              user: ctx.user,
              tokenId: ctx.tokenId,
            });
            return successResponse(ctx.request, data);
          },
          {
            beforeHandle: [auth, limiter],
            params: z.object({ id: z.string().uuid() }),
          }
        )
        .post(
          '/:id/activate',
          async ctx => {
            const data = await controller.activateUser(ctx.params.id, {
              user: ctx.user,
              tokenId: ctx.tokenId,
            });
            return successResponse(ctx.request, data);
          },
          {
            beforeHandle: [auth, limiter],
            params: z.object({ id: z.string().uuid() }),
          }
        )
        .post(
          '/:id/deactivate',
          async ctx => {
            const data = await controller.deactivateUser(ctx.params.id, {
              user: ctx.user,
              tokenId: ctx.tokenId,
            });
            return successResponse(ctx.request, data);
          },
          {
            beforeHandle: [auth, limiter],
            params: z.object({ id: z.string().uuid() }),
          }
        )
        .delete(
          '/:id',
          async ctx => {
            const force = ctx.query.force === 'true';
            const data = await controller.deleteUser(ctx.params.id, force, {
              user: ctx.user,
              tokenId: ctx.tokenId,
            });
            return successResponse(ctx.request, data);
          },
          {
            beforeHandle: [auth, limiter],
            params: z.object({ id: z.string().uuid() }),
            query: z.object({ force: z.string().optional() }),
          }
        )
        .post(
          '/:id/restore',
          async ctx => {
            const data = await controller.restoreUser(ctx.params.id, {
              user: ctx.user,
              tokenId: ctx.tokenId,
            });
            return successResponse(ctx.request, data);
          },
          {
            beforeHandle: [auth, limiter],
            params: z.object({ id: z.string().uuid() }),
          }
        )
    )
    .group('/activity-logs', app =>
      app.get(
        '/',
        async ctx => {
          const data = await controller.getActivityLogs(ctx.query, {
            user: ctx.user,
            tokenId: ctx.tokenId,
          });
          return successResponse(ctx.request, data);
        },
        {
          beforeHandle: [auth, limiter],
          query: activityQuerySchema,
        }
      )
    );
}
