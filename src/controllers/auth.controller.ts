/**
 * Authentication Controller
 *
 * Handles HTTP requests for authentication operations.
 * Delegates business logic to the AuthService.
 *
 * Features:
 * - User registration
 * - User login
 * - Token refresh
 * - User logout
 * - Get current user
 *
 * @module AuthController
 */

import type { AuthService } from '../services/auth.service';
import type { PasetoService } from '../core/paseto/paseto.service';
import type { AuthContext } from '../middlewares/auth.middleware';
import type {
  RegisterDTO,
  LoginDTO,
  RefreshTokenDTO,
  RegisterResponse,
  LoginResponse,
  RefreshTokenResponse,
  MeResponse,
} from '../routes/dto/auth.dto';
import { logger } from '../core/logging/logger';
import { ConflictError, AuthenticationError, UnauthorizedError, InternalServerError } from '../core/errors/app-error';

/**
 * Authentication Controller
 *
 * Processes authentication requests and returns appropriate responses.
 * All methods are async and handle their own error logging.
 */
export class AuthController {
  constructor(
    private readonly authService: AuthService,
    private readonly pasetoService: PasetoService
  ) {}

  /**
   * Register a new user
   *
   * @param dto - Registration data
   * @returns User data and authentication tokens
   * @throws ConflictError if email already exists
   */
  async register(dto: RegisterDTO): Promise<RegisterResponse> {
    try {
      logger.info('Registration attempt', { email: dto.email });

      const result = await this.authService.register({
        email: dto.email,
        username: dto.username,
        password: dto.password,
        firstName: dto.firstName,
        lastName: dto.lastName,
      });

      logger.info('Registration successful', { userId: result.user.id });

      return result;
    } catch (error) {
      if (error instanceof ConflictError) {
        logger.warn('Registration failed: Email already exists', { email: dto.email });
        throw error;
      }

      logger.error('Registration error', { error, email: dto.email });
      throw new InternalServerError('Registration failed');
    }
  }

  /**
   * Authenticate user with email and password
   *
   * @param dto - Login credentials
   * @returns User data and authentication tokens
   * @throws AuthenticationError if credentials are invalid
   */
  async login(dto: LoginDTO): Promise<LoginResponse> {
    try {
      logger.info('Login attempt', { email: dto.email });

      const result = await this.authService.login({
        email: dto.email,
        password: dto.password,
      });

      logger.info('Login successful', { userId: result.user.id });

      return result;
    } catch (error) {
      if (error instanceof AuthenticationError) {
        logger.warn('Login failed: Invalid credentials', { email: dto.email });
        throw error;
      }

      logger.error('Login error', { error, email: dto.email });
      throw new InternalServerError('Login failed');
    }
  }

  /**
   * Refresh access token using refresh token
   *
   * @param dto - Refresh token
   * @returns New authentication tokens
   * @throws UnauthorizedError if refresh token is invalid
   */
  async refreshToken(dto: RefreshTokenDTO): Promise<RefreshTokenResponse> {
    try {
      logger.debug('Token refresh attempt');

      const result = await this.authService.refreshToken({
        refreshToken: dto.refreshToken,
      });

      logger.info('Token refresh successful');

      return result;
    } catch (error) {
      logger.warn('Token refresh failed', { error });
      throw new UnauthorizedError('Invalid or expired refresh token');
    }
  }

  /**
   * Logout user and revoke session
   *
   * @param authContext - Authentication context from middleware
   * @throws UnauthorizedError if not authenticated
   */
  async logout(authContext: AuthContext): Promise<{ message: string }> {
    try {
      if (!authContext.user || !authContext.tokenId) {
        throw new UnauthorizedError('Authentication required');
      }

      await this.authService.logout({
        userId: authContext.user.id,
        tokenId: authContext.tokenId,
      });

      logger.info('Logout successful', { userId: authContext.user.id });

      return { message: 'Logged out successfully' };
    } catch (error) {
      if (error instanceof UnauthorizedError) {
        throw error;
      }

      // Log logout error but don't fail the request
      // The client can still discard their tokens
      logger.error('Logout error', { error, userId: authContext.user?.id });
      return { message: 'Logged out successfully' };
    }
  }

  /**
   * Get current authenticated user
   *
   * @param authContext - Authentication context from middleware
   * @returns Current user data
   * @throws UnauthorizedError if not authenticated
   */
  // eslint-disable-next-line @typescript-eslint/require-await
  async me(authContext: AuthContext): Promise<MeResponse> {
    if (!authContext.user) {
      throw new UnauthorizedError('Authentication required');
    }

    try {
      // The user is already authenticated by the middleware
      // Return user data from context
      // In a real implementation, you might fetch fresh data from the database
      // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
      const user = authContext.user;
      return {
        id: user?.id ?? '',
        email: user?.email ?? '',
        // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
        name: user?.name ?? null,
        // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
        role: user?.role ?? 'user',
        // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
        createdAt: user?.createdAt ?? new Date(),
        // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
        lastLoginAt: user?.lastLoginAt ?? null,
        // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
        updatedAt: user?.updatedAt ?? new Date(),
      };
    } catch (error) {
      if (error instanceof UnauthorizedError) {
        throw error;
      }

      logger.error('Get current user error', { error, userId: authContext.user.id });
      throw new InternalServerError('Failed to get user data');
    }
  }
}
