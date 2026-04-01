# Infrastructure

This folder is reserved for future cloud infrastructure configurations (Terraform, Kubernetes, AWS/GCP/Azure resources, etc.).

## Docker Configuration Moved

All Docker-related configuration has been centralized in the `docker/` folder for better organization.

**New Location:** [`../docker/`](../docker/)

```
docker/
├── compose/                    # Docker Compose files
│   ├── docker-compose.dev.yaml
│   ├── docker-compose.prod.yaml
│   └── docker-compose.observability.yaml
├── dockerfiles/                # Dockerfiles
├── configs/                    # Configuration files
│   ├── nginx/
│   ├── postgres/
│   ├── prometheus/
│   └── grafana/
└── scripts/                    # Utility scripts
```

## Quick Commands

All Docker commands are now available as npm scripts:

```bash
# Development
bun run dev:docker          # Start dev stack
bun run dev:docker:stop     # Stop dev stack
bun run dev:docker:clean    # Clean volumes

# Production
bun run prod:docker         # Start prod stack
bun run prod:docker:stop    # Stop prod stack

# Observability
bun run observability:up    # Start observability stack
bun run observability:down  # Stop observability stack
```

See [`../docker/README.md`](../docker/README.md) for full documentation.

## Future Infrastructure

This `infra/` folder can be used for:

- **Terraform** - Cloud resource provisioning
- **Kubernetes** - K8s manifests and Helm charts
- **CI/CD** - GitHub Actions, GitLab CI workflows
- **Cloud-specific** - AWS CloudFormation, GCP Deployment Manager
