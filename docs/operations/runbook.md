# Operations Runbook

This runbook contains operational procedures for managing the Bun Elysia PASETO Boilerplate application in production.

## Table of Contents

- [Emergency Procedures](#emergency-procedures)
- [Deployment Procedures](#deployment-procedures)
- [Common Operational Tasks](#common-operational-tasks)
- [Maintenance Procedures](#maintenance-procedures)
- [Troubleshooting Guide](#troubleshooting-guide)
- [Daily Operations](#daily-operations)
- [Weekly Operations](#weekly-operations)
- [Monthly Operations](#monthly-operations)

## Emergency Procedures

### Application Down

**Symptoms:**

- Health endpoint returning 5xx errors
- All pods in CrashLoopBackOff
- Service unavailable

**Immediate Actions:**

1. **Check application status:**

   ```bash
   # Check pods
   kubectl get pods -n bun-elysia-api

   # Check pod logs
   kubectl logs -l app=bun-elysia-paseto-api -n bun-elysia-api --tail=100

   # Check events
   kubectl get events -n bun-elysia-api --sort-by='.lastTimestamp'
   ```

2. **Identify the issue:**

   ```bash
   # Describe problematic pod
   kubectl describe pod <pod-name> -n bun-elysia-api

   # Check recent deployments
   kubectl rollout history deployment/bun-elysia-paseto-api -n bun-elysia-api
   ```

3. **Quick fixes:**

   ```bash
   # Restart deployment
   kubectl rollout restart deployment/bun-elysia-paseto-api -n bun-elysia-api

   # If recent deployment caused issues, rollback
   kubectl rollout undo deployment/bun-elysia-paseto-api -n bun-elysia-api

   # Scale up if resource constrained
   kubectl scale deployment/bun-elysia-paseto-api --replicas=5 -n bun-elysia-api
   ```

4. **Verify recovery:**

   ```bash
   # Watch pod status
   kubectl get pods -n bun-elysia-api -w

   # Check health endpoint
   kubectl port-forward svc/bun-elysia-paseto-api 3000:80 -n bun-elysia-api
   curl http://localhost:3000/health
   ```

### Database Connection Issues

**Symptoms:**

- "Connection refused" errors
- "Connection pool exhausted" errors
- Slow database queries

**Immediate Actions:**

1. **Check database connectivity:**

   ```bash
   # Test connection from pod
   kubectl run -it --rm debug --image=postgres:16 --restart=Never -n bun-elysia-api -- \
     psql $DATABASE_URL -c "SELECT 1"

   # Check database metrics
   kubectl exec -it <pod-name> -n bun-elysia-api -- curl http://localhost:3000/metrics | grep db
   ```

2. **Check connection pool:**

   ```bash
   # View pool metrics
   curl http://your-api/metrics | grep db_pool

   # If pool exhausted, increase limits
   kubectl set env deployment/bun-elysia-paseto-api \
     DATABASE_POOL_MAX=20 -n bun-elysia-api
   ```

3. **Check database health:**

   ```bash
   # For PostgreSQL
   kubectl exec -it postgres-0 -n postgres -- \
    psql -U postgres -c "SELECT count(*) FROM pg_stat_activity WHERE datname='your_db';"

   # Check for long-running queries
   kubectl exec -it postgres-0 -n postgres -- \
    psql -U postgres -c "SELECT pid, now() - query_start as duration, query FROM pg_stat_activity WHERE state = 'active' ORDER BY duration DESC;"
   ```

4. **Scale database if needed:**
   ```bash
   # Add replicas if using managed service
   # Or increase resources
   ```

### High Error Rates

**Symptoms:**

- 5xx error rate > 5%
- Sudden increase in errors
- Application errors in logs

**Immediate Actions:**

1. **Check error metrics:**

   ```bash
   # View error rate
   curl http://your-api/metrics | grep 'status="5''

   # Check recent errors in logs
   kubectl logs -l app=bun-elysia-paseto-api -n bun-elysia-api --tail=500 | grep ERROR
   ```

2. **Identify failing endpoints:**

   ```bash
   # Group errors by route
   curl http://your-api/metrics | grep 'http_requests_total{status=~"5..' | sort
   ```

3. **Quick mitigation:**

   ```bash
   # If recent deployment, rollback
   kubectl rollout undo deployment/bun-elysia-paseto-api -n bun-elysia-api

   # Scale up to handle load
   kubectl scale deployment/bun-elysia-paseto-api --replicas=10 -n bun-elysia-api

   # Enable debug logging temporarily
   kubectl set env deployment/bun-elysia-paseto-api LOG_LEVEL=debug -n bun-elysia-api
   ```

4. **Investigate logs:**

   ```bash
   # Stream logs
   kubectl logs -l app=bun-elysia-paseto-api -n bun-elysia-api -f

   # Check specific time range
   kubectl logs -l app=bun-elysia-paseto-api -n bun-elysia-api --since-time=2024-03-09T10:00:00Z
   ```

### Security Incident

**Symptoms:**

- Unauthorized access attempts
- Suspicious activity in logs
- Data breach indicators

**Immediate Actions:**

1. **Assess situation:**

   ```bash
   # Check authentication failures
   kubectl logs -l app=bun-elysia-paseto-api -n bun-elysia-api --tail=1000 | grep "auth.*fail"

   # Check for suspicious IP addresses
   kubectl logs -l app=bun-elysia-paseto-api -n bun-elysia-api --tail=1000 | \
     grep -E "(401|403)" | awk '{print $1}' | sort | uniq -c | sort -rn
   ```

2. **Containment:**

   ```bash
   # Block suspicious IPs (using network policy)
   kubectl apply -f - <<EOF
   apiVersion: networking.k8s.io/v1
   kind: NetworkPolicy
   metadata:
     name: block-suspicious-ips
     namespace: bun-elysia-api
   spec:
     podSelector:
       matchLabels:
         app: bun-elysia-paseto-api
     ingress:
     - from:
       - ipBlock:
           cidr: 0.0.0.0/0
           except:
           - SUSPICIOUS_IP/32
   EOF

   # Increase rate limiting
   kubectl set env deployment/bun-elysia-paseto-api \
     RATE_LIMIT_MAX_REQUESTS=10 -n bun-elysia-api
   ```

3. **Secure credentials:**

   ```bash
   # Rotate PASETO keys
   bun run generate:paseto-keys
   # Update secrets
   kubectl apply -f infra/kubernetes/secret.yaml -n bun-elysia-api

   # Force restart to pick up new keys
   kubectl rollout restart deployment/bun-elysia-paseto-api -n bun-elysia-api
   ```

4. **Document and report:**
   - Preserve logs
   - Document timeline
   - Report to security team
   - Notify stakeholders if needed

## Deployment Procedures

### Standard Deployment

**Prerequisites:**

- All tests passing
- Code reviewed
- Migration files prepared
- Rollback plan documented

**Steps:**

1. **Prepare deployment:**

   ```bash
   # Checkout target branch
   git checkout main

   # Pull latest changes
   git pull origin main

   # Run tests
   bun test

   # Build application
   bun run build
   ```

2. **Build Docker image:**

   ```bash
   # Tag with version
   VERSION=$(date +%Y%m%d-%H%M%S)
   docker build -f docker/dockerfiles/Dockerfile.prod \
     -t your-registry/bun-elysia-paseto-api:$VERSION \
     -t your-registry/bun-elysia-paseto-api:latest .

   # Push to registry
   docker push your-registry/bun-elysia-paseto-api:$VERSION
   docker push your-registry/bun-elysia-paseto-api:latest
   ```

3. **Deploy to Kubernetes:**

   ```bash
   # Update image in deployment
   kubectl set image deployment/bun-elysia-paseto-api \
     api=your-registry/bun-elysia-paseto-api:$VERSION \
     -n bun-elysia-api

   # Watch rollout status
   kubectl rollout status deployment/bun-elysia-paseto-api -n bun-elysia-api
   ```

4. **Verify deployment:**

   ```bash
   # Check pod status
   kubectl get pods -n bun-elysia-api

   # Check health
   kubectl port-forward svc/bun-elysia-paseto-api 3000:80 -n bun-elysia-api
   curl http://localhost:3000/health

   # Run smoke tests
   bun run test:smoke
   ```

5. **Monitor:**
   - Watch error rates
   - Check response times
   - Monitor metrics
   - Review logs for issues

### Database Migration

**Prerequisites:**

- Migration tested in staging
- Backup created
- Rollback plan prepared
- Maintenance window scheduled (if needed)

**Steps:**

1. **Create backup:**

   ```bash
   # Backup database
   pg_dump $DATABASE_URL > backup_$(date +%Y%m%d_%H%M%S).sql

   # Or use managed backup service
   ```

2. **Review migration:**

   ```bash
   # Preview migration
   bun run db:generate

   # Review generated SQL
   cat migrations/0001_xyz.sql
   ```

3. **Run migration:**

   ```bash
   # Apply migration
   bun run db:migrate

   # Verify schema changes
   psql $DATABASE_URL -c "\d your_table"
   ```

4. **Verify application:**

   ```bash
   # Check for errors
   kubectl logs -l app=bun-elysia-paseto-api -n bun-elysia-api --tail=100

   # Run integration tests
   bun run test:integration
   ```

### Rollback Procedure

**When to rollback:**

- High error rates after deployment
- Critical bugs discovered
- Performance degradation
- Data integrity issues

**Steps:**

1. **Quick rollback (Kubernetes):**

   ```bash
   # Rollback to previous version
   kubectl rollout undo deployment/bun-elysia-paseto-api -n bun-elysia-api

   # Watch rollback status
   kubectl rollout status deployment/bun-elysia-paseto-api -n bun-elysia-api

   # Verify rollback
   kubectl get pods -n bun-elysia-api
   ```

2. **Rollback to specific version:**

   ```bash
   # List revisions
   kubectl rollout history deployment/bun-elysia-paseto-api -n bun-elysia-api

   # Rollback to specific revision
   kubectl rollout undo deployment/bun-elysia-paseto-api --to-revision=3 -n bun-elysia-api
   ```

3. **Database rollback (if needed):**

   ```bash
   # Create down migration
   # Or restore from backup
   psql $DATABASE_URL < backup_20240309_100000.sql
   ```

4. **Post-rollback:**
   - Verify system health
   - Monitor metrics
   - Document issues
   - Create fix for next deployment

## Common Operational Tasks

### Scaling Operations

**Manual Scaling:**

```bash
# Scale up for increased load
kubectl scale deployment/bun-elysia-paseto-api --replicas=10 -n bun-elysia-api

# Scale down to save resources
kubectl scale deployment/bun-elysia-paseto-api --replicas=3 -n bun-elysia-api
```

**Autoscaler Management:**

```bash
# Check HPA status
kubectl get hpa -n bun-elysia-api

# Edit HPA configuration
kubectl edit hpa bun-elysia-paseto-api -n bun-elysia-api

# Disable autoscaler
kubectl autoscale deployment/bun-elysia-paseto-api --min=3 --max=10 --cpu-percent=70 -n bun-elysia-api
```

### Configuration Updates

**Update ConfigMap:**

```bash
# Edit ConfigMap
kubectl edit configmap app-config -n bun-elysia-api

# Force pods to pick up changes
kubectl rollout restart deployment/bun-elysia-paseto-api -n bun-elysia-api
```

**Update Secrets:**

```bash
# Create new secret
kubectl create secret generic app-secrets-new \
  --from-literal=PASETO_SECRET_KEY="new-key" \
  --dry-run=client -o yaml | kubectl apply -n bun-elysia-api -f -

# Restart pods
kubectl rollout restart deployment/bun-elysia-paseto-api -n bun-elysia-api
```

### Log Management

**View logs:**

```bash
# Recent logs
kubectl logs -l app=bun-elysia-paseto-api -n bun-elysia-api --tail=100

# Stream logs
kubectl logs -l app=bun-elysia-paseto-api -n bun-elysia-api -f

# Logs from specific time
kubectl logs -l app=bun-elysia-paseto-api -n bun-elysia-api --since-time=2024-03-09T10:00:00Z

# Logs from previous container (after restart)
kubectl logs <pod-name> -n bun-elysia-api --previous
```

**Export logs:**

```bash
# Export to file
kubectl logs -l app=bun-elysia-paseto-api -n bun-elysia-api --tail=10000 > app-logs.txt

# Export all pod logs
kubectl logs -l app=bun-elysia-paseto-api -n bun-elysia-api --all-containers=true > all-logs.txt
```

### Debugging

**Debug running pod:**

```bash
# Execute into pod
kubectl exec -it <pod-name> -n bun-elysia-api -- /bin/sh

# Check environment variables
kubectl exec -it <pod-name> -n bun-elysia-api -- env

# Test network connectivity
kubectl exec -it <pod-name> -n bun-elysia-api -- wget -O- http://localhost:3000/health
```

**Debug with ephemeral container:**

```bash
# Start debug container
kubectl debug -it <pod-name> -n bun-elysia-api --image=nicolaka/netshoot

# Start debug container alongside running pod
kubectl debug -it <pod-name> -n bun-elysia-api --copy-to=<pod-name>-debug --container=debug --image=nicolaka/netshoot
```

## Maintenance Procedures

### Database Maintenance

**Routine maintenance:**

```bash
# Connect to database
kubectl exec -it postgres-0 -n postgres -- psql -U postgres -d bun_elysia_paseto

# Analyze tables
ANALYZE users;
ANALYZE sessions;

# Vacuum (reclaim space)
VACUUM ANALYZE users;

# Check table sizes
SELECT
  schemaname,
  tablename,
  pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename)) AS size
FROM pg_tables
WHERE schemaname = 'public'
ORDER BY pg_total_relation_size(schemaname||'.'||tablename) DESC;
```

**Index maintenance:**

```sql
-- Check unused indexes
SELECT
  schemaname,
  tablename,
  indexname,
  idx_scan
FROM pg_stat_user_indexes
WHERE idx_scan = 0
AND indexname NOT LIKE '%_pkey';

-- Reindex if needed
REINDEX TABLE users;
```

### Certificate Renewal

**Check certificate expiry:**

```bash
# Check TLS certificate
kubectl get secret api-tls -n bun-elysia-api -o jsonpath='{.data.tls\.crt}' | \
  base64 -d | openssl x509 -noout -dates
```

**Renew certificates:**

```bash
# If using cert-manager, it auto-renews
# Manual renewal:
kubectl delete certificate api-tls -n bun-elysia-api
kubectl apply -f infra/kubernetes/certificate.yaml
```

### Dependency Updates

**Update dependencies:**

```bash
# Check for updates
bun update

# Update specific package
bun update package-name

# Run tests after update
bun test

# If everything works, commit changes
git add package.json bun.lock
git commit -m "chore: update dependencies"
```

**Production update:**

1. Test in staging first
2. Create new deployment
3. Monitor for issues
4. Rollback if problems occur

## Troubleshooting Guide

### Pod Not Starting

**Check pod status:**

```bash
kubectl get pods -n bun-elysia-api
kubectl describe pod <pod-name> -n bun-elysia-api
```

**Common causes:**

- **Image pull errors**: Check registry credentials
- **Resource limits**: Increase CPU/memory
- **Config errors**: Verify ConfigMaps and Secrets
- **Health check failures**: Check application logs

### High Memory Usage

**Diagnose:**

```bash
# Check memory usage
kubectl top pods -n bun-elysia-api

# Check memory limits
kubectl get deployment bun-elysia-paseto-api -n bun-elysia-api -o yaml | grep -A 5 resources
```

**Solutions:**

- Increase memory limits
- Investigate memory leaks
- Restart pods periodically
- Scale horizontally

### Slow Response Times

**Diagnose:**

```bash
# Check response time metrics
curl http://your-api/metrics | grep http_request_duration

# Check database queries
kubectl logs -l app=bun-elysia-paseto-api -n bun-elysia-api | grep "db.query"

# Check event loop lag
curl http://your-api/metrics | grep eventloop_lag
```

**Solutions:**

- Optimize database queries
- Add database indexes
- Enable caching
- Scale horizontally
- Optimize code

### Cache Issues

**Diagnose:**

```bash
# Check cache metrics
curl http://your-api/metrics | grep cache

# Test Redis connection
kubectl exec -it <pod-name> -n bun-elysia-api -- redis-cli -h $REDIS_HOST ping
```

**Solutions:**

- Verify Redis connectivity
- Check cache TTL settings
- Monitor cache hit ratio
- Clear cache if needed: `redis-cli FLUSHDB`

## Daily Operations

### Morning Checklist

- [ ] Check application health

  ```bash
  curl http://your-api/health
  ```

- [ ] Review error logs

  ```bash
  kubectl logs -l app=bun-elysia-paseto-api -n bun-elysia-api --since=24h | grep ERROR
  ```

- [ ] Check metrics dashboard
  - Response times
  - Error rates
  - Resource usage

- [ ] Verify alerts are working
  - Check recent alerts
  - Verify notification channels

### During the Day

- Monitor dashboards
- Respond to alerts promptly
- Review pull requests
- Handle incidents as they arise

### End of Day

- [ ] Review daily metrics
- [ ] Document any incidents
- [ ] Check backup status
- [ ] Review scheduled tasks

## Weekly Operations

### Monday

- [ ] Review weekly metrics report
- [ ] Check disk space usage
- [ ] Review security advisories
- [ ] Plan upcoming deployments

### Wednesday

- [ ] Review and optimize slow queries
- [ ] Check database growth
- [ ] Review cache effectiveness
- [ ] Update documentation if needed

### Friday

- [ ] Weekly security review
- [ ] Backup verification
- [ ] Review incident reports
- [ ] Plan next week's work

## Monthly Operations

### First Week

- [ ] Monthly metrics review
- [ ] Capacity planning review
- [ ] Security audit
- [ ] Dependency updates check

### Second Week

- [ ] Performance optimization
- [ ] Cost review
- [ ] Documentation update
- [ ] Training session if needed

### Third Week

- [ ] Disaster recovery test
- [ ] Runbook review
- [ ] Alert tuning
- [ ] Architecture review

### Fourth Week

- [ ] Monthly summary report
- [ ] Process improvement
- [ ] Tool evaluation
- [ ] Next month planning

## On-Call Procedures

### Being On-Call

**Responsibilities:**

- Monitor alerts 24/7
- Respond to incidents within SLA
- Document all incidents
- Escalate when needed

**Tools to monitor:**

- PagerDuty / Opsgenie for alerts
- Slack for communication
- Grafana for metrics
- Logging system for logs

### Escalation Path

1. **Level 1:** On-call engineer
   - Initial response
   - Quick fixes
   - Documentation

2. **Level 2:** Senior engineer
   - Complex issues
   - Code changes needed
   - Extended troubleshooting

3. **Level 3:** Engineering lead
   - Architecture issues
   - Major incidents
   - Customer communication

### Post-Incident Review

**After every incident:**

1. **Timeline:**
   - When did it start?
   - When was it detected?
   - When was it resolved?

2. **Impact:**
   - How many users affected?
   - What services impacted?
   - Duration of outage?

3. **Root Cause:**
   - What happened?
   - Why did it happen?
   - How was it fixed?

4. **Action Items:**
   - Prevent recurrence
   - Improve detection
   - Update documentation
   - Train team

## Communication

### Internal Communication

**Slack channels:**

- `#api-alerts`: Automated alerts
- `#api-deploys`: Deployment notifications
- `#api-ops`: Operational discussions

**When to communicate:**

- All deployments
- All incidents
- Scheduled maintenance
- Major changes

### External Communication

**When to notify users:**

- Planned maintenance (> 15 min)
- Service outages (> 5 min)
- Data incidents
- Security breaches

**Status page:**

- Update for all incidents
- Mark resolved issues
- Post maintenance notices

## Documentation

**Keep updated:**

- Runbook procedures
- Architecture diagrams
- API documentation
- Contact information

**Review schedule:**

- Monthly: Quick review
- Quarterly: Thorough update
- Annually: Major revision

---

For deployment details, see [Deployment Guide](../deployment/production.md).
For monitoring setup, see [Monitoring Guide](monitoring.md).
