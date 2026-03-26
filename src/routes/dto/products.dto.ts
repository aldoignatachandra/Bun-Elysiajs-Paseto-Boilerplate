import { z } from 'zod';
import { paginationSchema, uuidSchema } from '../../core/validation/common.schema';

/**
 * Helper schema for optional query parameters that may be empty strings or already coerced booleans
 * Handles both string and boolean inputs from query params
 */
const optionalString = z
  .string()
  .optional()
  .transform(val => (val === '' ? undefined : val));

const optionalBoolean = z
  .union([z.boolean(), z.string()])
  .optional()
  .transform(val => {
    if (val === '' || val === undefined || val === null) return undefined;
    if (typeof val === 'boolean') return val;
    return val === 'true';
  });

const optionalNumber = z
  .union([z.number(), z.string()])
  .optional()
  .transform(val => {
    if (val === '' || val === undefined || val === null) return undefined;
    if (typeof val === 'number') return val;
    const num = Number(val);
    return Number.isNaN(num) ? undefined : num;
  });

export const createAttributeSchema = z.object({
  name: z.string().min(1).max(100),
  values: z.array(z.string().min(1).max(255)).min(1),
  displayOrder: z.number().int().min(0).optional(),
});

export const createVariantSchema = z.object({
  name: z.string().min(1).max(255),
  sku: z
    .string()
    .min(1)
    .max(100)
    .regex(/^[A-Za-z0-9_-]+$/, 'SKU can only contain letters, numbers, hyphens, and underscores'),
  price: z.number().positive().nullable().optional(),
  stock: z.number().int().min(0).optional(),
  isActive: z.boolean().optional(),
  attributeValues: z.record(z.string(), z.string()),
  images: z.string().optional(),
});

export const createProductSchema = z
  .object({
    name: z.string().min(1).max(255),
    price: z.coerce.number().positive(),
    stock: z.number().int().min(0).optional(),
    images: z.string().optional(),
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
    images: z.string().optional(),
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
  variantId: z.string().uuid('Invalid variant ID format').optional(),
});

export const getProductsQuerySchema = paginationSchema.extend({
  search: optionalString,
  include_deleted: optionalBoolean.transform(val => val ?? false),
  only_deleted: optionalBoolean.transform(val => val ?? false),
  hasVariant: optionalBoolean,
  inStock: optionalBoolean,
  minPrice: optionalNumber.refine(val => val === undefined || val > 0, {
    message: 'Number must be greater than 0',
  }),
  maxPrice: optionalNumber.refine(val => val === undefined || val > 0, {
    message: 'Number must be greater than 0',
  }),
  includeVariants: optionalBoolean.transform(val => val ?? false),
});

export const getProductQuerySchema = z.object({
  include_deleted: optionalBoolean.transform(val => val ?? false),
  includeVariants: optionalBoolean.transform(val => val ?? true),
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
