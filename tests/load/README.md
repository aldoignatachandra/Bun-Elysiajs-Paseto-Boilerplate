# Load Testing and Performance Benchmarks

This directory contains load testing and performance benchmarking scripts for the PASETO API.

## Overview

The load testing suite provides comprehensive testing for:

- **Concurrent request handling** - Testing the API's ability to handle multiple simultaneous requests
- **Rate limiting effectiveness** - Verifying that rate limiting works correctly
- **Connection pooling** - Testing database connection pool behavior under load
- **Caching effectiveness** - Measuring cache hit/miss ratios and performance improvements
- **Response time percentiles** - Benchmarking p50, p95, p99 response times
- **Throughput** - Measuring requests per second under various load conditions
- **Database performance** - Testing query performance for various operations
- **Memory efficiency** - Monitoring memory usage under load

## Test Structure

```
tests/
├── load/
│   ├── helpers.ts           # Utility functions for load testing
│   └── api-load.test.ts     # Load test suite
└── performance/
    └── benchmark.test.ts    # Performance benchmark suite
```

## Running the Tests

### Run All Load Tests

```bash
bun test tests/load
```

### Run All Performance Benchmarks

```bash
bun test tests/performance
```

### Run Specific Test Suite

```bash
bun test tests/load/api-load.test.ts
bun test tests/performance/benchmark.test.ts
```

### Run Specific Test

```bash
bun test -t "100 concurrent health check requests"
```

## Test Configuration

The tests use the following configuration:

- **Load Test Server Port**: 3001
- **Benchmark Server Port**: 3002
- **Default Request Count**: 100 (varies by test)
- **Default Concurrency**: 10-50 (varies by test)
- **Rate Limit**: 10 requests per 60 seconds

## Test Descriptions

### Load Tests (`api-load.test.ts`)

1. **100 Concurrent Health Check Requests**
   - Sends 100 simultaneous requests to the health endpoint
   - Validates all requests succeed
   - Checks response times are acceptable

2. **1000 Requests Over Time**
   - Sends 1000 requests in batches over time
   - Tests sustained load handling
   - Validates no failures occur

3. **Rate Limiting Effectiveness**
   - Tests rate limiting on authentication endpoints
   - Verifies rate limit resets after window expires
   - Validates correct HTTP 429 responses

4. **Connection Pooling Under Load**
   - Tests performance stability under sustained load
   - Validates concurrent authenticated requests
   - Checks coefficient of variation is reasonable

5. **Caching Effectiveness**
   - Measures cache hit/miss ratios
   - Compares cached vs uncached response times
   - Validates caching improves performance

6. **Mixed Workload Simulation**
   - Tests mixed read/write operations
   - Simulates real-world usage patterns
   - Validates overall system performance

### Performance Benchmarks (`benchmark.test.ts`)

1. **Response Time Percentiles**
   - Measures p50, p95, p99 response times
   - Tests health, authentication, and user endpoints
   - Validates performance targets are met

2. **Throughput Benchmarks**
   - Measures sustained throughput over time
   - Tests concurrent load throughput
   - Validates mixed endpoint throughput

3. **Database Query Performance**
   - Benchmarks user lookup queries
   - Tests paginated user list queries
   - Measures aggregate statistics query performance

4. **Cache Performance**
   - Measures cache hit ratios
   - Compares cached vs uncached performance
   - Tests cache stampede prevention

5. **Token Operations Performance**
   - Benchmarks token refresh operations
   - Measures logout operation performance

6. **Memory Efficiency**
   - Monitors memory usage under load
   - Validates memory efficiency

## Understanding the Results

### Statistics Output

Each test outputs detailed statistics including:

```
Statistics:
==================================================
Total Requests:      100
Successful:          100
Failed:              0
Success Rate:        100.00%
Requests/sec:        125.50
Total Time:          0.80s

Response Times (ms):
  Min:               5.20
  Max:               145.80
  Mean:              42.30
  Median:            38.50
  p50:               38.50
  p95:               95.20
  p99:               125.40
  Std Dev:           28.60
==================================================
```

### Key Metrics

- **p50 (Median)**: 50% of requests complete in this time or less
- **p95**: 95% of requests complete in this time or less
- **p99**: 99% of requests complete in this time or less
- **Std Dev**: Standard deviation - lower is more consistent
- **Coefficient of Variation**: Std Dev / Mean - lower is more stable

## Performance Targets

The following are the target performance metrics:

| Endpoint           | p50    | p95    | p99     |
| ------------------ | ------ | ------ | ------- |
| Health Check       | <50ms  | <100ms | <200ms  |
| Authentication     | <200ms | <500ms | <1000ms |
| Authenticated User | <150ms | <300ms | <500ms  |

| Test Type               | Target     |
| ----------------------- | ---------- |
| Throughput (Health)     | >100 req/s |
| Throughput (Concurrent) | >50 req/s  |
| Success Rate            | >95%       |
| Cache Hit Rate          | >50%       |

## Helper Functions

The `helpers.ts` file provides utility functions:

- `executeBatch()` - Execute requests in batches with concurrency control
- `calculateStatistics()` - Calculate request statistics (percentiles, etc.)
- `calculateCacheStatistics()` - Calculate cache hit/miss ratios
- `logStatistics()` - Format and log statistics
- `measureTime()` - Measure execution time of async functions
- `waitForServer()` - Wait for server to be ready
- `generateTestEmail()` - Generate test email addresses
- `generateTestPassword()` - Generate test passwords

## Best Practices

1. **Run tests in isolation** - Each test starts its own server
2. **Don't overload development machine** - Tests are designed to be lightweight
3. **Monitor system resources** - Keep an eye on CPU and memory during tests
4. **Use realistic scenarios** - Tests simulate real-world usage patterns
5. **Clean up after tests** - Servers are automatically stopped after tests complete

## Troubleshooting

### Port Already in Use

If you get a port conflict, change the `TEST_PORT` constant in the test files.

### Tests Fail to Connect

Ensure:

- All dependencies are installed (`bun install`)
- Database and Redis are running (if needed for tests)
- Environment variables are properly configured

### Unexpected Timeouts

- Reduce concurrency or request count
- Increase timeout values
- Check system resources

## CI/CD Integration

These tests can be integrated into CI/CD pipelines:

```yaml
# Example GitHub Actions workflow
- name: Run load tests
  run: bun test tests/load

- name: Run performance benchmarks
  run: bun test tests/performance
```

## Notes

- Tests are designed to be non-destructive
- Tests use isolated ports to avoid conflicts
- Servers are automatically started and stopped
- Tests include proper cleanup and error handling
- Results are logged in a human-readable format
