import { index, jsonb, pgTable, text, timestamp, uuid, varchar } from 'drizzle-orm/pg-core';
import { users } from './users.schema';

export const userActivityLogs = pgTable(
  'user_activity_logs',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    action: varchar('action', { length: 255 }).notNull(),
    entity: varchar('entity', { length: 100 }),
    entityId: uuid('entity_id'),
    ipAddress: varchar('ip_address', { length: 45 }),
    userAgent: text('user_agent'),
    details: jsonb('details'),
    deletedAt: timestamp('deleted_at', { withTimezone: true }),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  table => ({
    userIdIdx: index('user_activity_logs_user_id_idx').on(table.userId),
    actionIdx: index('user_activity_logs_action_idx').on(table.action),
    createdAtIdx: index('user_activity_logs_created_at_idx').on(table.createdAt),
    deletedAtIdx: index('user_activity_logs_deleted_at_idx').on(table.deletedAt),
  })
);

export type UserActivityLog = typeof userActivityLogs.$inferSelect;
export type NewUserActivityLog = typeof userActivityLogs.$inferInsert;
