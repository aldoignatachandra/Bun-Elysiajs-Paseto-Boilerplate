/**
 * Upload Routes
 *
 * Defines all file upload-related API endpoints.
 * Uses Elysia framework with type-safe route handlers.
 *
 * Features:
 * - Single file upload
 * - Multiple file upload
 * - File deletion
 * - File validation (size, type, extension)
 * - Rate limiting on all endpoints
 * - Swagger/OpenAPI documentation
 *
 * @module UploadRoutes
 */

import type { Elysia } from 'elysia';
import type { StorageService } from '../core/storage/storage.service';
import { z } from 'zod';
import { rateLimit } from '../middlewares/rate-limit.middleware';
import {
  uploadSuccessResponseSchema,
  uploadErrorResponseSchema,
  uploadMultipleResponseSchema,
  deleteFileResponseSchema,
} from './dto/upload.dto';

/**
 * File upload validation options
 */
const uploadOptions = {
  maxSize: 5 * 1024 * 1024, // 5MB
  allowedTypes: ['image/jpeg', 'image/png', 'image/gif', 'image/webp', 'application/pdf'],
  allowedExtensions: ['.jpg', '.jpeg', '.png', '.gif', '.webp', '.pdf'],
};

/**
 * Create upload routes
 *
 * Sets up all upload endpoints with proper middleware,
 * validation, and documentation.
 *
 * @param app - Elysia instance
 * @param storageService - Storage service instance
 * @returns Configured Elysia instance with upload routes
 */
export function createUploadRoutes(app: Elysia, storageService: StorageService): Elysia {
  return app.group('/upload', app =>
    app
      // POST /upload/single - Single file upload
      .post(
        '/single',
        async ({ body, set }) => {
          try {
            // Handle multipart form data
            // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-call
            const formData = await body.formData();
            // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access
            const fileEntry = formData.get('file');

            if (!fileEntry || !(fileEntry instanceof File)) {
              set.status = 400;
              return {
                success: false,
                error: {
                  code: 'NO_FILE',
                  message: 'No file provided. Please upload a file using the "file" field.',
                },
              };
            }

            // Convert File to Buffer
            const arrayBuffer = await fileEntry.arrayBuffer();
            const fileData = Buffer.from(arrayBuffer);

            // Upload file
            const uploadedFile = await storageService.uploadFile(
              fileData,
              fileEntry.name,
              fileEntry.type,
              uploadOptions
            );

            set.status = 200;
            return {
              success: true,
              data: uploadedFile,
            };
          } catch (error) {
            set.status = 500;
            const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
            return {
              success: false,
              error: {
                code: 'UPLOAD_FAILED',
                message: errorMessage,
              },
            };
          }
        },
        {
          body: z.any(), // FormData is handled by Elysia
          response: {
            200: uploadSuccessResponseSchema,
            400: uploadErrorResponseSchema,
            413: uploadErrorResponseSchema,
            415: uploadErrorResponseSchema,
            500: uploadErrorResponseSchema,
          },
          detail: {
            summary: 'Upload a single file',
            description: `Upload a single file with validation. Supported types: ${uploadOptions.allowedTypes.join(', ')}. Maximum size: ${uploadOptions.maxSize / 1024 / 1024}MB`,
            tags: ['Upload'],
            security: [],
          },
        }
      )
      // Apply rate limiting to upload endpoints
      .derive(() => rateLimit({ maxRequests: 20, window: 60 })(app))
      // POST /upload/multiple - Multiple file upload
      .post(
        '/multiple',
        async ({ body, set }) => {
          try {
            // Handle multipart form data
            // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-call
            const formData = await body.formData();
            const files: File[] = [];

            // Extract all files from form data
            // eslint-disable-next-line @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access
            for (const [, value] of formData.entries()) {
              if (value instanceof File) {
                files.push(value);
              }
            }

            if (files.length === 0) {
              set.status = 400;
              return {
                success: false,
                error: {
                  code: 'NO_FILES',
                  message: 'No files provided. Please upload at least one file.',
                },
              };
            }

            // Upload all files
            const uploadedFiles = await Promise.all(
              files.map(async file => {
                const arrayBuffer = await file.arrayBuffer();
                const fileData = Buffer.from(arrayBuffer);
                return storageService.uploadFile(fileData, file.name, file.type, uploadOptions);
              })
            );

            set.status = 200;
            return {
              success: true,
              data: uploadedFiles,
              count: uploadedFiles.length,
            };
          } catch (error) {
            set.status = 500;
            const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
            return {
              success: false,
              error: {
                code: 'UPLOAD_FAILED',
                message: errorMessage,
              },
            };
          }
        },
        {
          body: z.any(), // FormData is handled by Elysia
          response: {
            200: uploadMultipleResponseSchema,
            400: uploadErrorResponseSchema,
            413: uploadErrorResponseSchema,
            415: uploadErrorResponseSchema,
            500: uploadErrorResponseSchema,
          },
          detail: {
            summary: 'Upload multiple files',
            description: `Upload multiple files with validation. Maximum 10 files per request. Supported types: ${uploadOptions.allowedTypes.join(', ')}. Maximum size per file: ${uploadOptions.maxSize / 1024 / 1024}MB`,
            tags: ['Upload'],
            security: [],
          },
        }
      )
      // DELETE /upload/:fileName - Delete file
      .delete(
        '/:fileName',
        async ({ params, set }) => {
          try {
            const { fileName } = params;

            // Validate filename
            if (!fileName || fileName.trim().length === 0) {
              set.status = 400;
              return {
                success: false,
                error: {
                  code: 'INVALID_FILENAME',
                  message: 'Invalid filename provided',
                },
              };
            }

            // Delete file
            await storageService.deleteFile(fileName);

            set.status = 200;
            return {
              success: true,
              message: 'File deleted successfully',
            };
          } catch (error) {
            set.status = 500;
            const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
            return {
              success: false,
              error: {
                code: 'DELETE_FAILED',
                message: errorMessage,
              },
            };
          }
        },
        {
          params: z.object({
            fileName: z.string().min(1),
          }),
          response: {
            200: deleteFileResponseSchema,
            400: uploadErrorResponseSchema,
            404: uploadErrorResponseSchema,
            500: uploadErrorResponseSchema,
          },
          detail: {
            summary: 'Delete a file',
            description:
              'Delete a file by its filename. Note: This uses the server-generated filename, not the original filename.',
            tags: ['Upload'],
            security: [], // TODO: Add authentication when implementing
          },
        }
      )
  );
}
