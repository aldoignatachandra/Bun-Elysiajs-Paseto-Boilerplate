/* eslint-disable @typescript-eslint/require-await */
/* eslint-disable @typescript-eslint/no-unused-vars */
/**
 * Background Job Queue Implementation
 *
 * Provides in-memory job queue with support for:
 * - Job handler registration
 * - Priority-based job processing
 * - Retry logic with exponential backoff
 * - Scheduled and delayed execution
 * - Job status tracking
 */

import { logger } from '../logging/logger';
import type { Job, JobHandler, JobOptions, JobResult } from './job.types';

/**
 * Default job options
 */
const DEFAULT_OPTIONS = {
  priority: 5,
  maxAttempts: 3,
  delay: 0,
} as const;

/**
 * Job queue implementation
 */
export class JobQueue {
  private handlers: Map<string, JobHandler> = new Map();
  private jobs: Map<string, Job> = new Map();
  private priorityQueue: Job[] = [];
  private processing: Set<string> = new Set();
  private running: boolean = false;
  private timeoutIds: Set<NodeJS.Timeout> = new Set();

  /**
   * Register a job handler
   *
   * @param handler - Job handler to register
   * @throws Error if handler type is already registered
   */
  registerHandler<TPayload = Record<string, unknown>>(handler: JobHandler<TPayload>): void {
    if (this.handlers.has(handler.type)) {
      throw new Error(`Handler for job type '${handler.type}' is already registered`);
    }

    this.handlers.set(handler.type, handler);
    logger.debug('Job handler registered', { type: handler.type });
  }

  /**
   * Add a job to the queue
   *
   * @param type - Job type (must match registered handler)
   * @param payload - Job payload data
   * @param options - Job options
   * @returns Job ID
   * @throws Error if handler is not registered
   */
  async add<TPayload = Record<string, unknown>>(
    type: string,
    payload: TPayload,
    options: JobOptions = {}
  ): Promise<string> {
    const handler = this.handlers.get(type);
    if (!handler) {
      throw new Error(`No handler registered for job type '${type}'`);
    }

    const opts = { ...DEFAULT_OPTIONS, ...options };

    const job: Job<TPayload> = {
      id: crypto.randomUUID(),
      type,
      payload,
      priority: opts.priority ?? DEFAULT_OPTIONS.priority,
      attempts: 0,
      maxAttempts: opts.maxAttempts ?? DEFAULT_OPTIONS.maxAttempts,
      delay: opts.delay ?? DEFAULT_OPTIONS.delay,
      createdAt: new Date(),
      scheduledAt: opts.scheduledAt,
    };

    this.jobs.set(job.id, job);

    // Calculate delay based on scheduled time or immediate delay
    let executionDelay = job.delay;
    if (job.scheduledAt) {
      const now = Date.now();
      const scheduledTime = job.scheduledAt.getTime();
      executionDelay = Math.max(0, scheduledTime - now) + job.delay;
    }

    if (executionDelay > 0) {
      // Schedule job for delayed execution
      const timeoutId = setTimeout(() => {
        this.enqueueJob(job);
        this.timeoutIds.delete(timeoutId);
      }, executionDelay);
      this.timeoutIds.add(timeoutId);
    } else {
      // Add to immediate queue
      this.enqueueJob(job);
    }

    logger.debug('Job added to queue', { jobId: job.id, type: job.type });
    return job.id;
  }

  /**
   * Get job status by ID
   *
   * @param id - Job ID
   * @returns Job object or null if not found
   */
  async getStatus(id: string): Promise<Job | null> {
    return this.jobs.get(id) ?? null;
  }

  /**
   * Start processing jobs
   */
  async start(): Promise<void> {
    if (this.running) {
      return;
    }

    this.running = true;
    logger.info('Job queue started');
    this.processQueue();
  }

  /**
   * Stop processing jobs
   */
  async stop(): Promise<void> {
    this.running = false;
    logger.info('Job queue stopped');
  }

  /**
   * Shutdown the job queue gracefully
   */
  async shutdown(): Promise<void> {
    await this.stop();

    // Wait for pending retries to complete (up to 15 seconds)
    const maxWaitTime = 15000;
    const startTime = Date.now();
    while (this.timeoutIds.size > 0 && Date.now() - startTime < maxWaitTime) {
      await new Promise(resolve => setTimeout(resolve, 100));
    }

    // Clear any remaining scheduled timeouts
    for (const timeoutId of this.timeoutIds) {
      clearTimeout(timeoutId);
    }
    this.timeoutIds.clear();

    logger.info('Job queue shut down');
  }

  /**
   * Enqueue a job to the priority queue
   */
  private enqueueJob(job: Job): void {
    // Insert job in priority order (lower number = higher priority)
    let inserted = false;
    for (let i = 0; i < this.priorityQueue.length; i++) {
      if (job.priority < this.priorityQueue[i].priority) {
        this.priorityQueue.splice(i, 0, job);
        inserted = true;
        break;
      }
    }

    if (!inserted) {
      this.priorityQueue.push(job);
    }
  }

  /**
   * Process the job queue
   */
  private processQueue(): void {
    if (!this.running) {
      return;
    }

    // Process next job if available
    if (this.priorityQueue.length > 0) {
      const job = this.priorityQueue.shift();
      if (job && !this.processing.has(job.id)) {
        this.processJob(job).catch(error => {
          logger.error('Error processing job', { jobId: job.id, error });
        });
      }
    }

    // Continue processing
    if (this.running) {
      // Use setImmediate to avoid blocking the event loop
      setImmediate(() => this.processQueue());
    }
  }

  /**
   * Process a single job
   */
  private async processJob(job: Job): Promise<void> {
    if (this.processing.has(job.id)) {
      return;
    }

    this.processing.add(job.id);
    job.startedAt = new Date();
    job.attempts++;

    logger.debug('Processing job', { jobId: job.id, type: job.type, attempt: job.attempts });

    try {
      const handler = this.handlers.get(job.type);
      if (!handler) {
        throw new Error(`No handler found for job type '${job.type}'`);
      }

      const result = await handler.handle(job.payload);

      if (result.success) {
        // Job completed successfully
        job.completedAt = new Date();
        this.processing.delete(job.id);
        logger.info('Job completed', { jobId: job.id, type: job.type });
      } else {
        // Job failed, check if we should retry
        throw result.error || new Error('Job failed without error');
      }
    } catch (error) {
      const err = error instanceof Error ? error : new Error(String(error));
      job.error = err;

      if (job.attempts >= job.maxAttempts) {
        // Max attempts reached, mark as failed
        job.failedAt = new Date();
        this.processing.delete(job.id);
        logger.error('Job failed after max attempts', {
          jobId: job.id,
          type: job.type,
          attempts: job.attempts,
          error: err.message,
        });
      } else {
        // Retry with exponential backoff
        const backoffDelay = Math.pow(2, job.attempts) * 1000;
        logger.info('Retrying job', {
          jobId: job.id,
          type: job.type,
          attempt: job.attempts,
          nextAttemptIn: backoffDelay,
        });

        this.processing.delete(job.id);

        // Schedule retry
        const timeoutId = setTimeout(() => {
          this.enqueueJob(job);
          this.timeoutIds.delete(timeoutId);
        }, backoffDelay);
        this.timeoutIds.add(timeoutId);
      }
    }
  }
}
