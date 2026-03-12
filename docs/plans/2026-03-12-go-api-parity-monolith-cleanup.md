# Go API Parity + Monolith Cleanup Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Align this Bun + Elysia monolith API surface and response contract with the two Go boilerplates (auth, users, products), while removing currently unnecessary scheduler/upload/kubernetes artifacts.

**Architecture:** Keep a modular monolith (single deployable app) with Elysia HTTP, PostgreSQL + Drizzle for persistence, and Redis rate limiting. Standardize all API responses to the same envelope pattern used in the Go services.

**Tech Stack:** Bun, Elysia, TypeScript, PostgreSQL, Drizzle ORM, Redis, PASETO.

---

## API Parity Audit (Current vs Go)

### Reference targets
- `/Users/ignata/Desktop/Self Project/Project-Golang/go-microservices-kafka-boilerplate`
- `/Users/ignata/Desktop/Self Project/Project-Golang/go-microservices-redis-pubsub-boilerplate`

### Response envelope target (Go)
- `success: boolean`
- `message?: string`
- `data?: object`
- `meta: { timestamp: string, request_id?: string }`

### Endpoint parity table

| Domain | Endpoint | Go status | Bun current status | Gap |
|---|---|---|---|---|
| Auth | `POST /api/v1/auth/register` | Exists | `/auth/register` | Missing `/api/v1` prefix + envelope |
| Auth | `POST /api/v1/auth/login` | Exists | `/auth/login` | Missing `/api/v1` prefix + envelope |
| Auth | `POST /api/v1/auth/refresh` | Exists | `/auth/refresh` | Missing `/api/v1` prefix + envelope |
| Auth | `POST /api/v1/auth/logout` | Exists | `/auth/logout` | Missing `/api/v1` prefix + envelope |
| Auth | `GET /api/v1/auth/me` | Exists | `/auth/me` | Missing `/api/v1` prefix + envelope |
| Auth | `POST /api/v1/auth/change-password` | Exists | Missing | Needs implementation |
| Users | `GET /api/v1/users` | Exists | `/users` | Missing `/api/v1` prefix + envelope |
| Users | `GET /api/v1/users/:id` | Exists | `/users/:id` | Missing `/api/v1` prefix + envelope |
| Users | `POST /api/v1/users/:id/activate` | Exists | Missing | Needs implementation |
| Users | `POST /api/v1/users/:id/deactivate` | Exists | Missing | Needs implementation |
| Users | `DELETE /api/v1/users/:id` | Exists | `/users/:id` | Missing `/api/v1` prefix + soft-delete parity |
| Users | `POST /api/v1/users/:id/restore` | Exists | Missing | Needs implementation |
| Users | `GET /api/v1/activity-logs` | Exists | Missing | Needs implementation |
| Product | `GET /api/v1/products` | Exists | Missing | Needs implementation |
| Product | `GET /api/v1/products/:id` | Exists | Missing | Needs implementation |
| Product | `POST /api/v1/products` | Exists | Missing | Needs implementation |
| Product | `PUT /api/v1/products/:id` | Exists | Missing | Needs implementation |
| Product | `DELETE /api/v1/products/:id` | Exists | Missing | Needs implementation |
| Product | `POST /api/v1/products/:id/restore` | Exists | Missing | Needs implementation |
| Product | `PUT /api/v1/products/:id/stock` | Exists | Missing | Needs implementation |

### Scope cleanup audit

| Area | Current state | Decision |
|---|---|---|
| Scheduler/Cron | `src/core/scheduler` present | Remove now (out of scope) |
| Upload + Storage | `src/routes/upload.routes.ts`, `src/core/storage` present | Remove now (no object storage yet) |
| Kubernetes manifests | `infra/kubernetes` present | Remove now (Docker only) |

---

## Execution Tasks

### Task 1: Standardize API envelope + `/api/v1` base path
- Add a shared response helper to match Go envelope.
- Wrap app errors/404 in standardized envelope.
- Mount auth/users/products under `/api/v1`.

### Task 2: Complete auth + users parity endpoints
- Add `POST /api/v1/auth/change-password`.
- Add user activation/deactivation/restore/activity-log endpoints.
- Keep existing profile endpoints while ensuring Go-compatible endpoints exist.

### Task 3: Add product module end-to-end
- Add products schema + migration.
- Add product repository/service/controller/routes.
- Support CRUD + restore + stock update.

### Task 4: Clean unnecessary features/folders
- Remove upload route/DTO/middleware and storage module.
- Remove scheduler module.
- Remove Kubernetes manifests.
- Remove related tests and package dependencies no longer required.

### Task 5: Redis rate limit parity (IP + userId)
- Ensure key strategy supports authenticated userId and fallback to IP.

### Task 6: Verification
- Run test suite and fix breakages.
- Confirm endpoint list and response envelope parity in docs.

---

## Done Criteria
- All required Go parity endpoints exist under `/api/v1`.
- Success and error responses follow Go envelope (`success/message/data/meta`).
- Scheduler/upload/kubernetes artifacts removed from active codebase.
- Redis limiter supports userId and IP strategies.
- Tests pass in this repository.
