import type { Elysia } from 'elysia';
import type { PasetoService } from '../core/paseto/paseto.service';
import type { AuthService } from '../services/auth.service';
import type { ProductsService } from '../services/products.service';
import { ProductsController } from '../controllers/products.controller';
import { successResponse } from '../core/http/response';
import { requireAuth, type AuthContext } from '../middlewares/auth.middleware';
import { enforceRateLimit, type RateLimitOptions } from '../middlewares/rate-limit.middleware';
import {
  createProductSchema,
  deleteProductQuerySchema,
  getProductQuerySchema,
  getProductsQuerySchema,
  productIdParamSchema,
  updateProductSchema,
  updateStockSchema,
  type CreateProductDTO,
  type DeleteProductQueryDTO,
  type GetProductQueryDTO,
  type GetProductsQueryDTO,
  type ProductIdParamDTO,
  type UpdateProductDTO,
  type UpdateStockDTO,
} from './dto/products.dto';

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

const PRODUCT_ROUTE_LIMITS: Record<string, RouteLimitConfig> = {
  'POST /api/v1/products': { maxRequests: 20, window: 60, strategy: 'user_or_ip' },
  'GET /api/v1/products': { maxRequests: 120, window: 60, strategy: 'user_or_ip' },
  'GET /api/v1/products/:id': { maxRequests: 10, window: 60, strategy: 'user_or_ip' },
  'PATCH /api/v1/products/:id': { maxRequests: 30, window: 60, strategy: 'user_or_ip' },
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

export function createProductsRoutes(app: Elysia, productsService: ProductsService, authService: AuthService, pasetoService: PasetoService) {
  const controller = new ProductsController(productsService);
  const auth = requireAuth(pasetoService, authService);

  const limiters = {
    create: enforceRateLimit(PRODUCT_ROUTE_LIMITS['POST /api/v1/products']),
    list: enforceRateLimit(PRODUCT_ROUTE_LIMITS['GET /api/v1/products']),
    getById: enforceRateLimit(PRODUCT_ROUTE_LIMITS['GET /api/v1/products/:id']),
    patch: enforceRateLimit(PRODUCT_ROUTE_LIMITS['PATCH /api/v1/products/:id']),
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
          const routeCtx = ctx as RouteContext<CreateProductDTO>;
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
          const routeCtx = ctx as RouteContext<unknown, GetProductQueryDTO, ProductIdParamDTO>;
          const params = productIdParamSchema.parse(routeCtx.params);
          const query = getProductQuerySchema.parse(routeCtx.query);

          const data = await controller.getById(
            params.id,
            {
              includeDeleted: query.include_deleted ?? false,
              includeVariants: query.includeVariants ?? false,
            },
            toAuthContext(routeCtx)
          );

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
          const routeCtx = ctx as RouteContext<unknown, GetProductsQueryDTO>;
          const query = getProductsQuerySchema.parse(routeCtx.query);

          const data = await controller.list(
            {
              page: query.page,
              limit: query.limit,
              search: query.search,
              includeDeleted: query.include_deleted,
              onlyDeleted: query.only_deleted,
              hasVariant: query.hasVariant,
              inStock: query.inStock,
              minPrice: query.minPrice,
              maxPrice: query.maxPrice,
              includeVariants: query.includeVariants,
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
      .patch(
        '/:id',
        async ctx => {
          const routeCtx = ctx as RouteContext<UpdateProductDTO, unknown, ProductIdParamDTO>;
          const params = productIdParamSchema.parse(routeCtx.params);
          const body = updateProductSchema.parse(routeCtx.body);
          const data = await controller.update(params.id, body, toAuthContext(routeCtx));
          return successResponse(routeCtx.request, data);
        },
        {
          beforeHandle: [auth, limiters.patch],
          params: productIdParamSchema,
          body: updateProductSchema,
        }
      )
      .put(
        '/:id',
        async ctx => {
          const routeCtx = ctx as RouteContext<UpdateProductDTO, unknown, ProductIdParamDTO>;
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
          const routeCtx = ctx as RouteContext<unknown, DeleteProductQueryDTO, ProductIdParamDTO>;
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
          const routeCtx = ctx as RouteContext<unknown, unknown, ProductIdParamDTO>;
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
          const routeCtx = ctx as RouteContext<UpdateStockDTO, unknown, ProductIdParamDTO>;
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
