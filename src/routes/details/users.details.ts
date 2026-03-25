import type { DocumentDecoration } from 'elysia';
import { requireAuth } from './auth.details';

/**
 * Users route detail definitions
 */
export const usersDetails: Record<string, DocumentDecoration> = {
  getMe: {
    summary: 'Get current user profile',
    description: `Returns the authenticated user's profile information.

**Requires authentication.**

Returns detailed user information including:
- Basic profile data (email, username, name)
- Account status (role, isActive)
- Timestamps (createdAt, lastLoginAt, updatedAt)`,
    tags: ['Users'],
    security: requireAuth,
  },

  updateMe: {
    summary: 'Update current user profile',
    description: `Updates the authenticated user's profile information.

**Requires authentication.**

**Request Body:**
- \`name\`: Optional display name
- \`username\`: Optional new username (must be unique)`,
    tags: ['Users'],
    security: requireAuth,
  },

  getUsers: {
    summary: 'List all users',
    description: `Retrieves a paginated list of users with optional filtering.

**Requires authentication.**

**Query Parameters:**
- \`page\`: Page number (default: 1)
- \`limit\`: Items per page (default: 10, max: 100)
- \`search\`: Search term for email, username, or name
- \`include_deleted\`: Include soft-deleted users (default: false)
- \`only_deleted\`: Show only soft-deleted users (default: false)`,
    tags: ['Users'],
    security: requireAuth,
  },

  getUserStats: {
    summary: 'Get user statistics',
    description: `Returns aggregate statistics about users.

**Requires authentication.**

Returns counts for:
- Total users
- Active users
- Inactive users
- Deleted users`,
    tags: ['Users'],
    security: requireAuth,
  },

  getUserById: {
    summary: 'Get user by ID',
    description: `Retrieves a specific user by their UUID.

**Requires authentication.**

**Path Parameters:**
- \`id\`: User UUID`,
    tags: ['Users'],
    security: requireAuth,
  },

  activateUser: {
    summary: 'Activate a user',
    description: `Activates a deactivated user account.

**Requires authentication.**

**Path Parameters:**
- \`id\`: User UUID`,
    tags: ['Users'],
    security: requireAuth,
  },

  deactivateUser: {
    summary: 'Deactivate a user',
    description: `Deactivates a user account (soft disable, not deletion).

**Requires authentication.**

**Path Parameters:**
- \`id\`: User UUID`,
    tags: ['Users'],
    security: requireAuth,
  },

  deleteUser: {
    summary: 'Delete a user',
    description: `Deletes a user account.

**Requires authentication.**

**Path Parameters:**
- \`id\`: User UUID

**Query Parameters:**
- \`force\`: Set to "true" to permanently delete (hard delete)`,
    tags: ['Users'],
    security: requireAuth,
  },

  restoreUser: {
    summary: 'Restore a deleted user',
    description: `Restores a soft-deleted user account.

**Requires authentication.**

**Path Parameters:**
- \`id\`: User UUID`,
    tags: ['Users'],
    security: requireAuth,
  },

  getActivityLogs: {
    summary: 'Get activity logs',
    description: `Retrieves a paginated list of activity logs.

**Requires authentication.**

**Query Parameters:**
- \`page\`: Page number (default: 1)
- \`limit\`: Items per page (default: 10, max: 100)
- \`user_id\`: Filter by user UUID
- \`action\`: Filter by action type
- \`resource\`: Filter by resource type`,
    tags: ['Users'],
    security: requireAuth,
  },
};
