# Comprehensive Unit Testing Design

**Date**: 2026-03-13
**Author**: Claude Opus
**Status**: Approved

## Overview

Design comprehensive unit tests that mirror the `src/` structure in `tests/unit/`, achieving 85%+ coverage with mocked dependencies.

## Current State Analysis

### Metrics

- **Source Files**: 58 TypeScript files in `src/`
- **Test Files**: 24 test files (22 unit tests, 1 app.test.ts, 1 middleware)
- **Current Coverage**:
  - Functions: 65.23%
  - Lines: 76.22%
- **Tests**: 371 passing, 0 failing

### Critical Issues

1. **Activity Repository Mocking**: `this.db.insert is not a function` errors
2. **Password Service Test**: PHC format validation issues
3. **Low Coverage Areas**:
   - `src/config/redis.ts`: 0% functions
   - `src/database/connection.ts`: 0% functions
   - `src/plugins/health.plugin.ts`: 0% functions
   - `src/repositories/`: <25% coverage
   - `src/routes/`: <35% coverage

## Architecture

### Test Structure

```
tests/unit/
├── core/              # Core utilities and services
├── config/            # Configuration tests
├── database/          # Database connection and schema
├── repositories/      # Data access layer tests
├── services/          # Business logic tests
├── controllers/       # Controller tests
├── routes/            # Route handlers and DTOs
├── middlewares/       # Middleware tests
├── plugins/           # Elysia plugin tests
└── mocks/             # Shared mock utilities
```

### Mocking Strategy

#### Database Mocking

- Mock `drizzle-orm` operations using `vi.fn()` from Bun test
- Create typed mock interfaces for repositories
- Return predictable test data

#### Redis Mocking

- Mock ioredis client with in-memory Map
- Simulate TTL and expiration behavior
- Track operations for assertions

#### PASETO Mocking

- Use valid test tokens for success cases
- Manipulate tokens for error cases
- Mock token generation and verification

## Implementation Priority

### Phase 1: Fix Foundation (Critical)

1. Fix activity.repository mocking issues
2. Fix password.service test failures
3. Create shared mock utilities

### Phase 2: Repository Layer (High Impact)

1. base.repository.test.ts
2. users.repository.test.ts
3. sessions.repository.test.ts
4. products.repository.test.ts
5. activity.repository.test.ts
6. unit-of-work.test.ts

### Phase 3: Route Coverage (High Impact)

1. Improve auth.routes.test.ts (currently 17% lines)
2. Improve products.routes.test.ts (currently 17% lines)
3. Improve users.routes.test.ts (currently 20% lines)

### Phase 4: Missing Tests (Medium Priority)

1. config/ tests
2. database/connection.test.ts
3. database/schema/ tests
4. core/ utilities (redis, errors, http, validation)

### Phase 5: Low Coverage Areas (Medium Priority)

1. rate-limit.middleware (14% → 90%)
2. health.plugin (4% → 90%)
3. activity.service (26% → 85%)

## Testing Best Practices

### Test Organization

- **AAA Pattern**: Arrange, Act, Assert
- **Descriptive Names**: `should_<expected_behavior>_<when_condition>`
- **One Assertion Per Test**: Where practical
- **Test Isolation**: Each test is independent

### Mock Guidelines

- **Mock External Dependencies Only**: Don't mock code under test
- **Realistic Behavior**: Mocks should mimic real behavior
- **Clear Expectations**: Explicit mock return values
- **Clean Up**: Reset mocks after each test

### Coverage Goals

- **Target**: 85%+ functions and lines
- **Critical Paths**: 100% coverage
- **Error Handling**: All error paths tested
- **Edge Cases**: Boundary conditions covered

## Success Criteria

1. ✅ All tests passing (371+ tests)
2. ✅ 85%+ function coverage
3. ✅ 85%+ line coverage
4. ✅ No linter errors
5. ✅ No unused variables in tests
6. ✅ Test structure mirrors src structure

## Tools & Frameworks

- **Test Runner**: Bun Test (`bun test`)
- **Mocking**: `vi.fn()` from Bun
- **Coverage**: `bun test --coverage`
- **Linting**: ESLint with TypeScript rules
