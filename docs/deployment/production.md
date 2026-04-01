# Production Deployment Guide

This guide covers deploying the Bun Elysia PASETO Boilerplate to production environments, including Docker, Kubernetes, and various cloud providers.

## Table of Contents

- [Prerequisites](#prerequisites)
- [Pre-Deployment Checklist](#pre-deployment-checklist)
- [Environment Configuration](#environment-configuration)
- [Docker Deployment](#docker-deployment)
- [Kubernetes Deployment](#kubernetes-deployment)
- [Cloud Provider Guides](#cloud-provider-guides)
- [Security Best Practices](#security-best-practices)
- [Monitoring Setup](#monitoring-setup)
- [Performance Optimization](#performance-optimization)
- [Troubleshooting](#troubleshooting)

## Prerequisites

Before deploying to production, ensure you have:

- **Infrastructure:**
  - PostgreSQL 16+ database
  - Redis 7.2+ instance
  - Container registry access (Docker Hub, GHCR, ECR, GCR, etc.)
  - Domain name with DNS configured

- **Tools:**
  - Docker 20.10+
  - kubectl (for Kubernetes)
  - helm (optional, for Helm charts)

- **Security:**
  - Generated PASETO keys
  - SSL/TLS certificates
  - Secrets management solution

## Pre-Deployment Checklist

Complete these items before deploying:

- [ ] **Security**
  - [ ] Generate strong PASETO keys using `bun run generate:paseto-keys`
  - [ ] Store PASETO_SECRET_KEY securely (never commit to git)
  - [ ] Set up SSL/TLS certificates
  - [ ] Configure strong database passwords
  - [ ] Set up Redis password
  - [ ] Review and update CORS origins

- [ ] **Configuration**
  - [ ] Set NODE_ENV=production
  - [ ] Configure production DATABASE_URL
  - [ ] Set up production Redis connection
  - [ ] Configure rate limiting rules
  - [ ] Set appropriate LOG_LEVEL (warn or error)
  - [ ] Configure BCRYPT_ROUNDS (recommended: 12-14)

- [ ] **Database**
  - [ ] Run database migrations
  - [ ] Set up connection pooling (2-10 connections)
  - [ ] Configure database backups
  - [ ] Set up read replicas if needed
  - [ ] Enable query logging for monitoring

- [ **Monitoring**
  - [ ] Set up Prometheus metrics scraping
  - [ ] Configure alerting rules
  - [ ] Set up log aggregation
  - [ ] Configure health check monitors
  - [ ] Set up uptime monitoring

## Environment Configuration

### Production Environment Variables

Create a production `.env` file with these minimum settings:

```bash
# Server
NODE_ENV=production
PORT=3000
HOST=0.0.0.0

# Database
DATABASE_URL=postgresql://user:strong-password@db-host:5432/dbname
DATABASE_POOL_MIN=2
DATABASE_POOL_MAX=10

# Redis
REDIS_HOST=redis-host
REDIS_PORT=6379
REDIS_PASSWORD=your-redis-password
REDIS_DB=0

# PASETO (Generate with: bun run generate:paseto-keys)
PASETO_LOCAL_KEY=k4.local.YOUR_GENERATED_LOCAL_KEY
PASETO_PUBLIC_KEY=k4.public.YOUR_GENERATED_PUBLIC_KEY
PASETO_SECRET_KEY=k4.secret.YOUR_GENERATED_SECRET_KEY

# Tokens
ACCESS_TOKEN_EXPIRY_MINUTES=15
REFRESH_TOKEN_EXPIRY_DAYS=7

# Rate Limiting
RATE_LIMIT_ENABLED=true
RATE_LIMIT_WINDOW_SECONDS=60
RATE_LIMIT_MAX_REQUESTS=100

# Logging
LOG_LEVEL=warn
LOG_PRETTY=false
LOG_FORMAT=json

# Security
BCRYPT_ROUNDS=12

# CORS (Update with your domain)
CORS_ORIGIN=https://your-domain.com
CORS_CREDENTIALS=true
```

### Secrets Management

**Never commit secrets to version control.** Use one of these approaches:

1. **Environment Variables** (Basic)

   ```bash
   export PASETO_SECRET_KEY="your-secret-key"
   ```

2. **Kubernetes Secrets**

   ```yaml
   apiVersion: v1
   kind: Secret
   metadata:
     name: app-secrets
   type: Opaque
   stringData:
     PASETO_SECRET_KEY: 'your-secret-key'
     DATABASE_URL: 'postgresql://...'
   ```

3. **AWS Secrets Manager**

   ```bash
   aws secretsmanager create-secret \
     --name prod/paseto-secret-key \
     --secret-string "your-secret-key"
   ```

4. **Vault** (HashiCorp Vault)
   ```bash
   vault kv put secret/paseto secret_key="your-secret-key"
   ```

## Docker Deployment

### Build Production Image

```bash
# Build using production Dockerfile
docker build \
  -f docker/dockerfiles/Dockerfile.prod \
  -t your-registry/bun-elysia-paseto-api:v1.0.0 \
  --build-arg NODE_ENV=production \
  .

# Tag for registry
docker tag bun-elysia-paseto-api:v1.0.0 \
  your-registry/bun-elysia-paseto-api:v1.0.0
```

### Run with Docker

```bash
docker run -d \
  --name bun-elysia-api \
  -p 3000:3000 \
  --env-file .env.production \
  --restart unless-stopped \
  --health-cmd="curl -f http://localhost:3000/health || exit 1" \
  --health-interval=30s \
  --health-timeout=10s \
  --health-retries=3 \
  your-registry/bun-elysia-paseto-api:v1.0.0
```

### Docker Compose (Production)

Use the provided production compose file:

```bash
cd infra
docker-compose -f docker-compose.prod.yaml up -d
```

Or create your own `docker-compose.prod.yaml`:

```yaml
version: '3.8'

services:
  api:
    image: your-registry/bun-elysia-paseto-api:latest
    ports:
      - '3000:3000'
    environment:
      - NODE_ENV=production
    env_file:
      - .env.production
    depends_on:
      - postgres
      - redis
    restart: unless-stopped
    healthcheck:
      test: ['CMD', 'curl', '-f', 'http://localhost:3000/health']
      interval: 30s
      timeout: 10s
      retries: 3

  postgres:
    image: postgres:16-alpine
    environment:
      - POSTGRES_DB=bun_elysia_paseto
      - POSTGRES_USER=postgres
      - POSTGRES_PASSWORD=strong-password
    volumes:
      - postgres_data:/var/lib/postgresql/data
    restart: unless-stopped

  redis:
    image: redis:7-alpine
    command: redis-server --requirepass strong-password
    volumes:
      - redis_data:/data
    restart: unless-stopped

volumes:
  postgres_data:
  redis_data:
```

## Kubernetes Deployment

### Prerequisites

- kubectl configured with cluster access
- Container registry credentials configured in cluster
- NGINX Ingress Controller installed (for ingress)

### Deployment Steps

1. **Create Namespace**

```bash
kubectl create namespace bun-elysia-api
```

2. **Create ConfigMap**

```bash
kubectl apply -f infra/kubernetes/configmap.yaml -n bun-elysia-api
```

Edit `configmap.yaml` as needed:

```yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: app-config
  namespace: bun-elysia-api
data:
  NODE_ENV: 'production'
  PORT: '3000'
  LOG_LEVEL: 'warn'
  LOG_FORMAT: 'json'
  LOG_PRETTY: 'false'
  # Add non-sensitive config here
```

3. **Create Secrets**

```bash
kubectl apply -f infra/kubernetes/secret.yaml -n bun-elysia-api
```

Edit `secret.yaml` with your actual secrets:

```yaml
apiVersion: v1
kind: Secret
metadata:
  name: app-secrets
  namespace: bun-elysia-api
type: Opaque
stringData:
  DATABASE_URL: 'postgresql://user:pass@postgres:5432/dbname'
  REDIS_PASSWORD: 'your-redis-password'
  PASETO_LOCAL_KEY: 'k4.local.YOUR_KEY'
  PASETO_PUBLIC_KEY: 'k4.public.YOUR_KEY'
  PASETO_SECRET_KEY: 'k4.secret.YOUR_KEY'
```

4. **Deploy Application**

```bash
# Deploy all resources
kubectl apply -f infra/kubernetes/ -n bun-elysia-api

# Or apply individually
kubectl apply -f infra/kubernetes/deployment.yaml -n bun-elysia-api
kubectl apply -f infra/kubernetes/service.yaml -n bun-elysia-api
kubectl apply -f infra/kubernetes/hpa.yaml -n bun-elysia-api
kubectl apply -f infra/kubernetes/poddisruptionbudget.yaml -n bun-elysia-api
```

5. **Configure Ingress** (Optional)

```bash
kubectl apply -f infra/kubernetes/ingress.yaml -n bun-elysia-api
```

### Verify Deployment

```bash
# Check pod status
kubectl get pods -n bun-elysia-api

# Check deployment status
kubectl rollout status deployment/bun-elysia-paseto-api -n bun-elysia-api

# Check services
kubectl get svc -n bun-elysia-api

# View logs
kubectl logs -l app=bun-elysia-paseto-api -n bun-elysia-api --tail=100 -f

# Port forward to test
kubectl port-forward svc/bun-elysia-paseto-api 3000:80 -n bun-elysia-api
```

### Scaling

**Manual Scaling:**

```bash
kubectl scale deployment/bun-elysia-paseto-api --replicas=5 -n bun-elysia-api
```

**Autoscaling** (configured in HPA):

```bash
# Check HPA status
kubectl get hpa -n bun-elysia-api

# Edit HPA
kubectl edit hpa bun-elysia-paseto-api -n bun-elysia-api
```

### Updates & Rollbacks

**Rolling Update:**

```bash
# Update image
kubectl set image deployment/bun-elysia-paseto-api \
  api=your-registry/bun-elysia-paseto-api:v1.1.0 \
  -n bun-elysia-api

# Watch rollout status
kubectl rollout status deployment/bun-elysia-paseto-api -n bun-elysia-api
```

**Rollback:**

```bash
# Rollback to previous version
kubectl rollout undo deployment/bun-elysia-paseto-api -n bun-elysia-api

# Rollback to specific revision
kubectl rollout undo deployment/bun-elysia-paseto-api \
  --to-revision=2 -n bun-elysia-api
```

## Cloud Provider Guides

### AWS (ECS/EKS)

**ECS (Elastic Container Service):**

1. Create ECR repository
2. Push Docker image to ECR
3. Create ECS task definition with environment variables
4. Configure ECS service with ALB
5. Set up auto-scaling

```bash
# Login to ECR
aws ecr get-login-password --region us-east-1 | \
  docker login --username AWS --password-stdin \
  123456789.dkr.ecr.us-east-1.amazonaws.com

# Build and push
docker build -t bun-elysia-api .
docker tag bun-elysia-api:latest \
  123456789.dkr.ecr.us-east-1.amazonaws.com/bun-elysia-api:latest
docker push \
  123456789.dkr.ecr.us-east-1.amazonaws.com/bun-elysia-api:latest
```

**EKS (Elastic Kubernetes Service):**

1. Create EKS cluster
2. Configure kubectl for EKS
3. Follow Kubernetes deployment steps above
4. Use AWS Load Balancer Controller for ingress
5. Store secrets in AWS Secrets Manager

### Google Cloud (GKE)

1. Create GKE cluster
2. Configure kubectl
3. Push image to GCR
4. Deploy using Kubernetes manifests
5. Configure Cloud SQL for PostgreSQL
6. Use Memorystore for Redis

```bash
# Build and push to GCR
gcloud builds submit --tag gcr.io/PROJECT_ID/bun-elysia-api

# Deploy
kubectl apply -f infra/kubernetes/
```

### Azure (AKS)

1. Create AKS cluster
2. Configure kubectl
3. Push image to ACR
4. Deploy using Kubernetes manifests
5. Configure Azure Database for PostgreSQL
6. Use Azure Cache for Redis

```bash
# Build and push to ACR
az acr build --registry myRegistry --image bun-elysia-api .

# Deploy
kubectl apply -f infra/kubernetes/
```

### DigitalOcean (App Platform)

1. Create Dockerfile-based app
2. Configure environment variables
3. Add PostgreSQL and Redis components
4. Deploy with automatic HTTPS

## Security Best Practices

### Network Security

```yaml
# Example Network Policy
apiVersion: networking.k8s.io/v1
kind: NetworkPolicy
metadata:
  name: api-network-policy
spec:
  podSelector:
    matchLabels:
      app: bun-elysia-paseto-api
  policyTypes:
    - Ingress
    - Egress
  ingress:
    - from:
        - namespaceSelector:
            matchLabels:
              name: ingress-nginx
      ports:
        - protocol: TCP
          port: 3000
  egress:
    - to:
        - podSelector:
            matchLabels:
              app: postgres
      ports:
        - protocol: TCP
          port: 5432
    - to:
        - podSelector:
            matchLabels:
              app: redis
      ports:
        - protocol: TCP
          port: 6379
```

### Pod Security

```yaml
# Add to deployment.yaml
spec:
  template:
    spec:
      securityContext:
        runAsNonRoot: true
        runAsUser: 1000
        fsGroup: 1000
        seccompProfile:
          type: RuntimeDefault
      containers:
        - name: api
          securityContext:
            allowPrivilegeEscalation: false
            readOnlyRootFilesystem: true
            capabilities:
              drop:
                - ALL
```

### TLS Configuration

```yaml
# Ingress with TLS
apiVersion: networking.k8s.io/v1
kind: Ingress
metadata:
  name: api-ingress
  annotations:
    cert-manager.io/cluster-issuer: 'letsencrypt-prod'
spec:
  tls:
    - hosts:
        - api.example.com
      secretName: api-tls
  rules:
    - host: api.example.com
      http:
        paths:
          - path: /
            pathType: Prefix
            backend:
              service:
                name: bun-elysia-paseto-api
                port:
                  number: 80
```

## Monitoring Setup

### Prometheus Configuration

```yaml
# prometheus.yml
scrape_configs:
  - job_name: 'bun-elysia-api'
    kubernetes_sd_configs:
      - role: pod
        namespaces:
          names:
            - bun-elysia-api
    relabel_configs:
      - source_labels: [__meta_kubernetes_pod_label_app]
        action: keep
        regex: bun-elysia-paseto-api
      - source_labels: [__meta_kubernetes_pod_ip]
        target_label: __address__
        replacement: $1:3000
      - source_labels: [__meta_kubernetes_pod_ip]
        target_label: __param_target
    metrics_path: /metrics
```

### Alerting Rules

```yaml
# alerting_rules.yml
groups:
  - name: api_alerts
    rules:
      - alert: HighErrorRate
        expr: rate(http_requests_total{status=~"5.."}[5m]) > 0.05
        for: 5m
        annotations:
          summary: 'High error rate detected'

      - alert: HighResponseTime
        expr: histogram_quantile(0.95, http_request_duration_seconds_bucket) > 1
        for: 5m
        annotations:
          summary: '95th percentile response time too high'

      - alert: DatabaseConnectionPoolExhausted
        expr: db_pool_active_connections / db_pool_max_connections > 0.9
        for: 5m
        annotations:
          summary: 'Database connection pool nearly exhausted'
```

### Logging

**Elastic Stack (ELK):**

```yaml
# Filebeat configuration
filebeat.inputs:
  - type: container
    paths:
      - /var/log/containers/*bun-elysia*.log
    processors:
      - add_kubernetes_metadata:

output.elasticsearch:
  hosts: ['elasticsearch:9200']
```

**Cloud Logging:**

- AWS: CloudWatch Logs
- GCP: Cloud Logging
- Azure: Log Analytics

## Performance Optimization

### Database Optimization

```sql
-- Create indexes for common queries
CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_sessions_user_id ON sessions(user_id);
CREATE INDEX idx_sessions_refresh_token ON sessions(refresh_token);

-- Analyze query performance
EXPLAIN ANALYZE SELECT * FROM users WHERE email = 'test@example.com';
```

### Connection Pooling

Configure in `.env`:

```bash
DATABASE_POOL_MIN=2
DATABASE_POOL_MAX=10
DATABASE_POOL_IDLE_TIMEOUT=10000
```

### Redis Caching

```bash
# Enable caching
REDIS_ENABLED=true
REDIS_DEFAULT_TTL=3600
```

### CDN Configuration

- Serve static assets via CDN
- Configure cache headers
- Enable gzip compression

## Troubleshooting

### Common Issues

**1. Pod Not Starting**

```bash
# Describe pod for details
kubectl describe pod <pod-name> -n bun-elysia-api

# Common causes:
# - Image pull errors: Check registry credentials
# - OOMKilled: Increase memory limits
# - CrashLoopBackOff: Check logs for application errors
```

**2. Database Connection Errors**

```bash
# Check database connectivity
kubectl run -it --rm debug --image=postgres:16 --restart=Never -- \
  psql $DATABASE_URL

# Verify secrets
kubectl get secret app-secrets -n bun-elysia-api -o yaml
```

**3. High Memory Usage**

```bash
# Check resource usage
kubectl top pods -n bun-elysia-api

# Adjust limits in deployment.yaml
resources:
  limits:
    memory: "1Gi"
```

**4. Slow Response Times**

```bash
# Check metrics
curl http://your-api/metrics | grep http_request_duration

# Check database performance
kubectl logs -l app=bun-elysia-api -n bun-elysia-api | grep "db.query"
```

### Debug Mode

Enable debug logging temporarily:

```bash
# Update ConfigMap
kubectl patch configmap app-config -n bun-elysia-api --type merge \
  -p '{"data":{"LOG_LEVEL":"debug"}}'

# Restart pods
kubectl rollout restart deployment/bun-elysia-paseto-api -n bun-elysia-api
```

## Disaster Recovery

### Backup Strategy

**Database Backups:**

```bash
# Manual backup
pg_dump $DATABASE_URL > backup_$(date +%Y%m%d).sql

# Automated backups (PostgreSQL)
# Configure in postgresql.conf:
archive_mode = on
archive_command = 'cp %p /archive/%f'
```

**Redis Backups:**

```bash
# Enable AOF persistence
# In redis.conf:
appendonly yes
appendfsync everysec
```

### Recovery Procedures

1. **Database Recovery**

```bash
# Restore from backup
psql $DATABASE_URL < backup_20240309.sql

# Or use Point-in-Time Recovery (PITR)
```

2. **Application Recovery**

```bash
# Rollback to previous version
kubectl rollout undo deployment/bun-elysia-paseto-api -n bun-elysia-api

# Scale up if needed
kubectl scale deployment/bun-elysia-paseto-api --replicas=5 -n bun-elysia-api
```

### High Availability Setup

- Use managed database services with automatic failover
- Configure Redis Cluster or Sentinel
- Deploy across multiple availability zones
- Implement proper health checks
- Set up active-active or active-passive configurations

## Maintenance

### Regular Maintenance Tasks

**Daily:**

- Check application health
- Review error logs
- Monitor resource usage

**Weekly:**

- Review performance metrics
- Check security advisories
- Update dependencies if needed
- Review and optimize slow queries

**Monthly:**

- Database maintenance (VACUUM, ANALYZE)
- Review and update documentation
- Security audit
- Backup verification
- Capacity planning

### Maintenance Windows

Schedule regular maintenance windows for:

- Dependency updates
- Database migrations
- Configuration changes
- Scaling adjustments

Always communicate maintenance windows to users in advance.

## Next Steps

- Set up CI/CD pipeline
- Configure automated testing
- Implement blue-green deployments
- Set up multi-region deployment
- Configure disaster recovery procedures
- Document runbooks for common issues

For operational procedures, see the [Operations Runbook](../operations/runbook.md).
