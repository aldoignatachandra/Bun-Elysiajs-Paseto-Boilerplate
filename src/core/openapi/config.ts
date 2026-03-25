/**
 * OpenAPI Configuration
 *
 * Centralized configuration for the OpenAPI documentation plugin.
 * Provides API info, tags, security schemes, and Zod schema mapping.
 */

import { openapi } from '@elysiajs/openapi';
import { zodToJsonSchema } from 'zod-to-json-schema';

/**
 * API Information
 *
 * Basic metadata about the API displayed in the OpenAPI documentation.
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
  license: { name: 'MIT', url: 'https://opensource.org/licenses/MIT' },
  contact: { name: 'API Support', email: 'aldoignatachandra@gmail.com' },
};

/**
 * OpenAPI Tags
 *
 * Group endpoints by category for better documentation organization.
 */
export const openApiTags = [
  {
    name: 'Authentication',
    description: 'User authentication and token management endpoints. Includes registration, login, logout, and token refresh operations.',
  },
  {
    name: 'Users',
    description: 'User management endpoints. Includes user profile retrieval, updates, and account management operations.',
  },
  {
    name: 'Products',
    description: 'Product management endpoints. Includes CRUD operations for products, variants, and attributes.',
  },
  {
    name: 'Health',
    description: 'Health check endpoints for monitoring application status and readiness.',
  },
];

/**
 * Bearer Security Scheme
 *
 * Security scheme configuration for PASETO token authentication.
 */
export const bearerSecurity = {
  BearerAuth: {
    type: 'http' as const,
    scheme: 'bearer',
    bearerFormat: 'PASETO',
    description: 'PASETO token authentication. Obtain a token via the login endpoint and include it in the Authorization header.',
  },
};

/**
 * Creates the OpenAPI plugin configuration
 *
 * @returns Configured OpenAPI plugin instance
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
