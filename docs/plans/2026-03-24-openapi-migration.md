# OpenAPI Migration Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Migrate from `@elysiajs/swagger` to `@elysiajs/openapi` with comprehensive API documentation including request/response examples, authentication requirements, and clear descriptions.

**Architecture:** Replace the swagger plugin with openapi plugin, integrate `zod-to-json-schema` for Zod schema conversion, and add detailed `detail` objects to all routes with examples, descriptions, and security requirements.

**Tech Stack:** ElysiaJS, @elysiajs/openapi, zod-to-json-schema, Zod v3

---

## Overview

This migration will:

1. Replace `@elysiajs/swagger` with `@elysiajs/openapi` (newer, better Zod support)
2. Add `zod-to-json-schema` for proper schema conversion
3. Add comprehensive documentation to all 18 API endpoints
4. Include request body examples for all POST/PATCH/PUT endpoints
5. Document authentication requirements (PASETO Bearer token)
6. Add response schemas and error documentation

---

## Task 1: Install Dependencies

**Files:**

- Modify: `package.json`

**Step 1: Install openapi and zod-to-json-schema**

Run:

```bash
bun add @elysiajs/openapi zod-to-json-schema
```

Expected: Packages installed successfully

**Step 2: Verify installation**

Run:

```bash
bun pm ls | grep -E "openapi|zod-to-json-schema"
```

Expected: Both packages listed

---

## Task 2: Create OpenAPI Configuration Helper

**Files:**

- Create: `src/core/openapi/config.ts`

**Step 1: Create the OpenAPI configuration file**

```typescript
/**
 * OpenAPI Configuration
 *
 * Centralized configuration for OpenAPI documentation.
 * Integrates Zod schema conversion for proper API documentation.
 */

import { openapi } from '@elysiajs/openapi';
import { zodToJsonSchema } from 'zod-to-json-schema';

/**
 * OpenAPI documentation info
 */
export const openApiInfo = {
  title: 'Bun Elysia PASETO API',
  version: '1.0.0',
  description: `
Monolith REST API with PASETO authentication.

## Authentication

Most endpoints require Bearer token authentication using PASETO tokens.
Include the access token in the Authorization header:

\`\`\`
Authorization: Bearer <your_access_token>
\`\`\`

## Getting Started

1. Register a new account via \`POST /api/v1/auth/register\`
2. Login to get access and refresh tokens via \`POST /api/v1/auth/login\`
3. Use the access token for authenticated requests
4. Refresh tokens when expired via \`POST /api/v1/auth/refresh\`

## Rate Limiting

All endpoints are rate-limited. Check the \`X-RateLimit-Limit\`,
\`X-RateLimit-Remaining\`, and \`X-RateLimit-Reset\` headers for current limits.
`,
  license: {
    name: 'MIT',
    url: 'https://opensource.org/licenses/MIT',
  },
  contact: {
    name: 'API Support',
    email: 'aldoignatachandra@gmail.com',
  },
};

/**
 * OpenAPI tags for endpoint organization
 */
export const openApiTags = [
  {
    name: 'Authentication',
    description:
      'User authentication and token management endpoints. These endpoints handle registration, login, logout, and token refresh operations.',
  },
  {
    name: 'Users',
    description:
      'User management endpoints. Includes profile management, user administration, and activity logs. Most endpoints require authentication.',
  },
  {
    name: 'Products',
    description:
      'Product management endpoints. CRUD operations for products including variants, stock management, and soft delete functionality. All endpoints require authentication.',
  },
  {
    name: 'Health',
    description: 'Health check endpoints for monitoring and Kubernetes probes. Includes database and Redis health checks.',
  },
];

/**
 * Security scheme for Bearer token authentication
 */
export const bearerSecurity = {
  BearerAuth: {
    type: 'http' as const,
    scheme: 'bearer',
    bearerFormat: 'PASETO',
    description: 'PASETO token authentication. Obtain tokens from /api/v1/auth/login or /api/v1/auth/register',
  },
};

/**
 * Create OpenAPI plugin with Zod schema mapping
 */
export function createOpenApiConfig() {
  return openapi({
    documentation: {
      info: openApiInfo,
      tags: openApiTags,
      components: {
        securitySchemes: bearerSecurity,
      },
    },
    mapJsonSchema: {
      zod: zodToJsonSchema,
    },
  });
}
```

**Step 2: Create index file for openapi module**

Create: `src/core/openapi/index.ts`

```typescript
/**
 * OpenAPI Module
 *
 * Exports OpenAPI configuration and utilities.
 */

export * from './config';
```

---

## Task 3: Create API Examples Helper

**Files:**

- Create: `src/core/openapi/examples.ts`

**Step 1: Create examples for all request bodies**

```typescript
/**
 * OpenAPI Examples
 *
 * Request and response examples for API documentation.
 * These examples are used in Swagger UI to help developers understand
 * the expected request/response formats.
 */

/**
 * Authentication examples
 */
export const authExamples = {
  registerRequest: {
    summary: 'Register new user',
    value: {
      email: 'john.doe@example.com',
      username: 'johndoe',
      password: 'SecureP@ss123',
      name: 'John Doe',
    },
  },
  registerRequestWithFirstLastName: {
    summary: 'Register with first/last name',
    value: {
      email: 'jane.smith@example.com',
      username: 'janesmith',
      password: 'SecureP@ss123',
      firstName: 'Jane',
      lastName: 'Smith',
    },
  },
  loginRequest: {
    summary: 'Login credentials',
    value: {
      email: 'john.doe@example.com',
      password: 'SecureP@ss123',
    },
  },
  refreshRequest: {
    summary: 'Refresh token',
    value: {
      refreshToken: 'v2.local.xxx...',
    },
  },
  changePasswordRequest: {
    summary: 'Change password',
    value: {
      currentPassword: 'OldSecureP@ss123',
      newPassword: 'NewSecureP@ss456',
    },
  },
};

/**
 * User examples
 */
export const userExamples = {
  updateProfile: {
    summary: 'Update user profile',
    value: {
      name: 'John Updated',
      username: 'johnupdated',
    },
  },
  getUsersQuery: {
    summary: 'List users with pagination',
    value: {
      page: 1,
      limit: 20,
      search: 'john',
      include_deleted: false,
    },
  },
  activityQuery: {
    summary: 'Get activity logs',
    value: {
      page: 1,
      limit: 10,
      action: 'LOGIN',
      resource: 'auth',
    },
  },
};

/**
 * Product examples
 */
export const productExamples = {
  createProduct: {
    summary: 'Create simple product',
    value: {
      name: 'Wireless Mouse',
      price: 29.99,
      stock: 100,
      images: 'https://example.com/mouse.jpg',
    },
  },
  createProductWithVariants: {
    summary: 'Create product with variants',
    value: {
      name: 'T-Shirt',
      price: 19.99,
      stock: 50,
      attributes: [
        {
          name: 'Size',
          values: ['S', 'M', 'L', 'XL'],
          displayOrder: 1,
        },
        {
          name: 'Color',
          values: ['Red', 'Blue', 'Black'],
          displayOrder: 2,
        },
      ],
      variants: [
        {
          name: 'T-Shirt - Small Red',
          sku: 'TSH-S-RED',
          price: 19.99,
          stock: 10,
          isActive: true,
          attributeValues: {
            Size: 'S',
            Color: 'Red',
          },
        },
      ],
    },
  },
  updateProduct: {
    summary: 'Update product',
    value: {
      name: 'Wireless Mouse Pro',
      price: 39.99,
      stock: 150,
    },
  },
  updateStock: {
    summary: 'Update product stock',
    value: {
      stock: 200,
    },
  },
  getProductsQuery: {
    summary: 'List products with filters',
    value: {
      page: 1,
      limit: 20,
      search: 'mouse',
      include_deleted: false,
      inStock: true,
      minPrice: 10,
      maxPrice: 100,
    },
  },
};

/**
 * Common response examples
 */
export const responseExamples = {
  success: {
    summary: 'Success response',
    value: {
      success: true,
      data: {},
      requestId: 'req_abc123',
    },
  },
  error400: {
    summary: 'Validation error',
    value: {
      success: false,
      error: {
        name: 'ValidationError',
        code: 'VALIDATION_ERROR',
        message: 'Invalid input data',
        status: 400,
        details: [
          {
            field: 'email',
            message: 'Invalid email format',
          },
        ],
      },
      requestId: 'req_abc123',
    },
  },
  error401: {
    summary: 'Unauthorized error',
    value: {
      success: false,
      error: {
        name: 'UnauthorizedError',
        code: 'UNAUTHORIZED',
        message: 'Authentication required',
        status: 401,
      },
      requestId: 'req_abc123',
    },
  },
  error429: {
    summary: 'Rate limit exceeded',
    value: {
      success: false,
      error: {
        name: 'TooManyRequestsError',
        code: 'TOO_MANY_REQUESTS',
        message: 'Too many requests',
        status: 429,
        details: {
          limit: 100,
          remaining: 0,
          reset: 1711286400,
        },
      },
      requestId: 'req_abc123',
    },
  },
};

/**
 * Helper to create detail object with examples
 */
export function withExamples<T extends Record<string, unknown>>(detail: T, bodyExample?: { summary: string; value: unknown }): T {
  if (!bodyExample) return detail;

  return {
    ...detail,
    requestBody: {
      content: {
        'application/json': {
          examples: {
            example: bodyExample,
          },
        },
      },
    },
  };
}
```

---

## Task 4: Create Route Detail Definitions

**Files:**

- Create: `src/routes/details/auth.details.ts`
- Create: `src/routes/details/users.details.ts`
- Create: `src/routes/details/products.details.ts`

**Step 1: Create auth route details**

Create: `src/routes/details/auth.details.ts`

```typescript
/**
 * Authentication Route Details
 *
 * OpenAPI detail definitions for authentication endpoints.
 */

import { authExamples } from '@/core/openapi/examples';

/**
 * Security requirement for authenticated endpoints
 */
export const requireAuth = [{ BearerAuth: [] }];

/**
 * Route detail definitions
 */
export const authDetails = {
  register: {
    summary: 'Register a new user',
    description: `
Creates a new user account and returns authentication tokens.

**No authentication required.**

The endpoint accepts either:
- \`name\` field alone, OR
- \`firstName\` and \`lastName\` fields

Password requirements:
- At least 8 characters
- At least one lowercase letter
- At least one uppercase letter
- At least one number
- At least one special character
`,
    tags: ['Authentication'],
    requestBody: {
      content: {
        'application/json': {
          examples: {
            withName: authExamples.registerRequest,
            withFirstLastName: authExamples.registerRequestWithFirstLastName,
          },
        },
      },
    },
    responses: {
      201: {
        description: 'User registered successfully',
      },
      400: {
        description: 'Validation error - invalid input data',
      },
      409: {
        description: 'Conflict - email or username already exists',
      },
      429: {
        description: 'Too many registration attempts',
      },
    },
  },

  login: {
    summary: 'Login to get tokens',
    description: `
Authenticates a user and returns access and refresh tokens.

**No authentication required.**

Returns:
- \`accessToken\`: Short-lived token (15 minutes by default)
- \`refreshToken\`: Long-lived token (7 days by default)
- \`expiresIn\`: Access token expiration time in seconds
`,
    tags: ['Authentication'],
    requestBody: {
      content: {
        'application/json': {
          example: authExamples.loginRequest.value,
        },
      },
    },
    responses: {
      200: {
        description: 'Login successful',
      },
      400: {
        description: 'Validation error - invalid input data',
      },
      401: {
        description: 'Invalid credentials',
      },
      429: {
        description: 'Too many login attempts',
      },
    },
  },

  refresh: {
    summary: 'Refresh access token',
    description: `
Get a new access token using a refresh token.

**No authentication required.**

Provide either \`token\` or \`refreshToken\` in the request body.
Returns new access and refresh tokens.
`,
    tags: ['Authentication'],
    requestBody: {
      content: {
        'application/json': {
          example: authExamples.refreshRequest.value,
        },
      },
    },
    responses: {
      200: {
        description: 'Token refreshed successfully',
      },
      400: {
        description: 'Validation error - token required',
      },
      401: {
        description: 'Invalid or expired refresh token',
      },
    },
  },

  logout: {
    summary: 'Logout current session',
    description: `
Invalidates the current access token.

**Requires authentication.**

The token will be added to a blacklist and cannot be used again.
`,
    tags: ['Authentication'],
    security: requireAuth,
    responses: {
      200: {
        description: 'Logout successful',
      },
      401: {
        description: 'Authentication required',
      },
    },
  },

  me: {
    summary: 'Get current user profile',
    description: `
Returns the authenticated user's profile information.

**Requires authentication.**
`,
    tags: ['Authentication'],
    security: requireAuth,
    responses: {
      200: {
        description: 'User profile retrieved',
      },
      401: {
        description: 'Authentication required',
      },
    },
  },

  changePassword: {
    summary: 'Change user password',
    description: `
Changes the authenticated user's password.

**Requires authentication.**

Accepts either:
- \`old_password\` and \`new_password\`, OR
- \`currentPassword\` and \`newPassword\`

New password must meet the same requirements as registration.
`,
    tags: ['Authentication'],
    security: requireAuth,
    requestBody: {
      content: {
        'application/json': {
          example: authExamples.changePasswordRequest.value,
        },
      },
    },
    responses: {
      200: {
        description: 'Password changed successfully',
      },
      400: {
        description: 'Validation error - invalid input',
      },
      401: {
        description: 'Authentication required or invalid current password',
      },
    },
  },
};
```

**Step 2: Create users route details**

Create: `src/routes/details/users.details.ts`

```typescript
/**
 * Users Route Details
 *
 * OpenAPI detail definitions for user management endpoints.
 */

import { userExamples } from '@/core/openapi/examples';
import { requireAuth } from './auth.details';

export const usersDetails = {
  getMe: {
    summary: 'Get current user profile',
    description: `
Returns the authenticated user's profile with full details.

**Requires authentication.**

This is an alias for \`GET /api/v1/auth/me\`.
`,
    tags: ['Users'],
    security: requireAuth,
    responses: {
      200: {
        description: 'User profile retrieved',
      },
      401: {
        description: 'Authentication required',
      },
    },
  },

  updateMe: {
    summary: 'Update current user profile',
    description: `
Updates the authenticated user's profile.

**Requires authentication.**

Only provided fields will be updated.
`,
    tags: ['Users'],
    security: requireAuth,
    requestBody: {
      content: {
        'application/json': {
          example: userExamples.updateProfile.value,
        },
      },
    },
    responses: {
      200: {
        description: 'Profile updated successfully',
      },
      400: {
        description: 'Validation error',
      },
      401: {
        description: 'Authentication required',
      },
      409: {
        description: 'Username already taken',
      },
    },
  },

  getUsers: {
    summary: 'List all users',
    description: `
Returns a paginated list of users.

**Requires authentication.**

Supports search and filtering options.
`,
    tags: ['Users'],
    security: requireAuth,
    responses: {
      200: {
        description: 'Users retrieved successfully',
      },
      401: {
        description: 'Authentication required',
      },
    },
  },

  getUserStats: {
    summary: 'Get user statistics',
    description: `
Returns statistics about users (total count, active, etc.).

**Requires authentication.**
`,
    tags: ['Users'],
    security: requireAuth,
    responses: {
      200: {
        description: 'Statistics retrieved',
      },
      401: {
        description: 'Authentication required',
      },
    },
  },

  getUserById: {
    summary: 'Get user by ID',
    description: `
Returns a specific user's profile by their ID.

**Requires authentication.**
`,
    tags: ['Users'],
    security: requireAuth,
    responses: {
      200: {
        description: 'User retrieved successfully',
      },
      401: {
        description: 'Authentication required',
      },
      404: {
        description: 'User not found',
      },
    },
  },

  activateUser: {
    summary: 'Activate a user',
    description: `
Activates a deactivated user account.

**Requires authentication.**
`,
    tags: ['Users'],
    security: requireAuth,
    responses: {
      200: {
        description: 'User activated successfully',
      },
      401: {
        description: 'Authentication required',
      },
      404: {
        description: 'User not found',
      },
    },
  },

  deactivateUser: {
    summary: 'Deactivate a user',
    description: `
Deactivates a user account (soft disable).

**Requires authentication.**

Deactivated users cannot login but their data is preserved.
`,
    tags: ['Users'],
    security: requireAuth,
    responses: {
      200: {
        description: 'User deactivated successfully',
      },
      401: {
        description: 'Authentication required',
      },
      404: {
        description: 'User not found',
      },
    },
  },

  deleteUser: {
    summary: 'Delete a user',
    description: `
Deletes a user account.

**Requires authentication.**

By default, performs a soft delete. Use \`?force=true\` for permanent deletion.
`,
    tags: ['Users'],
    security: requireAuth,
    responses: {
      200: {
        description: 'User deleted successfully',
      },
      401: {
        description: 'Authentication required',
      },
      404: {
        description: 'User not found',
      },
    },
  },

  restoreUser: {
    summary: 'Restore a deleted user',
    description: `
Restores a soft-deleted user account.

**Requires authentication.**
`,
    tags: ['Users'],
    security: requireAuth,
    responses: {
      200: {
        description: 'User restored successfully',
      },
      401: {
        description: 'Authentication required',
      },
      404: {
        description: 'User not found or not deleted',
      },
    },
  },

  getActivityLogs: {
    summary: 'Get activity logs',
    description: `
Returns paginated activity logs.

**Requires authentication.**

Can filter by user, action, and resource type.
`,
    tags: ['Users'],
    security: requireAuth,
    responses: {
      200: {
        description: 'Activity logs retrieved',
      },
      401: {
        description: 'Authentication required',
      },
    },
  },
};
```

**Step 3: Create products route details**

Create: `src/routes/details/products.details.ts`

```typescript
/**
 * Products Route Details
 *
 * OpenAPI detail definitions for product management endpoints.
 */

import { productExamples } from '@/core/openapi/examples';
import { requireAuth } from './auth.details';

export const productsDetails = {
  createProduct: {
    summary: 'Create a new product',
    description: `
Creates a new product.

**Requires authentication.**

Can create:
- Simple products (just name, price, stock)
- Products with variants (requires attributes definition)

When creating variants, you must also provide attributes.
Each variant must have attributeValues matching the defined attributes.
`,
    tags: ['Products'],
    security: requireAuth,
    requestBody: {
      content: {
        'application/json': {
          examples: {
            simple: productExamples.createProduct,
            withVariants: productExamples.createProductWithVariants,
          },
        },
      },
    },
    responses: {
      201: {
        description: 'Product created successfully',
      },
      400: {
        description: 'Validation error',
      },
      401: {
        description: 'Authentication required',
      },
    },
  },

  getProductById: {
    summary: 'Get product by ID',
    description: `
Returns a specific product by its ID.

**Requires authentication.**

Options:
- \`include_deleted\`: Include soft-deleted products
- \`includeVariants\`: Include product variants in response
`,
    tags: ['Products'],
    security: requireAuth,
    responses: {
      200: {
        description: 'Product retrieved successfully',
      },
      401: {
        description: 'Authentication required',
      },
      404: {
        description: 'Product not found',
      },
    },
  },

  getProducts: {
    summary: 'List all products',
    description: `
Returns a paginated list of products.

**Requires authentication.**

Supports filtering by:
- Search term (name)
- Price range
- Stock status
- Variant status
- Deletion status
`,
    tags: ['Products'],
    security: requireAuth,
    responses: {
      200: {
        description: 'Products retrieved successfully',
      },
      401: {
        description: 'Authentication required',
      },
    },
  },

  patchProduct: {
    summary: 'Partially update a product',
    description: `
Partially updates a product (only provided fields).

**Requires authentication.**
`,
    tags: ['Products'],
    security: requireAuth,
    requestBody: {
      content: {
        'application/json': {
          example: productExamples.updateProduct.value,
        },
      },
    },
    responses: {
      200: {
        description: 'Product updated successfully',
      },
      400: {
        description: 'Validation error',
      },
      401: {
        description: 'Authentication required',
      },
      404: {
        description: 'Product not found',
      },
    },
  },

  putProduct: {
    summary: 'Fully update a product',
    description: `
Fully updates a product (replaces all fields).

**Requires authentication.**
`,
    tags: ['Products'],
    security: requireAuth,
    requestBody: {
      content: {
        'application/json': {
          example: productExamples.updateProduct.value,
        },
      },
    },
    responses: {
      200: {
        description: 'Product updated successfully',
      },
      400: {
        description: 'Validation error',
      },
      401: {
        description: 'Authentication required',
      },
      404: {
        description: 'Product not found',
      },
    },
  },

  deleteProduct: {
    summary: 'Delete a product',
    description: `
Deletes a product.

**Requires authentication.**

By default, performs a soft delete. Use \`?force=true\` for permanent deletion.
`,
    tags: ['Products'],
    security: requireAuth,
    responses: {
      200: {
        description: 'Product deleted successfully',
      },
      401: {
        description: 'Authentication required',
      },
      404: {
        description: 'Product not found',
      },
    },
  },

  restoreProduct: {
    summary: 'Restore a deleted product',
    description: `
Restores a soft-deleted product.

**Requires authentication.**
`,
    tags: ['Products'],
    security: requireAuth,
    responses: {
      200: {
        description: 'Product restored successfully',
      },
      401: {
        description: 'Authentication required',
      },
      404: {
        description: 'Product not found or not deleted',
      },
    },
  },

  updateStock: {
    summary: 'Update product stock',
    description: `
Updates the stock quantity for a product.

**Requires authentication.**

Sets the absolute stock value (not incremental).
`,
    tags: ['Products'],
    security: requireAuth,
    requestBody: {
      content: {
        'application/json': {
          example: productExamples.updateStock.value,
        },
      },
    },
    responses: {
      200: {
        description: 'Stock updated successfully',
      },
      400: {
        description: 'Validation error',
      },
      401: {
        description: 'Authentication required',
      },
      404: {
        description: 'Product not found',
      },
    },
  },
};
```

**Step 4: Create index file**

Create: `src/routes/details/index.ts`

```typescript
/**
 * Route Details Index
 *
 * Exports all route detail definitions for OpenAPI documentation.
 */

export * from './auth.details';
export * from './users.details';
export * from './products.details';
```

---

## Task 5: Update Auth Routes with Details

**Files:**

- Modify: `src/routes/auth.routes.ts`

**Step 1: Add detail imports**

Add to the top of the file after existing imports:

```typescript
import { authDetails } from './details/auth.details';
```

**Step 2: Update register route**

Replace the register route's third argument:

```typescript
.post(
  '/register',
  async ctx => {
    // ... existing handler code ...
  },
  {
    beforeHandle: [limiters.register],
    body: registerRequestSchema,
    detail: authDetails.register,
  }
)
```

**Step 3: Update login route**

```typescript
.post(
  '/login',
  async ctx => {
    // ... existing handler code ...
  },
  {
    beforeHandle: [limiters.login],
    body: loginRequestSchema,
    detail: authDetails.login,
  }
)
```

**Step 4: Update refresh route**

```typescript
.post(
  '/refresh',
  async ctx => {
    // ... existing handler code ...
  },
  {
    beforeHandle: [limiters.refresh],
    body: refreshRequestSchema,
    detail: authDetails.refresh,
  }
)
```

**Step 5: Update logout route**

```typescript
.post(
  '/logout',
  async ctx => {
    // ... existing handler code ...
  },
  {
    beforeHandle: [auth, limiters.logout],
    detail: authDetails.logout,
  }
)
```

**Step 6: Update me route**

```typescript
.get(
  '/me',
  async ctx => {
    // ... existing handler code ...
  },
  {
    beforeHandle: [auth, limiters.me],
    detail: authDetails.me,
  }
)
```

**Step 7: Update change-password route**

```typescript
.post(
  '/change-password',
  async ctx => {
    // ... existing handler code ...
  },
  {
    beforeHandle: [auth, limiters.changePassword],
    body: changePasswordRequestSchema,
    detail: authDetails.changePassword,
  }
)
```

---

## Task 6: Update Users Routes with Details

**Files:**

- Modify: `src/routes/users.routes.ts`

**Step 1: Add detail imports**

Add to imports:

```typescript
import { usersDetails } from './details/users.details';
```

**Step 2: Add detail to all user routes**

For each route, add the corresponding detail:

```typescript
.get('/me', handler, { beforeHandle: [auth, limiters.me], detail: usersDetails.getMe })
.patch('/me', handler, { beforeHandle: [auth, limiters.me], body: updateProfileSchema, detail: usersDetails.updateMe })
.get('/', handler, { beforeHandle: [auth, limiters.list], query: getUsersQuerySchema, detail: usersDetails.getUsers })
.get('/stats', handler, { beforeHandle: [auth, limiters.stats], detail: usersDetails.getUserStats })
.get('/:id', handler, { beforeHandle: [auth, limiters.byId], params: userIdParamSchema, detail: usersDetails.getUserById })
.post('/:id/activate', handler, { beforeHandle: [auth, limiters.activate], params: userIdParamSchema, detail: usersDetails.activateUser })
.post('/:id/deactivate', handler, { beforeHandle: [auth, limiters.deactivate], params: userIdParamSchema, detail: usersDetails.deactivateUser })
.delete('/:id', handler, { beforeHandle: [auth, limiters.byId], params: userIdParamSchema, query: deleteUserQuerySchema, detail: usersDetails.deleteUser })
.post('/:id/restore', handler, { beforeHandle: [auth, limiters.restore], params: userIdParamSchema, detail: usersDetails.restoreUser })
```

**Step 3: Update activity-logs route**

```typescript
.get('/', handler, { beforeHandle: [auth, limiters.activityLogs], query: activityQuerySchema, detail: usersDetails.getActivityLogs })
```

---

## Task 7: Update Products Routes with Details

**Files:**

- Modify: `src/routes/products.routes.ts`

**Step 1: Add detail imports**

Add to imports:

```typescript
import { productsDetails } from './details/products.details';
```

**Step 2: Add detail to all product routes**

For each route, add the corresponding detail:

```typescript
.post('/', handler, { beforeHandle: [auth, limiters.create], body: createProductSchema, detail: productsDetails.createProduct })
.get('/:id', handler, { beforeHandle: [auth, limiters.getById], params: productIdParamSchema, query: getProductQuerySchema, detail: productsDetails.getProductById })
.get('/', handler, { beforeHandle: [auth, limiters.list], query: getProductsQuerySchema, detail: productsDetails.getProducts })
.patch('/:id', handler, { beforeHandle: [auth, limiters.patch], params: productIdParamSchema, body: updateProductSchema, detail: productsDetails.patchProduct })
.put('/:id', handler, { beforeHandle: [auth, limiters.update], params: productIdParamSchema, body: updateProductSchema, detail: productsDetails.putProduct })
.delete('/:id', handler, { beforeHandle: [auth, limiters.remove], params: productIdParamSchema, query: deleteProductQuerySchema, detail: productsDetails.deleteProduct })
.post('/:id/restore', handler, { beforeHandle: [auth, limiters.restore], params: productIdParamSchema, detail: productsDetails.restoreProduct })
.put('/:id/stock', handler, { beforeHandle: [auth, limiters.stock], params: productIdParamSchema, body: updateStockSchema, detail: productsDetails.updateStock })
```

---

## Task 8: Update App.ts to Use OpenAPI

**Files:**

- Modify: `src/app.ts`

**Step 1: Replace swagger import with openapi**

Replace:

```typescript
import { swagger } from '@elysiajs/swagger';
```

With:

```typescript
import { createOpenApiConfig } from './core/openapi';
```

**Step 2: Replace swagger usage**

Replace:

```typescript
.use(
  swagger({
    documentation: {
      info: {
        title: 'Bun Elysia PASETO API',
        version: '1.0.0',
        description: 'Monolith REST API with PASETO authentication',
      },
      tags: [
        { name: 'Authentication', description: 'User authentication endpoints' },
        { name: 'Users', description: 'User management endpoints' },
        { name: 'Products', description: 'Product management endpoints' },
      ],
    },
  })
)
```

With:

```typescript
.use(createOpenApiConfig())
```

---

## Task 9: Update Health Plugin Details

**Files:**

- Modify: `src/plugins/health.plugin.ts`

**Step 1: Add detail objects to health endpoints**

Update the health endpoints to have proper detail:

```typescript
.get(
  '/health',
  async () => {
    // ... existing handler ...
  },
  {
    detail: {
      summary: 'Health check endpoint',
      description: 'Returns the health status of the application including database and Redis connectivity checks. Returns 503 if any service is unhealthy.',
      tags: ['Health'],
      responses: {
        200: {
          description: 'All services healthy',
        },
        503: {
          description: 'One or more services unhealthy',
        },
      },
    },
  }
)
.get(
  '/health/ready',
  () => {
    // ... existing handler ...
  },
  {
    detail: {
      summary: 'Readiness probe',
      description: 'Kubernetes readiness probe endpoint. Returns 200 if the application is ready to receive traffic.',
      tags: ['Health'],
    },
  }
)
.get(
  '/health/live',
  () => {
    // ... existing handler ...
  },
  {
    detail: {
      summary: 'Liveness probe',
      description: 'Kubernetes liveness probe endpoint. Returns 200 if the application is running.',
      tags: ['Health'],
    },
  }
)
```

---

## Task 10: Remove Old Swagger Package

**Files:**

- Modify: `package.json`

**Step 1: Remove old swagger package**

Run:

```bash
bun remove @elysiajs/swagger
```

**Step 2: Verify removal**

Run:

```bash
bun pm ls | grep swagger
```

Expected: No output (swagger removed)

---

## Task 11: Test the Migration

**Step 1: Start the server**

Run:

```bash
bun run dev
```

Expected: Server starts without errors

**Step 2: Access OpenAPI documentation**

Open browser: `http://localhost:3000/swagger`

Expected: Scalar UI loads with full API documentation

**Step 3: Verify documentation content**

Check that:

- [ ] All endpoints are listed
- [ ] Authentication lock icon appears on protected endpoints
- [ ] Request body examples are visible
- [ ] Descriptions are clear and helpful
- [ ] Tags organize endpoints correctly

**Step 4: Run tests**

Run:

```bash
bun test
```

Expected: All tests pass

---

## Task 12: Final Verification

**Step 1: Run linter**

Run:

```bash
bun run lint
```

Expected: No errors

**Step 2: Check TypeScript compilation**

Run:

```bash
bunx tsc --noEmit
```

Expected: No errors

---

## Summary

After completing all tasks:

1. **Dependencies**: `@elysiajs/openapi` and `zod-to-json-schema` installed
2. **Configuration**: Centralized in `src/core/openapi/`
3. **Examples**: Defined in `src/core/openapi/examples.ts`
4. **Route Details**: Organized in `src/routes/details/`
5. **All Routes**: Updated with comprehensive documentation
6. **Swagger UI**: Replaced with Scalar UI (comes with openapi plugin)
7. **Authentication**: Clearly documented with security schemes

The API documentation will now show:

- Request body examples
- Authentication requirements (lock icon)
- Response codes and descriptions
- Field descriptions from Zod schemas
- Organized tags for navigation
