import { describe, it, expect } from 'bun:test';
import { userActivityLogs, type UserActivityLog, type NewUserActivityLog } from '../../../../src/database/schema/activity-logs.schema';

describe('Activity Logs Schema', () => {
  describe('userActivityLogs table', () => {
    it('should export the userActivityLogs table', () => {
      expect(userActivityLogs).toBeDefined();
      expect(typeof userActivityLogs).toBe('object');
    });

    it('should have id column', () => {
      expect(userActivityLogs).toHaveProperty('id');
    });

    it('should have userId column', () => {
      expect(userActivityLogs).toHaveProperty('userId');
    });

    it('should have action column', () => {
      expect(userActivityLogs).toHaveProperty('action');
    });

    it('should have entity column', () => {
      expect(userActivityLogs).toHaveProperty('entity');
    });

    it('should have entityId column', () => {
      expect(userActivityLogs).toHaveProperty('entityId');
    });

    it('should have ipAddress column', () => {
      expect(userActivityLogs).toHaveProperty('ipAddress');
    });

    it('should have userAgent column', () => {
      expect(userActivityLogs).toHaveProperty('userAgent');
    });

    it('should have details column', () => {
      expect(userActivityLogs).toHaveProperty('details');
    });

    it('should have deletedAt column', () => {
      expect(userActivityLogs).toHaveProperty('deletedAt');
    });

    it('should have createdAt column', () => {
      expect(userActivityLogs).toHaveProperty('createdAt');
    });

    it('should have updatedAt column', () => {
      expect(userActivityLogs).toHaveProperty('updatedAt');
    });
  });

  describe('UserActivityLog type', () => {
    it('should export UserActivityLog type', () => {
      const userActivityLog: UserActivityLog = {
        id: '123e4567-e89b-12d3-a456-426614174000',
        userId: '123e4567-e89b-12d3-a456-426614174001',
        action: 'user.logged_in',
        entity: 'users',
        entityId: '123e4567-e89b-12d3-a456-426614174001',
        ipAddress: '127.0.0.1',
        userAgent: 'Mozilla/5.0',
        details: { method: 'email_password' },
        deletedAt: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      expect(userActivityLog).toBeDefined();
      expect(userActivityLog.id).toBe('123e4567-e89b-12d3-a456-426614174000');
      expect(userActivityLog.userId).toBe('123e4567-e89b-12d3-a456-426614174001');
      expect(userActivityLog.action).toBe('user.logged_in');
    });
  });

  describe('NewUserActivityLog type', () => {
    it('should export NewUserActivityLog type', () => {
      const newUserActivityLog: NewUserActivityLog = {
        userId: '123e4567-e89b-12d3-a456-426614174001',
        action: 'user.registered',
        entity: 'users',
        ipAddress: '192.168.1.1',
        userAgent: 'Chrome/120.0',
        details: { source: 'web' },
      };

      expect(newUserActivityLog).toBeDefined();
      expect(newUserActivityLog.userId).toBe('123e4567-e89b-12d3-a456-426614174001');
      expect(newUserActivityLog.action).toBe('user.registered');
    });
  });

  describe('Column structure', () => {
    it('should have all required columns', () => {
      const columns = Object.keys(userActivityLogs);
      expect(columns).toContain('id');
      expect(columns).toContain('userId');
      expect(columns).toContain('action');
      expect(columns).toContain('createdAt');
      expect(columns).toContain('updatedAt');
    });
  });
});
