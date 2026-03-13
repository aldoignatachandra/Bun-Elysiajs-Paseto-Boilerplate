/* eslint-disable @typescript-eslint/no-explicit-any */
import { describe, it, expect } from 'bun:test';

describe('Health Plugin', () => {
  describe('healthPlugin', () => {
    it('should export healthPlugin function', async () => {
      const { healthPlugin } = await import('../../../src/plugins/health.plugin');
      expect(typeof healthPlugin).toBe('function');
    });
  });
});
