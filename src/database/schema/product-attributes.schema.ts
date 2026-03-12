import { index, integer, jsonb, pgTable, timestamp, uuid, varchar } from 'drizzle-orm/pg-core';
import { products } from './products.schema';

export const productAttributes = pgTable(
  'product_attributes',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    productId: uuid('product_id')
      .notNull()
      .references(() => products.id, { onDelete: 'cascade' }),
    name: varchar('name', { length: 100 }).notNull(),
    values: jsonb('values').notNull(),
    displayOrder: integer('display_order').notNull().default(0),
    deletedAt: timestamp('deleted_at', { withTimezone: true }),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  table => ({
    productIdIdx: index('product_attributes_product_id_idx').on(table.productId),
    productIdNameIdx: index('product_attributes_product_id_name_idx').on(table.productId, table.name),
    deletedAtIdx: index('product_attributes_deleted_at_idx').on(table.deletedAt),
  })
);

export type ProductAttribute = typeof productAttributes.$inferSelect;
export type NewProductAttribute = typeof productAttributes.$inferInsert;
