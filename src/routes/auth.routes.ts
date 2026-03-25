/**
 * Authentication Routes
 *
 * ESLint type-checking rules are disabled for this file because Elysia's
 * context type is complex and requires type assertions when accessing
 * route-specific properties. This is a standard pattern when working
 * with dynamic route handlers in Elysia.
 */

/* eslint-disable @typescript-eslint/no-unsafe-assignment */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/no-unsafe-call */
/* eslint-disable @typescript-eslint/no-unsafe-argument */

import type { Elysia } from 'elysia';
import type { PasetoService } from '../core/paseto/paseto.service';
import type { AuthService } from '../services/auth.service';
import type { UsersService } from '../services/users.service';
import { AuthController } from '../controllers/auth.controller';
import { UsersController } from '../controllers/users.controller';
import { successResponse } from '../core/http/response';
import { requireAuth, type AuthContext, hasRole } from '../middlewares/auth.middleware';
import { ForbiddenError } from '../core/errors/app-error';
import { enforceRateLimit, type RateLimitOptions } from '../middlewares/rate-limit.middleware';
import { authDetails } from './details/auth.details';
import { getClientIp } from '../helpers/ip.helper';
import { getDeviceType } from '../helpers/device.helper';
import {
  changePasswordRequestSchema,
  loginRequestSchema,
  refreshRequestSchema,
  registerRequestSchema,
  type ChangePasswordRequestDTO,
  type LoginRequestDTO,
  type RefreshRequestDTO,
  type RegisterRequestDTO,
} from './dto/auth.dto';

type RouteLimitConfig = Required<Pick<RateLimitOptions, 'maxRequests' | 'window' | 'strategy'>>;

type RouteContext<TBody = unknown> = {
  request: Request;
  set: { status: number };
  body: TBody;
  user?: AuthContext['user'];
  tokenId?: string | null;
  accessToken?: string | null;
};

const AUTH_ROUTE_LIMITS: Record<string, RouteLimitConfig> = {
  '/api/v1/auth/register': { maxRequests: 10, window: 60, strategy: 'user_or_ip' },
  '/api/v1/auth/login': { maxRequests: 10, window: 60, strategy: 'ip' },
  '/api/v1/auth/refresh': { maxRequests: 10, window: 60, strategy: 'ip' },
  '/api/v1/auth/logout': { maxRequests: 30, window: 60, strategy: 'user_or_ip' },
  '/api/v1/auth/me': { maxRequests: 120, window: 60, strategy: 'user_or_ip' },
  '/api/v1/auth/change-password': { maxRequests: 10, window: 60, strategy: 'user_or_ip' },
};

/**
 * Extract activity context from request
 */
function getActivityContext(request: Request) {
  const userAgent = request.headers.get('user-agent') || undefined;
  const ipAddress = getClientIp(request);
  const deviceType = getDeviceType(userAgent);

  return {
    ipAddress,
    userAgent,
    deviceType,
  };
}

function toAuthContext(ctx: { user?: AuthContext['user']; tokenId?: string | null; accessToken?: string | null }): AuthContext {
  return {
    user: ctx.user ?? null,
    tokenId: ctx.tokenId ?? null,
    accessToken: ctx.accessToken ?? null,
  };
}

export function createAuthRoutes(app: Elysia, authService: AuthService, usersService: UsersService, pasetoService: PasetoService) {
  const authController = new AuthController(authService, usersService);
  const usersController = new UsersController(usersService);
  const authPlugin = requireAuth(pasetoService, authService);

  const limiters = {
    register: enforceRateLimit(AUTH_ROUTE_LIMITS['/api/v1/auth/register']),
    login: enforceRateLimit(AUTH_ROUTE_LIMITS['/api/v1/auth/login']),
    refresh: enforceRateLimit(AUTH_ROUTE_LIMITS['/api/v1/auth/refresh']),
    logout: enforceRateLimit(AUTH_ROUTE_LIMITS['/api/v1/auth/logout']),
    me: enforceRateLimit(AUTH_ROUTE_LIMITS['/api/v1/auth/me']),
    changePassword: enforceRateLimit(AUTH_ROUTE_LIMITS['/api/v1/auth/change-password']),
  };

  return app.group('/auth', authApp =>
    authApp
      // ========================================
      // Public routes (no authentication required)
      // ========================================
      .post(
        '/login',
        async ctx => {
          const routeCtx = ctx as RouteContext<LoginRequestDTO>;
          const body = loginRequestSchema.parse(routeCtx.body);
          const activityContext = getActivityContext(routeCtx.request);

          const result = await authController.login(body, activityContext);

          const data = {
            user: result.user,
            accessToken: result.tokens.accessToken,
            refreshToken: result.tokens.refreshToken,
            expiresIn: result.tokens.expiresIn,
          };

          return successResponse(routeCtx.request, data);
        },
        {
          beforeHandle: [limiters.login],
          body: loginRequestSchema,
          detail: authDetails.login,
        }
      )
      .post(
        '/refresh',
        async ctx => {
          const routeCtx = ctx as RouteContext<RefreshRequestDTO>;
          const body = refreshRequestSchema.parse(routeCtx.body);
          const activityContext = getActivityContext(routeCtx.request);

          // Support both 'token' and 'refreshToken' field names for backward compatibility
          const refreshToken = body.refreshToken || body.token;
          if (!refreshToken) {
            routeCtx.set.status = 400;
            return successResponse(routeCtx.request, {
              error: 'Refresh token is required',
            });
          }

          const result = await authController.refreshToken(
            {
              refreshToken,
            },
            activityContext
          );

          const data = {
            accessToken: result.tokens.accessToken,
            refreshToken: result.tokens.refreshToken,
            expiresIn: result.tokens.expiresIn,
          };

          return successResponse(routeCtx.request, data);
        },
        {
          beforeHandle: [limiters.refresh],
          body: refreshRequestSchema,
          detail: authDetails.refresh,
        }
      )
      // ========================================
      // Protected routes (authentication required)
      // Uses .use(authPlugin) with derive pattern to avoid short-circuiting
      // ========================================
      .use(authPlugin)
      // ========================================
      // Admin-only routes (requires ADMIN role)
      // ========================================
      .post(
        '/register',
        async ctx => {
          const routeCtx = ctx as RouteContext<RegisterRequestDTO>;

          // ADMIN role check - only ADMIN can create new users
          if (!hasRole(routeCtx.user ?? null, 'ADMIN')) {
            throw new ForbiddenError('Only administrators can register new users');
          }

          const body = registerRequestSchema.parse(routeCtx.body);
          const activityContext = {
            ...getActivityContext(routeCtx.request),
            performedBy: routeCtx.user?.id, // Admin who is creating the new user
          };

          const result = await authController.register(
            {
              email: body.email,
              username: body.username,
              password: body.password,
              name: body.name ?? null,
            },
            activityContext
          );

          const data = {
            user: result.user,
            accessToken: result.tokens.accessToken,
            refreshToken: result.tokens.refreshToken,
            expiresIn: result.tokens.expiresIn,
          };

          routeCtx.set.status = 201;
          return successResponse(routeCtx.request, data);
        },
        {
          beforeHandle: [limiters.register],
          body: registerRequestSchema,
          detail: authDetails.register,
        }
      )
      // ========================================
      // Standard protected routes
      // ========================================
      .post(
        '/logout',
        async ctx => {
          const routeCtx = ctx as RouteContext;
          const activityContext = getActivityContext(routeCtx.request);
          const data = await authController.logout(toAuthContext(routeCtx), activityContext);
          return successResponse(routeCtx.request, data);
        },
        {
          beforeHandle: [limiters.logout],
          detail: authDetails.logout,
        }
      )
      .get(
        '/me',
        async ctx => {
          const routeCtx = ctx as RouteContext;
          const data = await authController.me(toAuthContext(routeCtx));
          return successResponse(routeCtx.request, data);
        },
        {
          beforeHandle: [limiters.me],
          detail: authDetails.me,
        }
      )
      .post(
        '/change-password',
        async ctx => {
          const routeCtx = ctx as RouteContext<ChangePasswordRequestDTO>;
          const body = changePasswordRequestSchema.parse(routeCtx.body);
          const oldPassword = body.old_password || body.currentPassword || '';
          const newPassword = body.new_password || body.newPassword || '';

          const data = await usersController.changePassword(
            {
              currentPassword: oldPassword,
              newPassword,
            },
            toAuthContext(routeCtx)
          );

          return successResponse(routeCtx.request, data);
        },
        {
          beforeHandle: [limiters.changePassword],
          body: changePasswordRequestSchema,
          detail: authDetails.changePassword,
        }
      )
  );
}
