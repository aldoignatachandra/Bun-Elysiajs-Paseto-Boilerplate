# 🚀 Bun + Elysia + PASETO Monolith Boilerplate

![License](https://img.shields.io/badge/license-MIT-blue.svg)
![Bun](https://img.shields.io/badge/Bun-v1.3+-000000?logo=bun&logoColor=white)
![Elysia](https://img.shields.io/badge/Elysia-v1+-2E7D32)
![PASETO](https://img.shields.io/badge/PASETO-v4-4A148C)
![PostgreSQL](https://img.shields.io/badge/PostgreSQL-16+-4169E1?logo=postgresql&logoColor=white)
![Redis](https://img.shields.io/badge/Redis-7+-DC382D?logo=redis&logoColor=white)
![Drizzle ORM](https://img.shields.io/badge/Drizzle-ORM-1E1E1E)
![Test Coverage](https://img.shields.io/badge/coverage-1121_tests_passing-brightgreen)

High-performance **monolith REST API boilerplate** using **Bun + Elysia + PASETO** with PostgreSQL (Drizzle ORM) and Redis (rate limiting).

This boilerplate implements modern authentication with **PASETO v4** tokens, provides a clean layered architecture, and includes comprehensive test coverage (1121+ tests passing).

---

## 📚 Table of Contents

- [Features](#-features)
- [System Architecture](#-system-architecture)
- [Project Structure](#-project-structure)
- [Prerequisites](#-prerequisites)
- [Getting Started](#-getting-started)
  - [1. Clone & Install](#1-clone--install)
  - [2. Environment Configuration](#2-environment-configuration)
  - [3. Generate PASETO Keys](#3-generate-paseto-keys)
  - [4. Start Infrastructure](#4-start-infrastructure-postgresql--redis)
  - [5. Database Setup](#5-database-setup-migrations--seeds)
  - [6. Run Application](#6-run-application)
- [Available Scripts](#-available-scripts)
- [API Documentation](#-api-documentation)
- [Testing](#-testing)
- [Standard Response Format](#-standard-response-format)
- [Deployment (Docker)](#-deployment-docker)
- [Troubleshooting](#-troubleshooting)

---

## ✨ Features

- **Monolith-first design**: Single deployable API service with clean layered architecture
- **PASETO v4 hybrid tokens**:
  - `v4.local` encrypted access token for secure API access
  - `v4.public` signed refresh token for token renewal
- **Drizzle ORM + PostgreSQL**: Type-safe schema and query layer with automatic migrations
- **Redis rate limiting**: Supports IP-based and user-or-IP rate limiting strategies
- **Go-style response envelope**: Consistent response shape for success and error cases
- **Security baseline**: Argon2 password hashing, input validation, and authentication middleware
- **Graceful Shutdown**: Configurable SIGTERM/SIGINT handling with graceful connection closure
- **Request Validation**: Automatic Zod validation with detailed error responses
- **Metrics Collection**: Prometheus-compatible metrics with `/metrics` endpoint
- **Request Context**: Enhanced request metadata tracking with performance monitoring
- **Security Headers**: OWASP-recommended security headers with CSP support
- **Hot Reload**: Bun's native `--watch` mode for rapid development iteration
- **Docker Development**: Complete containerized development with hot reload
- **Operational excellence**: Health endpoints and structured request logging
- **Comprehensive testing**: 1121+ tests covering all core functionality
- **Docker-ready**: Production-like compose setup with API + PostgreSQL + Redis + Nginx

---

## 🏗 System Architecture

### High-Level Monolith Flow

```mermaid
graph TD
  C[Client / Frontend] -->|HTTP| A[Elysia API :3000]

  subgraph API_Layers
    A --> R[Routes]
    R --> CT[Controllers]
    CT --> S[Services]
    S --> RP[Repositories]
  end

  RP --> PG[(PostgreSQL)]
  A --> RL[Rate Limiter]
  RL --> RD[(Redis)]
```

### Authentication Token Flow (PASETO)

```mermaid
sequenceDiagram
  participant U as User
  participant API as API
  participant DB as PostgreSQL

  U->>API: POST /api/v1/auth/login
  API->>DB: Verify user credentials
  DB-->>API: User record
  API-->>U: accessToken(v4.local) + refreshToken(v4.public)

  U->>API: POST /api/v1/auth/refresh
  API-->>U: New accessToken + refreshToken
```

---

## 📁 Project Structure

```bash
bun-elysia-paseto-boilerplate/
├── src/
│   ├── app.ts
│   ├── server.ts
│   ├── config/
│   ├── controllers/
│   ├── core/
│   │   ├── crypto/
│   │   ├── errors/
│   │   ├── http/
│   │   ├── logging/
│   │   ├── paseto/
│   │   ├── redis/
│   │   └── validation/
│   ├── database/
│   │   ├── migrations/
│   │   └── schema/
│   ├── middlewares/
│   ├── plugins/
│   ├── repositories/
│   ├── routes/
│   └── services/
├── tests/
│   ├── unit/
│   │   ├── config/              # Environment & config tests
│   │   ├── controllers/         # Controller unit tests
│   │   ├── core/                # Core utilities tests
│   │   │   ├── crypto/          # Password hashing tests
│   │   │   ├── errors/          # Error handling tests
│   │   │   ├── http/            # HTTP utilities tests
│   │   │   ├── logging/         # Logging tests
│   │   │   ├── paseto/          # PASETO token tests
│   │   │   ├── redis/           # Redis connection tests
│   │   │   └── validation/      # Schema validation tests
│   │   ├── database/            # Database & schema tests
│   │   │   └── schema/          # Drizzle schema tests
│   │   ├── middlewares/         # Middleware tests
│   │   ├── plugins/             # Plugin tests
│   │   ├── repositories/        # Repository tests
│   │   ├── routes/              # Route & DTO tests
│   │   └── services/            # Service layer tests
│   ├── middlewares/             # Integration middleware tests
│   └── app.test.ts              # Application integration tests
├── infra/
│   ├── docker/
│   ├── nginx/
│   ├── docker-compose.prod.yaml
│   └── deployment.sh
├── scripts/
└── docs/
```

---

## 🏗️ Architecture & Design Patterns

### Unit of Work Pattern

This boilerplate implements the **Unit of Work (UoW)** pattern for transaction management.

**What is Unit of Work?**

The Unit of Work pattern maintains a list of objects affected by a business transaction and coordinates the writing out of changes. It ensures that all operations within a transaction succeed or fail as a unit.

**Why We Use It:**

| Benefit                              | Description                                                                  |
| ------------------------------------ | ---------------------------------------------------------------------------- |
| **Transaction Consistency**          | Ensures atomicity - all related operations succeed together or fail together |
| **Database Round-trip Optimization** | Batches multiple operations into a single transaction                        |
| **Separation of Concerns**           | Business logic doesn't need to know about transaction management             |
| **Testability**                      | Easy to mock repositories for unit testing                                   |
| **Rollback Support**                 | Automatic rollback on errors, preventing partial updates                     |

**Example Usage:**

```typescript
// Service layer uses Unit of Work for transaction management
return this.unitOfWork.withTransaction(async (uow: UnitOfWork) => {
  // All these operations execute in a single transaction
  const user = await uow.users.create(userData);
  await uow.sessions.create(sessionData);
  await uow.activityLogs.create(logData);

  return { user, tokens };
  // If any operation fails, everything rolls back automatically
});
```

### Layered Architecture

The application follows a clean layered architecture:

```
Routes → Controllers → Services → Repositories → Database
```

Each layer has specific responsibilities:

- **Routes**: HTTP concerns, request parsing, middleware
- **Controllers**: Request orchestration, DTO validation, response formatting
- **Services**: Business logic, use cases (uses Unit of Work for transactions)
- **Repositories**: Data access, queries (uses Drizzle ORM)
- **Database**: PostgreSQL with automatic migrations

---

## ✅ Prerequisites

Before you begin, ensure you have the following installed:

1. **Bun** (v1.3 or later)
   ```bash
   curl -fsSL https://bun.sh/install | bash
   ```
2. **Docker & Docker Compose** (For running PostgreSQL and Redis)
3. **Git**

---

## 🚀 Getting Started

Follow these steps strictly to get the boilerplate running locally.

### 1. Clone & Install

```bash
git clone <your-repo-url>
cd bun-elysia-paseto-boilerplate

# Install dependencies
bun install
```

### 2. Environment Configuration

Copy the example environment file and configure it for your local setup:

```bash
cp .env.example .env
```

**Critical Variables Explained:**

| Variable                   | Description                                | Default (Local)                                     |
| :------------------------- | :----------------------------------------- | :-------------------------------------------------- |
| `DATABASE_URL`             | Connection string for PostgreSQL           | `postgresql://postgres:postgres@localhost:5432/...` |
| `REDIS_HOST`               | Redis host address                         | `localhost`                                         |
| `REDIS_PORT`               | Redis port                                 | `6379`                                              |
| `PASETO_LOCAL_KEY`         | Secret key for v4.local (encrypted) tokens | Generate with script (see step 3)                   |
| `PASETO_PUBLIC_KEY`        | Public key for v4.public (signed) tokens   | Generate with script (see step 3)                   |
| `PASETO_SECRET_KEY`        | Secret key for v4.public (signed) tokens   | Generate with script (see step 3)                   |
| `NODE_ENV`                 | Application environment                    | `development`                                       |
| `PORT`                     | API server port                            | `3000`                                              |
| `METRICS_ENABLED`          | Enable Prometheus metrics endpoint         | `true` in development/test, `false` in production   |
| `SHUTDOWN_TIMEOUT_MS`      | Graceful shutdown timeout (ms)             | `30000`                                             |
| `SHUTDOWN_GRACE_PERIOD_MS` | Grace period before force close (ms)       | `5000`                                              |

### 3. Generate PASETO Keys

Generate secure PASETO keys for token authentication:

```bash
bun run generate:paseto-keys
```

Copy the generated values into your `.env` file:

- `PASETO_LOCAL_KEY`
- `PASETO_PUBLIC_KEY`
- `PASETO_SECRET_KEY`

### 4. Start Infrastructure (PostgreSQL & Redis)

We use Docker to run the required infrastructure.

**Start PostgreSQL:**

```bash
docker run --name bun-elysia-pg \
  -e POSTGRES_USER=postgres \
  -e POSTGRES_PASSWORD=postgres \
  -e POSTGRES_DB=bun_elysia_paseto \
  -p 5432:5432 \
  -d postgres:16-alpine
```

**Start Redis:**

```bash
docker run --name bun-elysia-redis \
  -p 6379:6379 \
  -d redis:7-alpine
```

_Infrastructure will be ready within a few seconds._

### 5. Database Setup (Migrations & Seeds)

**Run Migrations:**

Initialize the database schema:

```bash
bun run db:migrate
```

**Seed Database (Optional):**

Populate the database with sample data:

```bash
bun run db:seed
```

### 6. Run Application

Start the development server:

```bash
bun run dev
```

The API will be available at: `http://localhost:3000`

**Quick health checks:**

```bash
curl http://localhost:3000/health/live
curl http://localhost:3000/health
curl http://localhost:3000/health/ready
```

**Swagger UI:**

Interactive API documentation is available at:

- `http://localhost:3000/swagger`

---

## 🧰 Available Scripts

| Script                         | Description                             |
| :----------------------------- | :-------------------------------------- |
| `bun run dev`                  | Start development server (watch mode)   |
| `bun run start`                | Start production server                 |
| `bun run test`                 | Run default test suite                  |
| `bun run test:unit`            | Run unit and middleware tests           |
| `bun run test:integration`     | Run API smoke/integration tests         |
| `bun run test:coverage`        | Run unit coverage + print overall %     |
| `bun run test:coverage:lcov`   | Run unit coverage with LCOV + overall % |
| `bun run lint`                 | Lint source files                       |
| `bun run lint:fix`             | Auto-fix lint issues                    |
| `bun run format`               | Format repository files                 |
| `bun run format:check`         | Check formatting                        |
| `bun run db:generate`          | Generate Drizzle migrations             |
| `bun run db:migrate`           | Apply migrations                        |
| `bun run db:seed`              | Seed database                           |
| `bun run db:studio`            | Open Drizzle Studio                     |
| `bun run generate:paseto-keys` | Generate PASETO keys                    |

---

## 📖 API Documentation

Base prefix: `/api/v1`

### 🔐 Authentication

- `POST /api/v1/auth/register` - Register new user
- `POST /api/v1/auth/login` - Login user
- `POST /api/v1/auth/refresh` - Refresh access token
- `POST /api/v1/auth/logout` - Logout user
- `GET /api/v1/auth/me` - Get current user
- `POST /api/v1/auth/change-password` - Change password

### 👤 Users

- `GET /api/v1/users/me` - Get current user profile
- `PATCH /api/v1/users/me` - Update current user profile
- `GET /api/v1/users` - List all users (paginated)
- `GET /api/v1/users/stats` - Get user statistics
- `GET /api/v1/users/:id` - Get user by ID
- `POST /api/v1/users/:id/activate` - Activate user account
- `POST /api/v1/users/:id/deactivate` - Deactivate user account
- `DELETE /api/v1/users/:id` - Soft delete user (`?force=true` for hard delete)
- `POST /api/v1/users/:id/restore` - Restore deleted user
- `GET /api/v1/activity-logs` - Get activity logs

### 📦 Products

- `POST /api/v1/products` - Create new product
- `GET /api/v1/products` - List all products (paginated)
- `GET /api/v1/products/:id` - Get product by ID
- `PUT /api/v1/products/:id` - Update product
- `DELETE /api/v1/products/:id` - Soft delete product (`?force=true` for hard delete)
- `POST /api/v1/products/:id/restore` - Restore deleted product
- `PUT /api/v1/products/:id/stock` - Update product stock

### 🩺 System Health

- `GET /health` - Full health check
- `GET /health/live` - Liveness probe
- `GET /health/ready` - Readiness probe
- `GET /swagger` - Interactive API documentation
- `GET /metrics` - Prometheus metrics (when `METRICS_ENABLED=true`)

---

## 🧪 Testing

This boilerplate includes comprehensive test coverage with **1121+ tests** covering all core functionality.

### Test Structure

The test suite mirrors the source code structure:

```
tests/
├── unit/                    # Unit test files mirroring src/ structure
│   ├── config/             # Environment configuration tests
│   ├── controllers/        # Controller logic tests
│   ├── core/               # Core utilities (crypto, paseto, redis, etc.)
│   │   ├── context/        # Request context enhancer tests
│   │   ├── metrics/        # Prometheus metrics tests
│   │   ├── security/       # Security headers tests
│   │   └── shutdown/       # Graceful shutdown tests
│   ├── database/           # Database connection and schema tests
│   ├── middlewares/        # Authentication, rate limiting, validation tests
│   ├── plugins/            # Health plugin tests
│   ├── repositories/       # Repository pattern tests
│   ├── routes/             # Route validation & DTO tests
│   └── services/           # Business logic tests
├── middlewares/            # Middleware integration tests
└── app.test.ts            # Application-level integration tests
```

### Running Tests

**Run all tests:**

```bash
bun run test
```

**Run unit tests only:**

```bash
bun run test:unit
```

**Run integration tests:**

```bash
bun run test:integration
```

**Generate coverage report:**

```bash
bun run test:coverage
```

Output:

```
Coverage Summary
- Overall Functions Coverage: 85.61%
- Overall Lines Coverage: 90.52%
```

**Generate LCOV coverage:**

```bash
bun run test:coverage:lcov
```

---

## 📦 Standard Response Format

### Success Response

```json
{
  "success": true,
  "message": "Request successful",
  "data": {
    "id": "550e8400-e29b-41d4-a716-446655440000"
  },
  "meta": {
    "timestamp": "2026-03-13T11:00:00.000Z",
    "request_id": "req_123456789"
  }
}
```

### Error Response

```json
{
  "success": false,
  "error": {
    "code": "UNAUTHORIZED",
    "message": "Authentication required"
  },
  "meta": {
    "timestamp": "2026-03-13T11:00:00.000Z",
    "request_id": "req_123456789"
  }
}
```

---

## 🐳 Deployment (Docker)

This boilerplate is **Docker-focused** for production deployments.

**Run production-like stack from infra:**

```bash
cd infra
docker compose -f docker-compose.prod.yaml up -d --build
```

**Or use deployment helper script:**

```bash
./infra/deployment.sh <image-name> <tag> <registry>
```

Example:

```bash
./infra/deployment.sh bun-elysia-paseto-api v1.0.0 docker.io/my-org
```

**Recommended Production Setup:**

- **Reverse Proxy**: Nginx (included in docker-compose) for SSL and routing
- **Managed Database**: AWS RDS, Google Cloud SQL, or similar for PostgreSQL
- **Managed Redis**: Redis Cloud, AWS ElastiCache, or similar
- **Monitoring**: Implement health check monitoring and logging aggregation
- **Secrets Management**: Use environment-specific secrets management (not `.env` files)

---

## 🔧 Troubleshooting

| Issue                          | Possible Cause                                | Solution                                                     |
| :----------------------------- | :-------------------------------------------- | :----------------------------------------------------------- |
| **Database connection failed** | PostgreSQL not running / wrong `DATABASE_URL` | Start Postgres container and re-check `.env`                 |
| **Redis connection failed**    | Redis not running / wrong host or port        | Start Redis container and verify `REDIS_HOST`, `REDIS_PORT`  |
| **Invalid PASETO key**         | Missing or malformed PASETO keys              | Re-run `bun run generate:paseto-keys` and update `.env`      |
| **429 Too Many Requests**      | Rate limiter threshold exceeded               | Wait for rate limit window reset or adjust rate limit config |
| **Tests failing**              | Environment not set up correctly              | Ensure PostgreSQL and Redis are running before running tests |
| **Migration failed**           | Database schema mismatch or connection issue  | Check `DATABASE_URL` and ensure database is accessible       |

---

## 📘 Documentation

- [`docs/standardization/README.md`](docs/standardization/README.md) - Project standards and conventions
- [`docs/standardization/PASETO_GUIDE.md`](docs/standardization/PASETO_GUIDE.md) - PASETO implementation guide
- [`docs/standardization/VALIDATION.md`](docs/standardization/VALIDATION.md) - Request validation middleware
- [`docs/standardization/GRACEFUL_SHUTDOWN.md`](docs/standardization/GRACEFUL_SHUTDOWN.md) - Graceful shutdown
- [`docs/standardization/HOT_RELOAD.md`](docs/standardization/HOT_RELOAD.md) - Hot reload configuration
- [`docs/standardization/METRICS.md`](docs/standardization/METRICS.md) - Metrics collection guide
- [`docs/standardization/REQUEST_CONTEXT.md`](docs/standardization/REQUEST_CONTEXT.md) - Request context enhancer
- [`docs/standardization/SECURITY_HEADERS.md`](docs/standardization/SECURITY_HEADERS.md) - Security headers and CSP
- [`docs/deployment/production.md`](docs/deployment/production.md) - Production deployment guide
- [`docs/operations/runbook.md`](docs/operations/runbook.md) - Operational runbook
- [`docs/operations/monitoring.md`](docs/operations/monitoring.md) - Monitoring and observability

---

Built for practical API delivery with **Bun + Elysia + PASETO**.

## 📜 License

This project is licensed under the MIT License.
