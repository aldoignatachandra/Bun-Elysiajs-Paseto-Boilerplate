# Graceful Shutdown

This boilerplate includes a built-in graceful shutdown mechanism that ensures clean application termination when receiving SIGTERM or SIGINT signals.

## How It Works

When the application receives a shutdown signal:

1. **Stop accepting new requests** - The server immediately marks itself as shutting down
2. **Return 503 for new requests** - Any requests that arrive during shutdown receive a 503 Service Unavailable response
3. **Wait for active requests** - The server waits for currently processing requests to complete (up to a timeout)
4. **Close connections** - Database and Redis connections are closed gracefully
5. **Exit process** - The application exits with code 0

## Configuration

The graceful shutdown behavior can be configured via environment variables:

```bash
# Maximum time to wait for active requests to complete (default: 30000ms)
SHUTDOWN_TIMEOUT_MS=30000

# Grace period before forcefully closing connections (default: 5000ms)
SHUTDOWN_GRACE_PERIOD_MS=5000
```

## Usage

The shutdown manager is automatically initialized in `src/server.ts`:

```typescript
import { ShutdownManager, createShutdownConfig } from './core/shutdown';

const shutdownManager = new ShutdownManager(
  createShutdownConfig({
    timeoutMs: config.SHUTDOWN_TIMEOUT_MS,
    gracePeriodMs: config.SHUTDOWN_GRACE_PERIOD_MS,
  })
);

shutdownManager.initialize();
```

## Testing Shutdown

You can test the graceful shutdown mechanism by sending signals to the running process:

```bash
# Send SIGTERM (simulates Docker stop, Kubernetes termination)
kill -TERM <pid>

# Send SIGINT (simulates Ctrl+C)
kill -INT <pid>
```

## 503 Response Format

When the server is shutting down, new requests receive:

```json
{
  "success": false,
  "error": {
    "code": "SERVICE_UNAVAILABLE",
    "message": "Server is shutting down, please try again later"
  },
  "meta": {
    "timestamp": "2026-03-13T12:00:00.000Z"
  }
}
```

## Request Tracking

The shutdown manager automatically tracks active requests. Each request:

1. Increments the counter when starting
2. Decrements the counter when finishing (even if it fails)

This ensures the shutdown process waits for all in-flight requests to complete.

## Implementation Details

The shutdown logic is implemented in:

- `src/core/shutdown/shutdown.ts` - Main shutdown manager
- `src/server.ts` - Integration with Bun's HTTP server
- `src/config/env.schema.ts` - Environment configuration
- `tests/unit/core/shutdown/shutdown.test.ts` - Unit tests
