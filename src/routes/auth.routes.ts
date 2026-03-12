import type { Elysia } from 'elysia';
import { z } from 'zod';
import type { PasetoService } from '../core/paseto/paseto.service';
import type { AuthService } from '../services/auth.service';
import type { UsersService } from '../services/users.service';
import { AuthController } from '../controllers/auth.controller';
import { UsersController } from '../controllers/users.controller';
import { requireAuth, type AuthContext } from '../middlewares/auth.middleware';
import { enforceRateLimit, type RateLimitOptions } from '../middlewares/rate-limit.middleware';
import { successResponse } from '../core/http/response';

const registerSchema = z
  .object({
    email: z.string().email(),
    password: z.string().min(8),
    firstName: z.string().min(1).optional(),
    lastName: z.string().min(1).optional(),
    name: z.string().min(1).optional(),
  })
  .refine(value => Boolean((value.firstName && value.lastName) || value.name), {
    message: 'firstName and lastName or name is required',
  });

const loginSchema = z.object({
  email: z.string().min(1),
  password: z.string().min(1),
});

const refreshSchema = z
  .object({
    token: z.string().optional(),
    refreshToken: z.string().optional(),
  })
  .refine(value => Boolean(value.token || value.refreshToken), {
    message: 'token or refreshToken is required',
  });

const changePasswordSchema = z
  .object({
    old_password: z.string().optional(),
    new_password: z.string().optional(),
    currentPassword: z.string().optional(),
    newPassword: z.string().optional(),
  })
  .refine(value => Boolean(value.old_password || value.currentPassword), {
    message: 'old_password or currentPassword is required',
  })
  .refine(value => Boolean(value.new_password || value.newPassword), {
    message: 'new_password or newPassword is required',
  });

type RouteLimitConfig = Required<Pick<RateLimitOptions, 'maxRequests' | 'window' | 'strategy'>>;

type RouteContext<TBody = unknown> = {
  request: Request;
  set: { status: number };
  body: TBody;
  user?: AuthContext['user'];
  tokenId?: string | null;
};

const AUTH_ROUTE_LIMITS: Record<string, RouteLimitConfig> = {
  '/api/v1/auth/register': { maxRequests: 10, window: 60, strategy: 'ip' },
  '/api/v1/auth/login': { maxRequests: 10, window: 60, strategy: 'ip' },
  '/api/v1/auth/refresh': { maxRequests: 10, window: 60, strategy: 'ip' },
  '/api/v1/auth/logout': { maxRequests: 30, window: 60, strategy: 'user_or_ip' },
  '/api/v1/auth/me': { maxRequests: 120, window: 60, strategy: 'user_or_ip' },
  '/api/v1/auth/change-password': { maxRequests: 10, window: 60, strategy: 'user_or_ip' },
};

function toAuthContext(ctx: { user?: AuthContext['user']; tokenId?: string | null }): AuthContext {
  return {
    user: ctx.user ?? null,
    tokenId: ctx.tokenId ?? null,
  };
}

export function createAuthRoutes(app: Elysia, authService: AuthService, usersService: UsersService, pasetoService: PasetoService): Elysia {
  const authController = new AuthController(authService, pasetoService);
  const usersController = new UsersController(usersService);
  const auth = requireAuth(pasetoService, authService);

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
      .post(
        '/register',
        async ctx => {
          const routeCtx = ctx as RouteContext<z.infer<typeof registerSchema>>;
          const body = registerSchema.parse(routeCtx.body);

          const firstName = body.firstName || body.name?.split(' ')[0] || 'User';
          const lastName = body.lastName || body.name?.split(' ').slice(1).join(' ') || '';

          const result = await authController.register({
            email: body.email,
            password: body.password,
            firstName,
            lastName,
          });

          const data = {
            user: result.user,
            token: result.tokens.accessToken,
            accessToken: result.tokens.accessToken,
            refresh_token: result.tokens.refreshToken,
            refreshToken: result.tokens.refreshToken,
            expires_in: result.tokens.expiresIn,
            expiresIn: result.tokens.expiresIn,
          };

          routeCtx.set.status = 201;
          return successResponse(routeCtx.request, data);
        },
        {
          beforeHandle: [limiters.register],
          body: registerSchema,
        }
      )
      .post(
        '/login',
        async ctx => {
          const routeCtx = ctx as RouteContext<z.infer<typeof loginSchema>>;
          const body = loginSchema.parse(routeCtx.body);
          const result = await authController.login(body);

          const data = {
            user: result.user,
            token: result.tokens.accessToken,
            accessToken: result.tokens.accessToken,
            refresh_token: result.tokens.refreshToken,
            refreshToken: result.tokens.refreshToken,
            expires_in: result.tokens.expiresIn,
            expiresIn: result.tokens.expiresIn,
          };

          return successResponse(routeCtx.request, data);
        },
        {
          beforeHandle: [limiters.login],
          body: loginSchema,
        }
      )
      .post(
        '/refresh',
        async ctx => {
          const routeCtx = ctx as RouteContext<z.infer<typeof refreshSchema>>;
          const body = refreshSchema.parse(routeCtx.body);
          const result = await authController.refreshToken({
            refreshToken: body.token || body.refreshToken || '',
          });

          const data = {
            token: result.tokens.accessToken,
            accessToken: result.tokens.accessToken,
            refresh_token: result.tokens.refreshToken,
            refreshToken: result.tokens.refreshToken,
            expires_in: result.tokens.expiresIn,
            expiresIn: result.tokens.expiresIn,
          };

          return successResponse(routeCtx.request, data);
        },
        {
          beforeHandle: [limiters.refresh],
          body: refreshSchema,
        }
      )
      .post(
        '/logout',
        async ctx => {
          const routeCtx = ctx as RouteContext;
          const data = await authController.logout(toAuthContext(routeCtx));
          return successResponse(routeCtx.request, data);
        },
        {
          beforeHandle: [auth, limiters.logout],
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
          beforeHandle: [auth, limiters.me],
        }
      )
      .post(
        '/change-password',
        async ctx => {
          const routeCtx = ctx as RouteContext<z.infer<typeof changePasswordSchema>>;
          const body = changePasswordSchema.parse(routeCtx.body);
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
          beforeHandle: [auth, limiters.changePassword],
          body: changePasswordSchema,
        }
      )
  );
}
