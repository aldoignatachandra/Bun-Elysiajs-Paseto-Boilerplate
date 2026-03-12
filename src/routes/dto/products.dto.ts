import { z } from 'zod';
import { paginationSchema } from '../../core/validation/common.schema';

export const productStatusSchema = z.enum(['ACTIVE', 'INACTIVE']);

export const createProductSchema = z.object({
  name: z.string().min(1).max(255),
  description: z.string().max(2000).optional(),
  price: z.string().regex(/^\d+(\.\d{1,2})?$/, 'Price must be a decimal string with max 2 places'),
  stock: z.number().int().min(0),
  category: z.string().min(1).max(255),
  status: productStatusSchema.optional(),
});

export const updateProductSchema = createProductSchema.partial();

export const updateStockSchema = z.object({
  stock: z.number().int().min(0),
});

export const getProductsQuerySchema = paginationSchema.extend({
  search: z.string().optional(),
  status: productStatusSchema.optional(),
  include_deleted: z.coerce.boolean().optional().default(false),
  only_deleted: z.coerce.boolean().optional().default(false),
});

export const getProductQuerySchema = z.object({
  include_deleted: z.coerce.boolean().optional().default(false),
});

export type CreateProductDTO = z.infer<typeof createProductSchema>;
export type UpdateProductDTO = z.infer<typeof updateProductSchema>;
export type UpdateStockDTO = z.infer<typeof updateStockSchema>;
export type GetProductsQueryDTO = z.infer<typeof getProductsQuerySchema>;
