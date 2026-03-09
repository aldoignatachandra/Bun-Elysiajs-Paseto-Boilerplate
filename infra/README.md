# Production Deployment Configuration

This directory contains production deployment configurations for the Bun Elysia PASETO Boilerplate project.

## Directory Structure

```
infra/
├── docker/
│   └── production.dockerfile    # Multi-stage Docker build for production
├── kubernetes/
│   ├── deployment.yaml           # Kubernetes Deployment configuration
│   ├── service.yaml              # Kubernetes Service configuration
│   ├── configmap.yaml            # ConfigMap for application configuration
│   ├── secret.yaml               # Secret template for sensitive data
│   ├── ingress.yaml              # Ingress configuration for external access
│   ├── hpa.yaml                  # Horizontal Pod Autoscaler configuration
│   └── poddisruptionbudget.yaml  # Pod Disruption Budget for high availability
├── nginx/
│   └── nginx.conf                # Nginx reverse proxy configuration
├── docker-compose.prod.yaml      # Docker Compose for production testing
└── deployment.sh                 # Automated deployment script
```

## Prerequisites

- Docker 20.10+
- Kubernetes 1.24+
- kubectl configured with cluster access
- Container registry (e.g., Docker Hub, GHCR, ECR)

## Quick Start

### Local Testing with Docker Compose

1. **Generate PASETO keys:**

   ```bash
   bun run generate:paseto-keys
   ```

2. **Set environment variables:**

   ```bash
   export PASETO_LOCAL_KEY="your-local-key"
   export PASETO_PUBLIC_KEY="your-public-key"
   export PASETO_SECRET_KEY="your-secret-key"
   ```

3. **Start services:**

   ```bash
   cd infra
   docker-compose -f docker-compose.prod.yaml up -d
   ```

4. **Check status:**
   ```bash
   docker-compose -f docker-compose.prod.yaml ps
   curl http://localhost:3000/health
   ```

### Kubernetes Deployment

1. **Build and push Docker image:**

   ```bash
   docker build -f infra/docker/production.dockerfile -t your-registry/bun-elysia-paseto-api:latest .
   docker push your-registry/bun-elysia-paseto-api:latest
   ```

2. **Update secret.yaml with actual values:**

   ```bash
   # Edit infra/kubernetes/secret.yaml with your actual credentials and keys
   ```

3. **Apply Kubernetes manifests:**

   ```bash
   kubectl apply -f infra/kubernetes/configmap.yaml
   kubectl apply -f infra/kubernetes/secret.yaml
   kubectl apply -f infra/kubernetes/deployment.yaml
   kubectl apply -f infra/kubernetes/service.yaml
   kubectl apply -f infra/kubernetes/hpa.yaml
   kubectl apply -f infra/kubernetes/poddisruptionbudget.yaml
   ```

4. **Optional: Configure Ingress:**
   ```bash
   kubectl apply -f infra/kubernetes/ingress.yaml
   ```

### Automated Deployment

Use the provided deployment script for automated building and deployment:

```bash
./infra/deployment.sh <image-name> <tag> <registry> <namespace>
```

Example:

```bash
./infra/deployment.sh bun-elysia-paseto-api v1.0.0 docker.io/my-org default
```

## Configuration

### Environment Variables

See `.env.example` for all available environment variables. Key variables include:

- `NODE_ENV`: Set to `production` for production deployments
- `PORT`: Application port (default: 3000)
- `DATABASE_URL`: PostgreSQL connection string
- `REDIS_HOST`: Redis server hostname
- `PASETO_LOCAL_KEY`: PASETO v4.local symmetric key
- `PASETO_PUBLIC_KEY`: PASETO v4.public public key
- `PASETO_SECRET_KEY`: PASETO v4.public secret key

### Resource Limits

Default resource limits configured in deployment.yaml:

- **Requests:** 250m CPU, 256Mi memory
- **Limits:** 500m CPU, 512Mi memory

Adjust these based on your workload requirements.

### Autoscaling

The HorizontalPodAutoscaler is configured to:

- Scale between 3-10 replicas
- Target 70% CPU utilization
- Target 80% memory utilization

Modify `infra/kubernetes/hpa.yaml` to adjust scaling behavior.

## Health Checks

The application exposes a `/health` endpoint that is used by:

- Docker HEALTHCHECK
- Kubernetes liveness and readiness probes
- Nginx health checks

## Monitoring

The application exposes Prometheus metrics at `/metrics`:

- Request/response metrics
- Database performance metrics
- Cache performance metrics
- Custom business metrics

Ensure Prometheus is configured to scrape these metrics using the annotations in deployment.yaml.

## Security Considerations

1. **Secrets Management:**
   - Never commit actual secrets to version control
   - Use proper secret management (e.g., Kubernetes Secrets, AWS Secrets Manager)
   - Rotate credentials regularly

2. **Network Security:**
   - Configure network policies to restrict pod-to-pod communication
   - Use TLS for all external connections
   - Enable RBAC for Kubernetes API access

3. **Container Security:**
   - Run as non-root user (UID 1000)
   - Use read-only root filesystem where possible
   - Keep images updated with security patches
   - Scan images for vulnerabilities

4. **Runtime Security:**
   - Enable seccomp profiles
   - Drop all capabilities
   - Disable privilege escalation

## Troubleshooting

### Check pod status:

```bash
kubectl get pods -l app=bun-elysia-paseto-api
kubectl describe pod <pod-name>
```

### View logs:

```bash
kubectl logs -l app=bun-elysia-paseto-api --tail=100 -f
```

### Port forward to local:

```bash
kubectl port-forward svc/bun-elysia-paseto-api 3000:80
```

### Check events:

```bash
kubectl get events --sort-by='.lastTimestamp'
```

## Production Checklist

- [ ] Generate and securely store PASETO keys
- [ ] Configure production database connection
- [ ] Set up Redis cluster for caching
- [ ] Configure container registry access
- [ ] Update secret.yaml with actual values
- [ ] Set up monitoring and alerting
- [ ] Configure log aggregation
- [ ] Set up backup strategy
- [ ] Configure disaster recovery
- [ ] Load test the application
- [ ] Set up CI/CD pipeline
- [ ] Configure SSL/TLS certificates
- [ ] Set up ingress/routing
- [ ] Configure rate limiting
- [ ] Enable audit logging
- [ ] Review and adjust resource limits
- [ ] Set up health check monitoring
- [ ] Configure autoscaling rules
- [ ] Document runbooks for common issues
- [ ] Train operations team

## Maintenance

### Rolling Updates

To perform a rolling update:

```bash
kubectl set image deployment/bun-elysia-paseto-api \
  api=your-registry/bun-elysia-paseto-api:new-version
```

### Rollback

To rollback to a previous version:

```bash
kubectl rollout undo deployment/bun-elysia-paseto-api
```

### Scaling

Manual scaling:

```bash
kubectl scale deployment/bun-elysia-paseto-api --replicas=5
```

## Support

For issues or questions about deployment, please refer to the main project documentation.
