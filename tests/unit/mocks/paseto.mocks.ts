import { vi } from 'bun:test';

export interface MockTokenPayload {
  userId: string;
  email: string;
  role: string;
  type: 'access' | 'refresh';
  iat?: number;
  exp?: number;
}

export class MockPasetoService {
  private _secretKey = 'mock-secret-key-for-testing';
  private tokens: Map<string, MockTokenPayload> = new Map();

  generateAccessToken = vi.fn(async (payload: Omit<MockTokenPayload, 'type' | 'iat' | 'exp'>) => {
    const tokenPayload: MockTokenPayload = {
      ...payload,
      type: 'access',
      iat: Date.now(),
      exp: Date.now() + 15 * 60 * 1000,
    };
    const token = this.encodeToken(tokenPayload);
    this.tokens.set(token, tokenPayload);
    return token;
  });

  generateRefreshToken = vi.fn(async (payload: Omit<MockTokenPayload, 'type' | 'iat' | 'exp'>) => {
    const tokenPayload: MockTokenPayload = {
      ...payload,
      type: 'refresh',
      iat: Date.now(),
      exp: Date.now() + 7 * 24 * 60 * 60 * 1000,
    };
    const token = this.encodeToken(tokenPayload);
    this.tokens.set(token, tokenPayload);
    return token;
  });

  verifyToken = vi.fn(async (token: string) => {
    const payload = this.tokens.get(token);
    if (!payload) {
      throw new Error('Invalid token');
    }
    if (payload.exp && payload.exp < Date.now()) {
      this.tokens.delete(token);
      throw new Error('Token expired');
    }
    return payload;
  });

  invalidateToken = vi.fn(async (token: string) => {
    this.tokens.delete(token);
  });

  private encodeToken(payload: MockTokenPayload): string {
    const data = Buffer.from(JSON.stringify(payload)).toString('base64');
    return `v4.local.${data}.mocksignature`;
  }

  // Helper for testing
  _clear() {
    this.tokens.clear();
  }
}

export function createMockPasetoService(): MockPasetoService {
  return new MockPasetoService();
}

export const mockValidUserId = '123e4567-e89b-12d3-a456-426614174000';
export const mockTestUser = {
  id: mockValidUserId,
  email: 'test@example.com',
  role: 'user',
};

export const mockAdminUser = {
  id: '987fcdeb-51a2-43f1-a456-426614174000',
  email: 'admin@example.com',
  role: 'admin',
};
