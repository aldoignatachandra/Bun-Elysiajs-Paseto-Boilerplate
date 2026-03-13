/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable @typescript-eslint/no-unsafe-call */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/no-unsafe-return */
/* eslint-disable @typescript-eslint/no-unused-vars */
/* eslint-disable @typescript-eslint/await-thenable */
/* eslint-disable @typescript-eslint/no-unsafe-argument */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
import { describe, it, expect, beforeEach, jest } from 'bun:test';
import { createProductsRoutes } from '../../../src/routes/products.routes';
import type { ProductsService } from '../../../src/services/products.service';
import type { AuthService } from '../../../src/services/auth.service';
import type { PasetoService } from '../../../src/core/paseto/paseto.service';

describe('ProductsRoutes', () => {
  let mockProductsService: any;
  let mockAuthService: any;
  let mockPasetoService: any;

  beforeEach(() => {
    mockProductsService = {
      list: jest.fn(),
      getById: jest.fn(),
    };

    mockAuthService = {};
    mockPasetoService = {};
  });

  describe('route creation', () => {
    it('should create products routes', () => {
      const mockApp = {
        group: jest.fn().mockReturnThis(),
      };

      const result = createProductsRoutes(
        mockApp as any,
        mockProductsService,
        mockAuthService as unknown as AuthService,
        mockPasetoService as unknown as PasetoService
      );

      expect(mockApp.group).toHaveBeenCalled();
      expect(result).toBeDefined();
    });
  });
});
