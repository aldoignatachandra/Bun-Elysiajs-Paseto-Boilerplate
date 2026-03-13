/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable @typescript-eslint/no-unsafe-call */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/no-unsafe-return */
/* eslint-disable @typescript-eslint/no-unused-vars */
/* eslint-disable @typescript-eslint/await-thenable */
/* eslint-disable @typescript-eslint/no-unsafe-argument */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
import { describe, it, expect, beforeEach, jest } from 'bun:test';
import { ProductsController } from '../../../src/controllers/products.controller';
import type { ProductsService } from '../../../src/services/products.service';
import { UnauthorizedError, NotFoundError, InternalServerError } from '../../../src/core/errors/app-error';

describe('ProductsController', () => {
  let controller: ProductsController;
  let mockProductsService: any;

  const mockUser = {
    id: '123e4567-e89b-12d3-a456-426614174000',
    email: 'test@example.com',
    role: 'USER',
  };

  const mockProduct = {
    id: '123e4567-e89b-12d3-a456-426614174001',
    ownerId: '123e4567-e89b-12d3-a456-426614174000',
    name: 'Test Product',
    price: { min: 99.99, max: 99.99, display: '$99.99' },
    stock: 10,
    hasVariant: false,
    deletedAt: null,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  const mockAuthContext = {
    user: mockUser,
    tokenId: 'token-123',
  };

  beforeEach(() => {
    mockProductsService = {
      list: jest.fn(),
      getById: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
      restore: jest.fn(),
      updateStock: jest.fn(),
    };

    controller = new ProductsController(mockProductsService as unknown as ProductsService);
  });

  describe('list', () => {
    it('should return paginated products', async () => {
      mockProductsService.list.mockResolvedValue({ products: [mockProduct], pagination: { total: 1, page: 1, limit: 10, totalPages: 1 } });

      const result = await controller.list({ page: 1, limit: 10 }, mockAuthContext);

      expect(result.products).toHaveLength(1);
    });

    it('should throw UnauthorizedError when user is null', async () => {
      await expect(controller.list({ page: 1, limit: 10 }, { user: null, tokenId: null })).rejects.toThrow(UnauthorizedError);
    });
  });

  describe('getById', () => {
    it('should return product by id', async () => {
      mockProductsService.getById.mockResolvedValue(mockProduct);

      const result = await controller.getById(mockProduct.id, { includeDeleted: false, includeVariants: true }, mockAuthContext);

      expect(result).toEqual(mockProduct);
    });

    it('should throw UnauthorizedError when user is null', async () => {
      await expect(controller.getById('id', { includeDeleted: false, includeVariants: true }, { user: null, tokenId: null })).rejects.toThrow(
        UnauthorizedError
      );
    });
  });

  describe('create', () => {
    it('should create a new product', async () => {
      mockProductsService.create.mockResolvedValue(mockProduct);

      const result = await controller.create({ name: 'New Product', price: 99.99 }, mockAuthContext);

      expect(result).toEqual(mockProduct);
    });

    it('should throw UnauthorizedError when user is null', async () => {
      await expect(controller.create({ name: 'New', price: 10 }, { user: null, tokenId: null })).rejects.toThrow(UnauthorizedError);
    });
  });

  describe('update', () => {
    it('should update a product', async () => {
      const updatedProduct = { ...mockProduct, name: 'Updated Product' };
      mockProductsService.update.mockResolvedValue(updatedProduct);

      const result = await controller.update(mockProduct.id, { name: 'Updated Product' }, mockAuthContext);

      expect(result.name).toBe('Updated Product');
    });

    it('should throw UnauthorizedError when user is null', async () => {
      await expect(controller.update('id', {}, { user: null, tokenId: null })).rejects.toThrow(UnauthorizedError);
    });
  });

  describe('delete', () => {
    it('should delete a product', async () => {
      mockProductsService.delete.mockResolvedValue({ message: 'Product deleted successfully' });

      const result = await controller.delete(mockProduct.id, false, mockAuthContext);

      expect(result.message).toBe('Product deleted successfully');
    });

    it('should throw UnauthorizedError when user is null', async () => {
      await expect(controller.delete('id', false, { user: null, tokenId: null })).rejects.toThrow(UnauthorizedError);
    });
  });

  describe('restore', () => {
    it('should restore a product', async () => {
      mockProductsService.restore.mockResolvedValue(mockProduct);

      const result = await controller.restore(mockProduct.id, mockAuthContext);

      expect(result).toEqual(mockProduct);
    });

    it('should throw UnauthorizedError when user is null', async () => {
      await expect(controller.restore('id', { user: null, tokenId: null })).rejects.toThrow(UnauthorizedError);
    });
  });

  describe('updateStock', () => {
    it('should update product stock', async () => {
      const updatedProduct = { ...mockProduct, stock: 20 };
      mockProductsService.updateStock.mockResolvedValue(updatedProduct);

      const result = await controller.updateStock(mockProduct.id, 20, mockAuthContext);

      expect(result.stock).toBe(20);
    });

    it('should throw UnauthorizedError when user is null', async () => {
      await expect(controller.updateStock('id', 10, { user: null, tokenId: null })).rejects.toThrow(UnauthorizedError);
    });
  });
});
