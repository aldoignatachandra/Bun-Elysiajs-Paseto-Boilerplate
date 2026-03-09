/**
 * Upload Routes DTO Schemas
 *
 * Zod schemas for validation and documentation of upload routes.
 */

import { z } from 'zod';

/**
 * Uploaded file schema
 */
export const uploadedFileSchema = z.object({
  originalName: z.string(),
  fileName: z.string(),
  mimeType: z.string(),
  size: z.number(),
  path: z.string(),
  url: z.string(),
  uploadedAt: z.date(),
});

/**
 * Upload error schema
 */
export const uploadErrorSchema = z.object({
  code: z.string(),
  message: z.string(),
});

/**
 * Single file upload success response schema
 */
export const uploadSuccessResponseSchema = z.object({
  success: z.literal(true),
  data: uploadedFileSchema,
});

/**
 * Multiple file upload success response schema
 */
export const uploadMultipleResponseSchema = z.object({
  success: z.literal(true),
  data: z.array(uploadedFileSchema),
  count: z.number(),
});

/**
 * Delete file success response schema
 */
export const deleteFileResponseSchema = z.object({
  success: z.literal(true),
  message: z.string(),
});

/**
 * Upload error response schema
 */
export const uploadErrorResponseSchema = z.object({
  success: z.literal(false),
  error: uploadErrorSchema,
});
