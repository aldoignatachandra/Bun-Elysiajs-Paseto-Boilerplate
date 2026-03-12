/**
 * Authentication Service
 *
 * Core service for user authentication operations.
 * Handles registration, login, token refresh, logout, and token validation.
 *
 * Features:
 * - Password hashing with Argon2
 * - PASETO token generation (v4.local for access, v4.public for refresh)
 * - Session management with refresh tokens
 * - Secure token validation
 * - Activity logging
 *
 * @todo Add email verification flow
 * @todo Add password reset functionality
 * @todo Add multi-factor authentication support
 */

/* eslint-disable @typescript-eslint/no-unsafe-assignment */
/* eslint-disable @typescript-eslint/no-unsafe-call */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/no-unsafe-argument */
/* eslint-disable @typescript-eslint/no-unused-vars */

import type { TokenPayload } from '../core/paseto/token.types';
import type { PasetoService } from '../core/paseto/paseto.service';
import type { PasswordService } from '../core/crypto/password.service';
import type { UnitOfWork } from '../repositories/unit-of-work';
import type {
  IAuthService,
  RegisterInput,
  RegisterOutput,
  LoginInput,
  LoginOutput,
  RefreshTokenInput,
  RefreshTokenOutput,
  LogoutInput,
  ValidateAccessTokenInput,
  ValidateAccessTokenOutput,
} from './interfaces/auth.service.interface';
import { ConflictError, AuthenticationError, ForbiddenError, InvalidTokenError, TokenExpiredError, NotFoundError } from '../core/errors/app-error';
import { ActivityService, type LogActivityInput } from './activity.service';

export interface AuthActivityContext {
  ipAddress?: string;
  userAgent?: string;
}

/**
 * Authentication Service Implementation
 *
 * Uses lazy-loading for dependencies to avoid circular dependency issues.
 * All dependencies are loaded dynamically when needed.
 */
export class AuthService implements IAuthService {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private readonly unitOfWork: any;
  private readonly pasetoService: PasetoService;
  private readonly passwordService: PasswordService;
  private activityService: ActivityService | null = null;

  constructor(unitOfWork: unknown, pasetoService: PasetoService, passwordService: PasswordService) {
    this.unitOfWork = unitOfWork as UnitOfWork;
    this.pasetoService = pasetoService;
    this.passwordService = passwordService;
  }

  private getActivityService(): ActivityService {
    if (!this.activityService) {
      this.activityService = new ActivityService(this.unitOfWork);
    }
    return this.activityService;
  }

  private async logActivity(input: LogActivityInput): Promise<void> {
    try {
      await this.getActivityService().logActivity(input);
    } catch (error) {
      console.error('Failed to log activity:', error);
    }
  }

  /**
   * Register a new user
   *
   * Creates a new user account with hashed password and generates initial tokens.
   * Email must be unique. Password is hashed using Argon2 before storage.
   *
   * @param input - User registration data
   * @returns User data and authentication tokens
   * @throws ConflictError if email already exists
   */
  // eslint-disable-next-line @typescript-eslint/require-await, @typescript-eslint/no-unnecessary-type-assertion, @typescript-eslint/no-unsafe-return
  async register(input: RegisterInput, activityContext?: AuthActivityContext): Promise<RegisterOutput> {
    // eslint-disable-next-line @typescript-eslint/no-unsafe-return
    return this.unitOfWork.withTransaction(async (uow: UnitOfWork): Promise<RegisterOutput> => {
      const { ipAddress, userAgent } = activityContext || {};

      const existingUser = await uow.users.findByEmail(input.email);
      if (existingUser) {
        throw new ConflictError('User with this email already exists', {
          field: 'email',
          value: input.email,
        });
      }

      const existingUsername = await uow.users.findByUsername(input.username);
      if (existingUsername) {
        throw new ConflictError('User with this username already exists', {
          field: 'username',
          value: input.username,
        });
      }

      const passwordHash = await this.passwordService.hash(input.password);

      const newUser = {
        email: input.email,
        username: input.username,
        passwordHash,
        firstName: input.firstName,
        lastName: input.lastName,
        isActive: true,
        emailVerified: false,
      };

      const user = await uow.users.create(newUser);

      const tokens = this.pasetoService.createTokenPair({
        sub: user.id,
        email: user.email,
        role: 'user',
      });

      const refreshTokenPayload = this.pasetoService.validateRefreshToken(tokens.refreshToken);
      if (refreshTokenPayload.valid && refreshTokenPayload.payload) {
        const session = {
          userId: user.id,
          token: tokens.refreshToken,
          expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
        };
        await uow.sessions.create(session);
      }

      await uow.activityLogs.create({
        userId: user.id,
        action: 'user.registered',
        entity: 'users',
        entityId: user.id,
        ipAddress,
        userAgent,
        details: { email: user.email, username: user.username },
      });

      return {
        user: {
          id: user.id,
          email: user.email,
          name: user.name,
          role: user.role,
          createdAt: user.createdAt,
        },
        tokens,
      };
    });
  }

  /**
   * Authenticate user with email and password
   *
   * Verifies credentials and generates new token pair.
   * Implements SINGLE SESSION POLICY: Deletes ALL existing sessions before creating new one.
   * Uses transaction for user + session + activity operations.
   *
   * @param input - Login credentials
   * @returns User data and authentication tokens
   * @throws AuthenticationError if credentials are invalid
   * @throws ForbiddenError if user account is inactive
   */
  // eslint-disable-next-line @typescript-eslint/require-await, @typescript-eslint/no-unnecessary-type-assertion, @typescript-eslint/no-unsafe-return
  async login(input: LoginInput, activityContext?: AuthActivityContext): Promise<LoginOutput> {
    // eslint-disable-next-line @typescript-eslint/no-unsafe-return
    return this.unitOfWork.withTransaction(async (uow: UnitOfWork): Promise<LoginOutput> => {
      const { ipAddress, userAgent } = activityContext || {};

      const user = await uow.users.findByEmail(input.email);
      if (!user) {
        throw new AuthenticationError('Invalid email or password');
      }

      if (user.deletedAt) {
        throw new ForbiddenError('User account is inactive. Please contact support.');
      }

      const isPasswordValid = await this.passwordService.verify(user.passwordHash, input.password);
      if (!isPasswordValid) {
        throw new AuthenticationError('Invalid email or password');
      }

      await uow.users.update(user.id, {
        lastLoginAt: new Date(),
      });

      await uow.sessions.deleteByUserId(user.id);

      const tokens = this.pasetoService.createTokenPair({
        sub: user.id,
        email: user.email,
        role: user.role,
      });

      const refreshTokenPayload = this.pasetoService.validateRefreshToken(tokens.refreshToken);
      if (refreshTokenPayload.valid && refreshTokenPayload.payload) {
        const session = {
          userId: user.id,
          token: tokens.refreshToken,
          expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
        };
        await uow.sessions.create(session);
      }

      await uow.activityLogs.create({
        userId: user.id,
        action: 'user.logged_in',
        entity: 'sessions',
        ipAddress,
        userAgent,
        details: { email: user.email },
      });

      return {
        user: {
          id: user.id,
          email: user.email,
          name: user.name,
          role: user.role,
          lastLoginAt: user.lastLoginAt,
        },
        tokens,
      };
    });
  }

  /**
   * Refresh access token using refresh token
   *
   * Validates refresh token, checks session exists and is not revoked,
   * and generates new token pair.
   *
   * @param input - Refresh token
   * @returns New token pair
   * @throws InvalidTokenError if refresh token is invalid
   * @throws TokenExpiredError if refresh token has expired
   * @throws NotFoundError if session is not found or revoked
   */
  async refreshToken(input: RefreshTokenInput): Promise<RefreshTokenOutput> {
    const result = this.pasetoService.validateRefreshToken(input.refreshToken);
    if (!result.valid || !result.payload) {
      throw new InvalidTokenError('Invalid refresh token');
    }

    const payload = result.payload as TokenPayload & { tokenId: string };

    const session = await this.unitOfWork.sessions.findByTokenId(payload.tokenId);
    if (!session) {
      throw new NotFoundError('Session not found or has been revoked');
    }

    if (session.revokedAt) {
      throw new InvalidTokenError('Refresh token has been revoked');
    }

    if (session.expiresAt < new Date()) {
      throw new TokenExpiredError('Refresh token session has expired');
    }

    const user = await this.unitOfWork.users.findById(session.userId);
    if (!user || user.deletedAt) {
      throw new ForbiddenError('User account is inactive or does not exist');
    }

    const tokens = this.pasetoService.createTokenPair({
      sub: user.id,
      email: user.email,
      role: user.role,
    });

    const newRefreshTokenPayload = this.pasetoService.validateRefreshToken(tokens.refreshToken);
    if (newRefreshTokenPayload.valid && newRefreshTokenPayload.payload) {
      const newSession = {
        userId: user.id,
        token: tokens.refreshToken,
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      };
      await this.unitOfWork.sessions.create(newSession);
      await this.unitOfWork.sessions.revoke(session.id);
    }

    return { tokens };
  }

  /**
   * Logout user and revoke session
   *
   * Revokes the refresh token session, preventing further token refreshes.
   * Access tokens will still be valid until they expire naturally.
   *
   * @param input - User ID and token ID
   * @throws NotFoundError if session is not found
   */
  async logout(input: LogoutInput, activityContext?: AuthActivityContext): Promise<void> {
    const { ipAddress, userAgent } = activityContext || {};

    const session = await this.unitOfWork.sessions.findByTokenId(input.tokenId);
    if (!session) {
      throw new NotFoundError('Session not found');
    }

    if (session.userId !== input.userId) {
      throw new InvalidTokenError('Session does not belong to user');
    }

    await this.unitOfWork.sessions.revoke(session.id);

    await this.logActivity({
      userId: input.userId,
      action: 'user.logged_out',
      entity: 'sessions',
      ipAddress,
      userAgent,
    });
  }

  /**
   * Validate an access token
   *
   * Decrypts and validates the access token signature and expiration.
   * Returns user ID and payload if valid.
   *
   * @param input - Access token
   * @returns Validation result with user data if valid
   */
  // eslint-disable-next-line @typescript-eslint/require-await
  async validateAccessToken(input: ValidateAccessTokenInput): Promise<ValidateAccessTokenOutput> {
    try {
      const result = this.pasetoService.validateAccessToken(input.token);

      if (!result.valid || !result.payload) {
        return {
          valid: false,
          userId: null,
          payload: null,
          error: result.error || 'Token validation failed',
        };
      }

      return {
        valid: true,
        userId: result.payload.sub,
        payload: result.payload,
      };
    } catch (error) {
      return {
        valid: false,
        userId: null,
        payload: null,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }
}
