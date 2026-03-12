# Infrastructure (Docker-Only)

This project is currently Docker-focused. Kubernetes manifests are intentionally removed for now to keep the boilerplate lean.

## Directory Structure

```text
infra/
├── docker/
│   └── production.dockerfile
├── nginx/
│   └── nginx.conf
├── docker-compose.prod.yaml
└── deployment.sh
```

## Prerequisites

- Docker 20.10+
- Docker Compose v2+

## Local Production-Like Run

```bash
bun run generate:paseto-keys
cd infra
docker compose -f docker-compose.prod.yaml up -d
curl http://localhost:3000/health
```

## Build + Optional Push

```bash
./infra/deployment.sh <image-name> <tag> <registry>
```

Example:

```bash
./infra/deployment.sh bun-elysia-paseto-api v1.0.0 docker.io/my-org
```

If you want the script to also start compose after build:

```bash
RUN_COMPOSE=true ./infra/deployment.sh bun-elysia-paseto-api latest
```
