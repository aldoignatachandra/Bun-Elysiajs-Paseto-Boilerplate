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
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  set: any; // Elysia's set type is complex with status, headers, redirect, cookie
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
 * Elysia ValidationError structure
 */
export interface ElysiaValidationError {
  type: 'validation';
  on: string;
  property?: string;
  message?: string;
  found?: Record<string, unknown>;
  errors?: Array<{
    validation?: string;
    code?: string;
    message: string;
    path?: (string | number)[];
    expected?: string;
    received?: unknown;
  }>;
}

/**
 * Zod error check type guard
 */
export function isZodError(error: unknown): error is z.ZodError {
  return error instanceof Error && 'name' in error && error.name === 'ZodError' && 'issues' in error && Array.isArray((error as z.ZodError).issues);
}

/**
 * Elysia validation error check type guard
 */
export function isElysiaValidationError(error: unknown): error is ElysiaValidationError {
  if (!error || typeof error !== 'object') return false;
  const err = error as Record<string, unknown>;
  return err.type === 'validation' && typeof err.on === 'string';
}
