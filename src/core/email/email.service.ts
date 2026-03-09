/**
 * Email Service Implementation
 *
 * This module provides a comprehensive email service with template support,
 * multiple provider options, and proper error handling and logging.
 *
 * eslint-disable-next-line no-console
 */

import type {
  EmailOptions,
  EmailAttachment,
  EmailTemplate,
  EmailProvider,
  EmailSendResult,
  RenderedEmail,
  VerificationEmailOptions,
  PasswordResetEmailOptions,
  WelcomeEmailOptions,
  EmailAddress
} from './email.types';
import { createLogger, type Logger } from '@core/logging/logger';

/**
 * Regular expression for email validation
 */
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/**
 * Validate an email address
 */
function validateEmailAddress(email: EmailAddress): boolean {
  if (typeof email === 'string') {
    return EMAIL_REGEX.test(email);
  }

  if (typeof email === 'object' && email.address) {
    return EMAIL_REGEX.test(email.address);
  }

  return false;
}

/**
 * Validate multiple email addresses
 */
function validateEmailAddresses(emails: EmailAddress | EmailAddress[]): boolean {
  if (Array.isArray(emails)) {
    return emails.every(validateEmailAddress);
  }
  return validateEmailAddress(emails);
}

/**
 * Format email address for display
 */
function formatEmailAddress(email: EmailAddress): string {
  if (typeof email === 'string') {
    return email;
  }

  return `${email.name} <${email.address}>`;
}

/**
 * Console Email Provider
 *
 * Logs emails to console for development and testing purposes.
 * This is useful during development when you don't want to send real emails.
 */
// eslint-disable-next-line no-console
export class ConsoleEmailProvider implements EmailProvider {
  constructor(private logger?: Logger) {}

  /**
   * Log email details to console
   */
  // eslint-disable-next-line no-console, @typescript-eslint/require-await
  async send(options: EmailOptions): Promise<EmailSendResult> {
    try {
      const messageId = `console-${Date.now()}-${Math.random().toString(36).substring(7)}`;

      console.log('\n' + '='.repeat(80));
      console.log('📧 EMAIL SENT (Console Provider)');
      console.log('='.repeat(80));
      console.log(`Message ID: ${messageId}`);
      console.log(`From: ${options.from ? formatEmailAddress(options.from) : '(default)'}`);
      console.log(`To: ${Array.isArray(options.to) ? options.to.map(formatEmailAddress).join(', ') : formatEmailAddress(options.to)}`);

      if (options.cc) {
        console.log(`Cc: ${Array.isArray(options.cc) ? options.cc.map(formatEmailAddress).join(', ') : formatEmailAddress(options.cc)}`);
      }

      if (options.bcc) {
        console.log(`Bcc: ${Array.isArray(options.bcc) ? options.bcc.map(formatEmailAddress).join(', ') : formatEmailAddress(options.bcc)}`);
      }

      if (options.replyTo) {
        console.log(`Reply-To: ${formatEmailAddress(options.replyTo)}`);
      }

      console.log(`Subject: ${options.subject}`);
      console.log('-'.repeat(80));
      console.log('HTML Content:');
      console.log(options.html);
      console.log('-'.repeat(80));

      if (options.text) {
        console.log('Text Content:');
        console.log(options.text);
        console.log('-'.repeat(80));
      }

      if (options.attachments && options.attachments.length > 0) {
        console.log('Attachments:');
        options.attachments.forEach((attachment: EmailAttachment, index: number) => {
          console.log(`  ${index + 1}. ${attachment.filename} (${attachment.contentType}, ${attachment.content.length} bytes)`);
        });
        console.log('-'.repeat(80));
      }

      if (options.headers && Object.keys(options.headers).length > 0) {
        console.log('Headers:');
        Object.entries(options.headers).forEach(([key, value]) => {
          console.log(`  ${key}: ${value}`);
        });
        console.log('-'.repeat(80));
      }

      console.log('='.repeat(80) + '\n');

      return {
        success: true,
        messageId,
        provider: 'console'
      };
    } catch (error) {
      // eslint-disable-next-line @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access
      if (this.logger) {
        // eslint-disable-next-line @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access
        this.logger.error('Failed to send email via console provider', error);
      }

      // eslint-disable-next-line @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access
      if (this.logger) {
        // eslint-disable-next-line @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access
        this.logger.error('Failed to send email via console provider', error);
      }

      return {
        success: false,
        provider: 'console',
        error: error instanceof Error ? error : new Error(String(error))
      };
    }
  }
}

/**
 * Email Service
 *
 * Main service for sending emails with template support and validation.
 */
export class EmailService {
  constructor(
    private provider: EmailProvider,
    private logger: Logger = createLogger({ service: 'email' })
  ) {}

  /**
   * Validate email options before sending
   */
  private validateEmailOptions(options: EmailOptions): { valid: boolean; error?: string } {
    if (!options.to) {
      return { valid: false, error: 'Recipient email address is required' };
    }

    if (!validateEmailAddresses(options.to)) {
      return { valid: false, error: 'Invalid recipient email address' };
    }

    if (options.cc && !validateEmailAddresses(options.cc)) {
      return { valid: false, error: 'Invalid CC email address' };
    }

    if (options.bcc && !validateEmailAddresses(options.bcc)) {
      return { valid: false, error: 'Invalid BCC email address' };
    }

    if (options.replyTo && !validateEmailAddress(options.replyTo)) {
      return { valid: false, error: 'Invalid reply-to email address' };
    }

    if (!options.subject || options.subject.trim() === '') {
      return { valid: false, error: 'Email subject is required' };
    }

    if (!options.html || options.html.trim() === '') {
      return { valid: false, error: 'Email HTML content is required' };
    }

    return { valid: true };
  }

  /**
   * Send an email
   *
   * @param options - Email configuration and content
   * @returns Promise resolving to the send result
   */
  async send(options: EmailOptions): Promise<EmailSendResult> {
    try {
      // Validate email options
      const validation = this.validateEmailOptions(options);
      if (!validation.valid) {
        const error = new Error(validation.error);
        // eslint-disable-next-line @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access
        this.logger.error('Email validation failed', error, {
          to: options.to,
          subject: options.subject
        });
        return {
          success: false,
          provider: this.constructor.name,
          error
        };
      }

      // Send email using the configured provider
      const result = await this.provider.send(options);

      if (result.success) {
        // eslint-disable-next-line @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access
        this.logger.debug('Email sent successfully', {
          messageId: result.messageId,
          to: options.to,
          subject: options.subject,
          provider: result.provider
        });
      } else {
        // eslint-disable-next-line @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access
        this.logger.error('Failed to send email', result.error, {
          to: options.to,
          subject: options.subject
        });
      }

      return result;
    } catch (error) {
      const errorObj = error instanceof Error ? error : new Error(String(error));
      // eslint-disable-next-line @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access
      this.logger.error('Unexpected error sending email', errorObj, {
        to: options.to,
        subject: options.subject
      });

      return {
        success: false,
        provider: this.constructor.name,
        error: errorObj
      };
    }
  }

  /**
   * Render an email template
   *
   * @param template - Template name and data
   * @returns Rendered email with HTML, text, and subject
   */
  // eslint-disable-next-line @typescript-eslint/require-await
  async renderTemplate(template: EmailTemplate): Promise<RenderedEmail> {
    const { name, data } = template;

    switch (name) {
      case 'verification':
        return this.renderVerificationTemplate(data);
      case 'passwordReset':
        return this.renderPasswordResetTemplate(data);
      case 'welcome':
        return this.renderWelcomeTemplate(data);
      default:
        // eslint-disable-next-line @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access
        this.logger.warn(`Unknown template: ${name}, using default template`);
        return this.renderDefaultTemplate(data);
    }
  }

  /**
   * Render verification email template
   */
  private renderVerificationTemplate(data: Record<string, unknown>): RenderedEmail {
    const userName = (data.userName as string) || 'there';
    const verificationUrl = data.verificationUrl as string;

    const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Verify Your Email</title>
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, sans-serif; line-height: 1.6; color: #333; }
    .container { max-width: 600px; margin: 0 auto; padding: 20px; }
    .button { display: inline-block; padding: 12px 24px; background-color: #0066cc; color: white; text-decoration: none; border-radius: 4px; margin: 20px 0; }
    .button:hover { background-color: #0052a3; }
    .footer { margin-top: 40px; padding-top: 20px; border-top: 1px solid #eee; font-size: 12px; color: #666; }
  </style>
</head>
<body>
  <div class="container">
    <h1>Verify Your Email Address</h1>
    <p>Hi ${userName},</p>
    <p>Thank you for signing up! Please verify your email address by clicking the button below:</p>
    <p><a href="${verificationUrl}" class="button">Verify Email Address</a></p>
    <p>Or copy and paste this link into your browser:</p>
    <p>${verificationUrl}</p>
    <p>This link will expire in 24 hours.</p>
    <div class="footer">
      <p>If you didn't create an account, you can safely ignore this email.</p>
    </div>
  </div>
</body>
</html>
    `.trim();

    const text = `
Verify Your Email Address

Hi ${userName},

Thank you for signing up! Please verify your email address by clicking the link below:

${verificationUrl}

This link will expire in 24 hours.

If you didn't create an account, you can safely ignore this email.
    `.trim();

    return {
      html,
      text,
      subject: 'Verify Your Email Address'
    };
  }

  /**
   * Render password reset email template
   */
  private renderPasswordResetTemplate(data: Record<string, unknown>): RenderedEmail {
    const userName = (data.userName as string) || 'there';
    const resetUrl = data.resetUrl as string;
    const expiryMinutes = (data.expiryMinutes as number) || 60;

    const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Reset Your Password</title>
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, sans-serif; line-height: 1.6; color: #333; }
    .container { max-width: 600px; margin: 0 auto; padding: 20px; }
    .button { display: inline-block; padding: 12px 24px; background-color: #dc3545; color: white; text-decoration: none; border-radius: 4px; margin: 20px 0; }
    .button:hover { background-color: #c82333; }
    .warning { background-color: #fff3cd; border-left: 4px solid #ffc107; padding: 15px; margin: 20px 0; }
    .footer { margin-top: 40px; padding-top: 20px; border-top: 1px solid #eee; font-size: 12px; color: #666; }
  </style>
</head>
<body>
  <div class="container">
    <h1>Reset Your Password</h1>
    <p>Hi ${userName},</p>
    <p>We received a request to reset your password. Click the button below to create a new password:</p>
    <p><a href="${resetUrl}" class="button">Reset Password</a></p>
    <p>Or copy and paste this link into your browser:</p>
    <p>${resetUrl}</p>
    <div class="warning">
      <strong>Important:</strong> This link will expire in ${expiryMinutes} minutes. If you didn't request a password reset, please ignore this email or contact support if you have concerns.
    </div>
    <div class="footer">
      <p>For your security, please never share your password with anyone.</p>
    </div>
  </div>
</body>
</html>
    `.trim();

    const text = `
Reset Your Password

Hi ${userName},

We received a request to reset your password. Click the link below to create a new password:

${resetUrl}

This link will expire in ${expiryMinutes} minutes.

If you didn't request a password reset, please ignore this email or contact support if you have concerns.

For your security, please never share your password with anyone.
    `.trim();

    return {
      html,
      text,
      subject: 'Reset Your Password'
    };
  }

  /**
   * Render welcome email template
   */
  private renderWelcomeTemplate(data: Record<string, unknown>): RenderedEmail {
    const userName = (data.userName as string) || 'there';
    const loginUrl = (data.loginUrl as string) || '#';

    const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Welcome to Our Platform</title>
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, sans-serif; line-height: 1.6; color: #333; }
    .container { max-width: 600px; margin: 0 auto; padding: 20px; }
    .button { display: inline-block; padding: 12px 24px; background-color: #28a745; color: white; text-decoration: none; border-radius: 4px; margin: 20px 0; }
    .button:hover { background-color: #218838; }
    .footer { margin-top: 40px; padding-top: 20px; border-top: 1px solid #eee; font-size: 12px; color: #666; }
  </style>
</head>
<body>
  <div class="container">
    <h1>Welcome, ${userName}!</h1>
    <p>We're thrilled to have you on board. Your account has been successfully created and is ready to use.</p>
    <p>You can now access all the features and benefits of our platform.</p>
    <p><a href="${loginUrl}" class="button">Login to Your Account</a></p>
    <h3>Getting Started</h3>
    <ul>
      <li>Complete your profile to personalize your experience</li>
      <li>Explore our documentation to learn about all features</li>
      <li>Check out our community forums to connect with other users</li>
    </ul>
    <p>If you have any questions, don't hesitate to reach out to our support team.</p>
    <div class="footer">
      <p>Thanks for joining us!</p>
    </div>
  </div>
</body>
</html>
    `.trim();

    const text = `
Welcome, ${userName}!

We're thrilled to have you on board. Your account has been successfully created and is ready to use.

You can now access all the features and benefits of our platform.

Login here: ${loginUrl}

Getting Started:
- Complete your profile to personalize your experience
- Explore our documentation to learn about all features
- Check out our community forums to connect with other users

If you have any questions, don't hesitate to reach out to our support team.

Thanks for joining us!
    `.trim();

    return {
      html,
      text,
      subject: `Welcome to Our Platform, ${userName}!`
    };
  }

  /**
   * Render default email template
   */
  private renderDefaultTemplate(data: Record<string, unknown>): RenderedEmail {
    const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Email</title>
</head>
<body>
  <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
    <p>${JSON.stringify(data, null, 2)}</p>
  </div>
</body>
</html>
    `.trim();

    return {
      html,
      text: JSON.stringify(data, null, 2),
      subject: 'Email'
    };
  }

  /**
   * Send a verification email
   *
   * @param options - Verification email options
   * @returns Promise resolving to the send result
   */
  async sendVerificationEmail(options: VerificationEmailOptions): Promise<EmailSendResult> {
    const rendered = await this.renderTemplate({
      name: 'verification',
      data: {
        verificationUrl: options.verificationUrl,
        userName: options.userName
      }
    });

    return this.send({
      to: options.to,
      subject: rendered.subject,
      html: rendered.html,
      text: rendered.text
    });
  }

  /**
   * Send a password reset email
   *
   * @param options - Password reset email options
   * @returns Promise resolving to the send result
   */
  async sendPasswordResetEmail(options: PasswordResetEmailOptions): Promise<EmailSendResult> {
    const rendered = await this.renderTemplate({
      name: 'passwordReset',
      data: {
        resetUrl: options.resetUrl,
        userName: options.userName,
        expiryMinutes: options.expiryMinutes
      }
    });

    return this.send({
      to: options.to,
      subject: rendered.subject,
      html: rendered.html,
      text: rendered.text
    });
  }

  /**
   * Send a welcome email
   *
   * @param options - Welcome email options
   * @returns Promise resolving to the send result
   */
  async sendWelcomeEmail(options: WelcomeEmailOptions): Promise<EmailSendResult> {
    const rendered = await this.renderTemplate({
      name: 'welcome',
      data: {
        userName: options.userName,
        loginUrl: options.loginUrl
      }
    });

    return this.send({
      to: options.to,
      subject: rendered.subject,
      html: rendered.html,
      text: rendered.text
    });
  }
}
