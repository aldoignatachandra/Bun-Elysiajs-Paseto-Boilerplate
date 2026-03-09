/* eslint-disable no-console */
import { describe, it, expect, beforeEach, afterEach } from 'bun:test';
import type {
  EmailOptions,
  EmailAttachment,
  EmailTemplate,
  EmailProvider,
  EmailSendResult
} from '@core/email/email.types';
import { EmailService, ConsoleEmailProvider } from '@core/email/email.service';
import { createLogger } from '@core/logging/logger';

describe('Email Types', () => {
  describe('EmailAttachment', () => {
    it('should have correct structure', () => {
      const attachment: EmailAttachment = {
        filename: 'test.pdf',
        content: Buffer.from('test content'),
        contentType: 'application/pdf'
      };

      expect(attachment.filename).toBe('test.pdf');
      expect(attachment.content).toBeInstanceOf(Buffer);
      expect(attachment.contentType).toBe('application/pdf');
    });

    it('should allow optional content encoding', () => {
      const attachment: EmailAttachment = {
        filename: 'document.txt',
        content: Buffer.from('text'),
        contentType: 'text/plain',
        encoding: 'base64'
      };

      expect(attachment.encoding).toBe('base64');
    });
  });

  describe('EmailOptions', () => {
    it('should have required fields', () => {
      const options: EmailOptions = {
        to: 'test@example.com',
        subject: 'Test Email',
        html: '<h1>Test</h1>'
      };

      expect(options.to).toBe('test@example.com');
      expect(options.subject).toBe('Test Email');
      expect(options.html).toBe('<h1>Test</h1>');
    });

    it('should have optional fields', () => {
      const options: EmailOptions = {
        to: 'test@example.com',
        subject: 'Test',
        html: '<p>Test</p>',
        from: 'sender@example.com',
        cc: ['cc@example.com'],
        bcc: ['bcc@example.com'],
        text: 'Plain text version',
        attachments: [
          {
            filename: 'file.pdf',
            content: Buffer.from('content'),
            contentType: 'application/pdf'
          }
        ],
        replyTo: 'reply@example.com',
        headers: {
          'X-Custom-Header': 'value'
        }
      };

      expect(options.from).toBe('sender@example.com');
      expect(options.cc).toEqual(['cc@example.com']);
      expect(options.bcc).toEqual(['bcc@example.com']);
      expect(options.text).toBe('Plain text version');
      expect(options.attachments).toHaveLength(1);
      expect(options.replyTo).toBe('reply@example.com');
      expect(options.headers).toEqual({ 'X-Custom-Header': 'value' });
    });

    it('should support multiple recipients', () => {
      const options: EmailOptions = {
        to: ['user1@example.com', 'user2@example.com'],
        subject: 'Group Email',
        html: '<p>Hello everyone</p>'
      };

      expect(Array.isArray(options.to)).toBe(true);
      expect(options.to).toHaveLength(2);
    });
  });

  describe('EmailTemplate', () => {
    it('should have template name and data', () => {
      const template: EmailTemplate = {
        name: 'verification',
        data: {
          verificationUrl: 'https://example.com/verify?token=abc123',
          userName: 'John Doe'
        }
      };

      expect(template.name).toBe('verification');
      expect(template.data.verificationUrl).toBeDefined();
      expect(template.data.userName).toBe('John Doe');
    });
  });
});

describe('ConsoleEmailProvider', () => {
  let provider: ConsoleEmailProvider;
  let consoleLogSpy: ReturnType<typeof spyOn>;
  let originalConsoleLog: typeof console.log;

  beforeEach(() => {
    provider = new ConsoleEmailProvider();
    originalConsoleLog = console.log;
    consoleLogSpy = spyOn(console, 'log');
  });

  afterEach(() => {
    console.log = originalConsoleLog;
  });

  function spyOn(obj: typeof console, method: 'log') {
    let calls: unknown[][] = [];
    const original = obj[method];
    obj[method] = (...args: unknown[]) => {
      calls.push(args);
    };
    return {
      calls,
      restore: () => {
        obj[method] = original;
      }
    };
  }

  describe('send', () => {
    it('should log basic email information', async () => {
      const options: EmailOptions = {
        to: 'test@example.com',
        subject: 'Test Subject',
        html: '<h1>Test Content</h1>'
      };

      const result = await provider.send(options);

      expect(result.success).toBe(true);
      expect(result.messageId).toBeDefined();
      expect(result.provider).toBe('console');
    });

    it('should log email with all optional fields', async () => {
      const options: EmailOptions = {
        to: ['user1@example.com', 'user2@example.com'],
        subject: 'Complex Email',
        html: '<p>HTML content</p>',
        text: 'Plain text content',
        from: 'sender@example.com',
        cc: ['cc@example.com'],
        bcc: ['bcc@example.com'],
        replyTo: 'reply@example.com',
        headers: {
          'X-Priority': '1'
        }
      };

      const result = await provider.send(options);

      expect(result.success).toBe(true);
      expect(result.messageId).toBeDefined();
    });

    it('should log email with attachments', async () => {
      const options: EmailOptions = {
        to: 'test@example.com',
        subject: 'Email with attachment',
        html: '<p>See attachment</p>',
        attachments: [
          {
            filename: 'file1.pdf',
            content: Buffer.from('content1'),
            contentType: 'application/pdf'
          },
          {
            filename: 'file2.txt',
            content: Buffer.from('content2'),
            contentType: 'text/plain'
          }
        ]
      };

      const result = await provider.send(options);

      expect(result.success).toBe(true);
      expect(result.messageId).toBeDefined();
    });

    it('should include email content in logs', async () => {
      const options: EmailOptions = {
        to: 'test@example.com',
        subject: 'Test',
        html: '<h1>HTML Content</h1>',
        text: 'Text Content'
      };

      await provider.send(options);

      expect(consoleLogSpy.calls.length).toBeGreaterThan(0);
    });
  });
});

describe('EmailService', () => {
  let emailService: EmailService;
  let mockProvider: EmailProvider;
  let mockLogger: ReturnType<typeof createLogger>;
  let debugCalls: unknown[];
  let errorCalls: unknown[];

  beforeEach(() => {
    debugCalls = [];
    errorCalls = [];

    mockLogger = {
      debug: (message: string, context?: Record<string, unknown>) => {
        debugCalls.push([message, context]);
      },
      info: () => {},
      warn: () => {},
      error: (message: string, error?: unknown, context?: Record<string, unknown>) => {
        errorCalls.push([message, error, context]);
      },
      child: () => mockLogger
    } as ReturnType<typeof createLogger>;

    mockProvider = {
      // eslint-disable-next-line @typescript-eslint/no-unused-vars, @typescript-eslint/require-await
      send: async (_options: EmailOptions) => {
        return {
          success: true,
          messageId: `msg-${Date.now()}`,
          provider: 'mock'
        };
      }
    };

    emailService = new EmailService(mockProvider, mockLogger);
  });

  describe('send', () => {
    it('should send email with minimal options', async () => {
      const options: EmailOptions = {
        to: 'test@example.com',
        subject: 'Test Email',
        html: '<h1>Test</h1>'
      };

      const result = await emailService.send(options);

      expect(result.success).toBe(true);
      expect(result.messageId).toBeDefined();
    });

    it('should send email with all options', async () => {
      const options: EmailOptions = {
        to: ['user1@example.com', 'user2@example.com'],
        subject: 'Complex Email',
        html: '<p>HTML</p>',
        text: 'Text',
        from: 'sender@example.com',
        cc: ['cc@example.com'],
        bcc: ['bcc@example.com'],
        attachments: [
          {
            filename: 'file.pdf',
            content: Buffer.from('content'),
            contentType: 'application/pdf'
          }
        ]
      };

      const result = await emailService.send(options);

      expect(result.success).toBe(true);
    });

    it('should log success on successful send', async () => {
      const options: EmailOptions = {
        to: 'test@example.com',
        subject: 'Test',
        html: '<p>Test</p>'
      };

      await emailService.send(options);

      expect(debugCalls.length).toBeGreaterThan(0);
    });

    it('should handle and log send failures', async () => {
      // eslint-disable-next-line @typescript-eslint/require-await
      mockProvider.send = async () => {
        throw new Error('SMTP connection failed');
      };

      const options: EmailOptions = {
        to: 'test@example.com',
        subject: 'Test',
        html: '<p>Test</p>'
      };

      const result = await emailService.send(options);

      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
      expect(errorCalls.length).toBeGreaterThan(0);
    });

    it('should validate email options before sending', async () => {
      const invalidOptions = {
        to: '',
        subject: '',
        html: ''
      } as EmailOptions;

      const result = await emailService.send(invalidOptions);

      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
    });
  });

  describe('sendVerificationEmail', () => {
    it('should send verification email with correct template', async () => {
      const sendCalls: EmailOptions[] = [];
      // eslint-disable-next-line @typescript-eslint/require-await
      emailService.send = async (options: EmailOptions) => {
        sendCalls.push(options);
        return {
          success: true,
          messageId: 'msg-123',
          provider: 'mock'
        } as EmailSendResult;
      };

      await emailService.sendVerificationEmail({
        to: 'user@example.com',
        verificationUrl: 'https://example.com/verify?token=abc123',
        userName: 'John Doe'
      });

      expect(sendCalls.length).toBe(1);
      const sentOptions = sendCalls[0];

      expect(sentOptions.to).toBe('user@example.com');
      expect(sentOptions.subject.toLowerCase()).toContain('verify');
      expect(sentOptions.html).toContain('John Doe');
      expect(sentOptions.html).toContain('https://example.com/verify?token=abc123');
    });

    it('should use default values for optional parameters', async () => {
      const sendCalls: EmailOptions[] = [];
      // eslint-disable-next-line @typescript-eslint/require-await
      emailService.send = async (options: EmailOptions) => {
        sendCalls.push(options);
        return {
          success: true,
          messageId: 'msg-123',
          provider: 'mock'
        } as EmailSendResult;
      };

      await emailService.sendVerificationEmail({
        to: 'user@example.com',
        verificationUrl: 'https://example.com/verify?token=abc'
      });

      expect(sendCalls.length).toBe(1);
      const sentOptions = sendCalls[0];

      expect(sentOptions.to).toBe('user@example.com');
      expect(sentOptions.html).toBeDefined();
    });
  });

  describe('sendPasswordResetEmail', () => {
    it('should send password reset email with correct template', async () => {
      const sendCalls: EmailOptions[] = [];
      // eslint-disable-next-line @typescript-eslint/require-await
      emailService.send = async (options: EmailOptions) => {
        sendCalls.push(options);
        return {
          success: true,
          messageId: 'msg-456',
          provider: 'mock'
        } as EmailSendResult;
      };

      await emailService.sendPasswordResetEmail({
        to: 'user@example.com',
        resetUrl: 'https://example.com/reset?token=reset123',
        userName: 'Jane Doe',
        expiryMinutes: 30
      });

      expect(sendCalls.length).toBe(1);
      const sentOptions = sendCalls[0];

      expect(sentOptions.to).toBe('user@example.com');
      expect(sentOptions.subject.toLowerCase()).toContain('reset');
      expect(sentOptions.html).toContain('Jane Doe');
      expect(sentOptions.html).toContain('https://example.com/reset?token=reset123');
      expect(sentOptions.html).toContain('30');
    });

    it('should use default expiry time', async () => {
      const sendCalls: EmailOptions[] = [];
      // eslint-disable-next-line @typescript-eslint/require-await
      emailService.send = async (options: EmailOptions) => {
        sendCalls.push(options);
        return {
          success: true,
          messageId: 'msg-456',
          provider: 'mock'
        } as EmailSendResult;
      };

      await emailService.sendPasswordResetEmail({
        to: 'user@example.com',
        resetUrl: 'https://example.com/reset?token=xyz'
      });

      expect(sendCalls.length).toBe(1);
    });
  });

  describe('sendWelcomeEmail', () => {
    it('should send welcome email with correct template', async () => {
      const sendCalls: EmailOptions[] = [];
      // eslint-disable-next-line @typescript-eslint/require-await
      emailService.send = async (options: EmailOptions) => {
        sendCalls.push(options);
        return {
          success: true,
          messageId: 'msg-789',
          provider: 'mock'
        } as EmailSendResult;
      };

      await emailService.sendWelcomeEmail({
        to: 'newuser@example.com',
        userName: 'New User',
        loginUrl: 'https://example.com/login'
      });

      expect(sendCalls.length).toBe(1);
      const sentOptions = sendCalls[0];

      expect(sentOptions.to).toBe('newuser@example.com');
      expect(sentOptions.subject.toLowerCase()).toContain('welcome');
      expect(sentOptions.subject).toContain('New User');
      expect(sentOptions.html).toContain('New User');
      expect(sentOptions.html).toContain('https://example.com/login');
    });

    it('should handle minimal welcome email', async () => {
      const sendCalls: EmailOptions[] = [];
      // eslint-disable-next-line @typescript-eslint/require-await
      emailService.send = async (options: EmailOptions) => {
        sendCalls.push(options);
        return {
          success: true,
          messageId: 'msg-789',
          provider: 'mock'
        } as EmailSendResult;
      };

      await emailService.sendWelcomeEmail({
        to: 'newuser@example.com'
      });

      expect(sendCalls.length).toBe(1);
    });
  });

  describe('Template Rendering', () => {
    it('should render verification template correctly', async () => {
      const result = await emailService.renderTemplate({
        name: 'verification',
        data: {
          verificationUrl: 'https://example.com/verify?token=abc',
          userName: 'Test User'
        }
      });

      expect(result.html).toContain('Test User');
      expect(result.html).toContain('https://example.com/verify?token=abc');
      expect(result.subject).toBeDefined();
    });

    it('should render password reset template correctly', async () => {
      const result = await emailService.renderTemplate({
        name: 'passwordReset',
        data: {
          resetUrl: 'https://example.com/reset?token=xyz',
          userName: 'Test User',
          expiryMinutes: 60
        }
      });

      expect(result.html).toContain('Test User');
      expect(result.html).toContain('https://example.com/reset?token=xyz');
      expect(result.html).toContain('60');
    });

    it('should render welcome template correctly', async () => {
      const result = await emailService.renderTemplate({
        name: 'welcome',
        data: {
          userName: 'New User',
          loginUrl: 'https://example.com/login'
        }
      });

      expect(result.html).toContain('New User');
      expect(result.html).toContain('https://example.com/login');
    });

    it('should handle unknown template names', async () => {
      const result = await emailService.renderTemplate({
        name: 'unknown',
        data: {}
      });

      expect(result.html).toBeDefined();
      expect(result.subject).toBeDefined();
    });

    it('should handle missing template data', async () => {
      const result = await emailService.renderTemplate({
        name: 'verification',
        data: {}
      });

      expect(result.html).toBeDefined();
      expect(result.subject).toBeDefined();
    });
  });

  describe('Validation', () => {
    it('should validate email addresses', async () => {
      const result = await emailService.send({
        to: 'invalid-email',
        subject: 'Test',
        html: '<p>Test</p>'
      });

      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
    });

    it('should validate multiple email addresses', async () => {
      const result = await emailService.send({
        to: ['valid@example.com', 'invalid-email'],
        subject: 'Test',
        html: '<p>Test</p>'
      });

      expect(result.success).toBe(false);
    });

    it('should validate required fields', async () => {
      const result1 = await emailService.send({
        to: 'test@example.com',
        subject: '',
        html: ''
      } as EmailOptions);

      expect(result1.success).toBe(false);

      const result2 = await emailService.send({
        to: '',
        subject: 'Test',
        html: '<p>Test</p>'
      } as EmailOptions);

      expect(result2.success).toBe(false);
    });
  });

  describe('Error Handling', () => {
    it('should handle provider errors gracefully', async () => {
      // eslint-disable-next-line @typescript-eslint/require-await
      mockProvider.send = async () => {
        throw new Error('Network error');
      };

      const result = await emailService.send({
        to: 'test@example.com',
        subject: 'Test',
        html: '<p>Test</p>'
      });

      expect(result.success).toBe(false);
      expect(result.error).toBeInstanceOf(Error);
      expect(result.error?.message).toBe('Network error');
    });

    it('should handle timeout errors', async () => {
      // eslint-disable-next-line @typescript-eslint/require-await
      mockProvider.send = async () => {
        throw new Error('Timeout');
      };

      const result = await emailService.send({
        to: 'test@example.com',
        subject: 'Test',
        html: '<p>Test</p>'
      });

      expect(result.success).toBe(false);
    });

    it('should log errors with context', async () => {
      // eslint-disable-next-line @typescript-eslint/require-await
      mockProvider.send = async () => {
        throw new Error('Test error');
      };

      await emailService.send({
        to: 'test@example.com',
        subject: 'Test',
        html: '<p>Test</p>'
      });

      expect(errorCalls.length).toBeGreaterThan(0);
      expect(errorCalls[0][0]).toContain('error sending email');
      expect(errorCalls[0][2]).toEqual({
        to: 'test@example.com',
        subject: 'Test'
      });
    });
  });
});

describe('Email Template Content', () => {
  let emailService: EmailService;

  beforeEach(() => {
    const mockProvider: EmailProvider = {
      // eslint-disable-next-line @typescript-eslint/require-await
      send: async () => ({
        success: true,
        messageId: 'msg-123',
        provider: 'mock'
      })
    };
    emailService = new EmailService(mockProvider, createLogger({ service: 'email-test' }));
  });

  describe('Verification Email Template', () => {
    it('should contain verification link', async () => {
      const result = await emailService.renderTemplate({
        name: 'verification',
        data: {
          verificationUrl: 'https://example.com/verify/abc123',
          userName: 'John Doe'
        }
      });

      expect(result.html).toContain('https://example.com/verify/abc123');
      expect(result.html).toContain('Verify Email');
    });

    it('should include user name', async () => {
      const result = await emailService.renderTemplate({
        name: 'verification',
        data: {
          verificationUrl: 'https://example.com/verify/abc123',
          userName: 'Jane Smith'
        }
      });

      expect(result.html).toContain('Jane Smith');
    });

    it('should have appropriate subject line', async () => {
      const result = await emailService.renderTemplate({
        name: 'verification',
        data: {
          verificationUrl: 'https://example.com/verify/abc123',
          userName: 'John'
        }
      });

      expect(result.subject).toBeDefined();
      expect(result.subject.toLowerCase()).toContain('verify');
    });
  });

  describe('Password Reset Email Template', () => {
    it('should contain reset link', async () => {
      const result = await emailService.renderTemplate({
        name: 'passwordReset',
        data: {
          resetUrl: 'https://example.com/reset/xyz789',
          userName: 'John Doe',
          expiryMinutes: 30
        }
      });

      expect(result.html).toContain('https://example.com/reset/xyz789');
      expect(result.html).toContain('Reset Password');
    });

    it('should include expiry information', async () => {
      const result = await emailService.renderTemplate({
        name: 'passwordReset',
        data: {
          resetUrl: 'https://example.com/reset/xyz789',
          userName: 'John',
          expiryMinutes: 60
        }
      });

      expect(result.html).toContain('60');
      expect(result.html.toLowerCase()).toContain('minute');
    });

    it('should mention security', async () => {
      const result = await emailService.renderTemplate({
        name: 'passwordReset',
        data: {
          resetUrl: 'https://example.com/reset/xyz789',
          userName: 'John'
        }
      });

      expect(result.html.toLowerCase()).toContain('security');
    });
  });

  describe('Welcome Email Template', () => {
    it('should welcome the user', async () => {
      const result = await emailService.renderTemplate({
        name: 'welcome',
        data: {
          userName: 'New User',
          loginUrl: 'https://example.com/login'
        }
      });

      expect(result.html).toContain('New User');
      expect(result.html).toContain('Welcome');
    });

    it('should include login link', async () => {
      const result = await emailService.renderTemplate({
        name: 'welcome',
        data: {
          userName: 'User',
          loginUrl: 'https://example.com/login'
        }
      });

      expect(result.html).toContain('https://example.com/login');
      expect(result.html).toContain('login');
    });

    it('should have friendly subject line', async () => {
      const result = await emailService.renderTemplate({
        name: 'welcome',
        data: {
          userName: 'User',
          loginUrl: 'https://example.com/login'
        }
      });

      expect(result.subject).toBeDefined();
      expect(result.subject.toLowerCase()).toContain('welcome');
    });
  });
});
