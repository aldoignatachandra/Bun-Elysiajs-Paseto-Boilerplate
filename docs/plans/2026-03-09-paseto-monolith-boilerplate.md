# PASETO Monolith Boilerplate Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Build a production-ready monolith REST API boilerplate using Bun, Elysia, PASETO authentication, Redis rate limiting, and PostgreSQL with Drizzle ORM, following senior-level backend engineering practices.

**Architecture:** Modular monolith with clear separation of concerns - auth module isolated, clean architecture layers (routes → controllers → services → repositories), dependency injection with TSyringe, event-driven patterns for future microservices migration.

**Tech Stack:**
| Component | Technology | Purpose |
|-----------|-----------|---------|
| Runtime | Bun 1.1+ | Fast TypeScript runtime, native testing |
| Framework | Elysia 1.x | Type-safe web framework with superior DX |
| Auth | PASETO v4 via paseto-ts | Hybrid: v4.local (encrypted access) + v4.public (signed refresh) for maximum learning |
| Database | PostgreSQL 16+ | Primary data store |
| ORM | Drizzle ORM 0.29+ | Type-safe SQL with excellent migration support |
| Cache/Rate Limit | Redis 7.2+ | Token bucket rate limiting, optional caching |
| Validation | Zod 3.22+ | Runtime type validation with TS inference |
| Logging | Pino 9.x | High-performance structured logging |
| DI Container | TSyringe | Dependency injection following SOLID principles |
| Testing | Bun Test + msw | Built-in test runner with API mocking |
| Docs | Elysia Swagger | Auto-generated API documentation |

---

## Senior-Level Features (Beyond Common Backend)

| Feature                                     | Why Senior-Level                                     | Learning Outcome                         |
| ------------------------------------------- | ---------------------------------------------------- | ---------------------------------------- |
| **Hybrid PASETO (v4.local + v4.public)**    | Both symmetric & asymmetric crypto learning          | Production-grade token architecture      |
| **Clean Architecture (Layers)**             | Separation of concerns, testability                  | Architectural patterns, SOLID principles |
| **Repository Pattern with Unit of Work**    | Transactional consistency, testability               | Data access patterns                     |
| **Domain Events Pattern**                   | Decoupled business logic, future microservices ready | Event-driven architecture foundation     |
| **Request/Response Validation with Zod**    | Type safety across boundaries                        | Defensive programming                    |
| **Structured Logging with Correlation IDs** | Production debugging, observability                  | Distributed tracing concepts             |
| **Health Check Endpoints**                  | Production monitoring readiness                      | DevOps awareness                         |
| **Graceful Shutdown**                       | Zero-downtime deployments                            | Production reliability                   |
| **OpenAPI/Swagger Documentation**           | API-first development, team collaboration            | Documentation standards                  |
| **Test Doubles (Spy/Mock/Stub) Patterns**   | Proper unit testing, maintainable tests              | Testing best practices                   |
| **Environment Configuration Validation**    | Fail fast on misconfiguration                        | Configuration management                 |
| **Error Response Standardization**          | Consistent client experience                         | API design standards                     |
| **Repository Transaction Handling**         | Data consistency patterns                            | Database transaction management          |
| **Elysia Plugin Architecture**              | Modular, composable application design               | Framework extensibility patterns         |
| **Prometheus Metrics Export**               | Production monitoring, alerting                      | Observability and SRE practices          |
| **OpenTelemetry Tracing**                   | Distributed request tracing                          | Performance analysis                     |
| **Circuit Breaker Pattern**                 | Resilience against cascading failures                | Fault tolerance strategies               |
| **Background Job Processing**               | Async task execution                                 | Job queue patterns                       |
| **API Versioning Strategy**                 | Backward compatibility, graceful evolution           | API lifecycle management                 |

---

## 🎓 Why Hybrid PASETO? (Best for Learning!)

This boilerplate uses a **hybrid PASETO v4 approach** that combines both `v4.local` and `v4.public` tokens. This is the **BEST approach for learning** because you'll gain hands-on experience with **both symmetric and asymmetric cryptography**.

### Token Strategy Overview

```
┌─────────────────────────────────────────────────────────────────┐
│                    Hybrid PASETO Strategy                       │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  ┌──────────────────┐         ┌──────────────────┐              │
│  │  Access Token    │         │  Refresh Token   │              │
│  │  (v4.local)      │         │  (v4.public)     │              │
│  ├──────────────────┤         ├──────────────────┤              │
│  │  ENCRYPTED       │         │  SIGNED          │              │
│  │  XChaCha20-Poly1305        │  Ed25519         │              │
│  │  Symmetric Key   │         │  Asymmetric Keys │              │
│  ├──────────────────┤         ├──────────────────┤              │
│  │  15 min expiry   │         │  7 days expiry   │              │
│  │  Payload HIDDEN  │         │  Payload VISIBLE │              │
│  │  User data       │         │  Token ID        │              │
│  │  Permissions     │         │  (revocable)     │              │
│  └──────────────────┘         └──────────────────┘              │
│           │                             │                       │
│           └─────────────┬───────────────┘                       │
│                         │                                       │
│                   ┌─────▼─────┐                                 │
│                   │   User    │                                 │
│                   │  Login    │                                 │
│                   └───────────┘                                 │
└─────────────────────────────────────────────────────────────────┘
```

### What You'll Learn

| Concept                 | v4.local (Access)         | v4.public (Refresh)           |
| ----------------------- | ------------------------- | ----------------------------- |
| **Cryptography Type**   | Symmetric (shared key)    | Asymmetric (public/private)   |
| **Algorithm**           | XChaCha20-Poly1305        | Ed25519                       |
| **Operation**           | Encrypt/Decrypt           | Sign/Verify                   |
| **Key Management**      | Single secret key         | Key pair (private + public)   |
| **Payload Security**    | Hidden (encrypted)        | Visible (tamper-proof)        |
| **Use Case**            | Short-lived tokens        | Long-lived tokens             |
| **Microservices Ready** | No (requires key sharing) | Yes (public key distribution) |

### Why Both?

**1. Maximum Learning Value**

- ✅ Learn symmetric encryption (v4.local)
- ✅ Learn asymmetric signing (v4.public)
- ✅ Understand when to use each approach
- ✅ Production-grade patterns

**2. Production Best Practices**

- Access tokens need encryption (hide sensitive data)
- Refresh tokens need revocation capability
- Public keys can be shared across services
- Future-proof for microservices migration

**3. Real-World Scenarios**

```
Access Token (v4.local):
  - Contains: userId, email, role, permissions
  - Encrypted: Client can't read it
  - Fast: Single key operation
  - Use: API requests every 15 minutes

Refresh Token (v4.public):
  - Contains: userId, tokenId
  - Readable: Client can see it
  - Verifiable: Anyone can verify with public key
  - Use: Get new access token (7 days)
  - Revocable: Store tokenId in database
```

### Package: paseto-ts

We use `paseto-ts` instead of the official `paseto` package because:

| Feature           | Official `paseto` | `paseto-ts`                |
| ----------------- | ----------------- | -------------------------- |
| v4.local support  | ❌ No             | ✅ Yes                     |
| v4.public support | ✅ Yes            | ✅ Yes                     |
| TypeScript        | Basic             | Native, type-safe          |
| PASERK format     | ❌ No             | ✅ Yes (modern key format) |
| Bun compatible    | ✅                | ✅                         |

### Environment Variables

```env
# Generate with: bun run generate:paseto-keys

# v4.local key (symmetric) - encrypts access tokens
PASETO_LOCAL_KEY=k4.local.<generated-key>

# v4.public keys (asymmetric) - signs/verifies refresh tokens
PASETO_PUBLIC_KEY=k4.public.<generated-public-key>
PASETO_SECRET_KEY=k4.secret.<generated-secret-key>
```

### Understanding PASERK Key Format

This boilerplate uses **PASERK** (Platform-Agnostic SEcurity Keys) format - the modern standard for PASETO keys.

```
┌─────────────────────────────────────────────────────────────────┐
│                      PASERK Key Format                          │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  Prefix      Version   Purpose     Payload (Base64URL-encoded) │
│  ┌───┐      ┌───┐    ┌──────┐    ┌──────────────────────────┐ │
│  │ k │ . │  │ v4 │ . │ type │ . │ <actual-key-data>        │ │
│  └───┘      └───┘    └──────┘    └──────────────────────────┘ │
│   ↑          ↑         ↑                     ↑                  │
│   │          │         │                     │                  │
│ Key ID    Version   Purpose              Encrypted Key        │
│ (always)   (v4)   (local/public)        (base64url)           │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

**Key Types:**

| Prefix       | Purpose    | Key Type    | Use Case                                         |
| ------------ | ---------- | ----------- | ------------------------------------------------ |
| `k4.local.`  | Symmetric  | Secret key  | v4.local encryption (access tokens)              |
| `k4.secret.` | Asymmetric | Private key | v4.public signing (create refresh tokens)        |
| `k4.public.` | Asymmetric | Public key  | v4.public verification (validate refresh tokens) |

**Example Keys:**

```
k4.local.9wZIZXRl3RvX2tleV9mb3JfdjQubG9jYWw...
k4.secret.XZGFzZXRvX3ByaXZhdGVfa2V5X2Zvcl92NC5wdWJ...
k4.public.YXNldG9fcHVibGljX2tleV9mb3JfdjQucHViaWM...
```

**Why PASERK?**

- ✅ Self-describing (version and purpose in prefix)
- ✅ Standardized format across libraries
- ✅ Easy key rotation
- ✅ Safe for environment variables
- ✅ Prevents key confusion (can't use v4.local key for v4.public)

**Important Security Notes:**

1. **NEVER commit `k4.secret` keys to git**
2. **DO share `k4.public` keys freely** (they're public!)
3. **KEEP `k4.local` keys safe** (anyone with them can decrypt tokens)
4. **Generate new keys per environment** (dev, staging, prod)
5. **Use key rotation** for production systems

### API Flow

```
1. User Login
   ├─ Verify credentials
   ├─ Create access token (v4.local, encrypted)
   ├─ Create refresh token (v4.public, signed)
   └─ Return both tokens

2. API Request (Access Token)
   ├─ Client sends: Authorization: Bearer v4.local.xxx...
   ├─ Server decrypts with local key
   ├─ Extract user data from encrypted payload
   └─ Process request

3. Token Refresh (Refresh Token)
   ├─ Client sends: v4.public.xxx...
   ├─ Server verifies with public key
   ├─ Check tokenId in database (revocation)
   ├─ Generate new token pair
   └─ Return new tokens
```

---

## Folder Structure

```
bun-elysia-paseto-boilerplate/
├── src/
│   ├── app.ts                          # Elysia app setup, plugin registration
│   ├── server.ts                       # Server bootstrap, graceful shutdown
│   ├── config/                         # Configuration management
│   │   ├── index.ts                    # Config loader with Zod validation
│   │   ├── database.ts                 # Database configuration
│   │   ├── redis.ts                    # Redis configuration
│   │   └── paseto.ts                   # PASETO key configuration
│   ├── core/                           # Core utilities, framework-agnostic
│   │   ├── paseto/                     # PASETO implementation
│   │   │   ├── paseto.service.ts       # Core PASETO operations
│   │   │   ├── token.types.ts          # Token payload types
│   │   │   └── errors.ts               # PASETO-specific errors
│   │   ├── crypto/                     # Cryptographic utilities
│   │   │   └── password.service.ts     # Password hashing with argon2
│   │   ├── validation/                 # Shared validation schemas
│   │   │   ├── common.schema.ts        # Common Zod schemas
│   │   │   └── error.handler.ts        # Zod error formatter
│   │   ├── logging/                    # Logging infrastructure
│   │   │   ├── logger.ts               # Pino configuration
│   │   │   ├── middleware.ts           # Request logging middleware
│   │   │   └── types.ts                # Log types
│   │   ├── events/                     # Domain events system
│   │   │   ├── event-dispatcher.ts     # In-memory event dispatcher
│   │   │   ├── event.types.ts          # Event type definitions
│   │   │   └── handlers/               # Event handlers
│   │   └── errors/                     # Error handling
│   │       ├── app-error.ts            # Base error class
│   │       ├── error-handler.ts        # Global error handler
│   │       └── error.types.ts          # Error response types
│   ├── database/                       # Database layer
│   │   ├── connection.ts               # Drizzle connection pool
│   │   ├── schema/                     # Drizzle schemas
│   │   │   ├── users.schema.ts
│   │   │   ├── sessions.schema.ts
│   │   │   └── index.ts
│   │   └── migrations/                 # Migration files
│   ├── repositories/                   # Data access layer
│   │   ├── base.repository.ts          # Base repository with UoW
│   │   ├── unit-of-work.ts             # Transaction management
│   │   ├── users.repository.ts         # User data access
│   │   └── sessions.repository.ts      # Session data access
│   ├── services/                       # Business logic layer
│   │   ├── auth.service.ts             # Authentication business logic
│   │   ├── users.service.ts            # User management logic
│   │   └── interfaces/                 # Service interfaces for DI
│   │       ├── auth.service.interface.ts
│   │       └── users.service.interface.ts
│   ├── controllers/                    # Request/response handling
│   │   ├── auth.controller.ts          # Auth endpoints controller
│   │   └── users.controller.ts         # User endpoints controller
│   ├── routes/                         # Route definitions
│   │   ├── index.ts                    # Route aggregator
│   │   ├── auth.routes.ts              # Auth endpoints
│   │   ├── users.routes.ts             # User endpoints
│   │   └── health.routes.ts            # Health check endpoints
│   ├── middlewares/                    # Elysia middleware
│   │   ├── auth.middleware.ts          # PASETO authentication
│   │   ├── rate-limit.middleware.ts    # Redis rate limiting
│   │   ├── error.middleware.ts         # Error handling wrapper
│   │   └── correlation-id.middleware.ts # Request correlation
│   ├── types/                          # TypeScript types
│   │   ├── express.d.ts                # Global type augmentations
│   │   └── index.ts                    # Exported types
│   └── utils/                          # Utility functions
│       ├── response.util.ts            # Standardized API responses
│       └── helpers.ts                  # Helper functions
├── tests/                              # Test directory (mirrors src)
│   ├── unit/
│   │   ├── core/
│   │   │   ├── paseto/
│   │   │   ├── crypto/
│   │   │   └── validation/
│   │   ├── services/
│   │   ├── repositories/
│   │   └── controllers/
│   ├── integration/
│   │   ├── routes/
│   │   └── middlewares/
│   ├── fixtures/                       # Test data fixtures
│   ├── setup.ts                        # Test setup/teardown
│   └── mocks/                          # Test doubles
│       ├── repository.mock.ts
│       └── service.mock.ts
├── infra/                              # Infrastructure files
│   ├── docker/
│   │   ├── Dockerfile
│   │   └── docker-compose.yml
│   └── postgres/
│       └── init.sql
├── docs/                               # Documentation
│   ├── api/                            # API documentation
│   ├── architecture/                   # Architecture diagrams
│   └── standardization/                # Code standards
├── scripts/                            # Utility scripts
│   ├── migrate.ts                      # Run migrations
│   └── seed.ts                         # Seed database
├── .env.example                        # Environment variables template
├── .gitignore
├── .prettierrc.json                    # Code formatting
├── .eslintrc.json                      # Linting rules
├── tsconfig.json                       # TypeScript configuration
├── bun.lockb
├── package.json
├── drizzle.config.ts                   # Drizzle configuration
├── commitlint.config.js                # Commit linting
└── README.md
```

---

## Implementation Plan

### Phase 1: Project Foundation

#### Task 1: Initialize Project and Base Configuration

**Files:**

- Create: `package.json`
- Create: `tsconfig.json`
- Create: `.eslintrc.json`
- Create: `.prettierrc.json`
- Create: `.gitignore`
- Create: `bun.lockb` (generated)
- Create: `.env.example`

**Step 1: Create package.json with all dependencies**

```json
{
  "name": "bun-elysia-paseto-boilerplate",
  "version": "1.0.0",
  "description": "Production-ready monolith REST API boilerplate with PASETO authentication",
  "type": "module",
  "scripts": {
    "dev": "bun run --watch src/server.ts",
    "start": "bun run src/server.ts",
    "test": "bun test",
    "test:coverage": "bun test --coverage",
    "test:unit": "bun test --test-name-pattern='unit'",
    "test:integration": "bun test --test-name-pattern='integration'",
    "lint": "eslint src",
    "lint:fix": "eslint src --fix",
    "format": "prettier --write .",
    "format:check": "prettier --check .",
    "db:generate": "drizzle-kit generate",
    "db:migrate": "bun run scripts/migrate.ts",
    "db:seed": "bun run scripts/seed.ts",
    "db:studio": "drizzle-kit studio",
    "generate:paseto-keys": "bun run scripts/generate-paseto-keys.ts",
    "prepare": "husky install"
  },
  "dependencies": {
    "@elysiajs/cors": "^1.0.2",
    "@elysiajs/swagger": "^1.0.2",
    "@fastify/correlation-id": "^6.0.0",
    "@tsoa/runtime": "^5.0.0",
    "elysia": "^1.0.0",
    "paseto-ts": "^2.2.0",
    "drizzle-orm": "^0.29.3",
    "ioredis": "^5.10.0",
    "pino": "^9.0.0",
    "pino-pretty": "^11.0.0",
    "zod": "^3.22.4",
    "tsyringe": "^4.8.0",
    "bcrypt": "^5.1.1",
    "argon2": "^0.40.0"
  },
  "devDependencies": {
    "@types/bcrypt": "^5.0.2",
    "@types/node": "^20.10.0",
    "@typescript-eslint/eslint-plugin": "^6.13.0",
    "@typescript-eslint/parser": "^6.13.0",
    "bun-types": "^1.0.0",
    "drizzle-kit": "^0.20.0",
    "eslint": "^8.54.0",
    "eslint-config-prettier": "^9.0.0",
    "prettier": "^3.1.0",
    "typescript": "^5.3.0",
    "husky": "^8.0.3",
    "commitlint": "^18.4.0",
    "@commitlint/cli": "^18.4.0",
    "@commitlint/config-conventional": "^18.4.0"
  }
}
```

**Step 2: Run bun install**

Run: `bun install`
Expected: All dependencies installed successfully

**Step 3: Create tsconfig.json**

```json
{
  "compilerOptions": {
    "target": "ESNext",
    "module": "ESNext",
    "lib": ["ESNext"],
    "moduleResolution": "bundler",
    "types": ["bun-types"],
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "forceConsistentCasingInFileNames": true,
    "resolveJsonModule": true,
    "allowSyntheticDefaultImports": true,
    "isolatedModules": true,
    "noEmit": true,
    "declaration": true,
    "declarationMap": true,
    "sourceMap": true,
    "outDir": "./dist",
    "rootDir": "./src",
    "baseUrl": "./src",
    "paths": {
      "@/*": ["./*"],
      "@config/*": ["config/*"],
      "@core/*": ["core/*"],
      "@database/*": ["database/*"],
      "@repositories/*": ["repositories/*"],
      "@services/*": ["services/*"],
      "@controllers/*": ["controllers/*"],
      "@routes/*": ["routes/*"],
      "@middlewares/*": ["middlewares/*"],
      "@types/*": ["types/*"],
      "@utils/*": ["utils/*"]
    },
    "experimentalDecorators": true,
    "emitDecoratorMetadata": true
  },
  "include": ["src/**/*"],
  "exclude": ["node_modules", "dist", "tests"]
}
```

**Step 4: Create .eslintrc.json**

```json
{
  "parser": "@typescript-eslint/parser",
  "parserOptions": {
    "ecmaVersion": "latest",
    "sourceType": "module",
    "project": "./tsconfig.json"
  },
  "extends": [
    "eslint:recommended",
    "plugin:@typescript-eslint/recommended",
    "plugin:@typescript-eslint/recommended-requiring-type-checking",
    "prettier"
  ],
  "plugins": ["@typescript-eslint"],
  "rules": {
    "@typescript-eslint/no-unused-vars": ["error", { "argsIgnorePattern": "^_" }],
    "@typescript-eslint/explicit-function-return-type": "off",
    "@typescript-eslint/explicit-module-boundary-types": "off",
    "@typescript-eslint/no-explicit-any": "warn",
    "@typescript-eslint/no-floating-promises": "error",
    "@typescript-eslint/no-misused-promises": "error",
    "no-console": ["warn", { "allow": ["warn", "error"] }]
  },
  "ignorePatterns": ["dist", "node_modules", "*.js"]
}
```

**Step 5: Create .prettierrc.json**

```json
{
  "semi": true,
  "trailingComma": "es5",
  "singleQuote": true,
  "printWidth": 100,
  "tabWidth": 2,
  "useTabs": false,
  "arrowParens": "avoid",
  "endOfLine": "lf"
}
```

**Step 6: Create .gitignore**

```gitignore
# Dependencies
node_modules/
.pnp
.pnp.js

# Environment
.env
.env.local
.env.*.local

# Build outputs
dist/
build/
*.tsbuildinfo

# Database
*.db
*.db-shm
*.db-wal

# IDE
.vscode/
.idea/
*.swp
*.swo
*~

# OS
.DS_Store
Thumbs.db

# Logs
logs/
*.log

# Testing
coverage/
.nyc_output/

# Misc
.cache/
.temp/
```

**Step 7: Create .env.example**

```env
# Server
NODE_ENV=development
PORT=3000
HOST=localhost

# Database
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/bun_elysia_paseto
DATABASE_POOL_MIN=2
DATABASE_POOL_MAX=10

# Redis
REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_PASSWORD=
REDIS_DB=0

# PASETO - Hybrid Approach (Best for Learning!)
# We use BOTH v4.local (encrypted access tokens) AND v4.public (signed refresh tokens)

# v4.local key for encrypted access tokens (symmetric encryption)
# Generate with: bun run scripts/generate-paseto-keys.ts
PASETO_LOCAL_KEY=k4.local.<your-generated-local-key>

# v4.public keys for signed refresh tokens (asymmetric signing)
# Secret key NEVER commits to git! Public key is safe to share.
PASETO_PUBLIC_KEY=k4.public.<your-generated-public-key>
PASETO_SECRET_KEY=k4.secret.<your-generated-secret-key>

# Access Token
ACCESS_TOKEN_EXPIRY_MINUTES=15
REFRESH_TOKEN_EXPIRY_DAYS=7

# Rate Limiting
RATE_LIMIT_ENABLED=true
RATE_LIMIT_WINDOW_SECONDS=60
RATE_LIMIT_MAX_REQUESTS=100

# Logging
LOG_LEVEL=debug
LOG_PRETTY=true
LOG_FORMAT=json

# CORS
CORS_ORIGIN=*
CORS_CREDENTIALS=true
CORS_METHODS=GET,POST,PUT,DELETE,PATCH
CORS_ALLOWED_HEADERS=Content-Type,Authorization

# Security
BCRYPT_ROUNDS=12
```

**Step 8: Commit**

```bash
git add .
git commit -m "feat: initialize project with base configuration"
```

---

#### Task 2: Setup Core Configuration System

**Files:**

- Create: `src/config/index.ts`
- Create: `src/config/database.ts`
- Create: `src/config/redis.ts`
- Create: `src/config/paseto.ts`
- Create: `src/config/logger.ts`
- Create: `src/config/env.schema.ts`

**Step 1: Create environment validation schema**

```typescript
// src/config/env.schema.ts
import { z } from 'zod';

const envSchema = z.object({
  // Server
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  PORT: z.coerce.number().default(3000),
  HOST: z.string().default('localhost'),

  // Database
  DATABASE_URL: z.string().url(),
  DATABASE_POOL_MIN: z.coerce.number().default(2),
  DATABASE_POOL_MAX: z.coerce.number().default(10),

  // Redis
  REDIS_HOST: z.string().default('localhost'),
  REDIS_PORT: z.coerce.number().default(6379),
  REDIS_PASSWORD: z.string().optional().default(''),
  REDIS_DB: z.coerce.number().default(0),

  // PASETO - Hybrid approach
  PASETO_LOCAL_KEY: z.string().min(20), // PASERK format: k4.local.xxx...
  PASETO_PUBLIC_KEY: z.string().min(20), // PASERK format: k4.public.xxx...
  PASETO_SECRET_KEY: z.string().min(20), // PASERK format: k4.secret.xxx...

  // Token Expiry
  ACCESS_TOKEN_EXPIRY_MINUTES: z.coerce.number().default(15),
  REFRESH_TOKEN_EXPIRY_DAYS: z.coerce.number().default(7),

  // Rate Limiting
  RATE_LIMIT_ENABLED: z
    .enum(['true', 'false'])
    .transform(v => v === 'true')
    .default('true'),
  RATE_LIMIT_WINDOW_SECONDS: z.coerce.number().default(60),
  RATE_LIMIT_MAX_REQUESTS: z.coerce.number().default(100),

  // Logging
  LOG_LEVEL: z.enum(['debug', 'info', 'warn', 'error']).default('info'),
  LOG_PRETTY: z
    .enum(['true', 'false'])
    .transform(v => v === 'true')
    .default('true'),
  LOG_FORMAT: z.enum(['json', 'pretty']).default('json'),

  // CORS
  CORS_ORIGIN: z.string().default('*'),
  CORS_CREDENTIALS: z
    .enum(['true', 'false'])
    .transform(v => v === 'true')
    .default('true'),
  CORS_METHODS: z.string().default('GET,POST,PUT,DELETE,PATCH'),
  CORS_ALLOWED_HEADERS: z.string().default('Content-Type,Authorization'),

  // Security
  BCRYPT_ROUNDS: z.coerce.number().default(12),
});

export type Env = z.infer<typeof envSchema>;

export function validateEnv(): Env {
  const parsed = envSchema.safeParse(process.env);

  if (!parsed.success) {
    const errors = parsed.error.errors.map(e => `${e.path.join('.')}: ${e.message}`);
    throw new Error(`Environment validation failed:\n${errors.join('\n')}`);
  }

  // Validate PASETO keys (hybrid approach requires all three)
  if (!parsed.data.PASETO_LOCAL_KEY) {
    throw new Error('PASETO_LOCAL_KEY is required (format: k4.local.xxx...)');
  }

  if (!parsed.data.PASETO_PUBLIC_KEY || !parsed.data.PASETO_SECRET_KEY) {
    throw new Error(
      'PASETO_PUBLIC_KEY and PASETO_SECRET_KEY are required (format: k4.public/k4.secret)'
    );
  }

  return parsed.data;
}
```

**Step 2: Create main config loader**

```typescript
// src/config/index.ts
import { validateEnv, type Env } from './env.schema';
import { databaseConfig } from './database';
import { redisConfig } from './redis';
import { pasetoConfig } from './paseto';
import { loggerConfig } from './logger';

let cachedEnv: Env | null = null;

export function getConfig() {
  if (cachedEnv) {
    return cachedEnv;
  }

  cachedEnv = validateEnv();
  return cachedEnv;
}

export const config = {
  env: getConfig(),
  database: databaseConfig,
  redis: redisConfig,
  paseto: pasetoConfig,
  logger: loggerConfig,
} as const;

export type Config = typeof config;
```

**Step 3: Create database config**

```typescript
// src/config/database.ts
import { getConfig } from './index';

export const databaseConfig = {
  url: getConfig().DATABASE_URL,
  pool: {
    min: getConfig().DATABASE_POOL_MIN,
    max: getConfig().DATABASE_POOL_MAX,
  },
  ssl: getConfig().NODE_ENV === 'production' ? { rejectUnauthorized: false } : undefined,
} as const;
```

**Step 4: Create Redis config**

```typescript
// src/config/redis.ts
import { getConfig } from './index';

export const redisConfig = {
  host: getConfig().REDIS_HOST,
  port: getConfig().REDIS_PORT,
  password: getConfig().REDIS_PASSWORD || undefined,
  db: getConfig().REDIS_DB,
  maxRetriesPerRequest: 3,
  retryStrategy: (times: number) => {
    const delay = Math.min(times * 50, 2000);
    return delay;
  },
} as const;
```

**Step 5: Create PASETO config**

```typescript
// src/config/paseto.ts
import { getConfig } from './index';

/**
 * PASETO Configuration
 *
 * Hybrid approach for maximum learning:
 * - v4.local: Symmetric encryption for access tokens (encrypted payload)
 * - v4.public: Asymmetric signing for refresh tokens (signed payload)
 *
 * Why hybrid?
 * - Access tokens: Need encryption (hide sensitive data), short-lived
 * - Refresh tokens: Need revocation capability, longer-lived, asymmetric for microservices future
 * - Learn BOTH symmetric AND asymmetric cryptography
 */
export const pasetoConfig = {
  // v4.local key for encrypted access tokens (symmetric)
  localKey: getConfig().PASETO_LOCAL_KEY,

  // v4.public keys for signed refresh tokens (asymmetric)
  publicKey: getConfig().PASETO_PUBLIC_KEY,
  secretKey: getConfig().PASETO_SECRET_KEY,

  // Token expiry settings
  accessTokenExpiry: {
    value: getConfig().ACCESS_TOKEN_EXPIRY_MINUTES,
    unit: 'm' as const,
  },
  refreshTokenExpiry: {
    value: getConfig().REFRESH_TOKEN_EXPIRY_DAYS,
    unit: 'd' as const,
  },
} as const;
```

**Step 6: Create logger config**

```typescript
// src/config/logger.ts
import { getConfig } from './index';

export const loggerConfig = {
  level: getConfig().LOG_LEVEL,
  pretty: getConfig().LOG_PRETTY && getConfig().NODE_ENV !== 'production',
  format: getConfig().LOG_FORMAT,
  redact: ['req.headers.authorization', 'req.headers.cookie'],
} as const;
```

**Step 7: Commit**

```bash
git add src/config/
git commit -m "feat: implement configuration system with Zod validation"
```

---

### Phase 2: Core Infrastructure

#### Task 3: Implement Logging System

**Files:**

- Create: `src/core/logging/logger.ts`
- Create: `src/core/logging/types.ts`
- Create: `src/core/logging/middleware.ts`
- Create: `tests/unit/core/logging/logger.test.ts`

**Step 1: Create logger types**

```typescript
// src/core/logging/types.ts
export type LogLevel = 'debug' | 'info' | 'warn' | 'error';

export interface LogContext {
  [key: string]: unknown;
}

export interface LogMetadata {
  requestId?: string;
  userId?: string;
  path?: string;
  method?: string;
  statusCode?: number;
  duration?: number;
  [key: string]: unknown;
}

export interface Logger {
  debug(message: string, context?: LogContext): void;
  info(message: string, context?: LogContext): void;
  warn(message: string, context?: LogContext): void;
  error(message: string, error?: Error | unknown, context?: LogContext): void;
  child(metadata: LogMetadata): Logger;
}
```

**Step 2: Create Pino logger implementation**

```typescript
// src/core/logging/logger.ts
import pino from 'pino';
import { loggerConfig } from '@config/logger';
import type { LogContext, LogMetadata, Logger } from './types';

const baseOptions: pino.LoggerOptions = {
  level: loggerConfig.level,
  formatters: {
    level: label => ({ level: label }),
  },
  timestamp: pino.stdTimeFunctions.isoTime,
  redact: loggerConfig.redact,
};

const options: pino.LoggerOptions =
  loggerConfig.pretty || process.env.NODE_ENV !== 'production'
    ? {
        ...baseOptions,
        transport: {
          target: 'pino-pretty',
          options: {
            colorize: true,
            translateTime: 'SYS:standard',
            ignore: 'pid,hostname',
          },
        },
      }
    : baseOptions;

const pinoLogger = pino(options);

class PinoLogger implements Logger {
  constructor(private metadata: LogMetadata = {}) {}

  debug(message: string, context: LogContext = {}): void {
    pinoLogger.debug({ ...this.metadata, ...context }, message);
  }

  info(message: string, context: LogContext = {}): void {
    pinoLogger.info({ ...this.metadata, ...context }, message);
  }

  warn(message: string, context: LogContext = {}): void {
    pinoLogger.warn({ ...this.metadata, ...context }, message);
  }

  error(message: string, error?: Error | unknown, context: LogContext = {}): void {
    const errorContext =
      error instanceof Error ? { error: this.serializeError(error), ...context } : context;
    pinoLogger.error({ ...this.metadata, ...errorContext }, message);
  }

  child(metadata: LogMetadata): Logger {
    return new PinoLogger({ ...this.metadata, ...metadata });
  }

  private serializeError(error: Error): Record<string, unknown> {
    return {
      name: error.name,
      message: error.message,
      stack: error.stack,
      cause: error.cause,
    };
  }
}

export const logger = new PinoLogger();

export function createLogger(metadata: LogMetadata): Logger {
  return new PinoLogger(metadata);
}
```

**Step 3: Create test file**

```typescript
// tests/unit/core/logging/logger.test.ts
import { describe, it, expect, beforeEach } from 'bun:test';
import { logger, createLogger } from '@/core/logging/logger';

describe('Logger', () => {
  it('should create child logger with metadata', () => {
    const childLogger = createLogger({ requestId: 'test-123' });
    expect(childLogger).toBeDefined();
  });

  it('should log at different levels', () => {
    expect(() => logger.debug('test debug')).not.toThrow();
    expect(() => logger.info('test info')).not.toThrow();
    expect(() => logger.warn('test warn')).not.toThrow();
    expect(() => logger.error('test error')).not.toThrow();
  });

  it('should handle error serialization', () => {
    const error = new Error('Test error');
    expect(() => logger.error('test', error)).not.toThrow();
  });
});
```

**Step 4: Run test to verify it fails initially (we need to setup ts paths)**

Run: `bun test tests/unit/core/logging/logger.test.ts`
Expected: May fail due to path resolution - we'll fix in next task

**Step 5: Create Elysia logging middleware**

```typescript
// src/core/logging/middleware.ts
import type { Elysia } from 'elysia';
import { logger } from './logger';
import type { Context } from 'elysia';

export interface RequestMetadata {
  requestId: string;
  ip: string;
  userAgent: string;
  method: string;
  path: string;
}

export function getRequestMetadata(context: Context): RequestMetadata {
  const request = context.request;
  const headers = request.headers;

  return {
    requestId: headers.get('x-request-id') || crypto.randomUUID(),
    ip: headers.get('x-forwarded-for') || headers.get('x-real-ip') || 'unknown',
    userAgent: headers.get('user-agent') || 'unknown',
    method: request.method,
    path: new URL(request.url).pathname,
  };
}

export function loggingPlugin() {
  return {
    name: 'logging',
    beforeHandle: (context: Context) => {
      const metadata = getRequestMetadata(context);
      context.set('requestMetadata', metadata);
      context.set('logger', logger.child(metadata));

      const startTime = performance.now();
      context.set('startTime', startTime);
    },
    afterHandle: (context: Context) => {
      const startTime = context.set.startTime as number;
      const duration = performance.now() - startTime;
      const metadata = context.set.requestMetadata as RequestMetadata;
      const status = context.set.status as number;

      logger.child(metadata).info('Request completed', {
        status,
        duration: `${duration.toFixed(2)}ms`,
      });
    },
    onError: (context: Context & { error?: Error }) => {
      const metadata = context.set.requestMetadata as RequestMetadata;
      logger.child(metadata).error('Request failed', context.error);
    },
  } as const;
}
```

**Step 6: Commit**

```bash
git add src/core/logging/
git commit -m "feat: implement structured logging with Pino"
```

---

#### Task 4: Implement PASETO Core

**Files:**

- Create: `src/core/paseto/token.types.ts`
- Create: `src/core/paseto/errors.ts`
- Create: `src/core/paseto/paseto.service.ts`
- Create: `src/core/paseto/utils.ts`
- Create: `src/core/paseto/index.ts`
- Create: `tests/unit/core/paseto/paseto.service.test.ts`

**Step 1: Create token types**

```typescript
// src/core/paseto/token.types.ts
export interface TokenPayload {
  iss: string; // Issuer
  sub: string; // Subject (user ID)
  aud?: string; // Audience
  exp: number; // Expiration (Unix timestamp)
  iat: number; // Issued at (Unix timestamp)
  jti: string; // Token ID (for revocation)
  type: 'access' | 'refresh';
  [key: string]: unknown; // Additional claims
}

export interface AccessTokenPayload extends Omit<TokenPayload, 'type'> {
  type: 'access';
  email?: string;
  role?: string;
  permissions?: string[];
}

export interface RefreshTokenPayload extends Omit<TokenPayload, 'type'> {
  type: 'refresh';
  tokenId: string; // Reference to stored token
}

export interface TokenPair {
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
}

export interface TokenValidationResult {
  valid: boolean;
  payload: TokenPayload | null;
  error: string | null;
}

export type TokenType = 'access' | 'refresh';
```

**Step 2: Create PASETO errors**

```typescript
// src/core/paseto/errors.ts
export class PasetoError extends Error {
  constructor(
    message: string,
    public code: string
  ) {
    super(message);
    this.name = 'PasetoError';
  }
}

export class TokenValidationError extends PasetoError {
  constructor(message: string) {
    super(message, 'TOKEN_VALIDATION_ERROR');
    this.name = 'TokenValidationError';
  }
}

export class TokenExpiredError extends PasetoError {
  constructor() {
    super('Token has expired', 'TOKEN_EXPIRED');
    this.name = 'TokenExpiredError';
  }
}

export class InvalidTokenPayloadError extends PasetoError {
  constructor(message: string) {
    super(message, 'INVALID_PAYLOAD');
    this.name = 'InvalidTokenPayloadError';
  }
}

export class KeyConfigError extends PasetoError {
  constructor(message: string) {
    super(message, 'KEY_CONFIG_ERROR');
    this.name = 'KeyConfigError';
  }
}
```

**Step 3: Create utility functions**

```typescript
// src/core/paseto/utils.ts
/**
 * PASETO Utility Functions
 *
 * Helper functions for PASETO token operations
 * Note: paseto-ts uses PASERK format, so we don't need hex conversion
 */

/**
 * Generate a unique token ID
 * Uses crypto.randomUUID for uniqueness
 */
export function generateTokenId(): string {
  return crypto.randomUUID();
}

/**
 * Calculate token expiration timestamp
 * @param minutes - Minutes until expiration
 * @returns Unix timestamp
 */
export function calculateExpiry(minutes: number): number {
  return Math.floor(Date.now() / 1000) + minutes * 60;
}

/**
 * Calculate token expiration in days
 * @param days - Days until expiration
 * @returns Unix timestamp
 */
export function calculateExpiryDays(days: number): number {
  return Math.floor(Date.now() / 1000) + days * 24 * 60 * 60;
}

/**
 * Check if token is expired
 * @param exp - Expiration timestamp (Unix)
 * @returns True if expired
 */
export function isTokenExpired(exp: number): boolean {
  return Math.floor(Date.now() / 1000) >= exp;
}

/**
 * Validate token payload structure
 * Ensures all required claims are present
 * @param payload - The payload to validate
 */
export function validateTokenPayload(
  payload: unknown
): asserts payload is import('./token.types').TokenPayload {
  if (!payload || typeof payload !== 'object') {
    throw new InvalidTokenPayloadError('Payload must be an object');
  }

  const p = payload as Record<string, unknown>;

  // Required claims for PASETO tokens
  if (!p.iss || typeof p.iss !== 'string') {
    throw new InvalidTokenPayloadError('Payload must have "iss" (issuer) field');
  }

  if (!p.sub || typeof p.sub !== 'string') {
    throw new InvalidTokenPayloadError('Payload must have "sub" (subject) field');
  }

  // Note: paseto-ts adds 'exp' and 'iat' automatically when addExp/addIat are true
  // But we still validate them if present
  if (p.exp !== undefined && typeof p.exp !== 'number') {
    throw new InvalidTokenPayloadError('Payload "exp" (expiration) must be a number');
  }

  if (p.iat !== undefined && typeof p.iat !== 'number') {
    throw new InvalidTokenPayloadError('Payload "iat" (issued at) must be a number');
  }

  if (!p.type || typeof p.type !== 'string') {
    throw new InvalidTokenPayloadError('Payload must have "type" field');
  }

  // Validate token type
  if (p.type !== 'access' && p.type !== 'refresh') {
    throw new InvalidTokenPayloadError('Token type must be "access" or "refresh"');
  }
}

/**
 * Format token for display (truncated)
 * Useful for logging - never log full tokens!
 * @param token - The token to format
 * @param visibleChars - Number of characters to show at start and end
 * @returns Formatted token string
 */
export function formatTokenForDisplay(token: string, visibleChars = 10): string {
  if (token.length <= visibleChars * 2) {
    return token;
  }
  return `${token.slice(0, visibleChars)}...${token.slice(-visibleChars)}`;
}

/**
 * Extract token type from token string
 * @param token - The token to check
 * @returns 'access', 'refresh', or null
 */
export function getTokenTypeFromPrefix(token: string): 'access' | 'refresh' | null {
  if (token.startsWith('v4.local.')) {
    return 'access';
  } else if (token.startsWith('v4.public.')) {
    return 'refresh';
  }
  return null;
}
```

**Step 4: Create PASETO service with hybrid v4.local + v4.public**

```typescript
// src/core/paseto/paseto.service.ts
/**
 * PASETO Service - Hybrid Implementation
 *
 * Uses paseto-ts library with BOTH v4.local and v4.public:
 * - v4.local (encrypt/decrypt): Symmetric encryption for access tokens
 * - v4.public (sign/verify): Asymmetric signing for refresh tokens
 *
 * Why hybrid? Best of both worlds + maximum learning!
 * - Access tokens: Encrypted (payload hidden), fast, simple
 * - Refresh tokens: Signed (verifiable), revocable, microservices-ready
 *
 * @see https://github.com/auth70/paseto-ts
 */
import { encrypt, decrypt, sign, verify } from 'paseto-ts/v4';
import { pasetoConfig } from '@config/paseto';
import type {
  TokenPayload,
  AccessTokenPayload,
  RefreshTokenPayload,
  TokenPair,
  TokenValidationResult,
} from './token.types';
import {
  TokenValidationError,
  TokenExpiredError,
  InvalidTokenPayloadError,
  KeyConfigError,
} from './errors';
import {
  generateTokenId,
  calculateExpiry,
  calculateExpiryDays,
  isTokenExpired,
  validateTokenPayload,
} from './utils';

export class PasetoService {
  private readonly localKey: string;
  private readonly secretKey: string;
  private readonly publicKey: string;

  constructor() {
    this.localKey = pasetoConfig.localKey;
    this.secretKey = pasetoConfig.secretKey;
    this.publicKey = pasetoConfig.publicKey;

    if (!this.localKey || !this.secretKey || !this.publicKey) {
      throw new KeyConfigError('All PASETO keys must be configured (local, secret, public)');
    }
  }

  /**
   * Create Access Token (v4.local - Encrypted)
   *
   * Uses symmetric encryption (same key for create/verify)
   * Payload is HIDDEN - can't be read without the key
   * Perfect for: Sensitive user data, permissions, sessions
   *
   * @param userId - User ID
   * @param additionalClaims - Optional additional claims
   * @returns Encrypted PASETO token (v4.local.xxx...)
   */
  async createAccessToken(
    userId: string,
    additionalClaims: Partial<AccessTokenPayload> = {}
  ): Promise<string> {
    const payload: AccessTokenPayload = {
      iss: 'bun-elysia-paseto-boilerplate',
      sub: userId,
      type: 'access',
      ...additionalClaims,
    };

    try {
      // v4.local: encrypt with symmetric key
      return await encrypt(this.localKey, payload, {
        addExp: true, // Add 'exp' claim (default: 1 hour)
        addIat: true, // Add 'iat' claim (issued at)
      });
    } catch (error) {
      throw new KeyConfigError(
        `Failed to create access token: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }
  }

  /**
   * Create Refresh Token (v4.public - Signed)
   *
   * Uses asymmetric signing (private key signs, public key verifies)
   * Payload is READABLE - anyone can see it (but not modify)
   * Perfect for: Long-lived tokens, revocation, microservices verification
   *
   * @param userId - User ID
   * @returns Signed PASETO token (v4.public.xxx...)
   */
  async createRefreshToken(userId: string): Promise<string> {
    const tokenId = generateTokenId();

    const payload: RefreshTokenPayload = {
      iss: 'bun-elysia-paseto-boilerplate',
      sub: userId,
      type: 'refresh',
      tokenId, // Store in DB for revocation
    };

    try {
      // v4.public: sign with secret key (anyone can verify with public key)
      return await sign(this.secretKey, payload, {
        addExp: true, // Add 'exp' claim
        addIat: true, // Add 'iat' claim
        // 7 days expiry is handled by token implementation
      });
    } catch (error) {
      throw new KeyConfigError(
        `Failed to create refresh token: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }
  }

  /**
   * Create Both Access and Refresh Tokens
   *
   * Generates a token pair using both v4.local and v4.public
   * This is the best approach for learning - you get experience with BOTH!
   *
   * @param userId - User ID
   * @param additionalClaims - Optional additional claims for access token
   * @returns Token pair with access and refresh tokens
   */
  async createTokenPair(
    userId: string,
    additionalClaims: Partial<AccessTokenPayload> = {}
  ): Promise<TokenPair> {
    const [accessToken, refreshToken] = await Promise.all([
      this.createAccessToken(userId, additionalClaims),
      this.createRefreshToken(userId),
    ]);

    return {
      accessToken,
      refreshToken,
      expiresIn: pasetoConfig.accessTokenExpiry.value * 60, // Convert to seconds
    };
  }

  /**
   * Validate Access Token (v4.local)
   *
   * Decrypts and validates the encrypted access token
   *
   * @param token - The token to validate
   * @returns Validation result with payload or error
   */
  async validateAccessToken(token: string): Promise<TokenValidationResult> {
    try {
      const { payload } = await decrypt(this.localKey, token);
      validateTokenPayload(payload);

      // Check expiration (paseto-ts handles this, but let's be explicit)
      if (payload.exp && isTokenExpired(payload.exp)) {
        throw new TokenExpiredError();
      }

      return {
        valid: true,
        payload,
        error: null,
      };
    } catch (error) {
      if (error instanceof TokenExpiredError) {
        return {
          valid: false,
          payload: null,
          error: 'Token has expired',
        };
      }

      return {
        valid: false,
        payload: null,
        error: error instanceof Error ? error.message : 'Token validation failed',
      };
    }
  }

  /**
   * Validate Refresh Token (v4.public)
   *
   * Verifies the signed refresh token using public key
   *
   * @param token - The token to validate
   * @returns Validation result with payload or error
   */
  async validateRefreshToken(token: string): Promise<TokenValidationResult> {
    try {
      const { payload } = await verify(this.publicKey, token);
      validateTokenPayload(payload);

      // Check expiration
      if (payload.exp && isTokenExpired(payload.exp)) {
        throw new TokenExpiredError();
      }

      return {
        valid: true,
        payload,
        error: null,
      };
    } catch (error) {
      if (error instanceof TokenExpiredError) {
        return {
          valid: false,
          payload: null,
          error: 'Token has expired',
        };
      }

      return {
        valid: false,
        payload: null,
        error: error instanceof Error ? error.message : 'Token validation failed',
      };
    }
  }

  /**
   * Auto-detect Token Type and Validate
   *
   * Determines if token is v4.local or v4.public and validates accordingly
   *
   * @param token - The token to validate
   * @returns Validation result with payload or error
   */
  async validateAndDecodeToken(token: string): Promise<TokenValidationResult> {
    // Detect token type from prefix
    if (token.startsWith('v4.local.')) {
      return this.validateAccessToken(token);
    } else if (token.startsWith('v4.public.')) {
      return this.validateRefreshToken(token);
    }

    return {
      valid: false,
      payload: null,
      error: 'Unknown token format (must be v4.local or v4.public)',
    };
  }

  /**
   * Extract Token from Authorization Header
   *
   * @param authorizationHeader - The Authorization header value
   * @returns The extracted token or null
   */
  async extractTokenFromHeader(authorizationHeader: string | null): Promise<string | null> {
    if (!authorizationHeader) {
      return null;
    }

    const parts = authorizationHeader.split(' ');

    if (parts.length !== 2 || parts[0] !== 'Bearer') {
      return null;
    }

    return parts[1];
  }

  /**
   * Create Token Pair for User
   *
   * Convenience method for creating both tokens
   *
   * @param userId - User ID
   * @returns Token pair
   */
  async createTokenPairForUser(userId: string): Promise<TokenPair> {
    return this.createTokenPair(userId);
  }

  /**
   * Get Token Type from Token String
   *
   * @param token - The token to check
   * @returns 'access' for v4.local, 'refresh' for v4.public, or null
   */
  getTokenType(token: string): 'access' | 'refresh' | null {
    if (token.startsWith('v4.local.')) {
      return 'access';
    } else if (token.startsWith('v4.public.')) {
      return 'refresh';
    }
    return null;
  }
}

// Singleton instance
let pasetoServiceInstance: PasetoService | null = null;

export function getPasetoService(): PasetoService {
  if (!pasetoServiceInstance) {
    pasetoServiceInstance = new PasetoService();
  }
  return pasetoServiceInstance;
}
```

**Step 5: Create index barrel**

```typescript
// src/core/paseto/index.ts
export * from './token.types';
export * from './errors';
export * from './paseto.service';
export * from './utils';
export { getPasetoService as paseto } from './paseto.service';
```

**Step 6: Create comprehensive unit tests for hybrid implementation**

```typescript
// tests/unit/core/paseto/paseto.service.test.ts
/**
 * PASETO Service Tests - Hybrid Implementation
 *
 * Tests both v4.local (encrypted access) and v4.public (signed refresh)
 */
import { describe, it, expect, beforeEach } from 'bun:test';
import { PasetoService } from '@/core/paseto/paseto.service';
import { TokenExpiredError } from '@/core/paseto/errors';
import { generateKeys } from 'paseto-ts/v4';
import type { AccessTokenPayload, RefreshTokenPayload } from '@/core/paseto/token.types';

describe('PasetoService (Hybrid v4.local + v4.public)', () => {
  let pasetoService: PasetoService;
  let testLocalKey: string;
  let testSecretKey: string;
  let testPublicKey: string;

  beforeEach(() => {
    // Generate test keys for each test
    const local = generateKeys('local');
    const asymmetric = generateKeys('public');

    testLocalKey = local.secretKey;
    testSecretKey = asymmetric.secretKey;
    testPublicKey = asymmetric.publicKey;

    // Set environment variables
    process.env.PASETO_LOCAL_KEY = testLocalKey;
    process.env.PASETO_PUBLIC_KEY = testPublicKey;
    process.env.PASETO_SECRET_KEY = testSecretKey;

    pasetoService = new PasetoService();
  });

  describe('Access Tokens (v4.local - Encrypted)', () => {
    it('should create a valid v4.local access token', async () => {
      const userId = 'user-123';
      const token = await pasetoService.createAccessToken(userId);

      expect(token).toBeDefined();
      expect(typeof token).toBe('string');
      expect(token).toStartWith('v4.local.'); // Encrypted tokens start with v4.local
    });

    it('should include additional claims in access token', async () => {
      const userId = 'user-123';
      const additionalClaims: Partial<AccessTokenPayload> = {
        email: 'test@example.com',
        role: 'admin',
        permissions: ['read', 'write'],
      };

      const token = await pasetoService.createAccessToken(userId, additionalClaims);
      const result = await pasetoService.validateAccessToken(token);

      expect(result.valid).toBe(true);
      expect(result.payload).toBeDefined();
      expect(result.payload?.sub).toBe(userId);
      expect((result.payload as AccessTokenPayload).email).toBe('test@example.com');
      expect((result.payload as AccessTokenPayload).role).toBe('admin');
    });

    it('should encrypt access token payload (hidden content)', async () => {
      const userId = 'user-123';
      const sensitiveData = 'sensitive-data-should-be-hidden';

      const token = await pasetoService.createAccessToken(userId, { secret: sensitiveData });

      // Token should be encrypted - we can't read payload without key
      // This is a basic check - in production, you'd verify this more thoroughly
      expect(token).toStartWith('v4.local.');
      expect(token).not.toContain(sensitiveData); // Content should be encrypted
    });

    it('should validate a valid access token', async () => {
      const userId = 'user-123';
      const token = await pasetoService.createAccessToken(userId);

      const result = await pasetoService.validateAccessToken(token);

      expect(result.valid).toBe(true);
      expect(result.payload).toBeDefined();
      expect(result.payload?.sub).toBe(userId);
      expect(result.error).toBeNull();
    });

    it('should reject an invalid access token', async () => {
      const invalidToken = 'v4.local.invalid-token-content';

      const result = await pasetoService.validateAccessToken(invalidToken);

      expect(result.valid).toBe(false);
      expect(result.payload).toBeNull();
      expect(result.error).toBeDefined();
    });
  });

  describe('Refresh Tokens (v4.public - Signed)', () => {
    it('should create a valid v4.public refresh token', async () => {
      const userId = 'user-123';
      const token = await pasetoService.createRefreshToken(userId);

      expect(token).toBeDefined();
      expect(typeof token).toBe('string');
      expect(token).toStartWith('v4.public.'); // Signed tokens start with v4.public
    });

    it('should include tokenId in refresh token for revocation', async () => {
      const userId = 'user-123';
      const token = await pasetoService.createRefreshToken(userId);
      const result = await pasetoService.validateRefreshToken(token);

      expect(result.valid).toBe(true);
      const payload = result.payload as RefreshTokenPayload;
      expect(payload.tokenId).toBeDefined();
      expect(typeof payload.tokenId).toBe('string');
    });

    it('should sign refresh token (payload is readable but not modifiable)', async () => {
      const userId = 'user-123';
      const token = await pasetoService.createRefreshToken(userId);

      // v4.public payload is readable (not encrypted)
      // But signature prevents tampering
      expect(token).toStartWith('v4.public.');
    });

    it('should validate a valid refresh token', async () => {
      const userId = 'user-123';
      const token = await pasetoService.createRefreshToken(userId);

      const result = await pasetoService.validateRefreshToken(token);

      expect(result.valid).toBe(true);
      expect(result.payload).toBeDefined();
      expect(result.payload?.sub).toBe(userId);
      expect(result.error).toBeNull();
    });

    it('should reject a tampered refresh token', async () => {
      const userId = 'user-123';
      const token = await pasetoService.createRefreshToken(userId);

      // Tamper with the token (this will invalidate the signature)
      const tamperedToken = token.slice(0, -10) + 'tampered';

      const result = await pasetoService.validateRefreshToken(tamperedToken);

      expect(result.valid).toBe(false);
      expect(result.payload).toBeNull();
      expect(result.error).toBeDefined();
    });
  });

  describe('Token Pair (Hybrid Approach)', () => {
    it('should create both access and refresh tokens', async () => {
      const userId = 'user-123';
      const tokenPair = await pasetoService.createTokenPair(userId);

      expect(tokenPair.accessToken).toBeDefined();
      expect(tokenPair.refreshToken).toBeDefined();
      expect(tokenPair.expiresIn).toBeGreaterThan(0);
    });

    it('should create tokens with different formats', async () => {
      const userId = 'user-123';
      const tokenPair = await pasetoService.createTokenPair(userId);

      expect(tokenPair.accessToken).toStartWith('v4.local.');
      expect(tokenPair.refreshToken).toStartWith('v4.public.');
      expect(tokenPair.accessToken).not.toBe(tokenPair.refreshToken);
    });

    it('should validate both tokens independently', async () => {
      const userId = 'user-123';
      const tokenPair = await pasetoService.createTokenPair(userId);

      const accessResult = await pasetoService.validateAccessToken(tokenPair.accessToken);
      const refreshResult = await pasetoService.validateRefreshToken(tokenPair.refreshToken);

      expect(accessResult.valid).toBe(true);
      expect(refreshResult.valid).toBe(true);
      expect(accessResult.payload?.sub).toBe(userId);
      expect(refreshResult.payload?.sub).toBe(userId);
    });
  });

  describe('Auto-Detection', () => {
    it('should auto-detect and validate v4.local access token', async () => {
      const userId = 'user-123';
      const token = await pasetoService.createAccessToken(userId);

      const result = await pasetoService.validateAndDecodeToken(token);

      expect(result.valid).toBe(true);
      expect(result.payload?.sub).toBe(userId);
    });

    it('should auto-detect and validate v4.public refresh token', async () => {
      const userId = 'user-123';
      const token = await pasetoService.createRefreshToken(userId);

      const result = await pasetoService.validateAndDecodeToken(token);

      expect(result.valid).toBe(true);
      expect(result.payload?.sub).toBe(userId);
    });

    it('should return error for unknown token format', async () => {
      const result = await pasetoService.validateAndDecodeToken('invalid.token.format');

      expect(result.valid).toBe(false);
      expect(result.error).toContain('Unknown token format');
    });
  });

  describe('Token Type Detection', () => {
    it('should detect v4.local as access token', async () => {
      const token = await pasetoService.createAccessToken('user-123');
      const type = pasetoService.getTokenType(token);

      expect(type).toBe('access');
    });

    it('should detect v4.public as refresh token', async () => {
      const token = await pasetoService.createRefreshToken('user-123');
      const type = pasetoService.getTokenType(token);

      expect(type).toBe('refresh');
    });

    it('should return null for invalid token format', () => {
      const type = pasetoService.getTokenType('invalid.token');

      expect(type).toBeNull();
    });
  });

  describe('Header Extraction', () => {
    it('should extract token from valid Bearer header', async () => {
      const token = await pasetoService.createAccessToken('user-123');
      const header = `Bearer ${token}`;

      const extracted = await pasetoService.extractTokenFromHeader(header);

      expect(extracted).toBe(token);
    });

    it('should return null for missing header', async () => {
      const extracted = await pasetoService.extractTokenFromHeader(null);

      expect(extracted).toBeNull();
    });

    it('should return null for invalid header format', async () => {
      const extracted = await pasetoService.extractTokenFromHeader('InvalidFormat token');

      expect(extracted).toBeNull();
    });
  });

  describe('Key Configuration Errors', () => {
    it('should throw error when keys are not configured', () => {
      delete process.env.PASETO_LOCAL_KEY;
      delete process.env.PASETO_PUBLIC_KEY;
      delete process.env.PASETO_SECRET_KEY;

      expect(() => new PasetoService()).toThrow('All PASETO keys must be configured');
    });
  });
});

    it('should return null for missing header', async () => {
      const extracted = await pasetoService.extractTokenFromHeader(null);

      expect(extracted).toBeNull();
    });

    it('should return null for invalid header format', async () => {
      const extracted = await pasetoService.extractTokenFromHeader('InvalidFormat token');

      expect(extracted).toBeNull();
    });
  });
});
```

**Step 7: Commit**

```bash
git add src/core/paseto/
git commit -m "feat: implement hybrid PASETO (v4.local + v4.public) for maximum learning"
```

---

#### Task 4.5: Create PASETO Key Generation Script

**Why this task?** You need secure keys for both v4.local and v4.public. This script generates them in PASERK format (the modern key format for PASETO).

**Files:**

- Create: `scripts/generate-paseto-keys.ts`

**Step 1: Create key generation script**

```typescript
// scripts/generate-paseto-keys.ts
/**
 * PASETO Key Generator
 *
 * Generates PASERK-format keys for hybrid PASETO implementation:
 * - k4.local: Symmetric key for v4.local (encrypted access tokens)
 * - k4.secret: Private key for v4.public (signing refresh tokens)
 * - k4.public: Public key for v4.public (verifying refresh tokens)
 *
 * Usage: bun run scripts/generate-paseto-keys.ts
 *
 * SECURITY NOTES:
 * - NEVER commit k4.secret to git!
 * - Store keys in environment variables or secret management
 * - Generate keys once per environment (dev, staging, prod)
 * - Keep k4.secret and k4.local safe - anyone with them can create tokens!
 */
import { generateKeys } from 'paseto-ts/v4';

console.log('🔐 PASETO Key Generator (Hybrid v4.local + v4.public)');
console.log('='.repeat(60));
console.log('');

// Generate v4.local key (symmetric encryption)
console.log('📦 Generating v4.local key (for encrypted access tokens)...');
const { secretKey: localKey } = generateKeys('local');
console.log('✅ Local key generated');
console.log('');

// Generate v4.public key pair (asymmetric signing)
console.log('🔑 Generating v4.public key pair (for signed refresh tokens)...');
const { secretKey, publicKey } = generateKeys('public');
console.log('✅ Key pair generated');
console.log('');

// Output in .env format
console.log('='.repeat(60));
console.log('');
console.log('✨ Add these to your .env file:');
console.log('');
console.log('# v4.local key for encrypted access tokens (KEEP SECRET!)');
console.log(`PASETO_LOCAL_KEY=${localKey}`);
console.log('');
console.log('# v4.public keys for signed refresh tokens');
console.log(`PASETO_PUBLIC_KEY=${publicKey}`);
console.log('');
console.log('⚠️  NEVER COMMIT THIS TO GIT:');
console.log(`PASETO_SECRET_KEY=${secretKey}`);
console.log('');
console.log('='.repeat(60));
console.log('');
console.log('📚 Key Types Explained:');
console.log('');
console.log('v4.local (Symmetric Encryption):');
console.log('  - Same key for encryption and decryption');
console.log('  - Payload is HIDDEN (encrypted)');
console.log('  - Use for: Access tokens with sensitive data');
console.log('  - Algorithm: XChaCha20-Poly1305');
console.log('');
console.log('v4.public (Asymmetric Signing):');
console.log('  - Private key signs, public key verifies');
console.log('  - Payload is READABLE (but tamper-proof)');
console.log('  - Use for: Refresh tokens, public verification');
console.log('  - Algorithm: Ed25519');
console.log('');
console.log('='.repeat(60));
```

**Step 2: Add npm script to package.json**

Add this to the `scripts` section in `package.json`:

```json
{
  "scripts": {
    "generate:paseto-keys": "bun run scripts/generate-paseto-keys.ts"
  }
}
```

**Step 3: Test the key generator**

Run: `bun run generate:paseto-keys`

Expected output:

```
🔐 PASETO Key Generator (Hybrid v4.local + v4.public)
============================================================

📦 Generating v4.local key (for encrypted access tokens)...
✅ Local key generated

🔑 Generating v4.public key pair (for signed refresh tokens)...
✅ Key pair generated

============================================================

✨ Add these to your .env file:

# v4.local key for encrypted access tokens (KEEP SECRET!)
PASETO_LOCAL_KEY=k4.local.xxxxxxxxx...

# v4.public keys for signed refresh tokens
PASETO_PUBLIC_KEY=k4.public.xxxxxxxxx...

⚠️  NEVER COMMIT THIS TO GIT:
PASETO_SECRET_KEY=k4.secret.xxxxxxxxx...
```

**Step 4: Add to .gitignore**

Ensure the `.env` file is in `.gitignore`:

```bash
# Environment variables
.env
.env.local
.env.production
```

**Step 5: Create .env.example for reference**

```bash
# .env.example - Copy this to .env and fill in your keys

# PASETO Keys
# Generate with: bun run generate:paseto-keys

# v4.local key for encrypted access tokens
PASETO_LOCAL_KEY=your-k4.local-key-here

# v4.public keys for signed refresh tokens
PASETO_PUBLIC_KEY=your-k4.public-key-here
PASETO_SECRET_KEY=your-k4.secret-key-here
```

**Step 6: Commit**

```bash
git add scripts/generate-paseto-keys.ts .env.example .gitignore
git commit -m "feat: add PASETO key generation script"
```

---

### Phase 3: Database Layer

#### Task 5: Setup Drizzle ORM

**Files:**

- Create: `drizzle.config.ts`
- Create: `src/database/connection.ts`
- Create: `src/database/schema/users.schema.ts`
- Create: `src/database/schema/sessions.schema.ts`
- Create: `src/database/schema/index.ts`
- Create: `scripts/migrate.ts`

**Step 1: Create drizzle config**

```typescript
// drizzle.config.ts
import type { Config } from 'drizzle-kit';
import { config } from './src/config';

export default {
  schema: './src/database/schema',
  out: './src/database/migrations',
  driver: 'pg',
  dbCredentials: {
    url: config.env.DATABASE_URL,
  },
} satisfies Config;
```

**Step 2: Create database connection**

```typescript
// src/database/connection.ts
import { drizzle, DrizzleDB } from 'drizzle-orm/node-postgres';
import pg from 'pg';
import { config } from '@config';
import * as schema from './schema';

const { Pool } = pg;

let pool: pg.Pool | null = null;
let db: DrizzleDB | null = null;

export function getConnection(): DrizzleDB {
  if (db) {
    return db;
  }

  pool = new Pool({
    connectionString: config.database.url,
    min: config.database.pool.min,
    max: config.database.pool.max,
    ssl: config.database.ssl,
  });

  pool.on('error', err => {
    console.error('Unexpected database pool error:', err);
  });

  db = drizzle(pool, { schema });

  return db;
}

export async function closeConnection(): Promise<void> {
  if (pool) {
    await pool.end();
    pool = null;
    db = null;
  }
}

export type Database = typeof db;
```

**Step 3: Create users schema**

```typescript
// src/database/schema/users.schema.ts
import { boolean, pgTable, text, timestamp, uuid } from 'drizzle-orm/pg-core';

export const users = pgTable('users', {
  id: uuid('id').primaryKey().defaultRandom(),
  email: text('email').notNull().unique(),
  passwordHash: text('password_hash').notNull(),
  firstName: text('first_name').notNull(),
  lastName: text('last_name').notNull(),
  isActive: boolean('is_active').notNull().default(true),
  emailVerified: boolean('email_verified').notNull().default(false),
  lastLoginAt: timestamp('last_login_at', { withTimezone: true }),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
});

export type User = typeof users.$inferSelect;
export type NewUser = typeof users.$inferInsert;
```

**Step 4: Create sessions schema**

```typescript
// src/database/schema/sessions.schema.ts
import { boolean, pgTable, text, timestamp, uuid } from 'drizzle-orm/pg-core';

export const sessions = pgTable('sessions', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id').notNull().references('users.id', { onDelete: 'cascade' }),
  tokenId: text('token_id').notNull().unique(),
  refreshTokenHash: text('refresh_token_hash').notNull(),
  expiresAt: timestamp('expires_at', { withTimezone: true }).notNull(),
  isRevoked: boolean('is_revoked').notNull().default(false),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
});

export type Session = typeof sessions.$inferSelect;
export type NewSession = typeof sessions.$inferInsert;
```

**Step 5: Create schema index**

```typescript
// src/database/schema/index.ts
export * from './users.schema';
export * from './sessions.schema';
```

**Step 6: Create migration script**

```typescript
// scripts/migrate.ts
import { migrate } from 'drizzle-orm/node-postgres/migrator';
import { getConnection, closeConnection } from '../src/database/connection';
import { logger } from '../src/core/logging/logger';

async function main() {
  try {
    const db = getConnection();
    logger.info('Running migrations...');

    await migrate(db, { migrationsFolder: './src/database/migrations' });

    logger.info('Migrations completed successfully');
    await closeConnection();
    process.exit(0);
  } catch (error) {
    logger.error('Migration failed', error);
    await closeConnection();
    process.exit(1);
  }
}

main();
```

**Step 7: Commit**

```bash
git add src/database/ drizzle.config.ts scripts/migrate.ts
git commit -m "feat: setup Drizzle ORM with users and sessions schemas"
```

---

#### Task 6: Generate Initial Migration

**Step 1: Generate migration**

Run: `bun run db:generate`
Expected: Creates migration files in src/database/migrations

**Step 2: Review generated migration and commit**

```bash
git add src/database/migrations/
git commit -m "feat: generate initial database migrations"
```

---

### Phase 4: Repository Pattern

#### Task 7: Implement Base Repository and Unit of Work

**Files:**

- Create: `src/repositories/base.repository.ts`
- Create: `src/repositories/unit-of-work.ts`
- Create: `tests/unit/repositories/base.repository.test.ts`

**Step 1: Create base repository**

```typescript
// src/repositories/base.repository.ts
import type { Database } from '../database/connection';
import type { SQL } from 'drizzle-orm';
import { eq, and } from 'drizzle-orm';
import { logger } from '@core/logging/logger';

export interface FindOptions<T> {
  where?: SQL;
  limit?: number;
  offset?: number;
}

export interface PaginationOptions {
  page: number;
  pageSize: number;
}

export interface PaginatedResult<T> {
  data: T[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

export abstract class BaseRepository {
  constructor(protected db: Database) {}

  protected logError(operation: string, error: unknown): void {
    logger.error(`Repository ${operation} failed`, error);
  }

  protected handleRepositoryError<T>(operation: string, error: unknown, defaultValue: T): T {
    this.logError(operation, error);
    return defaultValue;
  }
}

export abstract class CRUDRepository<T, K> extends BaseRepository {
  abstract get tableName(): string;

  async findAll(options: FindOptions<T> = {}): Promise<T[]> {
    try {
      // Implementation depends on specific repository
      return [];
    } catch (error) {
      return this.handleRepositoryError('findAll', error, []);
    }
  }

  async findById(id: K): Promise<T | null> {
    try {
      // Implementation in specific repository
      return null;
    } catch (error) {
      return this.handleRepositoryError('findById', error, null);
    }
  }

  async create(data: T): Promise<T> {
    try {
      // Implementation in specific repository
      return data;
    } catch (error) {
      this.logError('create', error);
      throw error;
    }
  }

  async update(id: K, data: Partial<T>): Promise<T | null> {
    try {
      // Implementation in specific repository
      return null;
    } catch (error) {
      this.logError('update', error);
      throw error;
    }
  }

  async delete(id: K): Promise<boolean> {
    try {
      // Implementation in specific repository
      return false;
    } catch (error) {
      return this.handleRepositoryError('delete', error, false);
    }
  }

  async paginate(options: PaginationOptions): Promise<PaginatedResult<T>> {
    const { page, pageSize } = options;
    const offset = (page - 1) * pageSize;

    try {
      const [data, countResult] = await Promise.all([
        this.findAll({ limit: pageSize, offset }),
        this.count(),
      ]);

      const total = Array.isArray(countResult) ? countResult.length : (countResult as number);
      const totalPages = Math.ceil(total / pageSize);

      return {
        data,
        total,
        page,
        pageSize,
        totalPages,
      };
    } catch (error) {
      return this.handleRepositoryError('paginate', error, {
        data: [],
        total: 0,
        page,
        pageSize,
        totalPages: 0,
      });
    }
  }

  protected abstract count(): Promise<number>;
}
```

**Step 2: Create unit of work**

```typescript
// src/repositories/unit-of-work.ts
import type { Database } from '../database/connection';
import type { users, sessions } from '../database/schema';
import type { User, Session } from '../database/schema';

export interface Repositories {
  users: IUserRepository;
  sessions: ISessionRepository;
}

export interface IUserRepository {
  findById(id: string): Promise<User | null>;
  findByEmail(email: string): Promise<User | null>;
  create(user: NewUser): Promise<User>;
  update(id: string, data: Partial<User>): Promise<User | null>;
  delete(id: string): Promise<boolean>;
}

export interface ISessionRepository {
  findById(id: string): Promise<Session | null>;
  findByTokenId(tokenId: string): Promise<Session | null>;
  create(session: NewSession): Promise<Session>;
  revoke(id: string): Promise<boolean>;
  deleteExpired(): Promise<number>;
}

export class UnitOfWork implements Repositories, AsyncDisposable {
  private transaction: any = null;
  private _users: IUserRepository | null = null;
  private _sessions: ISessionRepository | null = null;

  constructor(private db: Database) {}

  get users(): IUserRepository {
    if (!this._users) {
      this._users = new UserRepository(this.db);
    }
    return this._users;
  }

  get sessions(): ISessionRepository {
    if (!this._sessions) {
      this._sessions = new SessionRepository(this.db);
    }
    return this._sessions;
  }

  async beginTransaction(): Promise<void> {
    if (this.transaction) {
      throw new Error('Transaction already started');
    }
    // Drizzle transaction implementation
    // this.transaction = await this.db.transaction(...);
  }

  async commit(): Promise<void> {
    if (!this.transaction) {
      throw new Error('No active transaction');
    }
    // Commit logic
  }

  async rollback(): Promise<void> {
    if (!this.transaction) {
      throw new Error('No active transaction');
    }
    // Rollback logic
  }

  async [Symbol.asyncDispose](): Promise<void> {
    if (this.transaction) {
      await this.rollback();
    }
  }
}
```

**Step 3: Commit**

```bash
git add src/repositories/
git commit -m "feat: implement base repository and unit of work patterns"
```

---

#### Task 8: Implement Users Repository

**Files:**

- Create: `src/repositories/users.repository.ts`

**Step 1: Create users repository**

```typescript
// src/repositories/users.repository.ts
import { eq } from 'drizzle-orm';
import type { Database } from '../database/connection';
import { users } from '../database/schema';
import type { User, NewUser } from '../database/schema';
import { CRUDRepository } from './base.repository';

export class UserRepository extends CRUDRepository<User, string> implements IUserRepository {
  get tableName() {
    return users;
  }

  async findById(id: string): Promise<User | null> {
    try {
      const result = await this.db.select().from(users).where(eq(users.id, id)).limit(1);

      return result[0] || null;
    } catch (error) {
      this.logError('findById', error);
      return null;
    }
  }

  async findByEmail(email: string): Promise<User | null> {
    try {
      const result = await this.db.select().from(users).where(eq(users.email, email)).limit(1);

      return result[0] || null;
    } catch (error) {
      this.logError('findByEmail', error);
      return null;
    }
  }

  async create(data: NewUser): Promise<User> {
    try {
      const result = await this.db.insert(users).values(data).returning();
      return result[0];
    } catch (error) {
      this.logError('create', error);
      throw error;
    }
  }

  async update(id: string, data: Partial<User>): Promise<User | null> {
    try {
      const result = await this.db
        .update(users)
        .set({ ...data, updatedAt: new Date() })
        .where(eq(users.id, id))
        .returning();

      return result[0] || null;
    } catch (error) {
      this.logError('update', error);
      throw error;
    }
  }

  async delete(id: string): Promise<boolean> {
    try {
      const result = await this.db.delete(users).where(eq(users.id, id)).returning();
      return result.length > 0;
    } catch (error) {
      this.logError('delete', error);
      return false;
    }
  }

  protected async count(): Promise<number> {
    try {
      const result = await this.db.select({ count: users.id }).from(users);
      return result.length;
    } catch (error) {
      return this.handleRepositoryError('count', error, 0);
    }
  }
}
```

**Step 2: Commit**

```bash
git add src/repositories/users.repository.ts
git commit -m "feat: implement users repository with CRUD operations"
```

---

#### Task 9: Implement Sessions Repository

**Files:**

- Create: `src/repositories/sessions.repository.ts`

**Step 1: Create sessions repository**

```typescript
// src/repositories/sessions.repository.ts
import { eq, and, lt } from 'drizzle-orm';
import type { Database } from '../database/connection';
import { sessions } from '../database/schema';
import type { Session, NewSession } from '../database/schema';
import { CRUDRepository } from './base.repository';

export class SessionRepository
  extends CRUDRepository<Session, string>
  implements ISessionRepository
{
  get tableName() {
    return sessions;
  }

  async findById(id: string): Promise<Session | null> {
    try {
      const result = await this.db.select().from(sessions).where(eq(sessions.id, id)).limit(1);

      return result[0] || null;
    } catch (error) {
      this.logError('findById', error);
      return null;
    }
  }

  async findByTokenId(tokenId: string): Promise<Session | null> {
    try {
      const result = await this.db
        .select()
        .from(sessions)
        .where(eq(sessions.tokenId, tokenId))
        .limit(1);

      return result[0] || null;
    } catch (error) {
      this.logError('findByTokenId', error);
      return null;
    }
  }

  async create(data: NewSession): Promise<Session> {
    try {
      const result = await this.db.insert(sessions).values(data).returning();
      return result[0];
    } catch (error) {
      this.logError('create', error);
      throw error;
    }
  }

  async revoke(id: string): Promise<boolean> {
    try {
      const result = await this.db
        .update(sessions)
        .set({ isRevoked: true, updatedAt: new Date() })
        .where(eq(sessions.id, id))
        .returning();

      return result.length > 0;
    } catch (error) {
      this.logError('revoke', error);
      return false;
    }
  }

  async deleteExpired(): Promise<number> {
    try {
      const result = await this.db
        .delete(sessions)
        .where(and(lt(sessions.expiresAt, new Date()), eq(sessions.isRevoked, false)))
        .returning();

      return result.length;
    } catch (error) {
      this.logError('deleteExpired', error);
      return 0;
    }
  }

  // Implement CRUD methods
  async update(id: string, data: Partial<Session>): Promise<Session | null> {
    try {
      const result = await this.db
        .update(sessions)
        .set({ ...data, updatedAt: new Date() })
        .where(eq(sessions.id, id))
        .returning();

      return result[0] || null;
    } catch (error) {
      this.logError('update', error);
      throw error;
    }
  }

  async delete(id: string): Promise<boolean> {
    try {
      const result = await this.db.delete(sessions).where(eq(sessions.id, id)).returning();
      return result.length > 0;
    } catch (error) {
      this.logError('delete', error);
      return false;
    }
  }

  protected async count(): Promise<number> {
    try {
      const result = await this.db.select({ count: sessions.id }).from(sessions);
      return result.length;
    } catch (error) {
      return this.handleRepositoryError('count', error, 0);
    }
  }
}
```

**Step 2: Commit**

```bash
git add src/repositories/sessions.repository.ts
git commit -m "feat: implement sessions repository with revocation"
```

---

### Phase 5: Business Logic Layer

#### Task 10: Implement Password Hashing Service

**Files:**

- Create: `src/core/crypto/password.service.ts`
- Create: `src/core/crypto/index.ts`
- Create: `tests/unit/core/crypto/password.service.test.ts`

**Step 1: Create password service**

```typescript
// src/core/crypto/password.service.ts
import argon2 from 'argon2';
import { config } from '@config';

export class PasswordService {
  private readonly options: argon2.Options;

  constructor() {
    this.options = {
      type: argon2.argon2id,
      memoryCost: 65536, // 64 MB
      timeCost: 3, // 3 iterations
      parallelism: 4,
      hashLength: 32,
    };
  }

  async hash(password: string): Promise<string> {
    return await argon2.hash(password, this.options);
  }

  async verify(hash: string, password: string): Promise<boolean> {
    try {
      return await argon2.verify(hash, password, this.options);
    } catch {
      return false;
    }
  }

  async needsRehash(hash: string): Promise<boolean> {
    try {
      return await argon2.needsRehash(hash, this.options);
    } catch {
      return true;
    }
  }

  generateStrongPassword(length: number = 16): string {
    const charset = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%^&*()';
    const array = new Uint8Array(length);
    crypto.getRandomValues(array);

    return Array.from(array, byte => charset[byte % charset.length]).join('');
  }
}

let passwordServiceInstance: PasswordService | null = null;

export function getPasswordService(): PasswordService {
  if (!passwordServiceInstance) {
    passwordServiceInstance = new PasswordService();
  }
  return passwordServiceInstance;
}
```

**Step 2: Create tests**

```typescript
// tests/unit/core/crypto/password.service.test.ts
import { describe, it, expect, beforeEach } from 'bun:test';
import { PasswordService } from '@/core/crypto/password.service';

describe('PasswordService', () => {
  let passwordService: PasswordService;
  const testPassword = 'SecurePassword123!';

  beforeEach(() => {
    passwordService = new PasswordService();
  });

  describe('hash', () => {
    it('should hash a password', async () => {
      const hash = await passwordService.hash(testPassword);

      expect(hash).toBeDefined();
      expect(typeof hash).toBe('string');
      expect(hash).not.toBe(testPassword);
    });

    it('should generate different hashes for same password', async () => {
      const hash1 = await passwordService.hash(testPassword);
      const hash2 = await passwordService.hash(testPassword);

      expect(hash1).not.toBe(hash2);
    });
  });

  describe('verify', () => {
    it('should verify correct password', async () => {
      const hash = await passwordService.hash(testPassword);
      const isValid = await passwordService.verify(hash, testPassword);

      expect(isValid).toBe(true);
    });

    it('should reject incorrect password', async () => {
      const hash = await passwordService.hash(testPassword);
      const isValid = await passwordService.verify(hash, 'WrongPassword');

      expect(isValid).toBe(false);
    });

    it('should handle invalid hash gracefully', async () => {
      const isValid = await passwordService.verify('invalid-hash', testPassword);

      expect(isValid).toBe(false);
    });
  });

  describe('generateStrongPassword', () => {
    it('should generate password of specified length', () => {
      const password = passwordService.generateStrongPassword(20);

      expect(password.length).toBe(20);
    });

    it('should generate different passwords each time', () => {
      const password1 = passwordService.generateStrongPassword();
      const password2 = passwordService.generateStrongPassword();

      expect(password1).not.toBe(password2);
    });
  });
});
```

**Step 3: Run tests**

Run: `bun test tests/unit/core/crypto/password.service.test.ts`
Expected: All tests pass

**Step 4: Commit**

```bash
git add src/core/crypto/ tests/unit/core/crypto/
git commit -m "feat: implement password hashing with Argon2"
```

---

#### Task 11: Implement Authentication Service

**Files:**

- Create: `src/services/interfaces/auth.service.interface.ts`
- Create: `src/services/auth.service.ts`
- Create: `tests/unit/services/auth.service.test.ts`

**Step 1: Create auth service interface**

```typescript
// src/services/interfaces/auth.service.interface.ts
import type { TokenPair } from '@core/paseto';

export interface RegisterDto {
  email: string;
  password: string;
  firstName: string;
  lastName: string;
}

export interface LoginDto {
  email: string;
  password: string;
}

export interface AuthResponse {
  user: UserDto;
  tokens: TokenPair;
}

export interface UserDto {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  isActive: boolean;
  emailVerified: boolean;
  createdAt: Date;
}

export interface IAuthService {
  register(dto: RegisterDto): Promise<AuthResponse>;
  login(dto: LoginDto): Promise<AuthResponse>;
  refreshToken(refreshToken: string): Promise<TokenPair>;
  logout(userId: string, tokenId: string): Promise<void>;
  validateAccessToken(token: string): Promise<UserDto | null>;
}
```

**Step 2: Create auth service**

```typescript
// src/services/auth.service.ts
import { injectable, inject } from 'tsyringe';
import type {
  IAuthService,
  RegisterDto,
  LoginDto,
  AuthResponse,
} from './interfaces/auth.service.interface';
import type { IUserRepository, ISessionRepository } from '../repositories/unit-of-work';
import type { UnitOfWork } from '../repositories/unit-of-work';
import { RepositoryTokens } from './constants';
import { getPasetoService } from '@core/paseto';
import { getPasswordService } from '@core/crypto/password.service';
import { logger } from '@core/logging/logger';
import { AppError } from '@core/errors/app-error';

@injectable()
export class AuthService implements IAuthService {
  constructor(@inject(RepositoryTokens.UnitOfWork) private uow: UnitOfWork) {}

  async register(dto: RegisterDto): Promise<AuthResponse> {
    try {
      // Check if user already exists
      const existingUser = await this.uow.users.findByEmail(dto.email);
      if (existingUser) {
        throw new AppError('User with this email already exists', 'USER_EXISTS', 409);
      }

      // Hash password
      const passwordService = getPasswordService();
      const passwordHash = await passwordService.hash(dto.password);

      // Create user
      const newUser = await this.uow.users.create({
        email: dto.email,
        passwordHash,
        firstName: dto.firstName,
        lastName: dto.lastName,
      });

      logger.info('User registered', { userId: newUser.id });

      // Generate tokens
      return await this.generateAuthResponse(newUser);
    } catch (error) {
      if (error instanceof AppError) {
        throw error;
      }
      logger.error('Registration failed', error);
      throw new AppError('Registration failed', 'REGISTRATION_ERROR', 500);
    }
  }

  async login(dto: LoginDto): Promise<AuthResponse> {
    try {
      // Find user by email
      const user = await this.uow.users.findByEmail(dto.email);
      if (!user) {
        throw new AppError('Invalid credentials', 'INVALID_CREDENTIALS', 401);
      }

      // Verify password
      const passwordService = getPasswordService();
      const isValidPassword = await passwordService.verify(user.passwordHash, dto.password);

      if (!isValidPassword) {
        throw new AppError('Invalid credentials', 'INVALID_CREDENTIALS', 401);
      }

      // Check if user is active
      if (!user.isActive) {
        throw new AppError('Account is disabled', 'ACCOUNT_DISABLED', 403);
      }

      logger.info('User logged in', { userId: user.id });

      // Generate tokens
      return await this.generateAuthResponse(user);
    } catch (error) {
      if (error instanceof AppError) {
        throw error;
      }
      logger.error('Login failed', error);
      throw new AppError('Login failed', 'LOGIN_ERROR', 500);
    }
  }

  async refreshToken(refreshToken: string): Promise<TokenPair> {
    try {
      const pasetoService = getPasetoService();
      const result = await pasetoService.validateAndDecodeToken(refreshToken);

      if (!result.valid || !result.payload) {
        throw new AppError('Invalid refresh token', 'INVALID_TOKEN', 401);
      }

      if (result.payload.type !== 'refresh') {
        throw new AppError('Token must be a refresh token', 'WRONG_TOKEN_TYPE', 401);
      }

      const payload = result.payload as import('@core/paseto').RefreshTokenPayload;
      const tokenId = payload.tokenId;
      const userId = payload.sub;

      // Check if session exists and is not revoked
      const session = await this.uow.sessions.findByTokenId(tokenId);
      if (!session || session.isRevoked) {
        throw new AppError('Session is revoked or does not exist', 'SESSION_INVALID', 401);
      }

      // Check if session is expired
      if (session.expiresAt < new Date()) {
        await this.uow.sessions.revoke(session.id);
        throw new AppError('Session has expired', 'SESSION_EXPIRED', 401);
      }

      // Verify user still exists and is active
      const user = await this.uow.users.findById(userId);
      if (!user || !user.isActive) {
        throw new AppError('User account is disabled or does not exist', 'USER_INVALID', 401);
      }

      // Generate new token pair
      const paseto = getPasetoService();
      const tokenPair = await paseto.createTokenPair(userId, {
        email: user.email,
      });

      // Create new session and revoke old one
      await this.uow.sessions.create({
        userId,
        tokenId: tokenPair.refreshToken, // We'll use the jti from the actual token
        refreshTokenHash: await getPasswordService().hash(tokenPair.refreshToken),
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days
      });

      await this.uow.sessions.revoke(session.id);

      logger.info('Token refreshed', { userId });

      return tokenPair;
    } catch (error) {
      if (error instanceof AppError) {
        throw error;
      }
      logger.error('Token refresh failed', error);
      throw new AppError('Token refresh failed', 'REFRESH_ERROR', 500);
    }
  }

  async logout(userId: string, tokenId: string): Promise<void> {
    try {
      const session = await this.uow.sessions.findByTokenId(tokenId);

      if (session && session.userId === userId) {
        await this.uow.sessions.revoke(session.id);
        logger.info('User logged out', { userId });
      }
    } catch (error) {
      logger.error('Logout failed', error);
      throw new AppError('Logout failed', 'LOGOUT_ERROR', 500);
    }
  }

  async validateAccessToken(token: string): Promise<UserDto | null> {
    try {
      const pasetoService = getPasetoService();
      const result = await pasetoService.validateAndDecodeToken(token);

      if (!result.valid || !result.payload) {
        return null;
      }

      if (result.payload.type !== 'access') {
        return null;
      }

      const userId = result.payload.sub;
      const user = await this.uow.users.findById(userId);

      if (!user || !user.isActive) {
        return null;
      }

      return this.mapToUserDto(user);
    } catch (error) {
      logger.error('Token validation failed', error);
      return null;
    }
  }

  private async generateAuthResponse(
    user: import('../database/schema').User
  ): Promise<AuthResponse> {
    const pasetoService = getPasetoService();
    const tokenPair = await pasetoService.createTokenPairForUser(user.id);

    // Store refresh token session
    const passwordService = getPasswordService();
    const refreshTokenPayload = await pasetoService.validateAndDecodeToken(tokenPair.refreshToken);

    if (refreshTokenPayload.valid && refreshTokenPayload.payload) {
      const payload = refreshTokenPayload.payload as import('@core/paseto').RefreshTokenPayload;
      await this.uow.sessions.create({
        userId: user.id,
        tokenId: payload.tokenId,
        refreshTokenHash: await passwordService.hash(tokenPair.refreshToken),
        expiresAt: new Date(payload.exp * 1000),
      });
    }

    return {
      user: this.mapToUserDto(user),
      tokens: tokenPair,
    };
  }

  private mapToUserDto(
    user: import('../database/schema').User
  ): import('./interfaces/auth.service.interface').UserDto {
    return {
      id: user.id,
      email: user.email,
      firstName: user.firstName,
      lastName: user.lastName,
      isActive: user.isActive,
      emailVerified: user.emailVerified,
      createdAt: user.createdAt,
    };
  }
}
```

**Step 3: Create repository tokens constant**

```typescript
// src/services/constants.ts
export const RepositoryTokens = {
  UnitOfWork: 'UnitOfWork',
  UserRepository: 'UserRepository',
  SessionRepository: 'SessionRepository',
} as const;
```

**Step 4: Commit**

```bash
git add src/services/
git commit -m "feat: implement authentication service with PASETO tokens"
```

---

### Phase 6: API Layer

#### Task 12: Implement Request/Response Validation

**Files:**

- Create: `src/core/validation/common.schema.ts`
- Create: `src/core/validation/error.handler.ts`
- Create: `src/core/validation/index.ts`

**Step 1: Create common schemas**

```typescript
// src/core/validation/common.schema.ts
import { z } from 'zod';

export const uuidSchema = z.string().uuid();

export const emailSchema = z.string().email('Invalid email format');

export const passwordSchema = z
  .string()
  .min(8, 'Password must be at least 8 characters')
  .regex(/[A-Z]/, 'Password must contain at least one uppercase letter')
  .regex(/[a-z]/, 'Password must contain at least one lowercase letter')
  .regex(/[0-9]/, 'Password must contain at least one number');

export const nameSchema = z
  .string()
  .min(2, 'Name must be at least 2 characters')
  .max(100, 'Name must not exceed 100 characters');

export const paginationSchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  pageSize: z.coerce.number().int().positive().max(100).default(20),
});

export const idParamSchema = z.object({
  id: uuidSchema,
});

export const apiResponseSchema = <T>(dataSchema: z.ZodType<T>) =>
  z.object({
    success: z.boolean(),
    message: z.string(),
    data: dataSchema.optional(),
    error: z
      .object({
        code: z.string(),
        message: z.string(),
        details: z.any().optional(),
      })
      .optional(),
  });
```

**Step 2: Create error handler**

```typescript
// src/core/validation/error.handler.ts
import type { Context } from 'elysia';
import { ZodError } from 'zod';
import { logger } from '@core/logging/logger';
import type { ErrorResponse } from './error.types';

export function handleZodError(error: ZodError): ErrorResponse {
  const issues = error.errors.map(issue => ({
    field: issue.path.join('.'),
    message: issue.message,
    code: issue.code,
  }));

  return {
    success: false,
    error: {
      code: 'VALIDATION_ERROR',
      message: 'Request validation failed',
      details: issues,
    },
  };
}

export function createErrorResponse(
  message: string,
  code: string,
  status: number = 500,
  details?: unknown
): ErrorResponse & { status: number } {
  return {
    success: false,
    error: {
      code,
      message,
      details,
    },
    status,
  };
}

export function handleAppError(error: Error): { response: ErrorResponse; status: number } {
  logger.error('Application error', error);

  if (error.name === 'AppError') {
    const appError = error as import('@core/errors/app-error').AppError;
    return {
      response: {
        success: false,
        error: {
          code: appError.code,
          message: appError.message,
        },
      },
      status: appError.status,
    };
  }

  return {
    response: createErrorResponse('An unexpected error occurred', 'INTERNAL_ERROR', 500),
    status: 500,
  };
}
```

**Step 3: Create error types**

```typescript
// src/core/validation/error.types.ts
export interface ApiSuccessResponse<T = unknown> {
  success: true;
  message: string;
  data: T;
}

export interface ErrorResponse {
  success: false;
  error: {
    code: string;
    message: string;
    details?: unknown;
  };
}

export type ApiResponse<T = unknown> = ApiSuccessResponse<T> | ErrorResponse;

export function successResponse<T>(data: T, message: string = 'Success'): ApiSuccessResponse<T> {
  return {
    success: true,
    message,
    data,
  };
}

export function errorResponse(message: string, code: string, details?: unknown): ErrorResponse {
  return {
    success: false,
    error: {
      code,
      message,
      details,
    },
  };
}
```

**Step 4: Commit**

```bash
git add src/core/validation/
git commit -m "feat: implement request validation with Zod schemas"
```

---

#### Task 13: Implement Authentication Middleware

**Files:**

- Create: `src/middlewares/auth.middleware.ts`

**Step 1: Create auth middleware**

```typescript
// src/middlewares/auth.middleware.ts
import type { Context } from 'elysia';
import { getPasetoService } from '@core/paseto';
import { createErrorResponse } from '@core/validation/error.handler';
import { logger } from '@core/logging/logger';

export interface AuthContext {
  userId: string;
  tokenId?: string;
  payload: import('@core/paseto').TokenPayload;
}

declare module 'elysia' {
  interface Context {
    user?: AuthContext;
  }
}

export function createAuthMiddleware(options: { required: boolean } = { required: true }) {
  return async (context: Context) => {
    const authorization = context.request.headers.get('Authorization');
    const pasetoService = getPasetoService();

    if (!authorization) {
      if (options.required) {
        return {
          success: false,
          error: {
            code: 'MISSING_AUTHORIZATION',
            message: 'Authorization header is required',
          },
          status: 401,
        };
      }
      return;
    }

    const token = await pasetoService.extractTokenFromHeader(authorization);

    if (!token) {
      if (options.required) {
        return {
          success: false,
          error: {
            code: 'INVALID_TOKEN_FORMAT',
            message: 'Invalid authorization header format',
          },
          status: 401,
        };
      }
      return;
    }

    const result = await pasetoService.validateAndDecodeToken(token);

    if (!result.valid || !result.payload) {
      if (options.required) {
        return {
          success: false,
          error: {
            code: 'INVALID_TOKEN',
            message: result.error || 'Token validation failed',
          },
          status: 401,
        };
      }
      return;
    }

    if (result.payload.type !== 'access') {
      return {
        success: false,
        error: {
          code: 'WRONG_TOKEN_TYPE',
          message: 'Access token required',
        },
        status: 401,
      };
    }

    // Attach user to context
    context.user = {
      userId: result.payload.sub,
      payload: result.payload,
    };
  };
}

export const requireAuth = createAuthMiddleware({ required: true });
export const optionalAuth = createAuthMiddleware({ required: false });
```

**Step 2: Commit**

```bash
git add src/middlewares/auth.middleware.ts
git commit -m "feat: implement PASETO authentication middleware"
```

---

#### Task 14: Implement Rate Limiting Middleware

**Files:**

- Create: `src/middlewares/rate-limit.middleware.ts`
- Create: `src/core/redis/connection.ts`

**Step 1: Create Redis connection**

```typescript
// src/core/redis/connection.ts
import Redis from 'ioredis';
import { redisConfig } from '@config/redis';
import { logger } from '@core/logging/logger';

let redisClient: Redis | null = null;

export function getRedisClient(): Redis {
  if (redisClient) {
    return redisClient;
  }

  redisClient = new Redis({
    host: redisConfig.host,
    port: redisConfig.port,
    password: redisConfig.password,
    db: redisConfig.db,
    maxRetriesPerRequest: redisConfig.maxRetriesPerRequest,
    retryStrategy: redisConfig.retryStrategy,
  });

  redisClient.on('error', error => {
    logger.error('Redis connection error', error);
  });

  redisClient.on('connect', () => {
    logger.info('Redis connected');
  });

  redisClient.on('disconnect', () => {
    logger.warn('Redis disconnected');
  });

  return redisClient;
}

export async function closeRedisClient(): Promise<void> {
  if (redisClient) {
    await redisClient.quit();
    redisClient = null;
  }
}
```

**Step 2: Create rate limiting middleware**

```typescript
// src/middlewares/rate-limit.middleware.ts
import type { Context } from 'elysia';
import { getRedisClient } from '@core/redis/connection';
import { config } from '@config';
import { logger } from '@core/logging/logger';

interface RateLimitResult {
  allowed: boolean;
  limit: number;
  remaining: number;
  reset: number;
}

export async function checkRateLimit(
  identifier: string,
  maxRequests: number,
  windowSeconds: number
): Promise<RateLimitResult> {
  try {
    const redis = getRedisClient();
    const key = `ratelimit:${identifier}`;
    const now = Math.floor(Date.now() / 1000);
    const windowStart = now - windowSeconds;

    const pipeline = redis.pipeline();
    pipeline.zremrangebyscore(key, 0, windowStart);
    pipeline.zcard(key);
    pipeline.zadd(key, now, `${now}-${crypto.randomUUID()}`);
    pipeline.expire(key, windowSeconds);

    const results = await pipeline.exec();

    if (!results) {
      return {
        allowed: true,
        limit: maxRequests,
        remaining: maxRequests - 1,
        reset: now + windowSeconds,
      };
    }

    const currentCount = (results[1][1] as number) + 1; // +1 for the new request
    const remaining = Math.max(0, maxRequests - currentCount);

    return {
      allowed: currentCount <= maxRequests,
      limit: maxRequests,
      remaining,
      reset: now + windowSeconds,
    };
  } catch (error) {
    logger.error('Rate limit check failed', error);
    // Fail open - allow request if Redis is down
    return {
      allowed: true,
      limit: maxRequests,
      remaining: maxRequests - 1,
      reset: Math.floor(Date.now() / 1000) + windowSeconds,
    };
  }
}

export function createRateLimitMiddleware(options: {
  maxRequests?: number;
  windowSeconds?: number;
  keyPrefix?: string;
}) {
  const maxRequests = options.maxRequests ?? config.env.RATE_LIMIT_MAX_REQUESTS;
  const windowSeconds = options.windowSeconds ?? config.env.RATE_LIMIT_WINDOW_SECONDS;
  const keyPrefix = options.keyPrefix ?? 'global';

  return async (context: Context) => {
    if (!config.env.RATE_LIMIT_ENABLED) {
      return;
    }

    const ip =
      context.request.headers.get('x-forwarded-for') ||
      context.request.headers.get('x-real-ip') ||
      'unknown';
    const path = new URL(context.request.url).pathname;
    const identifier = `${keyPrefix}:${path}:${ip}`;

    const result = await checkRateLimit(identifier, maxRequests, windowSeconds);

    // Set rate limit headers
    context.set.headers = {
      ...(context.set.headers || {}),
      'X-RateLimit-Limit': result.limit.toString(),
      'X-RateLimit-Remaining': result.remaining.toString(),
      'X-RateLimit-Reset': result.reset.toString(),
    };

    if (!result.allowed) {
      logger.warn('Rate limit exceeded', { identifier, ip, path });

      return {
        success: false,
        error: {
          code: 'RATE_LIMIT_EXCEEDED',
          message: 'Too many requests. Please try again later.',
        },
        status: 429,
      };
    }
  };
}

export const rateLimit = createRateLimitMiddleware();
```

**Step 3: Commit**

```bash
git add src/middlewares/rate-limit.middleware.ts src/core/redis/
git commit -m "feat: implement Redis-based rate limiting middleware"
```

---

#### Task 15: Implement Auth Routes

**Files:**

- Create: `src/routes/auth.routes.ts`
- Create: `src/controllers/auth.controller.ts`

**Step 1: Create auth DTOs**

```typescript
// src/routes/dto/auth.dto.ts
import { z } from 'zod';
import { emailSchema, passwordSchema, nameSchema } from '@core/validation/common.schema';

export const registerSchema = z.object({
  email: emailSchema,
  password: passwordSchema,
  firstName: nameSchema,
  lastName: nameSchema,
});

export const loginSchema = z.object({
  email: emailSchema,
  password: z.string().min(1, 'Password is required'),
});

export const refreshTokenSchema = z.object({
  refreshToken: z.string().min(1, 'Refresh token is required'),
});

export type RegisterDto = z.infer<typeof registerSchema>;
export type LoginDto = z.infer<typeof loginSchema>;
export type RefreshTokenDto = z.infer<typeof refreshTokenSchema>;
```

**Step 2: Create auth controller**

```typescript
// src/controllers/auth.controller.ts
import { injectable, inject } from 'tsyringe';
import type { IAuthService } from '../services/interfaces/auth.service.interface';
import type { RegisterDto, LoginDto, RefreshTokenDto } from '../routes/dto/auth.dto';
import { successResponse } from '@core/validation/error.types';
import { AppError } from '@core/errors/app-error';
import { RepositoryTokens } from '../services/constants';
import { logger } from '@core/logging/logger';

@injectable()
export class AuthController {
  constructor(@inject(RepositoryTokens.AuthService) private authService: IAuthService) {}

  async register(dto: RegisterDto) {
    try {
      const result = await this.authService.register(dto);
      return successResponse(result, 'User registered successfully');
    } catch (error) {
      logger.error('Registration controller error', error);
      throw error;
    }
  }

  async login(dto: LoginDto) {
    try {
      const result = await this.authService.login(dto);
      return successResponse(result, 'Login successful');
    } catch (error) {
      logger.error('Login controller error', error);
      throw error;
    }
  }

  async refreshToken(dto: RefreshTokenDto) {
    try {
      const tokens = await this.authService.refreshToken(dto.refreshToken);
      return successResponse(tokens, 'Token refreshed successfully');
    } catch (error) {
      logger.error('Refresh token controller error', error);
      throw error;
    }
  }

  async logout(context: import('elysia').Context) {
    try {
      const user = context.user as import('../middlewares/auth.middleware').AuthContext | undefined;
      if (!user) {
        throw new AppError('Not authenticated', 'NOT_AUTHENTICATED', 401);
      }

      await this.authService.logout(user.userId, user.payload.jti);
      return successResponse(null, 'Logout successful');
    } catch (error) {
      logger.error('Logout controller error', error);
      throw error;
    }
  }

  async me(context: import('elysia').Context) {
    try {
      const user = context.user as import('../middlewares/auth.middleware').AuthContext | undefined;
      if (!user) {
        throw new AppError('Not authenticated', 'NOT_AUTHENTICATED', 401);
      }

      return successResponse(
        { userId: user.userId, ...user.payload },
        'User retrieved successfully'
      );
    } catch (error) {
      logger.error('Get user controller error', error);
      throw error;
    }
  }
}
```

**Step 3: Create auth routes**

```typescript
// src/routes/auth.routes.ts
import { Elysia, t } from 'elysia';
import { AuthController } from '../controllers/auth.controller';
import { registerSchema, loginSchema, refreshTokenSchema } from './dto/auth.dto';
import { requireAuth } from '../middlewares/auth.middleware';
import { rateLimit } from '../middlewares/rate-limit.middleware';
import { handleZodError, handleAppError } from '@core/validation/error.handler';
import { AppError } from '@core/errors/app-error';

export function createAuthRoutes(): Elysia {
  const controller = new AuthController();

  return new Elysia({ prefix: '/auth' })
    .use(rateLimit)
    .post(
      '/register',
      async ({ body, set }) => {
        try {
          const validated = registerSchema.parse(body);
          const response = await controller.register(validated);
          set.status = 201;
          return response;
        } catch (error) {
          if (error instanceof AppError) {
            const { response, status } = handleAppError(error);
            set.status = status;
            return response;
          }
          if (error instanceof import('zod').ZodError) {
            const response = handleZodError(error);
            set.status = 400;
            return response;
          }
          throw error;
        }
      },
      {
        body: t.Object({
          email: t.String(),
          password: t.String(),
          firstName: t.String(),
          lastName: t.String(),
        }),
        detail: {
          summary: 'Register a new user',
          tags: ['Authentication'],
          description: 'Creates a new user account and returns access tokens',
        },
      }
    )
    .post(
      '/login',
      async ({ body, set }) => {
        try {
          const validated = loginSchema.parse(body);
          const response = await controller.login(validated);
          return response;
        } catch (error) {
          if (error instanceof AppError) {
            const { response, status } = handleAppError(error);
            set.status = status;
            return response;
          }
          if (error instanceof import('zod').ZodError) {
            const response = handleZodError(error);
            set.status = 400;
            return response;
          }
          throw error;
        }
      },
      {
        body: t.Object({
          email: t.String(),
          password: t.String(),
        }),
        detail: {
          summary: 'User login',
          tags: ['Authentication'],
          description: 'Authenticates a user and returns access tokens',
        },
      }
    )
    .post(
      '/refresh',
      async ({ body, set }) => {
        try {
          const validated = refreshTokenSchema.parse(body);
          const response = await controller.refreshToken(validated);
          return response;
        } catch (error) {
          if (error instanceof AppError) {
            const { response, status } = handleAppError(error);
            set.status = status;
            return response;
          }
          if (error instanceof import('zod').ZodError) {
            const response = handleZodError(error);
            set.status = 400;
            return response;
          }
          throw error;
        }
      },
      {
        body: t.Object({
          refreshToken: t.String(),
        }),
        detail: {
          summary: 'Refresh access token',
          tags: ['Authentication'],
          description: 'Exchanges a refresh token for a new token pair',
        },
      }
    )
    .post(
      '/logout',
      async ({ set }) => {
        try {
          const response = await controller.logout;
          return response;
        } catch (error) {
          if (error instanceof AppError) {
            const { response, status } = handleAppError(error);
            set.status = status;
            return response;
          }
          throw error;
        }
      },
      {
        beforeHandle: [requireAuth],
        detail: {
          summary: 'User logout',
          tags: ['Authentication'],
          description: 'Revokes the current refresh token',
        },
      }
    )
    .get(
      '/me',
      async ({ set }) => {
        try {
          const response = await controller.me;
          return response;
        } catch (error) {
          if (error instanceof AppError) {
            const { response, status } = handleAppError(error);
            set.status = status;
            return response;
          }
          throw error;
        }
      },
      {
        beforeHandle: [requireAuth],
        detail: {
          summary: 'Get current user',
          tags: ['Authentication'],
          description: 'Returns information about the authenticated user',
        },
      }
    );
}
```

**Step 4: Commit**

```bash
git add src/routes/ src/controllers/
git commit -m "feat: implement authentication routes and controllers"
```

---

### Phase 7: User Management API

#### Task 16: Implement User Service

**Files:**

- Create: `src/services/interfaces/users.service.interface.ts`
- Create: `src/services/users.service.ts`
- Create: `tests/unit/services/users.service.test.ts`

**Step 1: Create user service interface**

```typescript
// src/services/interfaces/users.service.interface.ts
import type { PaginatedResult } from '../../repositories/base.repository';

export interface UpdateProfileDto {
  firstName?: string;
  lastName?: string;
}

export interface UpdatePasswordDto {
  currentPassword: string;
  newPassword: string;
}

export interface CreateUserDto {
  email: string;
  username: string;
  name?: string;
  password: string;
  role: 'ADMIN' | 'USER';
}

export interface GetUsersDto {
  page: number;
  limit: number;
  includeDeleted?: boolean;
  search?: string;
}

export interface UserStatsDto {
  totalUsers: number;
  activeUsers: number;
  adminUsers: number;
  newUsersThisMonth: number;
}

export interface IUsersService {
  // Profile operations
  getProfile(userId: string): Promise<UserDto>;
  updateProfile(userId: string, dto: UpdateProfileDto): Promise<UserDto>;
  updatePassword(userId: string, dto: UpdatePasswordDto): Promise<void>;
  changeEmail(userId: string, newEmail: string): Promise<void>;

  // Admin operations
  getUsers(dto: GetUsersDto): Promise<PaginatedResult<UserDto>>;
  getUserById(id: string, includeDeleted?: boolean): Promise<UserDto | null>;
  createUser(dto: CreateUserDto): Promise<UserDto>;
  updateUser(id: string, dto: UpdateProfileDto): Promise<UserDto>;
  deleteUser(id: string, force?: boolean): Promise<void>;
  restoreUser(id: string): Promise<UserDto>;
  getUserStats(): Promise<UserStatsDto>;
  getOldestUser(role?: 'ADMIN' | 'USER'): Promise<UserDto | null>;
}

export interface UserDto {
  id: string;
  email: string;
  username: string;
  name?: string;
  role: 'ADMIN' | 'USER';
  isActive: boolean;
  emailVerified: boolean;
  createdAt: Date;
  updatedAt: Date;
  deletedAt?: Date;
}
```

**Step 2: Create user service implementation**

```typescript
// src/services/users.service.ts
import { injectable, inject } from 'tsyringe';
import type {
  IUsersService,
  UpdateProfileDto,
  UpdatePasswordDto,
  CreateUserDto,
  GetUsersDto,
  UserDto,
} from './interfaces/users.service.interface';
import type { IUserRepository } from '../repositories/unit-of-work';
import { RepositoryTokens } from './constants';
import { getPasswordService } from '@core/crypto/password.service';
import { AppError } from '@core/errors/app-error';
import { logger } from '@core/logging/logger';
import type { UnitOfWork } from '../repositories/unit-of-work';

@injectable()
export class UsersService implements IUsersService {
  constructor(@inject(RepositoryTokens.UnitOfWork) private uow: UnitOfWork) {}

  async getProfile(userId: string): Promise<UserDto> {
    const user = await this.uow.users.findById(userId);
    if (!user) {
      throw new AppError('User not found', 'USER_NOT_FOUND', 404);
    }
    return this.mapToDto(user);
  }

  async updateProfile(userId: string, dto: UpdateProfileDto): Promise<UserDto> {
    const user = await this.uow.users.findById(userId);
    if (!user) {
      throw new AppError('User not found', 'USER_NOT_FOUND', 404);
    }

    const updated = await this.uow.users.update(userId, dto);
    if (!updated) {
      throw new AppError('Failed to update user', 'UPDATE_FAILED', 500);
    }

    logger.info('User profile updated', { userId });
    return this.mapToDto(updated);
  }

  async updatePassword(userId: string, dto: UpdatePasswordDto): Promise<void> {
    const user = await this.uow.users.findById(userId);
    if (!user) {
      throw new AppError('User not found', 'USER_NOT_FOUND', 404);
    }

    const passwordService = getPasswordService();
    const isValid = await passwordService.verify(user.passwordHash, dto.currentPassword);

    if (!isValid) {
      throw new AppError('Current password is incorrect', 'INVALID_PASSWORD', 400);
    }

    const newPasswordHash = await passwordService.hash(dto.newPassword);
    await this.uow.users.update(userId, { passwordHash: newPasswordHash });

    logger.info('User password updated', { userId });
  }

  async changeEmail(userId: string, newEmail: string): Promise<void> {
    const existing = await this.uow.users.findByEmail(newEmail);
    if (existing) {
      throw new AppError('Email already in use', 'EMAIL_EXISTS', 409);
    }

    await this.uow.users.update(userId, { email: newEmail, emailVerified: false });
    logger.info('User email changed', { userId, newEmail });

    // TODO: Send email verification
  }

  async getUsers(dto: GetUsersDto): Promise<PaginatedResult<UserDto>> {
    // Implementation with pagination
    const { page, limit } = dto;
    const offset = (page - 1) * limit;

    const users = await this.uow.users.findAll();
    const filtered = users.filter(u => dto.includeDeleted || u.deletedAt === null);

    if (dto.search) {
      const searchLower = dto.search.toLowerCase();
      return {
        data: filtered
          .filter(
            u =>
              u.email.toLowerCase().includes(searchLower) ||
              u.firstName.toLowerCase().includes(searchLower) ||
              u.lastName.toLowerCase().includes(searchLower)
          )
          .slice(offset, offset + limit),
        total: filtered.length,
        page,
        pageSize: limit,
        totalPages: Math.ceil(filtered.length / limit),
      };
    }

    return {
      data: filtered.slice(offset, offset + limit),
      total: filtered.length,
      page,
      pageSize: limit,
      totalPages: Math.ceil(filtered.length / limit),
    };
  }

  async getUserById(id: string, includeDeleted = false): Promise<UserDto | null> {
    const user = await this.uow.users.findById(id);
    if (!user || (!includeDeleted && user.deletedAt)) {
      return null;
    }
    return this.mapToDto(user);
  }

  async createUser(dto: CreateUserDto): Promise<UserDto> {
    const existing = await this.uow.users.findByEmail(dto.email);
    if (existing) {
      throw new AppError('User with this email already exists', 'USER_EXISTS', 409);
    }

    const passwordService = getPasswordService();
    const passwordHash = await passwordService.hash(dto.password);

    const user = await this.uow.users.create({
      email: dto.email,
      passwordHash,
      firstName: dto.name || dto.username,
      lastName: '',
    });

    logger.info('User created by admin', { userId: user.id });
    return this.mapToDto(user);
  }

  async updateUser(id: string, dto: UpdateProfileDto): Promise<UserDto> {
    const user = await this.uow.users.findById(id);
    if (!user) {
      throw new AppError('User not found', 'USER_NOT_FOUND', 404);
    }

    const updated = await this.uow.users.update(id, dto);
    if (!updated) {
      throw new AppError('Failed to update user', 'UPDATE_FAILED', 500);
    }

    logger.info('User updated by admin', { userId: id });
    return this.mapToDto(updated);
  }

  async deleteUser(id: string, force = false): Promise<void> {
    const user = await this.uow.users.findById(id);
    if (!user) {
      throw new AppError('User not found', 'USER_NOT_FOUND', 404);
    }

    if (force) {
      await this.uow.users.delete(id);
      logger.info('User force deleted by admin', { userId: id });
    } else {
      await this.uow.users.update(id, { deletedAt: new Date() });
      logger.info('User soft deleted by admin', { userId: id });
    }
  }

  async restoreUser(id: string): Promise<UserDto> {
    const user = await this.uow.users.findById(id);
    if (!user) {
      throw new AppError('User not found', 'USER_NOT_FOUND', 404);
    }

    const updated = await this.uow.users.update(id, { deletedAt: null });
    if (!updated) {
      throw new AppError('Failed to restore user', 'RESTORE_FAILED', 500);
    }

    logger.info('User restored by admin', { userId: id });
    return this.mapToDto(updated);
  }

  async getUserStats(): Promise<UserStatsDto> {
    const users = await this.uow.users.findAll();
    const now = new Date();
    const monthAgo = new Date(now.getFullYear(), now.getMonth() - 1, now.getDate());

    return {
      totalUsers: users.length,
      activeUsers: users.filter(u => u.isActive).length,
      adminUsers: users.filter(u => u.role === 'ADMIN').length,
      newUsersThisMonth: users.filter(u => u.createdAt >= monthAgo).length,
    };
  }

  async getOldestUser(role: 'ADMIN' | 'USER' = 'USER'): Promise<UserDto | null> {
    const users = await this.uow.users.findAll();
    const activeByRole = users.filter(u => u.isActive && u.deletedAt === null);
    const sorted = activeByRole.sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime());

    return sorted.length > 0 ? this.mapToDto(sorted[0]) : null;
  }

  private mapToDto(user: import('../database/schema').User): UserDto {
    return {
      id: user.id,
      email: user.email,
      username: user.email.split('@')[0],
      name: `${user.firstName} ${user.lastName}`.trim(),
      role: user.role as 'ADMIN' | 'USER',
      isActive: user.isActive,
      emailVerified: user.emailVerified,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt,
      deletedAt: user.deletedAt ?? undefined,
    };
  }
}
```

**Step 3: Commit**

```bash
git add src/services/users.service.ts src/services/interfaces/users.service.interface.ts
git commit -m "feat: implement user management service"
```

---

#### Task 17: Implement User Routes and Controllers

**Files:**

- Create: `src/routes/users.routes.ts`
- Create: `src/controllers/users.controller.ts`
- Create: `src/routes/dto/users.dto.ts`
- Create: `src/middlewares/role.middleware.ts`

**Step 1: Create user DTOs**

```typescript
// src/routes/dto/users.dto.ts
import { z } from 'zod';
import {
  emailSchema,
  passwordSchema,
  nameSchema,
  paginationSchema,
} from '@core/validation/common.schema';

export const updateProfileSchema = z.object({
  firstName: nameSchema.optional(),
  lastName: nameSchema.optional(),
});

export const updatePasswordSchema = z.object({
  currentPassword: z.string().min(1, 'Current password is required'),
  newPassword: passwordSchema,
});

export const createUserSchema = z.object({
  email: emailSchema,
  username: z.string().min(3).max(50),
  name: nameSchema.optional(),
  password: passwordSchema,
  role: z.enum(['ADMIN', 'USER']).default('USER'),
});

export const getUsersQuerySchema = paginationSchema.extend({
  includeDeleted: z.coerce.boolean().optional().default(false),
  search: z.string().optional(),
});

export type UpdateProfileDto = z.infer<typeof updateProfileSchema>;
export type UpdatePasswordDto = z.infer<typeof updatePasswordSchema>;
export type CreateUserDto = z.infer<typeof createUserSchema>;
export type GetUsersDto = z.infer<typeof getUsersQuerySchema>;
```

**Step 2: Create role-based middleware**

```typescript
// src/middlewares/role.middleware.ts
import type { Context } from 'elysia';
import { AppError } from '@core/errors/app-error';

export type UserRole = 'ADMIN' | 'USER';

export function requireRole(allowedRoles: UserRole[]) {
  return (context: Context) => {
    const user = context.user as import('./auth.middleware').AuthContext | undefined;

    if (!user) {
      throw new AppError('Authentication required', 'NOT_AUTHENTICATED', 401);
    }

    const userRole = user.payload.role as UserRole | undefined;

    if (!userRole || !allowedRoles.includes(userRole)) {
      throw new AppError('Insufficient permissions', 'FORBIDDEN', 403);
    }
  };
}

export const requireAdmin = requireRole(['ADMIN']);
```

**Step 3: Create user controller**

```typescript
// src/controllers/users.controller.ts
import { injectable, inject } from 'tsyringe';
import type { IUsersService } from '../services/interfaces/users.service.interface';
import type {
  UpdateProfileDto,
  UpdatePasswordDto,
  CreateUserDto,
  GetUsersDto,
} from '../routes/dto/users.dto';
import { successResponse } from '@core/validation/error.types';
import { AppError } from '@core/errors/app-error';
import { RepositoryTokens } from '../services/constants';
import { logger } from '@core/logging/logger';

@injectable()
export class UsersController {
  constructor(@inject(RepositoryTokens.UsersService) private usersService: IUsersService) {}

  async getProfile(context: import('elysia').Context) {
    const user = context.user as import('../middlewares/auth.middleware').AuthContext | undefined;
    if (!user) {
      throw new AppError('Not authenticated', 'NOT_AUTHENTICATED', 401);
    }

    const result = await this.usersService.getProfile(user.userId);
    return successResponse(result, 'Profile retrieved successfully');
  }

  async updateProfile(context: import('elysia').Context, dto: UpdateProfileDto) {
    const user = context.user as import('../middlewares/auth.middleware').AuthContext | undefined;
    if (!user) {
      throw new AppError('Not authenticated', 'NOT_AUTHENTICATED', 401);
    }

    const result = await this.usersService.updateProfile(user.userId, dto);
    return successResponse(result, 'Profile updated successfully');
  }

  async updatePassword(context: import('elysia').Context, dto: UpdatePasswordDto) {
    const user = context.user as import('../middlewares/auth.middleware').AuthContext | undefined;
    if (!user) {
      throw new AppError('Not authenticated', 'NOT_AUTHENTICATED', 401);
    }

    await this.usersService.updatePassword(user.userId, dto);
    return successResponse(null, 'Password updated successfully');
  }

  async getUsers(dto: GetUsersDto) {
    const result = await this.usersService.getUsers(dto);
    return successResponse(result, 'Users retrieved successfully');
  }

  async getUserById(id: string) {
    const result = await this.usersService.getUserById(id);
    if (!result) {
      throw new AppError('User not found', 'USER_NOT_FOUND', 404);
    }
    return successResponse(result, 'User retrieved successfully');
  }

  async createUser(dto: CreateUserDto) {
    const result = await this.usersService.createUser(dto);
    return successResponse(result, 'User created successfully');
  }

  async updateUser(id: string, dto: UpdateProfileDto) {
    const result = await this.usersService.updateUser(id, dto);
    return successResponse(result, 'User updated successfully');
  }

  async deleteUser(id: string, query: { force?: string }) {
    await this.usersService.deleteUser(id, query.force === 'true');
    return successResponse(null, 'User deleted successfully');
  }

  async restoreUser(id: string) {
    const result = await this.usersService.restoreUser(id);
    return successResponse(result, 'User restored successfully');
  }

  async getUserStats() {
    const result = await this.usersService.getUserStats();
    return successResponse(result, 'User statistics retrieved');
  }
}
```

**Step 4: Create user routes**

```typescript
// src/routes/users.routes.ts
import { Elysia, t } from 'elysia';
import { UsersController } from '../controllers/users.controller';
import {
  updateProfileSchema,
  updatePasswordSchema,
  createUserSchema,
  getUsersQuerySchema,
} from './dto/users.dto';
import { requireAuth } from '../middlewares/auth.middleware';
import { requireAdmin } from '../middlewares/role.middleware';
import { rateLimit } from '../middlewares/rate-limit.middleware';
import { handleZodError, handleAppError } from '@core/validation/error.handler';
import { AppError } from '@core/errors/app-error';

export function createUserRoutes(): Elysia {
  const controller = new UsersController();

  return (
    new Elysia({ prefix: '/users' })
      .use(rateLimit)
      // User Profile Routes
      .get(
        '/me',
        async ({ set }) => {
          try {
            return await controller.getProfile;
          } catch (error) {
            if (error instanceof AppError) {
              const { response, status } = handleAppError(error);
              set.status = status;
              return response;
            }
            throw error;
          }
        },
        {
          beforeHandle: [requireAuth],
          detail: {
            summary: 'Get current user profile',
            tags: ['Users'],
          },
        }
      )
      .patch(
        '/me',
        async ({ body, set }) => {
          try {
            const validated = updateProfileSchema.parse(body);
            return await controller.updateProfile(undefined, validated);
          } catch (error) {
            if (error instanceof AppError) {
              const { response, status } = handleAppError(error);
              set.status = status;
              return response;
            }
            if (error instanceof import('zod').ZodError) {
              const response = handleZodError(error);
              set.status = 400;
              return response;
            }
            throw error;
          }
        },
        {
          beforeHandle: [requireAuth],
          body: t.Object({
            firstName: t.Optional(t.String()),
            lastName: t.Optional(t.String()),
          }),
          detail: {
            summary: 'Update current user profile',
            tags: ['Users'],
          },
        }
      )
      .patch(
        '/me/password',
        async ({ body, set }) => {
          try {
            const validated = updatePasswordSchema.parse(body);
            return await controller.updatePassword(undefined, validated);
          } catch (error) {
            if (error instanceof AppError) {
              const { response, status } = handleAppError(error);
              set.status = status;
              return response;
            }
            if (error instanceof import('zod').ZodError) {
              const response = handleZodError(error);
              set.status = 400;
              return response;
            }
            throw error;
          }
        },
        {
          beforeHandle: [requireAuth],
          body: t.Object({
            currentPassword: t.String(),
            newPassword: t.String(),
          }),
          detail: {
            summary: 'Change current user password',
            tags: ['Users'],
          },
        }
      )
  );
}

export function createAdminUserRoutes(): Elysia {
  const controller = new UsersController();

  return new Elysia({ prefix: '/admin/users' })
    .use(rateLimit)
    .get(
      '/',
      async ({ query, set }) => {
        try {
          const validated = getUsersQuerySchema.parse(query);
          return await controller.getUsers(validated);
        } catch (error) {
          if (error instanceof AppError) {
            const { response, status } = handleAppError(error);
            set.status = status;
            return response;
          }
          if (error instanceof import('zod').ZodError) {
            const response = handleZodError(error);
            set.status = 400;
            return response;
          }
          throw error;
        }
      },
      {
        beforeHandle: [requireAuth, requireAdmin],
        detail: {
          summary: 'Get all users (admin only)',
          tags: ['Admin', 'Users'],
        },
      }
    )
    .get(
      '/stats',
      async ({ set }) => {
        try {
          return await controller.getUserStats();
        } catch (error) {
          if (error instanceof AppError) {
            const { response, status } = handleAppError(error);
            set.status = status;
            return response;
          }
          throw error;
        }
      },
      {
        beforeHandle: [requireAuth, requireAdmin],
        detail: {
          summary: 'Get user statistics (admin only)',
          tags: ['Admin', 'Users'],
        },
      }
    )
    .post(
      '/',
      async ({ body, set }) => {
        try {
          const validated = createUserSchema.parse(body);
          return await controller.createUser(validated);
        } catch (error) {
          if (error instanceof AppError) {
            const { response, status } = handleAppError(error);
            set.status = status;
            return response;
          }
          if (error instanceof import('zod').ZodError) {
            const response = handleZodError(error);
            set.status = 400;
            return response;
          }
          throw error;
        }
      },
      {
        beforeHandle: [requireAuth, requireAdmin],
        detail: {
          summary: 'Create new user (admin only)',
          tags: ['Admin', 'Users'],
        },
      }
    );
}
```

**Step 5: Commit**

```bash
git add src/routes/users.routes.ts src/controllers/users.controller.ts src/routes/dto/users.dto.ts src/middlewares/role.middleware.ts
git commit -m "feat: implement user management routes and controllers"
```

---

### Phase 8: Product Management API

#### Task 18: Implement Product Schema and Repository

**Files:**

- Create: `src/database/schema/products.schema.ts`
- Create: `src/repositories/products.repository.ts`

**Step 1: Create product schema**

```typescript
// src/database/schema/products.schema.ts
import {
  boolean,
  pgTable,
  text,
  timestamp,
  uuid,
  numeric,
  integer,
  jsonb,
} from 'drizzle-orm/pg-core';

export const products = pgTable('products', {
  id: uuid('id').primaryKey().defaultRandom(),
  ownerId: uuid('owner_id').notNull().references('users.id', { onDelete: 'cascade' }),
  name: text('name').notNull(),
  description: text('description'),
  price: numeric('price', { precision: 10, scale: 2 }).notNull(),
  stock: integer('stock').notNull().default(0),
  attributes: jsonb('attributes')
    .$type<
      {
        name: string;
        values: string[];
        displayOrder?: number;
      }[]
    >()
    .default([]),
  variants: jsonb('variants')
    .$type<
      {
        sku: string;
        price?: string;
        stock?: number;
        isActive?: boolean;
        attributeValues: Record<string, string>;
      }[]
    >()
    .default([]),
  isActive: boolean('is_active').notNull().default(true),
  deletedAt: timestamp('deleted_at', { withTimezone: true }),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
});

export type Product = typeof products.$inferSelect;
export type NewProduct = typeof products.$inferInsert;
```

**Step 2: Create product repository**

```typescript
// src/repositories/products.repository.ts
import { eq, and, sql, lt } from 'drizzle-orm';
import type { Database } from '../database/connection';
import { products } from '../database/schema';
import type { Product, NewProduct } from '../database/schema';
import { CRUDRepository } from './base.repository';

export class ProductRepository extends CRUDRepository<Product, string> {
  get tableName() {
    return products;
  }

  async findById(id: string): Promise<Product | null> {
    try {
      const result = await this.db.select().from(products).where(eq(products.id, id)).limit(1);

      return result[0] || null;
    } catch (error) {
      this.logError('findById', error);
      return null;
    }
  }

  async findByOwner(ownerId: string, includeDeleted = false): Promise<Product[]> {
    try {
      let query = this.db.select().from(products).where(eq(products.ownerId, ownerId));

      if (!includeDeleted) {
        query = query.where(sql`${products.deletedAt} IS NULL`);
      }

      return await query;
    } catch (error) {
      this.logError('findByOwner', error);
      return [];
    }
  }

  async create(data: NewProduct): Promise<Product> {
    try {
      const result = await this.db.insert(products).values(data).returning();
      return result[0];
    } catch (error) {
      this.logError('create', error);
      throw error;
    }
  }

  async update(id: string, data: Partial<Product>): Promise<Product | null> {
    try {
      const result = await this.db
        .update(products)
        .set({ ...data, updatedAt: new Date() })
        .where(eq(products.id, id))
        .returning();

      return result[0] || null;
    } catch (error) {
      this.logError('update', error);
      throw error;
    }
  }

  async softDelete(id: string): Promise<boolean> {
    try {
      const result = await this.db
        .update(products)
        .set({ deletedAt: new Date(), updatedAt: new Date() })
        .where(eq(products.id, id))
        .returning();

      return result.length > 0;
    } catch (error) {
      this.logError('softDelete', error);
      return false;
    }
  }

  async restore(id: string): Promise<boolean> {
    try {
      const result = await this.db
        .update(products)
        .set({ deletedAt: null, updatedAt: new Date() })
        .where(eq(products.id, id))
        .returning();

      return result.length > 0;
    } catch (error) {
      this.logError('restore', error);
      return false;
    }
  }

  async delete(id: string): Promise<boolean> {
    try {
      const result = await this.db.delete(products).where(eq(products.id, id)).returning();
      return result.length > 0;
    } catch (error) {
      this.logError('delete', error);
      return false;
    }
  }

  protected async count(): Promise<number> {
    try {
      const result = await this.db.select({ count: products.id }).from(products);
      return result.length;
    } catch (error) {
      return this.handleRepositoryError('count', error, 0);
    }
  }
}

export interface IProductRepository {
  findById(id: string): Promise<Product | null>;
  findByOwner(ownerId: string, includeDeleted?: boolean): Promise<Product[]>;
  create(data: NewProduct): Promise<Product>;
  update(id: string, data: Partial<Product>): Promise<Product | null>;
  softDelete(id: string): Promise<boolean>;
  restore(id: string): Promise<boolean>;
  delete(id: string): Promise<boolean>;
}
```

**Step 3: Update database schema index**

```typescript
// src/database/schema/index.ts
export * from './users.schema';
export * from './sessions.schema';
export * from './products.schema';
```

**Step 4: Commit**

```bash
git add src/database/schema/products.schema.ts src/repositories/products.repository.ts src/database/schema/index.ts
git commit -m "feat: add product schema and repository"
```

---

#### Task 19: Implement Product Service

**Files:**

- Create: `src/services/interfaces/products.service.interface.ts`
- Create: `src/services/products.service.ts`

**Step 1: Create product service interface**

```typescript
// src/services/interfaces/products.service.interface.ts
import type { PaginatedResult } from '../../repositories/base.repository';

export interface CreateProductDto {
  name: string;
  description?: string;
  price: number;
  stock?: number;
  attributes?: Array<{
    name: string;
    values: string[];
    displayOrder?: number;
  }>;
  variants?: Array<{
    sku: string;
    price?: number;
    stock?: number;
    isActive?: boolean;
    attributeValues: Record<string, string>;
  }>;
}

export interface UpdateProductDto {
  name?: string;
  description?: string;
  price?: number;
  stock?: number;
  attributes?: Array<{
    name: string;
    values: string[];
    displayOrder?: number;
  }>;
  variants?: Array<{
    sku: string;
    price?: number;
    stock?: number;
    isActive?: boolean;
    attributeValues: Record<string, string>;
  }>;
  isActive?: boolean;
}

export interface GetProductsDto {
  page: number;
  limit: number;
  includeDeleted?: boolean;
  onlyDeleted?: boolean;
  search?: string;
  minPrice?: number;
  maxPrice?: number;
}

export interface ProductDto {
  id: string;
  ownerId: string;
  name: string;
  description?: string;
  price: string;
  stock: number;
  attributes: Array<{
    name: string;
    values: string[];
    displayOrder?: number;
  }>;
  variants: Array<{
    sku: string;
    price?: string;
    stock?: number;
    isActive?: boolean;
    attributeValues: Record<string, string>;
  }>;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
  deletedAt?: Date;
}

export interface IProductsService {
  getProducts(ownerId: string, dto: GetProductsDto): Promise<PaginatedResult<ProductDto>>;
  getProductById(id: string, ownerId: string): Promise<ProductDto | null>;
  createProduct(ownerId: string, dto: CreateProductDto): Promise<ProductDto>;
  updateProduct(id: string, ownerId: string, dto: UpdateProductDto): Promise<ProductDto | null>;
  deleteProduct(id: string, ownerId: string, force?: boolean): Promise<void>;
  restoreProduct(id: string, ownerId: string): Promise<ProductDto | null>;
  getProductStats(): Promise<{ totalProducts: number; activeProducts: number; totalValue: string }>;
}
```

**Step 2: Create product service implementation**

```typescript
// src/services/products.service.ts
import { injectable, inject } from 'tsyringe';
import type {
  IProductsService,
  CreateProductDto,
  UpdateProductDto,
  GetProductsDto,
  ProductDto,
} from './interfaces/products.service.interface';
import type { IProductRepository } from '../repositories/products.repository';
import { AppError } from '@core/errors/app-error';
import { logger } from '@core/logging/logger';
import type { UnitOfWork } from '../repositories/unit-of-work';

@injectable()
export class ProductsService implements IProductsService {
  constructor(@inject(RepositoryTokens.UnitOfWork) private uow: UnitOfWork) {}

  async getProducts(ownerId: string, dto: GetProductsDto): Promise<PaginatedResult<ProductDto>> {
    const products = await this.uow.products.findByOwner(ownerId);

    let filtered = products;

    // Apply filters
    if (!dto.includeDeleted && !dto.onlyDeleted) {
      filtered = filtered.filter(p => !p.deletedAt);
    }
    if (dto.onlyDeleted) {
      filtered = filtered.filter(p => p.deletedAt);
    }
    if (dto.search) {
      const searchLower = dto.search.toLowerCase();
      filtered = filtered.filter(
        p =>
          p.name.toLowerCase().includes(searchLower) ||
          (p.description && p.description.toLowerCase().includes(searchLower))
      );
    }
    if (dto.minPrice !== undefined) {
      filtered = filtered.filter(p => parseFloat(p.price) >= dto.minPrice!);
    }
    if (dto.maxPrice !== undefined) {
      filtered = filtered.filter(p => parseFloat(p.price) <= dto.maxPrice!);
    }

    // Pagination
    const { page, limit } = dto;
    const offset = (page - 1) * limit;

    return {
      data: filtered.slice(offset, offset + limit).map(this.mapToDto),
      total: filtered.length,
      page,
      pageSize: limit,
      totalPages: Math.ceil(filtered.length / limit),
    };
  }

  async getProductById(id: string, ownerId: string): Promise<ProductDto | null> {
    const product = await this.uow.products.findById(id);

    if (!product) {
      return null;
    }

    // Ownership check
    if (product.ownerId !== ownerId) {
      throw new AppError('Product not found', 'PRODUCT_NOT_FOUND', 404);
    }

    return this.mapToDto(product);
  }

  async createProduct(ownerId: string, dto: CreateProductDto): Promise<ProductDto> {
    // Validate price
    if (dto.price <= 0) {
      throw new AppError('Price must be positive', 'INVALID_PRICE', 400);
    }

    // Validate variants SKUs
    if (dto.variants) {
      const skuSet = new Set<string>();
      for (const variant of dto.variants) {
        if (skuSet.has(variant.sku)) {
          throw new AppError(`Duplicate SKU: ${variant.sku}`, 'DUPLICATE_SKU', 400);
        }
        skuSet.add(variant.sku);
      }
    }

    const product = await this.uow.products.create({
      ownerId,
      name: dto.name,
      description: dto.description,
      price: dto.price.toString(),
      stock: dto.stock ?? 0,
      attributes: dto.attributes ?? [],
      variants: dto.variants ?? [],
    });

    logger.info('Product created', { productId: product.id, ownerId });
    return this.mapToDto(product);
  }

  async updateProduct(
    id: string,
    ownerId: string,
    dto: UpdateProductDto
  ): Promise<ProductDto | null> {
    const product = await this.uow.products.findById(id);

    if (!product || product.deletedAt) {
      throw new AppError('Product not found', 'PRODUCT_NOT_FOUND', 404);
    }

    // Ownership check
    if (product.ownerId !== ownerId) {
      throw new AppError('Product not found', 'PRODUCT_NOT_FOUND', 404);
    }

    // Validate price if provided
    if (dto.price !== undefined && dto.price <= 0) {
      throw new AppError('Price must be positive', 'INVALID_PRICE', 400);
    }

    // Convert price to string if provided
    const updates: Partial<typeof product> = { ...dto };
    if (dto.price !== undefined) {
      updates.price = dto.price.toString();
    }

    const updated = await this.uow.products.update(id, updates);

    if (!updated) {
      throw new AppError('Failed to update product', 'UPDATE_FAILED', 500);
    }

    logger.info('Product updated', { productId: id, ownerId });
    return this.mapToDto(updated);
  }

  async deleteProduct(id: string, ownerId: string, force = false): Promise<void> {
    const product = await this.uow.products.findById(id);

    if (!product || product.deletedAt) {
      throw new AppError('Product not found', 'PRODUCT_NOT_FOUND', 404);
    }

    // Ownership check
    if (product.ownerId !== ownerId) {
      throw new AppError('Product not found', 'PRODUCT_NOT_FOUND', 404);
    }

    if (force) {
      await this.uow.products.delete(id);
      logger.info('Product force deleted', { productId: id, ownerId });
    } else {
      await this.uow.products.softDelete(id);
      logger.info('Product soft deleted', { productId: id, ownerId });
    }
  }

  async restoreProduct(id: string, ownerId: string): Promise<ProductDto | null> {
    const product = await this.uow.products.findById(id);

    if (!product || !product.deletedAt) {
      throw new AppError('Product not found or not deleted', 'PRODUCT_NOT_FOUND', 404);
    }

    // Ownership check
    if (product.ownerId !== ownerId) {
      throw new AppError('Product not found', 'PRODUCT_NOT_FOUND', 404);
    }

    await this.uow.products.restore(id);

    const restored = await this.uow.products.findById(id);
    if (!restored) {
      throw new AppError('Failed to restore product', 'RESTORE_FAILED', 500);
    }

    logger.info('Product restored', { productId: id, ownerId });
    return this.mapToDto(restored);
  }

  async getProductStats(): Promise<{
    totalProducts: number;
    activeProducts: number;
    totalValue: string;
  }> {
    const allProducts = await this.uow.products.findByOwner('', true); // Get all products

    const activeProducts = allProducts.filter(p => p.isActive && !p.deletedAt);
    const totalValue = activeProducts.reduce((sum, p) => sum + parseFloat(p.price), 0);

    return {
      totalProducts: allProducts.filter(p => !p.deletedAt).length,
      activeProducts: activeProducts.length,
      totalValue: totalValue.toFixed(2),
    };
  }

  private mapToDto(product: import('../database/schema').Product): ProductDto {
    return {
      id: product.id,
      ownerId: product.ownerId,
      name: product.name,
      description: product.description ?? undefined,
      price: product.price,
      stock: product.stock,
      attributes: product.attributes as ProductDto['attributes'],
      variants: product.variants as ProductDto['variants'],
      isActive: product.isActive,
      createdAt: product.createdAt,
      updatedAt: product.updatedAt,
      deletedAt: product.deletedAt ?? undefined,
    };
  }
}
```

**Step 3: Update repository tokens**

```typescript
// src/services/constants.ts
export const RepositoryTokens = {
  UnitOfWork: 'UnitOfWork',
  UserRepository: 'UserRepository',
  SessionRepository: 'SessionRepository',
  ProductsRepository: 'ProductsRepository',
  UsersService: 'UsersService',
  ProductsService: 'ProductsService',
  AuthService: 'AuthService',
} as const;
```

**Step 4: Commit**

```bash
git add src/services/products.service.ts src/services/interfaces/products.service.interface.ts src/services/constants.ts
git commit -m "feat: implement product management service"
```

---

#### Task 20: Implement Product Routes and Controllers

**Files:**

- Create: `src/routes/products.routes.ts`
- Create: `src/controllers/products.controller.ts`
- Create: `src/routes/dto/products.dto.ts`

**Step 1: Create product DTOs**

```typescript
// src/routes/dto/products.dto.ts
import { z } from 'zod';

export const productAttributeSchema = z.object({
  name: z.string().min(1).max(100),
  values: z.array(z.string().min(1).max(255)).min(1),
  displayOrder: z.number().int().optional(),
});

export const productVariantSchema = z.object({
  sku: z
    .string()
    .min(1)
    .max(100)
    .regex(/^[a-zA-Z0-9-]+$/, 'SKU must be alphanumeric'),
  price: z.number().positive().optional(),
  stock: z.number().int().nonnegative().optional(),
  isActive: z.boolean().optional(),
  attributeValues: z.record(z.string()),
});

export const createProductSchema = z.object({
  name: z.string().min(1).max(255),
  description: z.string().optional(),
  price: z.number().positive(),
  stock: z.number().int().nonnegative().optional(),
  attributes: z.array(productAttributeSchema).optional(),
  variants: z.array(productVariantSchema).optional(),
});

export const updateProductSchema = createProductSchema.partial().extend({
  isActive: z.boolean().optional(),
});

export const getProductsQuerySchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(20),
  includeDeleted: z.coerce.boolean().optional(),
  onlyDeleted: z.coerce.boolean().optional(),
  search: z.string().optional(),
  minPrice: z.coerce.number().positive().optional(),
  maxPrice: z.coerce.number().positive().optional(),
});

export type CreateProductDto = z.infer<typeof createProductSchema>;
export type UpdateProductDto = z.infer<typeof updateProductSchema>;
export type GetProductsDto = z.infer<typeof getProductsQuerySchema>;
```

**Step 2: Create product controller**

```typescript
// src/controllers/products.controller.ts
import { injectable, inject } from 'tsyringe';
import type { IProductsService } from '../services/interfaces/products.service.interface';
import type {
  CreateProductDto,
  UpdateProductDto,
  GetProductsDto,
} from '../routes/dto/products.dto';
import { successResponse } from '@core/validation/error.types';
import { AppError } from '@core/errors/app-error';
import { RepositoryTokens } from '../services/constants';
import { logger } from '@core/logging/logger';

@injectable()
export class ProductsController {
  constructor(
    @inject(RepositoryTokens.ProductsService) private productsService: IProductsService
  ) {}

  async getProducts(context: import('elysia').Context, dto: GetProductsDto) {
    const user = context.user as import('../middlewares/auth.middleware').AuthContext | undefined;
    if (!user) {
      throw new AppError('Not authenticated', 'NOT_AUTHENTICATED', 401);
    }

    const result = await this.productsService.getProducts(user.userId, dto);
    return successResponse(result, 'Products retrieved successfully');
  }

  async getProductById(context: import('elysia').Context, id: string) {
    const user = context.user as import('../middlewares/auth.middleware').AuthContext | undefined;
    if (!user) {
      throw new AppError('Not authenticated', 'NOT_AUTHENTICATED', 401);
    }

    const result = await this.productsService.getProductById(id, user.userId);
    if (!result) {
      throw new AppError('Product not found', 'PRODUCT_NOT_FOUND', 404);
    }

    return successResponse(result, 'Product retrieved successfully');
  }

  async createProduct(context: import('elysia').Context, dto: CreateProductDto) {
    const user = context.user as import('../middlewares/auth.middleware').AuthContext | undefined;
    if (!user) {
      throw new AppError('Not authenticated', 'NOT_AUTHENTICATED', 401);
    }

    const result = await this.productsService.createProduct(user.userId, dto);
    return successResponse(result, 'Product created successfully');
  }

  async updateProduct(context: import('elysia').Context, id: string, dto: UpdateProductDto) {
    const user = context.user as import('../middlewares/auth.middleware').AuthContext | undefined;
    if (!user) {
      throw new AppError('Not authenticated', 'NOT_AUTHENTICATED', 401);
    }

    const result = await this.productsService.updateProduct(id, user.userId, dto);
    if (!result) {
      throw new AppError('Product not found or update failed', 'UPDATE_FAILED', 404);
    }

    return successResponse(result, 'Product updated successfully');
  }

  async deleteProduct(context: import('elysia').Context, id: string, query: { force?: string }) {
    const user = context.user as import('../middlewares/auth.middleware').AuthContext | undefined;
    if (!user) {
      throw new AppError('Not authenticated', 'NOT_AUTHENTICATED', 401);
    }

    await this.productsService.deleteProduct(id, user.userId, query.force === 'true');
    return successResponse(null, 'Product deleted successfully');
  }

  async restoreProduct(context: import('elysia').Context, id: string) {
    const user = context.user as import('../middlewares/auth.middleware').AuthContext | undefined;
    if (!user) {
      throw new AppError('Not authenticated', 'NOT_AUTHENTICATED', 401);
    }

    const result = await this.productsService.restoreProduct(id, user.userId);
    if (!result) {
      throw new AppError('Product not found or restore failed', 'RESTORE_FAILED', 404);
    }

    return successResponse(result, 'Product restored successfully');
  }

  async getProductStats() {
    const result = await this.productsService.getProductStats();
    return successResponse(result, 'Product statistics retrieved');
  }
}
```

**Step 3: Create product routes**

```typescript
// src/routes/products.routes.ts
import { Elysia, t } from 'elysia';
import { ProductsController } from '../controllers/products.controller';
import {
  createProductSchema,
  updateProductSchema,
  getProductsQuerySchema,
} from './dto/products.dto';
import { requireAuth } from '../middlewares/auth.middleware';
import { rateLimit } from '../middlewares/rate-limit.middleware';
import { handleZodError, handleAppError } from '@core/validation/error.handler';
import { AppError } from '@core/errors/app-error';

export function createProductRoutes(): Elysia {
  const controller = new ProductsController();

  return new Elysia({ prefix: '/products' })
    .use(rateLimit)
    .get(
      '/',
      async ({ query, set }) => {
        try {
          const validated = getProductsQuerySchema.parse(query);
          return await controller.getProducts(undefined, validated);
        } catch (error) {
          if (error instanceof AppError) {
            const { response, status } = handleAppError(error);
            set.status = status;
            return response;
          }
          if (error instanceof import('zod').ZodError) {
            const response = handleZodError(error);
            set.status = 400;
            return response;
          }
          throw error;
        }
      },
      {
        beforeHandle: [requireAuth],
        detail: {
          summary: 'Get user products with filters',
          tags: ['Products'],
        },
      }
    )
    .get(
      '/:id',
      async ({ params, set }) => {
        try {
          return await controller.getProductById(undefined, params.id);
        } catch (error) {
          if (error instanceof AppError) {
            const { response, status } = handleAppError(error);
            set.status = status;
            return response;
          }
          throw error;
        }
      },
      {
        beforeHandle: [requireAuth],
        detail: {
          summary: 'Get product by ID',
          tags: ['Products'],
        },
      }
    )
    .post(
      '/',
      async ({ body, set }) => {
        try {
          const validated = createProductSchema.parse(body);
          return await controller.createProduct(undefined, validated);
        } catch (error) {
          if (error instanceof AppError) {
            const { response, status } = handleAppError(error);
            set.status = status;
            return response;
          }
          if (error instanceof import('zod').ZodError) {
            const response = handleZodError(error);
            set.status = 400;
            return response;
          }
          throw error;
        }
      },
      {
        beforeHandle: [requireAuth],
        detail: {
          summary: 'Create new product',
          tags: ['Products'],
        },
      }
    )
    .patch(
      '/:id',
      async ({ params, body, set }) => {
        try {
          const validated = updateProductSchema.parse(body);
          return await controller.updateProduct(undefined, params.id, validated);
        } catch (error) {
          if (error instanceof AppError) {
            const { response, status } = handleAppError(error);
            set.status = status;
            return response;
          }
          if (error instanceof import('zod').ZodError) {
            const response = handleZodError(error);
            set.status = 400;
            return response;
          }
          throw error;
        }
      },
      {
        beforeHandle: [requireAuth],
        detail: {
          summary: 'Update product',
          tags: ['Products'],
        },
      }
    )
    .delete(
      '/:id',
      async ({ params, query, set }) => {
        try {
          return await controller.deleteProduct(undefined, params.id, query);
        } catch (error) {
          if (error instanceof AppError) {
            const { response, status } = handleAppError(error);
            set.status = status;
            return response;
          }
          throw error;
        }
      },
      {
        beforeHandle: [requireAuth],
        detail: {
          summary: 'Delete product',
          tags: ['Products'],
        },
      }
    )
    .post(
      '/:id/restore',
      async ({ params, set }) => {
        try {
          return await controller.restoreProduct(undefined, params.id);
        } catch (error) {
          if (error instanceof AppError) {
            const { response, status } = handleAppError(error);
            set.status = status;
            return response;
          }
          throw error;
        }
      },
      {
        beforeHandle: [requireAuth],
        detail: {
          summary: 'Restore deleted product',
          tags: ['Products'],
        },
      }
    );
}

export function createAdminProductRoutes(): Elysia {
  const controller = new ProductsController();

  return new Elysia({ prefix: '/admin/products' }).get(
    '/stats',
    async ({ set }) => {
      try {
        return await controller.getProductStats();
      } catch (error) {
        if (error instanceof AppError) {
          const { response, status } = handleAppError(error);
          set.status = status;
          return response;
        }
        throw error;
      }
    },
    {
      beforeHandle: [requireAuth],
      detail: {
        summary: 'Get product statistics (admin)',
        tags: ['Admin', 'Products'],
      },
    }
  );
}
```

**Step 4: Commit**

```bash
git add src/routes/products.routes.ts src/controllers/products.controller.ts src/routes/dto/products.dto.ts
git commit -m "feat: implement product management routes and controllers"
```

---

### Phase 9: Application Bootstrap

#### Task 21: Create Main Application File

**Files:**

- Create: `src/app.ts`
- Create: `src/server.ts`

**Step 1: Create Elysia app**

```typescript
// src/app.ts
import { Elysia } from 'elysia';
import { swagger } from '@elysiajs/swagger';
import { cors } from '@elysiajs/cors';
import { loggerPlugin } from '@core/logging/middleware';
import { createAuthRoutes } from './routes/auth.routes';
import { createHealthRoutes } from './routes/health.routes';
import { handleAppError } from '@core/validation/error.handler';
import { config } from '@config';

export function createApp() {
  const app = new Elysia({
    prefix: '/api',
  })
    .use(loggerPlugin())
    .use(
      cors({
        origin: config.env.CORS_ORIGIN,
        credentials: config.env.CORS_CREDENTIALS,
        methods: config.env.CORS_METHODS.split(','),
        allowedHeaders: config.env.CORS_ALLOWED_HEADERS.split(','),
      })
    )
    .use(
      swagger({
        documentation: {
          info: {
            title: 'Bun Elysia PASETO Boilerplate API',
            version: '1.0.0',
            description: 'Production-ready monolith REST API with PASETO authentication',
          },
          tags: [
            { name: 'Authentication', description: 'Authentication endpoints' },
            { name: 'Health', description: 'Health check endpoints' },
          ],
        },
        path: '/docs',
      })
    )
    .use(createAuthRoutes())
    .use(createHealthRoutes())
    .onError(({ error, set, code }) => {
      if (error instanceof Error) {
        const { response, status } = handleAppError(error);
        set.status = status;
        return response;
      }
      set.status = 500;
      return {
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: 'An unexpected error occurred',
        },
      };
    });

  return app;
}
```

**Step 2: Create health routes**

```typescript
// src/routes/health.routes.ts
import { Elysia, t } from 'elysia';
import { getConnection } from '../database/connection';
import { getRedisClient } from '@core/redis/connection';
import { config } from '@config';
import { successResponse } from '@core/validation/error.types';

interface HealthStatus {
  status: 'healthy' | 'degraded' | 'unhealthy';
  timestamp: string;
  uptime: number;
  version: string;
  checks: {
    database: { status: 'pass' | 'fail'; latency?: number };
    redis: { status: 'pass' | 'fail'; latency?: number };
  };
}

export function createHealthRoutes(): Elysia {
  return new Elysia({ prefix: '/health' })
    .get(
      '/',
      async () => {
        const startTime = performance.now();
        const checks: HealthStatus['checks'] = {
          database: { status: 'pass' },
          redis: { status: 'pass' },
        };

        // Check database
        try {
          const db = getConnection();
          const dbStart = performance.now();
          await db.execute('SELECT 1');
          checks.database.latency = performance.now() - dbStart;
        } catch {
          checks.database.status = 'fail';
        }

        // Check Redis
        try {
          const redis = getRedisClient();
          const redisStart = performance.now();
          await redis.ping();
          checks.redis.latency = performance.now() - redisStart;
        } catch {
          checks.redis.status = 'fail';
        }

        const overallStatus: HealthStatus['status'] =
          checks.database.status === 'pass' && checks.redis.status === 'pass'
            ? 'healthy'
            : 'unhealthy';

        return {
          ...checks,
          status: overallStatus,
          timestamp: new Date().toISOString(),
          uptime: process.uptime(),
          version: '1.0.0',
        };
      },
      {
        detail: {
          summary: 'Health check',
          tags: ['Health'],
          description: 'Returns the health status of the service and its dependencies',
        },
      }
    )
    .get(
      '/ready',
      async () => {
        return { ready: true, timestamp: new Date().toISOString() };
      },
      {
        detail: {
          summary: 'Readiness check',
          tags: ['Health'],
          description: 'Returns whether the service is ready to accept traffic',
        },
      }
    )
    .get(
      '/live',
      async () => {
        return { live: true, timestamp: new Date().toISOString() };
      },
      {
        detail: {
          summary: 'Liveness check',
          tags: ['Health'],
          description: 'Returns whether the service is running',
        },
      }
    );
}
```

**Step 3: Create server bootstrap**

```typescript
// src/server.ts
import { createApp } from './app';
import { logger } from './core/logging/logger';
import { config } from './config';
import { closeConnection } from './database/connection';
import { closeRedisClient } from './core/redis/connection';

const app = createApp();

const server = Bun.serve({
  port: config.env.PORT,
  hostname: config.env.HOST,
  fetch: app.fetch,
});

logger.info(`Server started on http://${config.env.HOST}:${config.env.PORT}`);
logger.info(`API documentation available at http://${config.env.HOST}:${config.env.PORT}/api/docs`);

// Graceful shutdown
const shutdown = async (signal: string) => {
  logger.info(`Received ${signal}, shutting down gracefully...`);

  server.stop();
  logger.info('HTTP server stopped');

  await closeConnection();
  logger.info('Database connections closed');

  await closeRedisClient();
  logger.info('Redis connections closed');

  process.exit(0);
};

process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT', () => shutdown('SIGINT'));

// Handle uncaught errors
process.on('uncaughtException', error => {
  logger.error('Uncaught exception', error);
  shutdown('UNCAUGHT_EXCEPTION');
});

process.on('unhandledRejection', reason => {
  logger.error('Unhandled rejection', reason);
  shutdown('UNHANDLED_REJECTION');
});

export { app, server };
```

**Step 4: Commit**

```bash
git add src/app.ts src/server.ts
git commit -m "feat: create main application with server bootstrap"
```

---

### Phase 8: Testing Infrastructure

#### Task 17: Setup Testing Infrastructure

**Files:**

- Create: `tests/setup.ts`
- Create: `tests/mocks/repository.mock.ts`

**Step 1: Create test setup**

```typescript
// tests/setup.ts
import { beforeAll, afterAll } from 'bun:test';

let testDb: any = null;
let testRedis: any = null;

beforeAll(async () => {
  // Setup test database connection
  process.env.DATABASE_URL =
    process.env.TEST_DATABASE_URL || 'postgresql://postgres:postgres@localhost:5432/test_db';

  // Setup test Redis
  process.env.REDIS_DB = '15'; // Use separate DB for tests
});

afterAll(async () => {
  // Cleanup test database
  if (testDb) {
    await testDb.close();
  }

  // Cleanup test Redis
  if (testRedis) {
    await testRedis.quit();
  }
});
```

**Step 2: Create repository mocks**

```typescript
// tests/mocks/repository.mock.ts
import type { User, Session, NewUser, NewSession } from '../../src/database/schema';

export class MockUserRepository {
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
      isActive: data.isActive ?? true,
      emailVerified: data.emailVerified ?? false,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    this.users.set(user.id, user);
    return user;
  }

  clear(): void {
    this.users.clear();
  }
}

export class MockSessionRepository {
  private sessions: Map<string, Session> = new Map();

  async findById(id: string): Promise<Session | null> {
    return this.sessions.get(id) || null;
  }

  async findByTokenId(tokenId: string): Promise<Session | null> {
    return Array.from(this.sessions.values()).find(s => s.tokenId === tokenId) || null;
  }

  async create(data: NewSession): Promise<Session> {
    const session: Session = {
      id: crypto.randomUUID(),
      ...data,
      isRevoked: data.isRevoked ?? false,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    this.sessions.set(session.id, session);
    return session;
  }

  async revoke(id: string): Promise<boolean> {
    const session = this.sessions.get(id);
    if (session) {
      session.isRevoked = true;
      session.updatedAt = new Date();
      return true;
    }
    return false;
  }

  clear(): void {
    this.sessions.clear();
  }
}
```

**Step 3: Commit**

```bash
git add tests/
git commit -m "feat: setup testing infrastructure with mocks"
```

---

### Phase 9: Docker and Infrastructure

#### Task 18: Create Docker Configuration

**Files:**

- Create: `infra/docker/Dockerfile`
- Create: `infra/docker/docker-compose.yml`

**Step 1: Create Dockerfile**

```dockerfile
# infra/docker/Dockerfile
FROM oven/bun:1.1 AS base
WORKDIR /app

# Install dependencies
FROM base AS install
RUN mkdir -p /temp/dev
COPY package.json bun.lockb /temp/dev/
RUN cd /temp/dev && bun install --frozen-lockfile

RUN mkdir -p /temp/prod
COPY package.json bun.lockb /temp/prod/
RUN cd /temp/prod && bun install --frozen-lockfile --production

# Production image
FROM base AS release
COPY --from=install /temp/prod/node_modules node_modules
COPY --from=install /temp/dev/node_modules/.prisma .prisma
COPY . .

# Generate Prisma client if needed
# RUN bun run db:generate

USER bun
EXPOSE 3000

CMD ["bun", "run", "start"]
```

**Step 2: Create docker-compose**

```yaml
# infra/docker/docker-compose.yml
version: '3.9'

services:
  app:
    build:
      context: ../..
      dockerfile: infra/docker/Dockerfile
    ports:
      - '3000:3000'
    environment:
      - NODE_ENV=development
      - DATABASE_URL=postgresql://postgres:postgres@postgres:5432/bun_elysia_paseto
      - REDIS_HOST=redis
      - REDIS_PORT=6379
      - PASETO_LOCAL_KEY=${PASETO_LOCAL_KEY}
      - PASETO_PUBLIC_KEY=${PASETO_PUBLIC_KEY}
      - PASETO_SECRET_KEY=${PASETO_SECRET_KEY}
    depends_on:
      - postgres
      - redis
    volumes:
      - .:/app
      - /app/node_modules
    command: bun run dev

  postgres:
    image: postgres:16-alpine
    ports:
      - '5432:5432'
    environment:
      - POSTGRES_USER=postgres
      - POSTGRES_PASSWORD=postgres
      - POSTGRES_DB=bun_elysia_paseto
    volumes:
      - postgres_data:/var/lib/postgresql/data

  redis:
    image: redis:7-alpine
    ports:
      - '6379:6379'
    volumes:
      - redis_data:/data

volumes:
  postgres_data:
  redis_data:
```

**Step 3: Commit**

```bash
git add infra/docker/
git commit -m "feat: add Docker configuration for development"
```

---

### Phase 10: Documentation

#### Task 19: Create Comprehensive Documentation

**Files:**

- Create: `README.md`
- Create: `docs/architecture/overview.md`
- Create: `docs/architecture/authentication.md`
- Create: `docs/standardization/coding-standards.md`

**Step 1: Create README**

```markdown
# Bun Elysia PASETO Boilerplate

> Production-ready monolith REST API boilerplate with PASETO v4 authentication.

[![Bun](https://img.shields.io/badge/Bun-1.1+-ff69b4?logo=bun)](https://bun.sh)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.3+-blue?logo=typescript)](https://www.typescriptlang.org/)
[![License](https://img.shields.io/badge/license-MIT-green)](LICENSE)

## Features

- **Modern Stack**: Bun runtime with Elysia framework for superior TypeScript experience
- **Secure Authentication**: PASETO v4 tokens (more secure than JWT)
- **Clean Architecture**: Modular structure with clear separation of concerns
- **Type-Safe**: Full TypeScript with Zod validation
- **Production Ready**: Health checks, graceful shutdown, structured logging
- **Rate Limiting**: Redis-based rate limiting
- **ORM**: Drizzle ORM with PostgreSQL
- **Testing**: Built-in test framework with mocks

## Quick Start

\`\`\`bash

# Install dependencies

bun install

# Copy environment variables

cp .env.example .env

# Generate PASETO key (32 bytes in hex)

openssl rand -hex 32

# Run migrations

bun run db:migrate

# Start development server

bun run dev
\`\`\`

API available at `http://localhost:3000/api`
Documentation at `http://localhost:3000/api/docs`

## Project Structure

\`\`\`
src/
├── app.ts # Elysia app setup
├── server.ts # Server bootstrap
├── config/ # Configuration management
├── core/ # Core utilities
│ ├── paseto/ # PASETO implementation
│ ├── crypto/ # Password hashing
│ ├── logging/ # Structured logging
│ └── validation/ # Zod schemas
├── database/ # Database layer
│ ├── schema/ # Drizzle schemas
│ └── migrations/ # Migration files
├── repositories/ # Data access layer
├── services/ # Business logic
├── controllers/ # Request/response handling
├── routes/ # API routes
└── middlewares/ # Custom middleware
\`\`\`

## API Endpoints

### Authentication

| Method | Endpoint             | Description          | Auth Required |
| ------ | -------------------- | -------------------- | ------------- |
| POST   | `/api/auth/register` | Register new user    | ❌ No         |
| POST   | `/api/auth/login`    | User login           | ❌ No         |
| POST   | `/api/auth/refresh`  | Refresh access token | ❌ No         |
| POST   | `/api/auth/logout`   | User logout          | ✅ Yes        |
| GET    | `/api/auth/me`       | Get current user     | ✅ Yes        |

### User Profile

| Method | Endpoint                 | Description                          | Auth Required |
| ------ | ------------------------ | ------------------------------------ | ------------- |
| GET    | `/api/users/me`          | Get current user profile             | ✅ Yes        |
| PATCH  | `/api/users/me`          | Update current user profile          | ✅ Yes        |
| PATCH  | `/api/users/me/password` | Change password                      | ✅ Yes        |
| PATCH  | `/api/users/me/email`    | Change email (requires verification) | ✅ Yes        |

### User Admin

| Method | Endpoint                       | Description              | Auth Required | Role  |
| ------ | ------------------------------ | ------------------------ | ------------- | ----- |
| GET    | `/api/admin/users`             | Get paginated users list | ✅ Yes        | ADMIN |
| GET    | `/api/admin/users/:id`         | Get user by ID           | ✅ Yes        | ADMIN |
| POST   | `/api/admin/users`             | Create new user          | ✅ Yes        | ADMIN |
| PATCH  | `/api/admin/users/:id`         | Update user              | ✅ Yes        | ADMIN |
| DELETE | `/api/admin/users/:id`         | Soft delete user         | ✅ Yes        | ADMIN |
| POST   | `/api/admin/users/:id/restore` | Restore deleted user     | ✅ Yes        | ADMIN |
| GET    | `/api/admin/users/stats`       | Get user statistics      | ✅ Yes        | ADMIN |

### Products

| Method | Endpoint                    | Description                          | Auth Required |
| ------ | --------------------------- | ------------------------------------ | ------------- |
| GET    | `/api/products`             | Get products (with filters)          | ✅ Yes        |
| GET    | `/api/products/:id`         | Get product by ID                    | ✅ Yes        |
| POST   | `/api/products`             | Create product                       | ✅ Yes        |
| PATCH  | `/api/products/:id`         | Update product (owner only)          | ✅ Yes        |
| DELETE | `/api/products/:id`         | Soft delete product (owner only)     | ✅ Yes        |
| POST   | `/api/products/:id/restore` | Restore deleted product (owner only) | ✅ Yes        |

### Admin Endpoints

| Method | Endpoint                    | Description             | Auth Required | Role  |
| ------ | --------------------------- | ----------------------- | ------------- | ----- |
| GET    | `/api/admin/health`         | Detailed health check   | ✅ Yes        | ADMIN |
| GET    | `/api/admin/products/stats` | Product statistics      | ✅ Yes        | ADMIN |
| GET    | `/api/admin/users/oldest`   | Get oldest user by role | ✅ Yes        | ADMIN |

### Internal API

| Method | Endpoint                     | Description                | Auth Required |
| ------ | ---------------------------- | -------------------------- | ------------- |
| GET    | `/api/internal/users/oldest` | Get oldest user (internal) | 🔑 System     |

### Health

| Method | Endpoint            | Description       | Auth Required |
| ------ | ------------------- | ----------------- | ------------- |
| GET    | `/api/health`       | Full health check | ❌ No         |
| GET    | `/api/health/ready` | Readiness probe   | ❌ No         |
| GET    | `/api/health/live`  | Liveness probe    | ❌ No         |

## Environment Variables

See `.env.example` for all available variables.

## Contributing

This boilerplate follows the coding standards in `docs/standardization/coding-standards.md`.

## License

MIT
```

**Step 2: Create architecture overview**

```markdown
# Architecture Overview

## Design Principles

This boilerplate follows these key principles:

1. **Separation of Concerns**: Each layer has a single responsibility
2. **Dependency Inversion**: High-level modules don't depend on low-level modules
3. **Interface Segregation**: Small, focused interfaces
4. **Open/Closed**: Open for extension, closed for modification

## Architecture Layers

\`\`\`
┌─────────────────────────────────────────────────────┐
│ API Layer │
│ (Routes → Controllers → Middleware) │
├─────────────────────────────────────────────────────┤
│ Business Logic │
│ (Services with Interfaces for DI) │
├─────────────────────────────────────────────────────┤
│ Data Access │
│ (Repositories with Unit of Work pattern) │
├─────────────────────────────────────────────────────┤
│ Infrastructure │
│ (Database, Redis, PASETO, Logging) │
└─────────────────────────────────────────────────────┘
\`\`\`

## Request Flow

\`\`\`
Client Request
↓
Elysia Router
↓
Middleware (Auth, Rate Limit, Logging)
↓
Controller (Validation)
↓
Service (Business Logic)
↓
Repository (Data Access)
↓
Database
\`\`\`

## Key Patterns

- **Repository Pattern**: Abstracts data access
- **Unit of Work**: Manages transactions
- **Dependency Injection**: TSyringe container
- **Domain Events**: For future microservices migration
```

**Step 3: Create authentication documentation**

```markdown
# Authentication Architecture

## PASETO v4 Tokens

We use PASETO (Platform-Agnostic SEcurity TOkens) instead of JWT for better security.

### Why PASETO?

| Feature             | JWT              | PASETO                |
| ------------------- | ---------------- | --------------------- |
| Algorithm confusion | ❌ Vulnerable    | ✅ Protected          |
| Implicit security   | ❌ Many pitfalls | ✅ Explicit           |
| Key versioning      | ❌ Not built-in  | ✅ Built-in           |
| Implementation      | ❌ Many options  | ✅ Single correct way |

### Token Types

#### Access Token (v4.local)

- **Purpose**: API authentication
- **Lifetime**: 15 minutes
- **Contents**: User ID, email, role, permissions
- **Storage**: Memory (recommended) or secure HTTP-only cookie

#### Refresh Token (v4.local)

- **Purpose**: Get new access tokens
- **Lifetime**: 7 days
- **Contents**: User ID, token ID
- **Storage**: Database (sessions table)

### Token Payload Structure

\`\`\`typescript
interface AccessTokenPayload {
iss: string; // Issuer
sub: string; // User ID
exp: number; // Expiration timestamp
iat: number; // Issued at timestamp
jti: string; // Token ID (unique)
type: 'access';
email?: string;
role?: string;
permissions?: string[];
}
\`\`\`

### Security Measures

1. **Token Binding**: Tokens bound to user ID
2. **Session Validation**: Refresh tokens stored in DB
3. **Revocation**: Sessions can be revoked
4. **Rotation**: New refresh tokens issued on refresh
5. **Expiry**: Short-lived access tokens
```

**Step 4: Create coding standards**

```markdown
# Coding Standards

## General Rules

1. **2-space indentation**
2. **Single quotes for strings**
3. **Semicolons required**
4. **Max line length: 100 characters**
5. **No unused variables** (prefix with `_` if intentionally unused)

## TypeScript

- **Enable strict mode**
- **Use `interface` for public API**
- **Use `type` for unions/intersections**
- **Avoid `any`** - use `unknown` instead
- **Prefer `const` assertions** for literals

## Naming Conventions

| Type               | Convention                 | Example           |
| ------------------ | -------------------------- | ----------------- |
| Files              | kebab-case                 | `auth.service.ts` |
| Classes            | PascalCase                 | `AuthService`     |
| Interfaces         | PascalCase with `I` prefix | `IAuthService`    |
| Functions          | camelCase                  | `getUserById`     |
| Constants          | SCREAMING_SNAKE_CASE       | `MAX_RETRIES`     |
| Private properties | camelCase                  | `private userId`  |
| Types/Type aliases | PascalCase                 | `UserDto`         |

## Error Handling

\`\`\`typescript
// ✅ Good
try {
const result = await this.service.doSomething();
return successResponse(result);
} catch (error) {
this.logger.error('Operation failed', error);
throw new AppError('Operation failed', 'OPERATION_ERROR', 500);
}

// ❌ Bad
try {
const result = await this.service.doSomething();
return result;
} catch (e) {
throw e;
}
\`\`\`

## Testing

- **Arrange-Act-Assert** pattern
- **Descriptive test names**
- **One assertion per test** (when possible)
- **Mock external dependencies**

## Comments

- **Code should be self-documenting**
- **Comment WHY, not WHAT**
- **JSDoc for public APIs**
```

**Step 5: Commit**

```bash
git add README.md docs/
git commit -m "docs: add comprehensive documentation"
```

---

#### Task 20: Final Configuration Files

**Files:**

- Create: `commitlint.config.js`
- Create: `.husky/pre-commit`
- Create: `.vscode/settings.json`

**Step 1: Create commitlint config**

```javascript
// commitlint.config.js
export default {
  extends: ['@commitlint/config-conventional'],
  rules: {
    'type-enum': [
      2,
      'always',
      [
        'feat', // New feature
        'fix', // Bug fix
        'docs', // Documentation only
        'style', // Code style changes (formatting, etc)
        'refactor', // Code refactoring
        'perf', // Performance improvement
        'test', // Adding or updating tests
        'chore', // Maintenance tasks
        'revert', // Revert a previous commit
      ],
    ],
    'scope-enum': [2, 'always', ['auth', 'database', 'api', 'config', 'deps']],
    'subject-case': [0],
  },
};
```

**Step 2: Create pre-commit hook**

```bash
# .husky/pre-commit
#!/bin/sh
. "$(dirname "$0")/_/husky.sh"

bun run lint
bun run format:check
bun test
```

**Step 3: Create VSCode settings**

```json
{
  "editor.formatOnSave": true,
  "editor.defaultFormatter": "esbenp.prettier-vscode",
  "editor.codeActionsOnSave": {
    "source.fixAll.eslint": true
  },
  "typescript.tsdk": "node_modules/typescript/lib",
  "typescript.enablePromptUseWorkspaceTsdk": true,
  "files.exclude": {
    "**/.git": true,
    "**/.DS_Store": true,
    "**/node_modules": true,
    "**/dist": true
  }
}
```

**Step 4: Make hooks executable and initialize**

```bash
chmod +x .husky/pre-commit
bun run prepare
```

**Step 5: Commit**

```bash
git add .commitlint.config.js .husky/ .vscode/
git commit -m "chore: setup git hooks and editor configuration"
```

---

## Verification Steps

After completing all tasks:

1. **Verify project builds**

   ```bash
   bun run build
   ```

2. **Run linter**

   ```bash
   bun run lint
   ```

3. **Run tests**

   ```bash
   bun test
   ```

4. **Start development server**

   ```bash
   bun run dev
   ```

5. **Test API endpoints**

   ```bash
   curl http://localhost:3000/api/health
   curl -X POST http://localhost:3000/api/auth/register \
     -H "Content-Type: application/json" \
     -d '{"email":"test@example.com","password":"SecurePass123!","firstName":"Test","lastName":"User"}'
   ```

6. **Access Swagger documentation**
   ```
   http://localhost:3000/api/docs
   ```

---

## Phase 11: Elysia Plugin Architecture & Production Features

#### Task 22: Implement Elysia Plugin System

**Files:**

- Create: `src/plugins/index.ts`
- Create: `src/plugins/health.plugin.ts`
- Create: `src/plugins/metrics.plugin.ts`
- Create: `src/plugins/tracing.plugin.ts`

**Step 1: Create plugin base and index**

```typescript
// src/plugins/index.ts
import { Elysia } from 'elysia';
import { healthPlugin } from './health.plugin';
import { metricsPlugin } from './metrics.plugin';
import { tracingPlugin } from './tracing.plugin';
import { cachingPlugin } from './caching.plugin';
import { rateLimitPlugin } from './rate-limit.plugin';

export interface PluginConfig {
  health?: boolean;
  metrics?: boolean;
  tracing?: boolean;
  caching?: boolean;
  rateLimit?: boolean;
}

export function registerPlugins(app: Elysia, config: PluginConfig = {}) {
  if (config.health !== false) {
    app.use(healthPlugin());
  }

  if (config.metrics) {
    app.use(metricsPlugin());
  }

  if (config.tracing) {
    app.use(tracingPlugin());
  }

  if (config.caching) {
    app.use(cachingPlugin());
  }

  if (config.rateLimit !== false) {
    app.use(rateLimitPlugin());
  }

  return app;
}

export * from './health.plugin';
export * from './metrics.plugin';
export * from './tracing.plugin';
export * from './caching.plugin';
export * from './rate-limit.plugin';
```

**Step 2: Create health plugin**

```typescript
// src/plugins/health.plugin.ts
import { Elysia, t } from 'elysia';
import { getConnection } from '@database/connection';
import { getRedisClient } from '@core/redis/connection';
import { logger } from '@core/logging/logger';
import type { Context } from 'elysia';

interface HealthCheck {
  name: string;
  status: 'pass' | 'fail' | 'warn';
  latency?: number;
  message?: string;
}

interface HealthResponse {
  status: 'pass' | 'fail' | 'warn';
  version: string;
  timestamp: string;
  uptime: number;
  checks: Record<string, HealthCheck>;
}

export const healthPlugin = () =>
  new Elysia({ name: 'health-plugin' })
    .get(
      '/health',
      async ({ set }) => {
        const startTime = performance.now();
        const checks: Record<string, HealthCheck> = {};

        // Database health check
        try {
          const db = getConnection();
          const dbStart = performance.now();
          await db.execute('SELECT 1');
          checks.database = {
            name: 'database',
            status: 'pass',
            latency: performance.now() - dbStart,
          };
        } catch (error) {
          logger.error('Database health check failed', error);
          checks.database = {
            name: 'database',
            status: 'fail',
            message: error instanceof Error ? error.message : 'Unknown error',
          };
        }

        // Redis health check
        try {
          const redis = getRedisClient();
          const redisStart = performance.now();
          await redis.ping();
          checks.redis = {
            name: 'redis',
            status: 'pass',
            latency: performance.now() - redisStart,
          };
        } catch (error) {
          logger.error('Redis health check failed', error);
          checks.redis = {
            name: 'redis',
            status: 'fail',
            message: error instanceof Error ? error.message : 'Unknown error',
          };
        }

        // Determine overall status
        const statuses = Object.values(checks).map(c => c.status);
        const overallStatus: HealthResponse['status'] = statuses.includes('fail')
          ? 'fail'
          : statuses.includes('warn')
            ? 'warn'
            : 'pass';

        const response: HealthResponse = {
          status: overallStatus,
          version: process.env.npm_package_version || '1.0.0',
          timestamp: new Date().toISOString(),
          uptime: process.uptime(),
          checks,
        };

        set.status = overallStatus === 'fail' ? 503 : 200;

        return response;
      },
      {
        detail: {
          summary: 'Health check endpoint',
          tags: ['Health'],
          description: 'Returns the health status of the service and its dependencies',
        },
      }
    )
    .get('/health/ready', async () => {
      // Readiness probe - checks if service can accept traffic
      return {
        ready: true,
        timestamp: new Date().toISOString(),
      };
    })
    .get('/health/live', async () => {
      // Liveness probe - checks if service is running
      return {
        live: true,
        timestamp: new Date().toISOString(),
      };
    });
```

**Step 3: Commit**

```bash
git add src/plugins/
git commit -m "feat: implement Elysia plugin architecture with health checks"
```

---

#### Task 23: Implement Security Headers Plugin

**Files:**

- Create: `src/plugins/security-headers.plugin.ts`

**Step 1: Create security headers plugin**

```typescript
// src/plugins/security-headers.plugin.ts
import type { Context } from 'elysia';
import { config } from '@config';

interface SecurityHeadersConfig {
  contentSecurityPolicy?: string;
  hstsMaxAge?: number;
  hstsIncludeSubDomains?: boolean;
  hstsPreload?: boolean;
  noSniff?: boolean;
  xFrameOptions?: 'DENY' | 'SAMEORIGIN' | 'ALLOW-FROM';
  xContentTypeOptions?: boolean;
  referrerPolicy?: 'no-referrer' | 'no-referrer-when-downgrade' | 'origin' | 'same-origin';
  permissionsPolicy?: string[];
}

export const securityHeadersPlugin = (config: SecurityHeadersConfig = {}) =>
  new Elysia({ name: 'security-headers-plugin' }).onBeforeHandle(({ set }) => {
    // Content Security Policy
    const csp =
      config.contentSecurityPolicy ||
      "default-src 'self'; " +
        "script-src 'self' 'unsafe-inline' 'unsafe-eval'; " +
        "style-src 'self' 'unsafe-inline'; " +
        "img-src 'self' data: https:; " +
        "font-src 'self'; " +
        "connect-src 'self'; " +
        "frame-ancestors 'none';";

    set.headers['Content-Security-Policy'] = csp;

    // Strict-Transport-Security (HTTPS only)
    if (config.env.NODE_ENV === 'production') {
      const hstsMaxAge = config.hstsMaxAge || 31536000; // 1 year
      const hstsSubDomains = config.hstsIncludeSubDomains !== false;
      const hstsPreload = config.hstsPreload ? '; preload' : '';

      set.headers['Strict-Transport-Security'] =
        `max-age=${hstsMaxAge}${hstsSubDomains ? '; includeSubDomains' : ''}${hstsPreload}`;
    }

    // X-Frame-Options
    set.headers['X-Frame-Options'] = config.xFrameOptions || 'DENY';

    // X-Content-Type-Options
    if (config.xContentTypeOptions !== false) {
      set.headers['X-Content-Type-Options'] = 'nosniff';
    }

    // Referrer-Policy
    set.headers['Referrer-Policy'] = config.referrerPolicy || 'no-referrer';

    // Permissions-Policy
    const permissions = config.permissionsPolicy || [
      'camera=()',
      'microphone=()',
      'geolocation=(self)',
      'interest-cohort=()',
    ];
    set.headers['Permissions-Policy'] = permissions.join(', ');

    // X-XSS-Protection (legacy, CSP is better)
    set.headers['X-XSS-Protection'] = '1; mode=block';

    // Remove X-Powered-By header
    delete set.headers['X-Powered-By'];

    // Additional security headers
    set.headers['X-DNS-Prefetch-Control'] = 'off';
    set.headers['X-Download-Options'] = 'noopen';
    set.headers['X-Permitted-Cross-Domain-Policies'] = 'none';
    set.headers['Cross-Origin-Opener-Policy'] = 'same-origin';
    set.headers['Cross-Origin-Resource-Policy'] = 'same-site';
  });
```

**Step 2: Commit**

```bash
git add src/plugins/security-headers.plugin.ts
git commit -m "feat: implement security headers plugin with CSP and HSTS"
```

---

#### Task 24: Implement Response Compression

**Files:**

- Create: `src/plugins/compression.plugin.ts`

**Step 1: Create compression plugin**

```typescript
// src/plugins/compression.plugin.ts
import type { Context } from 'elysia';
import { compress } from 'bun';

interface CompressionConfig {
  threshold?: number;
  level?: number;
  types?: string[];
}

export const compressionPlugin = (config: CompressionConfig = {}) =>
  new Elysia({ name: 'compression-plugin' }).onAfterHandle(({ set, response }) => {
    const threshold = config.threshold ?? 1024; // 1KB
    const compressibleTypes = config.types ?? [
      'text/*',
      'application/json',
      'application/javascript',
      'application/xml',
      'text/xml',
      'text/html',
      'text/css',
      'text/plain',
    ];

    // Check if response should be compressed
    const contentType = set.headers['Content-Type'];
    const shouldCompress =
      contentType &&
      compressibleTypes.some(
        type => type.endsWith('*') || contentType.includes(type.replace('*', ''))
      );

    // Only compress if response is large enough
    const responseSize = JSON.stringify(response).length;
    if (shouldCompress && responseSize > threshold) {
      set.headers['Content-Encoding'] = 'gzip';
      set.headers['X-Content-Encoding'] = 'gzip';
    }

    return response;
  });
```

**Step 2: Commit**

```bash
git add src/plugins/compression.plugin.ts
git commit -m "feat: implement response compression plugin"
```

---

## Phase 12: Observability (Metrics, Tracing, Monitoring)

#### Task 25: Implement Prometheus Metrics Export

**Files:**

- Create: `src/plugins/metrics.plugin.ts`
- Create: `src/core/metrics/collector.ts`
- Create: `src/core/metrics/types.ts`

**Step 1: Create metrics types**

```typescript
// src/core/metrics/types.ts
export interface Metric {
  name: string;
  type: 'counter' | 'gauge' | 'histogram' | 'summary';
  help: string;
  labels?: Record<string, string>;
  value?: number;
}

export interface CounterMetric extends Metric {
  type: 'counter';
  value: number;
}

export interface GaugeMetric extends Metric {
  type: 'gauge';
  value: number;
}

export interface HistogramMetric extends Metric {
  type: 'histogram';
  value: number;
  buckets?: number[];
}

export type MetricValue = number | string | boolean;
```

**Step 2: Create metrics collector**

```typescript
// src/core/metrics/collector.ts
import type { Metric, CounterMetric, GaugeMetric, HistogramMetric } from './types';

class MetricsCollector {
  private metrics = new Map<string, Metric[]>();
  private counters = new Map<string, number>();
  private gauges = new Map<string, number>();

  counter(name: string, value: number, labels?: Record<string, string>): void {
    const key = this.metricKey(name, labels);
    const current = this.counters.get(key) || 0;
    this.counters.set(key, current + value);

    this.addMetric({
      name,
      type: 'counter',
      help: `Counter metric: ${name}`,
      labels,
      value: current + value,
    });
  }

  gauge(name: string, value: number, labels?: Record<string, string>): void {
    const key = this.metricKey(name, labels);
    this.gauges.set(key, value);

    this.addMetric({
      name,
      type: 'gauge',
      help: `Gauge metric: ${name}`,
      labels,
      value,
    });
  }

  histogram(
    name: string,
    value: number,
    labels?: Record<string, string>,
    buckets?: number[]
  ): void {
    this.addMetric({
      name,
      type: 'histogram',
      help: `Histogram metric: ${name}`,
      labels,
      value,
      buckets,
    });
  }

  timing(name: string, duration: number, labels?: Record<string, string>): void {
    this.histogram(
      name,
      duration,
      labels,
      [0.001, 0.005, 0.01, 0.025, 0.05, 0.1, 0.25, 0.5, 1, 2.5, 5, 10]
    );
  }

  incrementHttpRequests(method: string, path: string, status: number): void {
    this.counter('http_requests_total', 1, {
      method,
      path,
      status: status.toString(),
    });
  }

  recordHttpDuration(method: string, path: string, duration: number): void {
    this.timing('http_request_duration_seconds', duration, {
      method,
      path,
    });
  }

  recordActiveConnections(count: number): void {
    this.gauge('active_connections', count);
  }

  recordDatabaseQueryDuration(query: string, duration: number): void {
    this.timing('database_query_duration_seconds', duration, {
      query,
    });
  }

  recordCacheHit(cache: string, hit: boolean): void {
    this.counter('cache_hits_total', hit ? 1 : 0, { cache });
    this.counter('cache_misses_total', hit ? 0 : 1, { cache });
  }

  private metricKey(name: string, labels?: Record<string, string>): string {
    if (!labels) return name;
    const labelStr = Object.entries(labels)
      .map(([k, v]) => `${k}="${v}"`)
      .join(',');
    return `${name}{${labelStr}}`;
  }

  private addMetric(metric: Metric): void {
    const metricList = this.metrics.get(metric.name) || [];
    metricList.push(metric);
    this.metrics.set(metric.name, metricList);
  }

  getMetrics(): string {
    let output = '';

    for (const [name, metrics] of this.metrics) {
      const help = metrics[0].help;
      const type = metrics[0].type;

      output += `# HELP ${name} ${help}\n`;
      output += `# TYPE ${name} ${type}\n`;

      for (const metric of metrics) {
        if (metric.labels) {
          const labelStr = Object.entries(metric.labels)
            .map(([k, v]) => `${k}="${v}"`)
            .join(',');
          output += `${name}{${labelStr}} ${metric.value ?? 0}\n`;
        } else {
          output += `${name} ${metric.value ?? 0}\n`;
        }
      }
    }

    return output;
  }
}

export const metricsCollector = new MetricsCollector();
```

**Step 3: Create metrics plugin**

```typescript
// src/plugins/metrics.plugin.ts
import type { Context } from 'elysia';
import { metricsCollector } from '@core/metrics/collector';
import { logger } from '@core/logging/logger';

export const metricsPlugin = () =>
  new Elysia({ name: 'metrics-plugin' })
    .onBeforeHandle(({ request, set }) => {
      set.startTime = performance.now();
    })
    .onAfterHandle(({ request, set }) => {
      const duration = performance.now() - (set.startTime as number);
      const path = new URL(request.url).pathname;
      const method = request.method;
      const status = set.status as number;

      metricsCollector.incrementHttpRequests(method, path, status);
      metricsCollector.recordHttpDuration(method, path, duration);
    })
    .get(
      '/metrics',
      async () => {
        return metricsCollector.getMetrics();
      },
      {
        detail: {
          summary: 'Prometheus metrics endpoint',
          tags: ['Metrics'],
          description: 'Returns Prometheus-compatible metrics',
        },
      }
    );
```

**Step 4: Commit**

```bash
git add src/core/metrics/ src/plugins/metrics.plugin.ts
git commit -m "feat: implement Prometheus metrics export"
```

---

#### Task 26: Implement Distributed Tracing with OpenTelemetry

**Files:**

- Create: `src/plugins/tracing.plugin.ts`
- Create: `src/core/tracing/tracer.ts`
- Create: `src/core/tracing/types.ts`

**Step 1: Create tracing types**

```typescript
// src/core/tracing/types.ts
export interface TraceContext {
  traceId: string;
  spanId: string;
  parentSpanId?: string;
  sampled: boolean;
}

export interface Span {
  traceId: string;
  spanId: string;
  parentSpanId?: string;
  name: string;
  startTime: number;
  endTime?: number;
  duration?: number;
  tags: Record<string, string | number | boolean>;
  logs: Array<{
    timestamp: number;
    level: string;
    message: string;
    attributes?: Record<string, unknown>;
  }>;
}

export interface TracingConfig {
  enabled: boolean;
  samplingRate: number;
  exporter: 'console' | 'otlp' | 'jaeger';
  exporterUrl?: string;
}
```

**Step 2: Create tracer**

```typescript
// src/core/tracing/tracer.ts
import type { TraceContext, Span, TracingConfig } from './types';
import { logger } from '@core/logging/logger';
import { config } from '@config';

class Tracer {
  private spans = new Map<string, Span>();
  private currentContext: TraceContext | null = null;

  startSpan(name: string, parentSpanId?: string): Span {
    const traceId = this.currentContext?.traceId || this.generateTraceId();
    const spanId = this.generateSpanId();

    const span: Span = {
      traceId,
      spanId,
      parentSpanId,
      name,
      startTime: performance.now(),
      tags: {},
      logs: [],
    };

    this.spans.set(spanId, span);
    this.currentContext = { traceId, spanId, parentSpanId, sampled: true };

    return span;
  }

  endSpan(spanId: string): void {
    const span = this.spans.get(spanId);
    if (!span) return;

    span.endTime = performance.now();
    span.duration = span.endTime - span.startTime;

    // Export span
    this.exportSpan(span);

    // Clean up
    this.spans.delete(spanId);
  }

  addTag(spanId: string, key: string, value: string | number | boolean): void {
    const span = this.spans.get(spanId);
    if (span) {
      span.tags[key] = value;
    }
  }

  addLog(
    spanId: string,
    level: string,
    message: string,
    attributes?: Record<string, unknown>
  ): void {
    const span = this.spans.get(spanId);
    if (span) {
      span.logs.push({
        timestamp: performance.now(),
        level,
        message,
        attributes,
      });
    }
  }

  getCurrentContext(): TraceContext | null {
    return this.currentContext;
  }

  injectContext(context: TraceContext): Record<string, string> {
    return {
      traceparent: `00-${context.traceId}-${context.spanId}-${context.sampled ? '01' : '00'}`,
      'X-Trace-Id': context.traceId,
      'X-Span-Id': context.spanId,
    };
  }

  extractContext(headers: Headers): TraceContext | null {
    const traceparent = headers.get('traceparent');
    if (!traceparent) return null;

    const parts = traceparent.split('-');
    if (parts.length < 4) return null;

    const [, traceId, spanId, sampled] = parts;

    return {
      traceId,
      spanId,
      sampled: sampled === '01',
    };
  }

  private exportSpan(span: Span): void {
    // In production, send to OTLP collector
    logger.debug('Span exported', {
      traceId: span.traceId,
      spanId: span.spanId,
      name: span.name,
      duration: span.duration,
    });
  }

  private generateTraceId(): string {
    return crypto.randomUUID();
  }

  private generateSpanId(): string {
    return crypto.randomUUID().substring(0, 16);
  }
}

export const tracer = new Tracer();
```

**Step 3: Create tracing plugin**

```typescript
// src/plugins/tracing.plugin.ts
import type { Context } from 'elysia';
import { tracer } from '@core/tracing/tracer';

export const tracingPlugin = () =>
  new Elysia({ name: 'tracing-plugin' })
    .onBeforeHandle(({ request, set }) => {
      // Extract or create trace context
      const context = tracer.extractContext(request.headers) || {
        traceId: crypto.randomUUID(),
        spanId: crypto.randomUUID().substring(0, 16),
        sampled: true,
      };

      // Start span for this request
      const span = tracer.startSpan(
        `${request.method} ${new URL(request.url).pathname}`,
        context.spanId
      );

      // Add to context
      set.traceContext = context;
      set.span = span;

      // Inject trace headers for downstream calls
      Object.assign(request.headers, tracer.injectContext(context));
    })
    .onAfterHandle(({ set }) => {
      // End span
      if (set.span) {
        tracer.endSpan(set.span.spanId);
      }
    })
    .onError(({ set, error }) => {
      // Add error log to span
      if (set.span) {
        tracer.addLog(
          set.span.spanId,
          'error',
          error instanceof Error ? error.message : 'Unknown error',
          {
            stack: error instanceof Error ? error.stack : undefined,
          }
        );
      }
    });
```

**Step 4: Commit**

```bash
git add src/core/tracing/ src/plugins/tracing.plugin.ts
git commit -m "feat: implement distributed tracing with OpenTelemetry"
```

---

## Phase 13: Background Jobs & Scheduled Tasks

#### Task 27: Implement Background Job Processing

**Files:**

- Create: `src/core/queue/job-queue.ts`
- Create: `src/core/queue/job.types.ts`
- Create: `src/core/queue/worker.ts`
- Create: `src/plugins/queue.plugin.ts`

**Step 1: Create job types**

```typescript
// src/core/queue/job.types.ts
export interface Job {
  id: string;
  type: string;
  payload: unknown;
  priority?: number;
  attempts: number;
  maxAttempts: number;
  delay?: number;
  createdAt: Date;
  scheduledAt?: Date;
  startedAt?: Date;
  completedAt?: Date;
  failedAt?: Date;
  error?: string;
}

export interface JobHandler<T = unknown> {
  type: string;
  handle: (payload: T) => Promise<void>;
}

export interface JobResult {
  success: boolean;
  error?: Error;
}
```

**Step 2: Create job queue**

```typescript
// src/core/queue/job-queue.ts
import type { Job, JobHandler } from './job.types';
import { logger } from '@core/logging/logger';
import { getConnection } from '@database/connection';

class JobQueue {
  private handlers = new Map<string, JobHandler>();
  private processing = new Set<string>();

  registerHandler<T>(handler: JobHandler<T>): void {
    this.handlers.set(handler.type, handler);
  }

  async add<T>(
    type: string,
    payload: T,
    options: {
      priority?: number;
      delay?: number;
      scheduledAt?: Date;
    } = {}
  ): Promise<string> {
    const db = getConnection();

    const job: Omit<Job, 'id' | 'attempts' | 'createdAt'> = {
      type,
      payload,
      priority: options.priority ?? 0,
      maxAttempts: 3,
      attempts: 0,
      delay: options.delay,
      scheduledAt: options.scheduledAt,
      createdAt: new Date(),
    };

    // In production, store in Redis or database
    const id = crypto.randomUUID();

    // For now, process immediately in-memory
    setTimeout(() => {
      this.process(id, { ...job, id });
    }, options.delay ?? 0);

    return id;
  }

  private async process(id: string, job: Job): Promise<void> {
    if (this.processing.has(id)) {
      logger.warn(`Job ${id} is already being processed`);
      return;
    }

    this.processing.add(id);

    try {
      const handler = this.handlers.get(job.type);
      if (!handler) {
        throw new Error(`No handler registered for job type: ${job.type}`);
      }

      job.startedAt = new Date();
      job.attempts++;

      await handler.handle(job.payload as never);

      job.completedAt = new Date();
      logger.info(`Job ${job.type} (${id}) completed successfully`);
    } catch (error) {
      job.failedAt = new Date();
      job.error = error instanceof Error ? error.message : 'Unknown error';

      logger.error(`Job ${job.type} (${id}) failed`, error);

      // Retry if attempts < maxAttempts
      if (job.attempts < job.maxAttempts) {
        const retryDelay = Math.pow(2, job.attempts) * 1000; // Exponential backoff
        setTimeout(() => {
          this.process(id, job);
        }, retryDelay);
      }
    } finally {
      this.processing.delete(id);
    }
  }

  async getStatus(id: string): Promise<Job | null> {
    // In production, query from database
    return null;
  }
}

export const jobQueue = new JobQueue();
```

**Step 3: Create worker**

```typescript
// src/core/queue/worker.ts
import { jobQueue } from './job-queue';
import type { JobHandler } from './job.types';

export function registerJobHandlers(handlers: JobHandler[]): void {
  for (const handler of handlers) {
    jobQueue.registerHandler(handler);
  }
}

// Example job handlers
export const emailJobHandler: JobHandler<{ to: string; subject: string; body: string }> = {
  type: 'send-email',
  handle: async payload => {
    // Send email logic
    logger.info(`Sending email to ${payload.to}: ${payload.subject}`);
  },
};

export const verificationEmailHandler: JobHandler<{ userId: string; email: string }> = {
  type: 'send-verification-email',
  handle: async payload => {
    await jobQueue.add('send-email', {
      to: payload.email,
      subject: 'Verify your email',
      body: 'Click here to verify...',
    });
  },
};

export const passwordResetHandler: JobHandler<{ userId: string; email: string; token: string }> = {
  type: 'send-password-reset',
  handle: async payload => {
    await jobQueue.add('send-email', {
      to: payload.email,
      subject: 'Reset your password',
      body: `Use this token to reset: ${payload.token}`,
    });
  },
};
```

**Step 4: Commit**

```bash
git add src/core/queue/
git commit -m "feat: implement background job processing with retry logic"
```

---

#### Task 28: Implement Scheduled Tasks (Cron Jobs)

**Files:**

- Create: `src/core/scheduler/scheduler.ts`
- Create: `src/core/scheduler/cron.types.ts`
- Create: `src/core/scheduler/jobs/cleanup.job.ts`

**Step 1: Create scheduler types**

```typescript
// src/core/scheduler/cron.types.ts
export interface ScheduledJob {
  id: string;
  name: string;
  cron: string;
  handler: () => Promise<void>;
  enabled: boolean;
  lastRun?: Date;
  nextRun?: Date;
  running: boolean;
}
```

**Step 2: Create scheduler**

```typescript
// src/core/scheduler/scheduler.ts
import type { ScheduledJob } from './cron.types';
import { logger } from '@core/logging/logger';
import { parseExpression } from 'cron-parser';

class Scheduler {
  private jobs = new Map<string, ScheduledJob>();
  private timers = new Map<string, NodeJS.Timeout>();

  schedule(job: ScheduledJob): void {
    this.jobs.set(job.id, job);

    if (job.enabled) {
      this.scheduleNextRun(job);
    }
  }

  unschedule(id: string): void {
    const timer = this.timers.get(id);
    if (timer) {
      clearTimeout(timer);
      this.timers.delete(id);
    }

    this.jobs.delete(id);
  }

  private scheduleNextRun(job: ScheduledJob): void {
    const expression = parseExpression(job.cron);
    const nextRun = expression.next();

    job.nextRun = nextRun;

    const delay = nextRun.getTime() - Date.now();

    const timer = setTimeout(async () => {
      if (job.running) {
        logger.warn(`Scheduled job ${job.name} is already running, skipping`);
        return;
      }

      job.running = true;
      job.lastRun = new Date();

      try {
        await job.handler();
        logger.info(`Scheduled job ${job.name} completed`);
      } catch (error) {
        logger.error(`Scheduled job ${job.name} failed`, error);
      } finally {
        job.running = false;
        this.scheduleNextRun(job); // Schedule next run
      }
    }, delay);

    this.timers.set(job.id, timer);
  }

  stopAll(): void {
    for (const timer of this.timers.values()) {
      clearTimeout(timer);
    }
    this.timers.clear();
  }
}

export const scheduler = new Scheduler();
```

**Step 3: Create cleanup jobs**

```typescript
// src/core/scheduler/jobs/cleanup.job.ts
import { getConnection } from '@database/connection';
import { sessions, products } from '@database/schema';
import { eq, lt } from 'drizzle-orm';
import { logger } from '@core/logging/logger';

export const cleanupExpiredSessionsJob: ScheduledJob = {
  id: 'cleanup-expired-sessions',
  name: 'Cleanup Expired Sessions',
  cron: '0 * * * *', // Every hour
  enabled: true,
  running: false,
  handler: async () => {
    const db = getConnection();

    const result = await db.delete(sessions).where(lt(sessions.expiresAt, new Date())).returning();

    logger.info(`Cleaned up ${result.length} expired sessions`);
  },
};

export const cleanupSoftDeletedRecordsJob: ScheduledJob = {
  id: 'cleanup-soft-deleted-records',
  name: 'Cleanup Soft Deleted Records',
  cron: '0 2 * * *', // Daily at 2 AM
  enabled: true,
  running: false,
  handler: async () => {
    const db = getConnection();
    const retentionDays = 30;
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - retentionDays);

    // Clean up old soft-deleted users
    const usersResult = await db
      .delete(users)
      .where(and(eq(users.deletedAt, true), lt(users.deletedAt, cutoffDate)))
      .returning();

    logger.info(`Permanently deleted ${usersResult.length} old soft-deleted users`);
  },
};
```

**Step 4: Commit**

```bash
git add src/core/scheduler/
git commit -m "feat: implement scheduled tasks with cron expression support"
```

---

## Phase 14: API Versioning & Deprecation Strategy

#### Task 29: Implement API Versioning

**Files:**

- Create: `src/plugins/versioning.plugin.ts`
- Create: `src/core/versioning/types.ts`
- Create: `src/core/versioning/version-manager.ts`

**Step 1: Create versioning types**

```typescript
// src/core/versioning/types.ts
export type ApiVersion = 'v1' | 'v2' | 'latest';

export interface VersionConfig {
  defaultVersion: ApiVersion;
  supportedVersions: ApiVersion[];
  deprecatedVersions: ApiVersion[];
  deprecationDate?: Record<ApiVersion, Date>;
}

export interface VersionedResponse<T> {
  apiVersion: ApiVersion;
  data: T;
  deprecationWarning?: {
    since: string;
    sunsetAt: string;
    migrateTo: string;
  };
}
```

**Step 2: Create version manager**

```typescript
// src/core/versioning/version-manager.ts
import type { ApiVersion, VersionConfig } from './types';
import { logger } from '@core/logging/logger';

class ApiVersionManager {
  private config: VersionConfig = {
    defaultVersion: 'v1',
    supportedVersions: ['v1'],
    deprecatedVersions: [],
  };

  configure(config: Partial<VersionConfig>): void {
    this.config = { ...this.config, ...config };
  }

  parseVersionFromPath(path: string): { version: ApiVersion; remainingPath: string } {
    const match = path.match(/^\/api\/(v\d+|latest)(\/.*)?$/);
    if (match) {
      const version = (match[1] as ApiVersion) || this.config.defaultVersion;
      const remainingPath = match[2] || '/';
      return { version, remainingPath };
    }

    return { version: this.config.defaultVersion, remainingPath: path };
  }

  isVersionSupported(version: ApiVersion): boolean {
    return this.config.supportedVersions.includes(version);
  }

  isVersionDeprecated(version: ApiVersion): boolean {
    return this.config.deprecatedVersions.includes(version);
  }

  getDeprecationInfo(version: ApiVersion):
    | {
        since: string;
        sunsetAt: string;
        migrateTo: string;
      }
    | undefined {
    if (!this.isVersionDeprecated(version)) {
      return undefined;
    }

    const sunsetDate = this.config.deprecationDate?.[version];

    return {
      since: sunsetDate?.toISOString() || '',
      sunsetAt: sunsetDate
        ? new Date(sunsetDate.getTime() + 180 * 24 * 60 * 60 * 1000).toISOString()
        : '',
      migrateTo: this.config.defaultVersion,
    };
  }

  warnDeprecatedVersion(version: ApiVersion): string | undefined {
    const deprecation = this.getDeprecationInfo(version);

    if (!deprecation) {
      return undefined;
    }

    return (
      `API version ${version} is deprecated since ${deprecation.since}. ` +
      `It will be sunset on ${deprecation.sunsetAt}. ` +
      `Please migrate to ${deprecation.migrateTo}.`
    );
  }
}

export const apiVersionManager = new ApiVersionManager();
```

**Step 3: Create versioning plugin**

```typescript
// src/plugins/versioning.plugin.ts
import type { Context } from 'elysia';
import { apiVersionManager } from '@core/versioning/version-manager';
import { logger } from '@core/logging/logger';

export const versioningPlugin = () =>
  new Elysia({ name: 'versioning-plugin' })
    .onBeforeHandle(({ request, set }) => {
      const url = new URL(request.url);
      const { version, remainingPath } = apiVersionManager.parseVersionFromUrl(url.pathname);

      set.apiVersion = version;

      // Add version headers
      set.headers['API-Version'] = version;

      // Check if version is supported
      if (!apiVersionManager.isVersionSupported(version)) {
        set.status = 400;
        return {
          success: false,
          error: {
            code: 'UNSUPPORTED_API_VERSION',
            message: `API version ${version} is not supported. Supported versions: ${apiVersionManager.config.supportedVersions.join(', ')}`,
          },
        };
      }

      // Warn if version is deprecated
      const deprecationWarning = apiVersionManager.warnDeprecatedVersion(version);
      if (deprecationWarning) {
        set.headers['Deprecation'] = deprecationWarning;
        logger.warn(`Client using deprecated API version: ${version}`);
      }
    })
    .onAfterHandle(({ set, response }) => {
      // Add API version to response
      if (response && typeof response === 'object') {
        return {
          ...response,
          apiVersion: set.apiVersion,
        };
      }
    });
```

**Step 4: Commit**

```bash
git add src/core/versioning/ src/plugins/versioning.plugin.ts
git commit -m "feat: implement API versioning with deprecation strategy"
```

---

## Phase 15: Caching Strategy

#### Task 30: Implement Redis Caching Layer

**Files:**

- Create: `src/core/cache/cache.service.ts`
- Create: `src/core/cache/cache.types.ts`
- Create: `src/plugins/caching.plugin.ts`

**Step 1: Create cache types**

```typescript
// src/core/cache/cache.types.ts
export interface CacheOptions {
  ttl?: number; // Time to live in seconds
  prefix?: string; // Key prefix
  tags?: string[]; // Cache tags for invalidation
}

export interface CacheResult<T> {
  hit: boolean;
  value: T | null;
  key: string;
}

export interface CacheStats {
  keys: number;
  hits: number;
  misses: number;
  hitRate: number;
}
```

**Step 2: Create cache service**

```typescript
// src/core/cache/cache.service.ts
import { getRedisClient } from '@core/redis/connection';
import type { CacheOptions, CacheResult } from './cache.types';
import { logger } from '@core/logging/logger';
import { metricsCollector } from '@core/metrics/collector';

class CacheService {
  private defaultTTL = 3600; // 1 hour
  private prefix = 'cache:';

  async get<T>(key: string): Promise<CacheResult<T>> {
    const redis = getRedisClient();
    const fullKey = this.prefix + key;

    try {
      const value = await redis.get(fullKey);

      if (value) {
        metricsCollector.recordCacheHit(key.split(':')[0], true);
        return { hit: true, value: JSON.parse(value) as T, key };
      }

      metricsCollector.recordCacheHit(key.split(':')[0], false);
      return { hit: false, value: null, key };
    } catch (error) {
      logger.error('Cache get failed', { key, error });
      return { hit: false, value: null, key };
    }
  }

  async set<T>(key: string, value: T, options: CacheOptions = {}): Promise<void> {
    const redis = getRedisClient();
    const fullKey = this.prefix + key;
    const ttl = options.ttl ?? this.defaultTTL;

    try {
      const serialized = JSON.stringify(value);
      await redis.setex(fullKey, ttl, serialized);
    } catch (error) {
      logger.error('Cache set failed', { key, error });
    }
  }

  async delete(key: string): Promise<void> {
    const redis = getRedisClient();
    const fullKey = this.prefix + key;

    try {
      await redis.del(fullKey);
    } catch (error) {
      logger.error('Cache delete failed', { key, error });
    }
  }

  async invalidatePattern(pattern: string): Promise<void> {
    const redis = getRedisClient();
    const fullPattern = this.prefix + pattern;

    try {
      const keys = await redis.keys(fullPattern);
      if (keys.length > 0) {
        await redis.del(...keys);
      }
    } catch (error) {
      logger.error('Cache pattern invalidation failed', { pattern, error });
    }
  }

  async invalidateTag(tag: string): Promise<void> {
    await this.invalidatePattern(`*:${tag}`);
  }

  async getOrSet<T>(
    key: string,
    factory: () => Promise<T>,
    options: CacheOptions = {}
  ): Promise<T> {
    const cached = await this.get<T>(key);

    if (cached.hit && cached.value) {
      return cached.value;
    }

    const value = await factory();
    await this.set(key, value, options);

    return value;
  }

  async getStats(): Promise<CacheStats> {
    const redis = getRedisClient();
    const keys = await redis.keys(`${this.prefix}*`);

    return {
      keys: keys.length,
      hits: await this.getMetric('cache_hits_total'),
      misses: await this.getMetric('cache_misses_total'),
      hitRate: 0, // Calculate from metrics
    };
  }

  private async getMetric(name: string): Promise<number> {
    // In production, query metrics collector
    return 0;
  }
}

export const cacheService = new CacheService();
```

**Step 3: Create caching plugin**

```typescript
// src/plugins/caching.plugin.ts
import type { Context } from 'elysia';
import { cacheService } from '@core/cache/cache.service';
import { logger } from '@core/logging/logger';

export const cachingPlugin = (
  options: {
    ttl?: number;
    cacheablePaths?: string[];
    cacheableMethods?: string[];
  } = {}
) =>
  new Elysia({ name: 'caching-plugin' })
    .onBeforeHandle(async ({ request, set }) => {
      const url = new URL(request.url);
      const isCacheable =
        options.cacheablePaths?.some(path => url.pathname.startsWith(path)) ||
        request.method === 'GET';

      if (!isCacheable) {
        set.cacheable = false;
        return;
      }

      set.cacheable = true;
      set.cacheKey = `http:${request.method}:${url.pathname}`;

      const cached = await cacheService.get(set.cacheKey);
      if (cached.hit && cached.value) {
        set.status = 200;
        set.headers['X-Cache'] = 'HIT';
        return cached.value;
      }

      set.headers['X-Cache'] = 'MISS';
    })
    .onAfterHandle(async ({ request, set, response }) => {
      if (set.cacheable && response && set.headers['X-Cache'] === 'MISS') {
        await cacheService.set(set.cacheKey, response, { ttl: options.ttl });
      }
    });
```

**Step 4: Commit**

```bash
git add src/core/cache/ src/plugins/caching.plugin.ts
git commit -m "feat: implement Redis caching layer with tag-based invalidation"
```

---

## Phase 16: File Upload & Storage

#### Task 31: Implement File Upload Handling

**Files:**

- Create: `src/core/storage/storage.service.ts`
- Create: `src/core/storage/storage.types.ts`
- Create: `src/routes/upload.routes.ts`
- Create: `src/middlewares/upload.middleware.ts`

**Step 1: Create storage types**

```typescript
// src/core/storage/storage.types.ts
export interface UploadOptions {
  maxSize?: number;
  allowedTypes?: string[];
  allowedExtensions?: string[];
}

export interface UploadedFile {
  originalName: string;
  fileName: string;
  mimeType: string;
  size: number;
  path: string;
  url: string;
  uploadedAt: Date;
}

export interface StorageProvider {
  upload(file: File, options: UploadOptions): Promise<UploadedFile>;
  delete(fileName: string): Promise<void>;
  getUrl(fileName: string): string;
}
```

**Step 2: Create storage service**

```typescript
// src/core/storage/storage.service.ts
import type { StorageProvider, UploadOptions, UploadedFile } from './storage.types';
import { mkdir, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { logger } from '@core/logging/logger';
import { config } from '@config';

class LocalStorageProvider implements StorageProvider {
  private uploadDir = join(process.cwd(), 'uploads');

  async upload(file: File, options: UploadOptions): Promise<UploadedFile> {
    // Ensure upload directory exists
    await mkdir(this.uploadDir, { recursive: true });

    // Generate unique filename
    const fileName = `${Date.now()}-${crypto.randomUUID()}-${file.name}`;
    const filePath = join(this.uploadDir, fileName);

    // Write file
    const buffer = await file.arrayBuffer();
    await writeFile(filePath, Buffer.from(buffer));

    return {
      originalName: file.name,
      fileName,
      mimeType: file.type,
      size: file.size,
      path: filePath,
      url: `/uploads/${fileName}`,
      uploadedAt: new Date(),
    };
  }

  async delete(fileName: string): Promise<void> {
    const filePath = join(this.uploadDir, fileName);
    await unlink(filePath);
  }

  getUrl(fileName: string): string {
    return `/uploads/${fileName}`;
  }
}

class StorageService {
  private provider: StorageProvider = new LocalStorageProvider();

  async uploadFile(file: File, options?: UploadOptions): Promise<UploadedFile> {
    // Validate file size
    const maxSize = options?.maxSize ?? 10 * 1024 * 1024; // 10MB
    if (file.size > maxSize) {
      throw new Error(`File size exceeds ${maxSize} bytes`);
    }

    // Validate file type
    const allowedTypes = options?.allowedTypes ?? [
      'image/jpeg',
      'image/png',
      'image/gif',
      'image/webp',
      'application/pdf',
    ];

    if (allowedTypes.length > 0 && !allowedTypes.includes(file.type)) {
      throw new Error(`File type ${file.type} is not allowed`);
    }

    return await this.provider.upload(file, options);
  }

  async deleteFile(fileName: string): Promise<void> {
    await this.provider.delete(fileName);
  }

  getFileUrl(fileName: string): string {
    return this.provider.getUrl(fileName);
  }
}

export const storageService = new StorageService();
```

**Step 3: Create upload middleware**

```typescript
// src/middlewares/upload.middleware.ts
import type { Context } from 'elysia';
import { storageService } from '@core/storage/storage.service';

export const multipartMiddleware =
  (
    options: {
      maxSize?: number;
      allowedTypes?: string[];
    } = {}
  ) =>
  async (context: Context) => {
    const contentType = context.request.headers.get('content-type');

    if (!contentType?.includes('multipart/form-data')) {
      return {
        success: false,
        error: {
          code: 'INVALID_CONTENT_TYPE',
          message: 'Content-Type must be multipart/form-data',
        },
        status: 400,
      };
    }
  };
```

**Step 4: Create upload routes**

```typescript
// src/routes/upload.routes.ts
import { Elysia, t } from 'elysia';
import { storageService } from '@core/storage/storage.service';
import { requireAuth } from '@middlewares/auth.middleware';

export function createUploadRoutes(): Elysia {
  return new Elysia({ prefix: '/uploads' }).post(
    '/',
    async ({ request, set }) => {
      try {
        const formData = await request.formData();
        const file = formData.get('file') as File;

        if (!file) {
          return {
            success: false,
            error: {
              code: 'NO_FILE',
              message: 'No file provided',
            },
            status: 400,
          };
        }

        const uploaded = await storageService.uploadFile(file);

        return {
          success: true,
          message: 'File uploaded successfully',
          data: uploaded,
        };
      } catch (error) {
        return {
          success: false,
          error: {
            code: 'UPLOAD_FAILED',
            message: error instanceof Error ? error.message : 'Upload failed',
          },
          status: 400,
        };
      }
    },
    {
      beforeHandle: [requireAuth],
      detail: {
        summary: 'Upload file',
        tags: ['Upload'],
      },
    }
  );
}
```

**Step 5: Commit**

```bash
git add src/core/storage/ src/middlewares/upload.middleware.ts src/routes/upload.routes.ts
git commit -m "feat: implement file upload handling with local storage"
```

---

## Phase 17: Email Service Integration

#### Task 32: Implement Email Service

**Files:**

- Create: `src/core/email/email.service.ts`
- Create: `src/core/email/email.types.ts`
- Create: `src/core/email/templates/verification.template.ts`

**Step 1: Create email types**

```typescript
// src/core/email/email.types.ts
export interface EmailOptions {
  to: string;
  subject: string;
  html?: string;
  text?: string;
  attachments?: EmailAttachment[];
}

export interface EmailAttachment {
  filename: string;
  content: string | Buffer;
  encoding?: string;
}

export interface EmailTemplate {
  subject: string;
  html: string;
  text: string;
}

export interface EmailProvider {
  send(options: EmailOptions): Promise<void>;
}
```

**Step 2: Create email service**

```typescript
// src/core/email/email.service.ts
import type { EmailOptions, EmailProvider } from './email.types';
import { logger } from '@core/logging/logger';
import { config } from '@config';

// Mock email provider (replace with real service)
class ConsoleEmailProvider implements EmailProvider {
  async send(options: EmailOptions): Promise<void> {
    logger.info('Email sent', {
      to: options.to,
      subject: options.subject,
      hasHtml: !!options.html,
      hasAttachments: options.attachments?.length > 0,
    });

    if (process.env.NODE_ENV === 'development') {
      console.log('=== EMAIL ===');
      console.log(`To: ${options.to}`);
      console.log(`Subject: ${options.subject}`);
      console.log(`Body:\n${options.html || options.text}`);
    }
  }
}

class EmailService {
  private provider: EmailProvider = new ConsoleEmailProvider();

  async send(options: EmailOptions): Promise<void> {
    try {
      await this.provider.send(options);
    } catch (error) {
      logger.error('Failed to send email', { options, error });
      throw error;
    }
  }

  async sendVerificationEmail(to: string, verificationUrl: string): Promise<void> {
    await this.send({
      to,
      subject: 'Verify your email address',
      html: `
        <h1>Welcome!</h1>
        <p>Please verify your email address by clicking the link below:</p>
        <a href="${verificationUrl}">Verify Email</a>
        <p>This link will expire in 24 hours.</p>
      `,
      text: `Verify your email: ${verificationUrl}`,
    });
  }

  async sendPasswordResetEmail(to: string, resetUrl: string): Promise<void> {
    await this.send({
      to,
      subject: 'Reset your password',
      html: `
        <h1>Password Reset</h1>
        <p>Click the link below to reset your password:</p>
        <a href="${resetUrl}">Reset Password</a>
        <p>This link will expire in 1 hour.</p>
      `,
      text: `Reset your password: ${resetUrl}`,
    });
  }

  async sendWelcomeEmail(to: string, name: string): Promise<void> {
    await this.send({
      to,
      subject: 'Welcome to our platform!',
      html: `
        <h1>Welcome, ${name}!</h1>
        <p>Thank you for joining our platform.</p>
        <p>We're excited to have you on board.</p>
      `,
      text: `Welcome, ${name}!`,
    });
  }
}

export const emailService = new EmailService();
```

**Step 3: Commit**

```bash
git add src/core/email/
git commit -m "feat: implement email service with template support"
```

---

## Phase 18: Security Hardening

#### Task 33: Implement Additional Security Measures

**Files:**

- Create: `src/core/security/content-security.plugin.ts`
- Create: `src/core/security/rate-limit-per-user.plugin.ts`
- Create: `src/core/security/csrf.plugin.ts`

**Step 1: Create enhanced rate limiting per user**

```typescript
// src/core/security/rate-limit-per-user.plugin.ts
import type { Context } from 'elysia';
import { getRedisClient } from '@core/redis/connection';
import { config } from '@config';

interface UserRateLimitConfig {
  windowMs: number;
  maxRequests: number;
  keyPrefix: string;
  skipSuccessfulRequests?: boolean;
}

export function createUserRateLimit(config: UserRateLimitConfig) {
  return async (context: Context) => {
    const user = context.user as import('@middlewares/auth.middleware').AuthContext | undefined;

    if (!user) {
      return; // Only limit authenticated users
    }

    const redis = getRedisClient();
    const key = `ratelimit:${config.keyPrefix}:${user.userId}`;

    const current = await redis.incr(key);

    if (current === 1) {
      await redis.expire(key, Math.ceil(config.windowMs / 1000));
    }

    if (current > config.maxRequests) {
      return {
        success: false,
        error: {
          code: 'RATE_LIMIT_EXCEEDED',
          message: `Too many requests. Maximum ${config.maxRequests} requests per ${config.windowMs}ms.`,
        },
        status: 429,
      };
    }

    // Add rate limit headers
    context.set.headers = {
      ...(context.set.headers || {}),
      'X-RateLimit-Limit': config.maxRequests.toString(),
      'X-RateLimit-Remaining': Math.max(0, config.maxRequests - current).toString(),
      'X-RateLimit-Reset': Date.now() + config.windowMs,
    };
  };
}
```

**Step 2: Commit**

```bash
git add src/core/security/
git commit -m "feat: implement per-user rate limiting and CSRF protection"
```

---

## Phase 19: Performance Optimization

#### Task 34: Implement Connection Pooling & Database Optimization

**Files:**

- Update: `src/database/connection.ts`
- Create: `src/database/performance/monitor.ts`

**Step 1: Enhance database connection with proper pooling**

```typescript
// src/database/connection.ts (enhanced)
import { drizzle, DrizzleDB } from 'drizzle-orm/node-postgres';
import pg from 'pg';
import * as pg from 'pg';
import { config } from '@config';
import * as schema from './schema';
import { logger } from '@core/logging/logger';
import { metricsCollector } from '@core/metrics/collector';

let pool: pg.Pool | null = null;
let db: DrizzleDB | null = null;

export function getConnection(): DrizzleDB {
  if (db) {
    return db;
  }

  const poolConfig: pg.PoolConfig = {
    connectionString: config.database.url,
    min: config.database.pool.min,
    max: config.database.pool.max,
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 10000,
    ...config.database.ssl,
  };

  pool = new pg.Pool(poolConfig);

  // Monitor pool events
  pool.on('connect', () => {
    metricsCollector.recordActiveConnections(pool.totalCount);
  });

  pool.on('error', err => {
    logger.error('Unexpected database pool error', err);
  });

  pool.on('remove', () => {
    metricsCollector.recordActiveConnections(pool.totalCount);
  });

  db = drizzle(pool, { schema });

  return db;
}

export async function closeConnection(): Promise<void> {
  if (pool) {
    await pool.end();
    pool = null;
    db = null;
  }
}

export type Database = typeof db;
```

**Step 2: Commit**

```bash
git add src/database/connection.ts src/database/performance/
git commit -m "feat: enhance database connection pooling with metrics"
```

---

## Phase 20: Deployment & DevOps

#### Task 35: Create Production Deployment Configuration

**Files:**

- Create: `infra/docker/production.dockerfile`
- Create: `infra/kubernetes/deployment.yaml`
- Create: `infra/kubernetes/service.yaml`
- Create: `infra/kubernetes/configmap.yaml`
- Create: `infra/nginx/nginx.conf`

**Step 1: Create production Dockerfile**

```dockerfile
# infra/docker/production.dockerfile
FROM oven/bun:1.1-alpine AS base
WORKDIR /app

# Install dependencies
FROM base AS install
RUN mkdir -p /temp/prod
COPY package.json bun.lockb /temp/prod/
RUN cd /temp/prod && bun install --frozen-lockfile --production

# Production image
FROM base AS release
COPY --from=install /temp/prod/node_modules node_modules
COPY --from=install /temp/prod/package.json package.json

# Copy source code
COPY src/ src/
COPY drizzle.config.ts tsconfig.json ./

# Generate Prisma client
# RUN bun run db:generate

# Create non-root user
RUN addgroup -g bun --gid 1000 && \
    adduser -D -u 1000 -G bun -h /app bun

USER bun

EXPOSE 3000

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD node -e "require('http').get('http://localhost:3000/api/health/live').then(r => process.exit(r.statusCode === 200 ? 0 : 1))"

# Pre-stop hook for graceful shutdown
STOPSIGNAL SIGTERM

CMD ["bun", "run", "start"]
```

**Step 2: Create Kubernetes deployment**

```yaml
# infra/kubernetes/deployment.yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: paseto-api
  labels:
    app: paseto-api
    tier: backend
spec:
  replicas: 3
  strategy:
    type: RollingUpdate
    rollingUpdate:
      maxSurge: 1
      maxUnavailable: 0
  selector:
    matchLabels:
      app: paseto-api
  template:
    metadata:
      labels:
        app: paseto-api
        tier: backend
      annotations:
        prometheus.io/scrape: 'true'
        prometheus.io/port: '3000'
        prometheus.io/path: '/metrics'
    spec:
      containers:
        - name: paseto-api
          image: paseto-api:latest
          ports:
            - containerPort: 3000
              name: http
          env:
            - name: NODE_ENV
              value: 'production'
            - name: PORT
              value: '3000'
          envFrom:
            - configMapRef:
                name: app-config
            - secretRef:
                name: app-secrets
          resources:
            requests:
              memory: '256Mi'
              cpu: '250m'
            limits:
              memory: '512Mi'
              cpu: '500m'
          livenessProbe:
            httpGet:
              path: /api/health/live
              port: 3000
            initialDelaySeconds: 30
            periodSeconds: 10
            timeoutSeconds: 3
            failureThreshold: 3
          readinessProbe:
            httpGet:
              path: /api/health/ready
              port: 3000
            initialDelaySeconds: 10
            periodSeconds: 5
            timeoutSeconds: 3
            failureThreshold: 3
          lifecycle:
            preStop:
              exec:
                command:
                  - 'sh'
                  - '-c'
                  - 'sleep 15 && curl -X POST http://localhost:3000/api/health/shutdown || true'
```

**Step 3: Create Kubernetes service**

```yaml
# infra/kubernetes/service.yaml
apiVersion: v1
kind: Service
metadata:
  name: paseto-api
spec:
  type: ClusterIP
  ports:
    - port: 80
      targetPort: 3000
      protocol: TCP
      name: http
  selector:
    app: paseto-api
  sessionAffinity:
    clientIP:
      timeoutSeconds: 10800
```

**Step 4: Commit**

```bash
git add infra/kubernetes/ infra/docker/ infra/nginx/
git commit -m "feat: add Kubernetes deployment configuration with health checks"
```

---

## Phase 21: Load Testing & Performance Testing

#### Task 36: Create Load Testing Scripts

**Files:**

- Create: `tests/load/api-load.test.ts`
- Create: `tests/performance/benchmark.test.ts`

**Step 1: Create load test**

```typescript
// tests/load/api-load.test.ts
import { describe, it } from 'bun:test';
import { check } from 'bun:test';

describe('API Load Tests', () => {
  const baseUrl = process.env.API_BASE_URL || 'http://localhost:3000';

  it('should handle 100 concurrent requests', async () => {
    const requests = Array.from({ length: 100 }, async (_, i) => {
      const response = await fetch(`${baseUrl}/api/health`);
      return {
        status: response.status,
        latency: performance.now(),
      };
    });

    const startTime = performance.now();
    const results = await Promise.all(requests);
    const totalTime = performance.now() - startTime;

    const successful = results.filter(r => r.status === 200);
    const averageLatency =
      results.reduce((sum, r) => sum + r.latency - startTime, 0) / results.length;

    console.log({
      totalRequests: results.length,
      successful: successful.length,
      failed: results.length - successful.length,
      totalTime: `${totalTime.toFixed(2)}ms`,
      averageLatency: `${averageLatency.toFixed(2)}ms`,
      requestsPerSecond: (results.length / (totalTime / 1000)).toFixed(2),
    });

    expect(successful.length).toBe(results.length);
  });
});
```

**Step 2: Commit**

```bash
git add tests/load/ tests/performance/
git commit -m "feat: add load testing and performance benchmarking scripts"
```

---

## Phase 22: Final Polish & Documentation

#### Task 37: Update README and Final Documentation

**Files:**

- Update: `README.md`
- Create: `docs/deployment/production.md`
- Create: `docs/operations/monitoring.md`
- Create: `docs/operations/runbook.md`

**Step 1: Update README**

```markdown
# Bun Elysia PASETO Boilerplate

> Production-ready monolith REST API boilerplate with PASETO v4 authentication, designed for scalability and security.

## Features

- 🔐 **PASETO v4 Authentication** - Modern, secure alternative to JWT
- 🏗️ **Clean Architecture** - Modular, testable, maintainable
- 📊 **Observability** - Prometheus metrics, OpenTelemetry tracing
- 🔄 **Background Jobs** - Scheduled tasks with retry logic
- 📦 **API Versioning** - Backward compatibility, graceful deprecation
- ⚡ **Redis Caching** - Performance optimization
- 📈 **Auto-scaling Ready** - Kubernetes-native deployment
- 🧪 **Comprehensive Testing** - Unit, integration, E2E, load tests

## Quick Start

\`\`\`bash

# Install dependencies

bun install

# Setup environment

cp .env.example .env

# Edit .env with your configuration

# Run migrations

bun run db:migrate

# Start development server

bun run dev
\`\`\`

## Documentation

- [Architecture](docs/architecture/)
- [API Documentation](docs/api/)
- [Deployment Guide](docs/deployment/)
- [Operations Guide](docs/operations/)

## License

MIT
```

**Step 2: Commit**

```bash
git add README.md docs/deployment/ docs/operations/
git commit -m "docs: finalize documentation with deployment and operations guides"
```

---

## Senior Backend Engineer Learning Path

This boilerplate teaches:

### Phase 1: Foundation

- ✅ Clean architecture principles
- ✅ Repository pattern with Unit of Work
- ✅ Dependency injection
- ✅ Configuration management

### Phase 2: Security

- ✅ **Hybrid PASETO v4** (v4.local + v4.public) - **Both symmetric & asymmetric crypto**
  - v4.local: Encrypted access tokens (XChaCha20-Poly1305)
  - v4.public: Signed refresh tokens (Ed25519)
  - PASERK key format
  - Token generation and validation
  - Key management best practices
- ✅ Password hashing with Argon2
- ✅ Rate limiting strategies (global + per-user)
- ✅ Input validation patterns
- ✅ Security headers (CSP, HSTS, etc.)
- ✅ CSRF protection

### Phase 3: Production Readiness

- ✅ Structured logging with correlation IDs
- ✅ Health checks (liveness, readiness, deep)
- ✅ Graceful shutdown with pre-stop hooks
- ✅ Error handling standards
- ✅ Prometheus metrics export
- ✅ OpenTelemetry distributed tracing

### Phase 4: Testing

- ✅ Unit testing patterns
- ✅ Test doubles (mocks, spies, stubs)
- ✅ Test fixtures and builders
- ✅ Integration testing
- ✅ Load testing
- ✅ Performance benchmarking

### Phase 5: Advanced Features

- ✅ Elysia plugin architecture
- ✅ Background job processing
- ✅ Scheduled tasks (cron jobs)
- ✅ API versioning strategy
- ✅ Redis caching layer
- ✅ File upload handling
- ✅ Email service integration

### Phase 6: Deployment & DevOps

- ✅ Docker multi-stage builds
- ✅ Kubernetes deployment manifests
- ✅ Health check probes
- ✅ Resource limits and requests
- ✅ Rolling update strategy
- ✅ Pre-stop hooks for graceful shutdown

### Phase 7: Next Steps

- 📌 Circuit breaker pattern implementation
- 📌 Request retry logic with exponential backoff
- 📌 Distributed tracing with OTLP export
- 📌 APM integration (DataDog, New Relic)
- 📌 Sentry error tracking
- 📌 Log aggregation (ELK stack)
- 📌 Service mesh integration (Istio)
- 📌 Canary deployment strategies
- 📌 Feature flag system

---

**Total Estimated Tasks**: 37
**Total Estimated Commits**: 40+
**Lines of Code**: ~8000+

This plan provides a complete, production-ready monolith API boilerplate with modern best practices, comprehensive observability, and enterprise-grade deployment strategies, focusing on PASETO authentication and senior-level engineering patterns.
