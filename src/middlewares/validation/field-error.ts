/**
 * Field Error Class
 *
 * Represents a single field validation error with formatting.
 */

import type { z } from 'zod';
import type { FieldErrorObject } from './types';
import { FieldErrorCode } from './constants';
import { formatFieldError } from './formatter';

/**
 * Represents a single field validation error
 */
export class FieldError {
  constructor(
    public readonly field: string,
    public readonly message: string,
    public readonly code: string,
    public readonly received?: unknown,
    public readonly expected?: string
  ) {}

  /**
   * Convert to plain object for JSON serialization
   */
  toJSON(): FieldErrorObject {
    const obj: FieldErrorObject = {
      field: this.field,
      message: this.message,
      code: this.code,
    };

    if (this.received !== undefined) {
      obj.received = this.received;
    }

    if (this.expected !== undefined) {
      obj.expected = this.expected;
    }

    return obj;
  }

  /**
   * Create a FieldError from a Zod issue
   */
  static fromZodIssue(issue: z.ZodIssue): FieldError {
    const field = formatFieldPath(issue.path);
    const code = mapZodCodeToFieldErrorCode(issue.code);
    const message = formatFieldError(code, field, issue);

    return new FieldError(field, message, code, issue.received, getExpectedValue(issue));
  }
}

/**
 * Format Zod path array to dot-notation string
 */
function formatFieldPath(path: (string | number)[]): string {
  return path
    .map(segment => {
      if (typeof segment === 'number') {
        return `[${segment}]`;
      }
      return segment;
    })
    .join('.')
    .replace(/\.\[/g, '[');
}

/**
 * Map Zod error code to field error code
 */
function mapZodCodeToFieldErrorCode(zodCode: z.ZodIssueCode): FieldErrorCode {
  const mapping: Partial<Record<z.ZodIssueCode, FieldErrorCode>> = {
    invalid_string: FieldErrorCode.INVALID_STRING,
    too_small: FieldErrorCode.TOO_SMALL,
    too_big: FieldErrorCode.TOO_LARGE,
    invalid_type: FieldErrorCode.INVALID_TYPE,
    invalid_union: FieldErrorCode.INVALID_TYPE,
    invalid_date: FieldErrorCode.INVALID_DATE,
    custom: FieldErrorCode.CUSTOM,
  };

  return mapping[zodCode] ?? FieldErrorCode.CUSTOM;
}

/**
 * Extract expected value from Zod issue
 */
function getExpectedValue(issue: z.ZodIssue): string | undefined {
  if ('minimum' in issue && typeof issue.minimum === 'number') {
    return String(issue.minimum);
  }
  if ('maximum' in issue && typeof issue.maximum === 'number') {
    return String(issue.maximum);
  }
  if ('expected' in issue && issue.expected) {
    return String(issue.expected);
  }
  if (issue.code === 'invalid_type' && issue.expected) {
    return String(issue.expected);
  }
  return undefined;
}
