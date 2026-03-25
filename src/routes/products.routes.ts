/* eslint-disable @typescript-eslint/no-unsafe-assignment */
/* eslint-disable @typescript-eslint/no-unsafe-call */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/no-unsafe-argument */

import type { Elysia } from 'elysia';
import type { PasetoService } from '../core/paseto/paseto.service';
import type { AuthService } from '../services/auth.service';
import type { ProductsService } from '../services/products.service';
import { ProductsController } from '../controllers/products.controller';
import { successResponse } from '../core/http/response';
import { requireAuth, hasRole, type AuthContext } from '../middlewares/auth.middleware';
import { ForbiddenError } from '../core/errors/app-error';
import { getClientIp, getUserAgent } from '../helpers/ip.helper';
import { enforceRateLimit, type RateLimitOptions } from '../middlewares/rate-limit.middleware';
import { productsDetails } from './details/products.details';
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
  accessToken?: string | null;
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

function toAuthContext(ctx: { user?: AuthContext['user']; tokenId?: string | null; accessToken?: string | null; request?: Request }): AuthContext {
  return {
    user: ctx.user
      ? {
          ...ctx.user,
          role: ctx.user.role,
        }
      : null,
    tokenId: ctx.tokenId ?? null,
    accessToken: ctx.accessToken ?? null,
    ipAddress: ctx.request ? getClientIp(ctx.request) : 'unknown',
    userAgent: ctx.request ? getUserAgent(ctx.request) : 'unknown',
  };
}

/**
 * Require USER role - throws ForbiddenError if user is not USER role
 * Used to restrict write operations to USER role only (ADMIN has read-only access)
 *
 * @param user - User from context
 * @throws ForbiddenError if user is not USER role
 */
function requireUserRole(user: AuthContext['user'] | undefined): void {
  if (!hasRole(user ?? null, 'USER')) {
    throw new ForbiddenError('User access required. Admin has read-only access.');
  }
}

export function createProductsRoutes(app: Elysia, productsService: ProductsService, authService: AuthService, pasetoService: PasetoService) {
  const controller = new ProductsController(productsService);
  const authPlugin = requireAuth(pasetoService, authService);

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
      // All routes in this group require authentication
      .use(authPlugin)
      .post(
        '/',
        async ctx => {
          const routeCtx = ctx as RouteContext<CreateProductDTO>;
          // Only USER role can create products (ADMIN has read-only access)
          requireUserRole(routeCtx.user);
          const body = createProductSchema.parse(routeCtx.body);
          const data = await controller.create(body, toAuthContext(routeCtx));
          routeCtx.set.status = 201;
          return successResponse(routeCtx.request, data);
        },
        {
          beforeHandle: [limiters.create],
          body: createProductSchema,
          detail: productsDetails.createProduct,
        }
      )
      .get(
        '/:id',
        async ctx => {
          const routeCtx = ctx as RouteContext<unknown, GetProductQueryDTO, ProductIdParamDTO>;
          // Both ADMIN and USER can get product by ID (ownership checked in controller)
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
          beforeHandle: [limiters.getById],
          params: productIdParamSchema,
          query: getProductQuerySchema,
          detail: productsDetails.getProductById,
        }
      )
      .get(
        '/',
        async ctx => {
          const routeCtx = ctx as RouteContext<unknown, GetProductsQueryDTO>;
          // Both ADMIN and USER can list products
          // USER only sees their own products (ownership filter in controller)
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
          beforeHandle: [limiters.list],
          query: getProductsQuerySchema,
          detail: productsDetails.getProducts,
        }
      )
      .patch(
        '/:id',
        async ctx => {
          const routeCtx = ctx as RouteContext<UpdateProductDTO, unknown, ProductIdParamDTO>;
          // Only USER role can update products (ADMIN has read-only access)
          requireUserRole(routeCtx.user);
          const params = productIdParamSchema.parse(routeCtx.params);
          const body = updateProductSchema.parse(routeCtx.body);
          const data = await controller.update(params.id, body, toAuthContext(routeCtx));
          return successResponse(routeCtx.request, data);
        },
        {
          beforeHandle: [limiters.patch],
          params: productIdParamSchema,
          body: updateProductSchema,
          detail: productsDetails.patchProduct,
        }
      )
      .put(
        '/:id',
        async ctx => {
          const routeCtx = ctx as RouteContext<UpdateProductDTO, unknown, ProductIdParamDTO>;
          // Only USER role can update products (ADMIN has read-only access)
          requireUserRole(routeCtx.user);
          const params = productIdParamSchema.parse(routeCtx.params);
          const body = updateProductSchema.parse(routeCtx.body);
          const data = await controller.update(params.id, body, toAuthContext(routeCtx));
          return successResponse(routeCtx.request, data);
        },
        {
          beforeHandle: [limiters.update],
          params: productIdParamSchema,
          body: updateProductSchema,
          detail: productsDetails.putProduct,
        }
      )
      .delete(
        '/:id',
        async ctx => {
          const routeCtx = ctx as RouteContext<unknown, DeleteProductQueryDTO, ProductIdParamDTO>;
          // Only USER role can delete products (ADMIN has read-only access)
          requireUserRole(routeCtx.user);
          const params = productIdParamSchema.parse(routeCtx.params);
          const query = deleteProductQuerySchema.parse(routeCtx.query);
          const force = query.force === 'true';

          const data = await controller.delete(params.id, force, toAuthContext(routeCtx));
          return successResponse(routeCtx.request, data);
        },
        {
          beforeHandle: [limiters.remove],
          params: productIdParamSchema,
          query: deleteProductQuerySchema,
          detail: productsDetails.deleteProduct,
        }
      )
      .post(
        '/:id/restore',
        async ctx => {
          const routeCtx = ctx as RouteContext<unknown, unknown, ProductIdParamDTO>;
          // Only USER role can restore products (ADMIN has read-only access)
          requireUserRole(routeCtx.user);
          const params = productIdParamSchema.parse(routeCtx.params);
          const data = await controller.restore(params.id, toAuthContext(routeCtx));
          return successResponse(routeCtx.request, data);
        },
        {
          beforeHandle: [limiters.restore],
          params: productIdParamSchema,
          detail: productsDetails.restoreProduct,
        }
      )
      .put(
        '/:id/stock',
        async ctx => {
          const routeCtx = ctx as RouteContext<UpdateStockDTO, unknown, ProductIdParamDTO>;
          // Only USER role can update stock (ADMIN has read-only access)
          requireUserRole(routeCtx.user);
          const params = productIdParamSchema.parse(routeCtx.params);
          const body = updateStockSchema.parse(routeCtx.body);
          const data = await controller.updateStock(params.id, body.stock, toAuthContext(routeCtx));
          return successResponse(routeCtx.request, data);
        },
        {
          beforeHandle: [limiters.stock],
          params: productIdParamSchema,
          body: updateStockSchema,
          detail: productsDetails.updateStock,
        }
      )
  );
}
