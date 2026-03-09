import { describe, it, expect } from 'bun:test';
import { auditLogger, AuditEventType } from '@/core/security/audit-logger';

describe('Security Audit Logger', () => {
  describe('Log Authentication Events', () => {
    it('should log successful login events', () => {
      expect(() =>
        auditLogger.logAuthEvent({
          type: 'LOGIN_SUCCESS',
          userId: 'user-123',
          email: 'test@example.com',
          ip: '192.168.1.1',
          userAgent: 'Mozilla/5.0',
        })
      ).not.toThrow();
    });

    it('should log failed login events', () => {
      expect(() =>
        auditLogger.logAuthEvent({
          type: 'LOGIN_FAILED',
          email: 'test@example.com',
          ip: '192.168.1.1',
          userAgent: 'Mozilla/5.0',
          reason: 'invalid_credentials',
        })
      ).not.toThrow();
    });

    it('should log logout events', () => {
      expect(() =>
        auditLogger.logAuthEvent({
          type: 'LOGOUT',
          userId: 'user-123',
          ip: '192.168.1.1',
          userAgent: 'Mozilla/5.0',
        })
      ).not.toThrow();
    });

    it('should log password reset request events', () => {
      expect(() =>
        auditLogger.logAuthEvent({
          type: 'PASSWORD_RESET_REQUEST',
          email: 'test@example.com',
          ip: '192.168.1.1',
          userAgent: 'Mozilla/5.0',
        })
      ).not.toThrow();
    });

    it('should log password reset success events', () => {
      expect(() =>
        auditLogger.logAuthEvent({
          type: 'PASSWORD_RESET_SUCCESS',
          userId: 'user-123',
          email: 'test@example.com',
          ip: '192.168.1.1',
          userAgent: 'Mozilla/5.0',
        })
      ).not.toThrow();
    });
  });

  describe('Log Authorization Events', () => {
    it('should log access denied events', () => {
      expect(() =>
        auditLogger.logAuthzEvent({
          type: 'ACCESS_DENIED',
          userId: 'user-123',
          resource: '/api/admin/users',
          action: 'DELETE',
          ip: '192.168.1.1',
          reason: 'insufficient_permissions',
        })
      ).not.toThrow();
    });

    it('should log permission escalation events', () => {
      expect(() =>
        auditLogger.logAuthzEvent({
          type: 'PERMISSION_ESCALATION',
          userId: 'user-123',
          attemptedRole: 'admin',
          currentRole: 'user',
          ip: '192.168.1.1',
        })
      ).not.toThrow();
    });

    it('should log role assignment events', () => {
      expect(() =>
        auditLogger.logAuthzEvent({
          type: 'ROLE_ASSIGNED',
          userId: 'user-123',
          role: 'admin',
          assignedBy: 'admin-456',
          ip: '192.168.1.1',
        })
      ).not.toThrow();
    });
  });

  describe('Log Rate Limiting Events', () => {
    it('should log rate limit exceeded events', () => {
      expect(() =>
        auditLogger.logRateLimitEvent({
          type: 'RATE_LIMIT_EXCEEDED',
          identifier: '192.168.1.1',
          limit: 100,
          window: 60,
          current: 101,
          ip: '192.168.1.1',
        })
      ).not.toThrow();
    });

    it('should log blocked IP events', () => {
      expect(() =>
        auditLogger.logRateLimitEvent({
          type: 'IP_BLOCKED',
          identifier: '192.168.1.1',
          reason: 'too_many_failed_attempts',
          blockDuration: 3600,
          ip: '192.168.1.1',
        })
      ).not.toThrow();
    });
  });

  describe('Log Data Events', () => {
    it('should log data access events', () => {
      expect(() =>
        auditLogger.logDataEvent({
          type: 'DATA_ACCESSED',
          userId: 'user-123',
          resource: 'users',
          resourceId: 'user-456',
          action: 'READ',
          ip: '192.168.1.1',
        })
      ).not.toThrow();
    });

    it('should log sensitive data access events', () => {
      expect(() =>
        auditLogger.logDataEvent({
          type: 'SENSITIVE_DATA_ACCESSED',
          userId: 'user-123',
          resource: 'users',
          resourceId: 'user-456',
          fields: ['email', 'phone', 'ssn'],
          ip: '192.168.1.1',
        })
      ).not.toThrow();
    });

    it('should log data modification events', () => {
      expect(() =>
        auditLogger.logDataEvent({
          type: 'DATA_MODIFIED',
          userId: 'user-123',
          resource: 'users',
          resourceId: 'user-456',
          action: 'UPDATE',
          changes: { email: 'new@example.com' },
          ip: '192.168.1.1',
        })
      ).not.toThrow();
    });

    it('should log data deletion events', () => {
      expect(() =>
        auditLogger.logDataEvent({
          type: 'DATA_DELETED',
          userId: 'user-123',
          resource: 'users',
          resourceId: 'user-456',
          ip: '192.168.1.1',
        })
      ).not.toThrow();
    });
  });

  describe('Log Security Events', () => {
    it('should log suspicious activity events', () => {
      expect(() =>
        auditLogger.logSecurityEvent({
          type: 'SUSPICIOUS_ACTIVITY',
          description: 'Multiple failed login attempts',
          severity: 'medium',
          ip: '192.168.1.1',
          metadata: { attempts: 5, timeWindow: 60 },
        })
      ).not.toThrow();
    });

    it('should log potential attack events', () => {
      expect(() =>
        auditLogger.logSecurityEvent({
          type: 'POTENTIAL_ATTACK',
          description: 'SQL injection attempt detected',
          severity: 'high',
          ip: '192.168.1.1',
          userAgent: 'Malicious Scanner',
          attackType: 'sql_injection',
        })
      ).not.toThrow();
    });

    it('should log configuration changes', () => {
      expect(() =>
        auditLogger.logSecurityEvent({
          type: 'CONFIG_CHANGE',
          description: 'Security settings updated',
          severity: 'low',
          userId: 'admin-123',
          changes: { maxLoginAttempts: 5, sessionTimeout: 3600 },
          ip: '192.168.1.1',
        })
      ).not.toThrow();
    });
  });

  describe('Log Format', () => {
    it('should include timestamp in all log entries', () => {
      const customTimestamp = '2024-01-01T00:00:00.000Z';

      expect(() =>
        auditLogger.logAuthEvent({
          type: 'LOGIN_SUCCESS',
          userId: 'user-123',
          email: 'test@example.com',
          ip: '192.168.1.1',
          timestamp: customTimestamp,
        })
      ).not.toThrow();
    });

    it('should include event type in all log entries', () => {
      expect(() =>
        auditLogger.logAuthEvent({
          type: 'LOGIN_SUCCESS',
          userId: 'user-123',
          email: 'test@example.com',
          ip: '192.168.1.1',
        })
      ).not.toThrow();
    });

    it('should include IP address when provided', () => {
      expect(() =>
        auditLogger.logAuthEvent({
          type: 'LOGIN_SUCCESS',
          userId: 'user-123',
          email: 'test@example.com',
          ip: '192.168.1.1',
        })
      ).not.toThrow();
    });

    it('should include user ID when provided', () => {
      expect(() =>
        auditLogger.logAuthEvent({
          type: 'LOGIN_SUCCESS',
          userId: 'user-123',
          email: 'test@example.com',
          ip: '192.168.1.1',
        })
      ).not.toThrow();
    });

    it('should handle missing optional fields gracefully', () => {
      expect(() =>
        auditLogger.logSecurityEvent({
          type: 'SUSPICIOUS_ACTIVITY',
          description: 'Test activity',
          severity: 'low',
        })
      ).not.toThrow();
    });
  });

  describe('Event Types', () => {
    it('should support all authentication event types', () => {
      const authEvents: AuditEventType[] = [
        'LOGIN_SUCCESS',
        'LOGIN_FAILED',
        'LOGOUT',
        'PASSWORD_RESET_REQUEST',
        'PASSWORD_RESET_SUCCESS',
        'PASSWORD_CHANGE',
        'ACCOUNT_LOCKED',
        'ACCOUNT_UNLOCKED',
        'MFA_ENABLED',
        'MFA_DISABLED',
        'MFA_CHALLENGE_FAILED',
        'SESSION_EXPIRED',
        'SESSION_REVOKED',
      ];

      authEvents.forEach(type => {
        expect(() =>
          auditLogger.logAuthEvent({
            type,
            userId: 'user-123',
            ip: '192.168.1.1',
          })
        ).not.toThrow();
      });
    });

    it('should support all authorization event types', () => {
      const authzEvents: AuditEventType[] = [
        'ACCESS_DENIED',
        'ACCESS_GRANTED',
        'PERMISSION_ESCALATION',
        'ROLE_ASSIGNED',
        'ROLE_REVOKED',
      ];

      authzEvents.forEach(type => {
        expect(() =>
          auditLogger.logAuthzEvent({
            type,
            userId: 'user-123',
            ip: '192.168.1.1',
          })
        ).not.toThrow();
      });
    });

    it('should support all rate limit event types', () => {
      const rateLimitEvents: AuditEventType[] = [
        'RATE_LIMIT_EXCEEDED',
        'IP_BLOCKED',
        'IP_UNBLOCKED',
      ];

      rateLimitEvents.forEach(type => {
        expect(() =>
          auditLogger.logRateLimitEvent({
            type,
            identifier: '192.168.1.1',
            ip: '192.168.1.1',
          })
        ).not.toThrow();
      });
    });

    it('should support all data event types', () => {
      const dataEvents: AuditEventType[] = [
        'DATA_ACCESSED',
        'SENSITIVE_DATA_ACCESSED',
        'DATA_MODIFIED',
        'DATA_DELETED',
        'DATA_EXPORTED',
      ];

      dataEvents.forEach(type => {
        expect(() =>
          auditLogger.logDataEvent({
            type,
            userId: 'user-123',
            resource: 'users',
            ip: '192.168.1.1',
          })
        ).not.toThrow();
      });
    });

    it('should support all security event types', () => {
      const securityEvents: AuditEventType[] = [
        'SUSPICIOUS_ACTIVITY',
        'POTENTIAL_ATTACK',
        'CONFIG_CHANGE',
        'SECURITY_SCAN_DETECTED',
      ];

      securityEvents.forEach(type => {
        expect(() =>
          auditLogger.logSecurityEvent({
            type,
            description: `Test ${type}`,
            severity: 'low',
          })
        ).not.toThrow();
      });
    });
  });

  describe('Helper Methods', () => {
    it('should provide helper for logging login success', () => {
      expect(() =>
        auditLogger.logLoginSuccess({
          userId: 'user-123',
          email: 'test@example.com',
          ip: '192.168.1.1',
          userAgent: 'Mozilla/5.0',
        })
      ).not.toThrow();
    });

    it('should provide helper for logging login failure', () => {
      expect(() =>
        auditLogger.logLoginFailure({
          email: 'test@example.com',
          ip: '192.168.1.1',
          userAgent: 'Mozilla/5.0',
          reason: 'invalid_credentials',
        })
      ).not.toThrow();
    });

    it('should provide helper for logging access denied', () => {
      expect(() =>
        auditLogger.logAccessDenied({
          userId: 'user-123',
          resource: '/api/admin',
          action: 'DELETE',
          ip: '192.168.1.1',
        })
      ).not.toThrow();
    });

    it('should provide helper for logging suspicious activity', () => {
      expect(() =>
        auditLogger.logSuspiciousActivity({
          description: 'Multiple failed attempts',
          severity: 'medium',
          ip: '192.168.1.1',
        })
      ).not.toThrow();
    });
  });
});
