/* eslint-disable @typescript-eslint/require-await */
/* eslint-disable @typescript-eslint/no-unused-vars */
/**
 * Background Job Processing Types
 *
 * Provides type definitions for the job queue system including:
 * - Job interface with metadata and status tracking
 * - JobHandler interface for job processing
 * - JobResult interface for job execution results
 * - Job options for configuration
 */

/**
 * Job interface representing a background job
 */
export interface Job<TPayload = Record<string, unknown>> {
  /**
   * Unique job identifier (UUID)
   */
  id: string;

  /**
   * Job type identifier (must match registered handler type)
   */
  type: string;

  /**
   * Job payload data
   */
  payload: TPayload;

  /**
   * Job priority (lower number = higher priority, default: 5)
   */
  priority: number;

  /**
   * Current attempt count
   */
  attempts: number;

  /**
   * Maximum number of attempts (default: 3)
   */
  maxAttempts: number;

  /**
   * Delay in milliseconds before processing (default: 0)
   */
  delay: number;

  /**
   * Timestamp when job was created
   */
  createdAt: Date;

  /**
   * Optional timestamp for scheduled execution
   */
  scheduledAt?: Date;

  /**
   * Optional timestamp when job processing started
   */
  startedAt?: Date;

  /**
   * Optional timestamp when job completed successfully
   */
  completedAt?: Date;

  /**
   * Optional timestamp when job failed
   */
  failedAt?: Date;

  /**
   * Optional error from last attempt
   */
  error?: Error;
}

/**
 * Job handler interface for processing jobs
 */
export interface JobHandler<TPayload = Record<string, unknown>> {
  /**
   * Job type identifier
   */
  type: string;

  /**
   * Handler function that processes the job payload
   *
   * @param payload - The job payload data
   * @returns Promise resolving to job result
   */
  handle: (payload: TPayload) => Promise<JobResult>;
}

/**
 * Job execution result
 */
export interface JobResult {
  /**
   * Whether the job completed successfully
   */
  success: boolean;

  /**
   * Optional error if job failed
   */
  error?: Error;

  /**
   * Optional result data
   */
  data?: unknown;
}

/**
 * Options for adding a job to the queue
 */
export interface JobOptions {
  /**
   * Job priority (lower number = higher priority, default: 5)
   */
  priority?: number;

  /**
   * Maximum number of retry attempts (default: 3)
   */
  maxAttempts?: number;

  /**
   * Delay in milliseconds before processing (default: 0)
   */
  delay?: number;

  /**
   * Scheduled execution time
   */
  scheduledAt?: Date;
}

/**
 * Job status enum
 */
export enum JobStatus {
  /**
   * Job is pending execution
   */
  PENDING = 'pending',

  /**
   * Job is currently being processed
   */
  PROCESSING = 'processing',

  /**
   * Job completed successfully
   */
  COMPLETED = 'completed',

  /**
   * Job failed after all retry attempts
   */
  FAILED = 'failed',

  /**
   * Job is scheduled for future execution
   */
  SCHEDULED = 'scheduled',
}
