export interface ApiMeta {
  timestamp: string;
  request_id?: string;
}

export interface ApiErrorBody {
  code: string;
  message: string;
  details?: unknown;
}

export interface ApiResponse<T = unknown> {
  success: boolean;
  message?: string;
  data?: T;
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

export function successResponse<T>(
  request: Request,
  data?: T,
  message?: string,
  requestId?: string
): ApiResponse<T> {
  return {
    success: true,
    ...(message ? { message } : {}),
    ...(data !== undefined ? { data } : {}),
    meta: buildMeta(request, requestId),
  };
}

export function errorResponse(
  request: Request,
  code: string,
  message: string,
  details?: unknown,
  requestId?: string
): ApiResponse<ApiErrorBody> {
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
