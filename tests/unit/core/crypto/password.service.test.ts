import { describe, it, expect } from 'bun:test';
import { PasswordService } from '@/core/crypto/password.service';

describe('PasswordService', () => {
  const passwordService = new PasswordService();

  it('should hash a password', async () => {
    const password = 'TestPassword123!';
    const hash = await passwordService.hash(password);

    expect(hash).toBeDefined();
    expect(typeof hash).toBe('string');
    expect(hash).not.toBe(password);
  });

  it('should verify a correct password', async () => {
    const password = 'TestPassword123!';
    const hash = await passwordService.hash(password);
    const isValid = await passwordService.verify(hash, password);

    expect(isValid).toBe(true);
  });

  it('should reject an incorrect password', async () => {
    const password = 'TestPassword123!';
    const wrongPassword = 'WrongPassword456!';
    const hash = await passwordService.hash(password);
    const isValid = await passwordService.verify(hash, wrongPassword);

    expect(isValid).toBe(false);
  });

  it('should generate different hashes for same password', async () => {
    const password = 'TestPassword123!';
    const hash1 = await passwordService.hash(password);
    const hash2 = await passwordService.hash(password);

    expect(hash1).not.toBe(hash2);
  });

  it('should handle empty password', async () => {
    const password = '';
    const hash = await passwordService.hash(password);

    expect(hash).toBeDefined();
    expect(typeof hash).toBe('string');
  });

  it('should handle special characters in password', async () => {
    const password = '!@#$%^&*()_+-=[]{}|;:,.<>?~`';
    const hash = await passwordService.hash(password);
    const isValid = await passwordService.verify(hash, password);

    expect(isValid).toBe(true);
  });

  it('should handle unicode characters in password', async () => {
    const password = '🔐🔑密码🔒';
    const hash = await passwordService.hash(password);
    const isValid = await passwordService.verify(hash, password);

    expect(isValid).toBe(true);
  });

  it('should return false for invalid hash format', async () => {
    const password = 'TestPassword123!';
    const invalidHash = 'invalid-hash-format';
    const isValid = await passwordService.verify(invalidHash, password);

    expect(isValid).toBe(false);
  });

  it('should handle very long passwords', async () => {
    const password = 'a'.repeat(1000);
    const hash = await passwordService.hash(password);
    const isValid = await passwordService.verify(hash, password);

    expect(isValid).toBe(true);
  });

  it('should check if hash needs rehash', () => {
    const hash = '$argon2id$v=19$m=65536,t=3,p=4$test$test';
    const needsRehash = passwordService.needsRehash(hash);

    expect(typeof needsRehash).toBe('boolean');
  });
});
