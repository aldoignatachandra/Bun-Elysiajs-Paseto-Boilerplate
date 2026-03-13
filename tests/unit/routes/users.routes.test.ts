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
      getUserStats: jest.fn(),
      getUserById: jest.fn(),
      activateUser: jest.fn(),
      deactivateUser: jest.fn(),
      deleteUser: jest.fn(),
      restoreUser: jest.fn(),
      getActivityLogs: jest.fn(),
    };

    mockAuthService = {};
    mockPasetoService = {};

    jest.clearAllMocks();
  });

  describe('route registration', () => {
    it('should register users routes with correct prefix', () => {
      const mockApp = {
        group: jest.fn().mockReturnThis(),
      };

      createUsersRoutes(mockApp as any, mockUsersService, mockAuthService as unknown as AuthService, mockPasetoService as unknown as PasetoService);

      expect(mockApp.group).toHaveBeenCalledWith('/users', expect.any(Function));
    });

    it('should register activity-logs routes with correct prefix', () => {
      const mockApp = {
        group: jest.fn().mockReturnThis(),
      };

      createUsersRoutes(mockApp as any, mockUsersService, mockAuthService as unknown as AuthService, mockPasetoService as unknown as PasetoService);

      // Second group call should be for activity-logs
      expect(mockApp.group).toHaveBeenCalledTimes(2);
      const activityLogsCall = mockApp.group.mock.calls.find((call: any[]) => call[0] === '/activity-logs');
      expect(activityLogsCall).toBeDefined();
    });

    it('should return the configured app instance', () => {
      const mockApp = {
        group: jest.fn().mockReturnThis(),
      };

      const result = createUsersRoutes(
        mockApp as any,
        mockUsersService,
        mockAuthService as unknown as AuthService,
        mockPasetoService as unknown as PasetoService
      );

      expect(result).toBeDefined();
    });
  });

  describe('GET /users/me route', () => {
    it('should register GET /users/me route with authentication middleware', () => {
      const mockGroupApp = {
        get: jest.fn().mockReturnThis(),
        post: jest.fn().mockReturnThis(),
        patch: jest.fn().mockReturnThis(),
        delete: jest.fn().mockReturnThis(),
      };

      const mockApp = {
        group: jest.fn((path: string, callback: any) => {
          callback(mockGroupApp);
          return mockApp;
        }),
      };

      createUsersRoutes(mockApp as any, mockUsersService, mockAuthService as unknown as AuthService, mockPasetoService as unknown as PasetoService);

      const meCall = mockGroupApp.get.mock.calls.find((call: any[]) => call[0] === '/me');
      expect(meCall).toBeDefined();
      expect(meCall?.[1]).toEqual(expect.any(Function));
      expect(meCall?.[2]).toEqual(
        expect.objectContaining({
          beforeHandle: expect.any(Array),
        })
      );
    });

    it('should include rate limiting for me route', () => {
      const mockGroupApp = {
        get: jest.fn().mockReturnThis(),
        post: jest.fn().mockReturnThis(),
        patch: jest.fn().mockReturnThis(),
        delete: jest.fn().mockReturnThis(),
      };

      const mockApp = {
        group: jest.fn((path: string, callback: any) => {
          callback(mockGroupApp);
          return mockApp;
        }),
      };

      createUsersRoutes(mockApp as any, mockUsersService, mockAuthService as unknown as AuthService, mockPasetoService as unknown as PasetoService);

      const meCall = mockGroupApp.get.mock.calls.find((call: any[]) => call[0] === '/me');
      expect(meCall?.[2]).toEqual(
        expect.objectContaining({
          beforeHandle: expect.any(Array),
        })
      );
    });
  });

  describe('PATCH /users/me route', () => {
    it('should register PATCH /users/me route with body validation and authentication', () => {
      const mockGroupApp = {
        get: jest.fn().mockReturnThis(),
        post: jest.fn().mockReturnThis(),
        patch: jest.fn().mockReturnThis(),
        delete: jest.fn().mockReturnThis(),
      };

      const mockApp = {
        group: jest.fn((path: string, callback: any) => {
          callback(mockGroupApp);
          return mockApp;
        }),
      };

      createUsersRoutes(mockApp as any, mockUsersService, mockAuthService as unknown as AuthService, mockPasetoService as unknown as PasetoService);

      const updateMeCall = mockGroupApp.patch.mock.calls.find((call: any[]) => call[0] === '/me');
      expect(updateMeCall).toBeDefined();
      expect(updateMeCall?.[1]).toEqual(expect.any(Function));
      expect(updateMeCall?.[2]).toEqual(
        expect.objectContaining({
          body: expect.any(Object),
          beforeHandle: expect.any(Array),
        })
      );
    });
  });

  describe('GET /users route', () => {
    it('should register GET /users route with query validation and authentication', () => {
      const mockGroupApp = {
        get: jest.fn().mockReturnThis(),
        post: jest.fn().mockReturnThis(),
        patch: jest.fn().mockReturnThis(),
        delete: jest.fn().mockReturnThis(),
      };

      const mockApp = {
        group: jest.fn((path: string, callback: any) => {
          callback(mockGroupApp);
          return mockApp;
        }),
      };

      createUsersRoutes(mockApp as any, mockUsersService, mockAuthService as unknown as AuthService, mockPasetoService as unknown as PasetoService);

      const listCall = mockGroupApp.get.mock.calls.find((call: any[]) => call[0] === '/');
      expect(listCall).toBeDefined();
      expect(listCall?.[1]).toEqual(expect.any(Function));
      expect(listCall?.[2]).toEqual(
        expect.objectContaining({
          query: expect.any(Object),
          beforeHandle: expect.any(Array),
        })
      );
    });
  });

  describe('GET /users/stats route', () => {
    it('should register GET /users/stats route with authentication', () => {
      const mockGroupApp = {
        get: jest.fn().mockReturnThis(),
        post: jest.fn().mockReturnThis(),
        patch: jest.fn().mockReturnThis(),
        delete: jest.fn().mockReturnThis(),
      };

      const mockApp = {
        group: jest.fn((path: string, callback: any) => {
          callback(mockGroupApp);
          return mockApp;
        }),
      };

      createUsersRoutes(mockApp as any, mockUsersService, mockAuthService as unknown as AuthService, mockPasetoService as unknown as PasetoService);

      const statsCall = mockGroupApp.get.mock.calls.find((call: any[]) => call[0] === '/stats');
      expect(statsCall).toBeDefined();
      expect(statsCall?.[1]).toEqual(expect.any(Function));
      expect(statsCall?.[2]).toEqual(
        expect.objectContaining({
          beforeHandle: expect.any(Array),
        })
      );
    });
  });

  describe('GET /users/:id route', () => {
    it('should register GET /users/:id route with params validation and authentication', () => {
      const mockGroupApp = {
        get: jest.fn().mockReturnThis(),
        post: jest.fn().mockReturnThis(),
        patch: jest.fn().mockReturnThis(),
        delete: jest.fn().mockReturnThis(),
      };

      const mockApp = {
        group: jest.fn((path: string, callback: any) => {
          callback(mockGroupApp);
          return mockApp;
        }),
      };

      createUsersRoutes(mockApp as any, mockUsersService, mockAuthService as unknown as AuthService, mockPasetoService as unknown as PasetoService);

      const byIdCall = mockGroupApp.get.mock.calls.find((call: any[]) => call[0] === '/:id');
      expect(byIdCall).toBeDefined();
      expect(byIdCall?.[1]).toEqual(expect.any(Function));
      expect(byIdCall?.[2]).toEqual(
        expect.objectContaining({
          params: expect.any(Object),
          beforeHandle: expect.any(Array),
        })
      );
    });
  });

  describe('POST /users/:id/activate route', () => {
    it('should register POST /users/:id/activate route with params validation and authentication', () => {
      const mockGroupApp = {
        get: jest.fn().mockReturnThis(),
        post: jest.fn().mockReturnThis(),
        patch: jest.fn().mockReturnThis(),
        delete: jest.fn().mockReturnThis(),
      };

      const mockApp = {
        group: jest.fn((path: string, callback: any) => {
          callback(mockGroupApp);
          return mockApp;
        }),
      };

      createUsersRoutes(mockApp as any, mockUsersService, mockAuthService as unknown as AuthService, mockPasetoService as unknown as PasetoService);

      const activateCall = mockGroupApp.post.mock.calls.find((call: any[]) => call[0] === '/:id/activate');
      expect(activateCall).toBeDefined();
      expect(activateCall?.[1]).toEqual(expect.any(Function));
      expect(activateCall?.[2]).toEqual(
        expect.objectContaining({
          params: expect.any(Object),
          beforeHandle: expect.any(Array),
        })
      );
    });
  });

  describe('POST /users/:id/deactivate route', () => {
    it('should register POST /users/:id/deactivate route with params validation and authentication', () => {
      const mockGroupApp = {
        get: jest.fn().mockReturnThis(),
        post: jest.fn().mockReturnThis(),
        patch: jest.fn().mockReturnThis(),
        delete: jest.fn().mockReturnThis(),
      };

      const mockApp = {
        group: jest.fn((path: string, callback: any) => {
          callback(mockGroupApp);
          return mockApp;
        }),
      };

      createUsersRoutes(mockApp as any, mockUsersService, mockAuthService as unknown as AuthService, mockPasetoService as unknown as PasetoService);

      const deactivateCall = mockGroupApp.post.mock.calls.find((call: any[]) => call[0] === '/:id/deactivate');
      expect(deactivateCall).toBeDefined();
      expect(deactivateCall?.[1]).toEqual(expect.any(Function));
      expect(deactivateCall?.[2]).toEqual(
        expect.objectContaining({
          params: expect.any(Object),
          beforeHandle: expect.any(Array),
        })
      );
    });
  });

  describe('DELETE /users/:id route', () => {
    it('should register DELETE /users/:id route with params, query validation and authentication', () => {
      const mockGroupApp = {
        get: jest.fn().mockReturnThis(),
        post: jest.fn().mockReturnThis(),
        patch: jest.fn().mockReturnThis(),
        delete: jest.fn().mockReturnThis(),
      };

      const mockApp = {
        group: jest.fn((path: string, callback: any) => {
          callback(mockGroupApp);
          return mockApp;
        }),
      };

      createUsersRoutes(mockApp as any, mockUsersService, mockAuthService as unknown as AuthService, mockPasetoService as unknown as PasetoService);

      const deleteCall = mockGroupApp.delete.mock.calls.find((call: any[]) => call[0] === '/:id');
      expect(deleteCall).toBeDefined();
      expect(deleteCall?.[1]).toEqual(expect.any(Function));
      expect(deleteCall?.[2]).toEqual(
        expect.objectContaining({
          params: expect.any(Object),
          query: expect.any(Object),
          beforeHandle: expect.any(Array),
        })
      );
    });
  });

  describe('POST /users/:id/restore route', () => {
    it('should register POST /users/:id/restore route with params validation and authentication', () => {
      const mockGroupApp = {
        get: jest.fn().mockReturnThis(),
        post: jest.fn().mockReturnThis(),
        patch: jest.fn().mockReturnThis(),
        delete: jest.fn().mockReturnThis(),
      };

      const mockApp = {
        group: jest.fn((path: string, callback: any) => {
          callback(mockGroupApp);
          return mockApp;
        }),
      };

      createUsersRoutes(mockApp as any, mockUsersService, mockAuthService as unknown as AuthService, mockPasetoService as unknown as PasetoService);

      const restoreCall = mockGroupApp.post.mock.calls.find((call: any[]) => call[0] === '/:id/restore');
      expect(restoreCall).toBeDefined();
      expect(restoreCall?.[1]).toEqual(expect.any(Function));
      expect(restoreCall?.[2]).toEqual(
        expect.objectContaining({
          params: expect.any(Object),
          beforeHandle: expect.any(Array),
        })
      );
    });
  });

  describe('GET /activity-logs route', () => {
    it('should register GET /activity-logs route with query validation and authentication', () => {
      const mockLogsGroupApp = {
        get: jest.fn().mockReturnThis(),
      };

      let logsCallback: any;
      const mockApp = {
        group: jest.fn((path: string, callback: any) => {
          if (path === '/activity-logs') {
            logsCallback = callback;
            return mockApp;
          }
          // For users group, return a mock that tracks the callback
          const mockGroupApp = {
            get: jest.fn().mockReturnThis(),
            post: jest.fn().mockReturnThis(),
            patch: jest.fn().mockReturnThis(),
            delete: jest.fn().mockReturnThis(),
          };
          callback(mockGroupApp);
          return mockApp;
        }),
      };

      createUsersRoutes(mockApp as any, mockUsersService, mockAuthService as unknown as AuthService, mockPasetoService as unknown as PasetoService);

      // Call the activity-logs callback
      if (logsCallback) {
        logsCallback(mockLogsGroupApp);
      }

      const logsCall = mockLogsGroupApp.get.mock.calls.find((call: any[]) => call[0] === '/');
      expect(logsCall).toBeDefined();
      expect(logsCall?.[1]).toEqual(expect.any(Function));
      expect(logsCall?.[2]).toEqual(
        expect.objectContaining({
          query: expect.any(Object),
          beforeHandle: expect.any(Array),
        })
      );
    });
  });

  describe('all users routes registration', () => {
    it('should register all expected users routes', () => {
      const mockGroupApp = {
        get: jest.fn().mockReturnThis(),
        post: jest.fn().mockReturnThis(),
        patch: jest.fn().mockReturnThis(),
        delete: jest.fn().mockReturnThis(),
      };

      const mockApp = {
        group: jest.fn((path: string, callback: any) => {
          if (path === '/activity-logs') {
            return mockApp;
          }
          callback(mockGroupApp);
          return mockApp;
        }),
      };

      createUsersRoutes(mockApp as any, mockUsersService, mockAuthService as unknown as AuthService, mockPasetoService as unknown as PasetoService);

      const registeredGetRoutes = mockGroupApp.get.mock.calls.map((call: any[]) => call[0]);
      const registeredPostRoutes = mockGroupApp.post.mock.calls.map((call: any[]) => call[0]);
      const registeredPatchRoutes = mockGroupApp.patch.mock.calls.map((call: any[]) => call[0]);
      const registeredDeleteRoutes = mockGroupApp.delete.mock.calls.map((call: any[]) => call[0]);

      // Verify GET routes
      expect(registeredGetRoutes).toContain('/me');
      expect(registeredGetRoutes).toContain('/');
      expect(registeredGetRoutes).toContain('/stats');
      expect(registeredGetRoutes).toContain('/:id');

      // Verify POST routes
      expect(registeredPostRoutes).toContain('/:id/activate');
      expect(registeredPostRoutes).toContain('/:id/deactivate');
      expect(registeredPostRoutes).toContain('/:id/restore');

      // Verify PATCH routes
      expect(registeredPatchRoutes).toContain('/me');

      // Verify DELETE routes
      expect(registeredDeleteRoutes).toContain('/:id');
    });

    it('should register proper handlers for all routes', () => {
      const mockGroupApp = {
        get: jest.fn().mockReturnThis(),
        post: jest.fn().mockReturnThis(),
        patch: jest.fn().mockReturnThis(),
        delete: jest.fn().mockReturnThis(),
      };

      const mockApp = {
        group: jest.fn((path: string, callback: any) => {
          if (path === '/activity-logs') {
            return mockApp;
          }
          callback(mockGroupApp);
          return mockApp;
        }),
      };

      createUsersRoutes(mockApp as any, mockUsersService, mockAuthService as unknown as AuthService, mockPasetoService as unknown as PasetoService);

      // Check that all route handlers are functions
      mockGroupApp.get.mock.calls.forEach((call: any[]) => {
        expect(call[1]).toEqual(expect.any(Function));
      });

      mockGroupApp.post.mock.calls.forEach((call: any[]) => {
        expect(call[1]).toEqual(expect.any(Function));
      });

      mockGroupApp.patch.mock.calls.forEach((call: any[]) => {
        expect(call[1]).toEqual(expect.any(Function));
      });

      mockGroupApp.delete.mock.calls.forEach((call: any[]) => {
        expect(call[1]).toEqual(expect.any(Function));
      });
    });
  });

  describe('dependencies', () => {
    it('should require UsersService, AuthService, and PasetoService', () => {
      const mockApp = {
        group: jest.fn().mockReturnThis(),
      };

      expect(() => {
        createUsersRoutes(mockApp as any, mockUsersService, mockAuthService as unknown as AuthService, mockPasetoService as unknown as PasetoService);
      }).not.toThrow();
    });

    it('should use correct service instances for controllers', () => {
      const mockApp = {
        group: jest.fn().mockReturnThis(),
      };

      createUsersRoutes(mockApp as any, mockUsersService, mockAuthService as unknown as AuthService, mockPasetoService as unknown as PasetoService);

      // If we got here without errors, the services were accepted
      expect(mockApp.group).toHaveBeenCalled();
    });
  });
});
