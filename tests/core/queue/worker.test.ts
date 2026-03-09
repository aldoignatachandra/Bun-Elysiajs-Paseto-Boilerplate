/* eslint-disable @typescript-eslint/require-await */
/* eslint-disable @typescript-eslint/no-unused-vars */
/* eslint-disable @typescript-eslint/no-unused-vars */
import { describe, it, expect, beforeEach, afterEach } from 'bun:test';
import { Worker } from '@/core/queue/worker';
import { JobQueue } from '@/core/queue/job-queue';
import type { JobHandler } from '@/core/queue/job.types';

describe('Worker', () => {
  describe('registerJobHandlers', () => {
    it('should register multiple job handlers', () => {
      const jobQueue = new JobQueue();
      const worker = new Worker(jobQueue);

      const handlers: JobHandler[] = [
        {
          type: 'email',
          handle: async () => {// eslint-disable-next-line @typescript-eslint/require-await success: true }),
        },
        {
          type: 'verification',
          handle: async () => {// eslint-disable-next-line @typescript-eslint/require-await success: true }),
        },
        {
          type: 'password-reset',
          handle: async () => {// eslint-disable-next-line @typescript-eslint/require-await success: true }),
        },
      ];

      expect(() => worker.registerJobHandlers(handlers)).not.toThrow();
    });

    it('should register handlers with the job queue', async () => {
      const jobQueue = new JobQueue();
      const worker = new Worker(jobQueue);

      const handlers: JobHandler[] = [
        {
          type: 'test-job',
          handle: async () => {// eslint-disable-next-line @typescript-eslint/require-await success: true }),
        },
      ];

      worker.registerJobHandlers(handlers);

      // Should be able to add job for registered handler
      const jobId = await jobQueue.add('test-job', { data: 'test' });
      expect(jobId).toBeDefined();
    });

    it('should throw when registering handlers without type', () => {
      const jobQueue = new JobQueue();
      const worker = new Worker(jobQueue);

      const invalidHandlers = [
        {
          handle: async () => {// eslint-disable-next-line @typescript-eslint/require-await success: true }),
        },
      ] as unknown as JobHandler[];

      expect(() => worker.registerJobHandlers(invalidHandlers)).toThrow();
    });
  });

  describe('example job handlers', () => {
    describe('email handler', () => {
      it('should have correct type', () => {
        const jobQueue = new JobQueue();
        const worker = new Worker(jobQueue);
        worker.registerJobHandlers(worker.getEmailHandlers());

        // Should be able to add email job
        expect(async () => {
          await jobQueue.add('email', {
            to: 'test@example.com',
            subject: 'Test',
            body: 'Test body',
          });
        }).not.toThrow();
      });

      it('should process email job successfully', async () => {
        const jobQueue = new JobQueue();
        const worker = new Worker(jobQueue);
        worker.registerJobHandlers(worker.getEmailHandlers());

        const jobId = await jobQueue.add('email', {
          to: 'test@example.com',
          subject: 'Test',
          body: 'Test body',
        });

        await jobQueue.start();
        await new Promise(resolve => setTimeout(resolve, 100));

        const job = await jobQueue.getStatus(jobId);
        expect(job?.completedAt).toBeDefined();
      });
    });

    describe('verification handler', () => {
      it('should have correct type', () => {
        const jobQueue = new JobQueue();
        const worker = new Worker(jobQueue);
        worker.registerJobHandlers(worker.getVerificationHandlers());

        // Should be able to add verification job
        expect(async () => {
          await jobQueue.add('verification', {
            userId: '123',
            email: 'test@example.com',
          });
        }).not.toThrow();
      });

      it('should process verification job successfully', async () => {
        const jobQueue = new JobQueue();
        const worker = new Worker(jobQueue);
        worker.registerJobHandlers(worker.getVerificationHandlers());

        const jobId = await jobQueue.add('verification', {
          userId: '123',
          email: 'test@example.com',
        });

        await jobQueue.start();
        await new Promise(resolve => setTimeout(resolve, 100));

        const job = await jobQueue.getStatus(jobId);
        expect(job?.completedAt).toBeDefined();
      });
    });

    describe('password reset handler', () => {
      it('should have correct type', () => {
        const jobQueue = new JobQueue();
        const worker = new Worker(jobQueue);
        worker.registerJobHandlers(worker.getPasswordResetHandlers());

        // Should be able to add password reset job
        expect(async () => {
          await jobQueue.add('password-reset', {
            userId: '123',
            email: 'test@example.com',
            token: 'reset-token',
          });
        }).not.toThrow();
      });

      it('should process password reset job successfully', async () => {
        const jobQueue = new JobQueue();
        const worker = new Worker(jobQueue);
        worker.registerJobHandlers(worker.getPasswordResetHandlers());

        const jobId = await jobQueue.add('password-reset', {
          userId: '123',
          email: 'test@example.com',
          token: 'reset-token',
        });

        await jobQueue.start();
        await new Promise(resolve => setTimeout(resolve, 100));

        const job = await jobQueue.getStatus(jobId);
        expect(job?.completedAt).toBeDefined();
      });
    });
  });

  describe('getAllHandlers', () => {
    it('should return all example handlers', () => {
      const jobQueue = new JobQueue();
      const worker = new Worker(jobQueue);

      const handlers = worker.getAllHandlers();

      expect(handlers).toBeInstanceOf(Array);
      expect(handlers.length).toBeGreaterThan(0);

      // Check each handler has required properties
      handlers.forEach(handler => {
        expect(handler.type).toBeDefined();
        expect(typeof handler.handle).toBe('function');
      });
    });

    it('should include email, verification, and password reset handlers', () => {
      const jobQueue = new JobQueue();
      const worker = new Worker(jobQueue);

      const handlers = worker.getAllHandlers();
      const types = handlers.map(h => h.type);

      expect(types).toContain('email');
      expect(types).toContain('verification');
      expect(types).toContain('password-reset');
    });

    it('should allow registering all handlers at once', async () => {
      const jobQueue = new JobQueue();
      const worker = new Worker(jobQueue);

      const handlers = worker.getAllHandlers();
      worker.registerJobHandlers(handlers);

      // Should be able to add jobs for all handler types
      const emailJobId = await jobQueue.add('email', {
        to: 'test@example.com',
        subject: 'Test',
        body: 'Test body',
      });

      const verificationJobId = await jobQueue.add('verification', {
        userId: '123',
        email: 'test@example.com',
      });

      const passwordResetJobId = await jobQueue.add('password-reset', {
        userId: '123',
        email: 'test@example.com',
        token: 'reset-token',
      });

      expect(emailJobId).toBeDefined();
      expect(verificationJobId).toBeDefined();
      expect(passwordResetJobId).toBeDefined();
    });
  });
});
