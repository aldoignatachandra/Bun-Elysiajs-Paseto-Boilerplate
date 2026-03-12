import { BadRequestError, NotFoundError } from '../core/errors/app-error';
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

export class ProductsService implements IProductsService {
  private readonly unitOfWork: UnitOfWork;

  constructor(unitOfWork: UnitOfWork) {
    this.unitOfWork = unitOfWork;
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

    if (!input.includeVariants) {
      return {
        ...product,
        attributes: undefined,
        variants: undefined,
      };
    }

    return product;
  }

  async create(input: CreateProductInput): Promise<ProductDTO> {
    if (input.price <= 0) {
      throw new BadRequestError('Product price must be greater than 0');
    }

    if (input.stock !== undefined && input.stock < 0) {
      throw new BadRequestError('Stock cannot be negative');
    }

    return await this.unitOfWork.products.createWithVariants({
      ownerId: input.ownerId,
      name: input.name,
      price: input.price,
      stock: input.stock,
      attributes: input.attributes,
      variants: input.variants,
    });
  }

  async update(input: UpdateProductInput): Promise<ProductDTO> {
    if (input.price !== undefined && input.price <= 0) {
      throw new BadRequestError('Product price must be greater than 0');
    }

    if (typeof input.stock === 'number' && input.stock < 0) {
      throw new BadRequestError('Stock cannot be negative');
    }

    const updated = await this.unitOfWork.products.updateWithVariants(input.id, {
      name: input.name,
      price: input.price,
      stock: input.stock,
      attributes: input.attributes,
      variants: input.variants,
    });

    if (!updated) {
      throw new NotFoundError('Product not found');
    }

    return updated;
  }

  async delete(id: string, force = false): Promise<{ message: string }> {
    const existing = await this.unitOfWork.products.findById(id, true);

    if (!existing) {
      throw new NotFoundError('Product not found');
    }

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

    return { message: 'Product deleted successfully' };
  }

  async restore(id: string): Promise<ProductDTO> {
    const restored = await this.unitOfWork.products.restore(id);

    if (!restored) {
      throw new NotFoundError('Product not found');
    }

    const product = await this.unitOfWork.products.findByIdWithVariants(id, true);

    if (!product) {
      throw new NotFoundError('Product not found');
    }

    return product;
  }

  async updateStock(input: UpdateStockInput): Promise<{ id: string; stock: number }> {
    if (input.stock < 0) {
      throw new BadRequestError('Stock cannot be negative');
    }

    const existing = await this.unitOfWork.products.findById(input.id, true);

    if (!existing) {
      throw new NotFoundError('Product not found');
    }

    if (existing.hasVariant) {
      throw new BadRequestError('Cannot update stock directly for products with variants');
    }

    const updated = await this.unitOfWork.products.updateStock(input.id, input.stock);

    if (!updated) {
      throw new NotFoundError('Product not found');
    }

    return {
      id: updated.id,
      stock: updated.stock,
    };
  }
}
