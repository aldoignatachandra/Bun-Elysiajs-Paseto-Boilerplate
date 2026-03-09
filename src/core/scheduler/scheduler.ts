import cronParser from 'cron-parser';
import { v4 as uuidv4 } from 'uuid';
import { logger } from '../logging/logger';
import type { ScheduledJob, ScheduleJobOptions, SchedulerOptions } from './cron.types';

/**
 * Helper function to parse cron expression
 */
function parseCronExpression(expression: string): ReturnType<typeof cronParser.parse> {
  return cronParser.parse(expression);
}

/**
 * Scheduler class for managing cron-based scheduled tasks
 *
 * Features:
 * - Cron expression parsing using cron-parser
 * - Concurrent execution prevention by default
 * - Proper error handling and logging
 * - Job scheduling, unscheduling, and bulk stopping
 */
class Scheduler {
  private jobs: Map<string, ScheduledJob> = new Map();
  private timers: Map<string, NodeJS.Timeout> = new Map();
  private options: Required<SchedulerOptions>;

  constructor(options: SchedulerOptions = {}) {
    this.options = {
      allowConcurrent: options.allowConcurrent ?? false,
      logger: options.logger ?? logger,
    };
  }

  /**
   * Schedule a new job or update an existing one
   *
   * @param options - Job configuration options
   * @returns The scheduled job object
   * @throws Error if cron expression is invalid
   */
  schedule(options: ScheduleJobOptions): ScheduledJob {
    const { id, name, cron, handler, enabled = true } = options;

    // Validate cron expression
    try {
      parseCronExpression(cron);
    } catch (error) {
      throw new Error(
        `Invalid cron expression "${cron}": ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }

    // Generate ID if not provided
    const jobId = id ?? uuidv4();

    // If job exists, unschedule it first
    if (this.jobs.has(jobId)) {
      this.unschedule(jobId);
    }

    // Create job object
    const job: ScheduledJob = {
      id: jobId,
      name,
      cron,
      handler,
      enabled,
      lastRun: null,
      nextRun: null,
      running: false,
    };

    // Calculate next run time
    job.nextRun = this.calculateNextRun(cron);

    // Store job
    this.jobs.set(jobId, job);

    // Schedule the job if enabled
    if (enabled) {
      this.scheduleNextRun(job);
    }

    this.options.logger.info(`Scheduled job "${name}" (${jobId}) with cron "${cron}"`, {
      nextRun: job.nextRun?.toISOString(),
    });

    return job;
  }

  /**
   * Unschedule a job by ID
   *
   * @param id - Job ID to unschedule
   * @returns true if job was found and removed, false otherwise
   */
  unschedule(id: string): boolean {
    const job = this.jobs.get(id);

    if (!job) {
      return false;
    }

    // Clear timer if exists
    const timer = this.timers.get(id);
    if (timer) {
      clearTimeout(timer);
      this.timers.delete(id);
    }

    // Remove job
    this.jobs.delete(id);

    this.options.logger.info(`Unscheduled job "${job.name}" (${id})`);

    return true;
  }

  /**
   * Stop all scheduled jobs and clear all timers
   */
  stopAll(): void {
    // Clear all timers
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    for (const [id, timer] of this.timers.entries()) {
      clearTimeout(timer);
    }

    // Clear timers map
    this.timers.clear();

    // Clear jobs map
    const jobCount = this.jobs.size;
    this.jobs.clear();

    this.options.logger.info(`Stopped ${jobCount} scheduled job(s)`);
  }

  /**
   * Get a job by ID
   *
   * @param id - Job ID
   * @returns Job object or undefined if not found
   */
  getJob(id: string): ScheduledJob | undefined {
    return this.jobs.get(id);
  }

  /**
   * Get all scheduled jobs
   *
   * @returns Array of all scheduled jobs
   */
  getAllJobs(): ScheduledJob[] {
    return Array.from(this.jobs.values());
  }

  /**
   * Schedule the next run of a job
   *
   * @param job - Job to schedule
   */
  private scheduleNextRun(job: ScheduledJob): void {
    if (!job.nextRun) {
      return;
    }

    const now = Date.now();
    const nextRunTime = job.nextRun.getTime();
    const delay = nextRunTime - now;

    // If next run is in the past, skip to next occurrence
    if (delay <= 0) {
      void this.executeJob(job);
      return;
    }

    // Schedule the job
    const timer = setTimeout(() => {
      void this.executeJob(job);
    }, delay);

    this.timers.set(job.id, timer);
  }

  /**
   * Execute a job and reschedule it
   *
   * @param job - Job to execute
   */
  private async executeJob(job: ScheduledJob): Promise<void> {
    // Check if job is enabled
    if (!job.enabled) {
      return;
    }

    // Check for concurrent execution
    if (!this.options.allowConcurrent && job.running) {
      this.options.logger.warn(`Skipping job "${job.name}" (${job.id}) - already running`);
      return;
    }

    // Update job state
    job.lastRun = new Date();
    job.running = true;

    this.options.logger.info(`Executing job "${job.name}" (${job.id})`, {
      lastRun: job.lastRun.toISOString(),
    });

    try {
      // Execute the handler
      await job.handler();

      this.options.logger.info(`Completed job "${job.name}" (${job.id})`);
    } catch (error) {
      this.options.logger.error(
        `Error executing job "${job.name}" (${job.id})`,
        error instanceof Error ? error : new Error(String(error))
      );
    } finally {
      // Mark job as not running
      job.running = false;

      // Calculate and schedule next run
      job.nextRun = this.calculateNextRun(job.cron);
      this.scheduleNextRun(job);
    }
  }

  /**
   * Calculate the next run time for a cron expression
   *
   * @param cron - Cron expression
   * @returns Next run time as Date
   */
  private calculateNextRun(cron: string): Date {
    try {
      const interval = parseCronExpression(cron);
      return interval.next().toDate();
    } catch (error) {
      throw new Error(
        `Failed to parse cron expression "${cron}": ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }
  }

  /**
   * Enable a job
   *
   * @param id - Job ID
   * @returns true if job was enabled, false if not found
   */
  enableJob(id: string): boolean {
    const job = this.jobs.get(id);

    if (!job) {
      return false;
    }

    job.enabled = true;

    // If job is not scheduled, schedule it
    if (!this.timers.has(id)) {
      job.nextRun = this.calculateNextRun(job.cron);
      this.scheduleNextRun(job);
    }

    this.options.logger.info(`Enabled job "${job.name}" (${id})`);

    return true;
  }

  /**
   * Disable a job
   *
   * @param id - Job ID
   * @returns true if job was disabled, false if not found
   */
  disableJob(id: string): boolean {
    const job = this.jobs.get(id);

    if (!job) {
      return false;
    }

    job.enabled = false;

    // Clear the timer
    const timer = this.timers.get(id);
    if (timer) {
      clearTimeout(timer);
      this.timers.delete(id);
    }

    this.options.logger.info(`Disabled job "${job.name}" (${id})`);

    return true;
  }
}

// Create singleton instance
export const scheduler = new Scheduler();

// Export class for testing
export { Scheduler };
