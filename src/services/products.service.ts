import { BadRequestError, NotFoundError, ForbiddenError } from '../core/errors/app-error';
import type { UnitOfWork } from '../repositories/unit-of-work';
import type {
  CreateProductInput,
  GetProductInput,
  IProductsService,
  ListProductsInput,
  ListProductsOutput,
  ProductDTO,
  UpdateProductInput,
  UpdateStockInput,
} from './interfaces/products.service.interface';
import { ActivityService, type LogActivityInput } from './activity.service';

export interface ProductActivityContext {
  performedBy?: string;
  ipAddress?: string;
  userAgent?: string;
}

export class ProductsService implements IProductsService {
  private readonly unitOfWork: UnitOfWork;
  private activityService: ActivityService | null = null;

  constructor(unitOfWork: UnitOfWork) {
    this.unitOfWork = unitOfWork;
  }

  private getActivityService(): ActivityService {
    if (!this.activityService) {
      this.activityService = new ActivityService(this.unitOfWork);
    }
    return this.activityService;
  }

  private async logActivity(input: LogActivityInput): Promise<void> {
    try {
      await this.getActivityService().logActivity(input);
    } catch (error) {
      console.error('Failed to log activity:', error);
    }
  }

  async list(input: ListProductsInput): Promise<ListProductsOutput> {
    const page = Math.max(1, input.page || 1);
    const limit = Math.max(1, Math.min(100, input.limit || 10));
    const offset = (page - 1) * limit;

    const { data, total } = await this.unitOfWork.products.findWithFilters({
      search: input.search,
      includeDeleted: input.includeDeleted,
      onlyDeleted: input.onlyDeleted,
      hasVariant: input.hasVariant,
      inStock: input.inStock,
      minPrice: input.minPrice,
      maxPrice: input.maxPrice,
      includeVariants: input.includeVariants,
      limit,
      offset,
    });

    const totalPages = Math.ceil(total / limit);

    return {
      products: data,
      pagination: {
        page,
        limit,
        total,
        totalPages,
        hasNextPage: page < totalPages,
        hasPreviousPage: page > 1,
      },
    };
  }

  async getById(input: GetProductInput): Promise<ProductDTO> {
    const product = await this.unitOfWork.products.findByIdWithVariants(input.id, input.includeDeleted);

    if (!product) {
      throw new NotFoundError('Product not found');
    }

    if (!input.isAdmin && product.ownerId !== (input.currentUserId || '')) {
      throw new ForbiddenError('You do not have permission to view this product');
    }

    // Ensure images property is present for ProductDTO compatibility
    // ProductView from repository doesn't include images, default to null
    const productDTO: ProductDTO = {
      ...product,
      images: null,
    };

    if (!input.includeVariants) {
      return {
        ...productDTO,
        attributes: undefined,
        variants: undefined,
      };
    }

    return productDTO;
  }

  private checkOwnership(productOwnerId: string, currentUserId: string, isAdmin?: boolean): void {
    if (!isAdmin && productOwnerId !== currentUserId) {
      throw new ForbiddenError('You do not have permission to modify this product');
    }
  }

  async create(input: CreateProductInput & ProductActivityContext): Promise<ProductDTO> {
    if (input.price <= 0) {
      throw new BadRequestError('Product price must be greater than 0');
    }

    if (input.stock !== undefined && input.stock < 0) {
      throw new BadRequestError('Stock cannot be negative');
    }

    const product = await this.unitOfWork.products.createWithVariants({
      ownerId: input.ownerId,
      name: input.name,
      price: input.price,
      stock: input.stock,
      attributes: input.attributes,
      variants: input.variants,
    });

    await this.logActivity({
      userId: input.ownerId,
      action: 'product.created',
      entity: 'products',
      entityId: product.id,
      ipAddress: input.ipAddress,
      userAgent: input.userAgent,
      details: { performedBy: input.performedBy, name: product.name },
    });

    return product;
  }

  async update(input: UpdateProductInput & ProductActivityContext): Promise<ProductDTO> {
    if (input.price !== undefined && input.price <= 0) {
      throw new BadRequestError('Product price must be greater than 0');
    }

    if (typeof input.stock === 'number' && input.stock < 0) {
      throw new BadRequestError('Stock cannot be negative');
    }

    const existing = await this.unitOfWork.products.findById(input.id || '', true);
    if (!existing) {
      throw new NotFoundError('Product not found');
    }

    this.checkOwnership(existing.ownerId, input.currentUserId || '', input.isAdmin);

    const updated = await this.unitOfWork.products.updateWithVariants(input.id || '', {
      name: input.name,
      price: input.price,
      stock: input.stock,
      attributes: input.attributes,
      variants: input.variants,
    });

    if (!updated) {
      throw new NotFoundError('Product not found');
    }

    await this.logActivity({
      userId: existing.ownerId,
      action: 'product.updated',
      entity: 'products',
      entityId: input.id,
      ipAddress: input.ipAddress,
      userAgent: input.userAgent,
      details: { performedBy: input.performedBy },
    });

    return updated;
  }

  async delete(
    id: string,
    force = false,
    activityContext?: ProductActivityContext & { currentUserId?: string; isAdmin?: boolean }
  ): Promise<{ message: string }> {
    const existing = await this.unitOfWork.products.findById(id, true);

    if (!existing) {
      throw new NotFoundError('Product not found');
    }

    const currentUserId = activityContext?.performedBy || '';
    this.checkOwnership(existing.ownerId, currentUserId, activityContext?.isAdmin);

    if (force) {
      const deleted = await this.unitOfWork.products.delete(id);

      if (!deleted) {
        throw new NotFoundError('Product not found');
      }

      return { message: 'Product deleted successfully' };
    }

    const deleted = await this.unitOfWork.products.softDelete(id);

    if (!deleted) {
      throw new NotFoundError('Product not found');
    }

    await this.logActivity({
      userId: existing.ownerId,
      action: 'product.deleted',
      entity: 'products',
      entityId: id,
      ipAddress: activityContext?.ipAddress,
      userAgent: activityContext?.userAgent,
      details: { performedBy: activityContext?.performedBy },
    });

    return { message: 'Product deleted successfully' };
  }

  async restore(id: string, activityContext?: ProductActivityContext & { currentUserId?: string; isAdmin?: boolean }): Promise<ProductDTO> {
    const existing = await this.unitOfWork.products.findById(id, true);

    if (!existing) {
      throw new NotFoundError('Product not found');
    }

    const currentUserId = activityContext?.performedBy || '';
    this.checkOwnership(existing.ownerId, currentUserId, activityContext?.isAdmin);

    const restored = await this.unitOfWork.products.restore(id);

    if (!restored) {
      throw new NotFoundError('Product not found');
    }

    const product = await this.unitOfWork.products.findByIdWithVariants(id, true);

    if (!product) {
      throw new NotFoundError('Product not found');
    }

    await this.logActivity({
      userId: product.ownerId,
      action: 'product.restored',
      entity: 'products',
      entityId: id,
      ipAddress: activityContext?.ipAddress,
      userAgent: activityContext?.userAgent,
      details: { performedBy: activityContext?.performedBy },
    });

    return product;
  }

  async updateStock(input: UpdateStockInput & ProductActivityContext): Promise<{ id: string; stock: number }> {
    if (input.stock < 0) {
      throw new BadRequestError('Stock cannot be negative');
    }

    const existing = await this.unitOfWork.products.findById(input.id, true);

    if (!existing) {
      throw new NotFoundError('Product not found');
    }

    this.checkOwnership(existing.ownerId, input.currentUserId || '', input.isAdmin);

    if (existing.hasVariant) {
      throw new BadRequestError('Cannot update stock directly for products with variants');
    }

    const updated = await this.unitOfWork.products.updateStock(input.id, input.stock);

    if (!updated) {
      throw new NotFoundError('Product not found');
    }

    await this.logActivity({
      userId: existing.ownerId,
      action: 'product.stock_updated',
      entity: 'products',
      entityId: input.id,
      ipAddress: input.ipAddress,
      userAgent: input.userAgent,
      details: {
        performedBy: input.performedBy,
        oldStock: existing.stock,
        newStock: input.stock,
      },
    });

    return {
      id: updated.id,
      stock: updated.stock,
    };
  }
}
