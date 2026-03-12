import type { Elysia } from 'elysia';
import { z } from 'zod';
import type { UsersService } from '../services/users.service';
import type { PasetoService } from '../core/paseto/paseto.service';
import type { AuthService } from '../services/auth.service';
import { UsersController } from '../controllers/users.controller';
import { requireAuth, type AuthContext } from '../middlewares/auth.middleware';
import { enforceRateLimit, type RateLimitOptions } from '../middlewares/rate-limit.middleware';
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

const userIdParamSchema = z.object({ id: z.string().uuid() });
const deleteUserQuerySchema = z.object({ force: z.string().optional() });

type RouteLimitConfig = Required<Pick<RateLimitOptions, 'maxRequests' | 'window' | 'strategy'>>;

type RouteContext<TBody = unknown, TQuery = unknown, TParams = unknown> = {
  request: Request;
  body: TBody;
  query: TQuery;
  params: TParams;
  user?: AuthContext['user'];
  tokenId?: string | null;
};

const USER_ROUTE_LIMITS: Record<string, RouteLimitConfig> = {
  '/api/v1/users/me': { maxRequests: 120, window: 60, strategy: 'user_or_ip' },
  '/api/v1/users': { maxRequests: 120, window: 60, strategy: 'user_or_ip' },
  '/api/v1/users/stats': { maxRequests: 120, window: 60, strategy: 'user_or_ip' },
  '/api/v1/users/:id': { maxRequests: 5, window: 60, strategy: 'user_or_ip' },
  '/api/v1/users/:id/activate': { maxRequests: 5, window: 60, strategy: 'user_or_ip' },
  '/api/v1/users/:id/deactivate': { maxRequests: 5, window: 60, strategy: 'user_or_ip' },
  '/api/v1/users/:id/restore': { maxRequests: 5, window: 60, strategy: 'user_or_ip' },
  '/api/v1/activity-logs': { maxRequests: 120, window: 60, strategy: 'user_or_ip' },
};

function toAuthContext(ctx: { user?: AuthContext['user']; tokenId?: string | null }): AuthContext {
  return {
    user: ctx.user ?? null,
    tokenId: ctx.tokenId ?? null,
  };
}

export function createUsersRoutes(app: Elysia, usersService: UsersService, authService: AuthService, pasetoService: PasetoService): Elysia {
  const controller = new UsersController(usersService);
  const auth = requireAuth(pasetoService, authService);

  const limiters = {
    me: enforceRateLimit(USER_ROUTE_LIMITS['/api/v1/users/me']),
    list: enforceRateLimit(USER_ROUTE_LIMITS['/api/v1/users']),
    stats: enforceRateLimit(USER_ROUTE_LIMITS['/api/v1/users/stats']),
    byId: enforceRateLimit(USER_ROUTE_LIMITS['/api/v1/users/:id']),
    activate: enforceRateLimit(USER_ROUTE_LIMITS['/api/v1/users/:id/activate']),
    deactivate: enforceRateLimit(USER_ROUTE_LIMITS['/api/v1/users/:id/deactivate']),
    restore: enforceRateLimit(USER_ROUTE_LIMITS['/api/v1/users/:id/restore']),
    activityLogs: enforceRateLimit(USER_ROUTE_LIMITS['/api/v1/activity-logs']),
  };

  return app
    .group('/users', usersApp =>
      usersApp
        .get(
          '/me',
          async ctx => {
            const routeCtx = ctx as RouteContext;
            const data = await controller.getMe(toAuthContext(routeCtx));
            return successResponse(routeCtx.request, data);
          },
          {
            beforeHandle: [auth, limiters.me],
          }
        )
        .patch(
          '/me',
          async ctx => {
            const routeCtx = ctx as RouteContext<z.infer<typeof updateProfileSchema>>;
            const body = updateProfileSchema.parse(routeCtx.body);
            const data = await controller.updateMe(body, toAuthContext(routeCtx));
            return successResponse(routeCtx.request, data);
          },
          {
            beforeHandle: [auth, limiters.me],
            body: updateProfileSchema,
          }
        )
        .get(
          '/',
          async ctx => {
            const routeCtx = ctx as RouteContext<unknown, z.infer<typeof getUsersQuerySchema>>;
            const query = getUsersQuerySchema.parse(routeCtx.query);
            const data = await controller.getUsers(query, toAuthContext(routeCtx));
            return successResponse(routeCtx.request, data);
          },
          {
            beforeHandle: [auth, limiters.list],
            query: getUsersQuerySchema,
          }
        )
        .get(
          '/stats',
          async ctx => {
            const routeCtx = ctx as RouteContext;
            const data = await controller.getUserStats(toAuthContext(routeCtx));
            return successResponse(routeCtx.request, data);
          },
          {
            beforeHandle: [auth, limiters.stats],
          }
        )
        .get(
          '/:id',
          async ctx => {
            const routeCtx = ctx as RouteContext<unknown, unknown, z.infer<typeof userIdParamSchema>>;
            const params = userIdParamSchema.parse(routeCtx.params);
            const data = await controller.getUserById(params.id, toAuthContext(routeCtx));
            return successResponse(routeCtx.request, data);
          },
          {
            beforeHandle: [auth, limiters.byId],
            params: userIdParamSchema,
          }
        )
        .post(
          '/:id/activate',
          async ctx => {
            const routeCtx = ctx as RouteContext<unknown, unknown, z.infer<typeof userIdParamSchema>>;
            const params = userIdParamSchema.parse(routeCtx.params);
            const data = await controller.activateUser(params.id, toAuthContext(routeCtx));
            return successResponse(routeCtx.request, data);
          },
          {
            beforeHandle: [auth, limiters.activate],
            params: userIdParamSchema,
          }
        )
        .post(
          '/:id/deactivate',
          async ctx => {
            const routeCtx = ctx as RouteContext<unknown, unknown, z.infer<typeof userIdParamSchema>>;
            const params = userIdParamSchema.parse(routeCtx.params);
            const data = await controller.deactivateUser(params.id, toAuthContext(routeCtx));
            return successResponse(routeCtx.request, data);
          },
          {
            beforeHandle: [auth, limiters.deactivate],
            params: userIdParamSchema,
          }
        )
        .delete(
          '/:id',
          async ctx => {
            const routeCtx = ctx as RouteContext<unknown, z.infer<typeof deleteUserQuerySchema>, z.infer<typeof userIdParamSchema>>;
            const params = userIdParamSchema.parse(routeCtx.params);
            const query = deleteUserQuerySchema.parse(routeCtx.query);
            const force = query.force === 'true';
            const data = await controller.deleteUser(params.id, force, toAuthContext(routeCtx));
            return successResponse(routeCtx.request, data);
          },
          {
            beforeHandle: [auth, limiters.byId],
            params: userIdParamSchema,
            query: deleteUserQuerySchema,
          }
        )
        .post(
          '/:id/restore',
          async ctx => {
            const routeCtx = ctx as RouteContext<unknown, unknown, z.infer<typeof userIdParamSchema>>;
            const params = userIdParamSchema.parse(routeCtx.params);
            const data = await controller.restoreUser(params.id, toAuthContext(routeCtx));
            return successResponse(routeCtx.request, data);
          },
          {
            beforeHandle: [auth, limiters.restore],
            params: userIdParamSchema,
          }
        )
    )
    .group('/activity-logs', logsApp =>
      logsApp.get(
        '/',
        async ctx => {
          const routeCtx = ctx as RouteContext<unknown, z.infer<typeof activityQuerySchema>>;
          const query = activityQuerySchema.parse(routeCtx.query);
          const data = await controller.getActivityLogs(query, toAuthContext(routeCtx));
          return successResponse(routeCtx.request, data);
        },
        {
          beforeHandle: [auth, limiters.activityLogs],
          query: activityQuerySchema,
        }
      )
    );
}
