import { describe, it, expect } from 'bun:test';
import {
  createAttributeSchema,
  createVariantSchema,
  createProductSchema,
  updateProductSchema,
  updateStockSchema,
  getProductsQuerySchema,
  getProductQuerySchema,
  productIdParamSchema,
  deleteProductQuerySchema,
} from '../../../src/routes/dto/products.dto';

describe('Products DTO Validation', () => {
  describe('createAttributeSchema', () => {
    it('should validate valid attribute', () => {
      const validData = {
        name: 'Color',
        values: ['Red', 'Blue', 'Green'],
      };

      const result = createAttributeSchema.safeParse(validData);

      expect(result.success).toBe(true);
    });

    it('should validate with displayOrder', () => {
      const validData = {
        name: 'Color',
        values: ['Red', 'Blue'],
        displayOrder: 1,
      };

      const result = createAttributeSchema.safeParse(validData);

      expect(result.success).toBe(true);
    });

    it('should reject missing values', () => {
      const invalidData = {
        name: 'Color',
      };

      const result = createAttributeSchema.safeParse(invalidData);

      expect(result.success).toBe(false);
    });

    it('should reject empty values array', () => {
      const invalidData = {
        name: 'Color',
        values: [],
      };

      const result = createAttributeSchema.safeParse(invalidData);

      expect(result.success).toBe(false);
    });

    it('should reject empty name', () => {
      const invalidData = {
        name: '',
        values: ['Red'],
      };

      const result = createAttributeSchema.safeParse(invalidData);

      expect(result.success).toBe(false);
    });

    it('should reject too long name', () => {
      const invalidData = {
        name: 'a'.repeat(101),
        values: ['Red'],
      };

      const result = createAttributeSchema.safeParse(invalidData);

      expect(result.success).toBe(false);
    });
  });

  describe('createVariantSchema', () => {
    it('should validate valid variant', () => {
      const validData = {
        name: 'Red Small',
        sku: 'RED-SMALL',
        attributeValues: { Color: 'Red', Size: 'Small' },
      };

      const result = createVariantSchema.safeParse(validData);

      expect(result.success).toBe(true);
    });

    it('should validate with optional fields', () => {
      const validData = {
        name: 'Red Small',
        sku: 'RED-SMALL',
        price: 29.99,
        stock: 100,
        isActive: true,
        attributeValues: { Color: 'Red' },
      };

      const result = createVariantSchema.safeParse(validData);

      expect(result.success).toBe(true);
    });

    it('should validate with nullable price', () => {
      const validData = {
        name: 'Red Small',
        sku: 'RED-SMALL',
        price: null,
        attributeValues: { Color: 'Red' },
      };

      const result = createVariantSchema.safeParse(validData);

      expect(result.success).toBe(true);
    });

    it('should reject invalid SKU format', () => {
      const invalidData = {
        name: 'Red Small',
        sku: 'RED SMALL!',
        attributeValues: { Color: 'Red' },
      };

      const result = createVariantSchema.safeParse(invalidData);

      expect(result.success).toBe(false);
    });

    it('should reject negative price', () => {
      const invalidData = {
        name: 'Red Small',
        sku: 'RED-SMALL',
        price: -10,
        attributeValues: { Color: 'Red' },
      };

      const result = createVariantSchema.safeParse(invalidData);

      expect(result.success).toBe(false);
    });

    it('should reject negative stock', () => {
      const invalidData = {
        name: 'Red Small',
        sku: 'RED-SMALL',
        stock: -1,
        attributeValues: { Color: 'Red' },
      };

      const result = createVariantSchema.safeParse(invalidData);

      expect(result.success).toBe(false);
    });
  });

  describe('createProductSchema', () => {
    it('should validate simple product without variants', () => {
      const validData = {
        name: 'T-Shirt',
        price: 29.99,
      };

      const result = createProductSchema.safeParse(validData);

      expect(result.success).toBe(true);
    });

    it('should validate with stock', () => {
      const validData = {
        name: 'T-Shirt',
        price: 29.99,
        stock: 100,
      };

      const result = createProductSchema.safeParse(validData);

      expect(result.success).toBe(true);
    });

    it('should validate product with variants and attributes', () => {
      const validData = {
        name: 'T-Shirt',
        price: 29.99,
        attributes: [
          {
            name: 'Color',
            values: ['Red', 'Blue'],
          },
        ],
        variants: [
          {
            name: 'Red',
            sku: 'TSHIRT-RED',
            attributeValues: { Color: 'Red' },
          },
        ],
      };

      const result = createProductSchema.safeParse(validData);

      expect(result.success).toBe(true);
    });

    it('should reject variants without attributes', () => {
      const invalidData = {
        name: 'T-Shirt',
        price: 29.99,
        variants: [
          {
            name: 'Red',
            sku: 'TSHIRT-RED',
            attributeValues: { Color: 'Red' },
          },
        ],
      };

      const result = createProductSchema.safeParse(invalidData);

      expect(result.success).toBe(false);
    });

    it('should reject zero price', () => {
      const invalidData = {
        name: 'T-Shirt',
        price: 0,
      };

      const result = createProductSchema.safeParse(invalidData);

      expect(result.success).toBe(false);
    });

    it('should reject negative price', () => {
      const invalidData = {
        name: 'T-Shirt',
        price: -10,
      };

      const result = createProductSchema.safeParse(invalidData);

      expect(result.success).toBe(false);
    });

    it('should reject negative stock', () => {
      const invalidData = {
        name: 'T-Shirt',
        price: 29.99,
        stock: -1,
      };

      const result = createProductSchema.safeParse(invalidData);

      expect(result.success).toBe(false);
    });

    it('should reject empty name', () => {
      const invalidData = {
        name: '',
        price: 29.99,
      };

      const result = createProductSchema.safeParse(invalidData);

      expect(result.success).toBe(false);
    });
  });

  describe('updateProductSchema', () => {
    it('should validate with partial data', () => {
      const validData = {
        name: 'Updated T-Shirt',
      };

      const result = updateProductSchema.safeParse(validData);

      expect(result.success).toBe(true);
    });

    it('should validate with price update', () => {
      const validData = {
        price: 39.99,
      };

      const result = updateProductSchema.safeParse(validData);

      expect(result.success).toBe(true);
    });

    it('should validate with variants update', () => {
      const validData = {
        attributes: [{ name: 'Color', values: ['Red', 'Blue'] }],
        variants: [{ name: 'Red', sku: 'RED', attributeValues: { Color: 'Red' } }],
      };

      const result = updateProductSchema.safeParse(validData);

      expect(result.success).toBe(true);
    });

    it('should reject negative price', () => {
      const invalidData = {
        price: -10,
      };

      const result = updateProductSchema.safeParse(invalidData);

      expect(result.success).toBe(false);
    });
  });

  describe('updateStockSchema', () => {
    it('should validate valid stock', () => {
      const validData = {
        stock: 50,
      };

      const result = updateStockSchema.safeParse(validData);

      expect(result.success).toBe(true);
    });

    it('should validate zero stock', () => {
      const validData = {
        stock: 0,
      };

      const result = updateStockSchema.safeParse(validData);

      expect(result.success).toBe(true);
    });

    it('should reject negative stock', () => {
      const invalidData = {
        stock: -1,
      };

      const result = updateStockSchema.safeParse(invalidData);

      expect(result.success).toBe(false);
    });
  });

  describe('getProductsQuerySchema', () => {
    it('should validate default pagination', () => {
      const validData = {};

      const result = getProductsQuerySchema.safeParse(validData);

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.page).toBe(1);
        expect(result.data.limit).toBe(20);
      }
    });

    it('should validate with filters', () => {
      const validData = {
        search: 'shirt',
        inStock: 'true',
        minPrice: '10',
        maxPrice: '100',
        hasVariant: 'false',
      };

      const result = getProductsQuerySchema.safeParse(validData);

      expect(result.success).toBe(true);
    });

    it('should validate includeVariants', () => {
      const validData = {
        includeVariants: 'true',
      };

      const result = getProductsQuerySchema.safeParse(validData);

      expect(result.success).toBe(true);
    });
  });

  describe('getProductQuerySchema', () => {
    it('should validate default options', () => {
      const validData = {};

      const result = getProductQuerySchema.safeParse(validData);

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.include_deleted).toBe(false);
        expect(result.data.includeVariants).toBe(true);
      }
    });

    it('should validate with options', () => {
      const validData = {
        include_deleted: 'true',
        includeVariants: 'false',
      };

      const result = getProductQuerySchema.safeParse(validData);

      expect(result.success).toBe(true);
    });
  });

  describe('productIdParamSchema', () => {
    it('should validate valid UUID', () => {
      const validData = {
        id: '123e4567-e89b-12d3-a456-426614174000',
      };

      const result = productIdParamSchema.safeParse(validData);

      expect(result.success).toBe(true);
    });

    it('should reject invalid UUID', () => {
      const invalidData = {
        id: 'not-a-uuid',
      };

      const result = productIdParamSchema.safeParse(invalidData);

      expect(result.success).toBe(false);
    });
  });

  describe('deleteProductQuerySchema', () => {
    it('should validate without force flag', () => {
      const validData = {};

      const result = deleteProductQuerySchema.safeParse(validData);

      expect(result.success).toBe(true);
    });

    it('should validate with force flag', () => {
      const validData = {
        force: 'true',
      };

      const result = deleteProductQuerySchema.safeParse(validData);

      expect(result.success).toBe(true);
    });
  });
});
