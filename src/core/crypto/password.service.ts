import argon2 from 'argon2';
import { logger } from '../logging/logger';
import type { Logger } from '../logging/types';

/**
 * Password hashing service using Argon2id
 *
 * This service provides secure password hashing and verification using the Argon2id algorithm,
 * which is the recommended variant for password hashing as it combines protection against
 * both side-channel and GPU-based attacks.
 *
 * Security parameters:
 * - type: argon2id (hybrid mode)
 * - memoryCost: 64 MB (65536 KB)
 * - timeCost: 3 iterations
 * - parallelism: 4 threads
 * - hashLength: 32 bytes (256 bits)
 *
 * @see https://www.rfc-editor.org/rfc/rfc9106.html
 */
export class PasswordService {
  private readonly options: argon2.Options;
  private readonly fallbackLogger: Logger = {
    debug: () => {},
    info: () => {},
    warn: () => {},
    error: (message: string, error?: unknown) => {
      console.error(message, error);
    },
    child: () => this.fallbackLogger,
  };

  constructor() {
    this.options = {
      type: argon2.argon2id,
      memoryCost: 65536, // 64 MB
      timeCost: 3, // 3 iterations
      parallelism: 4,
      hashLength: 32,
    };
  }

  /**
   * Hash a password using Argon2id
   *
   * @param password - The plain text password to hash
   * @returns A promise that resolves to the hashed password
   * @throws Error if hashing fails
   */
  async hash(password: string): Promise<string> {
    try {
      return await argon2.hash(password, this.options);
    } catch (error) {
      this.getLogger().error('Password hashing failed', error);
      throw new Error('Failed to hash password');
    }
  }

  /**
   * Verify a password against a hash
   *
   * @param hash - The hashed password to verify against
   * @param password - The plain text password to verify
   * @returns A promise that resolves to true if the password is correct, false otherwise
   */
  async verify(hash: string, password: string): Promise<boolean> {
    try {
      return await argon2.verify(hash, password);
    } catch (error) {
      this.getLogger().error('Password verification failed', error);
      return false;
    }
  }

  /**
   * Check if a hash needs to be rehashed with updated parameters
   *
   * This is a simplified version. In production, you would parse the hash
   * to extract the parameters and compare them with the current configuration.
   *
   * @param hash - The hashed password to check
   * @returns true if the hash needs rehashing, false otherwise
   */
  needsRehash(_hash: string): boolean {
    // Check if the hash uses current parameters
    // This is a simplified version - in production you'd parse the hash
    // to extract memory cost, time cost, and parallelism values
    return false;
  }

  /**
   * Get logger instance (lazy-loaded to avoid circular dependencies)
   */
  private getLogger(): Logger {
    return logger ?? this.fallbackLogger;
  }
}

/**
 * Singleton instance of the PasswordService
 */
export const passwordService = new PasswordService();
