/**
 * Validation Error Formatter
 *
 * Utilities for formatting validation error messages.
 */

import type { z } from 'zod';
import { FieldErrorCode } from './constants';

/**
 * Format user-friendly error message for a field error
 */
export function formatFieldError(code: FieldErrorCode, field: string, issue?: z.ZodIssue): string {
  const label = getFieldLabel(field);

  switch (code) {
    case FieldErrorCode.REQUIRED:
      return `${label} is required`;

    case FieldErrorCode.INVALID_EMAIL:
      return `${label} must be a valid email address`;

    case FieldErrorCode.INVALID_URL:
      return `${label} must be a valid URL`;

    case FieldErrorCode.TOO_SHORT: {
      const minLength = getMinimum(issue);
      return `${label} must be at least ${minLength} character${minLength !== 1 ? 's' : ''}`;
    }

    case FieldErrorCode.TOO_LONG: {
      const maxLength = getMaximum(issue);
      return `${label} must not exceed ${maxLength} character${maxLength !== 1 ? 's' : ''}`;
    }

    case FieldErrorCode.INVALID_NUMBER:
      return `${label} must be a valid number`;

    case FieldErrorCode.TOO_SMALL: {
      const min = getMinimum(issue);
      return `${label} must be at least ${min}`;
    }

    case FieldErrorCode.TOO_LARGE: {
      const max = getMaximum(issue);
      return `${label} must not exceed ${max}`;
    }

    case FieldErrorCode.INVALID_TYPE: {
      const expectedType = getExpectedType(issue);
      return `${label} must be ${article(expectedType)} ${expectedType}`;
    }

    case FieldErrorCode.INVALID_ARRAY:
      return `${label} must be an array`;

    case FieldErrorCode.INVALID_OBJECT:
      return `${label} must be an object`;

    case FieldErrorCode.INVALID_DATE:
      return `${label} must be a valid date`;

    case FieldErrorCode.TOO_FEW_ITEMS: {
      const minItems = getMinimum(issue);
      return `${label} must have at least ${minItems} item${minItems !== 1 ? 's' : ''}`;
    }

    case FieldErrorCode.TOO_MANY_ITEMS: {
      const maxItems = getMaximum(issue);
      return `${label} must not have more than ${maxItems} item${maxItems !== 1 ? 's' : ''}`;
    }

    default:
      return issue?.message ?? `${label} is invalid`;
  }
}

/**
 * Get human-readable field label from path
 */
export function getFieldLabel(fieldPath: string): string {
  if (!fieldPath) {
    return 'Field';
  }

  return fieldPath
    .split(/\.|\[|\]/)
    .filter(Boolean)
    .map(segment =>
      // Convert camelCase to Title Case
      segment.replace(/([a-z])([A-Z])/g, '$1 $2').replace(/^./, str => str.toUpperCase())
    )
    .join(' → ');
}

/**
 * Get article (a/an) for a word
 */
function article(word: string): string {
  const vowels = ['a', 'e', 'i', 'o', 'u'];
  const firstChar = word.charAt(0).toLowerCase();
  return vowels.includes(firstChar) ? 'an' : 'a';
}

/**
 * Get minimum value from Zod issue
 */
function getMinimum(issue?: z.ZodIssue): number {
  if (!issue) return 0;
  if ('minimum' in issue && typeof issue.minimum === 'number') {
    return issue.minimum;
  }
  return 0;
}

/**
 * Get maximum value from Zod issue
 */
function getMaximum(issue?: z.ZodIssue): number {
  if (!issue) return 0;
  if ('maximum' in issue && typeof issue.maximum === 'number') {
    return issue.maximum;
  }
  return 0;
}

/**
 * Get expected type from Zod issue
 */
function getExpectedType(issue?: z.ZodIssue): string {
  if (!issue) return 'valid value';
  if ('expected' in issue && issue.expected) {
    return String(issue.expected);
  }
  return 'valid value';
}
