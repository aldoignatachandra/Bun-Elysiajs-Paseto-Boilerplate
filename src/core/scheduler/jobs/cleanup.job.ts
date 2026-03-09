import { v4 as uuidv4 } from 'uuid';
import { logger } from '../../logging/logger';
import type { ScheduledJob } from '../cron.types';

/**
 * Cleanup expired sessions job
 *
 * Runs hourly to clean up expired sessions from the database.
 * Expired sessions are identified by comparing the expiresAt field
 * with the current date/time.
 *
 * Cron: '0 * * * *' - Every hour at minute 0
 */
export const cleanupExpiredSessionsJob: ScheduledJob = {
  id: uuidv4(),
  name: 'cleanup-expired-sessions',
  cron: '0 * * * *', // Every hour
  enabled: true,
  running: false,
  lastRun: null,
  nextRun: null,
  handler: async () => {
    try {
      logger.info('Starting cleanup of expired sessions');

      // Import the session repository dynamically to avoid circular dependencies
      // In production, this would be injected via dependency injection
      const { SessionRepository } = await import('../../../repositories/sessions.repository');

      // Create a new instance of the repository
      // Note: In a real implementation, you would use dependency injection
      // to get the database connection and repository instance
      // eslint-disable-next-line @typescript-eslint/no-explicit-any, @typescript-eslint/no-unsafe-argument
      const sessionRepository = new SessionRepository(null as any);

      // Delete expired sessions
      const deletedCount = await sessionRepository.deleteExpired();

      logger.info(`Cleanup completed: ${deletedCount} expired session(s) removed`, {
        deletedCount,
      });
    } catch (error) {
      logger.error(
        'Error during cleanup of expired sessions',
        error instanceof Error ? error : new Error(String(error))
      );
    }
  },
};

/**
 * All cleanup jobs export
 *
 * Export all cleanup jobs for easy scheduling
 */
export const cleanupJobs = [cleanupExpiredSessionsJob] as const;
