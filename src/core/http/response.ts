export interface ApiMeta {
  timestamp: string;
  request_id?: string;
}

export interface ApiErrorBody {
  code: string;
  message: string;
  details?: unknown;
}

/**
 * Validation error field representation
 */
export interface ValidationErrorField {
  field: string;
  message: string;
  code: string;
}

/**
 * Validation error body structure
 */
export interface ValidationErrorBody {
  code: string;
  message: string;
  fields: ValidationErrorField[];
}

export interface ApiResponse<T = unknown> {
  success: boolean;
  message?: string;
  data?: T;
  error?: unknown;
  meta: ApiMeta;
}

function resolveRequestId(request: Request, requestId?: string): string | undefined {
  return requestId || request.headers.get('x-request-id') || request.headers.get('X-Request-ID') || undefined;
}

export function buildMeta(request: Request, requestId?: string): ApiMeta {
  return {
    timestamp: new Date().toISOString(),
    request_id: resolveRequestId(request, requestId),
  };
}

export function successResponse<T>(request: Request, data?: T, message?: string, requestId?: string): ApiResponse<T> {
  return {
    success: true,
    ...(message ? { message } : {}),
    ...(data !== undefined ? { data } : {}),
    meta: buildMeta(request, requestId),
  };
}

export function errorResponse(request: Request, code: string, message: string, details?: unknown, requestId?: string): ApiResponse<ApiErrorBody> {
  return {
    success: false,
    message,
    data: {
      code,
      message,
      ...(details !== undefined ? { details } : {}),
    },
    meta: buildMeta(request, requestId),
  };
}

/**
 * Create a validation error response with field-level errors
 *
 * @param request - Request object
 * @param message - Overall error message
 * @param fields - Array of field errors
 * @param requestId - Optional request ID
 * @returns Standardized validation error response
 */
export function validationErrorResponse(request: Request, fields: ValidationErrorField[], requestId?: string): ApiResponse<ValidationErrorBody> {
  // Use the first field error message as the main message for better UX
  const firstFieldMessage = fields[0]?.message ?? 'Validation error occurred';

  return {
    success: false,
    message: firstFieldMessage,
    error: {
      code: 'VALIDATION_ERROR',
      message: firstFieldMessage,
      fields,
    },
    meta: buildMeta(request, requestId),
  };
}
