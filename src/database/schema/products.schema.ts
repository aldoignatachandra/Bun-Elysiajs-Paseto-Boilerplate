import { boolean, index, integer, numeric, pgTable, text, timestamp, uuid } from 'drizzle-orm/pg-core';
import { users } from './users.schema';

export const products = pgTable(
  'products',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    name: text('name').notNull(),
    price: numeric('price', { precision: 10, scale: 2 }).notNull(),
    stock: integer('stock').notNull().default(0),
    ownerId: uuid('owner_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    hasVariant: boolean('has_variant').notNull().default(false),
    images: text('images'),
    deletedAt: timestamp('deleted_at', { withTimezone: true }),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  table => ({
    ownerIdIdx: index('products_owner_id_idx').on(table.ownerId),
    hasVariantIdx: index('products_has_variant_idx').on(table.hasVariant),
    deletedAtIdx: index('products_deleted_at_idx').on(table.deletedAt),
  })
);

export type Product = typeof products.$inferSelect;
export type NewProduct = typeof products.$inferInsert;
