import type { AuthContext } from '../middlewares/auth.middleware';
import type { ProductsService } from '../services/products.service';
import type { ListProductsInput, UpdateProductInput } from '../services/interfaces/products.service.interface';
import { InternalServerError, NotFoundError, UnauthorizedError, BadRequestError } from '../core/errors/app-error';
import { logger } from '../core/logging/logger';

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

  async getById(id: string, includeDeleted: boolean, authContext: AuthContext) {
    if (!authContext.user) {
      throw new UnauthorizedError('Authentication required');
    }

    try {
      return await this.productsService.getById(id, includeDeleted);
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
      description?: string;
      price: string;
      stock: number;
      category: string;
      status?: 'ACTIVE' | 'INACTIVE';
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
        ...payload,
      });
    } catch (error) {
      if (error instanceof NotFoundError || error instanceof BadRequestError) {
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
      return await this.productsService.delete(id, force);
    } catch (error) {
      if (error instanceof NotFoundError) {
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
      return await this.productsService.restore(id);
    } catch (error) {
      if (error instanceof NotFoundError) {
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
      return await this.productsService.updateStock({ id, stock });
    } catch (error) {
      if (error instanceof NotFoundError || error instanceof BadRequestError) {
        throw error;
      }
      logger.error('Update product stock error', { error, productId: id });
      throw new InternalServerError('Failed to update product stock');
    }
  }
}
