/**
 * Users Controller
 *
 * Handles HTTP requests for user management operations.
 * Delegates business logic to the UsersService.
 *
 * Features:
 * - Get current user profile
 * - Update current user profile
 * - Change password
 * - List users (paginated)
 * - Get user by ID
 * - Update user (admin)
 * - Delete user (admin)
 * - Get user statistics
 *
 * @module UsersController
 */

import type { UsersService } from '../services/users.service';
import type { AuthContext } from '../middlewares/auth.middleware';
import type {
  UpdateProfileDTO,
  UpdatePasswordDTO,
  GetUsersQueryDTO,
  CreateUserDTO,
  UpdateUserDTO,
  UpdateProfileResponse,
  UpdatePasswordResponse,
  UsersListResponse,
  CreateUserResponse,
  UpdateUserResponse,
  DeleteUserResponse,
  UserStatsResponse,
  UserResponse,
} from '../routes/dto/users.dto';
import { logger } from '../core/logging/logger';
import {
  NotFoundError,
  AuthenticationError,
  UnauthorizedError,
  BadRequestError,
  InternalServerError,
} from '../core/errors/app-error';

/**
 * Users Controller
 *
 * Processes user management requests and returns appropriate responses.
 * All methods are async and handle their own error logging.
 */
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  /**
   * Get current user profile
   *
   * @param authContext - Authentication context from middleware
   * @returns Current user profile
   * @throws UnauthorizedError if not authenticated
   */
  async getMe(authContext: AuthContext): Promise<UserResponse> {
    if (!authContext.user) {
      throw new UnauthorizedError('Authentication required');
    }

    try {
      const profile = await this.usersService.getProfile({
        userId: authContext.user.id,
      });

      return profile;
    } catch (error) {
      if (error instanceof NotFoundError) {
        throw error;
      }

      logger.error('Get profile error', { error, userId: authContext.user.id });
      throw new InternalServerError('Failed to get profile');
    }
  }

  /**
   * Update current user profile
   *
   * @param dto - Profile update data
   * @param authContext - Authentication context from middleware
   * @returns Updated user profile
   * @throws UnauthorizedError if not authenticated
   */
  async updateMe(dto: UpdateProfileDTO, authContext: AuthContext): Promise<UpdateProfileResponse> {
    if (!authContext.user) {
      throw new UnauthorizedError('Authentication required');
    }

    try {
      const profile = await this.usersService.updateProfile({
        userId: authContext.user.id,
        ...dto,
      });

      logger.info('Profile updated', { userId: authContext.user.id });

      return profile;
    } catch (error) {
      if (error instanceof NotFoundError) {
        throw error;
      }

      logger.error('Update profile error', { error, userId: authContext.user.id });
      throw new InternalServerError('Failed to update profile');
    }
  }

  /**
   * Change current user password
   *
   * @param dto - Password update data
   * @param authContext - Authentication context from middleware
   * @returns Success message
   * @throws UnauthorizedError if not authenticated
   * @throws AuthenticationError if current password is invalid
   */
  async changePassword(
    dto: UpdatePasswordDTO,
    authContext: AuthContext
  ): Promise<UpdatePasswordResponse> {
    if (!authContext.user) {
      throw new UnauthorizedError('Authentication required');
    }

    try {
      const result = await this.usersService.updatePassword({
        userId: authContext.user.id,
        currentPassword: dto.currentPassword,
        newPassword: dto.newPassword,
      });

      logger.info('Password changed', { userId: authContext.user.id });

      return result;
    } catch (error) {
      if (error instanceof AuthenticationError || error instanceof NotFoundError) {
        throw error;
      }

      logger.error('Change password error', { error, userId: authContext.user.id });
      throw new InternalServerError('Failed to change password');
    }
  }

  /**
   * List users with pagination
   *
   * @param query - Pagination and filter parameters
   * @param authContext - Authentication context from middleware
   * @returns Paginated user list
   * @throws UnauthorizedError if not authenticated
   * @throws ForbiddenError if not authorized
   */
  async getUsers(query: GetUsersQueryDTO, authContext: AuthContext): Promise<UsersListResponse> {
    if (!authContext.user) {
      throw new UnauthorizedError('Authentication required');
    }

    // Check if user has admin role (this would be implemented with RBAC)
    // For now, we'll allow all authenticated users to list users
    // In production, you'd check: if (!hasRole(authContext.user, 'admin')) { throw new ForbiddenError(); }

    try {
      const result = await this.usersService.getUsers({
        page: query.page,
        limit: query.limit,
        sortBy: query.sortBy,
        sortOrder: query.sortOrder,
        search: query.search,
      });

      return result;
    } catch (error) {
      logger.error('List users error', { error });
      throw new InternalServerError('Failed to list users');
    }
  }

  /**
   * Get user by ID
   *
   * @param id - User ID
   * @param authContext - Authentication context from middleware
   * @returns User data
   * @throws UnauthorizedError if not authenticated
   * @throws NotFoundError if user not found
   */
  async getUserById(id: string, authContext: AuthContext): Promise<UserResponse> {
    if (!authContext.user) {
      throw new UnauthorizedError('Authentication required');
    }

    try {
      const profile = await this.usersService.getProfile({
        userId: id,
      });

      return profile;
    } catch (error) {
      if (error instanceof NotFoundError) {
        throw error;
      }

      logger.error('Get user by ID error', { error, userId: id });
      throw new InternalServerError('Failed to get user');
    }
  }

  /**
   * Create a new user (admin function)
   *
   * @param dto - User creation data
   * @param authContext - Authentication context from middleware
   * @returns Created user data
   * @throws UnauthorizedError if not authenticated
   * @throws ForbiddenError if not authorized
   */
  async createUser(dto: CreateUserDTO, authContext: AuthContext): Promise<CreateUserResponse> {
    if (!authContext.user) {
      throw new UnauthorizedError('Authentication required');
    }

    // Check if user has admin role
    // For now, we'll allow all authenticated users
    // In production, you'd check: if (!hasRole(authContext.user, 'admin')) { throw new ForbiddenError(); }

    try {
      const user = await this.usersService.createUser({
        email: dto.email,
        password: dto.password,
        firstName: dto.firstName,
        lastName: dto.lastName,
        isActive: dto.isActive,
        emailVerified: dto.emailVerified,
      });

      logger.info('User created', { userId: user.id, createdBy: authContext.user.id });

      return user;
    } catch (error) {
      if (error instanceof BadRequestError || error instanceof ConflictError) {
        throw error;
      }

      logger.error('Create user error', { error });
      throw new InternalServerError('Failed to create user');
    }
  }

  /**
   * Update user (admin function)
   *
   * @param id - User ID to update
   * @param dto - User update data
   * @param authContext - Authentication context from middleware
   * @returns Updated user data
   * @throws UnauthorizedError if not authenticated
   * @throws NotFoundError if user not found
   */
  async updateUser(
    id: string,
    dto: UpdateUserDTO,
    authContext: AuthContext
  ): Promise<UpdateUserResponse> {
    if (!authContext.user) {
      throw new UnauthorizedError('Authentication required');
    }

    // Check if user has admin role
    // For now, we'll allow all authenticated users
    // In production, you'd check: if (!hasRole(authContext.user, 'admin')) { throw new ForbiddenError(); }

    try {
      const user = await this.usersService.updateUser({
        id,
        ...dto,
      });

      logger.info('User updated', { userId: id, updatedBy: authContext.user.id });

      return user;
    } catch (error) {
      if (error instanceof NotFoundError || error instanceof ConflictError) {
        throw error;
      }

      logger.error('Update user error', { error, userId: id });
      throw new InternalServerError('Failed to update user');
    }
  }

  /**
   * Delete user (admin function)
   *
   * @param id - User ID to delete
   * @param authContext - Authentication context from middleware
   * @returns Success message
   * @throws UnauthorizedError if not authenticated
   * @throws NotFoundError if user not found
   */
  async deleteUser(id: string, authContext: AuthContext): Promise<DeleteUserResponse> {
    if (!authContext.user) {
      throw new UnauthorizedError('Authentication required');
    }

    // Check if user has admin role
    // For now, we'll allow all authenticated users
    // In production, you'd check: if (!hasRole(authContext.user, 'admin')) { throw new ForbiddenError(); }

    try {
      const result = await this.usersService.deleteUser(id);

      logger.info('User deleted', { userId: id, deletedBy: authContext.user.id });

      return result;
    } catch (error) {
      if (error instanceof NotFoundError) {
        throw error;
      }

      logger.error('Delete user error', { error, userId: id });
      throw new InternalServerError('Failed to delete user');
    }
  }

  /**
   * Get user statistics
   *
   * @param authContext - Authentication context from middleware
   * @returns User statistics
   * @throws UnauthorizedError if not authenticated
   */
  async getUserStats(authContext: AuthContext): Promise<UserStatsResponse> {
    if (!authContext.user) {
      throw new UnauthorizedError('Authentication required');
    }

    // Check if user has admin role
    // For now, we'll allow all authenticated users
    // In production, you'd check: if (!hasRole(authContext.user, 'admin')) { throw new ForbiddenError(); }

    try {
      const stats = await this.usersService.getUserStats();

      return stats;
    } catch (error) {
      logger.error('Get user stats error', { error });
      throw new InternalServerError('Failed to get user statistics');
    }
  }
}
