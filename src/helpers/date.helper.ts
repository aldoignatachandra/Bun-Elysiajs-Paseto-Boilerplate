/**
 * Date Helper Utilities
 *
 * Provides date formatting functions for consistent timestamp handling
 * across the application.
 *
 * @module DateHelper
 */

/**
 * Options for formatting local timestamps
 */
export interface FormatLocalTimestampOptions {
  /**
   * Whether to include timezone information in the output
   * @default true
   */
  includeTimezone?: boolean;

  /**
   * Custom date to format (defaults to current time)
   */
  date?: Date;
}

/**
 * Format date to readable local timezone string
 *
 * @param options - Formatting options
 * @returns Formatted timestamp string
 *
 * @example
 * ```typescript
 * // With timezone (default)
 * formatLocalTimestamp()
 * // "2026-03-24 08:05:54 (GMT+7)"
 *
 * // Without timezone
 * formatLocalTimestamp({ includeTimezone: false })
 * // "2026-03-24 08:05:54"
 *
 * // Custom date
 * formatLocalTimestamp({ date: new Date('2026-01-15T10:30:00Z') })
 * // "2026-01-15 17:30:00 (GMT+7)"
 * ```
 */
export function formatLocalTimestamp(options: FormatLocalTimestampOptions = {}): string {
  const { includeTimezone = true, date = new Date() } = options;

  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  const hours = String(date.getHours()).padStart(2, '0');
  const minutes = String(date.getMinutes()).padStart(2, '0');
  const seconds = String(date.getSeconds()).padStart(2, '0');

  const datetime = `${year}-${month}-${day} ${hours}:${minutes}:${seconds}`;

  if (!includeTimezone) {
    return datetime;
  }

  // Get timezone offset
  const offsetMinutes = -date.getTimezoneOffset();
  const offsetHours = Math.floor(Math.abs(offsetMinutes) / 60);
  const offsetMins = Math.abs(offsetMinutes) % 60;
  const offsetSign = offsetMinutes >= 0 ? '+' : '-';

  // Format timezone (GMT+7 or GMT+5:30)
  const timezone = offsetMins > 0 ? `GMT${offsetSign}${offsetHours}:${String(offsetMins).padStart(2, '0')}` : `GMT${offsetSign}${offsetHours}`;

  return `${datetime} (${timezone})`;
}

/**
 * Get the current timezone name/offset
 *
 * @returns Timezone string (e.g., "GMT+7")
 */
export function getCurrentTimezone(): string {
  const date = new Date();
  const offsetMinutes = -date.getTimezoneOffset();
  const offsetHours = Math.floor(Math.abs(offsetMinutes) / 60);
  const offsetMins = Math.abs(offsetMinutes) % 60;
  const offsetSign = offsetMinutes >= 0 ? '+' : '-';

  return offsetMins > 0 ? `GMT${offsetSign}${offsetHours}:${String(offsetMins).padStart(2, '0')}` : `GMT${offsetSign}${offsetHours}`;
}

/**
 * Options for formatting dates from ISO string or Date object
 */
export interface FormatDateOptions {
  /**
   * Whether to include timezone information in the output
   * @default true
   */
  includeTimezone?: boolean;
}

/**
 * Format a date from ISO string or Date object to readable local timezone string
 *
 * @param dateInput - ISO date string or Date object
 * @param options - Formatting options
 * @returns Formatted timestamp string or null if invalid input
 *
 * @example
 * ```typescript
 * // From ISO string
 * formatDateFromISO('2026-03-24T14:23:16.013Z')
 * // "2026-03-24 21:23:16 (GMT+7)"
 *
 * // From Date object
 * formatDateFromISO(new Date('2026-03-24T14:23:16.013Z'))
 * // "2026-03-24 21:23:16 (GMT+7)"
 *
 * // Without timezone
 * formatDateFromISO('2026-03-24T14:23:16.013Z', { includeTimezone: false })
 * // "2026-03-24 21:23:16"
 *
 * // Invalid input returns null
 * formatDateFromISO(null)
 * // null
 * ```
 */
export function formatDateFromISO(dateInput: string | Date | null | undefined, options: FormatDateOptions = {}): string | null {
  if (!dateInput) {
    return null;
  }

  const { includeTimezone = true } = options;

  // Parse input to Date object
  const date = dateInput instanceof Date ? dateInput : new Date(dateInput);

  // Validate date
  if (isNaN(date.getTime())) {
    return null;
  }

  return formatLocalTimestamp({ date, includeTimezone });
}
