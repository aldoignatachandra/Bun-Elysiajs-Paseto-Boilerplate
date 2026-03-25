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

import type { AuthService, AuthActivityContext } from '../services/auth.service';
import type { UsersService } from '../services/users.service';
import type { AuthContext } from '../middlewares/auth.middleware';
import type {
  RegisterDTO,
  LoginDTO,
  RefreshTokenDTO,
  RegisterResponse,
  LoginResponse,
  RefreshTokenResponse,
  MeApiResponse,
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
    private readonly usersService: UsersService
  ) {}

  /**
   * Register a new user
   *
   * @param dto - Registration data
   * @param activityContext - Optional activity context (IP, user agent, device type)
   * @returns User data and authentication tokens
   * @throws ConflictError if email already exists
   */
  async register(dto: RegisterDTO, activityContext?: AuthActivityContext): Promise<RegisterResponse> {
    try {
      logger.info('Registration attempt', { email: dto.email });

      const result = await this.authService.register(
        {
          email: dto.email,
          username: dto.username,
          password: dto.password,
          name: dto.name,
        },
        activityContext
      );

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
   * @param activityContext - Optional activity context (IP, user agent, device type)
   * @returns User data and authentication tokens
   * @throws AuthenticationError if credentials are invalid
   */
  async login(dto: LoginDTO, activityContext?: AuthActivityContext): Promise<LoginResponse> {
    try {
      logger.info('Login attempt', { email: dto.email });

      const result = await this.authService.login(
        {
          email: dto.email,
          password: dto.password,
        },
        activityContext
      );

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
   * @param activityContext - Optional activity context (IP, user agent, device type)
   * @returns New authentication tokens
   * @throws UnauthorizedError if refresh token is invalid
   */
  async refreshToken(dto: RefreshTokenDTO, activityContext?: AuthActivityContext): Promise<RefreshTokenResponse> {
    try {
      logger.debug('Token refresh attempt');

      const result = await this.authService.refreshToken(
        {
          refreshToken: dto.refreshToken,
        },
        activityContext
      );

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
   * @param activityContext - Optional activity context (IP, user agent, device type)
   * @throws UnauthorizedError if not authenticated
   * @throws NotFoundError if no session found
   * @throws InvalidTokenError if token already used
   */
  async logout(authContext: AuthContext, activityContext?: AuthActivityContext): Promise<{ message: string }> {
    if (!authContext.user || !authContext.accessToken) {
      throw new UnauthorizedError('Authentication required');
    }

    const userId = authContext.user.id;
    const accessToken = authContext.accessToken;

    await this.authService.logout(
      {
        userId,
        accessToken,
      },
      activityContext
    );

    logger.info('Logout successful', { userId });

    return { message: 'Logged out successfully' };
  }

  /**
   * Get current authenticated user
   *
   * @param authContext - Authentication context from middleware
   * @returns Current user data with formatted timestamps
   * @throws UnauthorizedError if not authenticated
   */
  async me(authContext: AuthContext): Promise<MeApiResponse> {
    if (!authContext.user) {
      throw new UnauthorizedError('Authentication required');
    }

    try {
      // Fetch fresh user data from the database to ensure all fields are up-to-date
      const userProfile = await this.usersService.getProfile({ userId: authContext.user.id });

      return {
        id: userProfile.id,
        email: userProfile.email,
        name: userProfile.name,
        role: userProfile.role,
        createdAt: userProfile.createdAt,
        lastLoginAt: userProfile.lastLoginAt,
        updatedAt: userProfile.updatedAt,
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
