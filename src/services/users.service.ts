/* eslint-disable @typescript-eslint/no-explicit-any */

import type { UnitOfWork } from '../repositories/unit-of-work';
import type { PasswordService } from '../core/crypto/password.service';
import type {
  IUsersService,
  GetProfileInput,
  UserProfile,
  UpdateProfileInput,
  UpdatePasswordInput,
  GetUsersInput,
  GetUsersOutput,
  CreateUserInput,
  UpdateUserInput,
  GetActivityLogsInput,
  GetActivityLogsOutput,
} from './interfaces/users.service.interface';
import {
  NotFoundError,
  AuthenticationError,
  ConflictError,
} from '../core/errors/app-error';
import { logger } from '../core/logging/logger';

export class UsersService implements IUsersService {
  private readonly unitOfWork: any;
  private readonly passwordService: PasswordService;

  constructor(unitOfWork: unknown, passwordService: PasswordService) {
    this.unitOfWork = unitOfWork as UnitOfWork;
    this.passwordService = passwordService;
  }

  async getProfile(input: GetProfileInput): Promise<UserProfile> {
    const user = await this.unitOfWork.users.findById(input.userId, true);

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
      deletedAt: user.deletedAt,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt,
    };
  }

  async updateProfile(input: UpdateProfileInput): Promise<UserProfile> {
    const user = await this.unitOfWork.users.findById(input.userId, true);

    if (!user) {
      throw new NotFoundError('User not found');
    }

    const updateData: Record<string, unknown> = {};

    if (input.firstName !== undefined) {
      updateData.firstName = input.firstName;
    }

    if (input.lastName !== undefined) {
      updateData.lastName = input.lastName;
    }

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
      deletedAt: updatedUser.deletedAt,
      createdAt: updatedUser.createdAt,
      updatedAt: updatedUser.updatedAt,
    };
  }

  async updatePassword(input: UpdatePasswordInput): Promise<{ message: string }> {
    const user = await this.unitOfWork.users.findById(input.userId, true);

    if (!user) {
      throw new NotFoundError('User not found');
    }

    const isPasswordValid = await this.passwordService.verify(
      user.passwordHash,
      input.currentPassword
    );

    if (!isPasswordValid) {
      throw new AuthenticationError('Current password is incorrect');
    }

    const newPasswordHash = await this.passwordService.hash(input.newPassword);

    await this.unitOfWork.users.update(user.id, {
      passwordHash: newPasswordHash,
    });

    logger.info('User password updated', { userId: user.id });

    return { message: 'Password changed successfully' };
  }

  async getUsers(input: GetUsersInput): Promise<GetUsersOutput> {
    const page = Math.max(1, input.page || 1);
    const limit = Math.max(1, Math.min(100, input.limit || 10));
    const offset = (page - 1) * limit;

    const [allFiltered, paged] = await Promise.all([
      this.unitOfWork.users.findAll({
        search: input.search,
        includeDeleted: input.includeDeleted,
        onlyDeleted: input.onlyDeleted,
      }),
      this.unitOfWork.users.findAll({
        search: input.search,
        includeDeleted: input.includeDeleted,
        onlyDeleted: input.onlyDeleted,
        limit,
        offset,
      }),
    ]);

    const total = allFiltered.length;
    const totalPages = Math.ceil(total / limit);

    return {
      users: paged.map((user: UserProfile) => ({
        id: user.id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        isActive: user.isActive,
        emailVerified: user.emailVerified,
        createdAt: user.createdAt,
        lastLoginAt: user.lastLoginAt,
        deletedAt: user.deletedAt,
      })),
      pagination: {
        page,
        limit,
        total,
        totalPages,
        hasNextPage: page < totalPages,
        hasPreviousPage: page > 1,
      },
    };
  }

  async createUser(input: CreateUserInput): Promise<UserProfile> {
    const existingUser = await this.unitOfWork.users.findByEmail(input.email);

    if (existingUser) {
      throw new ConflictError('User with this email already exists', {
        field: 'email',
        value: input.email,
      });
    }

    const passwordHash = await this.passwordService.hash(input.password);

    const user = await this.unitOfWork.users.create({
      email: input.email,
      passwordHash,
      firstName: input.firstName,
      lastName: input.lastName,
      isActive: input.isActive ?? true,
      emailVerified: input.emailVerified ?? false,
    });

    logger.info('User created by admin', { userId: user.id, email: user.email });

    return {
      id: user.id,
      email: user.email,
      firstName: user.firstName,
      lastName: user.lastName,
      isActive: user.isActive,
      emailVerified: user.emailVerified,
      lastLoginAt: user.lastLoginAt,
      deletedAt: user.deletedAt,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt,
    };
  }

  async updateUser(input: UpdateUserInput): Promise<UserProfile> {
    const user = await this.unitOfWork.users.findById(input.id, true);

    if (!user) {
      throw new NotFoundError('User not found');
    }

    const updateData: Record<string, unknown> = {};

    if (input.email !== undefined) {
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
      lastLoginAt: updatedUser.lastLoginAt,
      deletedAt: updatedUser.deletedAt,
      createdAt: updatedUser.createdAt,
      updatedAt: updatedUser.updatedAt,
    };
  }

  async deleteUser(id: string, force = false): Promise<{ message: string }> {
    const user = await this.unitOfWork.users.findById(id, true);

    if (!user) {
      throw new NotFoundError('User not found');
    }

    if (force) {
      const deleted = await this.unitOfWork.users.delete(id);
      if (!deleted) {
        throw new NotFoundError('Failed to delete user');
      }
      return { message: 'User deleted successfully' };
    }

    const deleted = await this.unitOfWork.users.softDelete(id);

    if (!deleted) {
      throw new NotFoundError('Failed to delete user');
    }

    logger.info('User soft deleted by admin', { userId: id });

    return { message: 'User deleted successfully' };
  }

  async activateUser(id: string): Promise<{ message: string }> {
    const updated = await this.unitOfWork.users.setActive(id, true);
    if (!updated) {
      throw new NotFoundError('User not found');
    }
    return { message: 'User activated successfully' };
  }

  async deactivateUser(id: string): Promise<{ message: string }> {
    const updated = await this.unitOfWork.users.setActive(id, false);
    if (!updated) {
      throw new NotFoundError('User not found');
    }
    return { message: 'User deactivated successfully' };
  }

  async restoreUser(id: string): Promise<{ message: string }> {
    const restored = await this.unitOfWork.users.restore(id);
    if (!restored) {
      throw new NotFoundError('User not found');
    }
    return { message: 'User restored successfully' };
  }

  async getActivityLogs(input: GetActivityLogsInput): Promise<GetActivityLogsOutput> {
    const page = Math.max(1, input.page || 1);
    const limit = Math.max(1, Math.min(100, input.limit || 10));

    // Placeholder for future persistent audit log table.
    const logs: GetActivityLogsOutput['logs'] = [];

    return {
      logs,
      pagination: {
        page,
        limit,
        total: logs.length,
        totalPages: 0,
        hasNextPage: false,
        hasPreviousPage: false,
      },
    };
  }

  async getUserStats(): Promise<{
    totalUsers: number;
    activeUsers: number;
    verifiedUsers: number;
    newUsersThisMonth: number;
    newUsersThisWeek: number;
  }> {
    const allUsers = await this.unitOfWork.users.findAll({ includeDeleted: true });

    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const startOfWeek = new Date(now);
    startOfWeek.setDate(now.getDate() - 7);

    const totalUsers = allUsers.length;
    const activeUsers = allUsers.filter((u: UserProfile) => u.isActive).length;
    const verifiedUsers = allUsers.filter((u: UserProfile) => u.emailVerified).length;
    const newUsersThisMonth = allUsers.filter((u: UserProfile) => u.createdAt >= startOfMonth).length;
    const newUsersThisWeek = allUsers.filter((u: UserProfile) => u.createdAt >= startOfWeek).length;

    return {
      totalUsers,
      activeUsers,
      verifiedUsers,
      newUsersThisMonth,
      newUsersThisWeek,
    };
  }
}
