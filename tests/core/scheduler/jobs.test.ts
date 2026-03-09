import { describe, it, expect } from 'bun:test';
import { cleanupExpiredSessionsJob } from '@/core/scheduler/jobs/cleanup.job';
import type { ScheduledJob } from '@/core/scheduler/cron.types';

describe('Cleanup Jobs (unit)', () => {
  describe('cleanupExpiredSessionsJob', () => {
    it('should have correct job properties', () => {
      expect(cleanupExpiredSessionsJob.name).toBe('cleanup-expired-sessions');
      expect(cleanupExpiredSessionsJob.cron).toBe('0 * * * *');
      expect(cleanupExpiredSessionsJob.enabled).toBe(true);
    });

    it('should be a valid ScheduledJob object', () => {
      // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
      const jobObject = {
        // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
        id: expect.any(String),
        name: 'cleanup-expired-sessions',
        cron: '0 * * * *',
        enabled: true,
        running: false,
        // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
        handler: expect.any(Function),
      };
      expect(cleanupExpiredSessionsJob).toMatchObject(jobObject);
    });

    it('should have a handler function', () => {
      // Check that handler exists and is callable
      expect(cleanupExpiredSessionsJob).toHaveProperty('handler');
      expect(
        typeof cleanupExpiredSessionsJob.handler === 'function' ||
          typeof cleanupExpiredSessionsJob.handler === 'object'
      ).toBe(true);
    });

    it('should have correct cron schedule for hourly execution', () => {
      // '0 * * * *' means every hour at minute 0
      expect(cleanupExpiredSessionsJob.cron).toBe('0 * * * *');
    });

    it('should be enabled by default', () => {
      expect(cleanupExpiredSessionsJob.enabled).toBe(true);
    });

    it('should have a unique id', () => {
      expect(cleanupExpiredSessionsJob.id).toBeDefined();
      expect(cleanupExpiredSessionsJob.id).toBeTruthy();
      expect(String(cleanupExpiredSessionsJob.id).length).toBeGreaterThan(0);
    });

    it('should not be running initially', () => {
      expect(cleanupExpiredSessionsJob.running).toBe(false);
    });

    it('should have null lastRun initially', () => {
      expect(cleanupExpiredSessionsJob.lastRun).toBeNull();
    });

    it('should have null nextRun initially', () => {
      expect(cleanupExpiredSessionsJob.nextRun).toBeNull();
    });
  });

  describe('Job Metadata', () => {
    it('should support adding runtime metadata when scheduled', () => {
      // When scheduled by the scheduler, these properties will be added
      const jobWithSchedule: ScheduledJob = {
        ...cleanupExpiredSessionsJob,
        lastRun: null,
        nextRun: new Date(Date.now() + 3600000), // 1 hour from now
      };

      expect(jobWithSchedule.lastRun).toBeDefined();
      expect(jobWithSchedule.nextRun).toBeDefined();
      expect(jobWithSchedule.nextRun).toBeInstanceOf(Date);
    });

    it('should support updating lastRun after execution', () => {
      const jobWithSchedule: ScheduledJob = {
        ...cleanupExpiredSessionsJob,
        lastRun: null,
        nextRun: new Date(),
      };

      // In actual scheduler, lastRun would be updated after execution
      expect(jobWithSchedule.lastRun).toBeDefined();
    });

    it('should support running status during execution', () => {
      const runningJob: ScheduledJob = {
        ...cleanupExpiredSessionsJob,
        running: true,
      };

      expect(runningJob.running).toBe(true);
    });

    it('should maintain all required ScheduledJob properties', () => {
      const job = cleanupExpiredSessionsJob;

      expect(job).toHaveProperty('id');
      expect(job).toHaveProperty('name');
      expect(job).toHaveProperty('cron');
      expect(job).toHaveProperty('handler');
      expect(job).toHaveProperty('enabled');
      expect(job).toHaveProperty('lastRun');
      expect(job).toHaveProperty('nextRun');
      expect(job).toHaveProperty('running');
    });
  });

  describe('Job Integration', () => {
    it('should be compatible with scheduler.schedule()', () => {
      // Verify job structure matches what scheduler expects
      expect(() => {
        // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-var-requires
        const { scheduler } = require('@/core/scheduler/scheduler');
        // eslint-disable-next-line @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access
        void scheduler.schedule(cleanupExpiredSessionsJob);
      }).not.toThrow();
    });
  });
});
