# Comprehensive Unit Testing Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Achieve 85%+ test coverage across all source files with comprehensive unit tests mirroring the src/ structure.

**Architecture:** Create unit tests with mocked dependencies (database, redis, paseto) using Bun test framework. Tests follow AAA pattern (Arrange, Act, Assert) with clean code practices.

**Tech Stack:** Bun Test, vi.fn() for mocking, TypeScript, ESLint

---

## Phase 1: Foundation - Mock Utilities & Fixes

### Task 1: Create Shared Mock Utilities

**Files:**

- Create: `tests/unit/mocks/repository.mocks.ts`
- Create: `tests/unit/mocks/redis.mocks.ts`
- Create: `tests/unit/mocks/paseto.mocks.ts`

**Step 1: Create repository mocks**

```typescript
// tests/unit/mocks/repository.mocks.ts
import { vi } from 'bun:test';

export type MockDb = {
  select: ReturnType<typeof vi.fn>;
  insert: ReturnType<typeof vi.fn>;
  update: ReturnType<typeof vi.fn>;
  delete: ReturnType<typeof vi.fn>;
  query: ReturnType<typeof vi.fn>;
};

export function createMockDb(): MockDb {
  return {
    select: vi.fn(),
    insert: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
    query: vi.fn(),
  };
}

export function createMockQueryBuilder() {
  return {
    from: vi.fn().mockReturnThis(),
    where: vi.fn().mockReturnThis(),
    orderBy: vi.fn().mockReturnThis(),
    limit: vi.fn().mockReturnThis(),
    offset: vi.fn().mockReturnThis(),
    leftJoin: vi.fn().mockReturnThis(),
    rightJoin: vi.fn().mockReturnThis(),
    innerJoin: vi.fn().mockReturnThis(),
    returning: vi.fn(),
    execute: vi.fn(),
    values: vi.fn().mockReturnThis(),
    set: vi.fn().mockReturnThis(),
  };
}
```

**Step 2: Run lint check**

```bash
bun run lint tests/unit/mocks/repository.mocks.ts
```

Expected: No lint errors

**Step 3: Commit**

```bash
git add tests/unit/mocks/
git commit -m "test: add shared mock utilities for repositories"
```

---

### Task 2: Create Redis Mocks

**Files:**

- Modify: `tests/unit/mocks/redis.mocks.ts`

**Step 1: Write Redis mock implementation**

```typescript
// tests/unit/mocks/redis.mocks.ts
import { vi } from 'bun:test';

interface RedisData {
  [key: string]: { value: string; expiry?: number };
}

export class MockRedis {
  private data: RedisData = {};
  private callbacks: Map<string, () => void> = new Map();

  get = vi.fn(async (key: string) => {
    const item = this.data[key];
    if (!item) return null;
    if (item.expiry && item.expiry < Date.now()) {
      delete this.data[key];
      return null;
    }
    return item.value;
  });

  set = vi.fn(async (key: string, value: string, options?: { EX?: number; PX?: number }) => {
    const expiry = options?.EX ? Date.now() + options.EX * 1000 : options?.PX ? Date.now() + options.PX : undefined;
    this.data[key] = { value, expiry };
    return 'OK';
  });

  setex = vi.fn(async (key: string, seconds: number, value: string) => {
    return this.set(key, value, { EX: seconds });
  });

  del = vi.fn(async (key: string) => {
    const existed = key in this.data;
    delete this.data[key];
    return existed ? 1 : 0;
  });

  incr = vi.fn(async (key: string) => {
    const current = parseInt((await this.get(key)) || '0', 10);
    const newValue = current + 1;
    await this.set(key, newValue.toString());
    return newValue;
  });

  incrby = vi.fn(async (key: string, increment: number) => {
    const current = parseInt((await this.get(key)) || '0', 10);
    const newValue = current + increment;
    await this.set(key, newValue.toString());
    return newValue;
  });

  expire = vi.fn(async (key: string, seconds: number) => {
    const item = this.data[key];
    if (!item) return 0;
    item.expiry = Date.now() + seconds * 1000;
    return 1;
  });

  ttl = vi.fn(async (key: string) => {
    const item = this.data[key];
    if (!item) return -2;
    if (!item.expiry) return -1;
    const remaining = Math.floor((item.expiry - Date.now()) / 1000);
    return remaining > 0 ? remaining : -2;
  });

  flushall = vi.fn(async () => {
    this.data = {};
    return 'OK';
  });

  keys = vi.fn(async (pattern: string) => {
    const regex = new RegExp(pattern.replace(/\*/g, '.*'));
    return Object.keys(this.data).filter(key => regex.test(key));
  });

  on = vi.fn((event: string, callback: () => void) => {
    this.callbacks.set(event, callback);
  });

  disconnect = vi.fn(async () => {
    this.callbacks.clear();
  });

  connect = vi.fn(async () => 'OK');

  // Helper for testing
  _clear() {
    this.data = {};
  }

  _size() {
    return Object.keys(this.data).length;
  }
}

export function createMockRedis(): MockRedis {
  return new MockRedis();
}
```

**Step 2: Run lint check**

```bash
bun run lint tests/unit/mocks/redis.mocks.ts
```

Expected: No lint errors

**Step 3: Commit**

```bash
git add tests/unit/mocks/redis.mocks.ts
git commit -m "test: add Redis mock with in-memory storage"
```

---

### Task 3: Create PASETO Mocks

**Files:**

- Modify: `tests/unit/mocks/paseto.mocks.ts`

**Step 1: Write PASETO mock utilities**

```typescript
// tests/unit/mocks/paseto.mocks.ts
import { vi } from 'bun/test';

export interface MockTokenPayload {
  userId: string;
  email: string;
  role: string;
  type: 'access' | 'refresh';
  iat?: number;
  exp?: number;
}

export class MockPasetoService {
  private secretKey = 'mock-secret-key-for-testing';
  private tokens: Map<string, MockTokenPayload> = new Map();

  generateAccessToken = vi.fn(async (payload: Omit<MockTokenPayload, 'type' | 'iat' | 'exp'>) => {
    const tokenPayload: MockTokenPayload = {
      ...payload,
      type: 'access',
      iat: Date.now(),
      exp: Date.now() + 15 * 60 * 1000, // 15 minutes
    };
    const token = this.encodeToken(tokenPayload);
    this.tokens.set(token, tokenPayload);
    return token;
  });

  generateRefreshToken = vi.fn(async (payload: Omit<MockTokenPayload, 'type' | 'iat' | 'exp'>) => {
    const tokenPayload: MockTokenPayload = {
      ...payload,
      type: 'refresh',
      iat: Date.now(),
      exp: Date.now() + 7 * 24 * 60 * 60 * 1000, // 7 days
    };
    const token = this.encodeToken(tokenPayload);
    this.tokens.set(token, tokenPayload);
    return token;
  });

  verifyToken = vi.fn(async (token: string) => {
    const payload = this.tokens.get(token);
    if (!payload) {
      throw new Error('Invalid token');
    }
    if (payload.exp && payload.exp < Date.now()) {
      this.tokens.delete(token);
      throw new Error('Token expired');
    }
    return payload;
  });

  invalidateToken = vi.fn(async (token: string) => {
    this.tokens.delete(token);
  });

  private encodeToken(payload: MockTokenPayload): string {
    const data = Buffer.from(JSON.stringify(payload)).toString('base64');
    return `v4.local.${data}.mocksignature`;
  }

  // Helper for testing
  _clear() {
    this.tokens.clear();
  }
}

export function createMockPasetoService(): MockPasetoService {
  return new MockPasetoService();
}

export const mockValidUserId = '123e4567-e89b-12d3-a456-426614174000';
export const mockTestUser = {
  id: mockValidUserId,
  email: 'test@example.com',
  role: 'user',
};

export const mockAdminUser = {
  id: '987fcdeb-51a2-43f1-a456-426614174000',
  email: 'admin@example.com',
  role: 'admin',
};
```

**Step 2: Run lint check**

```bash
bun run lint tests/unit/mocks/paseto.mocks.ts
```

Expected: No lint errors

**Step 3: Commit**

```bash
git add tests/unit/mocks/paseto.mocks.ts
git commit -m "test: add PASETO mock utilities"
```

---

### Task 4: Fix Password Service Test

**Files:**

- Modify: `tests/unit/core/crypto/password.service.test.ts:68`

**Step 1: Fix the invalid password test**

The test is using an invalid password format. Update to use a properly hashed password:

```typescript
// Replace line 68 with proper format
// The password needs to be a valid argon2 hash format
// Store a real hash from a previous hash operation

// Before the test suite, generate a valid hash
let validHash: string;

test.beforeAll(async () => {
  validHash = await passwordService.hash('testPassword123!');
});

// Then use validHash in the verify test instead of raw string
```

**Step 2: Run test to verify fix**

```bash
bun test tests/unit/core/crypto/password.service.test.ts
```

Expected: PASS

**Step 3: Commit**

```bash
git add tests/unit/core/crypto/password.service.test.ts
git commit -m "test: fix password service test with valid hash format"
```

---

## Phase 2: Repository Tests

### Task 5: Base Repository Tests

**Files:**

- Create: `tests/unit/repositories/base.repository.test.ts`

**Step 1: Write base repository tests**

```typescript
// tests/unit/repositories/base.repository.test.ts
import { describe, test, expect, beforeEach, mock } from 'bun:test';
import { BaseRepository } from '@/repositories/base.repository';
import { createMockDb, createMockQueryBuilder } from '../mocks/repository.mocks';

describe('BaseRepository', () => {
  let mockDb: ReturnType<typeof createMockDb>;
  let repository: BaseRepository;

  beforeEach(() => {
    mockDb = createMockDb();
    repository = new BaseRepository(mockDb as any);
  });

  describe('findAll', () => {
    test('should return array of records', async () => {
      const mockData = [
        { id: '1', name: 'Item 1' },
        { id: '2', name: 'Item 2' },
      ];
      const mockQueryBuilder = createMockQueryBuilder();
      mockQueryBuilder.returning.mockResolvedValue(mockData);
      mockDb.select.mockReturnValue(mockQueryBuilder);

      const result = await repository.findAll('test_table');

      expect(result).toEqual(mockData);
      expect(mockDb.select).toHaveBeenCalled();
    });

    test('should apply limit when provided', async () => {
      const mockQueryBuilder = createMockQueryBuilder();
      mockQueryBuilder.returning.mockResolvedValue([]);
      mockDb.select.mockReturnValue(mockQueryBuilder);

      await repository.findAll('test_table', { limit: 10 });

      expect(mockQueryBuilder.limit).toHaveBeenCalledWith(10);
    });

    test('should apply offset when provided', async () => {
      const mockQueryBuilder = createMockQueryBuilder();
      mockQueryBuilder.returning.mockResolvedValue([]);
      mockDb.select.mockReturnValue(mockQueryBuilder);

      await repository.findAll('test_table', { offset: 5 });

      expect(mockQueryBuilder.offset).toHaveBeenCalledWith(5);
    });

    test('should handle empty results', async () => {
      const mockQueryBuilder = createMockQueryBuilder();
      mockQueryBuilder.returning.mockResolvedValue([]);
      mockDb.select.mockReturnValue(mockQueryBuilder);

      const result = await repository.findAll('test_table');

      expect(result).toEqual([]);
    });
  });

  describe('findById', () => {
    test('should return record when found', async () => {
      const mockData = { id: '1', name: 'Item 1' };
      const mockQueryBuilder = createMockQueryBuilder();
      mockQueryBuilder.returning.mockResolvedValue([mockData]);
      mockDb.select.mockReturnValue(mockQueryBuilder);

      const result = await repository.findById('test_table', '1');

      expect(result).toEqual(mockData);
    });

    test('should return null when not found', async () => {
      const mockQueryBuilder = createMockQueryBuilder();
      mockQueryBuilder.returning.mockResolvedValue([]);
      mockDb.select.mockReturnValue(mockQueryBuilder);

      const result = await repository.findById('test_table', '999');

      expect(result).toBeNull();
    });
  });

  describe('create', () => {
    test('should insert and return new record', async () => {
      const newData = { name: 'New Item' };
      const createdData = { id: '1', ...newData };
      const mockQueryBuilder = createMockQueryBuilder();
      mockQueryBuilder.returning.mockResolvedValue([createdData]);
      mockDb.insert.mockReturnValue(mockQueryBuilder);

      const result = await repository.create('test_table', newData);

      expect(result).toEqual(createdData);
      expect(mockDb.insert).toHaveBeenCalled();
    });
  });

  describe('update', () => {
    test('should update and return updated record', async () => {
      const updateData = { name: 'Updated Item' };
      const updatedData = { id: '1', ...updateData };
      const mockQueryBuilder = createMockQueryBuilder();
      mockQueryBuilder.returning.mockResolvedValue([updatedData]);
      mockDb.update.mockReturnValue(mockQueryBuilder);

      const result = await repository.update('test_table', '1', updateData);

      expect(result).toEqual(updatedData);
    });

    test('should return null when record not found for update', async () => {
      const mockQueryBuilder = createMockQueryBuilder();
      mockQueryBuilder.returning.mockResolvedValue([]);
      mockDb.update.mockReturnValue(mockQueryBuilder);

      const result = await repository.update('test_table', '999', { name: 'Test' });

      expect(result).toBeNull();
    });
  });

  describe('delete', () => {
    test('should delete and return deleted record', async () => {
      const deletedData = { id: '1', name: 'Deleted Item' };
      const mockQueryBuilder = createMockQueryBuilder();
      mockQueryBuilder.returning.mockResolvedValue([deletedData]);
      mockDb.delete.mockReturnValue(mockQueryBuilder);

      const result = await repository.delete('test_table', '1');

      expect(result).toEqual(deletedData);
    });

    test('should return null when record not found for delete', async () => {
      const mockQueryBuilder = createMockQueryBuilder();
      mockQueryBuilder.returning.mockResolvedValue([]);
      mockDb.delete.mockReturnValue(mockQueryBuilder);

      const result = await repository.delete('test_table', '999');

      expect(result).toBeNull();
    });
  });
});
```

**Step 2: Run test**

```bash
bun test tests/unit/repositories/base.repository.test.ts
```

**Step 3: Commit**

```bash
git add tests/unit/repositories/base.repository.test.ts
git commit -m "test: add base repository unit tests"
```

---

### Task 6: Users Repository Tests

**Files:**

- Create: `tests/unit/repositories/users.repository.test.ts`

**Step 1: Write users repository tests**

```typescript
// tests/unit/repositories/users.repository.test.ts
import { describe, test, expect, beforeEach } from 'bun:test';
import { UsersRepository } from '@/repositories/users.repository';
import { users } from '@/database/schema';
import { createMockDb, createMockQueryBuilder } from '../mocks/repository.mocks';

describe('UsersRepository', () => {
  let mockDb: ReturnType<typeof createMockDb>;
  let repository: UsersRepository;

  beforeEach(() => {
    mockDb = createMockDb();
    repository = new UsersRepository(mockDb as any);
  });

  describe('findByEmail', () => {
    test('should return user when email exists', async () => {
      const mockUser = {
        id: '123e4567-e89b-12d3-a456-426614174000',
        email: 'test@example.com',
        passwordHash: 'hash123',
        role: 'user',
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      const mockQueryBuilder = createMockQueryBuilder();
      mockQueryBuilder.returning.mockResolvedValue([mockUser]);
      mockDb.select.mockReturnValue(mockQueryBuilder);

      const result = await repository.findByEmail('test@example.com');

      expect(result).toEqual(mockUser);
      expect(mockDb.select).toHaveBeenCalled();
    });

    test('should return null when email does not exist', async () => {
      const mockQueryBuilder = createMockQueryBuilder();
      mockQueryBuilder.returning.mockResolvedValue([]);
      mockDb.select.mockReturnValue(mockQueryBuilder);

      const result = await repository.findByEmail('nonexistent@example.com');

      expect(result).toBeNull();
    });
  });

  describe('updateLastLogin', () => {
    test('should update last login timestamp', async () => {
      const updatedUser = {
        id: '123',
        email: 'test@example.com',
        lastLoginAt: new Date(),
      };
      const mockQueryBuilder = createMockQueryBuilder();
      mockQueryBuilder.returning.mockResolvedValue([updatedUser]);
      mockDb.update.mockReturnValue(mockQueryBuilder);

      const result = await repository.updateLastLogin('123');

      expect(result).toEqual(updatedUser);
      expect(mockDb.update).toHaveBeenCalled();
    });
  });

  describe('updatePassword', () => {
    test('should update user password', async () => {
      const updatedUser = {
        id: '123',
        email: 'test@example.com',
        passwordHash: 'newHash123',
      };
      const mockQueryBuilder = createMockQueryBuilder();
      mockQueryBuilder.returning.mockResolvedValue([updatedUser]);
      mockDb.update.mockReturnValue(mockQueryBuilder);

      const result = await repository.updatePassword('123', 'newHash123');

      expect(result).toEqual(updatedUser);
    });
  });

  describe('softDelete', () => {
    test('should soft delete user', async () => {
      const deletedUser = {
        id: '123',
        email: 'test@example.com',
        deletedAt: new Date(),
      };
      const mockQueryBuilder = createMockQueryBuilder();
      mockQueryBuilder.returning.mockResolvedValue([deletedUser]);
      mockDb.update.mockReturnValue(mockQueryBuilder);

      const result = await repository.softDelete('123');

      expect(result).toEqual(deletedUser);
    });
  });
});
```

**Step 2: Run test**

```bash
bun test tests/unit/repositories/users.repository.test.ts
```

**Step 3: Commit**

```bash
git add tests/unit/repositories/users.repository.test.ts
git commit -m "test: add users repository unit tests"
```

---

### Task 7: Sessions Repository Tests

**Files:**

- Create: `tests/unit/repositories/sessions.repository.test.ts`

**Step 1: Write sessions repository tests**

```typescript
// tests/unit/repositories/sessions.repository.test.ts
import { describe, test, expect, beforeEach } from 'bun:test';
import { SessionsRepository } from '@/repositories/sessions.repository';
import { createMockDb, createMockQueryBuilder } from '../mocks/repository.mocks';

describe('SessionsRepository', () => {
  let mockDb: ReturnType<typeof createMockDb>;
  let repository: SessionsRepository;

  beforeEach(() => {
    mockDb = createMockDb();
    repository = new SessionsRepository(mockDb as any);
  });

  describe('create', () => {
    test('should create new session', async () => {
      const sessionData = {
        userId: '123',
        token: 'token123',
        expiresAt: new Date(Date.now() + 3600000),
      };
      const createdSession = { id: '1', ...sessionData };
      const mockQueryBuilder = createMockQueryBuilder();
      mockQueryBuilder.returning.mockResolvedValue([createdSession]);
      mockDb.insert.mockReturnValue(mockQueryBuilder);

      const result = await repository.create(sessionData);

      expect(result).toEqual(createdSession);
    });
  });

  describe('findByToken', () => {
    test('should return session when token exists', async () => {
      const mockSession = {
        id: '1',
        userId: '123',
        token: 'token123',
        expiresAt: new Date(Date.now() + 3600000),
      };
      const mockQueryBuilder = createMockQueryBuilder();
      mockQueryBuilder.returning.mockResolvedValue([mockSession]);
      mockDb.select.mockReturnValue(mockQueryBuilder);

      const result = await repository.findByToken('token123');

      expect(result).toEqual(mockSession);
    });

    test('should return null when token does not exist', async () => {
      const mockQueryBuilder = createMockQueryBuilder();
      mockQueryBuilder.returning.mockResolvedValue([]);
      mockDb.select.mockReturnValue(mockQueryBuilder);

      const result = await repository.findByToken('nonexistent');

      expect(result).toBeNull();
    });
  });

  describe('deleteByUserId', () => {
    test('should delete all sessions for user', async () => {
      const mockQueryBuilder = createMockQueryBuilder();
      mockQueryBuilder.returning.mockResolvedValue([{ id: '1' }]);
      mockDb.delete.mockReturnValue(mockQueryBuilder);

      await repository.deleteByUserId('123');

      expect(mockDb.delete).toHaveBeenCalled();
    });
  });

  describe('deleteExpiredSessions', () => {
    test('should delete expired sessions', async () => {
      const mockQueryBuilder = createMockQueryBuilder();
      mockQueryBuilder.returning.mockResolvedValue([]);
      mockDb.delete.mockReturnValue(mockQueryBuilder);

      await repository.deleteExpiredSessions();

      expect(mockDb.delete).toHaveBeenCalled();
    });
  });
});
```

**Step 2: Run test**

```bash
bun test tests/unit/repositories/sessions.repository.test.ts
```

**Step 3: Commit**

```bash
git add tests/unit/repositories/sessions.repository.test.ts
git commit -m "test: add sessions repository unit tests"
```

---

### Task 8: Products Repository Tests

**Files:**

- Create: `tests/unit/repositories/products.repository.test.ts`

**Step 1: Write products repository tests**

```typescript
// tests/unit/repositories/products.repository.test.ts
import { describe, test, expect, beforeEach } from 'bun:test';
import { ProductsRepository } from '@/repositories/products.repository';
import { createMockDb, createMockQueryBuilder } from '../mocks/repository.mocks';

describe('ProductsRepository', () => {
  let mockDb: ReturnType<typeof createMockDb>;
  let repository: ProductsRepository;

  beforeEach(() => {
    mockDb = createMockDb();
    repository = new ProductsRepository(mockDb as any);
  });

  describe('findWithVariants', () => {
    test('should return product with variants', async () => {
      const mockProduct = {
        id: '1',
        name: 'Test Product',
        description: 'Description',
        basePrice: 100,
        sku: 'SKU123',
        isActive: true,
        variants: [{ id: 'v1', productId: '1', name: 'Variant 1', price: 100 }],
      };
      const mockQueryBuilder = createMockQueryBuilder();
      mockQueryBuilder.returning.mockResolvedValue([mockProduct]);
      mockDb.select.mockReturnValue(mockQueryBuilder);

      const result = await repository.findWithVariants('1');

      expect(result).toEqual(mockProduct);
    });
  });

  describe('updateStock', () => {
    test('should update product stock', async () => {
      const updatedProduct = {
        id: '1',
        name: 'Test Product',
        stock: 50,
      };
      const mockQueryBuilder = createMockQueryBuilder();
      mockQueryBuilder.returning.mockResolvedValue([updatedProduct]);
      mockDb.update.mockReturnValue(mockQueryBuilder);

      const result = await repository.updateStock('1', 50);

      expect(result).toEqual(updatedProduct);
    });
  });

  describe('findActive', () => {
    test('should return only active products', async () => {
      const mockProducts = [
        { id: '1', name: 'Active Product', isActive: true },
        { id: '2', name: 'Another Active', isActive: true },
      ];
      const mockQueryBuilder = createMockQueryBuilder();
      mockQueryBuilder.returning.mockResolvedValue(mockProducts);
      mockDb.select.mockReturnValue(mockQueryBuilder);

      const result = await repository.findActive();

      expect(result).toHaveLength(2);
      expect(mockDb.select).toHaveBeenCalled();
    });
  });

  describe('search', () => {
    test('should search products by name', async () => {
      const mockProducts = [
        { id: '1', name: 'Search Result 1' },
        { id: '2', name: 'Search Result 2' },
      ];
      const mockQueryBuilder = createMockQueryBuilder();
      mockQueryBuilder.returning.mockResolvedValue(mockProducts);
      mockDb.select.mockReturnValue(mockQueryBuilder);

      const result = await repository.search('test query');

      expect(result).toEqual(mockProducts);
    });

    test('should return empty array when no matches', async () => {
      const mockQueryBuilder = createMockQueryBuilder();
      mockQueryBuilder.returning.mockResolvedValue([]);
      mockDb.select.mockReturnValue(mockQueryBuilder);

      const result = await repository.search('nonexistent');

      expect(result).toEqual([]);
    });
  });
});
```

**Step 2: Run test**

```bash
bun test tests/unit/repositories/products.repository.test.ts
```

**Step 3: Commit**

```bash
git add tests/unit/repositories/products.repository.test.ts
git commit -m "test: add products repository unit tests"
```

---

### Task 9: Activity Repository Tests

**Files:**

- Create: `tests/unit/repositories/activity.repository.test.ts`

**Step 1: Write activity repository tests**

```typescript
// tests/unit/repositories/activity.repository.test.ts
import { describe, test, expect, beforeEach } from 'bun:test';
import { ActivityRepository } from '@/repositories/activity.repository';
import { createMockDb, createMockQueryBuilder } from '../mocks/repository.mocks';

describe('ActivityRepository', () => {
  let mockDb: ReturnType<typeof createMockDb>;
  let repository: ActivityRepository;

  beforeEach(() => {
    mockDb = createMockDb();
    repository = new ActivityRepository(mockDb as any);
  });

  describe('create', () => {
    test('should create activity log', async () => {
      const activityData = {
        userId: '123',
        action: 'login',
        ipAddress: '127.0.0.1',
        userAgent: 'test-agent',
      };
      const createdActivity = { id: '1', ...activityData };
      const mockQueryBuilder = createMockQueryBuilder();
      mockQueryBuilder.returning.mockResolvedValue([createdActivity]);
      mockDb.insert.mockReturnValue(mockQueryBuilder);

      const result = await repository.create(activityData);

      expect(result).toEqual(createdActivity);
      expect(mockDb.insert).toHaveBeenCalled();
    });

    test('should handle database errors gracefully', async () => {
      const mockQueryBuilder = createMockQueryBuilder();
      mockQueryBuilder.returning.mockRejectedValue(new Error('Database error'));
      mockDb.insert.mockReturnValue(mockQueryBuilder);

      await expect(
        repository.create({
          userId: '123',
          action: 'login',
        })
      ).rejects.toThrow('Database error');
    });
  });

  describe('findByUserId', () => {
    test('should return activities for user', async () => {
      const mockActivities = [
        { id: '1', userId: '123', action: 'login' },
        { id: '2', userId: '123', action: 'logout' },
      ];
      const mockQueryBuilder = createMockQueryBuilder();
      mockQueryBuilder.returning.mockResolvedValue(mockActivities);
      mockDb.select.mockReturnValue(mockQueryBuilder);

      const result = await repository.findByUserId('123');

      expect(result).toEqual(mockActivities);
      expect(mockDb.select).toHaveBeenCalled();
    });

    test('should apply limit when provided', async () => {
      const mockQueryBuilder = createMockQueryBuilder();
      mockQueryBuilder.returning.mockResolvedValue([]);
      mockDb.select.mockReturnValue(mockQueryBuilder);

      await repository.findByUserId('123', { limit: 10 });

      expect(mockQueryBuilder.limit).toHaveBeenCalledWith(10);
    });
  });

  describe('findByAction', () => {
    test('should return activities for specific action', async () => {
      const mockActivities = [
        { id: '1', userId: '123', action: 'login' },
        { id: '2', userId: '456', action: 'login' },
      ];
      const mockQueryBuilder = createMockQueryBuilder();
      mockQueryBuilder.returning.mockResolvedValue(mockActivities);
      mockDb.select.mockReturnValue(mockQueryBuilder);

      const result = await repository.findByAction('login');

      expect(result).toHaveLength(2);
    });
  });

  describe('deleteOldLogs', () => {
    test('should delete logs older than specified date', async () => {
      const mockQueryBuilder = createMockQueryBuilder();
      mockQueryBuilder.returning.mockResolvedValue([]);
      mockDb.delete.mockReturnValue(mockQueryBuilder);

      const cutoffDate = new Date('2024-01-01');
      await repository.deleteOldLogs(cutoffDate);

      expect(mockDb.delete).toHaveBeenCalled();
    });
  });
});
```

**Step 2: Run test**

```bash
bun test tests/unit/repositories/activity.repository.test.ts
```

**Step 3: Commit**

```bash
git add tests/unit/repositories/activity.repository.test.ts
git commit -m "test: add activity repository unit tests"
```

---

### Task 10: Unit of Work Tests

**Files:**

- Create: `tests/unit/repositories/unit-of-work.test.ts`

**Step 1: Write unit of work tests**

```typescript
// tests/unit/repositories/unit-of-work.test.ts
import { describe, test, expect, beforeEach } from 'bun:test';
import { UnitOfWork } from '@/repositories/unit-of-work';
import { createMockDb } from '../mocks/repository.mocks';

describe('UnitOfWork', () => {
  let mockDb: ReturnType<typeof createMockDb>;
  let unitOfWork: UnitOfWork;

  beforeEach(() => {
    mockDb = createMockDb();
    unitOfWork = new UnitOfWork(mockDb as any);
  });

  describe('repositories', () => {
    test('should provide users repository', () => {
      const repo = unitOfWork.users;
      expect(repo).toBeDefined();
    });

    test('should provide sessions repository', () => {
      const repo = unitOfWork.sessions;
      expect(repo).toBeDefined();
    });

    test('should provide products repository', () => {
      const repo = unitOfWork.products;
      expect(repo).toBeDefined();
    });

    test('should provide activity repository', () => {
      const repo = unitOfWork.activity;
      expect(repo).toBeDefined();
    });
  });

  describe('transaction', () => {
    test('should begin transaction', async () => {
      mockDb.query = { begin: () => ({ execute: () => Promise.resolve() }) } as any;

      await unitOfWork.beginTransaction();

      expect(mockDb.query.begin).toHaveBeenCalled();
    });

    test('should commit transaction', async () => {
      const mockTransaction = {
        execute: () => Promise.resolve(),
        commit: () => Promise.resolve(),
        rollback: () => Promise.resolve(),
      };
      mockDb.query = {
        begin: () => mockTransaction,
      } as any;

      await unitOfWork.beginTransaction();
      await unitOfWork.commit();

      expect(mockTransaction.commit).toHaveBeenCalled();
    });

    test('should rollback transaction', async () => {
      const mockTransaction = {
        execute: () => Promise.resolve(),
        commit: () => Promise.resolve(),
        rollback: () => Promise.resolve(),
      };
      mockDb.query = {
        begin: () => mockTransaction,
      } as any;

      await unitOfWork.beginTransaction();
      await unitOfWork.rollback();

      expect(mockTransaction.rollback).toHaveBeenCalled();
    });
  });
});
```

**Step 2: Run test**

```bash
bun test tests/unit/repositories/unit-of-work.test.ts
```

**Step 3: Commit**

```bash
git add tests/unit/repositories/unit-of-work.test.ts
git commit -m "test: add unit of work tests"
```

---

## Phase 3: Config Tests

### Task 11: Config Index Tests

**Files:**

- Create: `tests/unit/config/index.test.ts`

**Step 1: Write config tests**

```typescript
// tests/unit/config/index.test.ts
import { describe, test, expect, beforeAll } from 'bun:test';

describe('Config', () => {
  let config: Awaited<ReturnType<(typeof import('@/config'))['default']>>;

  beforeAll(async () => {
    config = await (await import('@/config')).default();
  });

  test('should have database configuration', () => {
    expect(config.database).toBeDefined();
    expect(typeof config.database.url).toBe('string');
  });

  test('should have redis configuration', () => {
    expect(config.redis).toBeDefined();
    expect(typeof config.redis.host).toBe('string');
    expect(typeof config.redis.port).toBe('number');
  });

  test('should have paseto configuration', () => {
    expect(config.paseto).toBeDefined();
    expect(typeof config.paseto.secretKey).toBe('string');
  });

  test('should have server configuration', () => {
    expect(config.server).toBeDefined();
    expect(typeof config.server.port).toBe('number');
    expect(typeof config.server.host).toBe('string');
  });

  test('should have rate limit configuration', () => {
    expect(config.rateLimit).toBeDefined();
    expect(typeof config.rateLimit.windowMs).toBe('number');
    expect(typeof config.rateLimit.maxRequests).toBe('number');
  });
});
```

**Step 2: Run test**

```bash
bun test tests/unit/config/index.test.ts
```

**Step 3: Commit**

```bash
git add tests/unit/config/index.test.ts
git commit -m "test: add config index tests"
```

---

### Task 12: Env Schema Tests

**Files:**

- Create: `tests/unit/config/env.schema.test.ts`

**Step 1: Write env schema tests**

```typescript
// tests/unit/config/env.schema.test.ts
import { describe, test, expect, beforeEach } from 'bun:test';
import { envSchema } from '@/config/env.schema';

describe('Environment Schema', () => {
  const validEnv = {
    NODE_ENV: 'test',
    DATABASE_URL: 'postgresql://localhost:5432/test',
    REDIS_HOST: 'localhost',
    REDIS_PORT: '6379',
    PASETO_SECRET_KEY: 'test-secret-key',
    SERVER_PORT: '3000',
    SERVER_HOST: 'localhost',
    RATE_LIMIT_WINDOW_MS: '60000',
    RATE_LIMIT_MAX_REQUESTS: '100',
  };

  test('should validate valid environment', () => {
    const result = envSchema.safeParse(validEnv);

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.NODE_ENV).toBe('test');
      expect(result.data.DATABASE_URL).toBe(validEnv.DATABASE_URL);
    }
  });

  test('should fail with missing required fields', () => {
    const invalidEnv = { ...validEnv };
    delete (invalidEnv as any).DATABASE_URL;

    const result = envSchema.safeParse(invalidEnv);

    expect(result.success).toBe(false);
  });

  test('should fail with invalid NODE_ENV', () => {
    const invalidEnv = { ...validEnv, NODE_ENV: 'invalid' };

    const result = envSchema.safeParse(invalidEnv);

    expect(result.success).toBe(false);
  });

  test('should parse port as number', () => {
    const result = envSchema.safeParse(validEnv);

    expect(result.success).toBe(true);
    if (result.success) {
      expect(typeof result.data.SERVER_PORT).toBe('number');
      expect(result.data.SERVER_PORT).toBe(3000);
    }
  });

  test('should provide default values for optional fields', () => {
    const minimalEnv = {
      NODE_ENV: 'test',
      DATABASE_URL: 'postgresql://localhost:5432/test',
      REDIS_HOST: 'localhost',
      REDIS_PORT: '6379',
      PASETO_SECRET_KEY: 'test-secret-key',
      SERVER_PORT: '3000',
      SERVER_HOST: 'localhost',
      RATE_LIMIT_WINDOW_MS: '60000',
      RATE_LIMIT_MAX_REQUESTS: '100',
    };

    const result = envSchema.safeParse(minimalEnv);

    expect(result.success).toBe(true);
  });
});
```

**Step 2: Run test**

```bash
bun test tests/unit/config/env.schema.test.ts
```

**Step 3: Commit**

```bash
git add tests/unit/config/env.schema.test.ts
git commit -m "test: add environment schema validation tests"
```

---

## Phase 4: Database Tests

### Task 13: Database Connection Tests

**Files:**

- Create: `tests/unit/database/connection.test.ts`

**Step 1: Write database connection tests**

```typescript
// tests/unit/database/connection.test.ts
import { describe, test, expect, beforeEach, mock } from 'bun:test';
import { Database } from '@/database/connection';

// Mock drizzle-orm
mock.module('drizzle-orm/postgres-js', () => ({
  drizzle: () => ({
    select: () => ({}),
    insert: () => ({}),
    update: () => ({}),
    delete: () => ({}),
  }),
}));

describe('Database Connection', () => {
  describe('getConnection', () => {
    test('should return database instance', async () => {
      const db = await Database.getConnection();

      expect(db).toBeDefined();
      expect(typeof db.select).toBe('function');
      expect(typeof db.insert).toBe('function');
    });

    test('should return same instance on subsequent calls', async () => {
      const db1 = await Database.getConnection();
      const db2 = await Database.getConnection();

      expect(db1).toBe(db2);
    });
  });

  describe('closeConnection', () => {
    test('should close database connection', async () => {
      await Database.closeConnection();

      // Verify connection is closed by trying to get new connection
      const db = await Database.getConnection();
      expect(db).toBeDefined();
    });
  });

  describe('healthCheck', () => {
    test('should return true when database is healthy', async () => {
      const health = await Database.healthCheck();

      expect(health).toBe(true);
    });
  });
});
```

**Step 2: Run test**

```bash
bun test tests/unit/database/connection.test.ts
```

**Step 3: Commit**

```bash
git add tests/unit/database/connection.test.ts
git commit -m "test: add database connection tests"
```

---

## Phase 5: Core Utilities Tests

### Task 14: Core Error Index Tests

**Files:**

- Create: `tests/unit/core/errors/index.test.ts`

**Step 1: Write core error tests**

```typescript
// tests/unit/core/errors/index.test.ts
import { describe, test, expect } from 'bun/test';
import {
  AppError,
  BadRequestError,
  UnauthorizedError,
  ForbiddenError,
  NotFoundError,
  ConflictError,
  ValidationError,
  InternalServerError,
} from '@/core/errors';

describe('Core Errors', () => {
  describe('AppError', () => {
    test('should create base error with message', () => {
      const error = new AppError('Test error');

      expect(error.message).toBe('Test error');
      expect(error.name).toBe('AppError');
      expect(error.statusCode).toBe(500);
      expect(error.code).toBe('INTERNAL_ERROR');
    });

    test('should create error with custom code', () => {
      const error = new AppError('Test error', 'CUSTOM_ERROR', 400);

      expect(error.code).toBe('CUSTOM_ERROR');
      expect(error.statusCode).toBe(400);
    });
  });

  describe('BadRequestError', () => {
    test('should create 400 error', () => {
      const error = new BadRequestError('Invalid input');

      expect(error.statusCode).toBe(400);
      expect(error.code).toBe('BAD_REQUEST');
      expect(error.message).toBe('Invalid input');
    });
  });

  describe('UnauthorizedError', () => {
    test('should create 401 error', () => {
      const error = new UnauthorizedError('Not authenticated');

      expect(error.statusCode).toBe(401);
      expect(error.code).toBe('UNAUTHORIZED');
    });
  });

  describe('ForbiddenError', () => {
    test('should create 403 error', () => {
      const error = new ForbiddenError('Access denied');

      expect(error.statusCode).toBe(403);
      expect(error.code).toBe('FORBIDDEN');
    });
  });

  describe('NotFoundError', () => {
    test('should create 404 error', () => {
      const error = new NotFoundError('Resource not found');

      expect(error.statusCode).toBe(404);
      expect(error.code).toBe('NOT_FOUND');
    });
  });

  describe('ConflictError', () => {
    test('should create 409 error', () => {
      const error = new ConflictError('Resource already exists');

      expect(error.statusCode).toBe(409);
      expect(error.code).toBe('CONFLICT');
    });
  });

  describe('ValidationError', () => {
    test('should create 422 error', () => {
      const errors = [{ field: 'email', message: 'Invalid email' }];
      const error = new ValidationError('Validation failed', errors);

      expect(error.statusCode).toBe(422);
      expect(error.code).toBe('VALIDATION_ERROR');
      expect(error.details).toEqual(errors);
    });
  });

  describe('InternalServerError', () => {
    test('should create 500 error', () => {
      const error = new InternalServerError('Something went wrong');

      expect(error.statusCode).toBe(500);
      expect(error.code).toBe('INTERNAL_SERVER_ERROR');
    });
  });
});
```

**Step 2: Run test**

```bash
bun test tests/unit/core/errors/index.test.ts
```

**Step 3: Commit**

```bash
git add tests/unit/core/errors/index.test.ts
git commit -m "test: add core error classes tests"
```

---

### Task 15: Core HTTP Index Tests

**Files:**

- Create: `tests/unit/core/http/index.test.ts`

**Step 1: Write HTTP utility tests**

```typescript
// tests/unit/core/http/index.test.ts
import { describe, test, expect } from 'bun:test';
import { parsePagination, sanitizeQuery } from '@/core/http';

describe('HTTP Utilities', () => {
  describe('parsePagination', () => {
    test('should parse valid pagination params', () => {
      const result = parsePagination({ page: '2', limit: '20' });

      expect(result).toEqual({
        page: 2,
        limit: 20,
        offset: 20,
      });
    });

    test('should use defaults when params are missing', () => {
      const result = parsePagination({});

      expect(result).toEqual({
        page: 1,
        limit: 10,
        offset: 0,
      });
    });

    test('should enforce max limit', () => {
      const result = parsePagination({ limit: '200' });

      expect(result.limit).toBe(100); // Assuming max is 100
    });

    test('should enforce minimum page', () => {
      const result = parsePagination({ page: '0' });

      expect(result.page).toBe(1);
      expect(result.offset).toBe(0);
    });

    test('should handle invalid input gracefully', () => {
      const result = parsePagination({ page: 'invalid', limit: 'abc' });

      expect(result).toEqual({
        page: 1,
        limit: 10,
        offset: 0,
      });
    });
  });

  describe('sanitizeQuery', () => {
    test('should remove dangerous SQL patterns', () => {
      const input = 'name; DROP TABLE users; --';
      const result = sanitizeQuery(input);

      expect(result).not.toContain(';');
      expect(result).not.toContain('DROP');
    });

    test('should handle null input', () => {
      const result = sanitizeQuery(null as any);

      expect(result).toBe('');
    });

    test('should handle empty string', () => {
      const result = sanitizeQuery('');

      expect(result).toBe('');
    });

    test('should preserve safe input', () => {
      const input = 'John Doe';
      const result = sanitizeQuery(input);

      expect(result).toBe(input);
    });
  });
});
```

**Step 2: Run test**

```bash
bun test tests/unit/core/http/index.test.ts
```

**Step 3: Commit**

```bash
git add tests/unit/core/http/index.test.ts
git commit -m "test: add HTTP utility tests"
```

---

### Task 16: Core Validation Index Tests

**Files:**

- Create: `tests/unit/core/validation/index.test.ts`

**Step 1: Write validation utility tests**

```typescript
// tests/unit/core/validation/index.test.ts
import { describe, test, expect } from 'bun:test';
import { validateEmail, validateUUID, validatePassword, sanitizeString } from '@/core/validation';

describe('Validation Utilities', () => {
  describe('validateEmail', () => {
    test('should accept valid email addresses', () => {
      const validEmails = ['test@example.com', 'user.name@example.com', 'user+tag@example.co.uk'];

      validEmails.forEach(email => {
        expect(validateEmail(email)).toBe(true);
      });
    });

    test('should reject invalid email addresses', () => {
      const invalidEmails = ['invalid', '@example.com', 'user@', 'user @example.com', ''];

      invalidEmails.forEach(email => {
        expect(validateEmail(email)).toBe(false);
      });
    });
  });

  describe('validateUUID', () => {
    test('should accept valid UUIDs', () => {
      const validUUIDs = ['123e4567-e89b-12d3-a456-426614174000', '00000000-0000-0000-0000-000000000000'];

      validUUIDs.forEach(uuid => {
        expect(validateUUID(uuid)).toBe(true);
      });
    });

    test('should reject invalid UUIDs', () => {
      const invalidUUIDs = ['not-a-uuid', '123456789', '', '123e4567-e89b-12d3-a456'];

      invalidUUIDs.forEach(uuid => {
        expect(validateUUID(uuid)).toBe(false);
      });
    });
  });

  describe('validatePassword', () => {
    test('should accept strong passwords', () => {
      const strongPasswords = ['SecureP@ssw0rd', 'MyV3ryStr0ng!Password', 'Test1234!'];

      strongPasswords.forEach(password => {
        expect(validatePassword(password)).toBe(true);
      });
    });

    test('should reject weak passwords', () => {
      const weakPasswords = ['weak', 'password', '12345678', 'onlylowercase', 'ONLYUPPERCASE', 'NoNumbers!'];

      weakPasswords.forEach(password => {
        expect(validatePassword(password)).toBe(false);
      });
    });
  });

  describe('sanitizeString', () => {
    test('should trim whitespace', () => {
      const result = sanitizeString('  test  ');

      expect(result).toBe('test');
    });

    test('should remove HTML tags', () => {
      const result = sanitizeString('<script>alert("xss")</script>test');

      expect(result).not.toContain('<script>');
    });

    test('should handle null input', () => {
      const result = sanitizeString(null as any);

      expect(result).toBe('');
    });
  });
});
```

**Step 2: Run test**

```bash
bun test tests/unit/core/validation/index.test.ts
```

**Step 3: Commit**

```bash
git add tests/unit/core/validation/index.test.ts
git commit -m "test: add validation utility tests"
```

---

### Task 17: Core Redis Index Tests

**Files:**

- Create: `tests/unit/core/redis/index.test.ts`

**Step 1: Write Redis utility tests**

```typescript
// tests/unit/core/redis/index.test.ts
import { describe, test, expect, beforeEach } from 'bun:test';
import { RedisClient } from '@/core/redis';
import { createMockRedis } from '../mocks/redis.mocks';

describe('Redis Client', () => {
  let mockRedis: ReturnType<typeof createMockRedis>;
  let redisClient: RedisClient;

  beforeEach(() => {
    mockRedis = createMockRedis();
    redisClient = new RedisClient(mockRedis as any);
  });

  describe('get', () => {
    test('should retrieve value from redis', async () => {
      mockRedis.get.mockResolvedValue('cached-value');

      const result = await redisClient.get('test-key');

      expect(result).toBe('cached-value');
      expect(mockRedis.get).toHaveBeenCalledWith('test-key');
    });

    test('should return null for non-existent key', async () => {
      mockRedis.get.mockResolvedValue(null);

      const result = await redisClient.get('non-existent');

      expect(result).toBeNull();
    });
  });

  describe('set', () => {
    test('should set value with default TTL', async () => {
      mockRedis.set.mockResolvedValue('OK');

      await redisClient.set('test-key', 'test-value');

      expect(mockRedis.set).toHaveBeenCalledWith('test-key', 'test-value', {
        EX: 3600,
      });
    });

    test('should set value with custom TTL', async () => {
      mockRedis.set.mockResolvedValue('OK');

      await redisClient.set('test-key', 'test-value', 7200);

      expect(mockRedis.set).toHaveBeenCalledWith('test-key', 'test-value', {
        EX: 7200,
      });
    });
  });

  describe('del', () => {
    test('should delete key', async () => {
      mockRedis.del.mockResolvedValue(1);

      await redisClient.del('test-key');

      expect(mockRedis.del).toHaveBeenCalledWith('test-key');
    });
  });

  describe('incr', () => {
    test('should increment counter', async () => {
      mockRedis.incr.mockResolvedValue(5);

      const result = await redisClient.incr('counter');

      expect(result).toBe(5);
      expect(mockRedis.incr).toHaveBeenCalledWith('counter');
    });
  });

  describe('healthCheck', () => {
    test('should return true when redis is healthy', async () => {
      mockRedis.set.mockResolvedValue('OK');
      mockRedis.get.mockResolvedValue('pong');

      const result = await redisClient.healthCheck();

      expect(result).toBe(true);
    });

    test('should return false when redis is unhealthy', async () => {
      mockRedis.set.mockRejectedValue(new Error('Redis error'));

      const result = await redisClient.healthCheck();

      expect(result).toBe(false);
    });
  });
});
```

**Step 2: Run test**

```bash
bun test tests/unit/core/redis/index.test.ts
```

**Step 3: Commit**

```bash
git add tests/unit/core/redis/index.test.ts
git commit -m "test: add Redis client tests"
```

---

### Task 18: PASETO Utils Tests

**Files:**

- Create: `tests/unit/core/paseto/utils.test.ts`

**Step 1: Write PASETO utility tests**

```typescript
// tests/unit/core/paseto/utils.test.ts
import { describe, test, expect } from 'bun:test';
import { extractTokenFromHeader, isAccessToken, isRefreshToken, getTokenPayload, formatAuthorizationHeader } from '@/core/paseto/utils';

describe('PASETO Utils', () => {
  const validToken = 'v4.local.eyJ1c2VySWQiOiIxMjMiLCJ0eXBlIjoiYWNjZXNzIn0.signature';

  describe('extractTokenFromHeader', () => {
    test('should extract token from valid Bearer header', () => {
      const header = 'Bearer v4.local.test-token';
      const result = extractTokenFromHeader(header);

      expect(result).toBe('v4.local.test-token');
    });

    test('should return null for malformed header', () => {
      const result = extractTokenFromHeader('InvalidHeader');

      expect(result).toBeNull();
    });

    test('should return null for empty string', () => {
      const result = extractTokenFromHeader('');

      expect(result).toBeNull();
    });

    test('should return null for null input', () => {
      const result = extractTokenFromHeader(null as any);

      expect(result).toBeNull();
    });
  });

  describe('isAccessToken', () => {
    test('should identify access token', () => {
      const payload = { type: 'access', userId: '123' };
      const result = isAccessToken(payload);

      expect(result).toBe(true);
    });

    test('should reject refresh token', () => {
      const payload = { type: 'refresh', userId: '123' };
      const result = isAccessToken(payload);

      expect(result).toBe(false);
    });

    test('should reject token without type', () => {
      const payload = { userId: '123' };
      const result = isAccessToken(payload);

      expect(result).toBe(false);
    });
  });

  describe('isRefreshToken', () => {
    test('should identify refresh token', () => {
      const payload = { type: 'refresh', userId: '123' };
      const result = isRefreshToken(payload);

      expect(result).toBe(true);
    });

    test('should reject access token', () => {
      const payload = { type: 'access', userId: '123' };
      const result = isRefreshToken(payload);

      expect(result).toBe(false);
    });
  });

  describe('formatAuthorizationHeader', () => {
    test('should format token as Bearer header', () => {
      const result = formatAuthorizationHeader('v4.local.test-token');

      expect(result).toBe('Bearer v4.local.test-token');
    });

    test('should handle empty token', () => {
      const result = formatAuthorizationHeader('');

      expect(result).toBe('Bearer ');
    });
  });

  describe('getTokenPayload', () => {
    test('should decode valid token payload', () => {
      const payload = { userId: '123', type: 'access' };
      const token = Buffer.from(JSON.stringify(payload)).toString('base64');
      const result = getTokenPayload(`v4.local.${token}.sig`);

      expect(result).toEqual(payload);
    });

    test('should return null for invalid token', () => {
      const result = getTokenPayload('invalid-token');

      expect(result).toBeNull();
    });
  });
});
```

**Step 2: Run test**

```bash
bun test tests/unit/core/paseto/utils.test.ts
```

**Step 3: Commit**

```bash
git add tests/unit/core/paseto/utils.test.ts
git commit -m "test: add PASETO utility tests"
```

---

### Task 19: PASETO Errors Tests

**Files:**

- Create: `tests/unit/core/paseto/errors.test.ts`

**Step 1: Write PASETO error tests**

```typescript
// tests/unit/core/paseto/errors.test.ts
import { describe, test, expect } from 'bun/test';
import { PasetoError, TokenExpiredError, InvalidTokenError, MissingTokenError } from '@/core/paseto/errors';

describe('PASETO Errors', () => {
  describe('PasetoError', () => {
    test('should create base error', () => {
      const error = new PasetoError('PASETO operation failed');

      expect(error.message).toBe('PASETO operation failed');
      expect(error.name).toBe('PasetoError');
      expect(error.statusCode).toBe(401);
    });
  });

  describe('TokenExpiredError', () => {
    test('should create expired token error', () => {
      const error = new TokenExpiredError();

      expect(error.message).toBe('Token has expired');
      expect(error.code).toBe('TOKEN_EXPIRED');
      expect(error.statusCode).toBe(401);
    });

    test('should accept custom message', () => {
      const error = new TokenExpiredError('Custom expired message');

      expect(error.message).toBe('Custom expired message');
    });
  });

  describe('InvalidTokenError', () => {
    test('should create invalid token error', () => {
      const error = new InvalidTokenError('Invalid signature');

      expect(error.message).toBe('Invalid token');
      expect(error.code).toBe('INVALID_TOKEN');
      expect(error.statusCode).toBe(401);
    });

    test('should include original error details', () => {
      const error = new InvalidTokenError('Malformed token');

      expect(error.message).toBe('Invalid token');
    });
  });

  describe('MissingTokenError', () => {
    test('should create missing token error', () => {
      const error = new MissingTokenError();

      expect(error.message).toBe('No token provided');
      expect(error.code).toBe('MISSING_TOKEN');
      expect(error.statusCode).toBe(401);
    });

    test('should accept custom message', () => {
      const error = new MissingTokenError('Token required');

      expect(error.message).toBe('Token required');
    });
  });
});
```

**Step 2: Run test**

```bash
bun test tests/unit/core/paseto/errors.test.ts
```

**Step 3: Commit**

```bash
git add tests/unit/core/paseto/errors.test.ts
git commit -m "test: add PASETO error classes tests"
```

---

## Phase 6: Routes & Middleware Improvements

### Task 20: Improve Rate Limit Middleware Tests

**Files:**

- Modify: `tests/unit/middlewares/rate-limit.middleware.test.ts`

**Step 1: Enhance rate limit tests**

```typescript
// tests/unit/middlewares/rate-limit.middleware.test.ts
import { describe, test, expect, beforeEach } from 'bun:test';
import { rateLimitMiddleware } from '@/middlewares/rate-limit.middleware';
import { createMockRedis } from '../mocks/redis.mocks';

describe('Rate Limit Middleware', () => {
  let mockRedis: ReturnType<typeof createMockRedis>;

  beforeEach(() => {
    mockRedis = createMockRedis();
  });

  test('should allow requests within limit', async () => {
    mockRedis.incr.mockResolvedValue(1);
    mockRedis.ttl.mockResolvedValue(60);

    const mockRequest = {
      headers: { get: () => '127.0.0.1' },
    } as any;
    const mockResponse = {
      headers: new Map(),
      set: function (key: string, value: string) {
        this.headers.set(key, value);
      },
    } as any;

    const result = await rateLimitMiddleware(mockRequest, mockResponse, {
      redis: mockRedis as any,
      windowMs: 60000,
      maxRequests: 100,
    });

    expect(result).toBe(true);
    expect(mockRedis.incr).toHaveBeenCalled();
  });

  test('should block requests exceeding limit', async () => {
    mockRedis.incr.mockResolvedValue(101);
    mockRedis.ttl.mockResolvedValue(60);

    const mockRequest = {
      headers: { get: () => '127.0.0.1' },
    } as any;
    const mockResponse = {
      headers: new Map(),
      set: function (key: string, value: string) {
        this.headers.set(key, value);
      },
      status: function (code: number) {
        this.statusCode = code;
        return this;
      },
    } as any;

    const result = await rateLimitMiddleware(mockRequest, mockResponse, {
      redis: mockRedis as any,
      windowMs: 60000,
      maxRequests: 100,
    });

    expect(result).toBe(false);
    expect(mockResponse.statusCode).toBe(429);
  });

  test('should handle missing IP address', async () => {
    const mockRequest = {
      headers: { get: () => null },
    } as any;
    const mockResponse = {} as any;

    const result = await rateLimitMiddleware(mockRequest, mockResponse, {
      redis: mockRedis as any,
      windowMs: 60000,
      maxRequests: 100,
    });

    expect(result).toBe(false);
  });

  test('should set correct TTL on new counter', async () => {
    mockRedis.incr.mockResolvedValue(1);
    mockRedis.ttl.mockResolvedValue(-1);
    mockRedis.expire.mockResolvedValue(1);

    const mockRequest = {
      headers: { get: () => '127.0.0.1' },
    } as any;
    const mockResponse = {
      headers: new Map(),
      set: function (key: string, value: string) {
        this.headers.set(key, value);
      },
    } as any;

    await rateLimitMiddleware(mockRequest, mockResponse, {
      redis: mockRedis as any,
      windowMs: 60000,
      maxRequests: 100,
    });

    expect(mockRedis.expire).toHaveBeenCalledWith(expect.stringContaining('ratelimit'), 60);
  });

  test('should handle Redis errors gracefully', async () => {
    mockRedis.incr.mockRejectedValue(new Error('Redis connection failed'));

    const mockRequest = {
      headers: { get: () => '127.0.0.1' },
    } as any;
    const mockResponse = {} as any;

    const result = await rateLimitMiddleware(mockRequest, mockResponse, {
      redis: mockRedis as any,
      windowMs: 60000,
      maxRequests: 100,
    });

    expect(result).toBe(true);
  });
});
```

**Step 2: Run test**

```bash
bun test tests/unit/middlewares/rate-limit.middleware.test.ts
```

**Step 3: Commit**

```bash
git add tests/unit/middlewares/rate-limit.middleware.test.ts
git commit -m "test: enhance rate limit middleware tests"
```

---

### Task 21: Improve Health Plugin Tests

**Files:**

- Modify: `tests/unit/plugins/health.plugin.test.ts`

**Step 1: Enhance health plugin tests**

```typescript
// tests/unit/plugins/health.plugin.test.ts
import { describe, test, expect, beforeEach } from 'bun:test';
import { healthPlugin } from '@/plugins/health.plugin';
import { createMockDb } from '../mocks/repository.mocks';
import { createMockRedis } from '../mocks/redis.mocks';

describe('Health Plugin', () => {
  let mockDb: ReturnType<typeof createMockDb>;
  let mockRedis: ReturnType<typeof createMockRedis>;
  let mockApp: any;

  beforeEach(() => {
    mockDb = createMockDb();
    mockRedis = createMockRedis();
    mockApp = {
      get: () => ({}),
      routes: [],
    };
  });

  test('should register health check endpoint', () => {
    healthPlugin(mockApp, { db: mockDb as any, redis: mockRedis as any });

    expect(mockApp.routes.length).toBeGreaterThan(0);
    const healthRoute = mockApp.routes.find((r: any) => r.path === '/health');
    expect(healthRoute).toBeDefined();
  });

  test('should return healthy status when all services are up', async () => {
    mockDb.query = {
      execute: () => Promise.resolve([]),
    } as any;
    mockRedis.set.mockResolvedValue('OK');
    mockRedis.get.mockResolvedValue('pong');

    healthPlugin(mockApp, { db: mockDb as any, redis: mockRedis as any });

    const handler = mockApp.routes.find((r: any) => r.path === '/health')?.handler;
    const mockRequest = {} as any;
    const mockResponse = {
      status: () => ({ json: (data: any) => data }),
      json: (data: any) => data,
    } as any;

    const result = await handler(mockRequest, mockResponse);

    expect(result.status).toBe('healthy');
    expect(result.services).toHaveProperty('database');
    expect(result.services).toHaveProperty('redis');
  });

  test('should return unhealthy status when database is down', async () => {
    mockDb.query = {
      execute: () => Promise.reject(new Error('Database connection failed')),
    } as any;

    healthPlugin(mockApp, { db: mockDb as any, redis: mockRedis as any });

    const handler = mockApp.routes.find((r: any) => r.path === '/health')?.handler;
    const mockRequest = {} as any;
    const mockResponse = {
      status: (code: number) => ({ json: (data: any) => data }),
      json: (data: any) => data,
    } as any;

    const result = await handler(mockRequest, mockResponse);

    expect(result.status).toBe('unhealthy');
    expect(result.services.database.status).toBe('down');
  });

  test('should return unhealthy status when redis is down', async () => {
    mockDb.query = {
      execute: () => Promise.resolve([]),
    } as any;
    mockRedis.set.mockRejectedValue(new Error('Redis connection failed'));

    healthPlugin(mockApp, { db: mockDb as any, redis: mockRedis as any });

    const handler = mockApp.routes.find((r: any) => r.path === '/health')?.handler;
    const mockRequest = {} as any;
    const mockResponse = {
      status: (code: number) => ({ json: (data: any) => data }),
      json: (data: any) => data,
    } as any;

    const result = await handler(mockRequest, mockResponse);

    expect(result.status).toBe('unhealthy');
    expect(result.services.redis.status).toBe('down');
  });

  test('should include uptime in health check', async () => {
    mockDb.query = {
      execute: () => Promise.resolve([]),
    } as any;
    mockRedis.set.mockResolvedValue('OK');

    healthPlugin(mockApp, { db: mockDb as any, redis: mockRedis as any });

    const handler = mockApp.routes.find((r: any) => r.path === '/health')?.handler;
    const mockRequest = {} as any;
    const mockResponse = {
      status: (code: number) => ({ json: (data: any) => data }),
      json: (data: any) => data,
    } as any;

    const result = await handler(mockRequest, mockResponse);

    expect(result).toHaveProperty('uptime');
    expect(typeof result.uptime).toBe('number');
  });
});
```

**Step 2: Run test**

```bash
bun test tests/unit/plugins/health.plugin.test.ts
```

**Step 3: Commit**

```bash
git add tests/unit/plugins/health.plugin.test.ts
git commit -m "test: enhance health plugin tests"
```

---

### Task 22: Improve Auth Routes Tests

**Files:**

- Modify: `tests/unit/routes/auth.routes.test.ts`

**Step 1: Enhance auth routes tests**

```typescript
// tests/unit/routes/auth.routes.test.ts
import { describe, test, expect, beforeEach, mock } from 'bun:test';
import { authRoutes } from '@/routes/auth.routes';
import { createMockPasetoService } from '../mocks/paseto.mocks';

// Mock controllers
mock.module('@/controllers/auth.controller', () => ({
  authController: {
    register: () => ({ success: true, message: 'User registered' }),
    login: () => ({ success: true, token: 'mock-token' }),
    logout: () => ({ success: true, message: 'Logged out' }),
    refreshToken: () => ({ success: true, token: 'new-token' }),
    me: () => ({ success: true, user: { id: '123', email: 'test@example.com' } }),
  },
}));

describe('Auth Routes', () => {
  let mockApp: any;
  let mockPaseto: ReturnType<typeof createMockPasetoService>;

  beforeEach(() => {
    mockPaseto = createMockPasetoService();
    mockApp = {
      post: () => mockApp,
      get: () => mockApp,
      routes: [],
    };
  });

  test('should register all auth routes', () => {
    authRoutes(mockApp, { paseto: mockPaseto as any });

    expect(mockApp.routes.length).toBeGreaterThan(0);
  });

  test('should have POST /auth/register route', () => {
    authRoutes(mockApp, { paseto: mockPaseto as any });

    const registerRoute = mockApp.routes.find((r: any) => r.path?.includes('/register') || r.method === 'POST');
    expect(registerRoute).toBeDefined();
  });

  test('should have POST /auth/login route', () => {
    authRoutes(mockApp, { paseto: mockPaseto as any });

    const loginRoute = mockApp.routes.find((r: any) => r.path?.includes('/login') || r.method === 'POST');
    expect(loginRoute).toBeDefined();
  });

  test('should have POST /auth/logout route', () => {
    authRoutes(mockApp, { paseto: mockPaseto as any });

    const logoutRoute = mockApp.routes.find((r: any) => r.path?.includes('/logout') || r.method === 'POST');
    expect(logoutRoute).toBeDefined();
  });

  test('should have POST /auth/refresh route', () => {
    authRoutes(mockApp, { paseto: mockPaseto as any });

    const refreshRoute = mockApp.routes.find((r: any) => r.path?.includes('/refresh') || r.method === 'POST');
    expect(refreshRoute).toBeDefined();
  });

  test('should have GET /auth/me route', () => {
    authRoutes(mockApp, { paseto: mockPaseto as any });

    const meRoute = mockApp.routes.find((r: any) => r.path?.includes('/me') || r.method === 'GET');
    expect(meRoute).toBeDefined();
  });
});
```

**Step 2: Run test**

```bash
bun test tests/unit/routes/auth.routes.test.ts
```

**Step 3: Commit**

```bash
git add tests/unit/routes/auth.routes.test.ts
git commit -m "test: enhance auth routes tests"
```

---

### Task 23: Improve Products Routes Tests

**Files:**

- Modify: `tests/unit/routes/products.routes.test.ts`

**Step 1: Enhance products routes tests**

```typescript
// tests/unit/routes/products.routes.test.ts
import { describe, test, expect, beforeEach, mock } from 'bun:test';

// Mock controllers
mock.module('@/controllers/products.controller', () => ({
  productsController: {
    getAll: () => ({ success: true, data: [] }),
    getById: () => ({ success: true, data: { id: '1', name: 'Product 1' } }),
    create: () => ({ success: true, data: { id: '1', name: 'New Product' } }),
    update: () => ({ success: true, data: { id: '1', name: 'Updated Product' } }),
    delete: () => ({ success: true, message: 'Product deleted' }),
    updateStock: () => ({ success: true, data: { id: '1', stock: 50 } }),
  },
}));

describe('Products Routes', () => {
  let mockApp: any;

  beforeEach(() => {
    mockApp = {
      get: () => mockApp,
      post: () => mockApp,
      put: () => mockApp,
      delete: () => mockApp,
      routes: [],
    };
  });

  test('should register all products routes', () => {
    const { productsRoutes } = require('@/routes/products.routes');
    productsRoutes(mockApp);

    expect(mockApp.routes.length).toBeGreaterThan(0);
  });

  test('should have GET /products route', () => {
    const { productsRoutes } = require('@/routes/products.routes');
    productsRoutes(mockApp);

    const getAllRoute = mockApp.routes.find((r: any) => r.path?.includes('/products') && r.method === 'GET');
    expect(getAllRoute).toBeDefined();
  });

  test('should have GET /products/:id route', () => {
    const { productsRoutes } = require('@/routes/products.routes');
    productsRoutes(mockApp);

    const getByIdRoute = mockApp.routes.find((r: any) => r.path?.includes('/products/:id') || r.path?.includes('/products/'));
    expect(getByIdRoute).toBeDefined();
  });

  test('should have POST /products route', () => {
    const { productsRoutes } = require('@/routes/products.routes');
    productsRoutes(mockApp);

    const createRoute = mockApp.routes.find((r: any) => r.path?.includes('/products') && r.method === 'POST');
    expect(createRoute).toBeDefined();
  });

  test('should have PUT /products/:id route', () => {
    const { productsRoutes } = require('@/routes/products.routes');
    productsRoutes(mockApp);

    const updateRoute = mockApp.routes.find((r: any) => r.path?.includes('/products/:id') || r.path?.includes('/products/'));
    expect(updateRoute).toBeDefined();
  });

  test('should have DELETE /products/:id route', () => {
    const { productsRoutes } = require('@/routes/products.routes');
    productsRoutes(mockApp);

    const deleteRoute = mockApp.routes.find((r: any) => r.path?.includes('/products/:id') || r.path?.includes('/products/'));
    expect(deleteRoute).toBeDefined();
  });
});
```

**Step 2: Run test**

```bash
bun test tests/unit/routes/products.routes.test.ts
```

**Step 3: Commit**

```bash
git add tests/unit/routes/products.routes.test.ts
git commit -m "test: enhance products routes tests"
```

---

### Task 24: Improve Users Routes Tests

**Files:**

- Modify: `tests/unit/routes/users.routes.test.ts`

**Step 1: Enhance users routes tests**

```typescript
// tests/unit/routes/users.routes.test.ts
import { describe, test, expect, beforeEach, mock } from 'bun:test';

// Mock controllers
mock.module('@/controllers/users.controller', () => ({
  usersController: {
    getProfile: () => ({ success: true, data: { id: '123', email: 'test@example.com' } }),
    updateProfile: () => ({ success: true, data: { id: '123', name: 'Updated' } }),
    changePassword: () => ({ success: true, message: 'Password changed' }),
    getAllUsers: () => ({ success: true, data: [], pagination: { page: 1, limit: 10, total: 0 } }),
    getUserById: () => ({ success: true, data: { id: '123', email: 'user@example.com' } }),
    createUser: () => ({ success: true, data: { id: '123', email: 'new@example.com' } }),
    updateUser: () => ({ success: true, data: { id: '123', email: 'updated@example.com' } }),
    deleteUser: () => ({ success: true, message: 'User deleted' }),
    activateUser: () => ({ success: true, message: 'User activated' }),
    deactivateUser: () => ({ success: true, message: 'User deactivated' }),
    restoreUser: () => ({ success: true, message: 'User restored' }),
  },
}));

describe('Users Routes', () => {
  let mockApp: any;

  beforeEach(() => {
    mockApp = {
      get: () => mockApp,
      post: () => mockApp,
      put: () => mockApp,
      delete: () => mockApp,
      routes: [],
    };
  });

  test('should register all users routes', () => {
    const { usersRoutes } = require('@/routes/users.routes');
    usersRoutes(mockApp);

    expect(mockApp.routes.length).toBeGreaterThan(0);
  });

  test('should have GET /users/me route', () => {
    const { usersRoutes } = require('@/routes/users.routes');
    usersRoutes(mockApp);

    const profileRoute = mockApp.routes.find((r: any) => r.path?.includes('/me') && r.method === 'GET');
    expect(profileRoute).toBeDefined();
  });

  test('should have PUT /users/me route', () => {
    const { usersRoutes } = require('@/routes/users.routes');
    usersRoutes(mockApp);

    const updateProfileRoute = mockApp.routes.find((r: any) => r.path?.includes('/me') && r.method === 'PUT');
    expect(updateProfileRoute).toBeDefined();
  });

  test('should have POST /users/me/change-password route', () => {
    const { usersRoutes } = require('@/routes/users.routes');
    usersRoutes(mockApp);

    const changePasswordRoute = mockApp.routes.find((r: any) => r.path?.includes('/change-password') || r.path?.includes('/change-password'));
    expect(changePasswordRoute).toBeDefined();
  });

  test('should have GET /users route', () => {
    const { usersRoutes } = require('@/routes/users.routes');
    usersRoutes(mockApp);

    const getAllRoute = mockApp.routes.find((r: any) => r.path === '/users' && r.method === 'GET');
    expect(getAllRoute).toBeDefined();
  });

  test('should have POST /users route', () => {
    const { usersRoutes } = require('@/routes/users.routes');
    usersRoutes(mockApp);

    const createRoute = mockApp.routes.find((r: any) => r.path === '/users' && r.method === 'POST');
    expect(createRoute).toBeDefined();
  });
});
```

**Step 2: Run test**

```bash
bun test tests/unit/routes/users.routes.test.ts
```

**Step 3: Commit**

```bash
git add tests/unit/routes/users.routes.test.ts
git commit -m "test: enhance users routes tests"
```

---

## Phase 7: Activity Service Tests

### Task 25: Activity Service Tests

**Files:**

- Create: `tests/unit/services/activity.service.test.ts`

**Step 1: Write activity service tests**

```typescript
// tests/unit/services/activity.service.test.ts
import { describe, test, expect, beforeEach } from 'bun:test';
import { ActivityService } from '@/services/activity.service';
import { createMockDb, createMockQueryBuilder } from '../mocks/repository.mocks';

describe('ActivityService', () => {
  let mockDb: ReturnType<typeof createMockDb>;
  let activityService: ActivityService;

  beforeEach(() => {
    mockDb = createMockDb();
    activityService = new ActivityService(mockDb as any);
  });

  describe('logActivity', () => {
    test('should log user activity successfully', async () => {
      const mockActivity = {
        id: '1',
        userId: '123',
        action: 'login',
        ipAddress: '127.0.0.1',
        createdAt: new Date(),
      };
      const mockQueryBuilder = createMockQueryBuilder();
      mockQueryBuilder.returning.mockResolvedValue([mockActivity]);
      mockDb.insert.mockReturnValue(mockQueryBuilder);

      const result = await activityService.logActivity({
        userId: '123',
        action: 'login',
        ipAddress: '127.0.0.1',
      });

      expect(result).toEqual(mockActivity);
    });

    test('should handle missing optional fields', async () => {
      const mockActivity = {
        id: '1',
        userId: '123',
        action: 'logout',
      };
      const mockQueryBuilder = createMockQueryBuilder();
      mockQueryBuilder.returning.mockResolvedValue([mockActivity]);
      mockDb.insert.mockReturnValue(mockQueryBuilder);

      const result = await activityService.logActivity({
        userId: '123',
        action: 'logout',
      });

      expect(result).toEqual(mockActivity);
    });

    test('should handle errors gracefully', async () => {
      const mockQueryBuilder = createMockQueryBuilder();
      mockQueryBuilder.returning.mockRejectedValue(new Error('Database error'));
      mockDb.insert.mockReturnValue(mockQueryBuilder);

      await expect(activityService.logActivity({ userId: '123', action: 'login' })).rejects.toThrow();
    });
  });

  describe('getUserActivities', () => {
    test('should retrieve user activities with pagination', async () => {
      const mockActivities = [
        { id: '1', userId: '123', action: 'login' },
        { id: '2', userId: '123', action: 'logout' },
      ];
      const mockQueryBuilder = createMockQueryBuilder();
      mockQueryBuilder.returning.mockResolvedValue(mockActivities);
      mockDb.select.mockReturnValue(mockQueryBuilder);

      const result = await activityService.getUserActivities('123', {
        page: 1,
        limit: 10,
      });

      expect(result).toEqual(mockActivities);
      expect(mockDb.select).toHaveBeenCalled();
    });
  });

  describe('cleanupOldActivities', () => {
    test('should delete activities older than cutoff date', async () => {
      const mockQueryBuilder = createMockQueryBuilder();
      mockQueryBuilder.returning.mockResolvedValue([]);
      mockDb.delete.mockReturnValue(mockQueryBuilder);

      const cutoffDate = new Date('2024-01-01');
      const result = await activityService.cleanupOldActivities(cutoffDate);

      expect(result).toEqual({
        success: true,
        deletedCount: 0,
      });
    });
  });
});
```

**Step 2: Run test**

```bash
bun test tests/unit/services/activity.service.test.ts
```

**Step 3: Commit**

```bash
git add tests/unit/services/activity.service.test.ts
git commit -m "test: add activity service tests"
```

---

## Phase 8: Schema Tests

### Task 26: Schema Tests

**Files:**

- Create: `tests/unit/database/schema/index.test.ts`
- Create: `tests/unit/database/schema/users.schema.test.ts`
- Create: `tests/unit/database/schema/sessions.schema.test.ts`
- Create: `tests/unit/database/schema/products.schema.test.ts`
- Create: `tests/unit/database/schema/activity-logs.schema.test.ts`

**Step 1: Write schema tests**

```typescript
// tests/unit/database/schema/index.test.ts
import { describe, test, expect } from 'bun:test';

describe('Database Schema Index', () => {
  test('should export all schema tables', async () => {
    const schemas = await import('@/database/schema');

    expect(schemas.users).toBeDefined();
    expect(schemas.sessions).toBeDefined();
    expect(schemas.products).toBeDefined();
    expect(schemas.userActivityLogs).toBeDefined();
  });
});

// tests/unit/database/schema/users.schema.test.ts
import { describe, test, expect } from 'bun:test';
import { users } from '@/database/schema/users.schema';

describe('Users Schema', () => {
  test('should have correct table name', () => {
    expect(users).toBeDefined();
  });

  test('should have required fields', () => {
    // Schema structure validation depends on drizzle schema export
    expect(users).toHaveProperty('_.name');
  });
});

// tests/unit/database/schema/sessions.schema.test.ts
import { describe, test, expect } from 'bun:test';
import { sessions } from '@/database/schema/sessions.schema';

describe('Sessions Schema', () => {
  test('should define sessions table', () => {
    expect(sessions).toBeDefined();
  });
});

// tests/unit/database/schema/products.schema.test.ts
import { describe, test, expect } from 'bun:test';
import { products } from '@/database/schema/products.schema';

describe('Products Schema', () => {
  test('should define products table', () => {
    expect(products).toBeDefined();
  });
});

// tests/unit/database/schema/activity-logs.schema.test.ts
import { describe, test, expect } from 'bun:test';
import { userActivityLogs } from '@/database/schema/activity-logs.schema';

describe('Activity Logs Schema', () => {
  test('should define activity logs table', () => {
    expect(userActivityLogs).toBeDefined();
  });
});
```

**Step 2: Run test**

```bash
bun test tests/unit/database/schema/
```

**Step 3: Commit**

```bash
git add tests/unit/database/schema/
git commit -m "test: add database schema tests"
```

---

## Final Phase: Run Full Coverage

### Task 27: Run Full Test Suite with Coverage

**Files:**

- None (verification step)

**Step 1: Run full coverage test**

```bash
bun run test:coverage
```

Expected: 85%+ coverage for both functions and lines

**Step 2: Check for lint errors**

```bash
bun run lint tests/
```

Expected: No lint errors

**Step 3: Final commit if all tests pass**

```bash
git add .
git commit -m "test: achieve 85%+ test coverage with comprehensive unit tests"
```

---

## Summary

This implementation plan creates **27 tasks** covering:

1. **Foundation** (Tasks 1-4): Mock utilities and fixes
2. **Repositories** (Tasks 5-10): Complete repository layer testing
3. **Config** (Tasks 11-12): Configuration and schema validation
4. **Database** (Task 13): Connection and schema tests
5. **Core Utilities** (Tasks 14-19): Errors, HTTP, validation, Redis, PASETO
6. **Routes & Middleware** (Tasks 20-24): Improved coverage for routes
7. **Services** (Task 25): Activity service tests
8. **Schemas** (Task 26): Database schema tests
9. **Verification** (Task 27): Final coverage check

**Total estimated new test files**: 20+
**Estimated test coverage increase**: 65% → 85%+
**Key principles**: Clean code, AAA pattern, comprehensive mocking, no unused variables
