import { describe, it, expect } from 'bun:test';
import { productAttributes, type ProductAttribute, type NewProductAttribute } from '../../../../src/database/schema/product-attributes.schema';

describe('Product Attributes Schema', () => {
  describe('productAttributes table', () => {
    it('should export the productAttributes table', () => {
      expect(productAttributes).toBeDefined();
      expect(typeof productAttributes).toBe('object');
    });

    it('should have id column', () => {
      expect(productAttributes).toHaveProperty('id');
    });

    it('should have productId column', () => {
      expect(productAttributes).toHaveProperty('productId');
    });

    it('should have name column', () => {
      expect(productAttributes).toHaveProperty('name');
    });

    it('should have values column', () => {
      expect(productAttributes).toHaveProperty('values');
    });

    it('should have displayOrder column', () => {
      expect(productAttributes).toHaveProperty('displayOrder');
    });

    it('should have deletedAt column', () => {
      expect(productAttributes).toHaveProperty('deletedAt');
    });

    it('should have createdAt column', () => {
      expect(productAttributes).toHaveProperty('createdAt');
    });

    it('should have updatedAt column', () => {
      expect(productAttributes).toHaveProperty('updatedAt');
    });
  });

  describe('ProductAttribute type', () => {
    it('should export ProductAttribute type', () => {
      const productAttribute: ProductAttribute = {
        id: '123e4567-e89b-12d3-a456-426614174000',
        productId: '123e4567-e89b-12d3-a456-426614174001',
        name: 'Color',
        values: ['red', 'blue', 'green'],
        displayOrder: 1,
        deletedAt: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      expect(productAttribute).toBeDefined();
      expect(productAttribute.id).toBe('123e4567-e89b-12d3-a456-426614174000');
      expect(productAttribute.productId).toBe('123e4567-e89b-12d3-a456-426614174001');
      expect(productAttribute.name).toBe('Color');
      expect(productAttribute.values).toEqual(['red', 'blue', 'green']);
    });
  });

  describe('NewProductAttribute type', () => {
    it('should export NewProductAttribute type', () => {
      const newProductAttribute: NewProductAttribute = {
        productId: '123e4567-e89b-12d3-a456-426614174001',
        name: 'Size',
        values: ['S', 'M', 'L', 'XL'],
        displayOrder: 2,
      };

      expect(newProductAttribute).toBeDefined();
      expect(newProductAttribute.productId).toBe('123e4567-e89b-12d3-a456-426614174001');
      expect(newProductAttribute.name).toBe('Size');
      expect(newProductAttribute.values).toEqual(['S', 'M', 'L', 'XL']);
    });
  });

  describe('Column structure', () => {
    it('should have all required columns', () => {
      const columns = Object.keys(productAttributes);
      expect(columns).toContain('id');
      expect(columns).toContain('productId');
      expect(columns).toContain('name');
      expect(columns).toContain('values');
      expect(columns).toContain('createdAt');
      expect(columns).toContain('updatedAt');
    });
  });
});
