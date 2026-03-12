import { describe, it, expect } from 'bun:test';
import { registerRequestSchema, loginRequestSchema, refreshRequestSchema, changePasswordRequestSchema } from '../../../src/routes/dto/auth.dto';

describe('Auth DTO Validation', () => {
  describe('registerRequestSchema', () => {
    it('should validate valid registration data', () => {
      const validData = {
        email: 'test@example.com',
        username: 'testuser',
        password: 'Password123!',
        firstName: 'John',
        lastName: 'Doe',
      };

      const result = registerRequestSchema.safeParse(validData);

      expect(result.success).toBe(true);
    });

    it('should validate registration with name instead of firstName/lastName', () => {
      const validData = {
        email: 'test@example.com',
        username: 'testuser',
        password: 'Password123!',
        name: 'John Doe',
      };

      const result = registerRequestSchema.safeParse(validData);

      expect(result.success).toBe(true);
    });

    it('should reject invalid email', () => {
      const invalidData = {
        email: 'invalid-email',
        username: 'testuser',
        password: 'Password123!',
        firstName: 'John',
        lastName: 'Doe',
      };

      const result = registerRequestSchema.safeParse(invalidData);

      expect(result.success).toBe(false);
    });

    it('should reject weak password', () => {
      const invalidData = {
        email: 'test@example.com',
        username: 'testuser',
        password: 'weak',
        firstName: 'John',
        lastName: 'Doe',
      };

      const result = registerRequestSchema.safeParse(invalidData);

      expect(result.success).toBe(false);
    });

    it('should reject username with special characters', () => {
      const invalidData = {
        email: 'test@example.com',
        username: 'test-user!',
        password: 'Password123!',
        firstName: 'John',
        lastName: 'Doe',
      };

      const result = registerRequestSchema.safeParse(invalidData);

      expect(result.success).toBe(false);
    });

    it('should reject missing required fields', () => {
      const invalidData = {
        email: 'test@example.com',
      };

      const result = registerRequestSchema.safeParse(invalidData);

      expect(result.success).toBe(false);
    });

    it('should reject missing name information', () => {
      const invalidData = {
        email: 'test@example.com',
        username: 'testuser',
        password: 'Password123!',
      };

      const result = registerRequestSchema.safeParse(invalidData);

      expect(result.success).toBe(false);
    });

    it('should reject too short username', () => {
      const invalidData = {
        email: 'test@example.com',
        username: 'ab',
        password: 'Password123!',
        firstName: 'John',
        lastName: 'Doe',
      };

      const result = registerRequestSchema.safeParse(invalidData);

      expect(result.success).toBe(false);
    });

    it('should reject too long email', () => {
      const longEmail = 'a'.repeat(250) + '@example.com';
      const invalidData = {
        email: longEmail,
        username: 'testuser',
        password: 'Password123!',
        firstName: 'John',
        lastName: 'Doe',
      };

      const result = registerRequestSchema.safeParse(invalidData);

      expect(result.success).toBe(false);
    });
  });

  describe('loginRequestSchema', () => {
    it('should validate valid login data', () => {
      const validData = {
        email: 'test@example.com',
        password: 'password123',
      };

      const result = loginRequestSchema.safeParse(validData);

      expect(result.success).toBe(true);
    });

    it('should reject missing email', () => {
      const invalidData = {
        password: 'password123',
      };

      const result = loginRequestSchema.safeParse(invalidData);

      expect(result.success).toBe(false);
    });

    it('should reject missing password', () => {
      const invalidData = {
        email: 'test@example.com',
      };

      const result = loginRequestSchema.safeParse(invalidData);

      expect(result.success).toBe(false);
    });

    it('should reject empty password', () => {
      const invalidData = {
        email: 'test@example.com',
        password: '',
      };

      const result = loginRequestSchema.safeParse(invalidData);

      expect(result.success).toBe(false);
    });
  });

  describe('refreshRequestSchema', () => {
    it('should validate with token field', () => {
      const validData = {
        token: 'some_token',
      };

      const result = refreshRequestSchema.safeParse(validData);

      expect(result.success).toBe(true);
    });

    it('should validate with refreshToken field', () => {
      const validData = {
        refreshToken: 'some_refresh_token',
      };

      const result = refreshRequestSchema.safeParse(validData);

      expect(result.success).toBe(true);
    });

    it('should reject when both fields are missing', () => {
      const invalidData = {};

      const result = refreshRequestSchema.safeParse(invalidData);

      expect(result.success).toBe(false);
    });

    it('should reject when both fields are empty', () => {
      const invalidData = {
        token: '',
        refreshToken: '',
      };

      const result = refreshRequestSchema.safeParse(invalidData);

      expect(result.success).toBe(false);
    });
  });

  describe('changePasswordRequestSchema', () => {
    it('should validate with old_password and new_password', () => {
      const validData = {
        old_password: 'oldpassword123!',
        new_password: 'newpassword123!',
      };

      const result = changePasswordRequestSchema.safeParse(validData);

      expect(result.success).toBe(true);
    });

    it('should validate with currentPassword and newPassword', () => {
      const validData = {
        currentPassword: 'oldpassword123!',
        newPassword: 'newpassword123!',
      };

      const result = changePasswordRequestSchema.safeParse(validData);

      expect(result.success).toBe(true);
    });

    it('should reject when old_password is missing', () => {
      const invalidData = {
        new_password: 'newpassword123!',
      };

      const result = changePasswordRequestSchema.safeParse(invalidData);

      expect(result.success).toBe(false);
    });

    it('should reject when new_password is missing', () => {
      const invalidData = {
        old_password: 'oldpassword123!',
      };

      const result = changePasswordRequestSchema.safeParse(invalidData);

      expect(result.success).toBe(false);
    });

    it('should reject when both old_password and currentPassword are missing', () => {
      const invalidData = {
        new_password: 'newpassword123!',
      };

      const result = changePasswordRequestSchema.safeParse(invalidData);

      expect(result.success).toBe(false);
    });
  });
});
