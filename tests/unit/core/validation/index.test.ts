/* eslint-disable @typescript-eslint/no-explicit-any */
import { describe, it, expect } from 'bun:test';
import * as validationModule from '@/core/validation';

describe('Core Validation Index', () => {
  describe('Barrel Exports', () => {
    it('should export all common schema validators', () => {
      expect(validationModule).toBeDefined();
      expect(typeof validationModule).toBe('object');
    });

    it('should export uuidSchema', () => {
      expect(validationModule.uuidSchema).toBeDefined();
    });

    it('should export emailSchema', () => {
      expect(validationModule.emailSchema).toBeDefined();
    });

    it('should export passwordSchema', () => {
      expect(validationModule.passwordSchema).toBeDefined();
    });

    it('should export simplePasswordSchema', () => {
      expect(validationModule.simplePasswordSchema).toBeDefined();
    });

    it('should export nameSchema', () => {
      expect(validationModule.nameSchema).toBeDefined();
    });

    it('should export optionalNameSchema', () => {
      expect(validationModule.optionalNameSchema).toBeDefined();
    });

    it('should export usernameSchema', () => {
      expect(validationModule.usernameSchema).toBeDefined();
    });

    it('should export optionalUsernameSchema', () => {
      expect(validationModule.optionalUsernameSchema).toBeDefined();
    });

    it('should export urlSchema', () => {
      expect(validationModule.urlSchema).toBeDefined();
    });

    it('should export optionalUrlSchema', () => {
      expect(validationModule.optionalUrlSchema).toBeDefined();
    });

    it('should export dateStringSchema', () => {
      expect(validationModule.dateStringSchema).toBeDefined();
    });

    it('should export optionalDateStringSchema', () => {
      expect(validationModule.optionalDateStringSchema).toBeDefined();
    });

    it('should export booleanStringSchema', () => {
      expect(validationModule.booleanStringSchema).toBeDefined();
    });

    it('should export paginationSchema', () => {
      expect(validationModule.paginationSchema).toBeDefined();
    });

    it('should export idListSchema', () => {
      expect(validationModule.idListSchema).toBeDefined();
    });

    it('should export searchQuerySchema', () => {
      expect(validationModule.searchQuerySchema).toBeDefined();
    });

    it('should export dateRangeSchema', () => {
      expect(validationModule.dateRangeSchema).toBeDefined();
    });
  });

  describe('Exported Functionality', () => {
    it('should validate UUID using exported schema', () => {
      const result = validationModule.uuidSchema.safeParse('123e4567-e89b-12d3-a456-426614174000');
      expect(result.success).toBe(true);
    });

    it('should reject invalid UUID using exported schema', () => {
      const result = validationModule.uuidSchema.safeParse('not-a-uuid');
      expect(result.success).toBe(false);
    });

    it('should validate email using exported schema', () => {
      const result = validationModule.emailSchema.safeParse('test@example.com');
      expect(result.success).toBe(true);
    });

    it('should reject invalid email using exported schema', () => {
      const result = validationModule.emailSchema.safeParse('not-an-email');
      expect(result.success).toBe(false);
    });

    it('should validate strong password using exported schema', () => {
      const result = validationModule.passwordSchema.safeParse('Password1!');
      expect(result.success).toBe(true);
    });

    it('should reject weak password using exported schema', () => {
      const result = validationModule.passwordSchema.safeParse('weak');
      expect(result.success).toBe(false);
    });

    it('should validate name using exported schema', () => {
      const result = validationModule.nameSchema.safeParse('John Doe');
      expect(result.success).toBe(true);
    });

    it('should trim name using exported schema', () => {
      const result = validationModule.nameSchema.safeParse('  John  ');
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data).toBe('John');
      }
    });

    it('should validate username using exported schema', () => {
      const result = validationModule.usernameSchema.safeParse('john_doe123');
      expect(result.success).toBe(true);
    });

    it('should validate URL using exported schema', () => {
      const result = validationModule.urlSchema.safeParse('https://example.com');
      expect(result.success).toBe(true);
    });

    it('should validate date string using exported schema', () => {
      const result = validationModule.dateStringSchema.safeParse('2024-01-01T00:00:00.000Z');
      expect(result.success).toBe(true);
    });

    it('should parse boolean string using exported schema', () => {
      const result = validationModule.booleanStringSchema.safeParse('true');
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data).toBe(true);
      }
    });

    it('should validate pagination using exported schema', () => {
      const result = validationModule.paginationSchema.safeParse({ page: 1, limit: 10 });
      expect(result.success).toBe(true);
    });

    it('should apply pagination defaults using exported schema', () => {
      const result = validationModule.paginationSchema.safeParse({});
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.page).toBe(1);
        expect(result.data.limit).toBe(20);
      }
    });

    it('should validate ID list using exported schema', () => {
      const result = validationModule.idListSchema.safeParse(['123e4567-e89b-12d3-a456-426614174000']);
      expect(result.success).toBe(true);
    });

    it('should validate search query using exported schema', () => {
      const result = validationModule.searchQuerySchema.safeParse({ q: 'test' });
      expect(result.success).toBe(true);
    });

    it('should validate date range using exported schema', () => {
      const result = validationModule.dateRangeSchema.safeParse({
        startDate: '2024-01-01T00:00:00.000Z',
        endDate: '2024-12-31T23:59:59.999Z',
      });
      expect(result.success).toBe(true);
    });
  });
});
