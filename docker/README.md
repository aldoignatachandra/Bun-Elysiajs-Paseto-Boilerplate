# Docker Configuration

This folder contains all Docker-related configuration for the Bun Elysia PASETO boilerplate, following a centralized and organized structure.

## Folder Structure

```
docker/
├── compose/                    # Docker Compose files
│   ├── docker-compose.dev.yaml     # Development stack
│   ├── docker-compose.prod.yaml    # Production stack
│   └── docker-compose.observability.yaml  # Observability stack (optional)
│
├── dockerfiles/                # Dockerfiles
│   ├── Dockerfile.dev              # Development image
│   └── Dockerfile.prod             # Production image
│
├── configs/                     # Configuration files
│   ├── nginx/
│   │   └── nginx.conf              # Nginx reverse proxy config
│   ├── postgres/
│   │   └── init-db.sh              # PostgreSQL initialization script
│   ├── prometheus/
│   │   ├── prometheus.yml          # Prometheus configuration
│   │   ├── alerting-rules.yml      # Alerting rules
│   │   └── recording-rules.yml     # Recording rules
│   └── grafana/
│       └── provisioning/           # Grafana auto-provisioning
│           ├── datasources/
│           │   └── datasources.yml
│           └── dashboards/
│               ├── dashboards.yml
│               └── dashboards/
│                   ├── api-overview.json
│                   └── infrastructure.json
│
└── scripts/                     # Utility scripts
    └── deployment.sh               # Production deployment helper
```

## Quick Start

### Development Environment

```bash
# Start all development services (API, PostgreSQL, Redis, pgAdmin, Redis Commander)
bun run dev:docker

# Or in detached mode
bun run dev:docker:detached

# View API logs
bun run dev:docker:logs

# Stop services
bun run dev:docker:stop

# Stop and remove volumes (clean slate)
bun run dev:docker:clean
```

**Services:**
| Service | Port | Purpose |
|---------|------|---------|
| API | 3000 | Bun Elysia application |
| PostgreSQL | 5432 | Primary database |
| Redis | 6379 | Cache & rate limiting |
| pgAdmin | 5050 | Database management UI |
| Redis Commander | 8081 | Redis management UI |

### Production Environment

```bash
# Start production stack
bun run prod:docker

# View logs
bun run prod:docker:logs

# Stop services
bun run prod:docker:stop
```

**Services:**
| Service | Port | Purpose |
|---------|------|---------|
| API | 3000 | Bun Elysia application |
| PostgreSQL | 5432 | Primary database |
| Redis | 6379 | Cache & rate limiting |
| Nginx | 80 | Reverse proxy |

### Observability Stack (Optional)

```bash
# Start observability services (Prometheus, Grafana, Jaeger)
bun run observability:up

# View logs
bun run observability:logs

# Stop services
bun run observability:down
```

**Services:**
| Service | Port | Purpose |
|---------|------|---------|
| Prometheus | 9090 | Metrics collection |
| Grafana | 3001 | Visualization dashboards |
| Jaeger UI | 16686 | Distributed tracing |
| OTLP gRPC | 4317 | OpenTelemetry receiver |
| OTLP HTTP | 4318 | OpenTelemetry receiver |

### Combined: Dev + Observability

```bash
# Start both development and observability stacks
docker-compose -f docker/compose/docker-compose.dev.yaml \
               -f docker/compose/docker-compose.observability.yaml up -d

# Enable OpenTelemetry in the API
OTEL_ENABLED=true bun run dev:docker
```

## Environment Variables

### Required Variables

Create a `.env` file in the project root with:

```bash
# Database
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/bun_elysia_paseto
POSTGRES_USER=postgres
POSTGRES_PASSWORD=postgres
POSTGRES_DB=bun_elysia_paseto

# Redis
REDIS_HOST=localhost
REDIS_PORT=6379

# PASETO Keys (generate with: bun run generate:paseto-keys)
PASETO_LOCAL_KEY=k4.local.xxx
PASETO_PUBLIC_KEY=k4.public.xxx
PASETO_SECRET_KEY=k4.secret.xxx
```

### Optional: Observability

```bash
# OpenTelemetry
OTEL_ENABLED=false                    # Set to true to enable tracing
OTEL_SERVICE_NAME=bun-elysia-api
OTEL_EXPORTER_OTLP_ENDPOINT=http://localhost:4318
OTEL_SAMPLE_RATE=1.0

# Ports (change if you have conflicts)
PROMETHEUS_PORT=9090
GRAFANA_PORT=3001
JAEGER_UI_PORT=16686
```

## Service Access

### Development

- **API**: http://localhost:3000
- **API Docs (Swagger)**: http://localhost:3000/swagger
- **Health Check**: http://localhost:3000/health
- **Metrics**: http://localhost:3000/metrics
- **pgAdmin**: http://localhost:5050 (admin@local / admin)
- **Redis Commander**: http://localhost:8081 (admin / admin)

### Observability

- **Prometheus**: http://localhost:9090
- **Grafana**: http://localhost:3001 (admin / admin)
- **Jaeger UI**: http://localhost:16686

## Dockerfiles

### Development (`Dockerfile.dev`)

- Base: `oven/bun:1`
- Hot reload enabled via `--watch`
- Source mounted as read-only volume
- Optimized for fast iteration

### Production (`Dockerfile.prod`)

- Base: `oven/bun:1-slim`
- Multi-stage build for smaller image
- No dev dependencies
- Health check included
- Optimized for performance

## Configuration Files

### Prometheus (`configs/prometheus/`)

- `prometheus.yml` - Scrape configuration
- `alerting-rules.yml` - Alert definitions
- `recording-rules.yml` - Pre-computed queries

### Grafana (`configs/grafana/`)

- Auto-provisioned datasources
- Pre-built dashboards:
  - API Overview (RED metrics)
  - Infrastructure (DB, Redis)

### Nginx (`configs/nginx/`)

- Reverse proxy configuration
- Rate limiting
- Security headers
- Gzip compression

## Troubleshooting

### Port Conflicts

If you get port conflicts, change the ports in your `.env`:

```bash
API_PORT=3001
POSTGRES_PORT=5433
REDIS_PORT=6380
PROMETHEUS_PORT=9091
GRAFANA_PORT=3002
```

### Database Connection Issues

```bash
# Check PostgreSQL is running
docker-compose -f docker/compose/docker-compose.dev.yaml ps postgres

# View PostgreSQL logs
docker-compose -f docker/compose/docker-compose.dev.yaml logs postgres

# Test connection
docker-compose -f docker/compose/docker-compose.dev.yaml exec postgres pg_isready
```

### Redis Connection Issues

```bash
# Check Redis is running
docker-compose -f docker/compose/docker-compose.dev.yaml ps redis

# Test connection
docker-compose -f docker/compose/docker-compose.dev.yaml exec redis redis-cli ping
```

### Reset Everything

```bash
# Stop and remove all containers, networks, and volumes
docker-compose -f docker/compose/docker-compose.dev.yaml down -v
docker-compose -f docker/compose/docker-compose.observability.yaml down -v

# Remove images (optional)
docker image prune -f
```

## Best Practices

1. **Development**: Use `dev:docker` for local development with hot reload
2. **Production**: Use `prod:docker` with proper environment variables
3. **Observability**: Only enable when needed (resource intensive)
4. **Secrets**: Never commit `.env` files - use `.env.example` as template
5. **Clean Up**: Regularly run `docker system prune` to free disk space

## Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                        Docker Network                           │
│                     (bun-elysia-paseto-dev)                     │
│                                                                 │
│  ┌─────────┐  ┌───────────┐  ┌───────┐  ┌─────────┐            │
│  │   API   │  │ PostgreSQL│  │ Redis │  │ pgAdmin │            │
│  │  :3000  │  │   :5432   │  │ :6379 │  │  :5050  │            │
│  └────┬────┘  └─────┬─────┘  └───┬───┘  └─────────┘            │
│       │             │            │                              │
│       └─────────────┴────────────┘                              │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────┐
│                   Observability Network                         │
│                  (bun-elysia-observability)                     │
│                                                                 │
│  ┌───────────┐  ┌─────────┐  ┌────────┐                         │
│  │ Prometheus│  │ Grafana │  │ Jaeger │                         │
│  │   :9090   │  │  :3001  │  │ :16686 │                         │
│  └─────┬─────┘  └────┬────┘  └────┬───┘                         │
│        │             │            │                              │
│        └─────────────┴────────────┘                              │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

## Related Documentation

- [Hot Reload Configuration](../docs/standardization/HOT_RELOAD.md)
- [Docker Development Environment Design](../docs/plans/2026-03-13-docker-development-environment-design.md)
- [Observability Stack Design](../docs/plans/2026-04-01-observability-stack-design.md)
