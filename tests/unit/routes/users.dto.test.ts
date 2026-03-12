import { describe, it, expect } from 'bun:test';
import {
  updateProfileSchema,
  getUsersQuerySchema,
  activityQuerySchema,
  userIdParamSchema,
  deleteUserQuerySchema,
  updatePasswordSchema,
  createUserSchema,
  updateUserSchema,
} from '../../../src/routes/dto/users.dto';

describe('Users DTO Validation', () => {
  describe('updateProfileSchema', () => {
    it('should validate valid update data', () => {
      const validData = {
        firstName: 'John',
        lastName: 'Doe',
        username: 'johndoe',
      };

      const result = updateProfileSchema.safeParse(validData);

      expect(result.success).toBe(true);
    });

    it('should validate with partial data', () => {
      const validData = {
        username: 'johndoe',
      };

      const result = updateProfileSchema.safeParse(validData);

      expect(result.success).toBe(true);
    });

    it('should reject invalid username', () => {
      const invalidData = {
        username: 'john!',
      };

      const result = updateProfileSchema.safeParse(invalidData);

      expect(result.success).toBe(false);
    });

    it('should reject empty string username', () => {
      const invalidData = {
        username: '',
      };

      const result = updateProfileSchema.safeParse(invalidData);

      expect(result.success).toBe(false);
    });
  });

  describe('getUsersQuerySchema', () => {
    it('should validate default pagination', () => {
      const validData = {};

      const result = getUsersQuerySchema.safeParse(validData);

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.page).toBe(1);
        expect(result.data.limit).toBe(20);
      }
    });

    it('should validate with search', () => {
      const validData = {
        search: 'john',
      };

      const result = getUsersQuerySchema.safeParse(validData);

      expect(result.success).toBe(true);
    });

    it('should validate with include_deleted', () => {
      const validData = {
        include_deleted: 'true',
      };

      const result = getUsersQuerySchema.safeParse(validData);

      expect(result.success).toBe(true);
    });

    it('should validate with all query params', () => {
      const validData = {
        page: 2,
        limit: 50,
        search: 'test',
        include_deleted: 'false',
        only_deleted: 'false',
      };

      const result = getUsersQuerySchema.safeParse(validData);

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.page).toBe(2);
        expect(result.data.limit).toBe(50);
      }
    });

    it('should reject invalid page number', () => {
      const invalidData = {
        page: -1,
      };

      const result = getUsersQuerySchema.safeParse(invalidData);

      expect(result.success).toBe(false);
    });
  });

  describe('activityQuerySchema', () => {
    it('should validate default pagination', () => {
      const validData = {};

      const result = activityQuerySchema.safeParse(validData);

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.page).toBe(1);
        expect(result.data.limit).toBe(10);
      }
    });

    it('should validate with filters', () => {
      const validData = {
        page: 1,
        limit: 20,
        user_id: '123e4567-e89b-12d3-a456-426614174000',
        action: 'user.registered',
        resource: 'users',
      };

      const result = activityQuerySchema.safeParse(validData);

      expect(result.success).toBe(true);
    });

    it('should reject invalid UUID', () => {
      const invalidData = {
        user_id: 'invalid-uuid',
      };

      const result = activityQuerySchema.safeParse(invalidData);

      expect(result.success).toBe(false);
    });

    it('should reject limit > 100', () => {
      const invalidData = {
        limit: 200,
      };

      const result = activityQuerySchema.safeParse(invalidData);

      expect(result.success).toBe(false);
    });
  });

  describe('userIdParamSchema', () => {
    it('should validate valid UUID', () => {
      const validData = {
        id: '123e4567-e89b-12d3-a456-426614174000',
      };

      const result = userIdParamSchema.safeParse(validData);

      expect(result.success).toBe(true);
    });

    it('should reject invalid UUID', () => {
      const invalidData = {
        id: 'not-a-uuid',
      };

      const result = userIdParamSchema.safeParse(invalidData);

      expect(result.success).toBe(false);
    });
  });

  describe('deleteUserQuerySchema', () => {
    it('should validate without force flag', () => {
      const validData = {};

      const result = deleteUserQuerySchema.safeParse(validData);

      expect(result.success).toBe(true);
    });

    it('should validate with force flag', () => {
      const validData = {
        force: 'true',
      };

      const result = deleteUserQuerySchema.safeParse(validData);

      expect(result.success).toBe(true);
    });
  });

  describe('updatePasswordSchema', () => {
    it('should validate valid password update', () => {
      const validData = {
        currentPassword: 'OldPassword123!',
        newPassword: 'NewPassword123!',
      };

      const result = updatePasswordSchema.safeParse(validData);

      expect(result.success).toBe(true);
    });

    it('should reject weak new password', () => {
      const invalidData = {
        currentPassword: 'OldPassword123!',
        newPassword: 'weak',
      };

      const result = updatePasswordSchema.safeParse(invalidData);

      expect(result.success).toBe(false);
    });

    it('should reject missing current password', () => {
      const invalidData = {
        newPassword: 'NewPassword123!',
      };

      const result = updatePasswordSchema.safeParse(invalidData);

      expect(result.success).toBe(false);
    });

    it('should reject missing new password', () => {
      const invalidData = {
        currentPassword: 'OldPassword123!',
      };

      const result = updatePasswordSchema.safeParse(invalidData);

      expect(result.success).toBe(false);
    });
  });

  describe('createUserSchema', () => {
    it('should validate valid user creation data', () => {
      const validData = {
        email: 'newuser@example.com',
        username: 'newuser',
        password: 'Password123!',
        firstName: 'John',
        lastName: 'Doe',
      };

      const result = createUserSchema.safeParse(validData);

      expect(result.success).toBe(true);
    });

    it('should validate optional boolean fields', () => {
      const validData = {
        email: 'newuser@example.com',
        username: 'newuser',
        password: 'Password123!',
        firstName: 'John',
        lastName: 'Doe',
        isActive: true,
        emailVerified: false,
      };

      const result = createUserSchema.safeParse(validData);

      expect(result.success).toBe(true);
    });

    it('should reject duplicate email format', () => {
      const invalidData = {
        email: 'invalid-email',
        username: 'newuser',
        password: 'Password123!',
        firstName: 'John',
        lastName: 'Doe',
      };

      const result = createUserSchema.safeParse(invalidData);

      expect(result.success).toBe(false);
    });
  });

  describe('updateUserSchema', () => {
    it('should validate with partial data', () => {
      const validData = {
        email: 'updated@example.com',
      };

      const result = updateUserSchema.safeParse(validData);

      expect(result.success).toBe(true);
    });

    it('should validate with multiple fields', () => {
      const validData = {
        email: 'updated@example.com',
        username: 'updateduser',
        firstName: 'Jane',
        lastName: 'Smith',
        isActive: false,
        emailVerified: true,
      };

      const result = updateUserSchema.safeParse(validData);

      expect(result.success).toBe(true);
    });

    it('should reject invalid email format', () => {
      const invalidData = {
        email: 'invalid-email',
      };

      const result = updateUserSchema.safeParse(invalidData);

      expect(result.success).toBe(false);
    });
  });
});
