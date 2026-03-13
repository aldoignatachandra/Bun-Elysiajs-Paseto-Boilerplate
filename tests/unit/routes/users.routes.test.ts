/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable @typescript-eslint/no-unsafe-call */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/no-unsafe-return */
/* eslint-disable @typescript-eslint/no-unused-vars */
/* eslint-disable @typescript-eslint/await-thenable */
/* eslint-disable @typescript-eslint/no-unsafe-argument */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
import { describe, it, expect, beforeEach, jest } from 'bun:test';
import { createUsersRoutes } from '../../../src/routes/users.routes';
import type { UsersService } from '../../../src/services/users.service';
import type { AuthService } from '../../../src/services/auth.service';
import type { PasetoService } from '../../../src/core/paseto/paseto.service';

describe('UsersRoutes', () => {
  let mockUsersService: any;
  let mockAuthService: any;
  let mockPasetoService: any;

  beforeEach(() => {
    mockUsersService = {
      getProfile: jest.fn(),
      updateProfile: jest.fn(),
      getUsers: jest.fn(),
    };

    mockAuthService = {};
    mockPasetoService = {};
  });

  describe('route creation', () => {
    it('should create users routes', () => {
      const mockApp = {
        group: jest.fn().mockReturnThis(),
      };

      const result = createUsersRoutes(
        mockApp as any,
        mockUsersService,
        mockAuthService as unknown as AuthService,
        mockPasetoService as unknown as PasetoService
      );

      expect(mockApp.group).toHaveBeenCalled();
      expect(result).toBeDefined();
    });
  });
});
