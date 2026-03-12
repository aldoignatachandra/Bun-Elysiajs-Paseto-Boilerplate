import type { UnitOfWork } from '../repositories/unit-of-work';
import type { Product as ProductRecord } from '../database/schema';
import type {
  CreateProductInput,
  IProductsService,
  ListProductsInput,
  ListProductsOutput,
  ProductDTO,
  UpdateProductInput,
  UpdateStockInput,
} from './interfaces/products.service.interface';
import { BadRequestError, NotFoundError } from '../core/errors/app-error';

export class ProductsService implements IProductsService {
  private readonly unitOfWork: UnitOfWork;

  constructor(unitOfWork: UnitOfWork) {
    this.unitOfWork = unitOfWork;
  }

  async list(input: ListProductsInput): Promise<ListProductsOutput> {
    const page = Math.max(1, input.page || 1);
    const limit = Math.max(1, Math.min(100, input.limit || 10));
    const offset = (page - 1) * limit;

    const [allFiltered, paged] = await Promise.all([
      this.unitOfWork.products.findAll({
        search: input.search,
        status: input.status,
        includeDeleted: input.includeDeleted,
        onlyDeleted: input.onlyDeleted,
      }),
      this.unitOfWork.products.findAll({
        search: input.search,
        status: input.status,
        includeDeleted: input.includeDeleted,
        onlyDeleted: input.onlyDeleted,
        limit,
        offset,
      }),
    ]);

    const total = allFiltered.length;
    const totalPages = Math.ceil(total / limit);

    return {
      products: paged.map(product => ({ ...product })),
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

  async getById(id: string, includeDeleted = false): Promise<ProductDTO> {
    const product = await this.unitOfWork.products.findById(id, includeDeleted);
    if (!product) {
      throw new NotFoundError('Product not found');
    }

    return product;
  }

  async create(input: CreateProductInput): Promise<ProductDTO> {
    if (input.stock < 0) {
      throw new BadRequestError('Stock cannot be negative');
    }

    const created = await this.unitOfWork.products.create({
      ownerId: input.ownerId,
      name: input.name,
      description: input.description,
      price: input.price,
      stock: input.stock,
      category: input.category,
      status: input.status || 'ACTIVE',
    });

    return created;
  }

  async update(input: UpdateProductInput): Promise<ProductDTO> {
    const existing = await this.unitOfWork.products.findById(input.id, true);
    if (!existing) {
      throw new NotFoundError('Product not found');
    }

    if (typeof input.stock === 'number' && input.stock < 0) {
      throw new BadRequestError('Stock cannot be negative');
    }

    const updateData: Partial<ProductRecord> = {
      ...(input.name !== undefined ? { name: input.name } : {}),
      ...(input.description !== undefined ? { description: input.description } : {}),
      ...(input.price !== undefined ? { price: input.price } : {}),
      ...(input.stock !== undefined ? { stock: input.stock } : {}),
      ...(input.category !== undefined ? { category: input.category } : {}),
      ...(input.status !== undefined ? { status: input.status } : {}),
    };

    const updated = await this.unitOfWork.products.update(input.id, updateData);

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

    const product = await this.unitOfWork.products.findById(id, true);
    if (!product) {
      throw new NotFoundError('Product not found');
    }

    return product;
  }

  async updateStock(input: UpdateStockInput): Promise<{ id: string; stock: number }> {
    if (input.stock < 0) {
      throw new BadRequestError('Stock cannot be negative');
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
