/**
 * Validation Middleware Types
 *
 * Type definitions for validation error handling.
 */

import type { z } from 'zod';

/**
 * Elysia error handler context for validation errors
 */
export interface ValidationHandlerContext {
  error: unknown;
  set: { status: number };
  request: Request;
  requestId?: string;
}

/**
 * Field error representation
 */
export interface FieldErrorObject {
  field: string;
  message: string;
  code: string;
  received?: unknown;
  expected?: string;
}

/**
 * Zod error check type guard
 */
export function isZodError(error: unknown): error is z.ZodError {
  return error instanceof Error && 'name' in error && error.name === 'ZodError' && 'issues' in error && Array.isArray((error as z.ZodError).issues);
}
