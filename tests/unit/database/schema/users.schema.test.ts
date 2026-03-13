import { describe, it, expect } from 'bun:test';
import { users, type User, type NewUser } from '../../../../src/database/schema/users.schema';

describe('Users Schema', () => {
  describe('users table', () => {
    it('should export the users table', () => {
      expect(users).toBeDefined();
      expect(typeof users).toBe('object');
    });

    it('should have id column', () => {
      expect(users).toHaveProperty('id');
    });

    it('should have email column', () => {
      expect(users).toHaveProperty('email');
    });

    it('should have username column', () => {
      expect(users).toHaveProperty('username');
    });

    it('should have name column', () => {
      expect(users).toHaveProperty('name');
    });

    it('should have passwordHash column', () => {
      expect(users).toHaveProperty('passwordHash');
    });

    it('should have role column', () => {
      expect(users).toHaveProperty('role');
    });

    it('should have lastLoginAt column', () => {
      expect(users).toHaveProperty('lastLoginAt');
    });

    it('should have deletedAt column', () => {
      expect(users).toHaveProperty('deletedAt');
    });

    it('should have createdAt column', () => {
      expect(users).toHaveProperty('createdAt');
    });

    it('should have updatedAt column', () => {
      expect(users).toHaveProperty('updatedAt');
    });
  });

  describe('User type', () => {
    it('should export User type', () => {
      const userType: User = {
        id: '123e4567-e89b-12d3-a456-426614174000',
        email: 'test@example.com',
        username: 'testuser',
        name: 'Test User',
        passwordHash: 'hashed_password',
        role: 'USER',
        lastLoginAt: new Date(),
        deletedAt: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      expect(userType).toBeDefined();
      expect(userType.id).toBe('123e4567-e89b-12d3-a456-426614174000');
      expect(userType.email).toBe('test@example.com');
      expect(userType.username).toBe('testuser');
    });
  });

  describe('NewUser type', () => {
    it('should export NewUser type', () => {
      const newUser: NewUser = {
        email: 'new@example.com',
        username: 'newuser',
        name: 'New User',
        passwordHash: 'hashed_password',
        role: 'USER',
      };

      expect(newUser).toBeDefined();
      expect(newUser.email).toBe('new@example.com');
      expect(newUser.username).toBe('newuser');
    });
  });

  describe('Column structure', () => {
    it('should have all required columns', () => {
      const columns = Object.keys(users);
      expect(columns).toContain('id');
      expect(columns).toContain('email');
      expect(columns).toContain('username');
      expect(columns).toContain('passwordHash');
      expect(columns).toContain('role');
      expect(columns).toContain('createdAt');
      expect(columns).toContain('updatedAt');
    });
  });
});
