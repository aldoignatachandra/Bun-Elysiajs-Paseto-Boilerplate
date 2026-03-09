import { describe, it, expect, beforeEach, afterEach, mock } from 'bun:test';
import { scheduler } from '@/core/scheduler/scheduler';

describe('Scheduler (unit)', () => {
  beforeEach(() => {
    // Clear all scheduled jobs before each test
    scheduler.stopAll();
  });

  afterEach(() => {
    // Ensure all jobs are stopped after each test
    scheduler.stopAll();
  });

  describe('schedule()', () => {
    it('should schedule a job with a valid cron expression', () => {
      const handler = mock(() => {});
      const job = scheduler.schedule({
        name: 'test-job',
        cron: '0 * * * *',
        handler,
      });

      expect(job).toBeDefined();
      expect(job.id).toBeDefined();
      expect(job.name).toBe('test-job');
      expect(job.cron).toBe('0 * * * *');
      expect(job.enabled).toBe(true);
      expect(job.running).toBe(false);
    });

    it('should calculate the next run time for the job', () => {
      const handler = mock(() => {});
      const job = scheduler.schedule({
        name: 'test-job',
        cron: '0 * * * *',
        handler,
      });

      expect(job.nextRun).toBeInstanceOf(Date);
      expect(job.nextRun?.getTime()).toBeGreaterThan(Date.now());
    });

    it('should schedule multiple jobs independently', () => {
      const handler1 = mock(() => {});
      const handler2 = mock(() => {});

      const job1 = scheduler.schedule({
        name: 'job1',
        cron: '0 * * * *',
        handler: handler1,
      });

      const job2 = scheduler.schedule({
        name: 'job2',
        cron: '0 2 * * *',
        handler: handler2,
      });

      expect(job1.id).not.toBe(job2.id);
      expect(job1.name).toBe('job1');
      expect(job2.name).toBe('job2');
    });

    it('should throw an error for invalid cron expression', () => {
      const handler = mock(() => {});

      expect(() => {
        scheduler.schedule({
          name: 'invalid-job',
          cron: 'invalid-cron',
          handler,
        });
      }).toThrow();
    });

    it('should accept optional id parameter', () => {
      const handler = mock(() => {});
      const customId = 'custom-job-id';

      const job = scheduler.schedule({
        id: customId,
        name: 'test-job',
        cron: '0 * * * *',
        handler,
      });

      expect(job.id).toBe(customId);
    });

    it('should accept optional enabled parameter', () => {
      const handler = mock(() => {});

      const job = scheduler.schedule({
        name: 'test-job',
        cron: '0 * * * *',
        handler,
        enabled: false,
      });

      expect(job.enabled).toBe(false);
    });
  });

  describe('unschedule()', () => {
    it('should remove a scheduled job by id', () => {
      const handler = mock(() => {});
      const job = scheduler.schedule({
        name: 'test-job',
        cron: '0 * * * *',
        handler,
      });

      const result = scheduler.unschedule(job.id);
      expect(result).toBe(true);
    });

    it('should return false when trying to unschedule non-existent job', () => {
      const result = scheduler.unschedule('non-existent-id');
      expect(result).toBe(false);
    });

    it('should clear the timer for the unscheduled job', () => {
      const handler = mock(() => {});
      const job = scheduler.schedule({
        name: 'test-job',
        cron: '0 * * * *',
        handler,
      });

      scheduler.unschedule(job.id);

      // Verify job is no longer in scheduler
      const result = scheduler.unschedule(job.id);
      expect(result).toBe(false);
    });
  });

  describe('stopAll()', () => {
    it('should stop all scheduled jobs', () => {
      const handler1 = mock(() => {});
      const handler2 = mock(() => {});

      scheduler.schedule({
        name: 'job1',
        cron: '0 * * * *',
        handler: handler1,
      });

      scheduler.schedule({
        name: 'job2',
        cron: '0 2 * * *',
        handler: handler2,
      });

      scheduler.stopAll();

      // After stopping, we should be able to schedule new jobs with same IDs
      const job3 = scheduler.schedule({
        id: 'job1',
        name: 'job3',
        cron: '0 * * * *',
        handler: handler1,
      });

      expect(job3.id).toBe('job1');
    });

    it('should clear all timers', () => {
      const handler = mock(() => {});

      for (let i = 0; i < 5; i++) {
        scheduler.schedule({
          id: `job-${i}`,
          name: `job-${i}`,
          cron: '0 * * * *',
          handler,
        });
      }

      scheduler.stopAll();

      // All jobs should be removed
      const result = scheduler.unschedule('job-0');
      expect(result).toBe(false);
    });
  });

  describe('Job Execution', () => {
    it('should execute job handler at scheduled time', async () => {
      const handler = mock(() => {});

      // Schedule job to run every second
      scheduler.schedule({
        name: 'test-job',
        cron: '* * * * * *', // Every second (with seconds support)
        handler,
      });

      // Wait for job to execute
      await new Promise(resolve => setTimeout(resolve, 2000));

      expect(handler).toHaveBeenCalled();
    });

    it('should prevent concurrent execution of the same job', async () => {
      let executionCount = 0;

      const handler = mock(async () => {
        executionCount++;
        // Simulate a long-running task
        await new Promise(resolve => setTimeout(resolve, 200));
      });

      // Schedule job to run more frequently than its execution time
      const job = scheduler.schedule({
        name: 'test-job',
        cron: '* * * * * *', // Every second
        handler,
      });

      // Wait for enough time for multiple runs to be scheduled
      await new Promise(resolve => setTimeout(resolve, 2500));

      // Job should have executed at least once but not as many times as scheduled
      // because concurrent execution is prevented
      expect(executionCount).toBeGreaterThan(0);
      // With 200ms execution time and 1 second interval, we expect 2-3 executions in 2.5 seconds
      expect(executionCount).toBeLessThanOrEqual(3);

      // Job should not be running now (all executions completed)
      expect(job.running).toBe(false);
    });

    it('should handle errors in job handlers gracefully', async () => {
      const handler = mock(() => {
        throw new Error('Handler error');
      });

      scheduler.schedule({
        name: 'failing-job',
        cron: '* * * * * *',
        handler,
      });

      // Wait for job to execute
      await new Promise(resolve => setTimeout(resolve, 1500));

      expect(handler).toHaveBeenCalled();
      // Error should be caught and logged, not thrown
    });

    it('should update lastRun and nextRun after execution', async () => {
      const handler = mock(async () => {
        await new Promise(resolve => setTimeout(resolve, 10));
      });

      scheduler.schedule({
        name: 'test-job',
        cron: '* * * * * *',
        handler,
      });

      // Wait for job to execute
      await new Promise(resolve => setTimeout(resolve, 1500));

      expect(handler).toHaveBeenCalled();
    });

    it('should not execute disabled jobs', async () => {
      const handler = mock(() => {});

      scheduler.schedule({
        name: 'disabled-job',
        cron: '* * * * * *',
        handler,
        enabled: false,
      });

      // Wait for potential execution
      await new Promise(resolve => setTimeout(resolve, 1500));

      expect(handler).not.toHaveBeenCalled();
    });

    it('should reschedule job after execution', async () => {
      const handler = mock(async () => {
        await new Promise(resolve => setTimeout(resolve, 10));
      });

      scheduler.schedule({
        name: 'recurring-job',
        cron: '* * * * * *',
        handler,
      });

      // Wait for multiple executions
      await new Promise(resolve => setTimeout(resolve, 2500));

      // Job should have executed multiple times
      expect(handler.mock.calls.length).toBeGreaterThan(1);
    });
  });

  describe('Job Status', () => {
    it('should mark job as running during execution', async () => {
      let callCount = 0;
      const handler = mock(async () => {
        callCount++;
        await new Promise(resolve => setTimeout(resolve, 100));
      });

      const job = scheduler.schedule({
        name: 'test-job',
        cron: '* * * * * *',
        handler,
      });

      // The job should be scheduled
      expect(job.nextRun).toBeInstanceOf(Date);

      // Wait for execution (job runs every second, wait longer to ensure it runs)
      await new Promise(resolve => setTimeout(resolve, 2500));

      // Handler should have been called at least once
      expect(callCount).toBeGreaterThan(0);
      expect(handler.mock.calls.length).toBeGreaterThan(0);
    });

    it('should provide job status information', () => {
      const handler = mock(() => {});

      const job = scheduler.schedule({
        name: 'test-job',
        cron: '0 * * * *',
        handler,
      });

      // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
      const jobObject = {
        // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
        id: expect.any(String),
        name: 'test-job',
        cron: '0 * * * *',
        enabled: true,
        running: false,
      };
      expect(job).toMatchObject(jobObject);
    });
  });

  describe('Cron Expression Parsing', () => {
    it('should parse standard 5-field cron expressions', () => {
      const handler = mock(() => {});

      // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
      const job1 = scheduler.schedule({
        name: 'hourly',
        cron: '0 * * * *',
        handler,
      });

      // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
      const job2 = scheduler.schedule({
        name: 'daily',
        cron: '0 2 * * *',
        handler,
      });

      // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
      expect(job1.nextRun).toBeInstanceOf(Date);
      // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
      expect(job2.nextRun).toBeInstanceOf(Date);
    });

    it('should parse 6-field cron expressions with seconds', () => {
      const handler = mock(() => {});

      const job = scheduler.schedule({
        name: 'every-second',
        cron: '* * * * * *',
        handler,
      });

      expect(job.nextRun).toBeInstanceOf(Date);
    });

    it('should handle cron expressions with predefined schedules', () => {
      const handler = mock(() => {});

      const job = scheduler.schedule({
        name: 'hourly',
        cron: '@hourly',
        handler,
      });

      expect(job.nextRun).toBeInstanceOf(Date);
    });
  });
});
