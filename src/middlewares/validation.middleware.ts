/**
 * Validation Middleware
 *
 * Handles validation errors and returns standardized responses.
 * Supports ZodError, Elysia's built-in ValidationError, and stringified validation errors.
 */

import { validationErrorResponse, type ValidationErrorField } from '../core/http/response';
import { logger } from '../core/logging/logger';
import type { ValidationHandlerContext, ElysiaValidationError } from './validation/types';
import { isZodError, isElysiaValidationError } from './validation/types';

/**
 * Parsed stringified validation error from Elysia body validation
 */
interface ParsedValidationError {
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
  }>;
}

/**
 * Validation error handler for Elysia onError hook
 *
 * Checks if the error is a validation error (Zod, Elysia, or stringified) and returns a
 * standardized error response. Returns undefined for non-validation errors.
 *
 * @param ctx - Elysia error context
 * @returns Standardized error response or undefined
 */
export function validationErrorHandler(ctx: ValidationHandlerContext): ReturnType<typeof validationErrorResponse> | undefined {
  // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
  const { error, set, request } = ctx;

  // Handle Zod validation errors
  if (isZodError(error)) {
    // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
    set.status = 422;

    const fieldErrors: ValidationErrorField[] = error.issues.map(issue => ({
      field: issue.path.join('.'),
      message: issue.message,
      code: issue.code,
    }));

    const requestId = extractRequestId(ctx);

    logger.warn('Request validation failed (Zod)', {
      request_id: requestId,
      method: request.method,
      url: request.url,
      field_errors: fieldErrors.length,
      fields: fieldErrors.map(fe => fe.field),
    });

    return validationErrorResponse(request, fieldErrors, requestId);
  }

  // Handle Elysia's built-in validation errors (object format)
  if (isElysiaValidationError(error)) {
    // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
    set.status = 422;

    const fieldErrors: ValidationErrorField[] = extractElysiaFieldErrors(error);

    const requestId = extractRequestId(ctx);

    logger.warn('Request validation failed (Elysia)', {
      request_id: requestId,
      method: request.method,
      url: request.url,
      field_errors: fieldErrors.length,
      fields: fieldErrors.map(fe => fe.field),
    });

    return validationErrorResponse(request, fieldErrors, requestId);
  }

  // Handle stringified validation errors (Error with JSON in message)
  if (isStringifiedValidationError(error)) {
    // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
    set.status = 422;

    const parsed = parseStringifiedError(error.message);
    const fieldErrors: ValidationErrorField[] = extractParsedFieldErrors(parsed);

    const requestId = extractRequestId(ctx);

    logger.warn('Request validation failed (Body)', {
      request_id: requestId,
      method: request.method,
      url: request.url,
      field_errors: fieldErrors.length,
      fields: fieldErrors.map(fe => fe.field),
    });

    return validationErrorResponse(request, fieldErrors, requestId);
  }

  return undefined;
}

/**
 * Check if error is a stringified validation error (Error with JSON in message)
 */
function isStringifiedValidationError(error: unknown): error is Error {
  if (!(error instanceof Error)) return false;

  const message = error.message;
  if (typeof message !== 'string') return false;

  // Quick check if message looks like JSON with validation type
  return message.includes('"type"') && message.includes('"validation"') && message.includes('"errors"');
}

/**
 * Parse stringified validation error from error message
 */
function parseStringifiedError(message: string): ParsedValidationError | null {
  try {
    const parsed = JSON.parse(message) as unknown;
    if (parsed && typeof parsed === 'object' && parsed !== null) {
      const obj = parsed as Record<string, unknown>;
      if (obj.type === 'validation') {
        return obj as unknown as ParsedValidationError;
      }
    }
  } catch {
    // Not valid JSON
  }
  return null;
}

/**
 * Extract field errors from parsed validation error
 */
function extractParsedFieldErrors(parsed: ParsedValidationError | null): ValidationErrorField[] {
  if (!parsed) return [];

  const fields: ValidationErrorField[] = [];

  // Extract from errors array
  if (Array.isArray(parsed.errors)) {
    for (const err of parsed.errors) {
      const field = Array.isArray(err.path) ? err.path.join('.') : (parsed.property ?? 'unknown');
      fields.push({
        field,
        message: err.message || 'Validation failed',
        code: err.code || err.validation || 'VALIDATION_ERROR',
      });
    }
  } else if (parsed.property && parsed.message) {
    // Single property error
    fields.push({
      field: parsed.property,
      message: parsed.message,
      code: 'VALIDATION_ERROR',
    });
  }

  return fields;
}

/**
 * Extract field errors from Elysia validation error
 */
function extractElysiaFieldErrors(error: ElysiaValidationError): ValidationErrorField[] {
  const fields: ValidationErrorField[] = [];

  // Elysia errors can be in the errors array or direct properties
  const errors = Array.isArray(error.errors) ? error.errors : [];

  if (errors.length > 0) {
    for (const err of errors) {
      const path = Array.isArray(err.path) ? err.path.join('.') : (err.validation ?? 'unknown');
      fields.push({
        field: path,
        message: err.message ?? 'Validation failed',
        code: err.code ?? err.validation ?? 'VALIDATION_ERROR',
      });
    }
  } else if (error.property && error.message) {
    // Single property error
    fields.push({
      field: String(error.property),
      message: String(error.message),
      code: 'VALIDATION_ERROR',
    });
  }

  return fields;
}

/**
 * Extract request ID from context
 */
function extractRequestId(ctx: ValidationHandlerContext): string | undefined {
  if (ctx.requestId) {
    return ctx.requestId;
  }

  return ctx.request.headers.get('x-request-id') ?? ctx.request.headers.get('X-Request-ID') ?? undefined;
}
