import type { Elysia } from 'elysia';
import { z } from 'zod';
import type { ProductsService } from '../services/products.service';
import type { AuthService } from '../services/auth.service';
import type { PasetoService } from '../core/paseto/paseto.service';
import { ProductsController } from '../controllers/products.controller';
import { requireAuth } from '../middlewares/auth.middleware';
import { enforceRateLimit } from '../middlewares/rate-limit.middleware';
import { successResponse } from '../core/http/response';
import {
  createProductSchema,
  getProductQuerySchema,
  getProductsQuerySchema,
  updateProductSchema,
  updateStockSchema,
} from './dto/products.dto';

export function createProductsRoutes(
  app: Elysia,
  productsService: ProductsService,
  authService: AuthService,
  pasetoService: PasetoService
): Elysia {
  const controller = new ProductsController(productsService);
  const auth = requireAuth(pasetoService, authService);
  const limit = enforceRateLimit({
    maxRequests: 120,
    window: 60,
    strategy: 'user_or_ip',
  });

  return app.group('/products', app =>
    app
      .post(
        '/',
        async ctx => {
          const data = await controller.create(ctx.body, {
            user: ctx.user,
            tokenId: ctx.tokenId,
          });
          ctx.set.status = 201;
          return successResponse(ctx.request, data);
        },
        {
          beforeHandle: [auth, limit],
          body: createProductSchema,
        }
      )
      .get(
        '/:id',
        async ctx => {
          const data = await controller.getById(ctx.params.id, ctx.query.include_deleted ?? false, {
            user: ctx.user,
            tokenId: ctx.tokenId,
          });
          return successResponse(ctx.request, data);
        },
        {
          beforeHandle: [auth, limit],
          params: z.object({ id: z.string().uuid() }),
          query: getProductQuerySchema,
        }
      )
      .get(
        '/',
        async ctx => {
          const data = await controller.list(
            {
              page: ctx.query.page,
              limit: ctx.query.limit,
              search: ctx.query.search,
              status: ctx.query.status,
              includeDeleted: ctx.query.include_deleted,
              onlyDeleted: ctx.query.only_deleted,
            },
            {
              user: ctx.user,
              tokenId: ctx.tokenId,
            }
          );

          return successResponse(ctx.request, data);
        },
        {
          beforeHandle: [auth, limit],
          query: getProductsQuerySchema,
        }
      )
      .put(
        '/:id',
        async ctx => {
          const data = await controller.update(ctx.params.id, ctx.body, {
            user: ctx.user,
            tokenId: ctx.tokenId,
          });
          return successResponse(ctx.request, data);
        },
        {
          beforeHandle: [auth, limit],
          params: z.object({ id: z.string().uuid() }),
          body: updateProductSchema,
        }
      )
      .delete(
        '/:id',
        async ctx => {
          const force = ctx.query.force === 'true';
          const data = await controller.delete(ctx.params.id, force, {
            user: ctx.user,
            tokenId: ctx.tokenId,
          });
          return successResponse(ctx.request, data);
        },
        {
          beforeHandle: [auth, limit],
          params: z.object({ id: z.string().uuid() }),
          query: z.object({ force: z.string().optional() }),
        }
      )
      .post(
        '/:id/restore',
        async ctx => {
          const data = await controller.restore(ctx.params.id, {
            user: ctx.user,
            tokenId: ctx.tokenId,
          });
          return successResponse(ctx.request, data);
        },
        {
          beforeHandle: [auth, limit],
          params: z.object({ id: z.string().uuid() }),
        }
      )
      .put(
        '/:id/stock',
        async ctx => {
          const data = await controller.updateStock(ctx.params.id, ctx.body.stock, {
            user: ctx.user,
            tokenId: ctx.tokenId,
          });
          return successResponse(ctx.request, data);
        },
        {
          beforeHandle: [auth, enforceRateLimit({ maxRequests: 30, window: 60, strategy: 'user_or_ip' })],
          params: z.object({ id: z.string().uuid() }),
          body: updateStockSchema,
        }
      )
  );
}
