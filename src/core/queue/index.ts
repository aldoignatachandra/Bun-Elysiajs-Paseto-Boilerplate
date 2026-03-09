/* eslint-disable @typescript-eslint/require-await */
/* eslint-disable @typescript-eslint/no-unused-vars */
/**
 * Background Job Queue System
 *
 * Provides in-memory job queue with support for:
 * - Job handler registration
 * - Priority-based job processing
 * - Retry logic with exponential backoff
 * - Scheduled and delayed execution
 * - Job status tracking
 *
 * @example
 * ```typescript
 * import { JobQueue, Worker } from '@/core/queue';
 *
 * const jobQueue = new JobQueue();
 * const worker = new Worker(jobQueue);
 *
 * // Register handlers
 * worker.registerJobHandlers(worker.getAllHandlers());
 *
 * // Add jobs
 * await jobQueue.add('email', {
 *   to: 'user@example.com',
 *   subject: 'Welcome',
 *   body: 'Welcome to our app!'
 * });
 *
 * // Start processing
 * await jobQueue.start();
 * ```
 */

export { JobQueue } from './job-queue';
export { Worker } from './worker';
export type {
  Job,
  JobHandler,
  JobResult,
  JobOptions,
  JobStatus,
} from './job.types';
export type {
  EmailPayload,
  VerificationPayload,
  PasswordResetPayload,
} from './worker';
