import { index, integer, jsonb, pgTable, text, timestamp, uuid } from 'drizzle-orm/pg-core';
import { products } from './products.schema';

export const productAttributes = pgTable(
  'product_attributes',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    productId: uuid('product_id')
      .notNull()
      .references(() => products.id, { onDelete: 'cascade' }),
    name: text('name').notNull(),
    values: jsonb('values').notNull().$type<string[]>(),
    displayOrder: integer('display_order').notNull().default(0),
    deletedAt: timestamp('deleted_at', { withTimezone: true }),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  table => ({
    productIdIdx: index('product_attributes_product_id_idx').on(table.productId),
    productIdNameIdx: index('product_attributes_product_id_name_idx').on(table.productId, table.name),
  })
);

export type ProductAttribute = typeof productAttributes.$inferSelect;
export type NewProductAttribute = typeof productAttributes.$inferInsert;
