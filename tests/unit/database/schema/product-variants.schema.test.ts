import { describe, it, expect } from 'bun:test';
import { productVariants, type ProductVariant, type NewProductVariant } from '../../../../src/database/schema/product-variants.schema';

describe('Product Variants Schema', () => {
  describe('productVariants table', () => {
    it('should export the productVariants table', () => {
      expect(productVariants).toBeDefined();
      expect(typeof productVariants).toBe('object');
    });

    it('should have id column', () => {
      expect(productVariants).toHaveProperty('id');
    });

    it('should have productId column', () => {
      expect(productVariants).toHaveProperty('productId');
    });

    it('should have name column', () => {
      expect(productVariants).toHaveProperty('name');
    });

    it('should have sku column', () => {
      expect(productVariants).toHaveProperty('sku');
    });

    it('should have price column', () => {
      expect(productVariants).toHaveProperty('price');
    });

    it('should have stockQuantity column', () => {
      expect(productVariants).toHaveProperty('stockQuantity');
    });

    it('should have stockReserved column', () => {
      expect(productVariants).toHaveProperty('stockReserved');
    });

    it('should have isActive column', () => {
      expect(productVariants).toHaveProperty('isActive');
    });

    it('should have attributeValues column', () => {
      expect(productVariants).toHaveProperty('attributeValues');
    });

    it('should have images column', () => {
      expect(productVariants).toHaveProperty('images');
    });

    it('should have deletedAt column', () => {
      expect(productVariants).toHaveProperty('deletedAt');
    });

    it('should have createdAt column', () => {
      expect(productVariants).toHaveProperty('createdAt');
    });

    it('should have updatedAt column', () => {
      expect(productVariants).toHaveProperty('updatedAt');
    });
  });

  describe('ProductVariant type', () => {
    it('should export ProductVariant type', () => {
      const productVariant: ProductVariant = {
        id: '123e4567-e89b-12d3-a456-426614174000',
        productId: '123e4567-e89b-12d3-a456-426614174001',
        name: 'Red - Large',
        sku: 'PROD-RED-L',
        price: '99.99',
        stockQuantity: 50,
        stockReserved: 5,
        isActive: true,
        attributeValues: { color: 'red', size: 'L' },
        images: 'https://example.com/image.jpg',
        deletedAt: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      expect(productVariant).toBeDefined();
      expect(productVariant.id).toBe('123e4567-e89b-12d3-a456-426614174000');
      expect(productVariant.productId).toBe('123e4567-e89b-12d3-a456-426614174001');
      expect(productVariant.name).toBe('Red - Large');
      expect(productVariant.sku).toBe('PROD-RED-L');
      expect(productVariant.price).toBe('99.99');
      expect(productVariant.stockQuantity).toBe(50);
      expect(productVariant.stockReserved).toBe(5);
      expect(productVariant.isActive).toBe(true);
    });
  });

  describe('NewProductVariant type', () => {
    it('should export NewProductVariant type', () => {
      const newProductVariant: NewProductVariant = {
        productId: '123e4567-e89b-12d3-a456-426614174001',
        name: 'Blue - Medium',
        sku: 'PROD-BLU-M',
        price: '89.99',
        stockQuantity: 30,
        stockReserved: 0,
        isActive: true,
        attributeValues: { color: 'blue', size: 'M' },
      };

      expect(newProductVariant).toBeDefined();
      expect(newProductVariant.productId).toBe('123e4567-e89b-12d3-a456-426614174001');
      expect(newProductVariant.name).toBe('Blue - Medium');
      expect(newProductVariant.sku).toBe('PROD-BLU-M');
      expect(newProductVariant.price).toBe('89.99');
      expect(newProductVariant.stockQuantity).toBe(30);
    });
  });

  describe('Column structure', () => {
    it('should have all required columns', () => {
      const columns = Object.keys(productVariants);
      expect(columns).toContain('id');
      expect(columns).toContain('productId');
      expect(columns).toContain('name');
      expect(columns).toContain('sku');
      expect(columns).toContain('createdAt');
      expect(columns).toContain('updatedAt');
    });
  });
});
