# Architecture Standards

> 🏗️ **Comprehensive guide to architectural patterns and best practices for the monolith**

This document defines the architectural standards and patterns used across the application.

---

## Table of Contents

- [Design Principles](#design-principles)
- [Layered Architecture](#layered-architecture)
- [Design Patterns](#design-patterns)
- [Module Organization](#module-organization)
- [Data Flow](#data-flow)
- [Error Handling](#error-handling)
- [Dependency Management](#dependency-management)

---

## Design Principles

### SOLID Principles

```typescript
// ┌─────────────────────────────────────────────────────────────┐
// │                    SOLID Principles                         │
// ├─────────────────────────────────────────────────────────────┤
// │                                                             │
// │  S │ Single Responsibility   - One reason to change         │
// │  O │ Open/Closed              - Open for extension          │
// │    │                          - Closed for modification      │
// │  L │ Liskov Substitution     - Subtypes must be substitable │
// │  I │ Interface Segregation    - Small, focused interfaces   │
// │  D │ Dependency Inversion     - Depend on abstractions       │
// │                                                             │
// └─────────────────────────────────────────────────────────────┘
```

#### Single Responsibility Principle (SRP)

```typescript
// ✅ Good: Each class has one responsibility
class UserService {
  async createUser(dto: CreateUserDto): Promise<User> {
    // Only handles user creation business logic
  }
}

class EmailService {
  async sendWelcomeEmail(user: User): Promise<void> {
    // Only handles email sending
  }
}

// ❌ Bad: UserService handles multiple concerns
class UserServiceBad {
  async createUser(dto: CreateUserDto): Promise<User> {
    const user = await this.repo.create(dto);
    await this.emailService.sendEmail(user); // Wrong responsibility
    await this.analytics.trackUserCreated(user); // Wrong responsibility
    return user;
  }
}
```

#### Open/Closed Principle (OCP)

```typescript
// ✅ Good: Open for extension, closed for modification
interface TokenStrategy {
  createToken(payload: TokenPayload): Promise<string>;
  validateToken(token: string): Promise<TokenPayload>;
}

class PasetoStrategy implements TokenStrategy {
  async createToken(payload: TokenPayload): Promise<string> {
    return await this.pasetoService.encrypt(payload);
  }

  async validateToken(token: string): Promise<TokenPayload> {
    return await this.pasetoService.decrypt(token);
  }
}

// New token types can be added without modifying existing code
class JwtStrategy implements TokenStrategy {
  // JWT implementation
}

// ❌ Bad: Modified for each new token type
class TokenServiceBad {
  async createToken(type: 'paseto' | 'jwt', payload: TokenPayload): Promise<string> {
    if (type === 'paseto') {
      // PASETO logic
    } else if (type === 'jwt') {
      // JWT logic
    }
    // Needs modification for new types
  }
}
```

#### Dependency Inversion Principle (DIP)

```typescript
// ✅ Good: Depend on abstractions (interfaces)
interface IUserRepository {
  findById(id: string): Promise<User | null>;
  create(user: NewUser): Promise<User>;
}

class UserService {
  constructor(private userRepository: IUserRepository) {
    // Depends on abstraction, not concrete implementation
  }
}

// ❌ Bad: Depends on concrete implementation
class UserServiceBad {
  constructor(private userRepository: PostgresUserRepository) {
    // Tightly coupled to PostgreSQL implementation
  }
}
```

---

## Layered Architecture

### Architecture Diagram

```
┌─────────────────────────────────────────────────────────────┐
│                    API Layer (Routes)                        │
│  Request handling, validation, response formatting           │
├─────────────────────────────────────────────────────────────┤
│                    Controller Layer                          │
│  Orchestrates application use cases                          │
├─────────────────────────────────────────────────────────────┤
│                    Service Layer (Business Logic)            │
│  Domain rules, validation, external service integration      │
├─────────────────────────────────────────────────────────────┤
│                    Repository Layer (Data Access)            │
│  Database operations, caching, transactions                  │
├─────────────────────────────────────────────────────────────┤
│                    Infrastructure Layer                       │
│  Database, Redis, external APIs                              │
└─────────────────────────────────────────────────────────────┘
```

### Layer Responsibilities

| Layer              | Responsibility                             | Should Not             |
| ------------------ | ------------------------------------------ | ---------------------- |
| **Routes**         | HTTP concerns, parsing, middleware         | Business logic         |
| **Controllers**    | Request orchestration, response formatting | Domain logic           |
| **Services**       | Business rules, use cases                  | HTTP, database details |
| **Repositories**   | Data access, queries                       | Business rules         |
| **Infrastructure** | External systems, I/O                      | Domain logic           |

### Request Flow

```
Client Request
    │
    ▼
┌─────────────┐
│   Routes    │  Parse request, apply middleware
└──────┬──────┘
       │
       ▼
┌─────────────┐
│ Controllers │  Validate DTO, orchestrate use cases
└──────┬──────┘
       │
       ▼
┌─────────────┐
│  Services   │  Execute business logic
└──────┬──────┘
       │
       ▼
┌─────────────┐
│Repositories│  Query/modify data
└──────┬──────┘
       │
       ▼
┌─────────────┐
│  Database   │  Persist/retrieve data
└─────────────┘
```

---

## Design Patterns

### Repository Pattern

```typescript
// Abstract repository interface
interface IUserRepository {
  findById(id: string): Promise<User | null>;
  findByEmail(email: string): Promise<User | null>;
  create(user: NewUser): Promise<User>;
  update(id: string, data: Partial<User>): Promise<User | null>;
  delete(id: string): Promise<boolean>;
}

// Concrete implementation
class UserRepository implements IUserRepository {
  constructor(private db: Database) {}

  async findById(id: string): Promise<User | null> {
    const result = await this.db.select().from(users).where(eq(users.id, id)).limit(1);

    return result[0] || null;
  }

  // ... other methods
}
```

### Unit of Work Pattern

```typescript
// Unit of Work interface (simplified)
interface IUnitOfWork {
  readonly users: IUserRepository;
  readonly sessions: ISessionRepository;
  readonly products: IProductRepository;
  readonly activityLogs: ActivityLogRepository;

  withTransaction<T>(fn: (txUow: TransactionUnitOfWork) => Promise<T>): Promise<T>;
}

// Implementation with lazy-loaded repositories
class UnitOfWork implements IUnitOfWork {
  private _users: IUserRepository | null = null;
  private _sessions: ISessionRepository | null = null;
  private _products: IProductRepository | null = null;

  constructor(private db: Database) {}

  // Lazy initialization of repositories
  get users(): IUserRepository {
    if (!this._users) {
      this._users = new UserRepository(this.db);
    }
    return this._users;
  }

  // Transaction support with callback pattern
  async withTransaction<T>(fn: (txUow: TransactionUnitOfWork) => Promise<T>): Promise<T> {
    // Use Drizzle's transaction API
    return await this.db.transaction(async tx => {
      // Create new repository instances with transaction client
      const txUsers = new UserRepository(tx);
      const txSessions = new SessionRepository(tx);
      const txProducts = new ProductRepository(tx);

      // Create transaction-aware Unit of Work
      const txUow = new TransactionUnitOfWork(tx, txUsers, txSessions, txProducts);

      // Execute callback with transaction context
      return await fn(txUow);
    });
  }
}

// Usage in service layer
async function registerUser(dto: RegisterDto): Promise<RegisterOutput> {
  return this.unitOfWork.withTransaction(async uow => {
    // All operations use transaction client
    const existingUser = await uow.users.findByEmail(dto.email);
    if (existingUser) {
      throw new ConflictError('User already exists');
    }

    const passwordHash = await this.passwordService.hash(dto.password);
    const user = await uow.users.create({ ...dto, passwordHash });

    const tokens = this.pasetoService.createTokenPair({ sub: user.id, email: user.email });

    // Create session with token data
    await uow.sessions.create({
      userId: user.id,
      token: tokens.accessToken,
      refreshTokenId: tokens.refreshTokenId,
      expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
    });

    // Log activity
    await uow.activityLogs.create({
      userId: user.id,
      action: 'user.registered',
      entity: 'users',
      entityId: user.id,
    });

    return { user, tokens };
    // Transaction auto-commits on success, rolls back on error
  });
}
```

**Benefits:**

| Benefit               | Description                                  |
| --------------------- | -------------------------------------------- |
| **Atomic Operations** | Multiple operations succeed or fail together |
| **Automatic Cleanup** | Transaction auto-commits/rolls back          |
| **Lazy Loading**      | Repositories created only when needed        |
| **Type Safety**       | Full TypeScript support                      |
| **Testability**       | Easy to mock for unit tests                  |

### Dependency Injection

```typescript
// Using TSyringe container
import { injectable, inject, container } from 'tsyringe';

// Register dependencies
container.register('IUserRepository', {
  useClass: UserRepository,
});

container.register('IUserService', {
  useClass: UserService,
});

// Inject dependencies
@injectable()
class AuthController {
  constructor(
    @inject('IUserService') private userService: IUserService,
    @inject('IPasetoService') private pasetoService: IPasetoService
  ) {}
}
```

### Factory Pattern

```typescript
// Factory for creating token strategies
interface TokenStrategyFactory {
  createStrategy(type: 'paseto' | 'jwt'): TokenStrategy;
}

class PasetoTokenStrategyFactory implements TokenStrategyFactory {
  createStrategy(type: 'paseto'): TokenStrategy {
    return new PasetoStrategy();
  }
}
```

### Strategy Pattern

```typescript
// Validation strategies
interface ValidationStrategy {
  validate(data: unknown): ValidationResult;
}

class CreateUserValidationStrategy implements ValidationStrategy {
  validate(data: unknown): ValidationResult {
    return createUserSchema.parse(data);
  }
}

class UpdateUserValidationStrategy implements ValidationStrategy {
  validate(data: unknown): ValidationResult {
    return updateUserSchema.parse(data);
  }
}
```

---

## Module Organization

### Folder Structure

```
src/
├── core/                   # Framework-agnostic core utilities
│   ├── paseto/            # PASETO implementation
│   ├── crypto/            # Cryptographic utilities
│   ├── logging/           # Logging infrastructure
│   ├── validation/        # Shared validation schemas
│   └── events/            # Domain events system
│
├── database/              # Database layer
│   ├── connection.ts      # Database connection pool
│   ├── schema/            # Drizzle ORM schemas
│   └── migrations/        # Migration files
│
├── repositories/          # Data access layer
│   ├── base.repository.ts
│   ├── users.repository.ts
│   └── products.repository.ts
│
├── services/              # Business logic layer
│   ├── interfaces/        # Service interfaces
│   ├── auth.service.ts
│   ├── users.service.ts
│   └── products.service.ts
│
├── controllers/           # Request/response handling
│   ├── auth.controller.ts
│   ├── users.controller.ts
│   └── products.controller.ts
│
├── routes/                # API route definitions
│   ├── dto/               # Request/response DTOs
│   ├── auth.routes.ts
│   ├── users.routes.ts
│   └── products.routes.ts
│
└── middlewares/           # Elysia middleware
    ├── auth.middleware.ts
    ├── rate-limit.middleware.ts
    └── error.middleware.ts
```

### Module Boundaries

| Module           | Public API            | Internal                    |
| ---------------- | --------------------- | --------------------------- |
| **Core**         | Interfaces, utilities | Implementation details      |
| **Database**     | Connection, schema    | Internal queries            |
| **Repositories** | Interfaces            | Implementation              |
| **Services**     | Interfaces            | Business logic              |
| **Controllers**  | N/A                   | All (internal to API layer) |

---

## Data Flow

### Create User Flow

```
POST /api/auth/register
       │
       ▼
┌─────────────────────────────────────────────────────────────┐
│ 1. Route Layer (auth.routes.ts)                             │
│    - Parse request body                                      │
│    - Apply rate limiting middleware                           │
│    - Extract register data                                   │
└─────────────────────────────────────────────────────────────┘
       │
       ▼
┌─────────────────────────────────────────────────────────────┐
│ 2. Controller Layer (auth.controller.ts)                     │
│    - Validate DTO with Zod                                   │
│    - Call service layer                                      │
│    - Format response                                         │
└─────────────────────────────────────────────────────────────┘
       │
       ▼
┌─────────────────────────────────────────────────────────────┐
│ 3. Service Layer (auth.service.ts)                           │
│    - Check if user exists                                    │
│    - Hash password with Argon2                               │
│    - Create user record                                      │
│    - Generate PASETO tokens                                  │
│    - Create refresh token session                            │
└─────────────────────────────────────────────────────────────┘
       │
       ▼
┌─────────────────────────────────────────────────────────────┐
│ 4. Repository Layer (users.repository.ts)                    │
│    - Execute INSERT query                                    │
│    - Return created user                                     │
└─────────────────────────────────────────────────────────────┘
       │
       ▼
┌─────────────────────────────────────────────────────────────┐
│ 5. Database (PostgreSQL)                                     │
│    - Persist user record                                     │
│    - Return inserted data                                    │
└─────────────────────────────────────────────────────────────┘
       │
       ▼
Response: 201 Created + user data + tokens
```

---

## Error Handling

### Error Hierarchy

```
AppError (base)
    ├── ValidationError
    │   └── ZodValidationError
    ├── AuthenticationError
    │   ├── InvalidCredentialsError
    │   ├── TokenExpiredError
    │   └── InvalidTokenError
    ├── AuthorizationError
    │   └── ForbiddenError
    ├── NotFoundError
    │   ├── UserNotFoundError
    │   └── ProductNotFoundError
    └── ConflictError
        ├── UserExistsError
        └── EmailInUseError
```

### Error Handling Pattern

```typescript
// ✅ Good: Specific error types
async function registerUser(dto: RegisterDto): Promise<User> {
  const existing = await this.userRepository.findByEmail(dto.email);
  if (existing) {
    throw new UserExistsError(dto.email);
  }

  return await this.userRepository.create(dto);
}

// ✅ Good: Handle errors at appropriate layer
async function handleRegister(context: Context): Promise<Response> {
  try {
    const user = await authService.register(dto);
    return successResponse(user, 'User registered');
  } catch (error) {
    if (error instanceof UserExistsError) {
      return errorResponse('User already exists', 'USER_EXISTS', 409);
    }
    throw error; // Let global error handler deal with it
  }
}
```

---

## Dependency Management

### Dependency Injection Container

```typescript
// Container configuration
container.register('IUserRepository', {
  useClass: UserRepository,
  lifecycle: Lifecycle.Singleton,
});

container.register('IUserService', {
  useClass: UserService,
  lifecycle: Lifecycle.Singleton,
});

container.register('Database', {
  useFactory: () => getConnection(),
  lifecycle: Lifecycle.Singleton,
});
```

### Circular Dependency Prevention

```typescript
// ❌ Bad: Circular dependency
class UserService {
  constructor(private productService: ProductService) {}
}

class ProductService {
  constructor(private userService: UserService) {}
}

// ✅ Good: Extract shared logic
class UserService {
  constructor(
    private orderService: IOrderService,
    private productRepository: IProductRepository
  ) {}
}

class ProductService {
  constructor(private productRepository: IProductRepository) {}
}

class OrderService {
  constructor(
    private userService: IUserService,
    private productService: IProductService
  ) {}
}
```

---

## Security Architecture

### Security Layers

```
┌─────────────────────────────────────────────────────────────┐
│                     Security Layers                          │
├─────────────────────────────────────────────────────────────┤
│ 1. Network Layer                                            │
│    - HTTPS enforcement                                      │
│    - CORS configuration                                     │
│    - Rate limiting                                          │
├─────────────────────────────────────────────────────────────┤
│ 2. Authentication Layer                                     │
│    - PASETO token validation                                │
│    - Session management                                     │
│    - Password hashing (Argon2)                              │
├─────────────────────────────────────────────────────────────┤
│ 3. Authorization Layer                                      │
│    - Role-based access control (RBAC)                       │
│    - Resource-level permissions                             │
│    - Ownership verification                                 │
├─────────────────────────────────────────────────────────────┤
│ 4. Input Validation Layer                                   │
│    - Zod schema validation                                  │
│    - SQL injection prevention (parameterized queries)       │
│    - XSS prevention                                         │
├─────────────────────────────────────────────────────────────┤
│ 5. Data Layer                                               │
│    - Encrypted data at rest (optional)                      │
│    - Principle of least privilege (database users)          │
│    - Audit logging                                          │
└─────────────────────────────────────────────────────────────┘
```

---

## Checklist

Before committing code:

- [ ] Follows SOLID principles
- [ ] Respects layer boundaries
- [ ] Uses appropriate design patterns
- [ ] Handles errors properly
- [ ] Uses dependency injection
- [ ] Validates inputs
- [ ] Logs important operations
- [ ] Includes appropriate tests
- [ ] Follows naming conventions
- [ ] Documented complex logic

---

**Last Updated:** 2026-03-26

**Version:** 1.0.0
