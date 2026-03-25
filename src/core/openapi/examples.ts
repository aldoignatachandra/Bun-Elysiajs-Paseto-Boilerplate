/**
 * OpenAPI Examples
 *
 * Request body examples for OpenAPI documentation.
 * Used in Swagger/Scalar UI to help developers understand expected formats.
 */

/**
 * Authentication endpoint examples
 */
export const authExamples = {
  registerRequest: {
    summary: 'Register new user (ADMIN only)',
    value: {
      email: 'john.doe@example.com',
      username: 'johndoe',
      password: 'SecureP@ss123',
      confirmPassword: 'SecureP@ss123',
      name: 'John Doe',
    },
  },
  loginRequestWithEmail: {
    summary: 'Login with email',
    value: {
      email: 'john.doe@example.com',
      password: 'SecureP@ss123',
    },
  },
  loginRequestWithUsername: {
    summary: 'Login with username',
    value: {
      email: 'johndoe',
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
 * User endpoint examples
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
 * Product endpoint examples
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
        { name: 'Size', values: ['S', 'M', 'L', 'XL'], displayOrder: 1 },
        { name: 'Color', values: ['Red', 'Blue', 'Black'], displayOrder: 2 },
      ],
      variants: [
        {
          name: 'T-Shirt - Small Red',
          sku: 'TSH-S-RED',
          price: 19.99,
          stock: 10,
          isActive: true,
          attributeValues: { Size: 'S', Color: 'Red' },
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
 * Standard response examples
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
        details: [{ field: 'email', message: 'Invalid email format' }],
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
        details: { limit: 100, remaining: 0, reset: 1711286400 },
      },
      requestId: 'req_abc123',
    },
  },
};

/**
 * Helper function to add examples to route detail
 *
 * @param detail - The route detail object
 * @param bodyExample - The example object with summary and value
 * @returns The detail object with requestBody examples added
 *
 * @example
 * ```typescript
 * app.post('/register', ({ body }) => {...}, {
 *   detail: withExamples(authDetail.register, authExamples.registerRequest),
 * });
 * ```
 */
export function withExamples<T extends Record<string, unknown>>(detail: T, bodyExample?: { summary: string; value: unknown }): T {
  if (!bodyExample) return detail;
  return {
    ...detail,
    requestBody: {
      content: {
        'application/json': { examples: { example: bodyExample } },
      },
    },
  };
}
