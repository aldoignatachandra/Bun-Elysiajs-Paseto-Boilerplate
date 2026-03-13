import { describe, it, expect } from 'bun:test';
import * as schema from '../../../../src/database/schema';

describe('Schema Index', () => {
  it('should export all tables', () => {
    expect(schema).toBeDefined();
    expect(typeof schema).toBe('object');
  });

  it('should export users table', () => {
    expect(schema.users).toBeDefined();
  });

  it('should export userSessions table', () => {
    expect(schema.userSessions).toBeDefined();
  });

  it('should export products table', () => {
    expect(schema.products).toBeDefined();
  });

  it('should export productAttributes table', () => {
    expect(schema.productAttributes).toBeDefined();
  });

  it('should export productVariants table', () => {
    expect(schema.productVariants).toBeDefined();
  });

  it('should export userActivityLogs table', () => {
    expect(schema.userActivityLogs).toBeDefined();
  });
});
