/* eslint-disable @typescript-eslint/no-unsafe-assignment */
/* eslint-disable @typescript-eslint/no-unsafe-call */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/no-unsafe-argument */
/* eslint-disable @typescript-eslint/no-redundant-type-constituents */
/* eslint-disable @typescript-eslint/no-unsafe-return */

import type { UnitOfWork } from '../repositories/unit-of-work';
import type { PasswordService } from '../core/crypto/password.service';
import type { User as UserRecord } from '../database/schema';
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
  UserActivityContext,
} from './interfaces/users.service.interface';
import { NotFoundError, AuthenticationError, ConflictError, BadRequestError } from '../core/errors/app-error';
import { logger } from '../core/logging/logger';
import { ActivityService, type LogActivityInput } from './activity.service';
import { formatDateFromISO } from '../helpers/date.helper';

export class UsersService implements IUsersService {
  private readonly unitOfWork: UnitOfWork;
  private readonly passwordService: PasswordService;
  private activityService: ActivityService | null = null;

  constructor(unitOfWork: UnitOfWork, passwordService: PasswordService) {
    this.unitOfWork = unitOfWork;
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
      logger.error('Failed to log activity', error);
    }
  }

  async getProfile(input: GetProfileInput): Promise<UserProfile> {
    const user = await this.unitOfWork.users.findById(input.userId, true);

    if (!user) {
      throw new NotFoundError('User not found');
    }

    return {
      id: user.id,
      email: user.email,
      username: user.username,
      name: user.name,
      role: user.role,
      lastLoginAt: formatDateFromISO(user.lastLoginAt) ?? user.lastLoginAt?.toISOString() ?? null,
      deletedAt: formatDateFromISO(user.deletedAt) ?? user.deletedAt?.toISOString() ?? null,
      createdAt: formatDateFromISO(user.createdAt) ?? user.createdAt.toISOString(),
      updatedAt: formatDateFromISO(user.updatedAt) ?? user.updatedAt.toISOString(),
    };
  }

  async updateProfile(input: UpdateProfileInput & UserActivityContext): Promise<UserProfile> {
    const user = await this.unitOfWork.users.findById(input.userId, true);

    if (!user) {
      throw new NotFoundError('User not found');
    }

    const updateData: Partial<UserRecord> = {};

    if (input.name !== undefined) {
      updateData.name = input.name;
    }

    if (input.username !== undefined) {
      // Check if username is already taken by another user
      const existingUser = await this.unitOfWork.users.findByUsername(input.username);
      if (existingUser && existingUser.id !== input.userId) {
        throw new ConflictError('Username already in use', {
          field: 'username',
          value: input.username,
        });
      }
      updateData.username = input.username;
    }

    const updatedUser = await this.unitOfWork.users.update(user.id, updateData);

    if (!updatedUser) {
      throw new NotFoundError('User not found');
    }

    logger.info('User profile updated', { userId: user.id });

    await this.logActivity({
      userId: user.id,
      action: 'user.profile_updated',
      entity: 'users',
      entityId: user.id,
      ipAddress: input.ipAddress,
      userAgent: input.userAgent,
      details: { performedBy: input.performedBy },
    });

    return {
      id: updatedUser.id,
      email: updatedUser.email,
      username: updatedUser.username,
      name: updatedUser.name,
      role: updatedUser.role,
      lastLoginAt: formatDateFromISO(updatedUser.lastLoginAt) ?? updatedUser.lastLoginAt?.toISOString() ?? null,
      deletedAt: formatDateFromISO(updatedUser.deletedAt) ?? updatedUser.deletedAt?.toISOString() ?? null,
      createdAt: formatDateFromISO(updatedUser.createdAt) ?? updatedUser.createdAt.toISOString(),
      updatedAt: formatDateFromISO(updatedUser.updatedAt) ?? updatedUser.updatedAt.toISOString(),
    };
  }

  async updatePassword(input: UpdatePasswordInput & UserActivityContext): Promise<{ message: string }> {
    return this.unitOfWork.withTransaction(async uow => {
      const user = await uow.users.findById(input.userId, true);

      if (!user) {
        throw new NotFoundError('User not found');
      }

      const isPasswordValid = await this.passwordService.verify(user.passwordHash, input.currentPassword);

      if (!isPasswordValid) {
        throw new AuthenticationError('Current password is incorrect');
      }

      const newPasswordHash = await this.passwordService.hash(input.newPassword);

      await uow.users.update(user.id, {
        passwordHash: newPasswordHash,
      });

      await uow.sessions.deleteByUserId(user.id);

      logger.info('User password updated', { userId: user.id });

      await uow.activityLogs.create({
        userId: user.id,
        action: 'user.password_changed',
        entity: 'users',
        entityId: user.id,
        ipAddress: input.ipAddress ?? null,
        userAgent: input.userAgent ?? null,
        details: input.performedBy ? { performedBy: input.performedBy } : null,
      });

      return { message: 'Password changed successfully' };
    });
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
      users: paged.map(user => ({
        id: user.id,
        email: user.email,
        username: user.username,
        name: user.name,
        role: user.role,
        createdAt: formatDateFromISO(user.createdAt) ?? user.createdAt.toISOString(),
        lastLoginAt: formatDateFromISO(user.lastLoginAt) ?? user.lastLoginAt?.toISOString() ?? null,
        deletedAt: formatDateFromISO(user.deletedAt) ?? user.deletedAt?.toISOString() ?? null,
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

  async createUser(input: CreateUserInput & UserActivityContext): Promise<UserProfile> {
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
      username: input.username,
      passwordHash,
      name: input.name ?? null,
      role: input.role ?? 'user',
    });

    logger.info('User created by admin', { userId: user.id, email: user.email });

    await this.logActivity({
      userId: user.id,
      action: 'user.registered',
      entity: 'users',
      entityId: user.id,
      ipAddress: input.ipAddress,
      userAgent: input.userAgent,
      details: { performedBy: input.performedBy, email: user.email },
    });

    return {
      id: user.id,
      email: user.email,
      username: user.username,
      name: user.name,
      role: user.role,
      lastLoginAt: formatDateFromISO(user.lastLoginAt) ?? user.lastLoginAt?.toISOString() ?? null,
      deletedAt: formatDateFromISO(user.deletedAt) ?? user.deletedAt?.toISOString() ?? null,
      createdAt: formatDateFromISO(user.createdAt) ?? user.createdAt.toISOString(),
      updatedAt: formatDateFromISO(user.updatedAt) ?? user.updatedAt.toISOString(),
    };
  }

  async updateUser(input: UpdateUserInput & UserActivityContext): Promise<UserProfile> {
    const user = await this.unitOfWork.users.findById(input.id, true);

    if (!user) {
      throw new NotFoundError('User not found');
    }

    const updateData: Partial<UserRecord> = {};

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

    if (input.name !== undefined) {
      updateData.name = input.name;
    }

    if (input.username !== undefined) {
      updateData.username = input.username;
    }

    if (input.role !== undefined) {
      updateData.role = input.role;
    }

    const updatedUser = await this.unitOfWork.users.update(user.id, updateData);

    if (!updatedUser) {
      throw new NotFoundError('User not found');
    }

    logger.info('User updated by admin', { userId: user.id });

    await this.logActivity({
      userId: user.id,
      action: 'user.profile_updated',
      entity: 'users',
      entityId: user.id,
      ipAddress: input.ipAddress,
      userAgent: input.userAgent,
      details: { performedBy: input.performedBy },
    });

    return {
      id: updatedUser.id,
      email: updatedUser.email,
      username: updatedUser.username,
      name: updatedUser.name,
      role: updatedUser.role,
      lastLoginAt: formatDateFromISO(updatedUser.lastLoginAt) ?? updatedUser.lastLoginAt?.toISOString() ?? null,
      deletedAt: formatDateFromISO(updatedUser.deletedAt) ?? updatedUser.deletedAt?.toISOString() ?? null,
      createdAt: formatDateFromISO(updatedUser.createdAt) ?? updatedUser.createdAt.toISOString(),
      updatedAt: formatDateFromISO(updatedUser.updatedAt) ?? updatedUser.updatedAt.toISOString(),
    };
  }

  async deleteUser(id: string, force = false, activityContext?: UserActivityContext): Promise<{ message: string }> {
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

    logger.info('User soft deleted by admin', { userId: id, deletedBy: activityContext?.performedBy });

    await this.logActivity({
      userId: activityContext?.performedBy ?? id,
      action: 'user.deleted',
      entity: 'users',
      entityId: id,
      ipAddress: activityContext?.ipAddress,
      userAgent: activityContext?.userAgent,
      details: { targetUserId: id },
    });

    return { message: 'User deleted successfully' };
  }

  async activateUser(id: string, activityContext?: UserActivityContext): Promise<{ message: string }> {
    // Check if user exists and get current state
    const user = await this.unitOfWork.users.findById(id, true);
    if (!user) {
      throw new NotFoundError('User not found');
    }

    // Check if user is already active
    if (user.deletedAt === null) {
      console.log('[DEBUG] user => ', user);
      throw new BadRequestError('User is already active');
    }

    const updated = await this.unitOfWork.users.setActive(id, true);
    if (!updated) {
      throw new NotFoundError('Failed to activate user');
    }

    logger.info('User activated by admin', { userId: id, activatedBy: activityContext?.performedBy });

    await this.logActivity({
      userId: activityContext?.performedBy ?? id,
      action: 'user.activated',
      entity: 'users',
      entityId: id,
      ipAddress: activityContext?.ipAddress,
      userAgent: activityContext?.userAgent,
      details: { targetUserId: id },
    });

    return { message: 'User activated successfully' };
  }

  async deactivateUser(id: string, activityContext?: UserActivityContext): Promise<{ message: string }> {
    // Check if user exists and get current state
    const user = await this.unitOfWork.users.findById(id, true);
    if (!user) {
      throw new NotFoundError('User not found');
    }

    // Check if user is already inactive
    if (user.deletedAt !== null) {
      throw new BadRequestError('User is already inactive');
    }

    const updated = await this.unitOfWork.users.setActive(id, false);
    if (!updated) {
      throw new NotFoundError('Failed to deactivate user');
    }

    logger.info('User deactivated by admin', { userId: id, deactivatedBy: activityContext?.performedBy });

    await this.logActivity({
      userId: activityContext?.performedBy ?? id,
      action: 'user.deactivated',
      entity: 'users',
      entityId: id,
      ipAddress: activityContext?.ipAddress,
      userAgent: activityContext?.userAgent,
      details: { targetUserId: id },
    });

    return { message: 'User deactivated successfully' };
  }

  async restoreUser(id: string, activityContext?: UserActivityContext): Promise<{ message: string }> {
    // Check if user exists and get current state
    const user = await this.unitOfWork.users.findById(id, true);
    if (!user) {
      throw new NotFoundError('User not found');
    }

    // Check if user is not deleted (cannot restore active user)
    if (user.deletedAt === null) {
      throw new BadRequestError('User is not deleted');
    }

    const restored = await this.unitOfWork.users.restore(id);
    if (!restored) {
      throw new NotFoundError('Failed to restore user');
    }

    logger.info('User restored by admin', { userId: id, restoredBy: activityContext?.performedBy });

    await this.logActivity({
      userId: activityContext?.performedBy ?? id,
      action: 'user.restored',
      entity: 'users',
      entityId: id,
      ipAddress: activityContext?.ipAddress,
      userAgent: activityContext?.userAgent,
      details: { targetUserId: id },
    });

    return { message: 'User restored successfully' };
  }

  async getActivityLogs(input: GetActivityLogsInput): Promise<GetActivityLogsOutput> {
    const page = Math.max(1, input.page || 1);
    const limit = Math.max(1, Math.min(100, input.limit || 10));

    // Delegate to ActivityService for proper implementation
    const activityService = this.getActivityService();
    const result = await activityService.getActivityLogs({
      userId: input.userId,
      action: input.action,
      entity: input.resource,
      page,
      limit,
    });

    // Map the result to match the expected output interface
    return {
      logs: result.logs.map(log => ({
        id: log.id,
        userId: log.userId,
        action: log.action,
        resource: log.entity ?? '',
        createdAt: formatDateFromISO(log.createdAt) ?? log.createdAt.toISOString(),
      })),
      pagination: result.pagination,
    };
  }

  async getUserStats(): Promise<{
    totalUsers: number;
    activeUsers: number;
    newUsersThisMonth: number;
    newUsersThisWeek: number;
  }> {
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const startOfWeek = new Date(now);
    startOfWeek.setDate(now.getDate() - 7);

    const [totalUsers, activeUsers, newUsersThisMonth, newUsersThisWeek] = await Promise.all([
      this.unitOfWork.users.count(true),
      this.unitOfWork.users.count(false),
      this.unitOfWork.users.countSince(startOfMonth),
      this.unitOfWork.users.countSince(startOfWeek),
    ]);

    return {
      totalUsers,
      activeUsers,
      newUsersThisMonth,
      newUsersThisWeek,
    };
  }
}
