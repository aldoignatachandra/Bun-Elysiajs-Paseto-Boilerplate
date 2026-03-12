import { boolean, index, integer, jsonb, numeric, pgTable, text, timestamp, unique, uuid } from 'drizzle-orm/pg-core';
import { products } from './products.schema';

export const productVariants = pgTable(
  'product_variants',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    productId: uuid('product_id')
      .notNull()
      .references(() => products.id, { onDelete: 'cascade' }),
    sku: text('sku').notNull(),
    price: numeric('price', { precision: 10, scale: 2 }),
    stockQuantity: integer('stock_quantity').notNull().default(0),
    stockReserved: integer('stock_reserved').notNull().default(0),
    isActive: boolean('is_active').notNull().default(true),
    attributeValues: jsonb('attribute_values').notNull().$type<Record<string, string>>(),
    deletedAt: timestamp('deleted_at', { withTimezone: true }),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  table => ({
    productIdIdx: index('product_variants_product_id_idx').on(table.productId),
    skuIdx: unique('product_variants_sku_unique').on(table.sku),
    isActiveIdx: index('product_variants_is_active_idx').on(table.isActive),
  })
);

export type ProductVariant = typeof productVariants.$inferSelect;
export type NewProductVariant = typeof productVariants.$inferInsert;
