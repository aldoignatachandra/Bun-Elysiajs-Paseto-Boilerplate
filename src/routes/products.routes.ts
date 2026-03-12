import type { Elysia } from 'elysia';
import { z } from 'zod';
import type { ProductsService } from '../services/products.service';
import type { AuthService } from '../services/auth.service';
import type { PasetoService } from '../core/paseto/paseto.service';
import { ProductsController } from '../controllers/products.controller';
import { requireAuth, type AuthContext } from '../middlewares/auth.middleware';
import { enforceRateLimit, type RateLimitOptions } from '../middlewares/rate-limit.middleware';
import { successResponse } from '../core/http/response';
import { createProductSchema, getProductQuerySchema, getProductsQuerySchema, updateProductSchema, updateStockSchema } from './dto/products.dto';

type RouteLimitConfig = Required<Pick<RateLimitOptions, 'maxRequests' | 'window' | 'strategy'>>;

type RouteContext<TBody = unknown, TQuery = unknown, TParams = unknown> = {
  request: Request;
  set: { status: number };
  body: TBody;
  query: TQuery;
  params: TParams;
  user?: AuthContext['user'];
  tokenId?: string | null;
};

const productIdParamSchema = z.object({ id: z.string().uuid() });
const deleteProductQuerySchema = z.object({ force: z.string().optional() });

const PRODUCT_ROUTE_LIMITS: Record<string, RouteLimitConfig> = {
  'POST /api/v1/products': { maxRequests: 20, window: 60, strategy: 'user_or_ip' },
  'GET /api/v1/products': { maxRequests: 120, window: 60, strategy: 'user_or_ip' },
  'GET /api/v1/products/:id': { maxRequests: 10, window: 60, strategy: 'user_or_ip' },
  'PUT /api/v1/products/:id': { maxRequests: 30, window: 60, strategy: 'user_or_ip' },
  'DELETE /api/v1/products/:id': { maxRequests: 10, window: 60, strategy: 'user_or_ip' },
  'POST /api/v1/products/:id/restore': { maxRequests: 10, window: 60, strategy: 'user_or_ip' },
  'PUT /api/v1/products/:id/stock': { maxRequests: 30, window: 60, strategy: 'user_or_ip' },
};

function toAuthContext(ctx: { user?: AuthContext['user']; tokenId?: string | null }): AuthContext {
  return {
    user: ctx.user ?? null,
    tokenId: ctx.tokenId ?? null,
  };
}

export function createProductsRoutes(app: Elysia, productsService: ProductsService, authService: AuthService, pasetoService: PasetoService): Elysia {
  const controller = new ProductsController(productsService);
  const auth = requireAuth(pasetoService, authService);

  const limiters = {
    create: enforceRateLimit(PRODUCT_ROUTE_LIMITS['POST /api/v1/products']),
    list: enforceRateLimit(PRODUCT_ROUTE_LIMITS['GET /api/v1/products']),
    getById: enforceRateLimit(PRODUCT_ROUTE_LIMITS['GET /api/v1/products/:id']),
    update: enforceRateLimit(PRODUCT_ROUTE_LIMITS['PUT /api/v1/products/:id']),
    remove: enforceRateLimit(PRODUCT_ROUTE_LIMITS['DELETE /api/v1/products/:id']),
    restore: enforceRateLimit(PRODUCT_ROUTE_LIMITS['POST /api/v1/products/:id/restore']),
    stock: enforceRateLimit(PRODUCT_ROUTE_LIMITS['PUT /api/v1/products/:id/stock']),
  };

  return app.group('/products', productsApp =>
    productsApp
      .post(
        '/',
        async ctx => {
          const routeCtx = ctx as RouteContext<z.infer<typeof createProductSchema>>;
          const body = createProductSchema.parse(routeCtx.body);
          const data = await controller.create(body, toAuthContext(routeCtx));
          routeCtx.set.status = 201;
          return successResponse(routeCtx.request, data);
        },
        {
          beforeHandle: [auth, limiters.create],
          body: createProductSchema,
        }
      )
      .get(
        '/:id',
        async ctx => {
          const routeCtx = ctx as RouteContext<unknown, z.infer<typeof getProductQuerySchema>, z.infer<typeof productIdParamSchema>>;
          const params = productIdParamSchema.parse(routeCtx.params);
          const query = getProductQuerySchema.parse(routeCtx.query);

          const data = await controller.getById(params.id, query.include_deleted ?? false, toAuthContext(routeCtx));
          return successResponse(routeCtx.request, data);
        },
        {
          beforeHandle: [auth, limiters.getById],
          params: productIdParamSchema,
          query: getProductQuerySchema,
        }
      )
      .get(
        '/',
        async ctx => {
          const routeCtx = ctx as RouteContext<unknown, z.infer<typeof getProductsQuerySchema>>;
          const query = getProductsQuerySchema.parse(routeCtx.query);

          const data = await controller.list(
            {
              page: query.page,
              limit: query.limit,
              search: query.search,
              status: query.status,
              includeDeleted: query.include_deleted,
              onlyDeleted: query.only_deleted,
            },
            toAuthContext(routeCtx)
          );

          return successResponse(routeCtx.request, data);
        },
        {
          beforeHandle: [auth, limiters.list],
          query: getProductsQuerySchema,
        }
      )
      .put(
        '/:id',
        async ctx => {
          const routeCtx = ctx as RouteContext<z.infer<typeof updateProductSchema>, unknown, z.infer<typeof productIdParamSchema>>;
          const params = productIdParamSchema.parse(routeCtx.params);
          const body = updateProductSchema.parse(routeCtx.body);
          const data = await controller.update(params.id, body, toAuthContext(routeCtx));
          return successResponse(routeCtx.request, data);
        },
        {
          beforeHandle: [auth, limiters.update],
          params: productIdParamSchema,
          body: updateProductSchema,
        }
      )
      .delete(
        '/:id',
        async ctx => {
          const routeCtx = ctx as RouteContext<unknown, z.infer<typeof deleteProductQuerySchema>, z.infer<typeof productIdParamSchema>>;
          const params = productIdParamSchema.parse(routeCtx.params);
          const query = deleteProductQuerySchema.parse(routeCtx.query);
          const force = query.force === 'true';

          const data = await controller.delete(params.id, force, toAuthContext(routeCtx));
          return successResponse(routeCtx.request, data);
        },
        {
          beforeHandle: [auth, limiters.remove],
          params: productIdParamSchema,
          query: deleteProductQuerySchema,
        }
      )
      .post(
        '/:id/restore',
        async ctx => {
          const routeCtx = ctx as RouteContext<unknown, unknown, z.infer<typeof productIdParamSchema>>;
          const params = productIdParamSchema.parse(routeCtx.params);
          const data = await controller.restore(params.id, toAuthContext(routeCtx));
          return successResponse(routeCtx.request, data);
        },
        {
          beforeHandle: [auth, limiters.restore],
          params: productIdParamSchema,
        }
      )
      .put(
        '/:id/stock',
        async ctx => {
          const routeCtx = ctx as RouteContext<z.infer<typeof updateStockSchema>, unknown, z.infer<typeof productIdParamSchema>>;
          const params = productIdParamSchema.parse(routeCtx.params);
          const body = updateStockSchema.parse(routeCtx.body);
          const data = await controller.updateStock(params.id, body.stock, toAuthContext(routeCtx));
          return successResponse(routeCtx.request, data);
        },
        {
          beforeHandle: [auth, limiters.stock],
          params: productIdParamSchema,
          body: updateStockSchema,
        }
      )
  );
}
