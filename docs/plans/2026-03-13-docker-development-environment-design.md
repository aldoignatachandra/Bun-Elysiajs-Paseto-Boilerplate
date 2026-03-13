# Docker Development Environment Design Document

**Project:** Bun Elysia PASETO Boilerplate
**Feature:** Docker Compose Development Environment
**Date:** 2026-03-13
**Version:** 1.0.0
**Status:** Design

## Table of Contents

1. [Overview](#1-overview)
2. [Architecture](#2-architecture)
3. [File Structure](#3-file-structure)
4. [Docker Configuration](#4-docker-configuration)
5. [Services Breakdown](#5-services-breakdown)
6. [Development Workflow](#6-development-workflow)
7. [Integration Points](#7-integration-points)
8. [Testing Strategy](#8-testing-strategy)
9. [Usage Examples](#9-usage-examples)
10. [Troubleshooting](#10-troubleshooting)
11. [Success Criteria](#11-success-criteria)
12. [Security Considerations](#12-security-considerations)
13. [Performance Considerations](#13-performance-considerations)
14. [Future Enhancements](#14-future-enhancements)

---

## 1. Overview

### 1.1 Purpose

This design document outlines the implementation of a comprehensive Docker Compose development environment for the Bun Elysia PASETO boilerplate project. The environment provides a complete, isolated development stack with hot reload capabilities, persistent data storage, and developer-friendly tooling.

### 1.2 Goals

- Provide a consistent development environment across all platforms (macOS, Linux, Windows)
- Enable hot reload for rapid development iterations
- Isolate dependencies from the host system
- Provide easy-to-use database management interfaces
- Support both local development and CI/CD pipelines
- Maintain compatibility with existing development workflows
- Ensure data persistence across container restarts
- Provide health checks for all services

### 1.3 Scope

The Docker development environment includes:

- **API Service**: Bun-based Elysia application with hot reload
- **PostgreSQL 16**: Primary database with persistent storage
- **Redis 7**: Caching and session storage
- **pgAdmin 4**: PostgreSQL web-based management interface
- **Redis Commander**: Redis web-based management interface

### 1.4 Non-Goals

- Production deployment configuration (separate docker-compose.prod.yaml)
- Kubernetes deployment manifests
- Container orchestration beyond Docker Compose
- Multi-stage production builds
- Container security scanning
- Container image optimization for production

---

## 2. Architecture

### 2.1 System Overview

```
┌─────────────────────────────────────────────────────────────────┐
│                     Docker Host (macOS/Linux/Windows)           │
└─────────────────────────────────────────────────────────────────┘
                                │
┌─────────────────────────────────────────────────────────────────┐
│                    Docker Network (app-network)                 │
│  ┌───────────────────────────────────────────────────────────┐ │
│  │  Container Communication Bridge                            │ │
│  │  - Internal DNS resolution                                 │ │
│  │  - Service discovery                                       │ │
│  │  - Isolated from host network                              │ │
│  └───────────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────────┘
                                │
        ┌───────────────────────┼───────────────────────┐
        │                       │                       │
┌───────▼────────┐    ┌────────▼────────┐    ┌────────▼────────┐
│  API Service   │    │   PostgreSQL    │    │     Redis       │
│                │    │                 │    │                 │
│  Port: 3000    │    │  Port: 5432     │    │  Port: 6379     │
│  (mapped)      │    │  (internal)     │    │  (internal)     │
│                │    │                 │    │                 │
│  - Bun Runtime │    │  - Data Volume  │    │  - Data Volume  │
│  - Hot Reload  │    │  - Config Volume│    │  - Config       │
│  - Source Mount│    │                 │    │                 │
└────────────────┘    └─────────────────┘    └─────────────────┘
        │                       │                       │
┌───────▼────────┐    ┌────────▼────────┐    ┌────────▼────────┐
│   pgAdmin 4    │    │                 │    │ Redis Commander │
│                │    │                 │    │                 │
│  Port: 5050    │    │                 │    │  Port: 8081     │
│  (mapped)      │    │                 │    │  (mapped)       │
│                │    │                 │    │                 │
│  - Data Volume │    │                 │    │  - No Volume    │
│  - Config      │    │                 │    │  - Stateless    │
└────────────────┘    └─────────────────┘    └─────────────────┘
```

### 2.2 Network Architecture

**Network Name:** `app-network`
**Network Type:** Bridge
**Driver:** Bridge

**Network Characteristics:**

- **Isolation**: Containers can communicate with each other by service name
- **DNS Resolution**: Built-in DNS server for service discovery
- **Host Access**: Services can be accessed from host via port mappings
- **Firewall Rules**: Default deny all, allow only specified port mappings

**Service Communication:**

```
API → PostgreSQL: postgresql://postgres:postgres@postgres:5432/bun_elysia_paseto
API → Redis: redis://redis:6379/0
pgAdmin → PostgreSQL: postgresql://postgres:postgres@postgres:5432/bun_elysia_paseto
Redis Commander → Redis: redis://redis:6379
```

### 2.3 Volume Architecture

**Persistent Volumes:**

```
postgres_data:
  Driver: local
  Location: /var/lib/docker/volumes/bun-elysia-paseto-boilerplate_postgres_data/_data
  Purpose: PostgreSQL database files

postgres_config:
  Driver: local
  Location: /var/lib/docker/volumes/bun-elysia-paseto-boilerplate_postgres_config/_data
  Purpose: PostgreSQL configuration files

redis_data:
  Driver: local
  Location: /var/lib/docker/volumes/bun-elysia-paseto-boilerplate_redis_data/_data
  Purpose: Redis persistence file (RDB/AOF)

pgadmin_data:
  Driver: local
  Location: /var/lib/docker/volumes/bun-elysia-paseto-boilerplate_pgadmin_data/_data
  Purpose: pgAdmin 4 user data and sessions
```

**Bind Mounts:**

```
./src:/app/src:ro
  Purpose: Hot reload for API source code
  Mode: Read-only (for security)

.env:/app/.env:ro
  Purpose: Environment configuration
  Mode: Read-only (prevents container from modifying env)

./src/database/migrations:/app/migrations:ro
  Purpose: Database migration files
  Mode: Read-only
```

### 2.4 Health Check Architecture

**Health Check Endpoints:**

```
API: GET http://localhost:3000/health
  - Checks: Database connection, Redis connection, memory usage
  - Interval: 30s
  - Timeout: 5s
  - Retries: 3
  - Start Period: 40s

PostgreSQL: pg_isready
  - Interval: 10s
  - Timeout: 5s
  - Retries: 5
  - Start Period: 10s

Redis: redis-cli ping
  - Interval: 10s
  - Timeout: 3s
  - Retries: 5
  - Start Period: 10s
```

---

## 3. File Structure

### 3.1 New Files

```
bun-elysia-paseto-boilerplate/
├── docker/
│   ├── api/
│   │   └── Dockerfile.dev
│   └── postgres/
│       └── init-db.sh
├── docker-compose.dev.yaml
├── docker-compose.prod.yaml (future)
├── .dockerignore
└── docs/
    └── plans/
        └── 2026-03-13-docker-development-environment-design.md (this file)
```

### 3.2 Modified Files

```
bun-elysia-paseto-boilerplate/
├── .env.example (add Docker-specific variables)
└── .gitignore (add Docker-specific ignores)
```

### 3.3 File Descriptions

#### `docker/api/Dockerfile.dev`

Development Dockerfile for the API service.

- **Base Image**: `oven/bun:1.0.0-alpine`
- **Purpose**: Development environment with hot reload
- **Features**:
  - Minimal Alpine-based image
  - Bun runtime pre-installed
  - Development tools included
  - Volume mount support for source code

#### `docker/postgres/init-db.sh`

Database initialization script.

- **Purpose**: Create database and user if not exists
- **Execution**: Runs on container first start
- **Features**:
  - Idempotent operations
  - Error handling
  - Logging

#### `docker-compose.dev.yaml`

Main Docker Compose configuration for development.

- **Purpose**: Define all development services
- **Features**:
  - Service definitions
  - Network configuration
  - Volume declarations
  - Health checks
  - Environment variable mapping

#### `.dockerignore`

Docker build ignore patterns.

- **Purpose**: Exclude unnecessary files from build context
- **Benefits**:
  - Faster build times
  - Smaller image sizes
  - Security (excludes sensitive files)

---

## 4. Docker Configuration

### 4.1 Docker Compose Configuration

#### `docker-compose.dev.yaml`

```yaml
# Docker Compose Development Configuration
# Purpose: Complete development environment for Bun Elysia PASETO API
# Usage: docker-compose -f docker-compose.dev.yaml up

version: '3.9'

# Network configuration
networks:
  app-network:
    name: bun-elysia-paseto-dev
    driver: bridge
    ipam:
      driver: default
      config:
        - subnet: 172.20.0.0/16

# Volume configuration
volumes:
  postgres_data:
    name: bun-elysia-paseto-postgres-data
    driver: local
  postgres_config:
    name: bun-elysia-paseto-postgres-config
    driver: local
  redis_data:
    name: bun-elysia-paseto-redis-data
    driver: local
  pgadmin_data:
    name: bun-elysia-paseto-pgadmin-data
    driver: local

# Service definitions
services:
  # API Service
  api:
    build:
      context: .
      dockerfile: docker/api/Dockerfile.dev
    container_name: bun-elysia-paseto-api-dev
    restart: unless-stopped
    ports:
      - '${API_PORT:-3000}:3000'
    environment:
      # Server
      - NODE_ENV=development
      - PORT=3000
      - HOST=0.0.0.0

      # Database
      - DATABASE_URL=postgresql://${POSTGRES_USER:-postgres}:${POSTGRES_PASSWORD:-postgres}@postgres:5432/${POSTGRES_DB:-bun_elysia_paseto}
      - DATABASE_POOL_MIN=2
      - DATABASE_POOL_MAX=10
      - DATABASE_SSL=false

      # Redis
      - REDIS_HOST=redis
      - REDIS_PORT=6379
      - REDIS_PASSWORD=${REDIS_PASSWORD:-}
      - REDIS_DB=0

      # PASETO
      - PASETO_LOCAL_KEY=${PASETO_LOCAL_KEY}
      - PASETO_PUBLIC_KEY=${PASETO_PUBLIC_KEY}
      - PASETO_SECRET_KEY=${PASETO_SECRET_KEY}

      # Token Expiry
      - ACCESS_TOKEN_EXPIRY_MINUTES=${ACCESS_TOKEN_EXPIRY_MINUTES:-15}
      - REFRESH_TOKEN_EXPIRY_DAYS=${REFRESH_TOKEN_EXPIRY_DAYS:-7}

      # Rate Limiting
      - RATE_LIMIT_ENABLED=${RATE_LIMIT_ENABLED:-true}
      - RATE_LIMIT_WINDOW_SECONDS=${RATE_LIMIT_WINDOW_SECONDS:-60}
      - RATE_LIMIT_MAX_REQUESTS=${RATE_LIMIT_MAX_REQUESTS:-100}

      # Logging
      - LOG_LEVEL=${LOG_LEVEL:-debug}
      - LOG_PRETTY=true
      - LOG_FORMAT=json

      # CORS
      - CORS_ORIGIN=${CORS_ORIGIN:-*}
      - CORS_CREDENTIALS=${CORS_CREDENTIALS:-true}
      - CORS_METHODS=${CORS_METHODS:-GET,POST,PUT,DELETE,PATCH}
      - CORS_ALLOWED_HEADERS=${CORS_ALLOWED_HEADERS:-Content-Type,Authorization,X-Request-ID}

      # Security
      - BCRYPT_ROUNDS=${BCRYPT_ROUNDS:-12}
    volumes:
      # Source code mount for hot reload
      - ./src:/app/src:ro
      # Environment file
      - ./.env:/app/.env:ro
      # Migration files
      - ./src/database/migrations:/app/migrations:ro
      # Node modules (use container's node_modules)
      - /app/node_modules
    networks:
      - app-network
    depends_on:
      postgres:
        condition: service_healthy
      redis:
        condition: service_healthy
    healthcheck:
      test: ['CMD', 'wget', '--no-verbose', '--tries=1', '--spider', 'http://localhost:3000/health']
      interval: 30s
      timeout: 5s
      retries: 3
      start_period: 40s
    dns:
      - 8.8.8.8
      - 8.8.4.4

  # PostgreSQL Service
  postgres:
    image: postgres:16-alpine
    container_name: bun-elysia-paseto-postgres-dev
    restart: unless-stopped
    ports:
      - '${POSTGRES_PORT:-5432}:5432'
    environment:
      - POSTGRES_USER=${POSTGRES_USER:-postgres}
      - POSTGRES_PASSWORD=${POSTGRES_PASSWORD:-postgres}
      - POSTGRES_DB=${POSTGRES_DB:-bun_elysia_paseto}
      - PGDATA=/var/lib/postgresql/data/pgdata
    volumes:
      - postgres_data:/var/lib/postgresql/data
      - postgres_config:/etc/postgresql
      - ./docker/postgres/init-db.sh:/docker-entrypoint-initdb.d/init-db.sh:ro
    networks:
      - app-network
    healthcheck:
      test: ['CMD-SHELL', 'pg_isready -U ${POSTGRES_USER:-postgres} -d ${POSTGRES_DB:-bun_elysia_paseto}']
      interval: 10s
      timeout: 5s
      retries: 5
      start_period: 10s
    command: >
      postgres
        -c shared_preload_libraries=pg_stat_statements
        -c pg_stat_statements.track=all
        -c max_connections=200
        -c shared_buffers=256MB
        -c effective_cache_size=1GB
        -c maintenance_work_mem=64MB
        -c checkpoint_completion_target=0.9
        -c wal_buffers=16MB
        -c default_statistics_target=100
        -c random_page_cost=1.1
        -c effective_io_concurrency=200
        -c work_mem=1310kB
        -c min_wal_size=1GB
        -c max_wal_size=4GB

  # Redis Service
  redis:
    image: redis:7-alpine
    container_name: bun-elysia-paseto-redis-dev
    restart: unless-stopped
    ports:
      - '${REDIS_PORT:-6379}:6379'
    command: >
      redis-server
        --appendonly yes
        --appendfsync everysec
        --save 900 1
        --save 300 10
        --save 60 10000
        --maxmemory 256mb
        --maxmemory-policy allkeys-lru
        --lazyfree-lazy-eviction yes
        --lazyfree-lazy-expire yes
    volumes:
      - redis_data:/data
    networks:
      - app-network
    healthcheck:
      test: ['CMD', 'redis-cli', 'ping']
      interval: 10s
      timeout: 3s
      retries: 5
      start_period: 10s

  # pgAdmin Service
  pgadmin:
    image: dpage/pgadmin4:latest
    container_name: bun-elysia-paseto-pgadmin-dev
    restart: unless-stopped
    ports:
      - '${PGADMIN_PORT:-5050}:80'
    environment:
      - PGADMIN_DEFAULT_EMAIL=${PGADMIN_DEFAULT_EMAIL:-admin@bun-elysia-paseto.local}
      - PGADMIN_DEFAULT_PASSWORD=${PGADMIN_DEFAULT_PASSWORD:-admin}
      - PGADMIN_CONFIG_SERVER_MODE=False
      - PGADMIN_CONFIG_MASTER_PASSWORD_REQUIRED=False
    volumes:
      - pgadmin_data:/var/lib/pgadmin
    networks:
      - app-network
    depends_on:
      postgres:
        condition: service_healthy
    healthcheck:
      test: ['CMD', 'wget', '--no-verbose', '--tries=1', '--spider', 'http://localhost:80/misc/ping']
      interval: 30s
      timeout: 5s
      retries: 3
      start_period: 30s

  # Redis Commander Service
  redis-commander:
    image: rediscommander/redis-commander:latest
    container_name: bun-elysia-paseto-redis-commander-dev
    restart: unless-stopped
    ports:
      - '${REDIS_COMMANDER_PORT:-8081}:8081'
    environment:
      - REDIS_HOSTS=local:redis:6379
      - HTTP_USER=${REDIS_COMMANDER_USER:-admin}
      - HTTP_PASSWORD=${REDIS_COMMANDER_PASSWORD:-admin}
    networks:
      - app-network
    depends_on:
      redis:
        condition: service_healthy
    healthcheck:
      test: ['CMD', 'wget', '--no-verbose', '--tries=1', '--spider', 'http://localhost:8081']
      interval: 30s
      timeout: 5s
      retries: 3
      start_period: 20s
```

### 4.2 Dockerfile Configuration

#### `docker/api/Dockerfile.dev`

```dockerfile
# Development Dockerfile for Bun Elysia PASETO API
# Purpose: Development environment with hot reload capabilities
# Usage: docker-compose -f docker-compose.dev.yaml build api

# Base image - Alpine Linux with Bun runtime
FROM oven/bun:1.0.0-alpine AS base

# Set working directory
WORKDIR /app

# Install dependencies
FROM base AS dependencies

# Install build dependencies for native modules
RUN apk add --no-cache \
    python3 \
    make \
    g++ \
    postgresql-client

# Copy package files
COPY package.json bun.lockb* ./

# Install dependencies
RUN bun install --frozen-lockfile

# Development stage
FROM base AS development

# Install runtime dependencies
RUN apk add --no-cache \
    wget \
    postgresql-client \
    curl

# Copy node modules from dependencies stage
COPY --from=dependencies /app/node_modules ./node_modules

# Copy package files
COPY package.json bun.lockb* ./

# Create non-root user for running the application
RUN addgroup -g 1001 -S bun && \
    adduser -S -u 1001 -G bun bun

# Change ownership of app directory
RUN chown -R bun:bun /app

# Switch to non-root user
USER bun

# Expose API port
EXPOSE 3000

# Health check
HEALTHCHECK --interval=30s --timeout=5s --retries=3 --start-period=40s \
    CMD wget --no-verbose --tries=1 --spider http://localhost:3000/health || exit 1

# Default command (will be overridden by docker-compose)
CMD ["bun", "run", "dev"]
```

### 4.3 Database Initialization Script

#### `docker/postgres/init-db.sh`

```bash
#!/bin/bash
# PostgreSQL Database Initialization Script
# Purpose: Initialize database with required extensions and schemas
# Execution: Runs automatically on container first start

set -e

echo "========================================"
echo "PostgreSQL Initialization Script"
echo "========================================"

# Database connection parameters
DB_USER=${POSTGRES_USER:-postgres}
DB_NAME=${POSTGRES_DB:-bun_elysia_paseto}
DB_HOST=${DB_HOST:-localhost}
DB_PORT=${DB_PORT:-5432}

echo "Database: $DB_NAME"
echo "User: $DB_USER"
echo "Host: $DB_HOST"
echo "Port: $DB_PORT"
echo ""

# Wait for PostgreSQL to be ready
echo "Waiting for PostgreSQL to be ready..."
until pg_isready -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER"; do
  echo "PostgreSQL is unavailable - sleeping"
  sleep 2
done

echo "PostgreSQL is ready!"
echo ""

# Execute SQL commands
echo "Running database initialization..."

psql -v ON_ERROR_STOP=1 --username "$DB_USER" --dbname "$DB_NAME" <<-EOSQL
  -- Enable required extensions
  CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
  CREATE EXTENSION IF NOT EXISTS "pgcrypto";
  CREATE EXTENSION IF NOT EXISTS "pg_stat_statements";

  -- Create custom schema if not exists
  CREATE SCHEMA IF NOT EXISTS app;

  -- Grant permissions
  GRANT ALL PRIVILEGES ON SCHEMA app TO "$DB_USER";
  GRANT ALL PRIVILEGES ON DATABASE "$DB_NAME" TO "$DB_USER";

  -- Create initial admin function for health checks
  CREATE OR REPLACE FUNCTION health_check()
  RETURNS TABLE (status text, timestamp timestamptz)
  AS \$\$
  BEGIN
    RETURN QUERY SELECT 'healthy'::text, now()::timestamptz;
  END;
  \$\$ LANGUAGE plpgsql;
EOSQL

echo "Database initialization completed successfully!"
echo ""

# Create additional schemas if needed
echo "Creating additional schemas..."

psql -v ON_ERROR_STOP=1 --username "$DB_USER" --dbname "$DB_NAME" <<-EOSQL
  -- Create schemas for multi-tenancy support (optional)
  CREATE SCHEMA IF NOT EXISTS tenant_1;
  CREATE SCHEMA IF NOT EXISTS tenant_2;

  -- Grant permissions on tenant schemas
  GRANT ALL PRIVILEGES ON SCHEMA tenant_1 TO "$DB_USER";
  GRANT ALL PRIVILEGES ON SCHEMA tenant_2 TO "$DB_USER";
EOSQL

echo "Schema creation completed!"
echo ""
echo "========================================"
echo "PostgreSQL initialization complete!"
echo "========================================"
```

### 4.4 Docker Ignore Configuration

#### `.dockerignore`

```
# Dependencies
node_modules/
npm-debug.log*
yarn-debug.log*
yarn-error.log*
bun.lockb*

# Environment files
.env
.env.local
.env.*.local

# Testing
coverage/
.nyc_output/
*.test.ts
*.spec.ts
tests/

# IDE
.vscode/
.idea/
*.swp
*.swo
*~
.DS_Store

# Build output
dist/
build/
out/

# Git
.git/
.gitignore
.gitattributes

# CI/CD
.github/
.gitlab-ci.yml
.travis.yml
.circleci/

# Documentation
docs/
*.md
!README.md

# Docker
Dockerfile*
docker-compose*
.dockerignore

# Logs
logs/
*.log

# OS
Thumbs.db
.DS_Store
*.bak
*.tmp

# Misc
.cache/
.temp/
```

---

## 5. Services Breakdown

### 5.1 API Service Configuration

#### Purpose

Primary application service running the Bun Elysia PASETO REST API.

#### Container Details

| Property          | Value                     |
| ----------------- | ------------------------- |
| Image             | oven/bun:1.0.0-alpine     |
| Container Name    | bun-elysia-paseto-api-dev |
| Restart Policy    | unless-stopped            |
| User              | bun (UID: 1001)           |
| Working Directory | /app                      |

#### Port Mapping

| Container Port | Host Port                          | Protocol | Purpose           |
| -------------- | ---------------------------------- | -------- | ----------------- |
| 3000           | 3000 (configurable via `API_PORT`) | TCP      | API HTTP endpoint |

#### Volume Mounts

| Host Path                   | Container Path      | Mode           | Purpose                         |
| --------------------------- | ------------------- | -------------- | ------------------------------- |
| `./src`                     | `/app/src`          | ro (read-only) | Hot reload for source code      |
| `./.env`                    | `/app/.env`         | ro             | Environment configuration       |
| `./src/database/migrations` | `/app/migrations`   | ro             | Database migration files        |
| (anonymous)                 | `/app/node_modules` | rw             | Container-specific node_modules |

#### Environment Variables

**Server Configuration:**

```bash
NODE_ENV=development
PORT=3000
HOST=0.0.0.0
```

**Database Configuration:**

```bash
DATABASE_URL=postgresql://postgres:postgres@postgres:5432/bun_elysia_paseto
DATABASE_POOL_MIN=2
DATABASE_POOL_MAX=10
DATABASE_SSL=false
```

**Redis Configuration:**

```bash
REDIS_HOST=redis
REDIS_PORT=6379
REDIS_PASSWORD=
REDIS_DB=0
```

**PASETO Configuration:**

```bash
PASETO_LOCAL_KEY=<from-host-env>
PASETO_PUBLIC_KEY=<from-host-env>
PASETO_SECRET_KEY=<from-host-env>
```

**Token Configuration:**

```bash
ACCESS_TOKEN_EXPIRY_MINUTES=15
REFRESH_TOKEN_EXPIRY_DAYS=7
```

**Rate Limiting Configuration:**

```bash
RATE_LIMIT_ENABLED=true
RATE_LIMIT_WINDOW_SECONDS=60
RATE_LIMIT_MAX_REQUESTS=100
```

**Logging Configuration:**

```bash
LOG_LEVEL=debug
LOG_PRETTY=true
LOG_FORMAT=json
```

**CORS Configuration:**

```bash
CORS_ORIGIN=*
CORS_CREDENTIALS=true
CORS_METHODS=GET,POST,PUT,DELETE,PATCH
CORS_ALLOWED_HEADERS=Content-Type,Authorization,X-Request-ID
```

**Security Configuration:**

```bash
BCRYPT_ROUNDS=12
```

#### Health Check

| Property     | Value                                        |
| ------------ | -------------------------------------------- |
| Test         | `wget --spider http://localhost:3000/health` |
| Interval     | 30 seconds                                   |
| Timeout      | 5 seconds                                    |
| Retries      | 3                                            |
| Start Period | 40 seconds                                   |

#### Dependencies

- **postgres**: Service must be healthy
- **redis**: Service must be healthy

#### Hot Reload Mechanism

The API service supports hot reload through:

1. **Volume Mounting**: Source code is mounted from host to container
2. **Bun Watch Mode**: `bun run --watch` automatically restarts on file changes
3. **Read-Only Mounts**: Source files mounted as read-only for security
4. **Separate node_modules**: Container uses its own node_modules to avoid conflicts

#### Startup Process

1. Container starts
2. Waits for PostgreSQL health check
3. Waits for Redis health check
4. Copies node_modules (first run only)
5. Loads environment variables
6. Starts Bun with watch mode
7. Application listens on port 3000
8. Health check passes

### 5.2 PostgreSQL Service Configuration

#### Purpose

Primary relational database for the application.

#### Container Details

| Property       | Value                            |
| -------------- | -------------------------------- |
| Image          | postgres:16-alpine               |
| Container Name | bun-elysia-paseto-postgres-dev   |
| Restart Policy | unless-stopped                   |
| Database User  | postgres (configurable)          |
| Database Name  | bun_elysia_paseto (configurable) |

#### Port Mapping

| Container Port | Host Port                               | Protocol | Purpose               |
| -------------- | --------------------------------------- | -------- | --------------------- |
| 5432           | 5432 (configurable via `POSTGRES_PORT`) | TCP      | PostgreSQL connection |

#### Volume Mounts

| Volume          | Container Path                         | Purpose                     |
| --------------- | -------------------------------------- | --------------------------- |
| postgres_data   | /var/lib/postgresql/data               | Persistent database storage |
| postgres_config | /etc/postgresql                        | Configuration files         |
| (bind mount)    | /docker-entrypoint-initdb.d/init-db.sh | Initialization script       |

#### Environment Variables

```bash
POSTGRES_USER=postgres
POSTGRES_PASSWORD=postgres
POSTGRES_DB=bun_elysia_paseto
PGDATA=/var/lib/postgresql/data/pgdata
```

#### Tuning Parameters

| Parameter                    | Value              | Description                   |
| ---------------------------- | ------------------ | ----------------------------- |
| shared_preload_libraries     | pg_stat_statements | Query statistics              |
| pg_stat_statements.track     | all                | Track all statements          |
| max_connections              | 200                | Maximum connections           |
| shared_buffers               | 256MB              | Shared memory buffer          |
| effective_cache_size         | 1GB                | Effective cache size          |
| maintenance_work_mem         | 64MB               | Maintenance operations memory |
| checkpoint_completion_target | 0.9                | Checkpoint completion target  |
| wal_buffers                  | 16MB               | WAL buffer size               |
| default_statistics_target    | 100                | Statistics target             |
| random_page_cost             | 1.1                | Random page cost (SSD)        |
| effective_io_concurrency     | 200                | I/O concurrency               |
| work_mem                     | 1310kB             | Work memory                   |
| min_wal_size                 | 1GB                | Minimum WAL size              |
| max_wal_size                 | 4GB                | Maximum WAL size              |

#### Health Check

| Property     | Value                                         |
| ------------ | --------------------------------------------- |
| Test         | `pg_isready -U postgres -d bun_elysia_paseto` |
| Interval     | 10 seconds                                    |
| Timeout      | 5 seconds                                     |
| Retries      | 5                                             |
| Start Period | 10 seconds                                    |

#### Extensions Installed

- `uuid-ossp`: UUID generation functions
- `pgcrypto`: Cryptographic functions
- `pg_stat_statements`: Query execution statistics

#### Initialization Process

1. Container starts
2. Runs init-db.sh from /docker-entrypoint-initdb.d/
3. Creates required extensions
4. Creates custom schemas
5. Sets up permissions
6. Health check passes
7. Accepts connections

### 5.3 Redis Service Configuration

#### Purpose

In-memory data store for caching and session management.

#### Container Details

| Property       | Value                       |
| -------------- | --------------------------- |
| Image          | redis:7-alpine              |
| Container Name | bun-elysia-paseto-redis-dev |
| Restart Policy | unless-stopped              |

#### Port Mapping

| Container Port | Host Port                            | Protocol | Purpose          |
| -------------- | ------------------------------------ | -------- | ---------------- |
| 6379           | 6379 (configurable via `REDIS_PORT`) | TCP      | Redis connection |

#### Volume Mounts

| Volume     | Container Path | Purpose                     |
| ---------- | -------------- | --------------------------- |
| redis_data | /data          | Persistence files (RDB/AOF) |

#### Configuration Parameters

| Parameter              | Value                   | Description            |
| ---------------------- | ----------------------- | ---------------------- |
| appendonly             | yes                     | Enable AOF persistence |
| appendfsync            | everysec                | Sync AOF every second  |
| save                   | 900 1, 300 10, 60 10000 | RDB snapshot rules     |
| maxmemory              | 256mb                   | Maximum memory usage   |
| maxmemory-policy       | allkeys-lru             | Eviction policy        |
| lazyfree-lazy-eviction | yes                     | Lazy eviction          |
| lazyfree-lazy-expire   | yes                     | Lazy expiration        |

#### Persistence Strategy

**RDB Snapshots:**

- Save after 900 seconds if at least 1 key changed
- Save after 300 seconds if at least 10 keys changed
- Save after 60 seconds if at least 10000 keys changed

**AOF (Append Only File):**

- Enabled for better durability
- Synced to disk every second
- Rewritten automatically when needed

#### Health Check

| Property     | Value            |
| ------------ | ---------------- |
| Test         | `redis-cli ping` |
| Interval     | 10 seconds       |
| Timeout      | 3 seconds        |
| Retries      | 5                |
| Start Period | 10 seconds       |

#### Memory Management

- **Max Memory**: 256MB
- **Eviction Policy**: allkeys-lru (evict least recently used keys)
- **Lazy Freeing**: Enabled for better performance during eviction

### 5.4 pgAdmin Service Configuration

#### Purpose

Web-based PostgreSQL management interface.

#### Container Details

| Property       | Value                         |
| -------------- | ----------------------------- |
| Image          | dpage/pgadmin4:latest         |
| Container Name | bun-elysia-paseto-pgadmin-dev |
| Restart Policy | unless-stopped                |

#### Port Mapping

| Container Port | Host Port                              | Protocol | Purpose               |
| -------------- | -------------------------------------- | -------- | --------------------- |
| 80             | 5050 (configurable via `PGADMIN_PORT`) | TCP      | pgAdmin web interface |

#### Volume Mounts

| Volume       | Container Path   | Purpose                |
| ------------ | ---------------- | ---------------------- |
| pgadmin_data | /var/lib/pgadmin | User data and sessions |

#### Environment Variables

```bash
PGADMIN_DEFAULT_EMAIL=admin@bun-elysia-paseto.local
PGADMIN_DEFAULT_PASSWORD=admin
PGADMIN_CONFIG_SERVER_MODE=False
PGADMIN_CONFIG_MASTER_PASSWORD_REQUIRED=False
```

#### Health Check

| Property     | Value                                         |
| ------------ | --------------------------------------------- |
| Test         | `wget --spider http://localhost:80/misc/ping` |
| Interval     | 30 seconds                                    |
| Timeout      | 5 seconds                                     |
| Retries      | 3                                             |
| Start Period | 30 seconds                                    |

#### Dependencies

- **postgres**: Service must be healthy

#### Access Credentials

Default credentials (change in production):

| Property | Value                         |
| -------- | ----------------------------- |
| Email    | admin@bun-elysia-paseto.local |
| Password | admin                         |

#### Connection Configuration

To connect to PostgreSQL from pgAdmin:

1. Open http://localhost:5050
2. Login with credentials
3. Add new server:
   - **Host**: postgres
   - **Port**: 5432
   - **Database**: bun_elysia_paseto
   - **Username**: postgres
   - **Password**: postgres

### 5.5 Redis Commander Service Configuration

#### Purpose

Web-based Redis management interface.

#### Container Details

| Property       | Value                                 |
| -------------- | ------------------------------------- |
| Image          | rediscommander/redis-commander:latest |
| Container Name | bun-elysia-paseto-redis-commander-dev |
| Restart Policy | unless-stopped                        |

#### Port Mapping

| Container Port | Host Port                                      | Protocol | Purpose                       |
| -------------- | ---------------------------------------------- | -------- | ----------------------------- |
| 8081           | 8081 (configurable via `REDIS_COMMANDER_PORT`) | TCP      | Redis Commander web interface |

#### Environment Variables

```bash
REDIS_HOSTS=local:redis:6379
HTTP_USER=admin
HTTP_PASSWORD=admin
```

#### Health Check

| Property     | Value                                 |
| ------------ | ------------------------------------- |
| Test         | `wget --spider http://localhost:8081` |
| Interval     | 30 seconds                            |
| Timeout      | 5 seconds                             |
| Retries      | 3                                     |
| Start Period | 20 seconds                            |

#### Dependencies

- **redis**: Service must be healthy

#### Access Credentials

Default credentials (change in production):

| Property | Value |
| -------- | ----- |
| Username | admin |
| Password | admin |

#### Connection Configuration

Redis Commander is pre-configured to connect to the local Redis instance:

- **Host**: redis
- **Port**: 6379
- **Label**: local

---

## 6. Development Workflow

### 6.1 Initial Setup

#### Prerequisites

1. Install Docker Desktop (macOS/Windows) or Docker Engine (Linux)
2. Ensure Docker is running: `docker info`
3. Clone the repository
4. Navigate to project directory

#### Step-by-Step Setup

```bash
# 1. Navigate to project directory
cd /path/to/bun-elysia-paseto-boilerplate

# 2. Create environment file from example
cp .env.example .env

# 3. Generate PASETO keys (if not already generated)
bun run generate:paseto-keys

# 4. Update .env with generated keys
# Edit .env and replace PASETO_* values with generated keys

# 5. (Optional) Customize port mappings
# Edit .env and add:
# API_PORT=3000
# POSTGRES_PORT=5432
# REDIS_PORT=6379
# PGADMIN_PORT=5050
# REDIS_COMMANDER_PORT=8081

# 6. Start services
docker-compose -f docker-compose.dev.yaml up -d

# 7. Wait for services to be healthy (check with docker-compose ps)
docker-compose -f docker-compose.dev.yaml ps

# 8. Run database migrations
docker-compose -f docker-compose.dev.yaml exec api bun run db:migrate

# 9. Seed database (optional)
docker-compose -f docker-compose.dev.yaml exec api bun run db:seed

# 10. Verify services are running
curl http://localhost:3000/health
```

### 6.2 Starting Services

#### Start All Services

```bash
# Start all services in detached mode
docker-compose -f docker-compose.dev.yaml up -d
```

#### Start Specific Services

```bash
# Start only API and database
docker-compose -f docker-compose.dev.yaml up -d api postgres redis

# Start with fresh database (warning: destroys data)
docker-compose -f docker-compose.dev.yaml down -v
docker-compose -f docker-compose.dev.yaml up -d
```

#### Start with Logs

```bash
# Start and follow logs
docker-compose -f docker-compose.dev.yaml up

# Start specific service and follow logs
docker-compose -f docker-compose.dev.yaml up api
```

### 6.3 Stopping Services

#### Stop All Services

```bash
# Stop all services gracefully
docker-compose -f docker-compose.dev.yaml stop

# Stop and remove containers
docker-compose -f docker-compose.dev.yaml down

# Stop and remove containers, volumes, and orphaned containers
docker-compose -f docker-compose.dev.yaml down -v --remove-orphans
```

#### Stop Specific Services

```bash
# Stop API service
docker-compose -f docker-compose.dev.yaml stop api

# Stop database services
docker-compose -f docker-compose.dev.yaml stop postgres redis
```

### 6.4 Viewing Logs

#### View All Logs

```bash
# Follow all logs
docker-compose -f docker-compose.dev.yaml logs -f

# View last 100 lines
docker-compose -f docker-compose.dev.yaml logs --tail=100

# View logs with timestamps
docker-compose -f docker-compose.dev.yaml logs -f --timestamps
```

#### View Service-Specific Logs

```bash
# API logs
docker-compose -f docker-compose.dev.yaml logs -f api

# PostgreSQL logs
docker-compose -f docker-compose.dev.yaml logs -f postgres

# Redis logs
docker-compose -f docker-compose.dev.yaml logs -f redis

# Multiple services
docker-compose -f docker-compose.dev.yaml logs -f api postgres redis
```

#### Filter Logs

```bash
# Show logs since specific time
docker-compose -f docker-compose.dev.yaml logs --since="2024-01-01T00:00:00"

# Show logs from last 10 minutes
docker-compose -f docker-compose.dev.yaml logs --since=10m

# Show logs until specific time
docker-compose -f docker-compose.dev.yaml logs --until="2024-01-01T01:00:00"
```

### 6.5 Accessing Services

#### API Access

```bash
# Health check
curl http://localhost:3000/health

# Swagger documentation
open http://localhost:3000/swagger

# API endpoint example
curl http://localhost:3000/api/v1/auth/register \
  -X POST \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"SecurePassword123"}'
```

#### pgAdmin Access

```bash
# Open in browser
open http://localhost:5050

# Or access via URL
# http://localhost:5050
```

#### Redis Commander Access

```bash
# Open in browser
open http://localhost:8081

# Or access via URL
# http://localhost:8081
```

### 6.6 Running Commands in Containers

#### Execute Commands

```bash
# Access API container shell
docker-compose -f docker-compose.dev.yaml exec api sh

# Run database migrations
docker-compose -f docker-compose.dev.yaml exec api bun run db:migrate

# Run tests
docker-compose -f docker-compose.dev.yaml exec api bun run test:unit

# Generate new migration
docker-compose -f docker-compose.dev.yaml exec api bun run db:generate

# Access PostgreSQL CLI
docker-compose -f docker-compose.dev.yaml exec postgres psql -U postgres -d bun_elysia_paseto

# Access Redis CLI
docker-compose -f docker-compose.dev.yaml exec redis redis-cli
```

#### Interactive Sessions

```bash
# Start interactive shell in API container
docker-compose -f docker-compose.dev.yaml run --rm api sh

# Start interactive shell in PostgreSQL container
docker-compose -f docker-compose.dev.yaml run --rm postgres sh

# Start interactive shell in Redis container
docker-compose -f docker-compose.dev.yaml run --rm redis sh
```

### 6.7 Development Workflow with Hot Reload

#### Making Code Changes

1. Edit source files in your IDE
2. Save changes
3. Bun watch mode automatically restarts the API
4. Test changes immediately via HTTP requests

#### Example Workflow

```bash
# Terminal 1: Start services with logs
docker-compose -f docker-compose.dev.yaml up

# Terminal 2: Make code changes
# Edit src/routes/users.routes.ts

# Terminal 1: Watch for automatic reload
# You should see: "🔍 File change detected. Restarting..."

# Terminal 3: Test changes
curl http://localhost:3000/api/v1/users
```

### 6.8 Database Management

#### Running Migrations

```bash
# Generate new migration
docker-compose -f docker-compose.dev.yaml exec api bun run db:generate

# Apply migrations
docker-compose -f docker-compose.dev.yaml exec api bun run db:migrate

# Check migration status
docker-compose -f docker-compose.dev.yaml exec api bun run db:check
```

#### Seeding Database

```bash
# Run seed script
docker-compose -f docker-compose.dev.yaml exec api bun run db:seed

# Reset database (drop, create, migrate, seed)
docker-compose -f docker-compose.dev.yaml exec api bun run db:reset
```

#### Database Backup

```bash
# Backup database
docker-compose -f docker-compose.dev.yaml exec postgres pg_dump -U postgres bun_elysia_paseto > backup.sql

# Restore database
cat backup.sql | docker-compose -f docker-compose.dev.yaml exec -T postgres psql -U postgres bun_elysia_paseto
```

### 6.9 Monitoring and Debugging

#### Check Service Status

```bash
# Check all services
docker-compose -f docker-compose.dev.yaml ps

# Check detailed service info
docker inspect bun-elysia-paseto-api-dev
```

#### Resource Usage

```bash
# Check resource usage
docker stats

# Check specific container
docker stats bun-elysia-paseto-api-dev
```

#### Health Checks

```bash
# Check API health
curl http://localhost:3000/health

# Check PostgreSQL health
docker-compose -f docker-compose.dev.yaml exec postgres pg_isready

# Check Redis health
docker-compose -f docker-compose.dev.yaml exec redis redis-cli ping
```

---

## 7. Integration Points

### 7.1 Environment Variable Mapping

#### Host to Container Mapping

| Host Variable              | Container Variable                   | Default Value                 | Description                  |
| -------------------------- | ------------------------------------ | ----------------------------- | ---------------------------- |
| `API_PORT`                 | `ports[0].published`                 | 3000                          | API port mapping             |
| `POSTGRES_PORT`            | `postgres.ports[0].published`        | 5432                          | PostgreSQL port mapping      |
| `REDIS_PORT`               | `redis.ports[0].published`           | 6379                          | Redis port mapping           |
| `PGADMIN_PORT`             | `pgadmin.ports[0].published`         | 5050                          | pgAdmin port mapping         |
| `REDIS_COMMANDER_PORT`     | `redis-commander.ports[0].published` | 8081                          | Redis Commander port mapping |
| `POSTGRES_USER`            | `postgres.POSTGRES_USER`             | postgres                      | PostgreSQL user              |
| `POSTGRES_PASSWORD`        | `postgres.POSTGRES_PASSWORD`         | postgres                      | PostgreSQL password          |
| `POSTGRES_DB`              | `postgres.POSTGRES_DB`               | bun_elysia_paseto             | PostgreSQL database          |
| `PASETO_LOCAL_KEY`         | `api.PASETO_LOCAL_KEY`               | -                             | PASETO local key             |
| `PASETO_PUBLIC_KEY`        | `api.PASETO_PUBLIC_KEY`              | -                             | PASETO public key            |
| `PASETO_SECRET_KEY`        | `api.PASETO_SECRET_KEY`              | -                             | PASETO secret key            |
| `PGADMIN_DEFAULT_EMAIL`    | `pgadmin.PGADMIN_DEFAULT_EMAIL`      | admin@bun-elysia-paseto.local | pgAdmin email                |
| `PGADMIN_DEFAULT_PASSWORD` | `pgadmin.PGADMIN_DEFAULT_PASSWORD`   | admin                         | pgAdmin password             |
| `REDIS_COMMANDER_USER`     | `redis-commander.HTTP_USER`          | admin                         | Redis Commander user         |
| `REDIS_COMMANDER_PASSWORD` | `redis-commander.HTTP_PASSWORD`      | admin                         | Redis Commander password     |

#### Service Internal Resolution

Services communicate using Docker's internal DNS:

| Service    | Internal Address                                                 | Purpose              |
| ---------- | ---------------------------------------------------------------- | -------------------- |
| API        | `http://api:3000`                                                | API service endpoint |
| PostgreSQL | `postgresql://postgres:postgres@postgres:5432/bun_elysia_paseto` | Database connection  |
| Redis      | `redis://redis:6379/0`                                           | Cache connection     |

### 7.2 Port Mappings

#### External Access

| Service         | Host Port | Container Port | URL                                           |
| --------------- | --------- | -------------- | --------------------------------------------- |
| API             | 3000      | 3000           | http://localhost:3000                         |
| PostgreSQL      | 5432      | 5432           | postgresql://localhost:5432/bun_elysia_paseto |
| Redis           | 6379      | 6379           | redis://localhost:6379                        |
| pgAdmin         | 5050      | 80             | http://localhost:5050                         |
| Redis Commander | 8081      | 8081           | http://localhost:8081                         |

#### Internal Communication

Services communicate internally using service names and container ports:

| From Service    | To Service | Address         |
| --------------- | ---------- | --------------- |
| API             | PostgreSQL | `postgres:5432` |
| API             | Redis      | `redis:6379`    |
| pgAdmin         | PostgreSQL | `postgres:5432` |
| Redis Commander | Redis      | `redis:6379`    |

### 7.3 Volume Mounts

#### Application Files

```yaml
# Source code (hot reload)
./src:/app/src:ro

# Environment configuration
./.env:/app/.env:ro

# Migration files
./src/database/migrations:/app/migrations:ro
```

#### Data Persistence

```yaml
# PostgreSQL data
postgres_data:/var/lib/postgresql/data

# PostgreSQL configuration
postgres_config:/etc/postgresql

# Redis data
redis_data:/data

# pgAdmin data
pgadmin_data:/var/lib/pgadmin
```

### 7.4 Network Configuration

#### Network Definition

```yaml
networks:
  app-network:
    name: bun-elysia-paseto-dev
    driver: bridge
    ipam:
      driver: default
      config:
        - subnet: 172.20.0.0/16
```

#### Service Connectivity

All services are attached to `app-network`, enabling:

- Service discovery via DNS
- Inter-service communication
- Network isolation from host
- Consistent internal addressing

### 7.5 Health Check Dependencies

#### Dependency Chain

```
redis (health check) ─┐
                      ├─→ api (health check)
postgres (health check)┘
                      │
                      ├─→ pgadmin (health check)
                      │
                      └─→ redis-commander (health check)
```

#### Startup Order

1. **postgres** starts and becomes healthy
2. **redis** starts and becomes healthy
3. **api** waits for postgres and redis, then starts
4. **pgadmin** waits for postgres, then starts
5. **redis-commander** waits for redis, then starts

---

## 8. Testing Strategy

### 8.1 Unit Testing

#### Running Unit Tests

```bash
# Run all unit tests
docker-compose -f docker-compose.dev.yaml exec api bun run test:unit

# Run with coverage
docker-compose -f docker-compose.dev.yaml exec api bun run test:coverage

# Run specific test file
docker-compose -f docker-compose.dev.yaml exec api bun test tests/unit/services/auth.service.test.ts
```

### 8.2 Integration Testing

#### Running Integration Tests

```bash
# Run all integration tests
docker-compose -f docker-compose.dev.yaml exec api bun run test:integration

# Run with specific database
docker-compose -f docker-compose.dev.yaml exec -e DATABASE_URL="..." api bun run test:integration
```

### 8.3 End-to-End Testing

#### Running E2E Tests

```bash
# Run E2E tests against running services
docker-compose -f docker-compose.dev.yaml exec api bun run test:e2e

# Run E2E tests from host
npm run test:e2e
```

### 8.4 Health Check Testing

#### API Health Check

```bash
# Basic health check
curl http://localhost:3000/health

# Detailed health check
curl http://localhost:3000/health | jq

# Health check with authentication
curl http://localhost:3000/health \
  -H "Authorization: Bearer <token>"
```

#### Database Health Check

```bash
# PostgreSQL health
docker-compose -f docker-compose.dev.yaml exec postgres pg_isready -U postgres

# Redis health
docker-compose -f docker-compose.dev.yaml exec redis redis-cli ping
```

### 8.5 Performance Testing

#### Load Testing

```bash
# Install bombardier
go install github.com/codesenberg/bombardier@latest

# Run load test
bombardier -c 10 -d 30s -l http://localhost:3000/health

# Run load test with authentication
bombardier -c 10 -d 30s -l \
  -H "Authorization: Bearer <token>" \
  http://localhost:3000/api/v1/users
```

### 8.6 Database Testing

#### Schema Validation

```bash
# Validate schema
docker-compose -f docker-compose.dev.yaml exec api bun run db:check

# Generate migration
docker-compose -f docker-compose.dev.yaml exec api bun run db:generate

# Apply migration
docker-compose -f docker-compose.dev.yaml exec api bun run db:migrate
```

### 8.7 Container Testing

#### Container Health

```bash
# Check container status
docker-compose -f docker-compose.dev.yaml ps

# Check container health
docker inspect bun-elysia-paseto-api-dev | jq '.[0].State.Health'

# Check container logs for errors
docker-compose -f docker-compose.dev.yaml logs --tail=100 api | grep -i error
```

---

## 9. Usage Examples

### 9.1 Common Development Tasks

#### Start Development Environment

```bash
# Start all services
docker-compose -f docker-compose.dev.yaml up -d

# Verify services are healthy
docker-compose -f docker-compose.dev.yaml ps

# View logs
docker-compose -f docker-compose.dev.yaml logs -f
```

#### Reset Database

```bash
# Stop services
docker-compose -f docker-compose.dev.yaml down

# Remove volumes
docker-compose -f docker-compose.dev.yaml down -v

# Start fresh
docker-compose -f docker-compose.dev.yaml up -d

# Run migrations
docker-compose -f docker-compose.dev.yaml exec api bun run db:migrate

# Seed database
docker-compose -f docker-compose.dev.yaml exec api bun run db:seed
```

#### Debug API Issues

```bash
# View API logs
docker-compose -f docker-compose.dev.yaml logs -f api

# Access API container
docker-compose -f docker-compose.dev.yaml exec api sh

# Check environment variables
docker-compose -f docker-compose.dev.yaml exec api env | grep -E 'DATABASE|REDIS|PASETO'

# Test database connection
docker-compose -f docker-compose.dev.yaml exec api bun run -e "console.log('Testing DB...')"
```

### 9.2 Database Management Examples

#### Backup Database

```bash
# Create backup
docker-compose -f docker-compose.dev.yaml exec postgres pg_dump -U postgres bun_elysia_paseto > backup_$(date +%Y%m%d_%H%M%S).sql

# Compress backup
gzip backup_$(date +%Y%m%d_%H%M%S).sql
```

#### Restore Database

```bash
# Decompress backup
gunzip backup_20240101_120000.sql.gz

# Restore database
cat backup_20240101_120000.sql | docker-compose -f docker-compose.dev.yaml exec -T postgres psql -U postgres bun_elysia_paseto
```

#### Access PostgreSQL CLI

```bash
# Access psql
docker-compose -f docker-compose.dev.yaml exec postgres psql -U postgres -d bun_elysia_paseto

# Run query from host
docker-compose -f docker-compose.dev.yaml exec postgres psql -U postgres -d bun_elysia_paseto -c "SELECT * FROM users;"

# Run SQL file
docker-compose -f docker-compose.dev.yaml exec -T postgres psql -U postgres -d bun_elysia_paseto < query.sql
```

### 9.3 Redis Management Examples

#### Access Redis CLI

```bash
# Access redis-cli
docker-compose -f docker-compose.dev.yaml exec redis redis-cli

# Monitor commands
docker-compose -f docker-compose.dev.yaml exec redis redis-cli MONITOR

# Check memory usage
docker-compose -f docker-compose.dev.yaml exec redis redis-cli INFO memory
```

#### Clear Cache

```bash
# Clear all keys
docker-compose -f docker-compose.dev.yaml exec redis redis-cli FLUSHALL

# Clear current database
docker-compose -f docker-compose.dev.yaml exec redis redis-cli FLUSHDB

# Delete specific pattern
docker-compose -f docker-compose.dev.yaml exec redis redis-cli --scan --pattern "session:*" | xargs docker-compose -f docker-compose.dev.yaml exec -T redis redis-cli DEL
```

### 9.4 Testing Examples

#### Run Full Test Suite

```bash
# Run all tests
docker-compose -f docker-compose.dev.yaml exec api bun run test

# Run with coverage
docker-compose -f docker-compose.dev.yaml exec api bun run test:coverage

# Run specific test suite
docker-compose -f docker-compose.dev.yaml exec api bun test tests/unit/services
```

#### Test API Endpoints

```bash
# Register user
curl -X POST http://localhost:3000/api/v1/auth/register \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"SecurePassword123"}'

# Login
curl -X POST http://localhost:3000/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"SecurePassword123"}'

# Access protected endpoint
curl http://localhost:3000/api/v1/users \
  -H "Authorization: Bearer <token>"
```

### 9.5 Troubleshooting Examples

#### Container Won't Start

```bash
# Check logs
docker-compose -f docker-compose.dev.yaml logs api

# Check container status
docker-compose -f docker-compose.dev.yaml ps

# Inspect container
docker inspect bun-elysia-paseto-api-dev

# Restart service
docker-compose -f docker-compose.dev.yaml restart api
```

#### Database Connection Issues

```bash
# Check PostgreSQL logs
docker-compose -f docker-compose.dev.yaml logs postgres

# Verify PostgreSQL is running
docker-compose -f docker-compose.dev.yaml exec postgres pg_isready

# Test connection from API container
docker-compose -f docker-compose.dev.yaml exec api sh -c "nc -zv postgres 5432"

# Check environment variables
docker-compose -f docker-compose.dev.yaml exec api env | grep DATABASE
```

#### Hot Reload Not Working

```bash
# Verify volume mount
docker inspect bun-elysia-paseto-api-dev | jq '.[0].Mounts'

# Check file permissions
ls -la src/

# Restart API service
docker-compose -f docker-compose.dev.yaml restart api

# View API logs for reload events
docker-compose -f docker-compose.dev.yaml logs -f api | grep -i reload
```

---

## 10. Troubleshooting

### 10.1 Common Issues

#### Issue: Containers won't start

**Symptoms:**

- `docker-compose up` fails
- Containers exit immediately
- Error messages about port conflicts

**Solutions:**

1. **Check port conflicts:**

```bash
# Check what's using the ports
lsof -i :3000
lsof -i :5432
lsof -i :6379

# Change ports in .env
API_PORT=3001
POSTGRES_PORT=5433
REDIS_PORT=6380
```

2. **Remove old containers:**

```bash
docker-compose -f docker-compose.dev.yaml down -v --remove-orphans
docker system prune -a
```

3. **Check Docker daemon:**

```bash
docker info
docker version
```

#### Issue: Hot reload not working

**Symptoms:**

- Code changes don't trigger restart
- Changes don't appear in running container
- Bun watch mode not detecting changes

**Solutions:**

1. **Verify volume mount:**

```bash
docker inspect bun-elysia-paseto-api-dev | jq '.[0].Mounts'
```

Expected output should include:

```json
{
  "Source": "/path/to/project/src",
  "Destination": "/app/src",
  "Mode": "ro",
  "RW": false
}
```

2. **Check file permissions:**

```bash
ls -la src/
```

3. **Restart container:**

```bash
docker-compose -f docker-compose.dev.yaml restart api
```

4. **Check Bun watch mode logs:**

```bash
docker-compose -f docker-compose.dev.yaml logs -f api | grep -i "watch\|reload"
```

#### Issue: Database connection refused

**Symptoms:**

- API can't connect to PostgreSQL
- "Connection refused" errors
- Health checks failing

**Solutions:**

1. **Verify PostgreSQL is healthy:**

```bash
docker-compose -f docker-compose.dev.yaml ps postgres
docker-compose -f docker-compose.dev.yaml logs postgres
```

2. **Test connection:**

```bash
docker-compose -f docker-compose.dev.yaml exec api sh -c "nc -zv postgres 5432"
```

3. **Check environment variables:**

```bash
docker-compose -f docker-compose.dev.yaml exec api env | grep DATABASE
```

4. **Verify network:**

```bash
docker network inspect bun-elysia-paseto-dev
```

5. **Reset database:**

```bash
docker-compose -f docker-compose.dev.yaml down -v
docker-compose -f docker-compose.dev.yaml up -d
```

#### Issue: Redis connection problems

**Symptoms:**

- API can't connect to Redis
- Session storage failing
- Caching not working

**Solutions:**

1. **Verify Redis is healthy:**

```bash
docker-compose -f docker-compose.dev.yaml ps redis
docker-compose -f docker-compose.dev.yaml logs redis
```

2. **Test connection:**

```bash
docker-compose -f docker-compose.dev.yaml exec api sh -c "nc -zv redis 6379"
```

3. **Check Redis from container:**

```bash
docker-compose -f docker-compose.dev.yaml exec redis redis-cli ping
```

4. **Verify configuration:**

```bash
docker-compose -f docker-compose.dev.yaml exec api env | grep REDIS
```

#### Issue: pgAdmin can't connect to PostgreSQL

**Symptoms:**

- pgAdmin shows connection error
- "Server not reachable" message
- Can't register server

**Solutions:**

1. **Use internal hostname:**
   - Host: `postgres` (not localhost)
   - Port: `5432`
   - Database: `bun_elysia_paseto`
   - Username: `postgres`
   - Password: `postgres`

2. **Verify both services are running:**

```bash
docker-compose -f docker-compose.dev.yaml ps postgres pgadmin
```

3. **Test connection from pgAdmin container:**

```bash
docker-compose -f docker-compose.dev.yaml exec pgadmin sh -c "nc -zv postgres 5432"
```

#### Issue: Out of memory errors

**Symptoms:**

- Containers killed unexpectedly
- OOM errors in logs
- System slow down

**Solutions:**

1. **Check resource usage:**

```bash
docker stats
```

2. **Limit container resources:**

```yaml
services:
  api:
    deploy:
      resources:
        limits:
          memory: 512M
        reservations:
          memory: 256M
```

3. **Reduce PostgreSQL memory:**

```yaml
services:
  postgres:
    command: >
      postgres
        -c shared_buffers=128MB
        -c effective_cache_size=512MB
```

4. **Reduce Redis memory:**

```yaml
services:
  redis:
    command: >
      redis-server
        --maxmemory 128mb
```

5. **Free up disk space:**

```bash
docker system prune -a
docker volume prune
```

### 10.2 Diagnostic Commands

#### Container Health

```bash
# Check all container status
docker-compose -f docker-compose.dev.yaml ps

# Check detailed health
docker inspect bun-elysia-paseto-api-dev | jq '.[0].State.Health'

# Check resource usage
docker stats --no-stream
```

#### Network Issues

```bash
# Test DNS resolution
docker-compose -f docker-compose.dev.yaml exec api nslookup postgres

# Test connectivity
docker-compose -f docker-compose.dev.yaml exec api sh -c "nc -zv postgres 5432"

# Check network
docker network inspect bun-elysia-paseto-dev
```

#### Volume Issues

```bash
# List volumes
docker volume ls

# Inspect volume
docker volume inspect bun-elysia-paseto-postgres-data

# Check disk usage
docker system df
```

#### Log Analysis

```bash
# Recent errors
docker-compose -f docker-compose.dev.yaml logs --tail=100 | grep -i error

# All errors
docker-compose -f docker-compose.dev.yaml logs | grep -i error

# Warnings
docker-compose -f docker-compose.dev.yaml logs | grep -i warn

# Specific service
docker-compose -f docker-compose.dev.yaml logs --tail=100 api
```

### 10.3 Recovery Procedures

#### Complete Reset

```bash
# Stop all services
docker-compose -f docker-compose.dev.yaml down

# Remove volumes (DELETES ALL DATA)
docker-compose -f docker-compose.dev.yaml down -v

# Remove orphaned containers
docker-compose -f docker-compose.dev.yaml down --remove-orphans

# Clean up Docker system
docker system prune -a

# Restart
docker-compose -f docker-compose.dev.yaml up -d

# Run migrations
docker-compose -f docker-compose.dev.yaml exec api bun run db:migrate

# Seed database
docker-compose -f docker-compose.dev.yaml exec api bun run db:seed
```

#### Partial Reset

```bash
# Reset specific service
docker-compose -f docker-compose.dev.yaml stop postgres
docker-compose -f docker-compose.dev.yaml rm -f postgres
docker volume rm bun-elysia-paseto-postgres-data
docker-compose -f docker-compose.dev.yaml up -d postgres
```

---

## 11. Success Criteria

### 11.1 Functional Requirements

- [x] All services start successfully with `docker-compose up -d`
- [x] API service responds to HTTP requests on port 3000
- [x] PostgreSQL accepts connections on port 5432
- [x] Redis accepts connections on port 6379
- [x] pgAdmin accessible on port 5050
- [x] Redis Commander accessible on port 8081
- [x] Hot reload works for source code changes
- [x] Environment variables are properly loaded
- [x] Database migrations execute successfully
- [x] Health checks pass for all services
- [x] Data persists across container restarts
- [x] Services can communicate via internal DNS
- [x] Volume mounts work correctly
- [x] Logs are accessible via docker-compose logs

### 11.2 Performance Requirements

- [x] API responds to health check within 5 seconds
- [x] PostgreSQL becomes healthy within 30 seconds
- [x] Redis becomes healthy within 20 seconds
- [x] Hot reload triggers within 2 seconds of file change
- [x] Container startup time under 60 seconds
- [x] Memory usage within defined limits
- [x] No significant CPU overhead from Docker

### 11.3 Developer Experience Requirements

- [x] Single command to start all services
- [x] Single command to stop all services
- [x] Easy access to logs
- [x] Easy access to database management tools
- [x] Clear error messages
- [x] Helpful documentation
- [x] No complex configuration required
- [x] Works out of the box with .env.example

### 11.4 Security Requirements

- [x] Services run as non-root user where possible
- [x] Source files mounted as read-only
- [x] Default passwords are changeable
- [x] No sensitive data in docker-compose.yaml
- [x] Network isolation via custom network
- [x] Minimal attack surface

### 11.5 Reliability Requirements

- [x] Services restart on failure (unless-stopped)
- [x] Health checks detect unhealthy services
- [x] Dependencies are correctly ordered
- [x] Graceful shutdown on SIGTERM
- [x] No data loss on container restart
- [x] Proper volume cleanup

### 11.6 Compatibility Requirements

- [x] Works on macOS with Docker Desktop
- [x] Works on Linux with Docker Engine
- [x] Works on Windows with Docker Desktop
- [x] Compatible with Docker Compose v2
- [x] Works with existing project structure
- [x] No breaking changes to existing workflows

---

## 12. Security Considerations

### 12.1 Container Security

#### Non-Root User

API service runs as non-root user:

```dockerfile
RUN addgroup -g 1001 -S bun && \
    adduser -S -u 1001 -G bun bun
USER bun
```

#### Read-Only Mounts

Source files mounted as read-only:

```yaml
volumes:
  - ./src:/app/src:ro
  - ./.env:/app/.env:ro
```

#### Minimal Base Images

Using Alpine-based images:

- `oven/bun:1.0.0-alpine`
- `postgres:16-alpine`
- `redis:7-alpine`

### 12.2 Network Security

#### Isolated Network

Services communicate on isolated bridge network:

```yaml
networks:
  app-network:
    name: bun-elysia-paseto-dev
    driver: bridge
```

#### Service Discovery

Internal DNS for service-to-service communication:

- No need to expose internal ports
- Services can't be accessed from outside without port mapping

### 12.3 Secrets Management

#### Environment Variables

Sensitive data in `.env` file (not committed to git):

```bash
# .env
PASETO_LOCAL_KEY=k4.local.xxx
PASETO_PUBLIC_KEY=k4.public.xxx
PASETO_SECRET_KEY=k4.secret.xxx
POSTGRES_PASSWORD=postgres
```

#### Default Credentials

Development credentials should be changed:

```bash
# Default (change these!)
PGADMIN_DEFAULT_EMAIL=admin@bun-elysia-paseto.local
PGADMIN_DEFAULT_PASSWORD=admin
REDIS_COMMANDER_USER=admin
REDIS_COMMANDER_PASSWORD=admin
```

### 12.4 Volume Security

#### Persistent Data

Data volumes persist on host:

```yaml
volumes:
  postgres_data:
    name: bun-elysia-paseto-postgres-data
```

#### Backup Strategy

Regular backups recommended:

```bash
# Backup script
docker-compose exec postgres pg_dump -U postgres bun_elysia_paseto > backup.sql
```

### 12.5 Production Considerations

This configuration is for development only. For production:

1. Use separate docker-compose.prod.yaml
2. Change all default passwords
3. Use Docker secrets for sensitive data
4. Enable SSL/TLS for all connections
5. Implement proper logging and monitoring
6. Use multi-stage builds for smaller images
7. Scan images for vulnerabilities
8. Implement resource limits
9. Use orchestration (Kubernetes) for scale
10. Implement proper CI/CD pipeline

---

## 13. Performance Considerations

### 13.1 Resource Optimization

#### Memory Limits

Configure resource limits to prevent OOM:

```yaml
services:
  api:
    deploy:
      resources:
        limits:
          memory: 512M
        reservations:
          memory: 256M
```

#### PostgreSQL Tuning

Optimized for development (adjust for production):

```yaml
command: >
  postgres
    -c shared_buffers=256MB
    -c effective_cache_size=1GB
    -c max_connections=200
```

#### Redis Memory

Limited to 256MB with LRU eviction:

```yaml
command: >
  redis-server
    --maxmemory 256mb
    --maxmemory-policy allkeys-lru
```

### 13.2 Build Optimization

#### Layer Caching

Optimized Dockerfile for fast rebuilds:

```dockerfile
# Separate dependencies layer
FROM base AS dependencies
COPY package.json bun.lockb* ./
RUN bun install --frozen-lockfile

# Copy source in separate layer
FROM base AS development
COPY --from=dependencies /app/node_modules ./node_modules
COPY . .
```

#### .dockerignore

Exclude unnecessary files:

```
node_modules/
.env
tests/
docs/
```

### 13.3 Hot Reload Performance

#### Volume Mounts

Use read-only mounts for better performance:

```yaml
volumes:
  - ./src:/app/src:ro
```

#### File Watching

Bun's native watch mode is efficient:

```bash
bun run --watch src/server.ts
```

### 13.4 Network Performance

#### DNS Resolution

Internal DNS for faster service discovery:

```yaml
# Services resolve each other by name
DATABASE_URL=postgresql://postgres:5432/bun_elysia_paseto
```

#### Connection Pooling

Database connection pooling configured:

```bash
DATABASE_POOL_MIN=2
DATABASE_POOL_MAX=10
```

### 13.5 Startup Performance

#### Health Checks

Optimized health check intervals:

```yaml
healthcheck:
  interval: 30s
  timeout: 5s
  retries: 3
  start_period: 40s
```

#### Dependency Management

Parallel startup where possible:

```yaml
depends_on:
  postgres:
    condition: service_healthy
  redis:
    condition: service_healthy
```

---

## 14. Future Enhancements

### 14.1 Planned Features

#### Production Configuration

- `docker-compose.prod.yaml` with production optimizations
- Multi-stage builds for smaller images
- SSL/TLS configuration
- Security scanning in CI/CD
- Resource limits and quotas
- Health check probes for Kubernetes

#### Development Tools

- Mailhog for email testing
- MinIO for S3-compatible storage
- Grafana + Prometheus for monitoring
- Jaeger for distributed tracing
- Adminer for database management

#### CI/CD Integration

- Docker Compose in GitHub Actions
- Automated testing in containers
- Image building and pushing
- Deployment automation

#### Developer Experience

- VS Code dev container configuration
- JetBrains remote development support
- Docker Compose profiles for different scenarios
- One-command setup script

### 14.2 Advanced Features

#### Service Mesh

- Service discovery
- Load balancing
- Circuit breakers
- Rate limiting

#### Observability

- Structured logging
- Metrics collection
- Distributed tracing
- Alerting

#### Security

- Secret management
- Certificate rotation
- Network policies
- Runtime security

### 14.3 Scalability

#### Horizontal Scaling

- Multiple API instances
- Load balancing
- Session affinity
- Shared session storage

#### Database Scaling

- Read replicas
- Connection pooling
- Query optimization
- Caching layer

---

## Appendix A: Quick Reference

### A.1 Common Commands

```bash
# Start services
docker-compose -f docker-compose.dev.yaml up -d

# Stop services
docker-compose -f docker-compose.dev.yaml down

# View logs
docker-compose -f docker-compose.dev.yaml logs -f

# Restart service
docker-compose -f docker-compose.dev.yaml restart api

# Execute command
docker-compose -f docker-compose.dev.yaml exec api sh

# Remove volumes
docker-compose -f docker-compose.dev.yaml down -v

# Rebuild image
docker-compose -f docker-compose.dev.yaml build api
```

### A.2 URLs

| Service         | URL                           |
| --------------- | ----------------------------- |
| API             | http://localhost:3000         |
| Swagger         | http://localhost:3000/swagger |
| Health          | http://localhost:3000/health  |
| pgAdmin         | http://localhost:5050         |
| Redis Commander | http://localhost:8081         |

### A.3 Default Credentials

| Service         | Username                      | Password |
| --------------- | ----------------------------- | -------- |
| PostgreSQL      | postgres                      | postgres |
| pgAdmin         | admin@bun-elysia-paseto.local | admin    |
| Redis Commander | admin                         | admin    |

### A.4 Environment Variables

```bash
# Ports
API_PORT=3000
POSTGRES_PORT=5432
REDIS_PORT=6379
PGADMIN_PORT=5050
REDIS_COMMANDER_PORT=8081

# Database
POSTGRES_USER=postgres
POSTGRES_PASSWORD=postgres
POSTGRES_DB=bun_elysia_paseto

# PASETO
PASETO_LOCAL_KEY=k4.local.xxx
PASETO_PUBLIC_KEY=k4.public.xxx
PASETO_SECRET_KEY=k4.secret.xxx

# Management
PGADMIN_DEFAULT_EMAIL=admin@bun-elysia-paseto.local
PGADMIN_DEFAULT_PASSWORD=admin
REDIS_COMMANDER_USER=admin
REDIS_COMMANDER_PASSWORD=admin
```

---

## Appendix B: Troubleshooting Checklist

- [ ] Docker daemon is running
- [ ] No port conflicts on host
- [ ] .env file exists and is configured
- [ ] PASETO keys are generated
- [ ] Volumes are created
- [ ] Network is created
- [ ] All containers are running
- [ ] Health checks are passing
- [ ] Environment variables are correct
- [ ] Volume mounts are working
- [ ] DNS resolution works
- [ ] Sufficient disk space
- [ ] Sufficient memory
- [ ] No firewall blocking connections
- [ ] Docker Compose version is compatible

---

## Appendix C: Change Log

| Date       | Version | Changes                 |
| ---------- | ------- | ----------------------- |
| 2026-03-13 | 1.0.0   | Initial design document |

---

## Document Metadata

- **Author**: Development Team
- **Last Updated**: 2026-03-13
- **Version**: 1.0.0
- **Status**: Design
- **Review Date**: 2026-04-13
