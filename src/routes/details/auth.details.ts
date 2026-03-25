import type { DocumentDecoration } from 'elysia';

/**
 * Security requirement for Bearer authentication.
 * This is exported for reuse by other detail files.
 */
export const requireAuth = [{ BearerAuth: [] }];

/**
 * Auth route detail definitions
 */
export const authDetails: Record<string, DocumentDecoration> = {
  register: {
    summary: 'Register a new user (Admin only)',
    description: `Creates a new user account and returns authentication tokens.

**Requires ADMIN role.** Only administrators can register new users. All users created via this endpoint will have the USER role.

**Request Body:**
- \`email\`: Valid email address (required)
- \`username\`: Unique username (alphanumeric with underscores/hyphens) (required)
- \`password\`: Strong password (min 8 chars, uppercase, lowercase, number, special char) (required)
- \`confirmPassword\`: Must match password exactly (required)
- \`name\`: Optional display name`,
    tags: ['Authentication'],
    security: requireAuth,
  },

  login: {
    summary: 'Login to user account',
    description: `Authenticates a user and returns access tokens.

**Request Body:**
- \`email\`: User's email address OR username (auto-detected by presence of @ symbol)
- \`password\`: User's password`,
    tags: ['Authentication'],
    security: [],
  },

  refresh: {
    summary: 'Refresh access token',
    description: `Obtains a new access token using a refresh token.

**Request Body:**
- \`token\` or \`refreshToken\`: The refresh token from a previous login/register response`,
    tags: ['Authentication'],
    security: [],
  },

  logout: {
    summary: 'Logout user',
    description: `Invalidates the current session token.

**Requires authentication.** The current access token will be invalidated.`,
    tags: ['Authentication'],
    security: requireAuth,
  },

  me: {
    summary: 'Get current user profile',
    description: `Returns the authenticated user's profile information.

**Requires authentication.**`,
    tags: ['Authentication'],
    security: requireAuth,
  },

  changePassword: {
    summary: 'Change user password',
    description: `Updates the authenticated user's password.

**Requires authentication.**

**Request Body:**
- \`currentPassword\` or \`old_password\`: Current password
- \`newPassword\` or \`new_password\`: New password (must meet strength requirements)`,
    tags: ['Authentication'],
    security: requireAuth,
  },
};
