/**
 * Common Zod Schemas
 *
 * Reusable validation schemas for common input types.
 * These schemas can be composed to create more complex validations.
 */

import { z } from 'zod';

/**
 * UUID v4 schema
 * Validates standard UUID format (xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx)
 */
export const uuidSchema = z.string().uuid('Invalid UUID format');

/**
 * Email schema
 * Validates email format with reasonable constraints
 */
export const emailSchema = z.string().min(1, 'Email is required').email('Invalid email format').max(254, 'Email is too long').toLowerCase().trim();

/**
 * Password schema
 * Enforces strong password requirements:
 * - At least 8 characters
 * - At least one lowercase letter
 * - At least one uppercase letter
 * - At least one number
 * - At least one special character
 */
export const passwordSchema = z
  .string()
  .min(8, 'Password must be at least 8 characters')
  .max(128, 'Password is too long')
  .regex(/[a-z]/, 'Password must contain at least one lowercase letter')
  .regex(/[A-Z]/, 'Password must contain at least one uppercase letter')
  .regex(/[0-9]/, 'Password must contain at least one number')
  .regex(/[^a-zA-Z0-9]/, 'Password must contain at least one special character');

/**
 * Simple password schema (less strict)
 * For cases where strong password requirements are not needed
 */
export const simplePasswordSchema = z.string().min(6, 'Password must be at least 6 characters').max(128, 'Password is too long');

/**
 * Name schema (first name, last name, etc.)
 * Validates reasonable name constraints
 */
export const nameSchema = z.string().min(1, 'Name is required').max(100, 'Name is too long').trim();

/**
 * Optional name schema
 * Same as name schema but allows null/undefined
 */
export const optionalNameSchema = nameSchema.optional().nullable();

/**
 * Username schema
 * Validates username format: alphanumeric + underscore, 3-50 characters
 */
export const usernameSchema = z
  .string()
  .min(3, 'Username must be at least 3 characters')
  .max(50, 'Username must be at most 50 characters')
  .regex(/^[a-zA-Z0-9_]+$/, 'Username can only contain alphanumeric characters and underscores')
  .trim();

/**
 * Optional username schema
 */
export const optionalUsernameSchema = usernameSchema.optional().nullable();

/**
 * URL schema
 * Validates URL format
 */
export const urlSchema = z.string().url('Invalid URL format');

/**
 * Optional URL schema
 */
export const optionalUrlSchema = urlSchema.optional().nullable();

/**
 * Date schema (ISO string)
 * Validates ISO 8601 date format
 */
export const dateStringSchema = z.string().datetime('Invalid date format');

/**
 * Optional date schema
 */
export const optionalDateStringSchema = dateStringSchema.optional().nullable();

/**
 * Boolean string schema
 * Accepts 'true', 'false', '1', '0' and converts to boolean
 */
export const booleanStringSchema = z
  .string()
  .transform(val => val === 'true' || val === '1')
  .or(z.boolean());

/**
 * Pagination schema
 * Validates pagination parameters
 */
export const paginationSchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(20),
  sortBy: z.string().optional(),
  sortOrder: z.enum(['asc', 'desc']).default('asc'),
});

export type PaginationInput = z.infer<typeof paginationSchema>;

/**
 * ID list schema
 * Validates an array of UUIDs
 */
export const idListSchema = z.array(uuidSchema).min(1, 'At least one ID is required');

/**
 * Search query schema
 * Validates search query parameters
 */
export const searchQuerySchema = z.object({
  q: z.string().min(1, 'Search query is required').max(255).trim(),
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(20),
});

export type SearchQueryInput = z.infer<typeof searchQuerySchema>;

/**
 * Date range schema
 * Validates date range parameters
 */
export const dateRangeSchema = z.object({
  startDate: dateStringSchema.optional(),
  endDate: dateStringSchema.optional(),
});

export type DateRangeInput = z.infer<typeof dateRangeSchema>;
