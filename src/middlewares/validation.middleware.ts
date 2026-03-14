/**
 * Validation Middleware
 *
 * Handles Zod validation errors and returns standardized responses.
 * Integrates with Elysia's onError hook to catch validation failures.
 */

import { errorResponse } from '../core/http/response';
import { logger } from '../core/logging/logger';
import type { ValidationHandlerContext } from './validation/types';
import { isZodError } from './validation/types';
import { FieldError } from './validation/field-error';
import { VALIDATION_ERROR_CODES, DEFAULT_ERROR_MESSAGES } from './validation/constants';

/**
 * Validation error handler for Elysia onError hook
 *
 * Checks if the error is a Zod validation error and returns a
 * standardized error response. Returns undefined for non-validation errors.
 *
 * @param ctx - Elysia error context
 * @returns Standardized error response or undefined
 */
export function validationErrorHandler(ctx: ValidationHandlerContext): ReturnType<typeof errorResponse> | undefined {
  // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
  const { error, set, request } = ctx;

  // Check if this is a Zod validation error
  if (!isZodError(error)) {
    return undefined;
  }

  // Set appropriate status code for validation errors
  // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
  set.status = 422;

  // Transform Zod issues to field errors
  const fieldErrors = error.issues.map(issue => FieldError.fromZodIssue(issue));

  // Customize message based on number of errors
  const message = fieldErrors.length > 1 ? DEFAULT_ERROR_MESSAGES.MULTIPLE_FIELDS : DEFAULT_ERROR_MESSAGES.SINGLE_FIELD;

  // Extract request ID
  const requestId = extractRequestId(ctx);

  // Log the validation failure
  logger.warn('Request validation failed', {
    request_id: requestId,
    method: request.method,
    url: request.url,
    field_errors: fieldErrors.length,
    fields: fieldErrors.map(fe => fe.field),
    error_codes: [...new Set(fieldErrors.map(fe => fe.code))],
  });

  // Build and return error response
  return errorResponse(
    request,
    VALIDATION_ERROR_CODES.VALIDATION_FAILED,
    message,
    fieldErrors.map(fe => fe.toJSON()),
    requestId
  );
}

/**
 * Extract request ID from context
 */
function extractRequestId(ctx: ValidationHandlerContext): string | undefined {
  // Try to get from context first
  if (ctx.requestId) {
    return ctx.requestId;
  }

  // Fall back to headers
  return ctx.request.headers.get('x-request-id') ?? ctx.request.headers.get('X-Request-ID') ?? undefined;
}
