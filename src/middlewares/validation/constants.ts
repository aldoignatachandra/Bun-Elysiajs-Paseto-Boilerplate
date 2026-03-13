/**
 * Validation Error Constants
 *
 * Error codes and messages for validation failures.
 */

/**
 * Field-level error codes
 */
export enum FieldErrorCode {
  INVALID_TYPE = 'INVALID_TYPE',
  REQUIRED = 'REQUIRED',
  INVALID_STRING = 'INVALID_STRING',
  TOO_SHORT = 'TOO_SHORT',
  TOO_LONG = 'TOO_LONG',
  INVALID_EMAIL = 'INVALID_EMAIL',
  INVALID_URL = 'INVALID_URL',
  INVALID_NUMBER = 'INVALID_NUMBER',
  TOO_SMALL = 'TOO_SMALL',
  TOO_LARGE = 'TOO_LARGE',
  INVALID_DATE = 'INVALID_DATE',
  INVALID_ARRAY = 'INVALID_ARRAY',
  TOO_FEW_ITEMS = 'TOO_FEW_ITEMS',
  TOO_MANY_ITEMS = 'TOO_MANY_ITEMS',
  INVALID_OBJECT = 'INVALID_OBJECT',
  CUSTOM = 'CUSTOM',
}

/**
 * Response-level error codes
 */
export const VALIDATION_ERROR_CODES = {
  VALIDATION_FAILED: 'VALIDATION_FAILED',
} as const;

/**
 * Default error messages
 */
export const DEFAULT_ERROR_MESSAGES = {
  VALIDATION_FAILED: 'Request validation failed',
  SINGLE_FIELD: 'Validation error occurred',
  MULTIPLE_FIELDS: 'Multiple validation errors occurred',
} as const;
