# API Design Standards

> 🌐 **Comprehensive guide to RESTful API design principles and conventions**

This document defines the API design standards and conventions used across the application.

---

## Table of Contents

- [RESTful Principles](#restful-principles)
- [URL Design](#url-design)
- [HTTP Methods](#http-methods)
- [Status Codes](#status-codes)
- [Request/Response Format](#requestresponse-format)
- [Authentication](#authentication)
- [Error Handling](#error-handling)
- [Versioning](#versioning)
- [Pagination](#pagination)

---

## RESTful Principles

### Resource-Based Design

```
┌─────────────────────────────────────────────────────────────┐
│                    RESTful Resources                        │
├─────────────────────────────────────────────────────────────┤
│  /api/users              → User collection                   │
│  /api/users/:id          → Specific user                    │
│  /api/users/:id/products → User's products                 │
│  /api/products           → Product collection                │
│  /api/products/:id       → Specific product                 │
└─────────────────────────────────────────────────────────────┘
```

### Design Principles

| Principle             | Description                          | Example                          |
| --------------------- | ------------------------------------ | -------------------------------- |
| **Resource-Oriented** | URLs represent resources             | `/api/users` not `/api/getUsers` |
| **HTTP Verbs**        | Use appropriate HTTP methods         | GET, POST, PUT, DELETE           |
| **Stateless**         | Each request contains all context    | PASETO tokens in header          |
| **Uniform Interface** | Consistent patterns across endpoints | Standard response format         |
| **Cacheable**         | Responses indicate cacheability      | Cache-Control headers            |

---

## URL Design

### URL Structure

```
/api/{version}/{resource}/{id}/{sub-resource}/{sub-id}
```

### Examples

```
# Resource collection
GET    /api/users
POST   /api/users

# Specific resource
GET    /api/users/:id
PATCH  /api/users/:id
DELETE /api/users/:id

# Sub-resources
GET    /api/users/:id/products
POST   /api/users/:id/products

# Nested sub-resources
GET    /api/users/:id/products/:id/reviews
POST   /api/users/:id/products/:id/reviews
```

### URL Naming Conventions

| Rule                    | Correct            | Incorrect         |
| ----------------------- | ------------------ | ----------------- |
| **Plural nouns**        | `/api/users`       | `/api/user`       |
| **Kebab-case**          | `/api/admin-users` | `/api/adminUsers` |
| **Lowercase**           | `/api/users`       | `/api/Users`      |
| **No file extensions**  | `/api/users`       | `/api/users.json` |
| **No trailing slashes** | `/api/users`       | `/api/users/`     |

### Query Parameters

```
# Filtering
GET /api/users?role=ADMIN&isActive=true

# Sorting
GET /api/products?sort=price:asc,name:desc

# Pagination
GET /api/products?page=1&limit=20

# Search
GET /api/users?search=john@example.com

# Include deleted
GET /api/users?includeDeleted=true

# Date range
GET /api/orders?from=2024-01-01&to=2024-12-31
```

---

## HTTP Methods

### Method Matrix

| Method     | Safe | Idempotent | Purpose           | Example                 |
| ---------- | ---- | ---------- | ----------------- | ----------------------- |
| **GET**    | ✅   | ✅         | Retrieve resource | `GET /api/users/:id`    |
| **POST**   | ❌   | ❌         | Create resource   | `POST /api/users`       |
| **PUT**    | ❌   | ✅         | Replace resource  | `PUT /api/users/:id`    |
| **PATCH**  | ❌   | ❌         | Update resource   | `PATCH /api/users/:id`  |
| **DELETE** | ❌   | ✅         | Delete resource   | `DELETE /api/users/:id` |

### Method Usage Guidelines

```typescript
// ✅ GET: Retrieve resource
GET /api/users
GET /api/users/:id
GET /api/users/:id/products

// ✅ POST: Create resource
POST /api/users
POST /api/users/:id/products
POST /api/auth/login

// ✅ PATCH: Partial update
PATCH /api/users/:id
PATCH /api/products/:id

// ✅ DELETE: Delete resource (soft delete by default)
DELETE /api/users/:id
DELETE /api/products/:id

// ⚠️ PUT: Full replacement (use sparingly)
PUT /api/users/:id/settings

// ❌ AVOID: RPC-style endpoints
GET /api/getUserById/:id
POST /api/createUser
POST /api/deleteUser/:id
```

---

## Status Codes

### Success Codes

| Code               | Meaning          | Usage                   |
| ------------------ | ---------------- | ----------------------- |
| **200 OK**         | Success          | GET, PATCH successful   |
| **201 Created**    | Resource created | POST successful         |
| **202 Accepted**   | Request accepted | Async operation started |
| **204 No Content** | Success, no body | DELETE successful       |

### Client Error Codes

| Code                      | Meaning                  | Usage                       |
| ------------------------- | ------------------------ | --------------------------- |
| **400 Bad Request**       | Invalid request          | Validation errors           |
| **401 Unauthorized**      | Authentication required  | Missing/invalid token       |
| **403 Forbidden**         | Insufficient permissions | Valid token, not authorized |
| **404 Not Found**         | Resource not found       | Resource doesn't exist      |
| **409 Conflict**          | Resource conflict        | Duplicate email, etc.       |
| **410 Gone**              | Resource deleted         | Soft-deleted resource       |
| **422 Unprocessable**     | Semantic errors          | Business rule violation     |
| **429 Too Many Requests** | Rate limit exceeded      | Too many requests           |

### Server Error Codes

| Code                        | Meaning          | Usage                |
| --------------------------- | ---------------- | -------------------- |
| **500 Internal Server**     | Unexpected error | Unhandled exceptions |
| **503 Service Unavailable** | Service down     | Maintenance mode     |

### Status Code Decision Tree

```
Request received
    │
    ├─▶ Authenticated?
    │   ├─ No → 401 Unauthorized
    │   └─ Yes ─▶ Authorized?
    │       ├─ No → 403 Forbidden
    │       └─ Yes ─▶ Valid input?
    │           ├─ No → 400 Bad Request
    │           └─ Yes ─▶ Resource exists?
    │               ├─ No → 404 Not Found
    │               └─ Yes ─▶ No conflicts?
    │                   ├─ No → 409 Conflict
    │                   └─ Yes ─▶ Success
    │                       ├─ Created → 201 Created
    │                       ├─ Updated → 200 OK
    │                       └─ Deleted → 204 No Content
```

---

## Request/Response Format

### Standard Response Format

```typescript
interface ApiResponse<T = unknown> {
  success: true | false;
  message: string;
  data?: T;
  error?: {
    code: string;
    message: string;
    details?: unknown;
  };
  meta?: {
    timestamp: string;
    requestId?: string;
    pagination?: PaginationMeta;
  };
}
```

### Success Response Examples

```typescript
// 200 OK - Single resource
{
  "success": true,
  "message": "User retrieved successfully",
  "data": {
    "id": "550e8400-e29b-41d4-a716-446655440000",
    "email": "user@example.com",
    "firstName": "John",
    "lastName": "Doe"
  },
  "meta": {
    "timestamp": "2025-03-09T12:34:56.789Z",
    "requestId": "req_abc123"
  }
}

// 200 OK - Collection with pagination
{
  "success": true,
  "message": "Users retrieved successfully",
  "data": [
    { "id": "1", "email": "user1@example.com" },
    { "id": "2", "email": "user2@example.com" }
  ],
  "meta": {
    "timestamp": "2025-03-09T12:34:56.789Z",
    "requestId": "req_abc123",
    "pagination": {
      "page": 1,
      "limit": 20,
      "total": 100,
      "totalPages": 5,
      "hasNext": true,
      "hasPrev": false
    }
  }
}

// 201 Created
{
  "success": true,
  "message": "User created successfully",
  "data": {
    "id": "550e8400-e29b-41d4-a716-446655440000",
    "email": "newuser@example.com"
  },
  "meta": {
    "timestamp": "2025-03-09T12:34:56.789Z",
    "requestId": "req_abc123"
  }
}
```

### Error Response Examples

```typescript
// 400 Bad Request - Validation error
{
  "success": false,
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Request validation failed",
    "details": [
      {
        "field": "email",
        "message": "Invalid email format",
        "code": "INVALID_EMAIL"
      },
      {
        "field": "password",
        "message": "Password must be at least 8 characters",
        "code": "PASSWORD_TOO_SHORT"
      }
    ]
  },
  "meta": {
    "timestamp": "2025-03-09T12:34:56.789Z",
    "requestId": "req_abc123"
  }
}

// 401 Unauthorized
{
  "success": false,
  "error": {
    "code": "UNAUTHORIZED",
    "message": "Authentication required"
  },
  "meta": {
    "timestamp": "2025-03-09T12:34:56.789Z",
    "requestId": "req_abc123"
  }
}

// 404 Not Found
{
  "success": false,
  "error": {
    "code": "USER_NOT_FOUND",
    "message": "User with ID 'abc123' not found"
  },
  "meta": {
    "timestamp": "2025-03-09T12:34:56.789Z",
    "requestId": "req_abc123"
  }
}

// 409 Conflict
{
  "success": false,
  "error": {
    "code": "USER_EXISTS",
    "message": "User with email 'user@example.com' already exists"
  },
  "meta": {
    "timestamp": "2025-03-09T12:34:56.789Z",
    "requestId": "req_abc123"
  }
}

// 500 Internal Server Error
{
  "success": false,
  "error": {
    "code": "INTERNAL_ERROR",
    "message": "An unexpected error occurred"
  },
  "meta": {
    "timestamp": "2025-03-09T12:34:56.789Z",
    "requestId": "req_abc123"
  }
}
```

---

## Authentication

### Token Format

```
Authorization: Bearer <paseto_token>
```

### Protected Endpoint Example

```typescript
// ✅ Good: Clear authentication requirement
GET /api/users/me
Authorization: Bearer v4.local.encrypted_token_here

// ❌ Bad: Query parameter authentication
GET /api/users/me?token=v4.local.encrypted_token_here
```

### Token Refresh

```typescript
// POST /api/auth/refresh
{
  "refreshToken": "v4.local.encrypted_refresh_token"
}

// Response
{
  "success": true,
  "message": "Token refreshed successfully",
  "data": {
    "accessToken": "v4.local.new_access_token",
    "refreshToken": "v4.local.new_refresh_token",
    "expiresIn": 900
  }
}
```

---

## Error Handling

### Error Code Format

```
{RESOURCE}_{ACTION}_ERROR
```

### Common Error Codes

| Code                  | Status | Description               |
| --------------------- | ------ | ------------------------- |
| `VALIDATION_ERROR`    | 400    | Request validation failed |
| `INVALID_CREDENTIALS` | 401    | Login failed              |
| `TOKEN_EXPIRED`       | 401    | PASETO token expired      |
| `INVALID_TOKEN`       | 401    | Invalid token format      |
| `FORBIDDEN`           | 403    | Insufficient permissions  |
| `USER_NOT_FOUND`      | 404    | User doesn't exist        |
| `PRODUCT_NOT_FOUND`   | 404    | Product doesn't exist     |
| `USER_EXISTS`         | 409    | Email already registered  |
| `INTERNAL_ERROR`      | 500    | Unexpected error          |

---

## Versioning

### Versioning Strategy

```
URL-based versioning (recommended for this project)

/api/v1/users
/api/v2/users

Header-based versioning (alternative)
GET /api/users
Api-Version: 1.0
```

### Version Guidelines

| Version | Stability | Changes                   |
| ------- | --------- | ------------------------- |
| **v1**  | Stable    | No breaking changes       |
| **v2**  | Beta      | Breaking changes possible |

### Backward Compatibility

```typescript
// ✅ Good: Add new fields without breaking
{
  "id": "123",
  "email": "user@example.com",
  "phone": "+1234567890"  // New field
}

// ❌ Bad: Remove or rename fields
{
  "id": "123",
  "userEmail": "user@example.com"  // Was "email"
}
```

---

## Pagination

### Request Format

```
GET /api/products?page=1&limit=20
```

### Response Format

```typescript
{
  "success": true,
  "message": "Products retrieved successfully",
  "data": [...],
  "meta": {
    "pagination": {
      "page": 1,           // Current page
      "limit": 20,         // Items per page
      "total": 100,        // Total items
      "totalPages": 5,     // Total pages
      "hasNext": true,     // Has next page
      "hasPrev": false     // Has previous page
    }
  }
}
```

### Pagination Calculation

```typescript
const totalPages = Math.ceil(total / limit);
const hasNext = page < totalPages;
const hasPrev = page > 1;
```

### Pagination Best Practices

| Practice          | Description                        |
| ----------------- | ---------------------------------- |
| **Default limit** | 20 items                           |
| **Max limit**     | 100 items                          |
| **Zero-indexed**  | Page starts at 1                   |
| **Include meta**  | Always include pagination metadata |

---

## Filtering and Sorting

### Filtering

```
# Single filter
GET /api/users?role=ADMIN

# Multiple filters
GET /api/users?role=ADMIN&isActive=true

# Range filters
GET /api/products?minPrice=10&maxPrice=100

# Boolean filters
GET /api/users?includeDeleted=true
```

### Sorting

```
# Single sort
GET /api/products?sort=price:asc

# Multiple sorts
GET /api/products?sort=price:asc,name:desc

# Sort direction
:asc  - Ascending (default)
:desc - Descending
```

---

## Rate Limiting

### Rate Limit Headers

```
X-RateLimit-Limit: 100
X-RateLimit-Remaining: 95
X-RateLimit-Reset: 1646827200
```

### Rate Limit Error

```typescript
{
  "success": false,
  "error": {
    "code": "RATE_LIMIT_EXCEEDED",
    "message": "Too many requests. Please try again later.",
    "details": {
      "retryAfter": 60
    }
  }
}
```

---

## CORS

### CORS Headers

```
Access-Control-Allow-Origin: *
Access-Control-Allow-Methods: GET, POST, PUT, DELETE, PATCH
Access-Control-Allow-Headers: Content-Type, Authorization
Access-Control-Allow-Credentials: true
Access-Control-Max-Age: 86400
```

---

## API Documentation

### Swagger/OpenAPI

```typescript
// Include in route definition
{
  detail: {
    summary: 'Get user by ID',
    description: 'Retrieves a user by their unique identifier',
    tags: ['Users'],
    security: [{ Bearer: [] }],
    parameters: [
      {
        name: 'id',
        in: 'path',
        required: true,
        schema: { type: 'string', format: 'uuid' }
      }
    ],
    responses: {
      200: {
        description: 'User found',
        content: {
          'application/json': {
            schema: UserResponseSchema
          }
        }
      },
      404: {
        description: 'User not found',
        content: {
          'application/json': {
            schema: ErrorResponseSchema
          }
        }
      }
    }
  }
}
```

---

## Checklist

Before implementing an endpoint:

- [ ] Follows RESTful conventions
- [ ] Uses appropriate HTTP method
- [ ] Returns correct status codes
- [ ] Follows standard response format
- [ ] Includes error handling
- [ ] Has pagination for list endpoints
- [ ] Is documented in Swagger
- [ ] Has rate limiting (if needed)
- [ ] Includes validation schemas
- [ ] Logs important operations

---

**Last Updated:** 2025-03-09

**Version:** 1.0.0
