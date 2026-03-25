import type { Elysia } from 'elysia';
import type { PasetoService } from '../core/paseto/paseto.service';
import type { AuthService } from '../services/auth.service';
import type { UsersService } from '../services/users.service';
import { AuthController } from '../controllers/auth.controller';
import { UsersController } from '../controllers/users.controller';
import { successResponse } from '../core/http/response';
import { requireAuth, type AuthContext } from '../middlewares/auth.middleware';
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
  type RefreshTokenDTO,
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
  '/api/v1/auth/register': { maxRequests: 10, window: 60, strategy: 'ip' },
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
        '/register',
        async ctx => {
          const routeCtx = ctx as RouteContext<RegisterRequestDTO>;
          const body = registerRequestSchema.parse(routeCtx.body);
          const activityContext = getActivityContext(routeCtx.request);

          // Use name directly from body or construct from firstName/lastName if provided
          const name = body.name || [body.firstName, body.lastName].filter(Boolean).join(' ') || null;

          const result = await authController.register(
            {
              email: body.email,
              username: body.username,
              password: body.password,
              name,
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
          const routeCtx = ctx as RouteContext<RefreshTokenDTO>;
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
