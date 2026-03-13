/* eslint-disable @typescript-eslint/no-explicit-any */
import { describe, it, expect } from 'bun:test';
import { PasetoError, TokenValidationError, TokenExpiredError, InvalidTokenPayloadError, KeyConfigError } from '@/core/paseto/errors';

describe('PASETO Errors', () => {
  describe('PasetoError', () => {
    it('should create base PasetoError with message and code', () => {
      const error = new PasetoError('Test error', 'TEST_ERROR');
      expect(error).toBeInstanceOf(Error);
      expect(error).toBeInstanceOf(PasetoError);
      expect(error.message).toBe('Test error');
      expect(error.code).toBe('TEST_ERROR');
      expect(error.name).toBe('PasetoError');
    });

    it('should be throwable and catchable', () => {
      expect(() => {
        throw new PasetoError('Test error', 'TEST_ERROR');
      }).toThrow(PasetoError);
      expect(() => {
        throw new PasetoError('Test error', 'TEST_ERROR');
      }).toThrow('Test error');
    });

    it('should maintain error stack trace', () => {
      const error = new PasetoError('Test error', 'TEST_ERROR');
      expect(error.stack).toBeDefined();
      expect(typeof error.stack).toBe('string');
    });

    it('should work with instanceof checks', () => {
      const error = new PasetoError('Test', 'CODE');
      expect(error instanceof PasetoError).toBe(true);
      expect(error instanceof Error).toBe(true);
    });

    it('should have correct name property', () => {
      const error = new PasetoError('Test', 'CODE');
      expect(error.name).toBe('PasetoError');
    });
  });

  describe('TokenValidationError', () => {
    it('should create TokenValidationError with message', () => {
      const error = new TokenValidationError('Validation failed');
      expect(error).toBeInstanceOf(Error);
      expect(error).toBeInstanceOf(PasetoError);
      expect(error).toBeInstanceOf(TokenValidationError);
      expect(error.message).toBe('Validation failed');
      expect(error.code).toBe('TOKEN_VALIDATION_ERROR');
      expect(error.name).toBe('TokenValidationError');
    });

    it('should use default error code', () => {
      const error = new TokenValidationError('Test message');
      expect(error.code).toBe('TOKEN_VALIDATION_ERROR');
    });

    it('should be throwable as PasetoError', () => {
      expect(() => {
        throw new TokenValidationError('Test');
      }).toThrow(PasetoError);
      expect(() => {
        throw new TokenValidationError('Test');
      }).toThrow(TokenValidationError);
    });

    it('should allow custom validation messages', () => {
      const error1 = new TokenValidationError('Invalid signature');
      const error2 = new TokenValidationError('Malformed token');
      expect(error1.message).toBe('Invalid signature');
      expect(error2.message).toBe('Malformed token');
    });
  });

  describe('TokenExpiredError', () => {
    it('should create TokenExpiredError with default message', () => {
      const error = new TokenExpiredError();
      expect(error).toBeInstanceOf(Error);
      expect(error).toBeInstanceOf(PasetoError);
      expect(error).toBeInstanceOf(TokenExpiredError);
      expect(error.message).toBe('Token has expired');
      expect(error.code).toBe('TOKEN_EXPIRED');
      expect(error.name).toBe('TokenExpiredError');
    });

    it('should have fixed error code', () => {
      const error = new TokenExpiredError();
      expect(error.code).toBe('TOKEN_EXPIRED');
    });

    it('should be throwable as PasetoError', () => {
      expect(() => {
        throw new TokenExpiredError();
      }).toThrow(PasetoError);
      expect(() => {
        throw new TokenExpiredError();
      }).toThrow(TokenExpiredError);
    });

    it('should have consistent error properties', () => {
      const error = new TokenExpiredError();
      expect(error.name).toBe('TokenExpiredError');
      expect(error.message).toBe('Token has expired');
      expect(error.code).toBe('TOKEN_EXPIRED');
    });
  });

  describe('InvalidTokenPayloadError', () => {
    it('should create InvalidTokenPayloadError with message', () => {
      const error = new InvalidTokenPayloadError('Invalid payload structure');
      expect(error).toBeInstanceOf(Error);
      expect(error).toBeInstanceOf(PasetoError);
      expect(error).toBeInstanceOf(InvalidTokenPayloadError);
      expect(error.message).toBe('Invalid payload structure');
      expect(error.code).toBe('INVALID_PAYLOAD');
      expect(error.name).toBe('InvalidTokenPayloadError');
    });

    it('should use default error code', () => {
      const error = new InvalidTokenPayloadError('Test');
      expect(error.code).toBe('INVALID_PAYLOAD');
    });

    it('should be throwable as PasetoError', () => {
      expect(() => {
        throw new InvalidTokenPayloadError('Test');
      }).toThrow(PasetoError);
      expect(() => {
        throw new InvalidTokenPayloadError('Test');
      }).toThrow(InvalidTokenPayloadError);
    });

    it('should allow custom error messages', () => {
      const error1 = new InvalidTokenPayloadError('Missing required field: iss');
      const error2 = new InvalidTokenPayloadError('Invalid token type');
      expect(error1.message).toBe('Missing required field: iss');
      expect(error2.message).toBe('Invalid token type');
    });

    it('should have correct name property', () => {
      const error = new InvalidTokenPayloadError('Test');
      expect(error.name).toBe('InvalidTokenPayloadError');
    });
  });

  describe('KeyConfigError', () => {
    it('should create KeyConfigError with message', () => {
      const error = new KeyConfigError('Invalid key configuration');
      expect(error).toBeInstanceOf(Error);
      expect(error).toBeInstanceOf(PasetoError);
      expect(error).toBeInstanceOf(KeyConfigError);
      expect(error.message).toBe('Invalid key configuration');
      expect(error.code).toBe('KEY_CONFIG_ERROR');
      expect(error.name).toBe('KeyConfigError');
    });

    it('should use default error code', () => {
      const error = new KeyConfigError('Test');
      expect(error.code).toBe('KEY_CONFIG_ERROR');
    });

    it('should be throwable as PasetoError', () => {
      expect(() => {
        throw new KeyConfigError('Test');
      }).toThrow(PasetoError);
      expect(() => {
        throw new KeyConfigError('Test');
      }).toThrow(KeyConfigError);
    });

    it('should allow custom error messages', () => {
      const error1 = new KeyConfigError('Missing secret key');
      const error2 = new KeyConfigError('Invalid key format');
      expect(error1.message).toBe('Missing secret key');
      expect(error2.message).toBe('Invalid key format');
    });

    it('should have correct name property', () => {
      const error = new KeyConfigError('Test');
      expect(error.name).toBe('KeyConfigError');
    });
  });

  describe('Error Hierarchy', () => {
    it('should all PASETO errors extend from Error', () => {
      const baseError = new PasetoError('Base', 'BASE');
      const validationError = new TokenValidationError('Validation');
      const expiredError = new TokenExpiredError();
      const payloadError = new InvalidTokenPayloadError('Payload');
      const configError = new KeyConfigError('Config');

      expect(baseError instanceof Error).toBe(true);
      expect(validationError instanceof Error).toBe(true);
      expect(expiredError instanceof Error).toBe(true);
      expect(payloadError instanceof Error).toBe(true);
      expect(configError instanceof Error).toBe(true);
    });

    it('should all PASETO errors extend from PasetoError', () => {
      const validationError = new TokenValidationError('Validation');
      const expiredError = new TokenExpiredError();
      const payloadError = new InvalidTokenPayloadError('Payload');
      const configError = new KeyConfigError('Config');

      expect(validationError instanceof PasetoError).toBe(true);
      expect(expiredError instanceof PasetoError).toBe(true);
      expect(payloadError instanceof PasetoError).toBe(true);
      expect(configError instanceof PasetoError).toBe(true);
    });

    it('should allow catching all PASETO errors', () => {
      const errors = [
        new PasetoError('Base', 'BASE'),
        new TokenValidationError('Validation'),
        new TokenExpiredError(),
        new InvalidTokenPayloadError('Payload'),
        new KeyConfigError('Config'),
      ];

      for (const error of errors) {
        expect(error instanceof PasetoError).toBe(true);
      }
    });

    it('should allow type narrowing with instanceof', () => {
      const error: unknown = new TokenExpiredError();

      if (error instanceof TokenExpiredError) {
        expect(error.code).toBe('TOKEN_EXPIRED');
        expect(error.message).toBe('Token has expired');
      }
    });
  });

  describe('Error Codes', () => {
    it('should have unique error codes for each error type', () => {
      const codes = new Set([
        new PasetoError('Test', 'BASE').code,
        new TokenValidationError('Test').code,
        new TokenExpiredError().code,
        new InvalidTokenPayloadError('Test').code,
        new KeyConfigError('Test').code,
      ]);

      expect(codes.size).toBe(5);
    });

    it('should have consistent error codes', () => {
      const validationError1 = new TokenValidationError('Test1');
      const validationError2 = new TokenValidationError('Test2');
      expect(validationError1.code).toBe(validationError2.code);
      expect(validationError1.code).toBe('TOKEN_VALIDATION_ERROR');

      const expiredError1 = new TokenExpiredError();
      const expiredError2 = new TokenExpiredError();
      expect(expiredError1.code).toBe(expiredError2.code);
      expect(expiredError1.code).toBe('TOKEN_EXPIRED');

      const payloadError1 = new InvalidTokenPayloadError('Test1');
      const payloadError2 = new InvalidTokenPayloadError('Test2');
      expect(payloadError1.code).toBe(payloadError2.code);
      expect(payloadError1.code).toBe('INVALID_PAYLOAD');

      const configError1 = new KeyConfigError('Test1');
      const configError2 = new KeyConfigError('Test2');
      expect(configError1.code).toBe(configError2.code);
      expect(configError1.code).toBe('KEY_CONFIG_ERROR');
    });
  });

  describe('Error Usage Patterns', () => {
    it('should support try-catch pattern', () => {
      let caughtError: PasetoError | null = null;

      try {
        throw new TokenValidationError('Test validation');
      } catch (error) {
        if (error instanceof PasetoError) {
          caughtError = error;
        }
      }

      expect(caughtError).not.toBeNull();
      expect(caughtError?.message).toBe('Test validation');
    });

    it('should support error type checking', () => {
      const errors: PasetoError[] = [
        new TokenValidationError('Test'),
        new TokenExpiredError(),
        new InvalidTokenPayloadError('Test'),
        new KeyConfigError('Test'),
      ];

      const expiredErrors = errors.filter(e => e instanceof TokenExpiredError);
      expect(expiredErrors).toHaveLength(1);

      const validationErrors = errors.filter(e => e instanceof TokenValidationError);
      expect(validationErrors).toHaveLength(1);
    });

    it('should work with Promise rejection', async () => {
      const failingPromise = Promise.reject(new TokenExpiredError());

      await expect(failingPromise).rejects.toThrow(TokenExpiredError);
      await expect(failingPromise).rejects.toThrow('Token has expired');
    });

    it('should serialize correctly', () => {
      const error = new TokenValidationError('Test message');
      const serialized = JSON.stringify({
        name: error.name,
        message: error.message,
        code: error.code,
      });

      expect(serialized).toBe('{"name":"TokenValidationError","message":"Test message","code":"TOKEN_VALIDATION_ERROR"}');
    });
  });

  describe('Error Property Access', () => {
    it('should allow accessing all error properties', () => {
      const error = new KeyConfigError('Configuration missing');

      expect(error.name).toBeDefined();
      expect(error.message).toBeDefined();
      expect(error.code).toBeDefined();
      expect(error.stack).toBeDefined();
    });

    it('should have writable message property', () => {
      const error = new TokenValidationError('Original message');
      error.message = 'Updated message';
      expect(error.message).toBe('Updated message');
    });

    it('should maintain prototype chain', () => {
      const error = new TokenExpiredError();
      expect(Object.getPrototypeOf(error)).toBe(TokenExpiredError.prototype);
      expect(Object.getPrototypeOf(Object.getPrototypeOf(error))).toBe(PasetoError.prototype);
    });
  });
});
