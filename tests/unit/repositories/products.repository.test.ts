import { describe, test, expect, beforeEach, spyOn } from 'bun:test';
import { ProductRepository } from '@/repositories/products.repository';
import { createMockDb, createMockQueryBuilder } from '../mocks/repository.mocks';

describe('ProductRepository', () => {
  let mockDb: ReturnType<typeof createMockDb>;
  let repository: ProductRepository;

  beforeEach(() => {
    mockDb = createMockDb();
    repository = new ProductRepository(mockDb as any);
  });

  describe('findByIdWithVariants (findWithVariants)', () => {
    test('should return product with variants when found', async () => {
      // Arrange
      const productId = 'prod-123';
      const mockProduct = {
        id: productId,
        ownerId: 'user-1',
        name: 'Test Product',
        price: '29.99',
        stock: 100,
        hasVariant: true,
        deletedAt: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      const mockAttributes = [
        {
          id: 'attr-1',
          productId,
          name: 'Color',
          values: ['Red', 'Blue'] as string[],
          displayOrder: 1,
          deletedAt: null,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ];
      const mockVariants = [
        {
          id: 'var-1',
          productId,
          name: 'Red Variant',
          sku: 'TEST-RED',
          price: '29.99',
          stockQuantity: 50,
          stockReserved: 0,
          isActive: true,
          attributeValues: { Color: 'Red' },
          deletedAt: null,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ];

      // Mock findById call
      const findByIdMock = spyOn(repository, 'findById' as any).mockResolvedValueOnce(mockProduct as any);

      // Mock the db.select calls for attributes and variants
      const selectMock1 = createMockQueryBuilder();
      selectMock1.from.mockReturnValue(selectMock1);
      selectMock1.where.mockReturnValue(selectMock1);
      selectMock1.orderBy.mockReturnValue(Promise.resolve(mockAttributes));

      const selectMock2 = createMockQueryBuilder();
      selectMock2.from.mockReturnValue(selectMock2);
      selectMock2.where.mockReturnValue(selectMock2);
      selectMock2.orderBy.mockReturnValue(Promise.resolve(mockVariants));

      mockDb.select.mockReturnValueOnce(selectMock1 as any).mockReturnValueOnce(selectMock2 as any);

      // Act
      const result = await repository.findByIdWithVariants(productId);

      // Assert
      expect(result).not.toBeNull();
      expect(result?.id).toBe(productId);
      expect(result?.name).toBe('Test Product');
      expect(result?.variants).toHaveLength(1);
      expect(result?.variants?.[0].sku).toBe('TEST-RED');
      expect(result?.attributes).toHaveLength(1);
      expect(result?.attributes?.[0].name).toBe('Color');
      expect(findByIdMock).toHaveBeenCalled();
      expect(mockDb.select).toHaveBeenCalledTimes(2);
    });

    test('should return null when product not found', async () => {
      // Arrange
      const findByIdMock = spyOn(repository, 'findById' as any).mockResolvedValueOnce(null);

      // Act
      const result = await repository.findByIdWithVariants('non-existent-id');

      // Assert
      expect(result).toBeNull();
      expect(findByIdMock).toHaveBeenCalled();
    });

    test('should return null when database error occurs', async () => {
      // Arrange
      spyOn(repository, 'findById' as any).mockRejectedValueOnce(new Error('Database connection failed'));

      // Act
      const result = await repository.findByIdWithVariants('prod-123');

      // Assert
      expect(result).toBeNull();
    });
  });

  describe('updateStock', () => {
    test('should update stock quantity and return updated product', async () => {
      // Arrange
      const productId = 'prod-123';
      const newStock = 50;
      const updatedProduct = {
        id: productId,
        ownerId: 'user-1',
        name: 'Test Product',
        price: '29.99',
        stock: newStock,
        hasVariant: false,
        deletedAt: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      const updateMock = createMockQueryBuilder();
      updateMock.set.mockReturnValue(updateMock);
      updateMock.where.mockReturnValue(updateMock);
      updateMock.returning.mockResolvedValue([updatedProduct]);
      mockDb.update.mockReturnValue(updateMock);

      // Act
      const result = await repository.updateStock(productId, newStock);

      // Assert
      expect(result).not.toBeNull();
      expect(result?.stock).toBe(newStock);
      expect(mockDb.update).toHaveBeenCalled();
      expect(updateMock.set).toHaveBeenCalledWith(expect.objectContaining({ stock: newStock }));
    });

    test('should return null when product not found', async () => {
      // Arrange
      const updateMock = createMockQueryBuilder();
      updateMock.set.mockReturnValue(updateMock);
      updateMock.where.mockReturnValue(updateMock);
      updateMock.returning.mockResolvedValue([]);
      mockDb.update.mockReturnValue(updateMock);

      // Act
      const result = await repository.updateStock('non-existent-id', 50);

      // Assert
      expect(result).toBeNull();
      expect(mockDb.update).toHaveBeenCalled();
    });

    test('should throw error when database update fails', async () => {
      // Arrange
      const updateMock = createMockQueryBuilder();
      updateMock.set.mockReturnValue(updateMock);
      updateMock.where.mockReturnValue(updateMock);
      updateMock.returning.mockRejectedValue(new Error('Update failed'));
      mockDb.update.mockReturnValue(updateMock);

      // Act & Assert
      expect(repository.updateStock('prod-123', 50)).rejects.toThrow('Update failed');
    });
  });

  describe('findActive', () => {
    test('should return only active products (not deleted)', async () => {
      // Arrange
      const mockActiveProducts = [
        {
          id: 'prod-1',
          ownerId: 'user-1',
          name: 'Active Product 1',
          price: '19.99',
          stock: 100,
          hasVariant: false,
          deletedAt: null,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
        {
          id: 'prod-2',
          ownerId: 'user-1',
          name: 'Active Product 2',
          price: '29.99',
          stock: 50,
          hasVariant: false,
          deletedAt: null,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ];

      const createDynamicQuery = () => ({
        where: () => createDynamicQuery(),
        orderBy: () => createDynamicQuery(),
        limit: () => createDynamicQuery(),
        offset: () => createDynamicQuery(),
        then: (resolve: (value: unknown) => void) => resolve(mockActiveProducts),
      });

      const selectMock = createMockQueryBuilder();
      selectMock.from.mockReturnValue({
        $dynamic: createDynamicQuery,
      });
      mockDb.select.mockReturnValue(selectMock as any);

      // Act
      const result = await repository.findAll({ includeDeleted: false });

      // Assert
      expect(result).toHaveLength(2);
      expect(result[0].deletedAt).toBeNull();
      expect(result[1].deletedAt).toBeNull();
      expect(mockDb.select).toHaveBeenCalled();
    });

    test('should return all products including deleted when includeDeleted is true', async () => {
      // Arrange
      const mockProducts = [
        {
          id: 'prod-1',
          ownerId: 'user-1',
          name: 'Active Product',
          price: '19.99',
          stock: 100,
          hasVariant: false,
          deletedAt: null,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
        {
          id: 'prod-2',
          ownerId: 'user-1',
          name: 'Deleted Product',
          price: '29.99',
          stock: 0,
          hasVariant: false,
          deletedAt: new Date(),
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ];

      const createDynamicQuery = () => ({
        orderBy: () => createDynamicQuery(),
        limit: () => createDynamicQuery(),
        offset: () => createDynamicQuery(),
        then: (resolve: (value: unknown) => void) => resolve(mockProducts),
      });

      const selectMock = createMockQueryBuilder();
      selectMock.from.mockReturnValue({
        $dynamic: createDynamicQuery,
      });
      mockDb.select.mockReturnValue(selectMock as any);

      // Act
      const result = await repository.findAll({ includeDeleted: true });

      // Assert
      expect(result).toHaveLength(2);
      expect(mockDb.select).toHaveBeenCalled();
    });

    test('should return empty array when no active products exist', async () => {
      // Arrange
      const createDynamicQuery = () => ({
        where: () => createDynamicQuery(),
        orderBy: () => createDynamicQuery(),
        limit: () => createDynamicQuery(),
        offset: () => createDynamicQuery(),
        then: (resolve: (value: unknown) => void) => resolve([]),
      });

      const selectMock = createMockQueryBuilder();
      selectMock.from.mockReturnValue({
        $dynamic: createDynamicQuery,
      });
      mockDb.select.mockReturnValue(selectMock as any);

      // Act
      const result = await repository.findAll({ includeDeleted: false });

      // Assert
      expect(result).toEqual([]);
      expect(mockDb.select).toHaveBeenCalled();
    });
  });

  describe('search', () => {
    test('should return products matching search term by name', async () => {
      // Arrange
      const searchTerm = 'Widget';
      const mockMatchingProducts = [
        {
          id: 'prod-1',
          ownerId: 'user-1',
          name: 'Widget Pro',
          price: '19.99',
          stock: 100,
          hasVariant: false,
          deletedAt: null,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
        {
          id: 'prod-2',
          ownerId: 'user-1',
          name: 'Super Widget',
          price: '29.99',
          stock: 50,
          hasVariant: false,
          deletedAt: null,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ];

      const mockCountResult = { count: '2' };

      const countSelectMock = createMockQueryBuilder();
      countSelectMock.from.mockReturnValue(countSelectMock);
      countSelectMock.where.mockReturnValue(Promise.resolve([mockCountResult]));

      const dataSelectMock = createMockQueryBuilder();
      dataSelectMock.from.mockReturnValue(dataSelectMock);
      dataSelectMock.where.mockReturnValue(dataSelectMock);
      dataSelectMock.orderBy.mockReturnValue(dataSelectMock);
      dataSelectMock.limit.mockReturnValue(dataSelectMock);
      dataSelectMock.offset.mockReturnValue(Promise.resolve(mockMatchingProducts));

      mockDb.select.mockReturnValueOnce(countSelectMock as any).mockReturnValueOnce(dataSelectMock as any);

      // Act
      const result = await repository.findWithFilters({ search: searchTerm, limit: 10, offset: 0 });

      // Assert
      expect(result.data).toHaveLength(2);
      expect(result.data[0].name).toContain(searchTerm);
      expect(result.data[1].name).toContain(searchTerm);
      expect(result.total).toBe(2);
      expect(mockDb.select).toHaveBeenCalledTimes(2);
    });

    test('should return empty array when no products match search term', async () => {
      // Arrange
      const searchTerm = 'NonExistentProduct';
      const mockCountResult = { count: '0' };

      const countSelectMock = createMockQueryBuilder();
      countSelectMock.from.mockReturnValue(countSelectMock);
      countSelectMock.where.mockReturnValue(Promise.resolve([mockCountResult]));

      const dataSelectMock = createMockQueryBuilder();
      dataSelectMock.from.mockReturnValue(dataSelectMock);
      dataSelectMock.where.mockReturnValue(dataSelectMock);
      dataSelectMock.orderBy.mockReturnValue(dataSelectMock);
      dataSelectMock.limit.mockReturnValue(dataSelectMock);
      dataSelectMock.offset.mockReturnValue(Promise.resolve([]));

      mockDb.select.mockReturnValueOnce(countSelectMock as any).mockReturnValueOnce(dataSelectMock as any);

      // Act
      const result = await repository.findWithFilters({ search: searchTerm, limit: 10, offset: 0 });

      // Assert
      expect(result.data).toEqual([]);
      expect(result.total).toBe(0);
      expect(mockDb.select).toHaveBeenCalledTimes(2);
    });

    test('should return empty array when search term is empty string', async () => {
      // Arrange
      const mockProducts = [
        {
          id: 'prod-1',
          ownerId: 'user-1',
          name: 'Product 1',
          price: '19.99',
          stock: 100,
          hasVariant: false,
          deletedAt: null,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ];

      const mockCountResult = { count: '1' };

      const countSelectMock = createMockQueryBuilder();
      countSelectMock.from.mockReturnValue(countSelectMock);
      countSelectMock.where.mockReturnValue(Promise.resolve([mockCountResult]));

      const dataSelectMock = createMockQueryBuilder();
      dataSelectMock.from.mockReturnValue(dataSelectMock);
      dataSelectMock.where.mockReturnValue(dataSelectMock);
      dataSelectMock.orderBy.mockReturnValue(dataSelectMock);
      dataSelectMock.limit.mockReturnValue(dataSelectMock);
      dataSelectMock.offset.mockReturnValue(Promise.resolve(mockProducts));

      mockDb.select.mockReturnValueOnce(countSelectMock as any).mockReturnValueOnce(dataSelectMock as any);

      // Act
      await repository.findWithFilters({ search: '', limit: 10, offset: 0 });

      // Assert
      expect(mockDb.select).toHaveBeenCalledTimes(2);
    });

    test('should handle database errors gracefully during search', async () => {
      // Arrange
      const countSelectMock = createMockQueryBuilder();
      countSelectMock.from.mockReturnValue(countSelectMock);
      countSelectMock.where.mockReturnValue(Promise.reject(new Error('Search failed')));
      mockDb.select.mockReturnValueOnce(countSelectMock as any);

      // Act
      const result = await repository.findWithFilters({ search: 'Widget', limit: 10, offset: 0 });

      // Assert
      expect(result.data).toEqual([]);
      expect(result.total).toBe(0);
    });
  });

  describe('findById', () => {
    test('should return product when found', async () => {
      // Arrange
      const productId = 'prod-123';
      const mockProduct = {
        id: productId,
        ownerId: 'user-1',
        name: 'Test Product',
        price: '29.99',
        stock: 100,
        hasVariant: false,
        deletedAt: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      const selectMock = createMockQueryBuilder();
      selectMock.from.mockReturnValue(selectMock);
      selectMock.where.mockReturnValue(selectMock);
      selectMock.limit.mockReturnValue(Promise.resolve([mockProduct]));
      mockDb.select.mockReturnValue(selectMock as any);

      // Act
      const result = await repository.findById(productId);

      // Assert
      expect(result).not.toBeNull();
      expect(result?.id).toBe(productId);
      expect(mockDb.select).toHaveBeenCalled();
    });

    test('should return null when product not found', async () => {
      // Arrange
      const selectMock = createMockQueryBuilder();
      selectMock.from.mockReturnValue(selectMock);
      selectMock.where.mockReturnValue(selectMock);
      selectMock.limit.mockReturnValue(Promise.resolve([]));
      mockDb.select.mockReturnValue(selectMock as any);

      // Act
      const result = await repository.findById('non-existent-id');

      // Assert
      expect(result).toBeNull();
    });
  });

  describe('softDelete', () => {
    test('should soft delete product and return true', async () => {
      // Arrange
      const productId = 'prod-123';
      const deletedProduct = {
        id: productId,
        ownerId: 'user-1',
        name: 'Test Product',
        price: '29.99',
        stock: 100,
        hasVariant: false,
        deletedAt: new Date(),
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      const updateMock = createMockQueryBuilder();
      updateMock.set.mockReturnValue(updateMock);
      updateMock.where.mockReturnValue(updateMock);
      updateMock.returning.mockResolvedValue([deletedProduct]);
      mockDb.update.mockReturnValue(updateMock);

      // Act
      const result = await repository.softDelete(productId);

      // Assert
      expect(result).toBe(true);
      expect(mockDb.update).toHaveBeenCalled();
      expect(updateMock.set).toHaveBeenCalledWith(expect.objectContaining({ deletedAt: expect.any(Date) }));
    });

    test('should return false when product not found for soft delete', async () => {
      // Arrange
      const updateMock = createMockQueryBuilder();
      updateMock.set.mockReturnValue(updateMock);
      updateMock.where.mockReturnValue(updateMock);
      updateMock.returning.mockResolvedValue([]);
      mockDb.update.mockReturnValue(updateMock);

      // Act
      const result = await repository.softDelete('non-existent-id');

      // Assert
      expect(result).toBe(false);
    });
  });

  describe('restore', () => {
    test('should restore deleted product and return true', async () => {
      // Arrange
      const productId = 'prod-123';
      const restoredProduct = {
        id: productId,
        ownerId: 'user-1',
        name: 'Test Product',
        price: '29.99',
        stock: 100,
        hasVariant: false,
        deletedAt: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      const updateMock = createMockQueryBuilder();
      updateMock.set.mockReturnValue(updateMock);
      updateMock.where.mockReturnValue(updateMock);
      updateMock.returning.mockResolvedValue([restoredProduct]);
      mockDb.update.mockReturnValue(updateMock);

      // Act
      const result = await repository.restore(productId);

      // Assert
      expect(result).toBe(true);
      expect(mockDb.update).toHaveBeenCalled();
      expect(updateMock.set).toHaveBeenCalledWith(expect.objectContaining({ deletedAt: null }));
    });

    test('should return false when product not found for restore', async () => {
      // Arrange
      const updateMock = createMockQueryBuilder();
      updateMock.set.mockReturnValue(updateMock);
      updateMock.where.mockReturnValue(updateMock);
      updateMock.returning.mockResolvedValue([]);
      mockDb.update.mockReturnValue(updateMock);

      // Act
      const result = await repository.restore('non-existent-id');

      // Assert
      expect(result).toBe(false);
    });
  });
});
