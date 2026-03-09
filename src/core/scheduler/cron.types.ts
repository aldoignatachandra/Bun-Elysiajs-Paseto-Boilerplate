/**
 * Scheduled task types and interfaces for the cron job scheduler
 */

/**
 * Job handler function type
 * Can be sync or async
 */
export type JobHandler = () => void | Promise<void>;

/**
 * Configuration options for scheduling a job
 */
export interface ScheduleJobOptions {
  /** Optional unique identifier for the job (auto-generated if not provided) */
  id?: string;
  /** Human-readable name for the job */
  name: string;
  /** Cron expression for scheduling (e.g., '0 * * * *' for hourly) */
  cron: string;
  /** Handler function to execute when the job runs */
  handler: JobHandler;
  /** Whether the job is enabled (default: true) */
  enabled?: boolean;
}

/**
 * Represents a scheduled job with runtime state
 */
export interface ScheduledJob {
  /** Unique identifier for the job */
  id: string;
  /** Human-readable name for the job */
  name: string;
  /** Cron expression for scheduling */
  cron: string;
  /** Handler function to execute when the job runs */
  handler: JobHandler;
  /** Whether the job is currently enabled */
  enabled: boolean;
  /** Timestamp of the last execution (null if never run) */
  lastRun: Date | null;
  /** Timestamp of the next scheduled execution */
  nextRun: Date | null;
  /** Whether the job is currently running */
  running: boolean;
  /** Timer reference for the next scheduled execution */
  timer?: NodeJS.Timeout;
}

/**
 * Scheduler configuration options
 */
export interface SchedulerOptions {
  /** Whether to enable concurrent execution of the same job (default: false) */
  allowConcurrent?: boolean;
  /** Custom logger instance */
  logger?: {
    info: (message: string, context?: Record<string, unknown>) => void;
    error: (message: string, error?: unknown, context?: Record<string, unknown>) => void;
    debug: (message: string, context?: Record<string, unknown>) => void;
    warn: (message: string, context?: Record<string, unknown>) => void;
  };
}
