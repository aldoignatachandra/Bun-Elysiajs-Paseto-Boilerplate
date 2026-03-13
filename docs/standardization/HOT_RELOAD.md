# Hot Reload Configuration

> **Version:** 1.0.0
> **Last Updated:** 2026-03-13
> **Purpose:** Simple development hot reload using Bun's native watch mode

---

## Overview

This boilerplate uses **Bun's native `--watch` flag** for hot reload during development. This is a simple, efficient approach that provides fast restarts when files change - perfect for a boilerplate project.

**No complex HMR system needed** - just file watching and server restart.

---

## Quick Start

### Local Development

```bash
# Start development server with hot reload
bun run dev

# That's it! Bun watches for changes and restarts automatically
```

### Docker Development

```bash
# Start all services with hot reload
bun run dev:docker

# Run in detached mode
bun run dev:docker:detached

# Follow API logs
bun run dev:docker:logs

# Stop all services
bun run dev:docker:stop

# Stop and remove volumes
bun run dev:docker:clean
```

---

## How It Works

### Local Development

1. **Bun Watch Mode**: The `--watch` flag monitors all imported files
2. **Auto-Restart**: When you save a change, Bun restarts the server
3. **Fast**: Bun's startup time is < 100ms for most changes
4. **Simple**: No configuration needed, works out of the box

```bash
bun run --watch src/server.ts
```

### Docker Development

1. **Volume Mounts**: Source code is mounted into the container
2. **Bun Watch Inside**: The container runs Bun with `--watch`
3. **Instant Updates**: Changes on your host are reflected immediately
4. **Full Stack**: Database, Redis, and other services included

```yaml
volumes:
  - ./src:/app/src:ro # Read-only mount for hot reload
```

---

## What Gets Reloaded

| File Type        | Behavior                   |
| ---------------- | -------------------------- |
| Routes           | Auto-restart on save       |
| Controllers      | Auto-restart on save       |
| Services         | Auto-restart on save       |
| Middleware       | Auto-restart on save       |
| Config           | Auto-restart on save       |
| Database Schema  | Requires manual migration  |
| Environment Vars | Requires container restart |

---

## Development Workflow

### Typical Session

```bash
# 1. Start development server
bun run dev

# 2. Make changes to any file in src/
# Example: Edit src/routes/products.routes.ts

# 3. Save the file
# Bun detects change and restarts automatically

# 4. Test your changes
# Refresh browser or use Swagger UI at /swagger
```

### Example: Adding a New Route

```typescript
// src/routes/orders.routes.ts
import { Elysia, t } from 'elysia';

export function createOrdersRoutes(app: Elysia) {
  return app.group('/orders', app =>
    app
      .get('/', () => ({ orders: [] }))
      .post('/', ({ body }) => ({ created: true, data: body }), {
        body: t.Object({
          productId: t.String(),
          quantity: t.Number(),
        }),
      })
  );
}
```

```typescript
// src/app.ts - Register the route
import { createOrdersRoutes } from './routes/orders.routes';

// Inside createApp()
app.group('/api/v1', api =>
  api
    .use(createAuthRoutes(...))
    .use(createUsersRoutes(...))
    .use(createProductsRoutes(...))
    .use(createOrdersRoutes(...))  // Add this
);
```

**Result**: Save both files, Bun restarts automatically, route is available.

---

## Docker Configuration

### docker-compose.dev.yaml

The development compose file includes:

1. **Source Code Mount**: `./src:/app/src:ro`
2. **Environment File**: `./.env:/app/.env:ro`
3. **Migration Files**: `./src/database/migrations:/app/migrations:ro`
4. **Node Modules**: Container's own (not mounted)

```yaml
api:
  volumes:
    - ./src:/app/src:ro
    - ./.env:/app/.env:ro
    - ./src/database/migrations:/app/migrations:ro
    - /app/node_modules
```

### Dockerfile.dev

The development Dockerfile:

1. Uses `bun:latest` base image
2. Installs dependencies
3. Runs with `--watch` flag
4. Exposes port 3000

```dockerfile
CMD ["bun", "run", "--watch", "src/server.ts"]
```

---

## Troubleshooting

### Changes Not Detected

**Problem**: You save a file but nothing happens.

**Solutions**:

1. Check that the file is in the `src/` directory
2. Verify the file is imported by `src/server.ts` (directly or indirectly)
3. Check console for errors
4. Try restarting the dev server manually

### Docker Changes Not Detected

**Problem**: Changes in Docker don't appear.

**Solutions**:

1. Verify volume mounts are correct:
   ```bash
   docker-compose -f docker-compose.dev.yaml config
   ```
2. Check file permissions:
   ```bash
   ls -la src/
   ```
3. Restart the container:
   ```bash
   bun run dev:docker:stop
   bun run dev:docker
   ```

### Server Won't Start

**Problem**: Server crashes on startup.

**Solutions**:

1. Check for syntax errors:
   ```bash
   bun run src/server.ts
   ```
2. Verify environment variables:
   ```bash
   cat .env
   ```
3. Check database connection:
   ```bash
   bun run db:check
   ```

---

## Environment Variables

### Hot Reload Specific

For local development, hot reload works automatically. No special variables needed.

For Docker, these are set in `docker-compose.dev.yaml`:

```yaml
environment:
  - NODE_ENV=development
  - LOG_LEVEL=debug
```

---

## Best Practices

### During Development

1. **Use `.env` for environment-specific settings**
2. **Keep database changes in migrations** (don't modify schema directly)
3. **Test in Swagger UI** at `http://localhost:3000/swagger`
4. **Check logs** for any errors during restart

### File Organization

```
src/
├── server.ts          # Entry point (Bun watches this)
├── app.ts             # App creation (auto-reload)
├── routes/            # Route definitions (auto-reload)
├── controllers/       # Request handlers (auto-reload)
├── services/          # Business logic (auto-reload)
├── repositories/      # Data access (auto-reload)
├── middlewares/       # Middleware (auto-reload)
└── config/            # Configuration (auto-reload)
```

### Performance Tips

1. **Large projects**: Bun's watch mode scales well
2. **Many files**: Restart time remains fast (< 100ms)
3. **Docker overhead**: Minimal with volume mounts
4. **Database migrations**: Run manually when needed

---

## Comparison with Production

| Feature        | Development         | Production       |
| -------------- | ------------------- | ---------------- |
| Bun Watch Mode | Enabled             | Disabled         |
| File Mounts    | Yes (local/Docker)  | No               |
| Logging        | Debug level, pretty | Info level, JSON |
| Hot Reload     | Yes                 | No               |
| Source Maps    | Yes                 | No               |

---

## Advanced Usage

### Custom Watch Paths

If you need to watch additional directories:

```bash
bun run --watch src/server.ts tests/
```

### Ignoring Files

Bun automatically ignores:

- `node_modules/`
- `.git/`
- `dist/`
- `build/`
- Test files (when running server)

### Manual Restart

Sometimes you need to restart manually:

```bash
# Press Ctrl+C to stop
# Then run again
bun run dev
```

---

## Scripts Reference

### Local Development

| Script        | Description           |
| ------------- | --------------------- |
| `bun run dev` | Start with hot reload |

### Docker Development

| Script                        | Description             |
| ----------------------------- | ----------------------- |
| `bun run dev:docker`          | Start all services      |
| `bun run dev:docker:detached` | Start in background     |
| `bun run dev:docker:logs`     | Follow API logs         |
| `bun run dev:docker:stop`     | Stop all services       |
| `bun run dev:docker:clean`    | Stop and remove volumes |

---

## Conclusion

This boilerplate uses **Bun's native watch mode** for hot reload because:

1. **Simple**: No complex configuration needed
2. **Fast**: Restart time is < 100ms
3. **Reliable**: Works consistently across platforms
4. **Batteries Included**: No external dependencies

For a boilerplate, this approach is perfect - it just works.

---

## Additional Resources

- [Bun Watch Mode Documentation](https://bun.sh/docs/cli/watch)
- [Docker Compose Documentation](https://docs.docker.com/compose/)
- [Elysia Documentation](https://elysiajs.com/)
- [Development Standards](./README.md)
