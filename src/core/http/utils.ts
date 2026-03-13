/**
 * HTTP Utility Functions
 *
 * Common utilities for HTTP request processing.
 */

export interface PaginationParams {
  page?: number | string;
  limit?: number | string;
}

export interface PaginationResult {
  page: number;
  limit: number;
  offset: number;
}

/**
 * Default pagination configuration
 */
const DEFAULT_PAGE = 1;
const DEFAULT_LIMIT = 10;
const MAX_LIMIT = 100;
const MIN_PAGE = 1;

/**
 * Parse and validate pagination parameters
 *
 * @param params - Raw pagination parameters from request
 * @returns Parsed and validated pagination result
 */
export function parsePagination(params: PaginationParams): PaginationResult {
  let page = DEFAULT_PAGE;
  let limit = DEFAULT_LIMIT;

  // Parse page parameter
  if (params.page !== undefined && params.page !== null && params.page !== '') {
    const parsedPage = typeof params.page === 'string' ? parseInt(params.page, 10) : Math.floor(params.page);

    if (!isNaN(parsedPage) && isFinite(parsedPage)) {
      page = Math.max(parsedPage, MIN_PAGE);
    }
  }

  // Parse limit parameter
  if (params.limit !== undefined && params.limit !== null && params.limit !== '') {
    const parsedLimit = typeof params.limit === 'string' ? parseInt(params.limit, 10) : Math.floor(params.limit);

    if (!isNaN(parsedLimit) && isFinite(parsedLimit) && parsedLimit > 0) {
      limit = Math.min(parsedLimit, MAX_LIMIT);
    }
  }

  return {
    page,
    limit,
    offset: (page - 1) * limit,
  };
}

/**
 * SQL injection patterns to detect and remove
 */
const SQL_PATTERNS = [
  /(\b(SELECT|INSERT|UPDATE|DELETE|DROP|CREATE|ALTER|TRUNCATE|EXEC|UNION|WHERE)\b)/gi,
  /(-{2,}|;|\/\*|\*\/)/g, // Comments and statement separators
  /(\b(OR|AND)\s+\d+\s*=\s*\d+)/gi, // Always-true conditions
  /(\b(OR|AND)\s+['"].+['"]\s*=\s*['"].+['"])/gi, // Always-true string comparisons
  /[';"]|(\|\||&&)/g, // Additional SQL metacharacters
];

/**
 * Sanitize query string to prevent SQL injection
 *
 * @param input - Raw query string input
 * @returns Sanitized query string with SQL patterns removed
 */
export function sanitizeQuery(input: string | null | undefined): string {
  // Handle null, undefined, or empty input
  if (input === null || input === undefined) {
    return '';
  }

  const sanitized = input.toString().trim();

  // Return empty string for empty input
  if (sanitized === '') {
    return '';
  }

  // Remove SQL injection patterns
  let cleaned = sanitized;
  for (const pattern of SQL_PATTERNS) {
    cleaned = cleaned.replace(pattern, '');
  }

  return cleaned;
}

/**
 * Type guard to check if input is a valid pagination parameter
 */
export function isValidPaginationParam(value: unknown): value is number | string {
  if (value === null || value === undefined || value === '') {
    return false;
  }
  return typeof value === 'number' || typeof value === 'string';
}
