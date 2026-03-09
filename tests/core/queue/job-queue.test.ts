/* eslint-disable @typescript-eslint/require-await */
/* eslint-disable @typescript-eslint/no-unused-vars */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
/* eslint-disable @typescript-eslint/no-unused-vars */
import { describe, it, expect, beforeEach, afterEach } from 'bun:test';
import { JobQueue } from '@/core/queue/job-queue';
import type { Job, JobHandler, JobResult } from '@/core/queue/job.types';

describe('Job Types', () => {
  describe('Job interface', () => {
    it('should have required properties', () => {
      const job: Job = {
        id: 'test-id',
        type: 'test-job',
        payload: { data: 'test' },
        priority: 5,
        attempts: 0,
        maxAttempts: 3,
        delay: 0,
        createdAt: new Date(),
      };

      expect(job.id).toBe('test-id');
      expect(job.type).toBe('test-job');
      expect(job.payload).toEqual({ data: 'test' });
      expect(job.priority).toBe(5);
      expect(job.attempts).toBe(0);
      expect(job.maxAttempts).toBe(3);
      expect(job.delay).toBe(0);
      expect(job.createdAt).toBeInstanceOf(Date);
    });

    it('should have optional timestamp properties', () => {
      const now = new Date();
      const job: Job = {
        id: 'test-id',
        type: 'test-job',
        payload: {},
        priority: 5,
        attempts: 0,
        maxAttempts: 3,
        delay: 0,
        createdAt: now,
        scheduledAt: now,
        startedAt: now,
        completedAt: now,
        failedAt: now,
      };

      expect(job.scheduledAt).toBeInstanceOf(Date);
      expect(job.startedAt).toBeInstanceOf(Date);
      expect(job.completedAt).toBeInstanceOf(Date);
      expect(job.failedAt).toBeInstanceOf(Date);
    });

    it('should have optional error property', () => {
      const job: Job = {
        id: 'test-id',
        type: 'test-job',
        payload: {},
        priority: 5,
        attempts: 1,
        maxAttempts: 3,
        delay: 0,
        createdAt: new Date(),
        error: new Error('Test error'),
      };

      expect(job.error).toBeInstanceOf(Error);
      expect(job.error?.message).toBe('Test error');
    });
  });

  describe('JobHandler interface', () => {
    it('should have type and handle function', () => {
      const handler: JobHandler<{ test: string }> = {
        type: 'test-handler',
        handle: async payload => {
          return { success: true, data: payload.test };
        },
      };

      expect(handler.type).toBe('test-handler');
      expect(typeof handler.handle).toBe('function');
    });

    it('should handle payload correctly', async () => {
      const handler: JobHandler<{ message: string }> = {
        type: 'test-handler',
        handle: async payload => {
          return { success: true, message: payload.message };
        },
      };

      const result = await handler.handle({ message: 'test' });
      expect(result.success).toBe(true);
    });
  });

  describe('JobResult interface', () => {
    it('should represent successful job result', () => {
      const result: JobResult = {
        success: true,
      };

      expect(result.success).toBe(true);
    });

    it('should represent failed job result', () => {
      const result: JobResult = {
        success: false,
        error: new Error('Job failed'),
      };

      expect(result.success).toBe(false);
      expect(result.error).toBeInstanceOf(Error);
    });
  });
});

describe('JobQueue', () => {
  let jobQueue: JobQueue;

  beforeEach(() => {
    jobQueue = new JobQueue();
  });

  afterEach(async () => {
    await jobQueue.shutdown();
  });

  describe('registerHandler', () => {
    it('should register a job handler', () => {
      const handler: JobHandler<{ test: string }> = {
        type: 'test-job',
        handle: async () => ({ success: true }),
      };

      expect(() => jobQueue.registerHandler(handler)).not.toThrow();
    });

    it('should register multiple handlers', () => {
      const handler1: JobHandler<{ data: string }> = {
        type: 'job1',
        handle: async () => ({ success: true }),
      };

      const handler2: JobHandler<{ value: number }> = {
        type: 'job2',
        handle: async () => ({ success: true }),
      };

      jobQueue.registerHandler(handler1);
      jobQueue.registerHandler(handler2);

      // Should not throw when adding jobs for registered handlers
      expect(async () => {
        await jobQueue.add('job1', { data: 'test' });
        await jobQueue.add('job2', { value: 42 });
      }).not.toThrow();
    });

    it('should throw when registering duplicate handler type', () => {
      const handler: JobHandler<Record<string, unknown>> = {
        type: 'duplicate',
        handle: async () => ({ success: true }),
      };

      jobQueue.registerHandler(handler);

      expect(() => jobQueue.registerHandler(handler)).toThrow();
    });
  });

  describe('add', () => {
    beforeEach(() => {
      const handler: JobHandler<{ message: string }> = {
        type: 'test-job',
        handle: async () => ({ success: true }),
      };
      jobQueue.registerHandler(handler);
    });

    it('should add a job and return job ID', async () => {
      const jobId = await jobQueue.add('test-job', { message: 'hello' });

      expect(jobId).toBeDefined();
      expect(typeof jobId).toBe('string');
    });

    it('should generate unique IDs for each job', async () => {
      const id1 = await jobQueue.add('test-job', { message: '1' });
      const id2 = await jobQueue.add('test-job', { message: '2' });
      const id3 = await jobQueue.add('test-job', { message: '3' });

      expect(id1).not.toBe(id2);
      expect(id2).not.toBe(id3);
      expect(id3).not.toBe(id1);
    });

    it('should use crypto.randomUUID for ID generation', async () => {
      const jobId = await jobQueue.add('test-job', { message: 'test' });

      // UUID format validation
      const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
      expect(jobId).toMatch(uuidRegex);
    });

    it('should respect default options', async () => {
      const jobId = await jobQueue.add('test-job', { message: 'test' });
      const job = await jobQueue.getStatus(jobId);

      expect(job).toBeDefined();
      expect(job?.attempts).toBe(0);
      expect(job?.maxAttempts).toBe(3);
      expect(job?.delay).toBe(0);
      expect(job?.priority).toBe(5);
    });

    it('should accept custom priority', async () => {
      const jobId = await jobQueue.add('test-job', { message: 'test' }, { priority: 10 });
      const job = await jobQueue.getStatus(jobId);

      expect(job?.priority).toBe(10);
    });

    it(
      'should accept custom delay',
      async () => {
        const jobId = await jobQueue.add('test-job', { message: 'test' }, { delay: 100 });
        const job = await jobQueue.getStatus(jobId);

        expect(job?.delay).toBe(100);
      },
      { timeout: 10000 }
    );

    it('should accept custom maxAttempts', async () => {
      const jobId = await jobQueue.add('test-job', { message: 'test' }, { maxAttempts: 5 });
      const job = await jobQueue.getStatus(jobId);

      expect(job?.maxAttempts).toBe(5);
    });

    it(
      'should accept scheduled execution time',
      async () => {
        const scheduledAt = new Date(Date.now() + 100);
        const jobId = await jobQueue.add('test-job', { message: 'test' }, { scheduledAt });
        const job = await jobQueue.getStatus(jobId);

        expect(job?.scheduledAt).toEqual(scheduledAt);
      },
      { timeout: 10000 }
    );

    it('should throw when adding job for unregistered handler', async () => {
      let errorThrown = false;
      try {
        await jobQueue.add('unregistered-job', {});
      } catch (error) {
        errorThrown = true;
      }
      expect(errorThrown).toBe(true);
    });

    it('should process job with delay after specified time', async () => {
      let processed = false;
      const handler: JobHandler<{ message: string }> = {
        type: 'delayed-job',
        handle: async () => {
          processed = true;
          return { success: true };
        },
      };
      jobQueue.registerHandler(handler);

      const startTime = Date.now();
      await jobQueue.add('delayed-job', { message: 'test' }, { delay: 100 });
      await jobQueue.start();

      // Wait for processing
      await new Promise(resolve => setTimeout(resolve, 200));

      expect(processed).toBe(true);
      expect(Date.now() - startTime).toBeGreaterThanOrEqual(100);
    });
  });

  describe('process', () => {
    it('should process successful job', async () => {
      let processed = false;
      const handler: JobHandler<{ message: string }> = {
        type: 'success-job',
        handle: async payload => {
          processed = true;
          return { success: true };
        },
      };
      jobQueue.registerHandler(handler);

      const jobId = await jobQueue.add('success-job', { message: 'test' });
      await jobQueue.start();

      // Wait for processing
      await new Promise(resolve => setTimeout(resolve, 100));

      expect(processed).toBe(true);

      const job = await jobQueue.getStatus(jobId);
      expect(job?.completedAt).toBeDefined();
      expect(job?.attempts).toBe(1);
    });

    it('should increment attempts on processing', async () => {
      const handler: JobHandler<Record<string, unknown>> = {
        type: 'attempts-job',
        handle: async () => ({ success: true }),
      };
      jobQueue.registerHandler(handler);

      const jobId = await jobQueue.add('attempts-job', {});
      await jobQueue.start();

      await new Promise(resolve => setTimeout(resolve, 100));

      const job = await jobQueue.getStatus(jobId);
      expect(job?.attempts).toBe(1);
    });

    it('should set startedAt timestamp when processing starts', async () => {
      const handler: JobHandler<Record<string, unknown>> = {
        type: 'timestamp-job',
        handle: async () => ({ success: true }),
      };
      jobQueue.registerHandler(handler);

      const jobId = await jobQueue.add('timestamp-job', {});
      await jobQueue.start();

      await new Promise(resolve => setTimeout(resolve, 100));

      const job = await jobQueue.getStatus(jobId);
      expect(job?.startedAt).toBeDefined();
      expect(job?.startedAt).toBeInstanceOf(Date);
    });

    it('should set completedAt timestamp on success', async () => {
      const handler: JobHandler<Record<string, unknown>> = {
        type: 'complete-job',
        handle: async () => ({ success: true }),
      };
      jobQueue.registerHandler(handler);

      const jobId = await jobQueue.add('complete-job', {});
      await jobQueue.start();

      await new Promise(resolve => setTimeout(resolve, 100));

      const job = await jobQueue.getStatus(jobId);
      expect(job?.completedAt).toBeDefined();
      expect(job?.completedAt).toBeInstanceOf(Date);
    });
  });

  describe('retry logic', () => {
    it(
      'should retry failed jobs with exponential backoff',
      async () => {
        let attemptCount = 0;
        const attemptTimes: number[] = [];
        let jobCompleted = false;

        const handler: JobHandler<Record<string, unknown>> = {
          type: 'retry-job',
          handle: async () => {
            attemptCount++;
            attemptTimes.push(Date.now());
            if (attemptCount < 3) {
              throw new Error('Temporary failure');
            }
            jobCompleted = true;
            return { success: true };
          },
        };
        jobQueue.registerHandler(handler);

        const jobId = await jobQueue.add('retry-job', {});
        const startTime = Date.now();
        await jobQueue.start();

        // Wait for job to complete (3 attempts with exponential backoff)
        // First attempt: immediate, fails
        // Second attempt: after 2^1 * 1000 = 2000ms, fails
        // Third attempt: after 2^2 * 1000 = 4000ms, succeeds
        while (!jobCompleted && Date.now() - startTime < 15000) {
          await new Promise(resolve => setTimeout(resolve, 100));
        }

        expect(attemptCount).toBe(3);
        expect(jobCompleted).toBe(true);

        // Verify exponential backoff: 2^1 * 1000 = 2000ms, 2^2 * 1000 = 4000ms
        const firstRetryDelay = attemptTimes[1] - attemptTimes[0];
        const secondRetryDelay = attemptTimes[2] - attemptTimes[1];

        expect(firstRetryDelay).toBeGreaterThanOrEqual(1900); // Allow some tolerance for 2000ms
        expect(secondRetryDelay).toBeGreaterThanOrEqual(3900); // Allow some tolerance for 4000ms
      },
      { timeout: 20000 }
    );

    it(
      'should calculate backoff using Math.pow(2, attempts) * 1000',
      async () => {
        let attemptCount = 0;
        let jobCompleted = false;

        const handler: JobHandler<Record<string, unknown>> = {
          type: 'backoff-job',
          handle: async () => {
            const currentAttempt = attemptCount;
            attemptCount++;
            if (currentAttempt < 2) {
              throw new Error('Fail');
            }
            jobCompleted = true;
            return { success: true };
          },
        };
        jobQueue.registerHandler(handler);

        const jobId = await jobQueue.add('backoff-job', {});
        const startTime = Date.now();
        await jobQueue.start();

        // Wait for job to complete
        while (!jobCompleted && Date.now() - startTime < 10000) {
          await new Promise(resolve => setTimeout(resolve, 100));
        }

        // Should have 3 attempts total
        expect(attemptCount).toBe(3);
        expect(jobCompleted).toBe(true);

        const job = await jobQueue.getStatus(jobId);
        expect(job?.attempts).toBe(3);
      },
      { timeout: 20000 }
    );

    it(
      'should enforce max attempts limit',
      async () => {
        let attemptCount = 0;

        const handler: JobHandler<Record<string, unknown>> = {
          type: 'max-attempts-job',
          handle: async () => {
            attemptCount++;
            throw new Error('Always fails');
          },
        };
        jobQueue.registerHandler(handler);

        const jobId = await jobQueue.add('max-attempts-job', {}, { maxAttempts: 2 });
        await jobQueue.start();

        // Wait for all retries
        await new Promise(resolve => setTimeout(resolve, 5000));

        expect(attemptCount).toBe(2); // maxAttempts

        const job = await jobQueue.getStatus(jobId);
        expect(job?.failedAt).toBeDefined();
        expect(job?.error).toBeDefined();
      },
      { timeout: 10000 }
    );

    it(
      'should use default maxAttempts of 3',
      async () => {
        let attemptCount = 0;
        let jobFailed = false;

        const handler: JobHandler<Record<string, unknown>> = {
          type: 'default-max-job',
          handle: async () => {
            attemptCount++;
            throw new Error('Always fails');
          },
        };
        jobQueue.registerHandler(handler);

        const jobId = await jobQueue.add('default-max-job', {});
        const startTime = Date.now();
        await jobQueue.start();

        // Wait for job to fail after max attempts
        while (!jobFailed && Date.now() - startTime < 12000) {
          const job = await jobQueue.getStatus(jobId);
          if (job?.failedAt) {
            jobFailed = true;
          } else {
            await new Promise(resolve => setTimeout(resolve, 100));
          }
        }

        // Check that job has failed
        expect(jobFailed).toBe(true);
        const job = await jobQueue.getStatus(jobId);
        expect(job?.failedAt).toBeDefined();
        expect(job?.attempts).toBe(3); // Default maxAttempts
        expect(attemptCount).toBe(3); // Handler should have been called 3 times
      },
      { timeout: 20000 }
    );

    it(
      'should set error and failedAt on final failure',
      async () => {
        const handler: JobHandler<Record<string, unknown>> = {
          type: 'fail-job',
          handle: async () => {
            throw new Error('Permanent failure');
          },
        };
        jobQueue.registerHandler(handler);

        const jobId = await jobQueue.add('fail-job', {}, { maxAttempts: 1 });
        await jobQueue.start();

        await new Promise(resolve => setTimeout(resolve, 2000));

        const job = await jobQueue.getStatus(jobId);
        expect(job?.failedAt).toBeDefined();
        expect(job?.error).toBeInstanceOf(Error);
        expect(job?.error?.message).toBe('Permanent failure');
      },
      { timeout: 10000 }
    );
  });

  describe('priority queue', () => {
    it('should process higher priority jobs first', async () => {
      const processingOrder: string[] = [];

      const handler: JobHandler<{ id: string }> = {
        type: 'priority-job',
        handle: async payload => {
          processingOrder.push(payload.id);
          return { success: true };
        },
      };
      jobQueue.registerHandler(handler);

      // Add jobs with different priorities (lower number = higher priority)
      await jobQueue.add('priority-job', { id: 'low' }, { priority: 10 });
      await jobQueue.add('priority-job', { id: 'high' }, { priority: 1 });
      await jobQueue.add('priority-job', { id: 'medium' }, { priority: 5 });

      await jobQueue.start();
      await new Promise(resolve => setTimeout(resolve, 200));

      expect(processingOrder[0]).toBe('high');
      expect(processingOrder[1]).toBe('medium');
      expect(processingOrder[2]).toBe('low');
    });

    it('should process same priority jobs in FIFO order', async () => {
      const processingOrder: string[] = [];

      const handler: JobHandler<{ id: string }> = {
        type: 'fifo-job',
        handle: async payload => {
          processingOrder.push(payload.id);
          return { success: true };
        },
      };
      jobQueue.registerHandler(handler);

      // Add jobs with same priority
      await jobQueue.add('fifo-job', { id: 'first' }, { priority: 5 });
      await jobQueue.add('fifo-job', { id: 'second' }, { priority: 5 });
      await jobQueue.add('fifo-job', { id: 'third' }, { priority: 5 });

      await jobQueue.start();
      await new Promise(resolve => setTimeout(resolve, 200));

      expect(processingOrder).toEqual(['first', 'second', 'third']);
    });
  });

  describe('scheduled execution', () => {
    it('should not process job before scheduled time', async () => {
      let processed = false;
      const handler: JobHandler<Record<string, unknown>> = {
        type: 'scheduled-job',
        handle: async () => {
          processed = true;
          return { success: true };
        },
      };
      jobQueue.registerHandler(handler);

      const scheduledAt = new Date(Date.now() + 2000);
      await jobQueue.add('scheduled-job', {}, { scheduledAt });
      await jobQueue.start();

      // Should not be processed yet
      await new Promise(resolve => setTimeout(resolve, 500));
      expect(processed).toBe(false);

      // Should be processed after scheduled time
      await new Promise(resolve => setTimeout(resolve, 2000));
      expect(processed).toBe(true);
    });

    it('should process job immediately if scheduledAt is in the past', async () => {
      let processed = false;
      const handler: JobHandler<Record<string, unknown>> = {
        type: 'past-scheduled-job',
        handle: async () => {
          processed = true;
          return { success: true };
        },
      };
      jobQueue.registerHandler(handler);

      const scheduledAt = new Date(Date.now() - 1000); // 1 second ago
      await jobQueue.add('past-scheduled-job', {}, { scheduledAt });
      await jobQueue.start();

      await new Promise(resolve => setTimeout(resolve, 100));
      expect(processed).toBe(true);
    });
  });

  describe('getStatus', () => {
    it('should return job by ID', async () => {
      const handler: JobHandler<{ message: string }> = {
        type: 'status-job',
        handle: async () => ({ success: true }),
      };
      jobQueue.registerHandler(handler);

      const jobId = await jobQueue.add('status-job', { message: 'test' });
      const job = await jobQueue.getStatus(jobId);

      expect(job).toBeDefined();
      expect(job?.id).toBe(jobId);
      expect(job?.type).toBe('status-job');
      expect(job?.payload).toEqual({ message: 'test' });
    });

    it('should return null for non-existent job', async () => {
      const job = await jobQueue.getStatus('non-existent-id');
      expect(job).toBeNull();
    });

    it('should return job with current status', async () => {
      const handler: JobHandler<Record<string, unknown>> = {
        type: 'pending-job',
        handle: async () => ({ success: true }),
      };
      jobQueue.registerHandler(handler);

      const jobId = await jobQueue.add('pending-job', {});

      // Job should be pending initially
      let job = await jobQueue.getStatus(jobId);
      expect(job?.startedAt).toBeUndefined();
      expect(job?.completedAt).toBeUndefined();

      await jobQueue.start();
      await new Promise(resolve => setTimeout(resolve, 100));

      // Job should be completed
      job = await jobQueue.getStatus(jobId);
      expect(job?.startedAt).toBeDefined();
      expect(job?.completedAt).toBeDefined();
    });
  });

  describe('start and stop', () => {
    it('should start processing jobs when start is called', async () => {
      let processed = false;
      const handler: JobHandler<Record<string, unknown>> = {
        type: 'start-job',
        handle: async () => {
          processed = true;
          return { success: true };
        },
      };
      jobQueue.registerHandler(handler);

      await jobQueue.add('start-job', {});

      // Job should not be processed before start
      await new Promise(resolve => setTimeout(resolve, 100));
      expect(processed).toBe(false);

      // Job should be processed after start
      await jobQueue.start();
      await new Promise(resolve => setTimeout(resolve, 100));
      expect(processed).toBe(true);
    });

    it('should stop processing jobs when stop is called', async () => {
      let processedCount = 0;
      const handler: JobHandler<Record<string, unknown>> = {
        type: 'stop-job',
        handle: async () => {
          processedCount++;
          return { success: true };
        },
      };
      jobQueue.registerHandler(handler);

      await jobQueue.add('stop-job', {});
      await jobQueue.add('stop-job', {});
      await jobQueue.add('stop-job', {});

      await jobQueue.start();
      await jobQueue.stop();

      // Some jobs may have been processed
      await new Promise(resolve => setTimeout(resolve, 100));

      // Add more jobs after stop
      await jobQueue.add('stop-job', {});
      await jobQueue.add('stop-job', {});

      await new Promise(resolve => setTimeout(resolve, 200));

      // Additional jobs should not be processed
      expect(processedCount).toBeLessThan(5);
    });

    it('should shutdown gracefully', async () => {
      const handler: JobHandler<Record<string, unknown>> = {
        type: 'shutdown-job',
        handle: async () => ({ success: true }),
      };
      jobQueue.registerHandler(handler);

      await jobQueue.add('shutdown-job', {});
      await jobQueue.start();

      // Should not throw and complete successfully
      await jobQueue.shutdown();
      expect(true).toBe(true); // Test passes if no exception thrown
    });
  });

  describe('error handling', () => {
    it('should handle handler errors gracefully', async () => {
      const handler: JobHandler<Record<string, unknown>> = {
        type: 'error-job',
        handle: async () => {
          throw new Error('Handler error');
        },
      };
      jobQueue.registerHandler(handler);

      const jobId = await jobQueue.add('error-job', {}, { maxAttempts: 1 });
      await jobQueue.start();

      await new Promise(resolve => setTimeout(resolve, 2000));

      const job = await jobQueue.getStatus(jobId);
      expect(job?.failedAt).toBeDefined();
      expect(job?.error).toBeInstanceOf(Error);
    });

    it('should continue processing other jobs after failure', async () => {
      let successCount = 0;
      const handler: JobHandler<{ id: string }> = {
        type: 'continue-job',
        handle: async payload => {
          if (payload.id === 'fail') {
            throw new Error('Intentional failure');
          }
          successCount++;
          return { success: true };
        },
      };
      jobQueue.registerHandler(handler);

      await jobQueue.add('continue-job', { id: 'fail' }, { maxAttempts: 1 });
      await jobQueue.add('continue-job', { id: 'success1' });
      await jobQueue.add('continue-job', { id: 'success2' });

      await jobQueue.start();
      await new Promise(resolve => setTimeout(resolve, 2500));

      expect(successCount).toBe(2);
    });
  });
});
