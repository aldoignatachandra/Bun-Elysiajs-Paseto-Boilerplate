# Testing Standards

> 🧪 **Comprehensive guide to testing practices and conventions**

This document defines the testing standards and best practices used across the application.

---

## Table of Contents

- [Testing Philosophy](#testing-philosophy)
- [Test Structure](#test-structure)
- [Unit Testing](#unit-testing)
- [Integration Testing](#integration-testing)
- [Test Data Management](#test-data-management)
- [Testing Best Practices](#testing-best-practices)
- [Coverage Requirements](#coverage-requirements)

---

## Testing Philosophy

### Testing Pyramid

```
┌─────────────────────────────────────────────────────────────┐
│                     Testing Pyramid                         │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│                        ▲                                    │
│                      ╱ │ ╲                                  │
│                    ╱   │   ╲                                │
│                  ╱     │     ╲                              │
│                ╱  E2E  │  10%  ╲                            │
│              ╱─────────┼─────────╲                          │
│            ╱           │           ╲                        │
│          ╱   Integration│   20%     ╲                      │
│        ╱───────────────┼─────────────╲                      │
│      ╱                 │                 ╲                   │
│    ╱      Unit Tests   │     70%         ╲                 │
│  ╱─────────────────────┼────────────────────╲               │
│                                                             │
│  Fast & Isolated ──────▶ Slow & Integrated                │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

### Test Categories

| Category              | Purpose                           | Speed  | Example                         |
| --------------------- | --------------------------------- | ------ | ------------------------------- |
| **Unit Tests**        | Test isolated functions/classes   | Fast   | `passwordService.hash()`        |
| **Integration Tests** | Test multiple components together | Medium | `POST /api/auth/register`       |
| **E2E Tests**         | Test complete workflows           | Slow   | User registration to login flow |

---

## Test Structure

### Directory Structure

```
tests/
├── unit/                          # Unit tests
│   ├── core/                      # Core utilities tests
│   │   ├── paseto/
│   │   │   └── paseto.service.test.ts
│   │   ├── crypto/
│   │   │   └── password.service.test.ts
│   │   └── validation/
│   │       └── schema.test.ts
│   ├── services/                  # Service layer tests
│   │   ├── auth.service.test.ts
│   │   ├── users.service.test.ts
│   │   └── products.service.test.ts
│   ├── repositories/              # Repository tests
│   │   ├── users.repository.test.ts
│   │   └── products.repository.test.ts
│   └── controllers/               # Controller tests
│       ├── auth.controller.test.ts
│       └── users.controller.test.ts
├── integration/                   # Integration tests
│   ├── routes/
│   │   ├── auth.routes.test.ts
│   │   └── users.routes.test.ts
│   └── middlewares/
│       ├── auth.middleware.test.ts
│       └── rate-limit.middleware.test.ts
├── fixtures/                      # Test data fixtures
│   ├── users.ts
│   └── products.ts
├── mocks/                         # Test doubles
│   ├── repository.mock.ts
│   └── service.mock.ts
└── setup.ts                       # Test setup/teardown
```

### Test File Naming

```
{module-name}.{type}.test.ts

Examples:
- paseto.service.test.ts
- users.service.test.ts
- auth.routes.integration.test.ts
```

---

## Unit Testing

### Test Structure

```typescript
import { describe, it, expect, beforeEach, afterEach } from 'bun:test';
import { PasswordService } from '@/core/crypto/password.service';

describe('PasswordService', () => {
  let passwordService: PasswordService;

  beforeEach(() => {
    // Setup before each test
    passwordService = new PasswordService();
  });

  afterEach(() => {
    // Cleanup after each test
    passwordService = null as any;
  });

  describe('hash', () => {
    it('should hash a password', async () => {
      const password = 'SecurePassword123!';
      const hash = await passwordService.hash(password);

      expect(hash).toBeDefined();
      expect(typeof hash).toBe('string');
      expect(hash).not.toBe(password);
    });

    it('should generate different hashes for same password', async () => {
      const password = 'SecurePassword123!';
      const hash1 = await passwordService.hash(password);
      const hash2 = await passwordService.hash(password);

      expect(hash1).not.toBe(hash2);
    });

    it('should throw on empty password', async () => {
      const password = '';

      await expect(passwordService.hash(password)).rejects.toThrow();
    });
  });

  describe('verify', () => {
    it('should verify correct password', async () => {
      const password = 'SecurePassword123!';
      const hash = await passwordService.hash(password);
      const isValid = await passwordService.verify(hash, password);

      expect(isValid).toBe(true);
    });

    it('should reject incorrect password', async () => {
      const password = 'SecurePassword123!';
      const hash = await passwordService.hash(password);
      const isValid = await passwordService.verify(hash, 'WrongPassword');

      expect(isValid).toBe(false);
    });
  });
});
```

### Test Naming Conventions

```typescript
// ✅ Good: Descriptive test names
it('should throw UserNotFoundError when user does not exist', async () => {
  // Test implementation
});

it('should create user with valid data', async () => {
  // Test implementation
});

it('should reject invalid email format', async () => {
  // Test implementation
});

// ❌ Bad: Vague test names
it('should work', async () => {
  // What works?
});

it('test user creation', async () => {
  // Not descriptive
});
```

### Arrange-Act-Assert Pattern

```typescript
it('should update user profile', async () => {
  // Arrange: Setup test data
  const userId = 'user-123';
  const updateData = { firstName: 'John', lastName: 'Doe' };
  const existingUser = { id: userId, firstName: 'Jane', lastName: 'Smith' };
  userRepository.findById.mockResolvedValue(existingUser);
  userRepository.update.mockResolvedValue({ ...existingUser, ...updateData });

  // Act: Execute the function being tested
  const result = await usersService.updateProfile(userId, updateData);

  // Assert: Verify the result
  expect(result).toEqual({ ...existingUser, ...updateData });
  expect(userRepository.update).toHaveBeenCalledWith(userId, updateData);
});
```

---

## Integration Testing

### Route Integration Tests

```typescript
import { describe, it, expect, beforeAll, afterAll } from 'bun:test';
import { createApp } from '@/app';

describe('Auth Routes Integration Tests', () => {
  let app: Elysia;

  beforeAll(async () => {
    // Setup test database
    await setupTestDatabase();
    app = createApp();
  });

  afterAll(async () => {
    // Cleanup test database
    await teardownTestDatabase();
  });

  describe('POST /api/auth/register', () => {
    it('should register a new user', async () => {
      const response = await app.request('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: 'test@example.com',
          password: 'SecurePass123!',
          firstName: 'Test',
          lastName: 'User',
        }),
      });

      expect(response.status).toBe(201);

      const data = await response.json();

      expect(data.success).toBe(true);
      expect(data.data.user.email).toBe('test@example.com');
      expect(data.data.tokens.accessToken).toBeDefined();
      expect(data.data.tokens.refreshToken).toBeDefined();
    });

    it('should reject duplicate email', async () => {
      // Create user first
      await createTestUser({ email: 'test@example.com' });

      const response = await app.request('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: 'test@example.com',
          password: 'SecurePass123!',
          firstName: 'Test',
          lastName: 'User',
        }),
      });

      expect(response.status).toBe(409);

      const data = await response.json();

      expect(data.success).toBe(false);
      expect(data.error.code).toBe('USER_EXISTS');
    });

    it('should reject invalid email', async () => {
      const response = await app.request('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: 'invalid-email',
          password: 'SecurePass123!',
          firstName: 'Test',
          lastName: 'User',
        }),
      });

      expect(response.status).toBe(400);

      const data = await response.json();

      expect(data.success).toBe(false);
      expect(data.error.code).toBe('VALIDATION_ERROR');
    });
  });

  describe('Protected Routes', () => {
    it('should require authentication', async () => {
      const response = await app.request('/api/users/me', {
        method: 'GET',
      });

      expect(response.status).toBe(401);
    });

    it('should accept valid PASETO token', async () => {
      const token = await generateTestToken();

      const response = await app.request('/api/users/me', {
        method: 'GET',
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      expect(response.status).toBe(200);
    });

    it('should reject expired token', async () => {
      const token = await generateExpiredToken();

      const response = await app.request('/api/users/me', {
        method: 'GET',
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      expect(response.status).toBe(401);

      const data = await response.json();

      expect(data.error.code).toBe('TOKEN_EXPIRED');
    });
  });
});
```

---

## Test Data Management

### Fixtures

```typescript
// tests/fixtures/users.ts
import type { NewUser } from '@/database/schema';

export const userFixtures = {
  validUser: {
    email: 'test@example.com',
    password: 'SecurePass123!',
    firstName: 'Test',
    lastName: 'User',
  } as NewUser,

  adminUser: {
    email: 'admin@example.com',
    password: 'AdminPass123!',
    firstName: 'Admin',
    lastName: 'User',
    role: 'ADMIN',
  } as NewUser,

  invalidUser: {
    email: 'invalid-email',
    password: 'short',
    firstName: '',
    lastName: '',
  },
};

// tests/fixtures/products.ts
export const productFixtures = {
  validProduct: {
    name: 'Test Product',
    price: 99.99,
    stock: 100,
  },

  productWithVariants: {
    name: 'Product with Variants',
    price: 149.99,
    stock: 50,
    variants: [
      {
        sku: 'PROD-RED-L',
        price: '149.99',
        stock: 25,
        attributeValues: { color: 'red', size: 'L' },
      },
      {
        sku: 'PROD-BLU-M',
        price: '149.99',
        stock: 25,
        attributeValues: { color: 'blue', size: 'M' },
      },
    ],
  },
};
```

### Test Data Builders

```typescript
// tests/builders/user.builder.ts
export class UserBuilder {
  private user: Partial<NewUser> = {
    email: 'test@example.com',
    firstName: 'Test',
    lastName: 'User',
    password: 'SecurePass123!',
  };

  withEmail(email: string): UserBuilder {
    this.user.email = email;
    return this;
  }

  withFirstName(firstName: string): UserBuilder {
    this.user.firstName = firstName;
    return this;
  }

  asAdmin(): UserBuilder {
    this.user.role = 'ADMIN';
    return this;
  }

  build(): NewUser {
    return this.user as NewUser;
  }
}

// Usage
const adminUser = new UserBuilder().withEmail('admin@example.com').asAdmin().build();
```

---

## Testing Best Practices

### Test Isolation

```typescript
// ✅ Good: Isolated test
describe('UserService.createUser', () => {
  it('should create user', async () => {
    // Each test has its own data
    const userData = { email: `test-${Date.now()}@example.com`, ... };
    const user = await userService.create(userData);

    expect(user).toBeDefined();
  });
});

// ❌ Bad: Shared state between tests
describe('UserService.createUser (bad)', () => {
  let sharedUserId: string;

  it('should create user', async () => {
    const user = await userService.create(userData);
    sharedUserId = user.id;  // Affects other tests
  });

  it('should delete user', async () => {
    // Depends on sharedUserId from previous test
    await userService.delete(sharedUserId);
  });
});
```

### Mock Usage

```typescript
// ✅ Good: Minimal, focused mocking
describe('UserService', () => {
  it('should return user from repository', async () => {
    const mockUser = { id: '123', email: 'test@example.com' };
    userRepository.findById.mockResolvedValue(mockUser);

    const user = await userService.findById('123');

    expect(user).toEqual(mockUser);
  });
});

// ❌ Bad: Excessive mocking
describe('UserService (bad)', () => {
  it('should return user', async () => {
    // Mocking everything - what are we testing?
    const mockUser = { id: '123', email: 'test@example.com' };
    const mockRepo = { findById: mockResolvedValue(mockUser) };
    const mockLogger = { info: mockFn() };
    const mockValidator = { validate: mockFn() };

    const service = new UserService(mockRepo, mockLogger, mockValidator);

    const user = await service.findById('123');

    expect(user).toBeDefined();
  });
});
```

### Test Coverage

```typescript
// ✅ Good: Test all branches
describe('validatePassword', () => {
  it('should accept valid password', () => {
    const result = validatePassword('SecurePass123!');
    expect(result.valid).toBe(true);
  });

  it('should reject password without uppercase', () => {
    const result = validatePassword('lowercase123!');
    expect(result.valid).toBe(false);
    expect(result.error).toContain('uppercase letter');
  });

  it('should reject password without number', () => {
    const result = validatePassword('NoNumbers!');
    expect(result.valid).toBe(false);
    expect(result.error).toContain('number');
  });

  it('should reject short password', () => {
    const result = validatePassword('Short1!');
    expect(result.valid).toBe(false);
    expect(result.error).toContain('8 characters');
  });
});

// ❌ Bad: Only happy path
describe('validatePassword (bad)', () => {
  it('should validate password', () => {
    const result = validatePassword('SecurePass123!');
    expect(result.valid).toBe(true);
  });
  // Missing: all the error cases!
});
```

### Async Testing

```typescript
// ✅ Good: Proper async/await testing
it('should create user asynchronously', async () => {
  const user = await userService.create(userData);

  expect(user).toBeDefined();
  expect(user.id).toBeDefined();
});

// ✅ Good: Test error handling
it('should throw on duplicate email', async () => {
  userRepository.findByEmail.mockResolvedValue(existingUser);

  await expect(userService.create(userData)).rejects.toThrow(UserExistsError);
});

// ❌ Bad: Not awaiting promises
it('should create user (bad)', () => {
  userService.create(userData); // Missing await
  expect(true).toBe(true); // Race condition
});
```

---

## Coverage Requirements

### Coverage Targets

| Metric                | Target | Tool                |
| --------------------- | ------ | ------------------- |
| **Line Coverage**     | ≥ 80%  | bun test --coverage |
| **Branch Coverage**   | ≥ 75%  | bun test --coverage |
| **Function Coverage** | ≥ 85%  | bun test --coverage |

### Running Coverage

```bash
# Run all tests with coverage
bun test --coverage

# Run specific test file with coverage
bun test tests/unit/services/auth.service.test.ts --coverage

# Generate coverage report
bun test --coverage --coverage-reporter=html
```

### Coverage Exclusions

```
# Files to exclude from coverage
- tests/**/*
- src/types/**/*
- src/**/*.interface.ts
- src/**/*.types.ts
- src/database/migrations/**
- src/server.ts  # Entry point only
```

---

## Test Setup and Teardown

### Test Database

```typescript
// tests/setup.ts
import { beforeAll, afterAll, beforeEach, afterEach } from 'bun:test';
import { getConnection, closeConnection } from '@/database/connection';
import { migrate } from 'drizzle-orm/node-postgres/migrator';

let testDb: Database;

beforeAll(async () => {
  // Use test database
  process.env.DATABASE_URL = process.env.TEST_DATABASE_URL;

  testDb = getConnection();

  // Run migrations
  await migrate(testDb, { migrationsFolder: './src/database/migrations' });
});

afterAll(async () => {
  await closeConnection();
});

beforeEach(async () => {
  // Clean tables before each test
  await testDb.delete(users);
  await testDb.delete(sessions);
  await testDb.delete(products);
});

afterEach(async () => {
  // Clean up after each test
  await testDb.delete(users);
  await testDb.delete(sessions);
  await testDb.delete(products);
});
```

### Test Environment Variables

```env
# .env.test
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/test_db
REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_DB=15  # Use separate DB for tests
PASETO_LOCAL_KEY=0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef
LOG_LEVEL=error  # Reduce noise in tests
```

---

## Mock Patterns

### Repository Mocks

```typescript
// tests/mocks/repository.mock.ts
export class MockUserRepository implements IUserRepository {
  private users: Map<string, User> = new Map();

  async findById(id: string): Promise<User | null> {
    return this.users.get(id) || null;
  }

  async findByEmail(email: string): Promise<User | null> {
    return Array.from(this.users.values()).find(u => u.email === email) || null;
  }

  async create(data: NewUser): Promise<User> {
    const user: User = {
      id: crypto.randomUUID(),
      ...data,
      isActive: true,
      emailVerified: false,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    this.users.set(user.id, user);
    return user;
  }

  // Helper methods for testing
  withExistingUser(user: User): MockUserRepository {
    this.users.set(user.id, user);
    return this;
  }

  clear(): void {
    this.users.clear();
  }
}
```

### Service Mocks

```typescript
// tests/mocks/service.mock.ts
export class MockPasetoService implements IPasetoService {
  createAccessToken = mockFn((userId: string) => Promise.resolve(`token-${userId}`));
  createRefreshToken = mockFn((userId: string) => Promise.resolve(`refresh-${userId}`));
  validateAndDecodeToken = mockFn((token: string) =>
    Promise.resolve({
      valid: true,
      payload: { sub: 'user-123', type: 'access' },
      error: null,
    })
  );

  // Helper for setup
  withValidToken(token: string, payload: TokenPayload): MockPasetoService {
    this.validateAndDecodeToken.mockResolvedValue({
      valid: true,
      payload,
      error: null,
    });
    return this;
  }

  withInvalidToken(token: string): MockPasetoService {
    this.validateAndDecodeToken.mockResolvedValue({
      valid: false,
      payload: null,
      error: 'Invalid token',
    });
    return this;
  }
}
```

---

## Running Tests

### Test Commands

```bash
# Run all tests
bun test

# Run unit tests only
bun test tests/unit

# Run integration tests only
bun test tests/integration

# Run specific test file
bun test tests/unit/services/auth.service.test.ts

# Run with coverage
bun test --coverage

# Run in watch mode
bun test --watch

# Run tests matching pattern
bun test --test-name-pattern="auth"
```

### Package.json Scripts

```json
{
  "scripts": {
    "test": "bun test",
    "test:coverage": "bun test --coverage",
    "test:unit": "bun test tests/unit",
    "test:integration": "bun test tests/integration",
    "test:watch": "bun test --watch"
  }
}
```

---

## Checklist

Before considering tests complete:

- [ ] Unit tests for all services
- [ ] Unit tests for all repositories
- [ ] Unit tests for core utilities
- [ ] Integration tests for all routes
- [ ] Integration tests for middleware
- [ ] Error cases covered
- [ ] Edge cases covered
- [ ] Tests are isolated (no shared state)
- [ ] Tests run quickly (< 5 seconds for unit tests)
- [ ] Coverage meets requirements (≥ 80%)

---

**Last Updated:** 2025-03-09

**Version:** 1.0.0
