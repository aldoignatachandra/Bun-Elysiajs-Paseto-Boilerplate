import type { Elysia } from 'elysia';
import { z } from 'zod';
import type { PasetoService } from '../core/paseto/paseto.service';
import type { AuthService } from '../services/auth.service';
import type { UsersService } from '../services/users.service';
import { AuthController } from '../controllers/auth.controller';
import { UsersController } from '../controllers/users.controller';
import { requireAuth } from '../middlewares/auth.middleware';
import { enforceRateLimit } from '../middlewares/rate-limit.middleware';
import { successResponse } from '../core/http/response';

const registerSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
  firstName: z.string().min(1).optional(),
  lastName: z.string().min(1).optional(),
  name: z.string().min(1).optional(),
}).refine(value => Boolean((value.firstName && value.lastName) || value.name), {
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

export function createAuthRoutes(
  app: Elysia,
  authService: AuthService,
  usersService: UsersService,
  pasetoService: PasetoService
): Elysia {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const authController = new AuthController(authService, pasetoService as any);
  const usersController = new UsersController(usersService);

  const authLimiter = enforceRateLimit({
    maxRequests: 10,
    window: 60,
    strategy: 'ip',
  });

  const protectedLimiter = enforceRateLimit({
    maxRequests: 30,
    window: 60,
    strategy: 'user_or_ip',
  });

  const auth = requireAuth(pasetoService, authService);

  return app.group('/auth', app =>
    app
      .post(
        '/register',
        async ctx => {
          const firstName = ctx.body.firstName || ctx.body.name?.split(' ')[0] || 'User';
          const lastName = ctx.body.lastName || ctx.body.name?.split(' ').slice(1).join(' ') || '';
          const result = await authController.register({
            email: ctx.body.email,
            password: ctx.body.password,
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
          ctx.set.status = 201;
          return successResponse(ctx.request, data);
        },
        {
          beforeHandle: [authLimiter],
          body: registerSchema,
        }
      )
      .post(
        '/login',
        async ctx => {
          const result = await authController.login(ctx.body);
          const data = {
            user: result.user,
            token: result.tokens.accessToken,
            accessToken: result.tokens.accessToken,
            refresh_token: result.tokens.refreshToken,
            refreshToken: result.tokens.refreshToken,
            expires_in: result.tokens.expiresIn,
            expiresIn: result.tokens.expiresIn,
          };
          return successResponse(ctx.request, data);
        },
        {
          beforeHandle: [authLimiter],
          body: loginSchema,
        }
      )
      .post(
        '/refresh',
        async ctx => {
          const result = await authController.refreshToken({
            refreshToken: ctx.body.token || ctx.body.refreshToken || '',
          });
          const data = {
            token: result.tokens.accessToken,
            accessToken: result.tokens.accessToken,
            refresh_token: result.tokens.refreshToken,
            refreshToken: result.tokens.refreshToken,
            expires_in: result.tokens.expiresIn,
            expiresIn: result.tokens.expiresIn,
          };
          return successResponse(ctx.request, data);
        },
        {
          beforeHandle: [authLimiter],
          body: refreshSchema,
        }
      )
      .post(
        '/logout',
        async ctx => {
          const data = await authController.logout({
            user: ctx.user,
            tokenId: ctx.tokenId,
          });
          return successResponse(ctx.request, data);
        },
        {
          beforeHandle: [auth, protectedLimiter],
        }
      )
      .get(
        '/me',
        async ctx => {
          const data = await authController.me({
            user: ctx.user,
            tokenId: ctx.tokenId,
          });
          return successResponse(ctx.request, data);
        },
        {
          beforeHandle: [auth, protectedLimiter],
        }
      )
      .post(
        '/change-password',
        async ctx => {
          const oldPassword = ctx.body.old_password || ctx.body.currentPassword || '';
          const newPassword = ctx.body.new_password || ctx.body.newPassword || '';

          const data = await usersController.changePassword(
            {
              currentPassword: oldPassword,
              newPassword,
            },
            {
              user: ctx.user,
              tokenId: ctx.tokenId,
            }
          );

          return successResponse(ctx.request, data);
        },
        {
          beforeHandle: [auth, protectedLimiter],
          body: changePasswordSchema,
        }
      )
  );
}
