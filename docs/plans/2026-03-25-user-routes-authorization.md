# User Routes Authorization - Deep Scan Plan

## Overview

Fix authorization for user routes according to these requirements:

### User Routes Requirements:

1. **Register user** (`POST /auth/register`) - ADMIN only ✅
2. **Activity logs** (`GET /activity-logs`) - ADMIN only
3. **List all users** (`GET /users`) - ADMIN only
4. **Get user by ID** (`GET /users/:id`) - ADMIN can see any, USER can only see their own profile
5. **Update profile** (`PATCH /users/me`) - USER can only update their own
6. **Delete user** (`DELETE /users/:id`) - ADMIN only (CANNOT delete self)
7. **Deactivate user** (`POST /users/:id/deactivate`) - ADMIN only (cannot deactivate self)
8. **Activate user** (`POST /users/:id/activate`) - ADMIN only
9. **Restore user** (`POST /users/:id/restore`) - ADMIN only

### Product Routes Requirements:

1. **List all products** (`GET /products`) - ADMIN sees all, USER sees only own
2. **Get product by ID** (`GET /products/:id`) - USER only (own products)
3. **Create product** (`POST /products`) - USER only
4. **Update product** (`PATCH/products/:id`) - USER only (own products)
5. **Delete product** (`DELETE /products/:id`) - USER only (own products)
6. **Restore product** (`POST /products/:id/restore`) - USER only (own products)
7. **Update stock** (`PUT /products/:id/stock`) - USER only (own products)

### Security Rules:

- ADMIN cannot delete/deactivate themselves

- USER can only access/modify their own resources

## Implementation Plan

### Phase 1: Update Auth Middleware

- Add `requireAdminRole()` function
- Add `requireNotSelf()` function
- Add `requireOwnerOrAdmin()` function

- Add `isOwnResource()` function
- Export `ForbiddenError` from app-error

- Update imports

### Phase 2: Update User Routes (`users.routes.ts`)

- Add ADMIN-only guards to: list users, stats, activity logs, activate/deactivate/delete/restore
- Add self-protection for delete/deactivate
- Update get user by ID to allow USER to see own profile

- All routes already require auth, keep `requireAuth`

### Phase 3: Update Product Routes (`products.routes.ts`)

- ADMIN can only list products (no CRUD)
- USER can perform all CRUD operations
- Add owner filtering to service layer
- Update all endpoints to check ownership

- All routes already require auth, keep `requireAuth`

### Phase 4: Update Services

- Products service: filter by ownerId
- Users service: add self-protection in delete/deactivate

### Phase 5: Testing

- Write tests for new authorization rules
- Verify all endpoints work correctly
