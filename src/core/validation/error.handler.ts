/**
 * Validation Error Handlers
 *
 * Error handling utilities for Zod validation errors and application errors.
 * Provides consistent error responses for API endpoints.
 */

import type { Context } from 'elysia';
import type { ZodError } from 'zod';
import type {
  ValidationErrorResponse,
  ApiErrorResponse,
  ApiSuccessResponse,
  PaginationMeta,
  PaginatedResponse,
} from './error.types';
import { createValidationErrorResponse } from './error.types';
import { AppError, HttpStatusCode } from '../errors/app-error';

/**
 * Handle Zod validation errors
 * Converts Zod errors to a standardized validation error response
 */
export function handleZodError(error: ZodError, customMessage?: string): ValidationErrorResponse {
  return createValidationErrorResponse(error, customMessage);
}

/**
 * Handle application errors
 * Converts AppError instances to API error responses
 */
export function handleAppError(error: AppError): ApiErrorResponse {
  /* eslint-disable @typescript-eslint/no-unsafe-assignment */
  const response = {
    success: false,
    error: {
      code: error.code,
      message: error.message,
      ...(error.details && { details: error.details }),
      statusCode: error.status,
    },
  };
  return response as ApiErrorResponse;
  /* eslint-enable @typescript-eslint/no-unsafe-assignment */
}

/**
 * Handle unknown errors
 * Converts unexpected errors to generic error responses
 */
export function handleUnknownError(error: unknown): ApiErrorResponse {
  if (error instanceof AppError) {
    return handleAppError(error);
  }

  if (error instanceof Error) {
    return {
      success: false,
      error: {
        code: 'INTERNAL_SERVER_ERROR',
        message:
          process.env.NODE_ENV === 'development' ? error.message : 'An unexpected error occurred',
        statusCode: HttpStatusCode.INTERNAL_SERVER_ERROR,
      },
    };
  }

  return {
    success: false,
    error: {
      code: 'INTERNAL_SERVER_ERROR',
      message: 'An unexpected error occurred',
      statusCode: HttpStatusCode.INTERNAL_SERVER_ERROR,
    },
  };
}

/**
 * Create a success response
 * Wraps successful data in a standardized response format
 */
export function createSuccessResponse<T>(
  data: T,
  message?: string,
  statusCode: number = HttpStatusCode.OK
): { statusCode: number; response: ApiSuccessResponse<T> } {
  return {
    statusCode,
    response: {
      success: true,
      data,
      ...(message && { message }),
    },
  };
}

/**
 * Create an error response
 * Wraps error data in a standardized response format
 */
export function createErrorResponse(
  code: string,
  message: string,
  statusCode: number = HttpStatusCode.BAD_REQUEST,
  details?: unknown
): { statusCode: number; response: ApiErrorResponse } {
  /* eslint-disable @typescript-eslint/no-unsafe-assignment */
  return {
    statusCode,
    response: {
      success: false,
      error: {
        code,
        message,
        ...(details && { details }),
        statusCode,
      },
    },
  };
  /* eslint-enable @typescript-eslint/no-unsafe-assignment */
}

/**
 * Create a paginated response
 * Wraps paginated data in a standardized response format
 */
export function createPaginatedResponse<T>(
  data: T[],
  page: number,
  limit: number,
  total: number
): ApiSuccessResponse<PaginatedResponse<T>> {
  const totalPages = Math.ceil(total / limit);
  const meta: PaginationMeta = {
    page,
    limit,
    total,
    totalPages,
    hasNext: page < totalPages,
    hasPrevious: page > 1,
  };

  return {
    success: true,
    data: {
      data,
      meta,
    } as PaginatedResponse<T>,
  };
}

/**
 * Elysia hook to handle validation errors
 * Use this in Elysia's onError hook to standardize error responses
 */
export function createValidationErrorHandler() {
  return ({ set, error }: Context): ApiErrorResponse => {
    // Handle Zod validation errors
    if (error instanceof Error && error.name === 'ZodError') {
      const zodError = error as unknown as ZodError;
      const validationError = handleZodError(zodError);

      set.status = HttpStatusCode.UNPROCESSABLE_ENTITY;
      /* eslint-disable @typescript-eslint/no-unsafe-assignment */
      const response = {
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: validationError.message,
          details: validationError.details,
          statusCode: HttpStatusCode.UNPROCESSABLE_ENTITY,
        },
      };
      /* eslint-enable @typescript-eslint/no-unsafe-assignment */
      return response as ApiErrorResponse;
    }

    // Handle AppError instances
    if (error instanceof AppError) {
      const appError = handleAppError(error);
      set.status = appError.error.statusCode;
      return appError;
    }

    // Handle unknown errors
    const unknownError = handleUnknownError(error);
    set.status = unknownError.error.statusCode;
    return unknownError;
  };
}

/**
 * Validate data against a Zod schema and throw formatted error if invalid
 * Use this in route handlers to validate request data
 */
// eslint-disable-next-line @typescript-eslint/require-await
export async function validateOrThrow<T>(
  schema: { safeParse: (data: unknown) => { success: boolean; data?: T; error?: unknown } },
  data: unknown
): Promise<T> {
  const result = schema.safeParse(data);

  if (!result.success) {
    const zodError = result.error as ZodError;
    const validationError = handleZodError(zodError);

    throw new AppError('Validation failed', {
      code: 'VALIDATION_ERROR',
      status: HttpStatusCode.UNPROCESSABLE_ENTITY,
      details: validationError.details,
    });
  }

  return result.data as T;
}
