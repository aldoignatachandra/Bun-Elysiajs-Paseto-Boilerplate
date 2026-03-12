import { BadRequestError, ForbiddenError, InternalServerError, NotFoundError, UnauthorizedError } from '../core/errors/app-error';
import { logger } from '../core/logging/logger';
import type { AuthContext } from '../middlewares/auth.middleware';
import type { ProductsService } from '../services/products.service';
import type { ListProductsInput, UpdateProductInput } from '../services/interfaces/products.service.interface';

export class ProductsController {
  constructor(private readonly productsService: ProductsService) {}

  async list(query: ListProductsInput, authContext: AuthContext) {
    if (!authContext.user) {
      throw new UnauthorizedError('Authentication required');
    }

    try {
      return await this.productsService.list(query);
    } catch (error) {
      logger.error('List products error', { error });
      throw new InternalServerError('Failed to list products');
    }
  }

  async getById(id: string, options: { includeDeleted: boolean; includeVariants: boolean }, authContext: AuthContext) {
    if (!authContext.user) {
      throw new UnauthorizedError('Authentication required');
    }

    try {
      return await this.productsService.getById({
        id,
        includeDeleted: options.includeDeleted,
        includeVariants: options.includeVariants,
      });
    } catch (error) {
      if (error instanceof NotFoundError) {
        throw error;
      }

      logger.error('Get product error', { error, productId: id });
      throw new InternalServerError('Failed to get product');
    }
  }

  async create(
    payload: {
      name: string;
      price: number;
      stock?: number;
      attributes?: Array<{
        name: string;
        values: string[];
        displayOrder?: number;
      }>;
      variants?: Array<{
        name: string;
        sku: string;
        price?: number | null;
        stock?: number;
        isActive?: boolean;
        attributeValues: Record<string, string>;
      }>;
    },
    authContext: AuthContext
  ) {
    if (!authContext.user) {
      throw new UnauthorizedError('Authentication required');
    }

    try {
      return await this.productsService.create({
        ownerId: authContext.user.id,
        ...payload,
      });
    } catch (error) {
      if (error instanceof BadRequestError) {
        throw error;
      }

      logger.error('Create product error', { error, ownerId: authContext.user.id });
      throw new InternalServerError('Failed to create product');
    }
  }

  async update(id: string, payload: UpdateProductInput, authContext: AuthContext) {
    if (!authContext.user) {
      throw new UnauthorizedError('Authentication required');
    }

    try {
      return await this.productsService.update({
        id,
        name: payload.name,
        price: payload.price,
        stock: payload.stock,
        attributes: payload.attributes,
        variants: payload.variants,
        currentUserId: authContext.user.id,
        isAdmin: authContext.user.role === 'admin',
      });
    } catch (error) {
      if (error instanceof NotFoundError || error instanceof BadRequestError || error instanceof ForbiddenError) {
        throw error;
      }

      logger.error('Update product error', { error, productId: id });
      throw new InternalServerError('Failed to update product');
    }
  }

  async delete(id: string, force: boolean, authContext: AuthContext) {
    if (!authContext.user) {
      throw new UnauthorizedError('Authentication required');
    }

    try {
      return await this.productsService.delete(id, force, {
        performedBy: authContext.user.id,
        isAdmin: authContext.user.role === 'admin',
      });
    } catch (error) {
      if (error instanceof NotFoundError || error instanceof ForbiddenError) {
        throw error;
      }

      logger.error('Delete product error', { error, productId: id });
      throw new InternalServerError('Failed to delete product');
    }
  }

  async restore(id: string, authContext: AuthContext) {
    if (!authContext.user) {
      throw new UnauthorizedError('Authentication required');
    }

    try {
      return await this.productsService.restore(id, {
        performedBy: authContext.user.id,
        isAdmin: authContext.user.role === 'admin',
      });
    } catch (error) {
      if (error instanceof NotFoundError || error instanceof ForbiddenError) {
        throw error;
      }

      logger.error('Restore product error', { error, productId: id });
      throw new InternalServerError('Failed to restore product');
    }
  }

  async updateStock(id: string, stock: number, authContext: AuthContext) {
    if (!authContext.user) {
      throw new UnauthorizedError('Authentication required');
    }

    try {
      return await this.productsService.updateStock({
        id,
        stock,
        currentUserId: authContext.user.id,
        isAdmin: authContext.user.role === 'admin',
      });
    } catch (error) {
      if (error instanceof NotFoundError || error instanceof BadRequestError || error instanceof ForbiddenError) {
        throw error;
      }

      logger.error('Update product stock error', { error, productId: id });
      throw new InternalServerError('Failed to update product stock');
    }
  }
}
