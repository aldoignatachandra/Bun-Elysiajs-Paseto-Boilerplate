import type { UsersService } from '../services/users.service';
import type { AuthContext } from '../middlewares/auth.middleware';
import { logger } from '../core/logging/logger';
import { NotFoundError, AuthenticationError, UnauthorizedError, BadRequestError, InternalServerError, ConflictError } from '../core/errors/app-error';

export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  async getMe(authContext: AuthContext) {
    if (!authContext.user) {
      throw new UnauthorizedError('Authentication required');
    }

    try {
      return await this.usersService.getProfile({
        userId: authContext.user.id,
      });
    } catch (error) {
      if (error instanceof NotFoundError) {
        throw error;
      }

      logger.error('Get profile error', { error, userId: authContext.user.id });
      throw new InternalServerError('Failed to get profile');
    }
  }

  async updateMe(dto: { name?: string; username?: string }, authContext: AuthContext) {
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

  async changePassword(dto: { currentPassword: string; newPassword: string }, authContext: AuthContext) {
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

  async getUsers(
    query: {
      page: number;
      limit: number;
      search?: string;
      include_deleted?: boolean;
      only_deleted?: boolean;
    },
    authContext: AuthContext
  ) {
    if (!authContext.user) {
      throw new UnauthorizedError('Authentication required');
    }

    try {
      return await this.usersService.getUsers({
        page: query.page,
        limit: query.limit,
        search: query.search,
        includeDeleted: query.include_deleted,
        onlyDeleted: query.only_deleted,
      });
    } catch (error) {
      logger.error('List users error', { error });
      throw new InternalServerError('Failed to list users');
    }
  }

  async getUserById(id: string, authContext: AuthContext) {
    if (!authContext.user) {
      throw new UnauthorizedError('Authentication required');
    }

    try {
      return await this.usersService.getProfile({
        userId: id,
      });
    } catch (error) {
      if (error instanceof NotFoundError) {
        throw error;
      }

      logger.error('Get user by ID error', { error, userId: id });
      throw new InternalServerError('Failed to get user');
    }
  }

  async createUser(
    dto: {
      email: string;
      username: string;
      password: string;
      name?: string;
      role?: string;
    },
    authContext: AuthContext
  ) {
    if (!authContext.user) {
      throw new UnauthorizedError('Authentication required');
    }

    try {
      const user = await this.usersService.createUser(dto);

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

  async updateUser(
    id: string,
    dto: {
      email?: string;
      username?: string;
      name?: string;
      role?: string;
    },
    authContext: AuthContext
  ) {
    if (!authContext.user) {
      throw new UnauthorizedError('Authentication required');
    }

    try {
      const user = await this.usersService.updateUser({ id, ...dto });

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

  async deleteUser(id: string, force: boolean, authContext: AuthContext) {
    if (!authContext.user) {
      throw new UnauthorizedError('Authentication required');
    }

    try {
      const result = await this.usersService.deleteUser(id, force);

      logger.info('User deleted', { userId: id, deletedBy: authContext.user.id, force });
      return result;
    } catch (error) {
      if (error instanceof NotFoundError) {
        throw error;
      }

      logger.error('Delete user error', { error, userId: id });
      throw new InternalServerError('Failed to delete user');
    }
  }

  async activateUser(id: string, authContext: AuthContext) {
    if (!authContext.user) {
      throw new UnauthorizedError('Authentication required');
    }

    try {
      return await this.usersService.activateUser(id);
    } catch (error) {
      if (error instanceof NotFoundError) {
        throw error;
      }

      logger.error('Activate user error', { error, userId: id });
      throw new InternalServerError('Failed to activate user');
    }
  }

  async deactivateUser(id: string, authContext: AuthContext) {
    if (!authContext.user) {
      throw new UnauthorizedError('Authentication required');
    }

    try {
      return await this.usersService.deactivateUser(id);
    } catch (error) {
      if (error instanceof NotFoundError) {
        throw error;
      }

      logger.error('Deactivate user error', { error, userId: id });
      throw new InternalServerError('Failed to deactivate user');
    }
  }

  async restoreUser(id: string, authContext: AuthContext) {
    if (!authContext.user) {
      throw new UnauthorizedError('Authentication required');
    }

    try {
      return await this.usersService.restoreUser(id);
    } catch (error) {
      if (error instanceof NotFoundError) {
        throw error;
      }

      logger.error('Restore user error', { error, userId: id });
      throw new InternalServerError('Failed to restore user');
    }
  }

  async getActivityLogs(query: { page: number; limit: number; user_id?: string; action?: string; resource?: string }, authContext: AuthContext) {
    if (!authContext.user) {
      throw new UnauthorizedError('Authentication required');
    }

    try {
      return await this.usersService.getActivityLogs({
        page: query.page,
        limit: query.limit,
        userId: query.user_id,
        action: query.action,
        resource: query.resource,
      });
    } catch (error) {
      logger.error('Get activity logs error', { error });
      throw new InternalServerError('Failed to get activity logs');
    }
  }

  async getUserStats(authContext: AuthContext) {
    if (!authContext.user) {
      throw new UnauthorizedError('Authentication required');
    }

    try {
      return await this.usersService.getUserStats();
    } catch (error) {
      logger.error('Get user stats error', { error });
      throw new InternalServerError('Failed to get user statistics');
    }
  }
}
