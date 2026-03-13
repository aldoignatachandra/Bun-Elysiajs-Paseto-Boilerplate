/* eslint-disable @typescript-eslint/no-explicit-any */
import { describe, it, expect, beforeEach } from 'bun:test';
import { ProductsService } from '../../../src/services/products.service';
import { BadRequestError, ForbiddenError } from '../../../src/core/errors/app-error';

describe('ProductsService', () => {
  let service: ProductsService;
  let mockUnitOfWork: any;

  const mockProduct = {
    id: '123e4567-e89b-12d3-a456-426614174001',
    ownerId: '123e4567-e89b-12d3-a456-426614174000',
    name: 'Test Product',
    price: { min: 99.99, max: 99.99, display: '$99.99' },
    stock: 10,
    hasVariant: false,
    attributes: [],
    variants: [],
    deletedAt: null,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  const mockDbProduct = {
    id: '123e4567-e89b-12d3-a456-426614174001',
    ownerId: '123e4567-e89b-12d3-a456-426614174000',
    name: 'Test Product',
    price: '99.99',
    stock: 10,
    hasVariant: false,
    deletedAt: null,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  beforeEach(() => {
    mockUnitOfWork = {
      products: {
        findWithFilters: () => ({ data: [], total: 0 }),
        findById: () => null,
        findByIdWithVariants: () => null,
        createWithVariants: () => null,
        updateWithVariants: () => null,
        softDelete: () => true,
        restore: () => true,
        delete: () => true,
        updateStock: () => null,
      },
      activityLogs: {
        create: async () => ({}),
      },
    };
    service = new ProductsService(mockUnitOfWork);
  });

  describe('list', () => {
    it('should return paginated products', async () => {
      mockUnitOfWork.products.findWithFilters = async () => ({
        data: [mockProduct],
        total: 1,
      });

      const result = await service.list({ page: 1, limit: 10 });

      expect(result).toBeDefined();
    });
  });

  describe('getById', () => {
    it('should return a product by id', async () => {
      mockUnitOfWork.products.findByIdWithVariants = async () => mockProduct;

      const result = await service.getById({
        id: mockProduct.id,
        currentUserId: mockProduct.ownerId,
      });

      expect(result).toBeDefined();
    });

    it('should throw ForbiddenError when user does not have permission', async () => {
      mockUnitOfWork.products.findByIdWithVariants = async () => mockProduct;

      await expect(
        service.getById({
          id: mockProduct.id,
          currentUserId: 'different-user-id',
        })
      ).rejects.toThrow(ForbiddenError);
    });
  });

  describe('create', () => {
    it('should create a new product', async () => {
      mockUnitOfWork.products.createWithVariants = async () => mockProduct;

      const result = await service.create({
        ownerId: mockProduct.ownerId,
        name: 'New Product',
        price: 99.99,
      });

      expect(result.name).toBe(mockProduct.name);
    });

    it('should throw BadRequestError when price is 0', async () => {
      await expect(
        service.create({
          ownerId: mockProduct.ownerId,
          name: 'New Product',
          price: 0,
        })
      ).rejects.toThrow(BadRequestError);
    });

    it('should throw BadRequestError when stock is negative', async () => {
      await expect(
        service.create({
          ownerId: mockProduct.ownerId,
          name: 'New Product',
          price: 99.99,
          stock: -1,
        })
      ).rejects.toThrow(BadRequestError);
    });
  });

  describe('update', () => {
    it('should update a product', async () => {
      mockUnitOfWork.products.findById = async () => mockDbProduct;
      mockUnitOfWork.products.updateWithVariants = async () => ({ ...mockProduct, name: 'Updated Product' });

      const result = await service.update({
        id: mockProduct.id,
        currentUserId: mockProduct.ownerId,
        name: 'Updated Product',
      });

      expect(result.name).toBe('Updated Product');
    });

    it('should throw ForbiddenError when user does not have permission', async () => {
      mockUnitOfWork.products.findById = async () => mockDbProduct;

      await expect(
        service.update({
          id: mockProduct.id,
          currentUserId: 'different-user-id',
          name: 'Updated Product',
        })
      ).rejects.toThrow(ForbiddenError);
    });

    it('should allow admin to update any product', async () => {
      mockUnitOfWork.products.findById = async () => mockDbProduct;
      mockUnitOfWork.products.updateWithVariants = async () => ({ ...mockProduct, name: 'Updated Product' });

      const result = await service.update({
        id: mockProduct.id,
        currentUserId: 'different-user-id',
        isAdmin: true,
        name: 'Updated Product',
      });

      expect(result.name).toBe('Updated Product');
    });
  });

  describe('delete', () => {
    it('should soft delete a product', async () => {
      mockUnitOfWork.products.findById = async () => mockDbProduct;
      mockUnitOfWork.products.softDelete = async () => true;
      mockUnitOfWork.products.findByIdWithVariants = async () => mockProduct;

      const result = await service.delete(mockProduct.id, false, {
        performedBy: mockProduct.ownerId,
      });

      expect(result).toBeDefined();
    });

    it('should throw ForbiddenError when user does not have permission', async () => {
      mockUnitOfWork.products.findById = async () => mockDbProduct;

      await expect(
        service.delete(mockProduct.id, false, {
          performedBy: 'different-user-id',
        })
      ).rejects.toThrow(ForbiddenError);
    });

    it('should allow admin to delete any product', async () => {
      mockUnitOfWork.products.findById = async () => mockDbProduct;
      mockUnitOfWork.products.softDelete = async () => true;
      mockUnitOfWork.products.findByIdWithVariants = async () => mockProduct;

      const result = await service.delete(mockProduct.id, false, {
        performedBy: 'different-user-id',
        isAdmin: true,
      });

      expect(result).toBeDefined();
    });
  });

  describe('restore', () => {
    it('should restore a soft deleted product', async () => {
      mockUnitOfWork.products.findById = async () => mockDbProduct;
      mockUnitOfWork.products.restore = async () => true;
      mockUnitOfWork.products.findByIdWithVariants = async () => mockProduct;

      const result = await service.restore(mockProduct.id, {
        performedBy: mockProduct.ownerId,
      });

      expect(result).toBeDefined();
    });

    it('should throw ForbiddenError when user does not have permission', async () => {
      mockUnitOfWork.products.findById = async () => mockDbProduct;

      await expect(
        service.restore(mockProduct.id, {
          performedBy: 'different-user-id',
        })
      ).rejects.toThrow(ForbiddenError);
    });
  });

  describe('updateStock', () => {
    it('should update product stock', async () => {
      mockUnitOfWork.products.findById = async () => mockDbProduct;
      mockUnitOfWork.products.updateStock = async () => ({ ...mockDbProduct, stock: 20 });

      const result = await service.updateStock({
        id: mockProduct.id,
        stock: 20,
        currentUserId: mockProduct.ownerId,
      });

      expect(result.stock).toBe(20);
    });

    it('should throw ForbiddenError when user does not have permission', async () => {
      mockUnitOfWork.products.findById = async () => mockDbProduct;

      await expect(
        service.updateStock({
          id: mockProduct.id,
          stock: 20,
          currentUserId: 'different-user-id',
        })
      ).rejects.toThrow(ForbiddenError);
    });
  });
});
