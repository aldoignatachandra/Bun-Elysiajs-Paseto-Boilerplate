/**
 * Background Job Worker
 *
 * Provides worker implementation with example job handlers for:
 * - Email sending
 * - Email verification
 * - Password reset
 */

import { JobQueue } from './job-queue';
import { logger } from '../logging/logger';
import type { JobHandler } from './job.types';

/**
 * Email job payload
 */
export interface EmailPayload {
  to: string;
  subject: string;
  body: string;
  html?: string;
}

/**
 * Verification job payload
 */
export interface VerificationPayload {
  userId: string;
  email: string;
}

/**
 * Password reset job payload
 */
export interface PasswordResetPayload {
  userId: string;
  email: string;
  token: string;
}

/**
 * Worker class for managing job handlers
 */
export class Worker {
  private jobQueue: JobQueue;

  constructor(jobQueue: JobQueue) {
    this.jobQueue = jobQueue;
  }

  /**
   * Register multiple job handlers
   *
   * @param handlers - Array of job handlers to register
   */
  registerJobHandlers(handlers: JobHandler[]): void {
    for (const handler of handlers) {
      if (!handler.type) {
        throw new Error('Handler must have a type property');
      }

      this.jobQueue.registerHandler(handler);
      logger.debug('Worker registered handler', { type: handler.type });
    }

    logger.info('Worker registered handlers', { count: handlers.length });
  }

  /**
   * Get email job handlers
   *
   * @returns Array of email-related job handlers
   */
  getEmailHandlers(): JobHandler<EmailPayload>[] {
    return [
      {
        type: 'email',
        handle: async (payload: EmailPayload) => {
          logger.info('Sending email', { to: payload.to, subject: payload.subject });

          // TODO: Implement actual email sending logic
          // For now, just log and return success
          await Promise.resolve(); // eslint-disable-line require-atomic-updates
          logger.debug(`Email sent to: ${payload.to}`);
          logger.debug(`Subject: ${payload.subject}`);
          logger.debug(`Body: ${payload.body}`);

          return { success: true };
        },
      },
    ];
  }

  /**
   * Get verification job handlers
   *
   * @returns Array of verification-related job handlers
   */
  getVerificationHandlers(): JobHandler<VerificationPayload>[] {
    return [
      {
        type: 'verification',
        handle: async (payload: VerificationPayload) => {
          logger.info('Sending verification email', {
            userId: payload.userId,
            email: payload.email,
          });

          // TODO: Implement actual verification email sending logic
          // For now, just log and return success
          await Promise.resolve();
          logger.debug(`Verification email sent to: ${payload.email}`);
          logger.debug(`User ID: ${payload.userId}`);

          return { success: true };
        },
      },
    ];
  }

  /**
   * Get password reset job handlers
   *
   * @returns Array of password reset-related job handlers
   */
  getPasswordResetHandlers(): JobHandler<PasswordResetPayload>[] {
    return [
      {
        type: 'password-reset',
        handle: async (payload: PasswordResetPayload) => {
          logger.info('Sending password reset email', {
            userId: payload.userId,
            email: payload.email,
          });

          // TODO: Implement actual password reset email sending logic
          // For now, just log and return success
          await Promise.resolve();
          logger.debug(`Password reset email sent to: ${payload.email}`);
          logger.debug(`User ID: ${payload.userId}`);
          logger.debug(`Reset token: ${payload.token}`);

          return { success: true };
        },
      },
    ];
  }

  /**
   * Get all example job handlers
   *
   * @returns Array of all example job handlers
   */
  getAllHandlers(): JobHandler[] {
    return [
      ...(this.getEmailHandlers() as unknown as JobHandler[]),
      ...(this.getVerificationHandlers() as unknown as JobHandler[]),
      ...(this.getPasswordResetHandlers() as unknown as JobHandler[]),
    ];
  }
}
