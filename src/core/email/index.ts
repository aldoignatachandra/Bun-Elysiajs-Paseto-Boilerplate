/**
 * Email Service Module
 *
 * This module provides a comprehensive email service with template support,
 * multiple provider options, and proper error handling and logging.
 *
 * @example
 * ```typescript
 * import { EmailService, ConsoleEmailProvider } from '@core/email';
 *
 * const provider = new ConsoleEmailProvider();
 * const emailService = new EmailService(provider);
 *
 * await emailService.sendVerificationEmail({
 *   to: 'user@example.com',
 *   verificationUrl: 'https://example.com/verify?token=abc123',
 *   userName: 'John Doe'
 * });
 * ```
 */

// Type exports
export type {
  EmailAttachment,
  EmailAddress,
  EmailOptions,
  EmailProvider,
  EmailSendResult,
  EmailServiceConfig,
  EmailTemplate,
  RenderedEmail,
  VerificationEmailOptions,
  PasswordResetEmailOptions,
  WelcomeEmailOptions
} from './email.types';

// Service exports
export { EmailService, ConsoleEmailProvider } from './email.service';
