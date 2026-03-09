import type { Elysia } from 'elysia';
import { logger } from './logger';
import type { Context } from 'elysia';
import type { Logger } from './types';

export interface RequestMetadata {
  requestId: string;
  ip: string;
  userAgent: string;
  method: string;
  path: string;
  [key: string]: unknown;
}

export interface RequestContext {
  requestMetadata: RequestMetadata;
  startTime: number;
  requestLogger: Logger;
}

export function getRequestMetadata(context: Context): RequestMetadata {
  const request = context.request;
  const headers = request.headers;

  return {
    requestId: headers.get('x-request-id') || crypto.randomUUID(),
    ip: headers.get('x-forwarded-for') || headers.get('x-real-ip') || 'unknown',
    userAgent: headers.get('user-agent') || 'unknown',
    method: request.method,
    path: new URL(request.url).pathname,
  };
}

export function loggingPlugin<T extends Elysia>(app: T) {
  return app
    .derive((context: Context) => {
      const metadata = getRequestMetadata(context);
      const startTime = performance.now();

      return {
        requestMetadata: metadata,
        startTime,
        requestLogger: logger.child(metadata),
      } as const;
    })
    .onAfterHandle((context: Context) => {
      const { startTime, requestLogger } = context as unknown as RequestContext;
      const duration = performance.now() - startTime;
      const status = context.set.status || 200;

      requestLogger.info('Request completed', {
        method: context.request.method,
        path: new URL(context.request.url).pathname,
        status: typeof status === 'number' ? status : 200,
        duration: `${duration.toFixed(2)}ms`,
      });
    })
    .onError((context: Context) => {
      const { startTime, requestLogger } = context as unknown as RequestContext;
      const duration = performance.now() - startTime;
      const status = context.set.status || 500;

      requestLogger.error('Request failed', undefined, {
        method: context.request.method,
        path: new URL(context.request.url).pathname,
        status: typeof status === 'number' ? status : 500,
        duration: `${duration.toFixed(2)}ms`,
      });

      return context;
    });
}
