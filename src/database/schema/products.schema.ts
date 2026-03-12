import { boolean, index, integer, numeric, pgTable, text, timestamp, uuid } from 'drizzle-orm/pg-core';
import { users } from './users.schema';

export const products = pgTable(
  'products',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    ownerId: uuid('owner_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    name: text('name').notNull(),
    price: numeric('price', { precision: 10, scale: 2 }).notNull(),
    stock: integer('stock').notNull().default(0),
    hasVariant: boolean('has_variant').notNull().default(false),
    deletedAt: timestamp('deleted_at', { withTimezone: true }),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  table => ({
    ownerIdIdx: index('products_owner_id_idx').on(table.ownerId),
    nameIdx: index('products_name_idx').on(table.name),
    priceIdx: index('products_price_idx').on(table.price),
    hasVariantIdx: index('products_has_variant_idx').on(table.hasVariant),
    stockIdx: index('products_stock_idx').on(table.stock),
  })
);

export type Product = typeof products.$inferSelect;
export type NewProduct = typeof products.$inferInsert;
