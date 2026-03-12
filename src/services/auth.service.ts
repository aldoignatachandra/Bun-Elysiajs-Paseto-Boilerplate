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

  constructor(unitOfWork: unknown, pasetoService: PasetoService, passwordService: PasswordService) {
    this.unitOfWork = unitOfWork as UnitOfWork;
    this.pasetoService = pasetoService;
    this.passwordService = passwordService;
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
  async register(input: RegisterInput): Promise<RegisterOutput> {
    // Check if user with email already exists
    const existingUser = await this.unitOfWork.users.findByEmail(input.email);
    if (existingUser) {
      throw new ConflictError('User with this email already exists', {
        field: 'email',
        value: input.email,
      });
    }

    // Hash password
    const passwordHash = await this.passwordService.hash(input.password);

    // Create user
    const newUser = {
      email: input.email,
      passwordHash,
      firstName: input.firstName,
      lastName: input.lastName,
      isActive: true,
      emailVerified: false,
    };

    const user = await this.unitOfWork.users.create(newUser);

    // Generate tokens
    const tokens = this.pasetoService.createTokenPair({
      sub: user.id,
      email: user.email,
      role: 'user',
    });

    // Store refresh token session
    const refreshTokenPayload = this.pasetoService.validateRefreshToken(tokens.refreshToken);
    if (refreshTokenPayload.valid && refreshTokenPayload.payload) {
      const session = {
        userId: user.id,
        tokenId: refreshTokenPayload.payload.jti,
        refreshTokenHash: await this.passwordService.hash(tokens.refreshToken),
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days from now
      };
      await this.unitOfWork.sessions.create(session);
    }

    // Return user data and tokens
    return {
      user: {
        id: user.id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        isActive: user.isActive,
        emailVerified: user.emailVerified,
        createdAt: user.createdAt,
      },
      tokens,
    };
  }

  /**
   * Authenticate user with email and password
   *
   * Verifies credentials and generates new token pair.
   * Updates lastLoginAt timestamp on successful authentication.
   *
   * @param input - Login credentials
   * @returns User data and authentication tokens
   * @throws AuthenticationError if credentials are invalid
   * @throws ForbiddenError if user account is inactive
   */
  async login(input: LoginInput): Promise<LoginOutput> {
    // Find user by email
    const user = await this.unitOfWork.users.findByEmail(input.email);
    if (!user) {
      throw new AuthenticationError('Invalid email or password');
    }

    // Check if user is active
    if (!user.isActive) {
      throw new ForbiddenError('User account is inactive. Please contact support.');
    }

    // Verify password
    const isPasswordValid = await this.passwordService.verify(user.passwordHash, input.password);
    if (!isPasswordValid) {
      throw new AuthenticationError('Invalid email or password');
    }

    // Update last login
    await this.unitOfWork.users.update(user.id, {
      lastLoginAt: new Date(),
    });

    // Generate tokens
    const tokens = this.pasetoService.createTokenPair({
      sub: user.id,
      email: user.email,
      role: 'user',
    });

    // Store refresh token session
    const refreshTokenPayload = this.pasetoService.validateRefreshToken(tokens.refreshToken);
    if (refreshTokenPayload.valid && refreshTokenPayload.payload) {
      const session = {
        userId: user.id,
        tokenId: refreshTokenPayload.payload.jti,
        refreshTokenHash: await this.passwordService.hash(tokens.refreshToken),
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days from now
      };
      await this.unitOfWork.sessions.create(session);
    }

    // Return user data and tokens
    return {
      user: {
        id: user.id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        isActive: user.isActive,
        emailVerified: user.emailVerified,
        lastLoginAt: user.lastLoginAt,
      },
      tokens,
    };
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
    // Validate refresh token
    const result = this.pasetoService.validateRefreshToken(input.refreshToken);
    if (!result.valid || !result.payload) {
      throw new InvalidTokenError('Invalid refresh token');
    }

    const payload = result.payload as TokenPayload & { tokenId: string };

    // Check if session exists and is not revoked
    const session = await this.unitOfWork.sessions.findByTokenId(payload.tokenId);
    if (!session) {
      throw new NotFoundError('Session not found or has been revoked');
    }

    if (session.isRevoked) {
      throw new InvalidTokenError('Refresh token has been revoked');
    }

    // Check if session has expired
    if (session.expiresAt < new Date()) {
      throw new TokenExpiredError('Refresh token session has expired');
    }

    // Get user
    const user = await this.unitOfWork.users.findById(session.userId);
    if (!user || !user.isActive) {
      throw new ForbiddenError('User account is inactive or does not exist');
    }

    // Generate new tokens
    const tokens = this.pasetoService.createTokenPair({
      sub: user.id,
      email: user.email,
      role: 'user',
    });

    // Create new session and revoke old one
    const newRefreshTokenPayload = this.pasetoService.validateRefreshToken(tokens.refreshToken);
    if (newRefreshTokenPayload.valid && newRefreshTokenPayload.payload) {
      const newSession = {
        userId: user.id,
        tokenId: newRefreshTokenPayload.payload.jti,
        refreshTokenHash: await this.passwordService.hash(tokens.refreshToken),
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days from now
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
  async logout(input: LogoutInput): Promise<void> {
    const session = await this.unitOfWork.sessions.findByTokenId(input.tokenId);
    if (!session) {
      throw new NotFoundError('Session not found');
    }

    // Verify session belongs to user
    if (session.userId !== input.userId) {
      throw new InvalidTokenError('Session does not belong to user');
    }

    await this.unitOfWork.sessions.revoke(session.id);
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
