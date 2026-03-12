import { boolean, index, integer, jsonb, numeric, pgTable, text, timestamp, uuid } from 'drizzle-orm/pg-core';
import { products } from './products.schema';

export const productVariants = pgTable(
  'product_variants',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    productId: uuid('product_id')
      .notNull()
      .references(() => products.id, { onDelete: 'cascade' }),
    name: text('name').notNull(),
    sku: text('sku').notNull().unique(),
    price: numeric('price', { precision: 10, scale: 2 }),
    stockQuantity: integer('stock_quantity').notNull().default(0),
    stockReserved: integer('stock_reserved').notNull().default(0),
    isActive: boolean('is_active').notNull().default(true),
    attributeValues: jsonb('attribute_values'),
    images: text('images'),
    deletedAt: timestamp('deleted_at', { withTimezone: true }),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  table => ({
    productIdIdx: index('product_variants_product_id_idx').on(table.productId),
    isActiveIdx: index('product_variants_is_active_idx').on(table.isActive),
    deletedAtIdx: index('product_variants_deleted_at_idx').on(table.deletedAt),
    skuIdx: index('product_variants_sku_idx').on(table.sku),
  })
);

export type ProductVariant = typeof productVariants.$inferSelect;
export type NewProductVariant = typeof productVariants.$inferInsert;
