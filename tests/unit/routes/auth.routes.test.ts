/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable @typescript-eslint/no-unsafe-call */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/no-unsafe-return */
/* eslint-disable @typescript-eslint/no-unused-vars */
/* eslint-disable @typescript-eslint/await-thenable */
/* eslint-disable @typescript-eslint/no-unsafe-argument */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
import { describe, it, expect, beforeEach, jest } from 'bun:test';
import { createAuthRoutes } from '../../../src/routes/auth.routes';
import type { AuthService } from '../../../src/services/auth.service';
import type { UsersService } from '../../../src/services/users.service';
import type { PasetoService } from '../../../src/core/paseto/paseto.service';

describe('AuthRoutes', () => {
  let mockAuthService: any;
  let mockUsersService: any;
  let mockPasetoService: any;

  beforeEach(() => {
    mockAuthService = {
      register: jest.fn(),
      login: jest.fn(),
      refreshToken: jest.fn(),
      logout: jest.fn(),
      validateAccessToken: jest.fn(),
    };

    mockUsersService = {
      updatePassword: jest.fn(),
    };

    mockPasetoService = {};
  });

  describe('route creation', () => {
    it('should create auth routes', () => {
      const mockApp = {
        group: jest.fn().mockReturnThis(),
      };

      const result = createAuthRoutes(mockApp as any, mockAuthService, mockUsersService, mockPasetoService);

      expect(mockApp.group).toHaveBeenCalled();
      expect(result).toBeDefined();
    });
  });
});
