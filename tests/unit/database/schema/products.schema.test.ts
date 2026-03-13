import { describe, it, expect } from 'bun:test';
import { products, type Product, type NewProduct } from '../../../../src/database/schema/products.schema';

describe('Products Schema', () => {
  describe('products table', () => {
    it('should export the products table', () => {
      expect(products).toBeDefined();
      expect(typeof products).toBe('object');
    });

    it('should have id column', () => {
      expect(products).toHaveProperty('id');
    });

    it('should have name column', () => {
      expect(products).toHaveProperty('name');
    });

    it('should have price column', () => {
      expect(products).toHaveProperty('price');
    });

    it('should have stock column', () => {
      expect(products).toHaveProperty('stock');
    });

    it('should have ownerId column', () => {
      expect(products).toHaveProperty('ownerId');
    });

    it('should have hasVariant column', () => {
      expect(products).toHaveProperty('hasVariant');
    });

    it('should have images column', () => {
      expect(products).toHaveProperty('images');
    });

    it('should have deletedAt column', () => {
      expect(products).toHaveProperty('deletedAt');
    });

    it('should have createdAt column', () => {
      expect(products).toHaveProperty('createdAt');
    });

    it('should have updatedAt column', () => {
      expect(products).toHaveProperty('updatedAt');
    });
  });

  describe('Product type', () => {
    it('should export Product type', () => {
      const product: Product = {
        id: '123e4567-e89b-12d3-a456-426614174000',
        name: 'Test Product',
        price: '99.99',
        stock: 10,
        ownerId: '123e4567-e89b-12d3-a456-426614174001',
        hasVariant: false,
        images: null,
        deletedAt: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      expect(product).toBeDefined();
      expect(product.id).toBe('123e4567-e89b-12d3-a456-426614174000');
      expect(product.name).toBe('Test Product');
      expect(product.price).toBe('99.99');
      expect(product.stock).toBe(10);
    });
  });

  describe('NewProduct type', () => {
    it('should export NewProduct type', () => {
      const newProduct: NewProduct = {
        name: 'New Product',
        price: '149.99',
        stock: 5,
        ownerId: '123e4567-e89b-12d3-a456-426614174001',
        hasVariant: false,
      };

      expect(newProduct).toBeDefined();
      expect(newProduct.name).toBe('New Product');
      expect(newProduct.price).toBe('149.99');
      expect(newProduct.stock).toBe(5);
    });
  });

  describe('Column structure', () => {
    it('should have all required columns', () => {
      const columns = Object.keys(products);
      expect(columns).toContain('id');
      expect(columns).toContain('name');
      expect(columns).toContain('price');
      expect(columns).toContain('stock');
      expect(columns).toContain('ownerId');
      expect(columns).toContain('createdAt');
      expect(columns).toContain('updatedAt');
    });
  });
});
