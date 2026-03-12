import { z } from 'zod';
import { paginationSchema, uuidSchema } from '../../core/validation/common.schema';

export const createAttributeSchema = z.object({
  name: z.string().min(1).max(100),
  values: z.array(z.string().min(1).max(255)).min(1),
  displayOrder: z.number().int().min(0).optional(),
});

export const createVariantSchema = z.object({
  sku: z
    .string()
    .min(1)
    .max(100)
    .regex(/^[A-Za-z0-9_-]+$/, 'SKU can only contain letters, numbers, hyphens, and underscores'),
  price: z.number().positive().nullable().optional(),
  stock: z.number().int().min(0).optional(),
  isActive: z.boolean().optional(),
  attributeValues: z.record(z.string(), z.string()),
});

export const createProductSchema = z
  .object({
    name: z.string().min(1).max(255),
    price: z.coerce.number().positive(),
    stock: z.number().int().min(0).optional(),
    attributes: z.array(createAttributeSchema).optional(),
    variants: z.array(createVariantSchema).optional(),
  })
  .refine(
    value => {
      if (value.variants && value.variants.length > 0) {
        return value.attributes && value.attributes.length > 0;
      }

      return true;
    },
    {
      message: 'Attributes are required when creating variants',
      path: ['attributes'],
    }
  );

export const updateProductSchema = z
  .object({
    name: z.string().min(1).max(255).optional(),
    price: z.coerce.number().positive().optional(),
    stock: z.number().int().min(0).optional(),
    attributes: z.array(createAttributeSchema).optional(),
    variants: z.array(createVariantSchema).optional(),
  })
  .refine(
    value => {
      if (value.variants !== undefined && value.variants.length > 0) {
        return value.attributes !== undefined && value.attributes.length > 0;
      }

      return true;
    },
    {
      message: 'Attributes are required when updating variants',
      path: ['attributes'],
    }
  );

export const updateStockSchema = z.object({
  stock: z.number().int().min(0),
});

export const getProductsQuerySchema = paginationSchema.extend({
  search: z.string().optional(),
  include_deleted: z.coerce.boolean().optional().default(false),
  only_deleted: z.coerce.boolean().optional().default(false),
  hasVariant: z.coerce.boolean().optional(),
  inStock: z.coerce.boolean().optional(),
  minPrice: z.coerce.number().positive().optional(),
  maxPrice: z.coerce.number().positive().optional(),
  includeVariants: z.coerce.boolean().optional().default(false),
});

export const getProductQuerySchema = z.object({
  include_deleted: z.coerce.boolean().optional().default(false),
  includeVariants: z.coerce.boolean().optional().default(true),
});

export const productIdParamSchema = z.object({
  id: uuidSchema,
});

export const deleteProductQuerySchema = z.object({
  force: z.string().optional(),
});

export type CreateProductDTO = z.infer<typeof createProductSchema>;
export type UpdateProductDTO = z.infer<typeof updateProductSchema>;
export type UpdateStockDTO = z.infer<typeof updateStockSchema>;
export type GetProductsQueryDTO = z.infer<typeof getProductsQuerySchema>;
export type GetProductQueryDTO = z.infer<typeof getProductQuerySchema>;
export type ProductIdParamDTO = z.infer<typeof productIdParamSchema>;
export type DeleteProductQueryDTO = z.infer<typeof deleteProductQuerySchema>;
