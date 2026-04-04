import { describe, it, expect } from 'bun:test';
import { userSessions, type UserSession, type NewUserSession } from '../../../../src/database/schema/sessions.schema';

describe('Sessions Schema', () => {
  describe('userSessions table', () => {
    it('should export the userSessions table', () => {
      expect(userSessions).toBeDefined();
      expect(typeof userSessions).toBe('object');
    });

    it('should have id column', () => {
      expect(userSessions).toHaveProperty('id');
    });

    it('should have userId column', () => {
      expect(userSessions).toHaveProperty('userId');
    });

    it('should have token column', () => {
      expect(userSessions).toHaveProperty('token');
    });

    it('should have expiresAt column', () => {
      expect(userSessions).toHaveProperty('expiresAt');
    });

    it('should have revokedAt column', () => {
      expect(userSessions).toHaveProperty('revokedAt');
    });

    it('should have lastUsedAt column', () => {
      expect(userSessions).toHaveProperty('lastUsedAt');
    });

    it('should have deviceType column', () => {
      expect(userSessions).toHaveProperty('deviceType');
    });

    it('should have userAgent column', () => {
      expect(userSessions).toHaveProperty('userAgent');
    });

    it('should have ipAddress column', () => {
      expect(userSessions).toHaveProperty('ipAddress');
    });

    it('should have deletedAt column', () => {
      expect(userSessions).toHaveProperty('deletedAt');
    });

    it('should have createdAt column', () => {
      expect(userSessions).toHaveProperty('createdAt');
    });

    it('should have updatedAt column', () => {
      expect(userSessions).toHaveProperty('updatedAt');
    });
  });

  describe('UserSession type', () => {
    it('should export UserSession type', () => {
      const userSession: UserSession = {
        id: '123e4567-e89b-12d3-a456-426614174000',
        userId: '123e4567-e89b-12d3-a456-426614174001',
        token: 'v4.public.test_token',
        refreshTokenId: 'refresh-token-id-123',
        expiresAt: new Date(),
        revokedAt: null,
        lastUsedAt: new Date(),
        deviceType: 'desktop',
        userAgent: 'Mozilla/5.0',
        ipAddress: '127.0.0.1',
        deletedAt: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      expect(userSession).toBeDefined();
      expect(userSession.id).toBe('123e4567-e89b-12d3-a456-426614174000');
      expect(userSession.userId).toBe('123e4567-e89b-12d3-a456-426614174001');
      expect(userSession.token).toBe('v4.public.test_token');
    });
  });

  describe('NewUserSession type', () => {
    it('should export NewUserSession type', () => {
      const newUserSession: NewUserSession = {
        userId: '123e4567-e89b-12d3-a456-426614174001',
        token: 'v4.public.new_test_token',
        refreshTokenId: 'refresh-token-id-456',
        expiresAt: new Date(),
        lastUsedAt: new Date(),
        deviceType: 'mobile',
        userAgent: 'Mozilla/5.0',
        ipAddress: '192.168.1.1',
      };

      expect(newUserSession).toBeDefined();
      expect(newUserSession.userId).toBe('123e4567-e89b-12d3-a456-426614174001');
      expect(newUserSession.token).toBe('v4.public.new_test_token');
    });
  });

  describe('Column structure', () => {
    it('should have all required columns', () => {
      const columns = Object.keys(userSessions);
      expect(columns).toContain('id');
      expect(columns).toContain('userId');
      expect(columns).toContain('token');
      expect(columns).toContain('expiresAt');
      expect(columns).toContain('createdAt');
      expect(columns).toContain('updatedAt');
    });
  });
});
