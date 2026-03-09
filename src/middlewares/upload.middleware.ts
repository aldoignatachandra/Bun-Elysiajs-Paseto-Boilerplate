/**
 * Upload Middleware
 *
 * Handles multipart form data uploads with proper validation and security.
 * Provides file size limits, content-type validation, and proper error handling.
 *
 * @module UploadMiddleware
 */

import type { Elysia } from 'elysia';
import { logger } from '../core/logging/logger';
import { metricsCollector } from '../core/metrics/collector';

/**
 * Upload middleware options
 */
export interface UploadMiddlewareOptions {
  /**
   * Maximum file size in bytes (default: 5242880 = 5MB)
   */
  maxSize?: number;

  /**
   * Allowed MIME types (e.g., ['image/jpeg', 'image/png'])
   * If not provided, all types are allowed
   */
  allowedTypes?: string[];

  /**
   * Allowed file extensions (e.g., ['.jpg', '.png', '.pdf'])
   * If not provided, all extensions are allowed
   */
  allowedExtensions?: string[];

  /**
   * Maximum number of files allowed in a single request (default: 10)
   */
  maxFiles?: number;
}

/**
 * Default maximum file size in bytes (5MB)
 */
const DEFAULT_MAX_SIZE = 5 * 1024 * 1024;

/**
 * Default maximum number of files per request
 */
const DEFAULT_MAX_FILES = 10;

/**
 * Parse Content-Type header to extract boundary
 */
function parseContentType(contentType: string | null): string | null {
  if (!contentType) {
    return null;
  }

  // Check if it's multipart/form-data
  if (!contentType.includes('multipart/form-data')) {
    return null;
  }

  // Extract boundary
  const boundaryMatch = contentType.match(/boundary=([^;]+)/i);
  if (!boundaryMatch) {
    return null;
  }

  return boundaryMatch[1].trim();
}

/**
 * Validate file size
 */
function validateFileSize(size: number, maxSize: number): boolean {
  return size <= maxSize;
}

/**
 * Validate file MIME type
 */
function validateMimeType(mimeType: string, allowedTypes: string[]): boolean {
  return allowedTypes.includes(mimeType);
}

/**
 * Validate file extension
 */
function validateFileExtension(fileName: string, allowedExtensions: string[]): boolean {
  const ext = fileName.includes('.') ? '.' + fileName.split('.').pop() : '';
  return allowedExtensions.includes(ext);
}

/**
 * Upload middleware for handling multipart form data
 *
 * @param options - Upload middleware options
 * @returns Elysia middleware function
 */
export function uploadMiddleware(options: UploadMiddlewareOptions = {}) {
  const maxSize = options.maxSize ?? DEFAULT_MAX_SIZE;
  const maxFiles = options.maxFiles ?? DEFAULT_MAX_FILES;
  const allowedTypes = options.allowedTypes ?? [];
  const allowedExtensions = options.allowedExtensions ?? [];

  return (app: Elysia) =>
    app.derive(({ request, set }) => {
      const contentType = request.headers.get('content-type');

      // Check if this is a multipart upload request
      if (!contentType || !contentType.includes('multipart/form-data')) {
        return {};
      }

      const startTime = Date.now();

      try {
        // Parse Content-Type
        const boundary = parseContentType(contentType);
        if (!boundary) {
          set.status = 400;
          logger.warn('Invalid multipart/form-data content-type', { contentType });
          return {
            uploadError: {
              code: 'INVALID_CONTENT_TYPE',
              message: 'Invalid multipart/form-data content-type',
            },
          };
        }

        // Validate content length if available
        const contentLength = request.headers.get('content-length');
        if (contentLength) {
          const totalSize = parseInt(contentLength, 10);
          if (totalSize > maxSize * maxFiles) {
            set.status = 413;
            logger.warn('Request body too large', {
              size: totalSize,
              maxSize: maxSize * maxFiles,
            });
            metricsCollector.recordHttpDuration('POST', '/upload', (Date.now() - startTime) / 1000);
            return {
              uploadError: {
                code: 'REQUEST_TOO_LARGE',
                message: `Request body too large. Maximum size is ${maxSize * maxFiles} bytes`,
              },
            };
          }
        }

        // Return upload configuration for use in route handlers
        const uploadConfig = {
          maxSize,
          maxFiles,
          allowedTypes,
          allowedExtensions,
          boundary,
        };

        logger.debug('Upload middleware validated request', {
          contentType,
          maxSize,
          maxFiles,
        });

        return { uploadConfig };
      } catch (error) {
        const duration = Date.now() - startTime;
        metricsCollector.recordHttpDuration('POST', '/upload', duration / 1000);
        logger.error('Upload middleware error', {
          error: error instanceof Error ? error.message : String(error),
        });

        set.status = 500;
        return {
          uploadError: {
            code: 'UPLOAD_ERROR',
            message: 'An error occurred while processing the upload',
          },
        };
      }
    });
}

/**
 * Validate uploaded file against options
 */
export function validateUploadedFile(
  file: { name: string; type: string; size: number },
  options: UploadMiddlewareOptions
): { valid: boolean; error?: string } {
  const maxSize = options.maxSize ?? DEFAULT_MAX_SIZE;
  const allowedTypes = options.allowedTypes ?? [];
  const allowedExtensions = options.allowedExtensions ?? [];

  // Validate file size
  if (!validateFileSize(file.size, maxSize)) {
    return {
      valid: false,
      error: `File size exceeds maximum allowed size of ${maxSize} bytes`,
    };
  }

  // Validate MIME type
  if (allowedTypes.length > 0 && !validateMimeType(file.type, allowedTypes)) {
    return {
      valid: false,
      error: `File type '${file.type}' not allowed. Allowed types: ${allowedTypes.join(', ')}`,
    };
  }

  // Validate file extension
  if (allowedExtensions.length > 0 && !validateFileExtension(file.name, allowedExtensions)) {
    return {
      valid: false,
      error: `File extension not allowed. Allowed extensions: ${allowedExtensions.join(', ')}`,
    };
  }

  return { valid: true };
}

/**
 * Check if request is multipart/form-data
 */
export function isMultipartRequest(request: Request): boolean {
  const contentType = request.headers.get('content-type');
  return contentType ? contentType.includes('multipart/form-data') : false;
}
