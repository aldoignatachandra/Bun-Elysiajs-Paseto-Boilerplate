import type { Elysia } from 'elysia';
import type { PasetoService } from '../core/paseto/paseto.service';
import type { AuthService } from '../services/auth.service';
import type { UsersService } from '../services/users.service';
import { UsersController } from '../controllers/users.controller';
import { successResponse } from '../core/http/response';
import { requireAuth, type AuthContext } from '../middlewares/auth.middleware';
import { enforceRateLimit, type RateLimitOptions } from '../middlewares/rate-limit.middleware';
import { usersDetails } from './details/users.details';
import {
  activityQuerySchema,
  deleteUserQuerySchema,
  getUsersQuerySchema,
  updateProfileSchema,
  userIdParamSchema,
  type ActivityQueryDTO,
  type DeleteUserQueryDTO,
  type GetUsersQueryDTO,
  type UpdateProfileDTO,
  type UserIdParamDTO,
} from './dto/users.dto';

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

function toAuthContext(ctx: { user?: AuthContext['user']; tokenId?: string | null; accessToken?: string | null }): AuthContext {
  return {
    user: ctx.user ?? null,
    tokenId: ctx.tokenId ?? null,
    accessToken: ctx.accessToken ?? null,
  };
}

export function createUsersRoutes(app: Elysia, usersService: UsersService, authService: AuthService, pasetoService: PasetoService) {
  const controller = new UsersController(usersService);
  const authPlugin = requireAuth(pasetoService, authService);

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
        // All routes in this group require authentication
        .use(authPlugin)
        .get(
          '/me',
          async ctx => {
            const routeCtx = ctx as RouteContext;
            const data = await controller.getMe(toAuthContext(routeCtx));
            return successResponse(routeCtx.request, data);
          },
          {
            beforeHandle: [limiters.me],
            detail: usersDetails.getMe,
          }
        )
        .patch(
          '/me',
          async ctx => {
            const routeCtx = ctx as RouteContext<UpdateProfileDTO>;
            const body = updateProfileSchema.parse(routeCtx.body);
            const data = await controller.updateMe(body, toAuthContext(routeCtx));
            return successResponse(routeCtx.request, data);
          },
          {
            beforeHandle: [limiters.me],
            body: updateProfileSchema,
            detail: usersDetails.updateMe,
          }
        )
        .get(
          '/',
          async ctx => {
            const routeCtx = ctx as RouteContext<unknown, GetUsersQueryDTO>;
            const query = getUsersQuerySchema.parse(routeCtx.query);
            const data = await controller.getUsers(query, toAuthContext(routeCtx));
            return successResponse(routeCtx.request, data);
          },
          {
            beforeHandle: [limiters.list],
            query: getUsersQuerySchema,
            detail: usersDetails.getUsers,
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
            beforeHandle: [limiters.stats],
            detail: usersDetails.getUserStats,
          }
        )
        .get(
          '/:id',
          async ctx => {
            const routeCtx = ctx as RouteContext<unknown, unknown, UserIdParamDTO>;
            const params = userIdParamSchema.parse(routeCtx.params);
            const data = await controller.getUserById(params.id, toAuthContext(routeCtx));
            return successResponse(routeCtx.request, data);
          },
          {
            beforeHandle: [limiters.byId],
            params: userIdParamSchema,
            detail: usersDetails.getUserById,
          }
        )
        .post(
          '/:id/activate',
          async ctx => {
            const routeCtx = ctx as RouteContext<unknown, unknown, UserIdParamDTO>;
            const params = userIdParamSchema.parse(routeCtx.params);
            const data = await controller.activateUser(params.id, toAuthContext(routeCtx));
            return successResponse(routeCtx.request, data);
          },
          {
            beforeHandle: [limiters.activate],
            params: userIdParamSchema,
            detail: usersDetails.activateUser,
          }
        )
        .post(
          '/:id/deactivate',
          async ctx => {
            const routeCtx = ctx as RouteContext<unknown, unknown, UserIdParamDTO>;
            const params = userIdParamSchema.parse(routeCtx.params);
            const data = await controller.deactivateUser(params.id, toAuthContext(routeCtx));
            return successResponse(routeCtx.request, data);
          },
          {
            beforeHandle: [limiters.deactivate],
            params: userIdParamSchema,
            detail: usersDetails.deactivateUser,
          }
        )
        .delete(
          '/:id',
          async ctx => {
            const routeCtx = ctx as RouteContext<unknown, DeleteUserQueryDTO, UserIdParamDTO>;
            const params = userIdParamSchema.parse(routeCtx.params);
            const query = deleteUserQuerySchema.parse(routeCtx.query);
            const force = query.force === 'true';
            const data = await controller.deleteUser(params.id, force, toAuthContext(routeCtx));
            return successResponse(routeCtx.request, data);
          },
          {
            beforeHandle: [limiters.byId],
            params: userIdParamSchema,
            query: deleteUserQuerySchema,
            detail: usersDetails.deleteUser,
          }
        )
        .post(
          '/:id/restore',
          async ctx => {
            const routeCtx = ctx as RouteContext<unknown, unknown, UserIdParamDTO>;
            const params = userIdParamSchema.parse(routeCtx.params);
            const data = await controller.restoreUser(params.id, toAuthContext(routeCtx));
            return successResponse(routeCtx.request, data);
          },
          {
            beforeHandle: [limiters.restore],
            params: userIdParamSchema,
            detail: usersDetails.restoreUser,
          }
        )
    )
    .group('/activity-logs', logsApp =>
      logsApp
        // All routes in this group require authentication
        .use(authPlugin)
        .get(
          '/',
          async ctx => {
            const routeCtx = ctx as RouteContext<unknown, ActivityQueryDTO>;
            const query = activityQuerySchema.parse(routeCtx.query);
            const data = await controller.getActivityLogs(query, toAuthContext(routeCtx));
            return successResponse(routeCtx.request, data);
          },
          {
            beforeHandle: [limiters.activityLogs],
            query: activityQuerySchema,
            detail: usersDetails.getActivityLogs,
          }
        )
    );
}
