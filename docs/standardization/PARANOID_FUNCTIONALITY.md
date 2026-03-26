# Paranoid Functionality Implementation

> 🗃️ **Comprehensive guide to soft delete functionality across the application**

This document describes the paranoid (soft delete) functionality implemented across user and product services.

---

## Table of Contents

- [Overview](#overview)
- [Architecture](#architecture)
- [Database Schema](#database-schema)
- [API Endpoints](#api-endpoints)
- [Repository Pattern](#repository-pattern)
- [Error Handling](#error-handling)
- [Best Practices](#best-practices)
- [Migration Guide](#migration-guide)

---

## Overview

The paranoid functionality provides soft delete capabilities with the following features:

- ✅ Soft delete by default (sets `deletedAt` timestamp)
- ✅ Hard delete option (permanent deletion)
- ✅ Restore soft-deleted records
- ✅ Query filtering based on deletion status
- ✅ Comprehensive error handling
- ✅ Enhanced API responses with paranoid metadata

### Benefits

| Benefit             | Description                        |
| ------------------- | ---------------------------------- |
| **Data Recovery**   | Accidental deletions can be undone |
| **Audit Trail**     | Complete history of data changes   |
| **Compliance**      | Meets data retention requirements  |
| **User Experience** | "Undo delete" functionality        |
| **Analytics**       | Historical data analysis possible  |

---

## Architecture

### Core Components

```
┌─────────────────────────────────────────────────────────────┐
│                    Paranoid Architecture                    │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  ┌──────────────┐    ┌──────────────┐    ┌──────────────┐  │
│  │   Routes     │───▶│ Controllers  │───▶│  Services    │  │
│  └──────────────┘    └──────────────┘    └──────────────┘  │
│                                                   │         │
│                                                   ▼         │
│  ┌──────────────┐    ┌──────────────┐    ┌──────────────┐  │
│  │   Response   │◀───│ Repositories │◀───│    Query     │  │
│  │  Formatting  │    │              │    │  Builder     │  │
│  └──────────────┘    └──────────────┘    └──────────────┘  │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

### Component Responsibilities

| Component         | Responsibility                              |
| ----------------- | ------------------------------------------- |
| **Routes**        | Handle paranoid query parameters            |
| **Controllers**   | Validate paranoid options, format responses |
| **Services**      | Business logic with paranoid awareness      |
| **Repositories**  | Database queries with paranoid filtering    |
| **Query Builder** | Generate paranoid-aware SQL queries         |

---

## Database Schema

### Schema Design

```typescript
// src/database/schema/users.schema.ts
import { boolean, pgTable, text, timestamp, uuid } from 'drizzle-orm/pg-core';

export const users = pgTable('users', {
  id: uuid('id').primaryKey().defaultRandom(),
  email: text('email').notNull().unique(),
  firstName: text('first_name').notNull(),
  lastName: text('last_name').notNull(),
  isActive: boolean('is_active').notNull().default(true),
  deletedAt: timestamp('deleted_at', { withTimezone: true }), // Paranoid field
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
});

export type User = typeof users.$inferSelect;
export type NewUser = typeof users.$inferInsert;
```

### Index Strategy

```sql
-- Recommended indexes for paranoid queries
CREATE INDEX idx_users_deleted_at ON users(deleted_at) WHERE deleted_at IS NOT NULL;
CREATE INDEX idx_products_deleted_at ON products(deleted_at) WHERE deleted_at IS NOT NULL;

-- Composite index for common queries
CREATE INDEX idx_users_active_deleted ON users(is_active, deleted_at);
```

---

## API Endpoints

### User Endpoints

#### List Users with Paranoid Options

```typescript
GET / api / admin / users;
```

**Query Parameters:**

| Parameter        | Type    | Default | Description                  |
| ---------------- | ------- | ------- | ---------------------------- |
| `page`           | number  | 1       | Page number for pagination   |
| `limit`          | number  | 20      | Items per page               |
| `includeDeleted` | boolean | false   | Include soft-deleted records |
| `onlyDeleted`    | boolean | false   | Only return deleted records  |
| `search`         | string  | -       | Search by email or name      |

**Example:**

```bash
# Get active users only (default)
GET /api/admin/users

# Include deleted users
GET /api/admin/users?includeDeleted=true

# Only deleted users
GET /api/admin/users?onlyDeleted=true

# Search including deleted
GET /api/admin/users?search=john&includeDeleted=true
```

#### Get User by ID

```typescript
GET /api/admin/users/:id
```

**Query Parameters:**

| Parameter        | Type    | Default | Description               |
| ---------------- | ------- | ------- | ------------------------- |
| `includeDeleted` | boolean | false   | Include soft-deleted user |

**Response Codes:**

| Code | Scenario                                             |
| ---- | ---------------------------------------------------- |
| 200  | User found                                           |
| 404  | User not found (or deleted without `includeDeleted`) |
| 410  | User is soft deleted (Gone)                          |

#### Delete User

```typescript
DELETE /api/admin/users/:id
```

**Query Parameters:**

| Parameter | Type    | Default | Description           |
| --------- | ------- | ------- | --------------------- |
| `force`   | boolean | false   | Hard delete when true |

**Behavior:**

- `force=false` (default): Soft delete (sets `deletedAt`)
- `force=true`: Hard delete (permanently removes record)

#### Restore User

```typescript
POST /api/admin/users/:id/restore
```

**Behavior:**

- Sets `deletedAt` to `null`
- Returns restored user data
- Emits `user.restored` event

### Product Endpoints

Products follow the same pattern with ownership-based access control.

```typescript
# Get user's products (including deleted)
GET /api/products?includeDeleted=true

# Get only deleted products
GET /api/products?onlyDeleted=true

# Soft delete product
DELETE /api/products/:id

# Hard delete product
DELETE /api/products/:id?force=true

# Restore product
POST /api/products/:id/restore
```

---

## Repository Pattern

### Base Repository with Paranoid Support

```typescript
// src/repositories/base.repository.ts
export interface ParanoidOptions {
  includeDeleted?: boolean; // Include both active and deleted records
  onlyDeleted?: boolean; // Only deleted records
  onlyActive?: boolean; // Only active records (default)
}

export abstract class ParanoidRepository<T> extends BaseRepository {
  /**
   * Find by ID with paranoid options
   */
  async findById(id: string, options: ParanoidOptions = {}): Promise<T | null> {
    const query = this.db.select().from(this.tableName).where(eq(this.tableName.id, id));

    // Apply paranoid filtering
    if (!options.includeDeleted && !options.onlyDeleted) {
      query.where(sql`${this.tableName.deletedAt} IS NULL`);
    } else if (options.onlyDeleted) {
      query.where(sql`${this.tableName.deletedAt} IS NOT NULL`);
    }

    const result = await query.limit(1);
    return result[0] || null;
  }

  /**
   * Soft delete record
   */
  async softDelete(id: string): Promise<boolean> {
    const result = await this.db
      .update(this.tableName)
      .set({ deletedAt: new Date(), updatedAt: new Date() })
      .where(eq(this.tableName.id, id))
      .returning();

    return result.length > 0;
  }

  /**
   * Restore soft-deleted record
   */
  async restore(id: string): Promise<boolean> {
    const result = await this.db.update(this.tableName).set({ deletedAt: null, updatedAt: new Date() }).where(eq(this.tableName.id, id)).returning();

    return result.length > 0;
  }

  /**
   * Hard delete record
   */
  async delete(id: string): Promise<boolean> {
    const result = await this.db.delete(this.tableName).where(eq(this.tableName.id, id)).returning();

    return result.length > 0;
  }
}
```

### Validation

```typescript
// src/core/validation/paranoid.validation.ts
export function validateParanoidOptions(options: ParanoidOptions): void {
  const activeCount = [options.includeDeleted, options.onlyDeleted, options.onlyActive].filter(Boolean).length;

  if (activeCount > 1) {
    throw new InvalidParanoidOptionsError('Only one of includeDeleted, onlyDeleted, or onlyActive can be true');
  }
}
```

---

## Error Handling

### Error Types

```typescript
// src/core/errors/paranoid.errors.ts
export class ParanoidError extends AppError {
  constructor(message: string, code: string, status: number = 400) {
    super(message, code, status);
    this.name = 'ParanoidError';
  }
}

export class ResourceDeletedError extends ParanoidError {
  constructor(resource: string, id: string) {
    super(
      `${resource} with ID ${id} has been deleted`,
      'RESOURCE_DELETED',
      410 // Gone
    );
    this.name = 'ResourceDeletedError';
  }
}

export class InvalidParanoidOptionsError extends ParanoidError {
  constructor(message: string) {
    super(message, 'INVALID_PARANOID_OPTIONS', 400);
    this.name = 'InvalidParanoidOptionsError';
  }
}
```

### Error Response Format

```typescript
interface ParanoidErrorResponse {
  success: false;
  error: {
    code: string;
    message: string;
    details?: {
      resource?: string;
      id?: string;
      paranoid?: ParanoidOptions;
    };
  };
  meta: {
    timestamp: string;
    requestId?: string;
  };
}
```

---

## Response Formats

### Standard Response

```typescript
interface ParanoidResponse<T> {
  success: true;
  message: string;
  data: T;
  meta: {
    paranoid: {
      deleted: boolean;
      deletable: boolean;
      restorable: boolean;
    };
    timestamp: string;
  };
}
```

### List Response

```typescript
interface ParanoidListResponse<T> {
  success: true;
  message: string;
  data: T[];
  meta: {
    paranoid: ParanoidOptions;
    pagination: {
      page: number;
      limit: number;
      total: number;
      totalPages: number;
      hasNext: boolean;
      hasPrev: boolean;
    };
    timestamp: string;
  };
}
```

---

## Best Practices

### 1. Default to Active Records

```typescript
// ✅ Good: Exclude deleted by default
async function getUsers(): Promise<User[]> {
  return userRepository.findAll(); // Only active records
}

// ❌ Bad: Include deleted by default
async function getUsersBad(): Promise<User[]> {
  return userRepository.findAll({ includeDeleted: true });
}
```

### 2. Validate Paranoid Options

```typescript
// ✅ Good: Validate before query
async function getUsers(options: ParanoidOptions): Promise<User[]> {
  validateParanoidOptions(options);
  return userRepository.findAll(options);
}

// ❌ Bad: No validation
async function getUsersBad(options: ParanoidOptions): Promise<User[]> {
  // Conflicting options could cause unexpected results
  return userRepository.findAll(options);
}
```

### 3. Use Appropriate HTTP Status Codes

```typescript
// ✅ Good: Correct status codes
async function getUser(id: string): Promise<User> {
  const user = await userRepository.findById(id);

  if (!user) {
    throw new AppError('User not found', 'USER_NOT_FOUND', 404);
  }

  if (user.deletedAt) {
    throw new ResourceDeletedError('User', id); // 410 Gone
  }

  return user;
}

// ❌ Bad: Always return 404
async function getUserBad(id: string): Promise<User> {
  const user = await userRepository.findById(id);

  if (!user || user.deletedAt) {
    throw new AppError('User not found', 'USER_NOT_FOUND', 404); // Loses information
  }

  return user;
}
```

### 4. Audit Restore Operations

```typescript
// ✅ Good: Log restore operations
async function restoreUser(id: string, restoredBy: string): Promise<User> {
  const user = await userRepository.restore(id);

  logger.info('User restored', {
    userId: id,
    restoredBy,
    timestamp: new Date().toISOString(),
  });

  // Emit event for analytics
  eventDispatcher.emit('user.restored', { userId: id, restoredBy });

  return user;
}
```

### 5. Consider Foreign Key Constraints

```sql
-- When using soft deletes, foreign keys need special handling

-- Option 1: Allow NULL in foreign key
ALTER TABLE products
  ALTER COLUMN owner_id DROP NOT NULL;

-- Option 2: Use ON DELETE SET NULL
ALTER TABLE products
  DROP CONSTRAINT products_owner_id_fkey,
  ADD CONSTRAINT products_owner_id_fkey
    FOREIGN KEY (owner_id) REFERENCES users(id)
    ON DELETE SET NULL;

-- Option 3: Application-level checks (recommended)
-- Verify user exists and is not deleted in application code
```

---

## Migration Guide

### For Existing APIs

#### Step 1: Add Paranoid Field

```typescript
// Migration file
import { sql } from 'drizzle-orm';
import { migrate } from 'drizzle-orm/node-postgres/migrator';

export async function up(db: Database) {
  await db.schema.alterTable('users').addColumn('deletedAt', 'timestamp with time zone', column => column.default(null).null());
}

export async function down(db: Database) {
  await db.schema.alterTable('users').dropColumn('deletedAt');
}
```

#### Step 2: Update Repository

```typescript
// Add paranoid methods
export class UserRepository extends ParanoidRepository<User> {
  async findAll(options: ParanoidOptions = {}): Promise<User[]> {
    return super.findAll(options);
  }

  async softDelete(id: string): Promise<boolean> {
    return super.softDelete(id);
  }

  async restore(id: string): Promise<boolean> {
    return super.restore(id);
  }
}
```

#### Step 3: Update Routes

```typescript
// Add query parameters
usersRoute.get('/', async ({ query }) => {
  const options: ParanoidOptions = {
    includeDeleted: query.includeDeleted === 'true',
    onlyDeleted: query.onlyDeleted === 'true',
  };

  return await userService.getUsers(options);
});
```

#### Step 4: Update Controllers

```typescript
// Add restore endpoint
usersRoute.post('/:id/restore', async ({ params }) => {
  return await userService.restoreUser(params.id);
});
```

### Database Considerations

#### Index Strategy

```sql
-- Add indexes for common paranoid queries
CREATE INDEX idx_users_deleted_at ON users(deleted_at);

-- Partial index for active users (smaller, faster)
CREATE INDEX idx_users_active ON users(id) WHERE deleted_at IS NULL;

-- Composite index for filtering
CREATE INDEX idx_users_status_deleted ON users(is_active, deleted_at);
```

#### Query Optimization

```typescript
// ✅ Good: Use partial index for active records
const activeUsers = await db
  .select()
  .from(users)
  .where(sql`${users.deletedAt} IS NULL`); // Uses partial index

// ✅ Good: Explicit index hint if needed
const deletedUsers = await db
  .select()
  .from(users)
  .where(sql`${users.deletedAt} IS NOT NULL`)
  .using('idx_users_deleted_at');
```

---

## Security Considerations

### Access Control

```typescript
// ✅ Good: Restrict restore operations
async function restoreUser(id: string, requestingUser: User): Promise<User> {
  // Only admins can restore
  if (requestingUser.role !== 'ADMIN') {
    throw new ForbiddenError('Only admins can restore users');
  }

  return await userRepository.restore(id);
}
```

### Audit Trail

```typescript
// ✅ Good: Track all paranoid operations
interface ParanoidAuditLog {
  operation: 'soft_delete' | 'hard_delete' | 'restore';
  entityType: string;
  entityId: string;
  performedBy: string;
  performedAt: Date;
  reason?: string;
}

async function logParanoidOperation(log: ParanoidAuditLog): Promise<void> {
  await auditLogRepository.create(log);
}
```

### Data Privacy

```typescript
// ✅ Good: Handle GDPR right to be forgotten
async function hardDeleteUser(id: string): Promise<void> {
  // Anonymize instead of hard delete (optional)
  await userRepository.update(id, {
    email: `deleted-${id}@anonymized.local`,
    firstName: 'Deleted',
    lastName: 'User',
    deletedAt: new Date(),
  });

  // Or hard delete after retention period
  await userRepository.delete(id);
}
```

---

## Performance Considerations

### Query Optimization

```typescript
// ✅ Good: Use partial indexes
CREATE INDEX idx_users_active ON users(id) WHERE deleted_at IS NULL;

// Query uses partial index
const activeUsers = await db
  .select()
  .from(users)
  .where(sql`${users.deletedAt} IS NULL`);
```

### Caching Strategy

```typescript
// ✅ Good: Cache active users only
const cacheKey = 'users:active';

async function getActiveUsers(): Promise<User[]> {
  let users = await cache.get(cacheKey);

  if (!users) {
    users = await userRepository.findAll({ onlyActive: true });
    await cache.set(cacheKey, users, 300); // 5 minutes
  }

  return users;
}
```

---

## Checklist

Before implementing paranoid functionality:

- [ ] Add `deletedAt` column to schema
- [ ] Create database indexes for `deletedAt`
- [ ] Update repository with paranoid methods
- [ ] Add paranoid validation
- [ ] Update error handling
- [ ] Add restore endpoints
- [ ] Implement audit logging
- [ ] Update API documentation
- [ ] Add paranoid query parameters
- [ ] Test soft delete and restore flows

---

**Last Updated:** 2026-03-26

**Version:** 1.0.0
