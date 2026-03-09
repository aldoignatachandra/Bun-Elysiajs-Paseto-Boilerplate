/* eslint-disable @typescript-eslint/require-await */
/* eslint-disable @typescript-eslint/no-unused-vars */
/**
 * Queue Plugin for Elysia
 *
 * Provides background job processing integration for Elysia applications.
 *
 * Features:
 * - Automatic job queue setup
 * - Queue instance available in request store
 * - Auto-start option
 * - Graceful shutdown support
 */

import { Elysia } from 'elysia';
import { JobQueue } from '@core/queue/job-queue';
import { logger } from '@core/logging/logger';

/**
 * Queue plugin options
 */
export interface QueuePluginOptions {
  /**
   * JobQueue instance to use
   */
  jobQueue: JobQueue;

  /**
   * Automatically start the job queue (default: true)
   */
  autoStart?: boolean;

  /**
   * Graceful shutdown timeout in milliseconds (default: 10000)
   */
  shutdownTimeout?: number;
}

/**
 * Queue plugin for Elysia
 *
 * @example
 * ```typescript
 * import { Elysia } from 'elysia';
 * import { queuePlugin } from '@/plugins/queue.plugin';
 * import { JobQueue } from '@/core/queue/job-queue';
 *
 * const jobQueue = new JobQueue();
 * const app = new Elysia()
 *   .use(queuePlugin({ jobQueue }));
 * ```
 */
export function queuePlugin(options: QueuePluginOptions) {
  const { jobQueue, autoStart = true, shutdownTimeout = 10000 } = options;

  // Validate options
  if (!jobQueue) {
    throw new Error('jobQueue is required for queue plugin');
  }

  return new Elysia({ name: 'queue-plugin' })
    .state({
      jobQueue,
      autoStart,
    })
    .onStart(async ({ store }) => {
      const queue = (store as { jobQueue: JobQueue }).jobQueue;
      const shouldAutoStart = (store as { autoStart: boolean }).autoStart;

      if (shouldAutoStart) {
        await queue.start();
        logger.info('Job queue started automatically');
      }

      logger.info('Queue plugin loaded');
    })
    .onBeforeHandle(({ store }) => {
      // Make jobQueue available in context
      const queue = (store as { jobQueue: JobQueue }).jobQueue;
      return {
        queue,
      };
    })
    .onStop(async () => {
      await jobQueue.shutdown();
      logger.info('Job queue shut down');
    });
}

export { JobQueue };
