/**
 * Email Service Type Definitions
 *
 * This module defines the core types and interfaces for the email service,
 * including email options, attachments, templates, and provider contracts.
 */

/**
 * Email attachment configuration
 */
export interface EmailAttachment {
  /** The filename to be used for the attachment */
  filename: string;

  /** The content of the attachment as a Buffer */
  content: Buffer;

  /** The MIME content type of the attachment */
  contentType: string;

  /** The content encoding (e.g., 'base64', '7bit', 'quoted-printable') */
  encoding?: string;
}

/**
 * Email address format - can be a string or an object with name and email
 */
export type EmailAddress = string | { name: string; address: string };

/**
 * Email sending options
 */
export interface EmailOptions {
  /** Recipient email address(es) */
  to: EmailAddress | EmailAddress[];

  /** Email subject line */
  subject: string;

  /** HTML content of the email */
  html: string;

  /** Sender email address (optional, uses default if not provided) */
  from?: EmailAddress;

  /** Plain text alternative content */
  text?: string;

  /** CC recipients */
  cc?: EmailAddress | EmailAddress[];

  /** BCC recipients */
  bcc?: EmailAddress | EmailAddress[];

  /** Reply-to address */
  replyTo?: EmailAddress;

  /** Email attachments */
  attachments?: EmailAttachment[];

  /** Additional email headers */
  headers?: Record<string, string>;
}

/**
 * Email template data structure
 */
export interface EmailTemplate {
  /** Template name (e.g., 'verification', 'passwordReset', 'welcome') */
  name: string;

  /** Data to be used in template rendering */
  data: Record<string, unknown>;
}

/**
 * Rendered email template result
 */
export interface RenderedEmail {
  /** Rendered HTML content */
  html: string;

  /** Rendered plain text content */
  text?: string;

  /** Email subject line */
  subject: string;
}

/**
 * Result of an email send operation
 */
export interface EmailSendResult {
  /** Whether the email was sent successfully */
  success: boolean;

  /** Unique message ID from the email provider */
  messageId?: string;

  /** Provider identifier (e.g., 'console', 'sendgrid', 'ses') */
  provider: string;

  /** Error information if the send failed */
  error?: Error;
}

/**
 * Email provider interface
 * All email providers must implement this interface
 */
export interface EmailProvider {
  /**
   * Send an email using the provided options
   *
   * @param options - Email configuration and content
   * @returns Promise resolving to the send result
   */
  send(options: EmailOptions): Promise<EmailSendResult>;
}

/**
 * Verification email options
 */
export interface VerificationEmailOptions {
  /** Recipient email address */
  to: string;

  /** User's name for personalization */
  userName?: string;

  /** URL for email verification */
  verificationUrl: string;
}

/**
 * Password reset email options
 */
export interface PasswordResetEmailOptions {
  /** Recipient email address */
  to: string;

  /** User's name for personalization */
  userName?: string;

  /** URL for password reset */
  resetUrl: string;

  /** Time until reset link expires in minutes (default: 60) */
  expiryMinutes?: number;
}

/**
 * Welcome email options
 */
export interface WelcomeEmailOptions {
  /** Recipient email address */
  to: string;

  /** User's name for personalization */
  userName?: string;

  /** URL to login page */
  loginUrl?: string;
}

/**
 * Email service configuration
 */
export interface EmailServiceConfig {
  /** Default from email address */
  defaultFrom?: EmailAddress;

  /** Default reply-to address */
  defaultReplyTo?: EmailAddress;

  /** Whether to log email content (development) */
  logEmails?: boolean;

  /** Email provider to use */
  provider: EmailProvider;
}
