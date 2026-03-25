import type { DocumentDecoration } from 'elysia';
import { requireAuth } from './auth.details';

/**
 * Products route detail definitions
 */
export const productsDetails: Record<string, DocumentDecoration> = {
  createProduct: {
    summary: 'Create a new product',
    description: `Creates a new product with optional variants.

**Requires authentication.**

**Request Body:**
- \`name\`: Product name (required)
- \`price\`: Base price (required, positive number)
- \`stock\`: Initial stock quantity (optional, default: 0)
- \`images\`: Image URL or JSON string (optional)
- \`attributes\`: Array of product attributes for variants (optional)
- \`variants\`: Array of product variants (optional, requires attributes if provided)

**Note:** If creating variants, attributes must be provided first to define the variant structure.`,
    tags: ['Products'],
    security: requireAuth,
  },

  getProductById: {
    summary: 'Get product by ID',
    description: `Retrieves a specific product by its UUID.

**Requires authentication.**

**Path Parameters:**
- \`id\`: Product UUID

**Query Parameters:**
- \`include_deleted\`: Include soft-deleted products (default: false)
- \`includeVariants\`: Include product variants (default: true)`,
    tags: ['Products'],
    security: requireAuth,
  },

  getProducts: {
    summary: 'List all products',
    description: `Retrieves a paginated list of products with optional filtering.

**Requires authentication.**

**Query Parameters:**
- \`page\`: Page number (default: 1)
- \`limit\`: Items per page (default: 10, max: 100)
- \`search\`: Search term for product name
- \`include_deleted\`: Include soft-deleted products (default: false)
- \`only_deleted\`: Show only soft-deleted products (default: false)
- \`hasVariant\`: Filter products with/without variants
- \`inStock\`: Filter products in stock
- \`minPrice\`: Minimum price filter
- \`maxPrice\`: Maximum price filter
- \`includeVariants\`: Include product variants (default: false)`,
    tags: ['Products'],
    security: requireAuth,
  },

  patchProduct: {
    summary: 'Partially update a product',
    description: `Updates specific fields of a product (partial update).

**Requires authentication.**

**Path Parameters:**
- \`id\`: Product UUID

**Request Body:** All fields are optional. Only provided fields will be updated.`,
    tags: ['Products'],
    security: requireAuth,
  },

  putProduct: {
    summary: 'Fully update a product',
    description: `Replaces all fields of a product (full update).

**Requires authentication.**

**Path Parameters:**
- \`id\`: Product UUID

**Request Body:** Provide all updatable fields.`,
    tags: ['Products'],
    security: requireAuth,
  },

  deleteProduct: {
    summary: 'Delete a product',
    description: `Deletes a product (soft delete by default).

**Requires authentication.**

**Path Parameters:**
- \`id\`: Product UUID

**Query Parameters:**
- \`force\`: Set to "true" to permanently delete (hard delete)`,
    tags: ['Products'],
    security: requireAuth,
  },

  restoreProduct: {
    summary: 'Restore a deleted product',
    description: `Restores a soft-deleted product.

**Requires authentication.**

**Path Parameters:**
- \`id\`: Product UUID`,
    tags: ['Products'],
    security: requireAuth,
  },

  updateStock: {
    summary: 'Update product stock',
    description: `Updates the stock quantity for a product.

**Requires authentication.**

**Path Parameters:**
- \`id\`: Product UUID

**Request Body:**
- \`stock\`: New stock quantity (non-negative integer)`,
    tags: ['Products'],
    security: requireAuth,
  },
};
