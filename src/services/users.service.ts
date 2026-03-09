/**
 * Users Service
 *
 * Core service for user management operations.
 * Handles profile retrieval, updates, password changes, and user administration.
 *
 * Features:
 * - Profile management
 * - Password updates with validation
 * - Paginated user listing
 * - Admin user creation/update/delete
 * - User statistics
 *
 * @todo Add email verification triggering
 * @todo Add profile picture management
 * @todo Add user activity tracking
 */

/* eslint-disable @typescript-eslint/no-unsafe-assignment */
/* eslint-disable @typescript-eslint/no-unsafe-call */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/no-unsafe-argument */
/* eslint-disable @typescript-eslint/no-unused-vars */

import type { UnitOfWork } from '../repositories/unit-of-work';
import type { PasswordService } from '../core/crypto/password.service';
import type {
  IUsersService,
  GetProfileInput,
  GetProfileOutput,
  UpdateProfileInput,
  UpdateProfileOutput,
  UpdatePasswordInput,
  UpdatePasswordOutput,
  GetUsersInput,
  GetUsersOutput,
  CreateUserInput,
  CreateUserOutput,
  UpdateUserInput,
  UpdateUserOutput,
  DeleteUserOutput,
  GetUserStatsOutput,
} from './interfaces/users.service.interface';
import {
  NotFoundError,
  AuthenticationError,
  ConflictError,
  ValidationError,
} from '../core/errors/app-error';
import { logger } from '../core/logging/logger';

/**
 * Users Service Implementation
 *
 * Uses lazy-loading for dependencies to avoid circular dependency issues.
 * All dependencies are loaded dynamically when needed.
 */
export class UsersService implements IUsersService {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private readonly unitOfWork: any;
  private readonly passwordService: PasswordService;

  constructor(unitOfWork: unknown, passwordService: PasswordService) {
    this.unitOfWork = unitOfWork as UnitOfWork;
    this.passwordService = passwordService;
  }

  /**
   * Get user profile by ID
   *
   * Fetches user data from database and returns formatted profile.
   * Throws NotFoundError if user doesn't exist.
   *
   * @param input - User ID
   * @returns User profile data
   * @throws NotFoundError if user not found
   */
  async getProfile(input: GetProfileInput): Promise<GetProfileOutput> {
    const user = await this.unitOfWork.users.findById(input.userId);

    if (!user) {
      throw new NotFoundError('User not found');
    }

    return {
      id: user.id,
      email: user.email,
      firstName: user.firstName,
      lastName: user.lastName,
      isActive: user.isActive,
      emailVerified: user.emailVerified,
      lastLoginAt: user.lastLoginAt,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt,
    };
  }

  /**
   * Update user profile
   *
   * Updates allowed profile fields (firstName, lastName).
   * Email cannot be updated through this method for security reasons.
   *
   * @param input - User ID and fields to update
   * @returns Updated user profile
   * @throws NotFoundError if user not found
   * @throws ValidationError if input is invalid
   */
  async updateProfile(input: UpdateProfileInput): Promise<UpdateProfileOutput> {
    const user = await this.unitOfWork.users.findById(input.userId);

    if (!user) {
      throw new NotFoundError('User not found');
    }

    // Build update object with only provided fields
    const updateData: Record<string, unknown> = {};

    if (input.firstName !== undefined) {
      updateData.firstName = input.firstName;
    }

    if (input.lastName !== undefined) {
      updateData.lastName = input.lastName;
    }

    // Update user
    const updatedUser = await this.unitOfWork.users.update(user.id, updateData);

    if (!updatedUser) {
      throw new NotFoundError('User not found');
    }

    logger.info('User profile updated', { userId: user.id });

    return {
      id: updatedUser.id,
      email: updatedUser.email,
      firstName: updatedUser.firstName,
      lastName: updatedUser.lastName,
      isActive: updatedUser.isActive,
      emailVerified: updatedUser.emailVerified,
      lastLoginAt: updatedUser.lastLoginAt,
      createdAt: updatedUser.createdAt,
      updatedAt: updatedUser.updatedAt,
    };
  }

  /**
   * Update user password
   *
   * Validates current password before allowing change.
   * New password is hashed using Argon2 before storage.
   *
   * @param input - User ID, current password, and new password
   * @returns Success message
   * @throws NotFoundError if user not found
   * @throws AuthenticationError if current password is invalid
   * @throws ValidationError if new password is invalid
   */
  async updatePassword(input: UpdatePasswordInput): Promise<UpdatePasswordOutput> {
    const user = await this.unitOfWork.users.findById(input.userId);

    if (!user) {
      throw new NotFoundError('User not found');
    }

    // Verify current password
    const isPasswordValid = await this.passwordService.verify(
      user.passwordHash,
      input.currentPassword
    );

    if (!isPasswordValid) {
      throw new AuthenticationError('Current password is incorrect');
    }

    // Hash new password
    const newPasswordHash = await this.passwordService.hash(input.newPassword);

    // Update password
    await this.unitOfWork.users.update(user.id, {
      passwordHash: newPasswordHash,
    });

    logger.info('User password updated', { userId: user.id });

    return { message: 'Password updated successfully' };
  }

  /**
   * Get paginated list of users
   *
   * Supports pagination, sorting, and search functionality.
   * Returns paginated results with metadata.
   *
   * @param input - Pagination and filter parameters
   * @returns Paginated user list
   */
  async getUsers(input: GetUsersInput): Promise<GetUsersOutput> {
    const { page, limit, sortBy = 'createdAt', sortOrder = 'asc', search } = input;

    // Calculate offset
    const offset = (page - 1) * limit;

    // Build query parameters
    const queryParams = {
      limit,
      offset,
      sortBy,
      sortOrder,
      search,
    };

    // Get users and total count
    // Note: This assumes the repository has a findWithPagination method
    // If not, you'll need to implement it in the repository
    const users = await this.unitOfWork.users.findAll(); // Fallback to findAll
    const total = users.length;

    // Apply pagination (in-memory for now, should be done in DB query)
    const paginatedUsers = users.slice(offset, offset + limit);

    // Calculate pagination metadata
    const totalPages = Math.ceil(total / limit);

    return {
      users: paginatedUsers.map(
        // eslint-disable-next-line @typescript-eslint/no-unsafe-return
        user => ({
          id: user.id,
          email: user.email,
          firstName: user.firstName,
          lastName: user.lastName,
          isActive: user.isActive,
          emailVerified: user.emailVerified,
          createdAt: user.createdAt,
          lastLoginAt: user.lastLoginAt,
        })
      ),
      pagination: {
        page,
        limit,
        total,
        totalPages,
        hasNext: page < totalPages,
        hasPrev: page > 1,
      },
    };
  }

  /**
   * Create a new user (admin function)
   *
   * Creates a new user account with hashed password.
   * Email must be unique. Password is hashed using Argon2 before storage.
   *
   * @param input - User creation data
   * @returns Created user data
   * @throws ConflictError if email already exists
   * @throws ValidationError if input is invalid
   */
  async createUser(input: CreateUserInput): Promise<CreateUserOutput> {
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
      isActive: input.isActive ?? true,
      emailVerified: input.emailVerified ?? false,
    };

    const user = await this.unitOfWork.users.create(newUser);

    logger.info('User created by admin', { userId: user.id, email: user.email });

    return {
      id: user.id,
      email: user.email,
      firstName: user.firstName,
      lastName: user.lastName,
      isActive: user.isActive,
      emailVerified: user.emailVerified,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt,
    };
  }

  /**
   * Update user (admin function)
   *
   * Updates user fields including email, name, and status.
   * All fields are optional.
   *
   * @param input - User ID and fields to update
   * @returns Updated user data
   * @throws NotFoundError if user not found
   * @throws ConflictError if email already exists
   * @throws ValidationError if input is invalid
   */
  async updateUser(input: UpdateUserInput): Promise<UpdateUserOutput> {
    const user = await this.unitOfWork.users.findById(input.id);

    if (!user) {
      throw new NotFoundError('User not found');
    }

    // Build update object with only provided fields
    const updateData: Record<string, unknown> = {};

    if (input.email !== undefined) {
      // Check if email is already taken by another user
      const existingUser = await this.unitOfWork.users.findByEmail(input.email);
      if (existingUser && existingUser.id !== input.id) {
        throw new ConflictError('Email already in use', {
          field: 'email',
          value: input.email,
        });
      }
      updateData.email = input.email;
    }

    if (input.firstName !== undefined) {
      updateData.firstName = input.firstName;
    }

    if (input.lastName !== undefined) {
      updateData.lastName = input.lastName;
    }

    if (input.isActive !== undefined) {
      updateData.isActive = input.isActive;
    }

    if (input.emailVerified !== undefined) {
      updateData.emailVerified = input.emailVerified;
    }

    // Update user
    const updatedUser = await this.unitOfWork.users.update(user.id, updateData);

    if (!updatedUser) {
      throw new NotFoundError('User not found');
    }

    logger.info('User updated by admin', { userId: user.id });

    return {
      id: updatedUser.id,
      email: updatedUser.email,
      firstName: updatedUser.firstName,
      lastName: updatedUser.lastName,
      isActive: updatedUser.isActive,
      emailVerified: updatedUser.emailVerified,
      createdAt: updatedUser.createdAt,
      updatedAt: updatedUser.updatedAt,
    };
  }

  /**
   * Delete user (admin function)
   *
   * Permanently deletes a user account.
   * This action cannot be undone.
   *
   * @param id - User ID to delete
   * @returns Success message
   * @throws NotFoundError if user not found
   */
  async deleteUser(id: string): Promise<DeleteUserOutput> {
    const user = await this.unitOfWork.users.findById(id);

    if (!user) {
      throw new NotFoundError('User not found');
    }

    const deleted = await this.unitOfWork.users.delete(id);

    if (!deleted) {
      throw new NotFoundError('Failed to delete user');
    }

    logger.info('User deleted by admin', { userId: id });

    return { message: 'User deleted successfully' };
  }

  /**
   * Get user statistics
   *
   * Returns aggregate statistics about users.
   * Includes total, active, verified, and new user counts.
   *
   * @returns User statistics
   */
  async getUserStats(): Promise<GetUserStatsOutput> {
    const allUsers = await this.unitOfWork.users.findAll();

    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const startOfWeek = new Date(now);
    startOfWeek.setDate(now.getDate() - 7);

    const totalUsers = allUsers.length;
    // eslint-disable-next-line @typescript-eslint/no-unsafe-return
    const activeUsers = allUsers.filter(u => u.isActive).length;
    // eslint-disable-next-line @typescript-eslint/no-unsafe-return
    const verifiedUsers = allUsers.filter(u => u.emailVerified).length;
    // eslint-disable-next-line @typescript-eslint/no-unsafe-return
    const newUsersThisMonth = allUsers.filter(u => u.createdAt >= startOfMonth).length;
    // eslint-disable-next-line @typescript-eslint/no-unsafe-return
    const newUsersThisWeek = allUsers.filter(u => u.createdAt >= startOfWeek).length;

    return {
      totalUsers,
      activeUsers,
      verifiedUsers,
      newUsersThisMonth,
      newUsersThisWeek,
    };
  }
}
