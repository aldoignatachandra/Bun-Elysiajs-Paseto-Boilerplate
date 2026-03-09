/**
 * Validation Error Types
 *
 * Type definitions for validation-related errors.
 * Provides consistent error structures across the application.
 */

import type { ZodError, ZodIssue } from 'zod';

/**
 * Single validation error detail
 */
export interface ValidationErrorDetail {
  field: string;
  message: string;
  code?: string;
  path?: string[];
}

/**
 * Validation error response structure
 */
export interface ValidationErrorResponse {
  error: string;
  message: string;
  details: ValidationErrorDetail[];
}

/**
 * API response wrapper for errors
 */
export interface ApiErrorResponse {
  success: false;
  error: {
    code: string;
    message: string;
    details?: unknown;
    statusCode: number;
  };
}

/**
 * API response wrapper for success
 */
export interface ApiSuccessResponse<T = unknown> {
  success: true;
  data: T;
  message?: string;
}

/**
 * Pagination metadata
 */
export interface PaginationMeta {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
  hasNext: boolean;
  hasPrevious: boolean;
}

/**
 * Paginated response structure
 */
export interface PaginatedResponse<T = unknown> {
  success: true;
  data: T[];
  meta: PaginationMeta;
}

/**
 * Convert Zod error to validation error details
 */
export function zodErrorToValidationErrorDetails(error: ZodError): ValidationErrorDetail[] {
  return error.errors.map((issue: ZodIssue) => ({
    field: issue.path.join('.'),
    message: issue.message,
    code: issue.code,
    path: issue.path as string[],
  }));
}

/**
 * Create a validation error response from Zod error
 */
export function createValidationErrorResponse(
  error: ZodError,
  customMessage?: string
): ValidationErrorResponse {
  return {
    error: 'Validation Error',
    message: customMessage || 'The request contains invalid data',
    details: zodErrorToValidationErrorDetails(error),
  };
}
