# Bun Elysia PASETO Boilerplate

> Production-ready monolith REST API boilerplate with PASETO v4 authentication, comprehensive security, monitoring, and operational excellence.

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Bun](https://img.shields.io/badge/Bun-1.0%2B-black)](https://bun.sh/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.3%2B-blue)](https://www.typescriptlang.org/)

## Overview

This boilerplate provides a solid foundation for building production-ready REST APIs using modern technologies and best practices. It implements a clean architecture with comprehensive security, observability, and operational features out of the box.

## Tech Stack

- **Runtime:** [Bun](https://bun.sh/) - Fast TypeScript runtime and package manager
- **Framework:** [Elysia](https://elysiajs.com/) - Performant TypeScript web framework
- **Database:** PostgreSQL 16+ with [Drizzle ORM](https://orm.drizzle.team/)
- **Cache:** Redis 7.2+
- **Authentication:** PASETO v4 (Platform-Agnostic Security Tokens)
- **Validation:** [Zod](https://zod.dev/) - TypeScript-first schema validation
- **Testing:** Bun's built-in test framework
- **Monitoring:** Prometheus metrics, OpenTelemetry tracing
- **Containerization:** Docker & Kubernetes ready

## Features

### Security

- **PASETO v4 Authentication** - Hybrid approach: v4.local (encrypted access) + v4.public (signed refresh)
- **Password Security** - Argon2 hashing with configurable rounds
- **Rate Limiting** - Redis-based rate limiting per IP/user
- **CORS Protection** - Configurable CORS policies
- **Security Headers** - Content Security Policy, HSTS, X-Frame-Options, etc.
- **Input Validation** - Comprehensive request validation with Zod
- **SQL Injection Protection** - Parameterized queries via Drizzle ORM
- **IDOR Prevention** - Row-level security checks in repositories
- **Audit Logging** - Comprehensive security event logging
- **Request Size Limits** - Configurable payload size restrictions

### Architecture

- **Clean Architecture** - Routes → Controllers → Services → Repositories
- **Dependency Injection** - InversifyJS for loose coupling
- **Separation of Concerns** - Clear layer boundaries
- **Repository Pattern** - Abstract data access layer
- **Unit of Work** - Transactional consistency
- **Plugin System** - Modular Elysia plugins for cross-cutting concerns

### API Features

- **API Versioning** - /api/v1/ prefix with backward compatibility
- **OpenAPI/Swagger** - Auto-generated API documentation
- **File Upload** - Configurable storage providers (local/S3-compatible)
- **Email Service** - Pluggable email providers (console, SMTP, SendGrid)
- **Background Jobs** - Queue-based async task processing
- **Scheduled Tasks** - Cron job support with flexible scheduling

### Observability

- **Metrics** - Prometheus metrics for requests, database, cache, and custom metrics
- **Distributed Tracing** - OpenTelemetry integration
- **Structured Logging** - Pino logger with JSON output
- **Health Checks** - /health endpoint for dependencies
- **Performance Monitoring** - Database query performance tracking

### Developer Experience

- **Type-Safe** - Full TypeScript with strict mode
- **Hot Reload** - Watch mode for development
- **Code Quality** - ESLint + Prettier with Husky pre-commit hooks
- **Git Hooks** - Automated linting and formatting
- **Testing Framework** - Built-in test runner with coverage
- **API Documentation** - Auto-generated Swagger docs

### Deployment

- **Docker Support** - Multi-stage production Dockerfile
- **Kubernetes Ready** - Complete K8s manifests (deployment, service, ingress, HPA, PDB)
- **Docker Compose** - Production-ready compose configuration
- **Environment Config** - Comprehensive environment variable management
- **Deployment Scripts** - Automated build and deployment scripts

## Quick Start

### Prerequisites

- **Bun** >= 1.0.0
- **PostgreSQL** >= 16
- **Redis** >= 7.2
- **Docker** (optional, for containerized deployment)

### Installation

```bash
# Clone the repository
git clone <your-repo-url>
cd bun-elysia-paseto-boilerplate

# Install dependencies
bun install

# Generate PASETO keys
bun run generate:paseto-keys

# Copy environment template
cp .env.example .env
# Edit .env with your configuration

# Run database migrations
bun run db:migrate

# Seed database (optional)
bun run db:seed

# Start development server
bun run dev
```

The API will be available at `http://localhost:3000`

### Verify Installation

```bash
# Check health endpoint
curl http://localhost:3000/health

# Access Swagger documentation
open http://localhost:3000/docs
```

## Available Scripts

```bash
# Development
bun run dev          # Start development server with hot reload
bun run start        # Start production server

# Testing
bun run test         # Run all tests
bun run test:coverage    # Run tests with coverage report
bun run test:unit    # Run unit tests only
bun run test:integration # Run integration tests only
bun run test:load    # Run load tests
bun run test:benchmark # Run performance benchmarks

# Code Quality
bun run lint         # Lint code with ESLint
bun run lint:fix     # Fix linting issues
bun run format       # Format code with Prettier
bun run format:check # Check code formatting

# Database
bun run db:generate  # Generate database migrations
bun run db:migrate   # Run database migrations
bun run db:seed      # Seed database with sample data
bun run db:studio    # Open Drizzle Studio for database GUI

# Security
bun run generate:paseto-keys  # Generate PASETO encryption keys

# Git Hooks
bun run prepare       # Setup Husky git hooks
```

## Project Structure

```
bun-elysia-paseto-boilerplate/
├── src/
│   ├── app.ts              # Elysia app setup and plugin registration
│   ├── server.ts           # Server bootstrap and startup
│   ├── config/             # Configuration management
│   │   ├── env.ts          # Environment variable validation
│   │   └── constants.ts    # Application constants
│   ├── core/               # Core utilities and services
│   │   ├── cache/          # Cache service (Redis)
│   │   ├── crypto/         # Password hashing (Argon2)
│   │   ├── metrics/        # Prometheus metrics collector
│   │   ├── paseto/         # PASETO token service
│   │   ├── redis/          # Redis connection
│   │   ├── scheduler/      # Cron job scheduler
│   │   ├── security/       # Security utilities (audit logger)
│   │   ├── storage/        # File storage abstraction
│   │   └── tracing/        # OpenTelemetry tracing
│   ├── database/           # Database layer
│   │   ├── connection.ts   # Database connection pooling
│   │   ├── performance/    # Performance monitoring
│   │   └── schema/         # Drizzle ORM schemas
│   ├── repositories/       # Data access layer
│   │   ├── base.repository.ts
│   │   ├── users.repository.ts
│   │   └── sessions.repository.ts
│   ├── services/           # Business logic layer
│   │   ├── auth.service.ts
│   │   ├── email.service.ts
│   │   └── users.service.ts
│   ├── controllers/        # Request handling layer
│   │   ├── auth.controller.ts
│   │   └── users.controller.ts
│   ├── routes/             # API routes
│   │   ├── dto/            # Request/response DTOs
│   │   ├── auth.routes.ts
│   │   ├── users.routes.ts
│   │   └── upload.routes.ts
│   ├── middlewares/        # Elysia middleware
│   │   ├── auth.middleware.ts
│   │   ├── rate-limit.middleware.ts
│   │   └── cors.middleware.ts
│   └── plugins/            # Elysia plugins
│       ├── metrics.plugin.ts
│       ├── tracing.plugin.ts
│       └── cache.plugin.ts
├── tests/                  # Test files
│   ├── unit/              # Unit tests
│   ├── integration/       # Integration tests
│   ├── load/              # Load tests
│   └── performance/       # Performance tests
├── scripts/                # Utility scripts
│   ├── generate-paseto-keys.ts
│   ├── migrate.ts
│   └── seed.ts
├── infra/                  # Infrastructure configuration
│   ├── docker/            # Docker configuration
│   ├── kubernetes/        # Kubernetes manifests
│   ├── nginx/             # Nginx configuration
│   └── deployment.sh      # Deployment script
├── docs/                   # Documentation
│   ├── deployment/        # Deployment guides
│   └── operations/        # Operational procedures
└── drizzle.config.ts       # Drizzle ORM configuration
```

## API Endpoints

### Authentication

- `POST /api/v1/auth/register` - User registration
- `POST /api/v1/auth/login` - User login
- `POST /api/v1/auth/refresh` - Refresh access token
- `POST /api/v1/auth/logout` - User logout
- `GET /api/v1/auth/me` - Get current user

### Users

- `GET /api/v1/users/:id` - Get user by ID
- `PUT /api/v1/users/:id` - Update user
- `DELETE /api/v1/users/:id` - Delete user

### Upload

- `POST /api/v1/upload` - Upload file

### Health & Metrics

- `GET /health` - Health check
- `GET /metrics` - Prometheus metrics
- `GET /docs` - Swagger documentation

## Configuration

### Environment Variables

See `.env.example` for all available configuration options. Key variables include:

```bash
# Server
NODE_ENV=production
PORT=3000
HOST=0.0.0.0

# Database
DATABASE_URL=postgresql://user:pass@localhost:5432/dbname
DATABASE_POOL_MIN=2
DATABASE_POOL_MAX=10

# Redis
REDIS_HOST=localhost
REDIS_PORT=6379

# PASETO
PASETO_LOCAL_KEY=k4.local.<your-key>
PASETO_PUBLIC_KEY=k4.public.<your-key>
PASETO_SECRET_KEY=k4.secret.<your-key>

# Security
BCRYPT_ROUNDS=12
RATE_LIMIT_MAX_REQUESTS=100
RATE_LIMIT_WINDOW_SECONDS=60
```

## Documentation

- [Deployment Guide](docs/deployment/production.md) - Production deployment instructions
- [Monitoring Guide](docs/operations/monitoring.md) - Metrics and monitoring setup
- [Operations Runbook](docs/operations/runbook.md) - Operational procedures

## Development

### Running Tests

```bash
# Run all tests
bun test

# Run with coverage
bun test --coverage

# Run specific test pattern
bun test --test-name-pattern='auth'
```

### Code Style

This project uses ESLint and Prettier for code quality:

```bash
# Check linting
bun run lint

# Fix linting issues
bun run lint:fix

# Format code
bun run format
```

Pre-commit hooks automatically run these checks.

### Adding New Features

1. **Create schema** in `src/database/schema/`
2. **Generate migration** with `bun run db:generate`
3. **Create repository** in `src/repositories/`
4. **Create service** in `src/services/`
5. **Create controller** in `src/controllers/`
6. **Create routes** in `src/routes/`
7. **Add tests** in `tests/`

## Deployment

### Docker

```bash
docker build -f infra/docker/production.dockerfile -t my-app:latest .
docker run -p 3000:3000 --env-file .env my-app:latest
```

### Kubernetes

```bash
kubectl apply -f infra/kubernetes/
```

See [deployment guide](docs/deployment/production.md) for detailed instructions.

## Production Considerations

### Security

- [ ] Generate strong PASETO keys and store securely
- [ ] Configure proper CORS origins
- [ ] Enable rate limiting
- [ ] Set up HTTPS/TLS
- [ ] Configure security headers
- [ ] Enable audit logging

### Monitoring

- [ ] Set up Prometheus for metrics scraping
- [ ] Configure alerting rules
- [ ] Set up log aggregation
- [ ] Enable distributed tracing
- [ ] Configure health check monitors

### Performance

- [ ] Configure database connection pooling
- [ ] Enable Redis caching
- [ ] Set up CDN for static assets
- [ ] Configure file storage (S3, etc.)
- [ ] Run load tests

### Backup & Recovery

- [ ] Set up database backups
- [ ] Document disaster recovery procedures
- [ ] Configure high availability
- [ ] Set up monitoring and alerting

## Contributing

Contributions are welcome! Please follow these guidelines:

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests for new functionality
5. Ensure all tests pass
6. Submit a pull request

## License

MIT License - see LICENSE file for details

## Support

For issues, questions, or contributions, please visit the project repository.

## Roadmap

- [ ] GraphQL support
- [ ] WebSocket support
- [ ] Additional authentication providers (OAuth, SAML)
- [ ] Multi-tenancy support
- [ ] Advanced caching strategies
- [ ] API gateway integration
- [ ] Event-driven architecture support

---

Built with [Bun](https://bun.sh/) + [Elysia](https://elysiajs.com/) + [PASETO](https://paseto.io/)
