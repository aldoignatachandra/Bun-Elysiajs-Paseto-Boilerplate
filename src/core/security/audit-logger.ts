/**
 * Security Audit Logger
 *
 * Provides structured logging for security-related events.
 * All security events are logged with consistent formatting including
 * timestamp, event type, user ID (when available), IP address, and relevant metadata.
 *
 * @example
 * ```typescript
 * import { auditLogger } from '@/core/security/audit-logger';
 *
 * // Log authentication events
 * auditLogger.logAuthEvent({
 *   type: 'LOGIN_SUCCESS',
 *   userId: 'user-123',
 *   email: 'user@example.com',
 *   ip: '192.168.1.1',
 *   userAgent: 'Mozilla/5.0',
 * });
 *
 * // Log authorization events
 * auditLogger.logAuthzEvent({
 *   type: 'ACCESS_DENIED',
 *   userId: 'user-123',
 *   resource: '/api/admin',
 *   action: 'DELETE',
 *   ip: '192.168.1.1',
 *   reason: 'insufficient_permissions',
 * });
 *
 * // Log rate limiting events
 * auditLogger.logRateLimitEvent({
 *   type: 'RATE_LIMIT_EXCEEDED',
 *   identifier: '192.168.1.1',
 *   limit: 100,
 *   window: 60,
 *   current: 101,
 *   ip: '192.168.1.1',
 * });
 *
 * // Log data events
 * auditLogger.logDataEvent({
 *   type: 'DATA_ACCESSED',
 *   userId: 'user-123',
 *   resource: 'users',
 *   resourceId: 'user-456',
 *   action: 'READ',
 *   ip: '192.168.1.1',
 * });
 *
 * // Log security events
 * auditLogger.logSecurityEvent({
 *   type: 'SUSPICIOUS_ACTIVITY',
 *   description: 'Multiple failed login attempts',
 *   severity: 'medium',
 *   ip: '192.168.1.1',
 *   metadata: { attempts: 5, timeWindow: 60 },
 * });
 * ```
 */

import { logger } from '../logging/logger';

/**
 * Authentication event types
 */
export type AuthEventType =
  | 'LOGIN_SUCCESS'
  | 'LOGIN_FAILED'
  | 'LOGOUT'
  | 'PASSWORD_RESET_REQUEST'
  | 'PASSWORD_RESET_SUCCESS'
  | 'PASSWORD_CHANGE'
  | 'ACCOUNT_LOCKED'
  | 'ACCOUNT_UNLOCKED'
  | 'MFA_ENABLED'
  | 'MFA_DISABLED'
  | 'MFA_CHALLENGE_FAILED'
  | 'SESSION_EXPIRED'
  | 'SESSION_REVOKED';

/**
 * Authorization event types
 */
export type AuthzEventType =
  | 'ACCESS_DENIED'
  | 'ACCESS_GRANTED'
  | 'PERMISSION_ESCALATION'
  | 'ROLE_ASSIGNED'
  | 'ROLE_REVOKED';

/**
 * Rate limiting event types
 */
export type RateLimitEventType = 'RATE_LIMIT_EXCEEDED' | 'IP_BLOCKED' | 'IP_UNBLOCKED';

/**
 * Data event types
 */
export type DataEventType =
  | 'DATA_ACCESSED'
  | 'SENSITIVE_DATA_ACCESSED'
  | 'DATA_MODIFIED'
  | 'DATA_DELETED'
  | 'DATA_EXPORTED';

/**
 * Security event types
 */
export type SecurityEventType =
  | 'SUSPICIOUS_ACTIVITY'
  | 'POTENTIAL_ATTACK'
  | 'CONFIG_CHANGE'
  | 'SECURITY_SCAN_DETECTED';

/**
 * All audit event types
 */
export type AuditEventType =
  | AuthEventType
  | AuthzEventType
  | RateLimitEventType
  | DataEventType
  | SecurityEventType;

/**
 * Severity levels for security events
 */
export type SecuritySeverity = 'low' | 'medium' | 'high' | 'critical';

/**
 * Base audit event metadata
 */
export interface BaseAuditEvent {
  /** Timestamp of the event (ISO 8601 format) */
  timestamp?: string;
  /** IP address of the client */
  ip?: string;
  /** User agent string */
  userAgent?: string;
}

/**
 * Authentication event data
 */
export interface AuthEvent extends BaseAuditEvent {
  type: AuthEventType;
  /** User ID (optional for failed logins) */
  userId?: string;
  /** Email address */
  email?: string;
  /** Reason for failure (for failed events) */
  reason?: string;
}

/**
 * Authorization event data
 */
export interface AuthzEvent extends BaseAuditEvent {
  type: AuthzEventType;
  /** User ID */
  userId?: string;
  /** Resource being accessed */
  resource?: string;
  /** Action being performed */
  action?: string;
  /** Reason for denial */
  reason?: string;
  /** Role information */
  attemptedRole?: string;
  currentRole?: string;
  role?: string;
  /** Who performed the action */
  assignedBy?: string;
}

/**
 * Rate limiting event data
 */
export interface RateLimitEvent extends BaseAuditEvent {
  type: RateLimitEventType;
  /** Identifier (IP, user ID, etc.) */
  identifier: string;
  /** Rate limit configured */
  limit?: number;
  /** Time window in seconds */
  window?: number;
  /** Current count */
  current?: number;
  /** Reason for blocking */
  reason?: string;
  /** Block duration in seconds */
  blockDuration?: number;
}

/**
 * Data event data
 */
export interface DataEvent extends BaseAuditEvent {
  type: DataEventType;
  /** User ID performing the action */
  userId?: string;
  /** Resource type */
  resource: string;
  /** Specific resource ID */
  resourceId?: string;
  /** Action performed */
  action?: string;
  /** Fields accessed (for sensitive data) */
  fields?: string[];
  /** Changes made */
  changes?: Record<string, unknown>;
}

/**
 * Security event data
 */
export interface SecurityEvent extends BaseAuditEvent {
  type: SecurityEventType;
  /** Human-readable description */
  description: string;
  /** Severity level */
  severity: SecuritySeverity;
  /** User ID (if applicable) */
  userId?: string;
  /** Attack type (for potential attacks) */
  attackType?: string;
  /** Additional metadata */
  metadata?: Record<string, unknown>;
}

/**
 * Security Audit Logger
 *
 * Provides methods for logging different types of security events.
 * All events are logged with structured format including timestamp,
 * event type, and relevant contextual information.
 */
export const auditLogger = {
  /**
   * Log an authentication event
   */
  logAuthEvent(event: AuthEvent): void {
    const logData = {
      timestamp: event.timestamp || new Date().toISOString(),
      eventType: event.type,
      category: 'auth',
      userId: event.userId,
      email: event.email,
      ip: event.ip,
      userAgent: event.userAgent,
      reason: event.reason,
    };

    const message = `Auth Event: ${event.type}`;
    if (event.type === 'LOGIN_FAILED' || event.type === 'ACCOUNT_LOCKED') {
      logger.warn(message, logData);
    } else {
      logger.info(message, logData);
    }
  },

  /**
   * Log an authorization event
   */
  logAuthzEvent(event: AuthzEvent): void {
    const logData = {
      timestamp: event.timestamp || new Date().toISOString(),
      eventType: event.type,
      category: 'authz',
      userId: event.userId,
      resource: event.resource,
      action: event.action,
      ip: event.ip,
      reason: event.reason,
      attemptedRole: event.attemptedRole,
      currentRole: event.currentRole,
      role: event.role,
      assignedBy: event.assignedBy,
    };

    const message = `Authz Event: ${event.type}`;
    if (event.type === 'ACCESS_DENIED' || event.type === 'PERMISSION_ESCALATION') {
      logger.warn(message, logData);
    } else {
      logger.info(message, logData);
    }
  },

  /**
   * Log a rate limiting event
   */
  logRateLimitEvent(event: RateLimitEvent): void {
    const logData = {
      timestamp: event.timestamp || new Date().toISOString(),
      eventType: event.type,
      category: 'ratelimit',
      identifier: event.identifier,
      limit: event.limit,
      window: event.window,
      current: event.current,
      ip: event.ip,
      reason: event.reason,
      blockDuration: event.blockDuration,
    };

    const message = `Rate Limit Event: ${event.type}`;
    logger.warn(message, logData);
  },

  /**
   * Log a data event
   */
  logDataEvent(event: DataEvent): void {
    const logData = {
      timestamp: event.timestamp || new Date().toISOString(),
      eventType: event.type,
      category: 'data',
      userId: event.userId,
      resource: event.resource,
      resourceId: event.resourceId,
      action: event.action,
      ip: event.ip,
      fields: event.fields,
      changes: event.changes,
    };

    const message = `Data Event: ${event.type}`;
    if (
      event.type === 'SENSITIVE_DATA_ACCESSED' ||
      event.type === 'DATA_DELETED' ||
      event.type === 'DATA_EXPORTED'
    ) {
      logger.warn(message, logData);
    } else {
      logger.info(message, logData);
    }
  },

  /**
   * Log a security event
   */
  logSecurityEvent(event: SecurityEvent): void {
    const logData = {
      timestamp: event.timestamp || new Date().toISOString(),
      eventType: event.type,
      category: 'security',
      description: event.description,
      severity: event.severity,
      userId: event.userId,
      ip: event.ip,
      userAgent: event.userAgent,
      attackType: event.attackType,
      metadata: event.metadata,
    };

    const message = `Security Event: ${event.type} - ${event.description}`;
    if (event.severity === 'high' || event.severity === 'critical') {
      logger.error(message, logData);
    } else if (event.severity === 'medium') {
      logger.warn(message, logData);
    } else {
      logger.info(message, logData);
    }
  },

  // Helper methods for common events

  /**
   * Log successful login
   */
  logLoginSuccess(data: { userId: string; email: string; ip: string; userAgent?: string }): void {
    this.logAuthEvent({
      type: 'LOGIN_SUCCESS',
      ...data,
    });
  },

  /**
   * Log failed login attempt
   */
  logLoginFailure(data: { email: string; ip: string; userAgent?: string; reason: string }): void {
    this.logAuthEvent({
      type: 'LOGIN_FAILED',
      ...data,
    });
  },

  /**
   * Log access denied
   */
  logAccessDenied(data: {
    userId?: string;
    resource: string;
    action: string;
    ip: string;
    reason?: string;
  }): void {
    this.logAuthzEvent({
      type: 'ACCESS_DENIED',
      ...data,
    });
  },

  /**
   * Log suspicious activity
   */
  logSuspiciousActivity(data: {
    description: string;
    severity: SecuritySeverity;
    ip?: string;
    metadata?: Record<string, unknown>;
  }): void {
    this.logSecurityEvent({
      type: 'SUSPICIOUS_ACTIVITY',
      ...data,
    });
  },
};
