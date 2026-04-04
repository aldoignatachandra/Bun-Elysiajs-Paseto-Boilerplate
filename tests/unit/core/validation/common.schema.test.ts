/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable @typescript-eslint/no-unused-vars */
/* eslint-disable @typescript-eslint/await-thenable */
/* eslint-disable @typescript-eslint/no-unsafe-argument */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
import { describe, it, expect } from 'bun:test';
import {
  uuidSchema,
  emailSchema,
  passwordSchema,
  simplePasswordSchema,
  nameSchema,
  optionalNameSchema,
  usernameSchema,
  urlSchema,
  dateStringSchema,
  booleanStringSchema,
  paginationSchema,
  idListSchema,
  searchQuerySchema,
  dateRangeSchema,
} from '../../../../src/core/validation/common.schema';

describe('Common Schema Validation', () => {
  describe('uuidSchema', () => {
    it('should validate correct UUID', () => {
      const result = uuidSchema.safeParse('123e4567-e89b-12d3-a456-426614174000');
      expect(result.success).toBe(true);
    });

    it('should reject invalid UUID', () => {
      const result = uuidSchema.safeParse('not-a-uuid');
      expect(result.success).toBe(false);
    });
  });

  describe('emailSchema', () => {
    it('should validate correct email', () => {
      const result = emailSchema.safeParse('test@example.com');
      expect(result.success).toBe(true);
    });

    it('should reject invalid email', () => {
      const result = emailSchema.safeParse('not-an-email');
      expect(result.success).toBe(false);
    });

    it('should reject empty email', () => {
      const result = emailSchema.safeParse('');
      expect(result.success).toBe(false);
    });

    it('should lowercase email', () => {
      const result = emailSchema.safeParse('TEST@EXAMPLE.COM');
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data).toBe('test@example.com');
      }
    });
  });

  describe('passwordSchema', () => {
    it('should validate strong password', () => {
      const result = passwordSchema.safeParse('Password1!');
      expect(result.success).toBe(true);
    });

    it('should reject weak password (too short)', () => {
      const result = passwordSchema.safeParse('Pass1!');
      expect(result.success).toBe(false);
    });

    it('should reject password without uppercase', () => {
      const result = passwordSchema.safeParse('password1!');
      expect(result.success).toBe(false);
    });

    it('should reject password without lowercase', () => {
      const result = passwordSchema.safeParse('PASSWORD1!');
      expect(result.success).toBe(false);
    });

    it('should reject password without number', () => {
      const result = passwordSchema.safeParse('Password!');
      expect(result.success).toBe(false);
    });

    it('should reject password without special character', () => {
      const result = passwordSchema.safeParse('Password1');
      expect(result.success).toBe(false);
    });
  });

  describe('simplePasswordSchema', () => {
    it('should validate simple password', () => {
      const result = simplePasswordSchema.safeParse('password');
      expect(result.success).toBe(true);
    });

    it('should reject short password', () => {
      const result = simplePasswordSchema.safeParse('pass');
      expect(result.success).toBe(false);
    });
  });

  describe('nameSchema', () => {
    it('should validate correct name', () => {
      const result = nameSchema.safeParse('John Doe');
      expect(result.success).toBe(true);
    });

    it('should reject empty name', () => {
      const result = nameSchema.safeParse('');
      expect(result.success).toBe(false);
    });

    it('should trim whitespace', () => {
      const result = nameSchema.safeParse('  John  ');
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data).toBe('John');
      }
    });
  });

  describe('optionalNameSchema', () => {
    it('should validate name', () => {
      const result = optionalNameSchema.safeParse('John');
      expect(result.success).toBe(true);
    });

    it('should allow null', () => {
      const result = optionalNameSchema.safeParse(null);
      expect(result.success).toBe(true);
    });

    it('should allow undefined', () => {
      const result = optionalNameSchema.safeParse(undefined);
      expect(result.success).toBe(true);
    });
  });

  describe('usernameSchema', () => {
    it('should validate correct username', () => {
      const result = usernameSchema.safeParse('john_doe123');
      expect(result.success).toBe(true);
    });

    it('should reject username with special characters', () => {
      const result = usernameSchema.safeParse('john@doe');
      expect(result.success).toBe(false);
    });

    it('should reject short username', () => {
      const result = usernameSchema.safeParse('ab');
      expect(result.success).toBe(false);
    });
  });

  describe('urlSchema', () => {
    it('should validate correct URL', () => {
      const result = urlSchema.safeParse('https://example.com');
      expect(result.success).toBe(true);
    });

    it('should reject invalid URL', () => {
      const result = urlSchema.safeParse('not-a-url');
      expect(result.success).toBe(false);
    });
  });

  describe('dateStringSchema', () => {
    it('should validate ISO date string', () => {
      const result = dateStringSchema.safeParse('2024-01-01T00:00:00.000Z');
      expect(result.success).toBe(true);
    });

    it('should reject invalid date string', () => {
      const result = dateStringSchema.safeParse('not-a-date');
      expect(result.success).toBe(false);
    });
  });

  describe('booleanStringSchema', () => {
    it('should parse true string', () => {
      const result = booleanStringSchema.safeParse('true');
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data).toBe(true);
      }
    });

    it('should parse false string', () => {
      const result = booleanStringSchema.safeParse('false');
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data).toBe(false);
      }
    });

    it('should parse boolean directly', () => {
      const result = booleanStringSchema.safeParse(true);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data).toBe(true);
      }
    });
  });

  describe('paginationSchema', () => {
    it('should validate correct pagination', () => {
      const result = paginationSchema.safeParse({ page: 1, limit: 10 });
      expect(result.success).toBe(true);
    });

    it('should apply defaults', () => {
      const result = paginationSchema.safeParse({});
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.page).toBe(1);
        expect(result.data.limit).toBe(20);
      }
    });

    it('should reject negative page', () => {
      const result = paginationSchema.safeParse({ page: -1, limit: 10 });
      expect(result.success).toBe(false);
    });

    it('should reject too high limit', () => {
      const result = paginationSchema.safeParse({ page: 1, limit: 200 });
      expect(result.success).toBe(false);
    });
  });

  describe('idListSchema', () => {
    it('should validate array of UUIDs', () => {
      const result = idListSchema.safeParse(['123e4567-e89b-12d3-a456-426614174000']);
      expect(result.success).toBe(true);
    });

    it('should reject empty array', () => {
      const result = idListSchema.safeParse([]);
      expect(result.success).toBe(false);
    });

    it('should reject invalid UUIDs', () => {
      const result = idListSchema.safeParse(['not-a-uuid']);
      expect(result.success).toBe(false);
    });
  });

  describe('searchQuerySchema', () => {
    it('should validate correct search query', () => {
      const result = searchQuerySchema.safeParse({ q: 'test query' });
      expect(result.success).toBe(true);
    });

    it('should reject empty query', () => {
      const result = searchQuerySchema.safeParse({ q: '' });
      expect(result.success).toBe(false);
    });

    it('should apply defaults', () => {
      const result = searchQuerySchema.safeParse({ q: 'test' });
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.page).toBe(1);
        expect(result.data.limit).toBe(20);
      }
    });
  });

  describe('dateRangeSchema', () => {
    it('should validate correct date range', () => {
      const result = dateRangeSchema.safeParse({
        startDate: '2024-01-01T00:00:00.000Z',
        endDate: '2024-12-31T23:59:59.999Z',
      });
      expect(result.success).toBe(true);
    });

    it('should allow optional dates', () => {
      const result = dateRangeSchema.safeParse({});
      expect(result.success).toBe(true);
    });
  });
});
