import type { UnitOfWork } from '../repositories/unit-of-work';
import type { NewUserActivityLog } from '../database/schema';

export type ActivityAction =
  | 'user.registered'
  | 'user.logged_in'
  | 'user.logged_out'
  | 'user.password_changed'
  | 'user.profile_updated'
  | 'user.activated'
  | 'user.deactivated'
  | 'user.deleted'
  | 'user.restored'
  | 'product.created'
  | 'product.updated'
  | 'product.deleted'
  | 'product.restored'
  | 'product.stock_updated';

export type ActivityEntity = 'users' | 'products' | 'sessions';

export interface LogActivityInput {
  userId: string;
  action: ActivityAction;
  entity?: ActivityEntity;
  entityId?: string;
  ipAddress?: string;
  userAgent?: string;
  details?: Record<string, unknown>;
}

export interface GetActivityLogsInput {
  userId?: string;
  action?: string;
  entity?: string;
  includeDeleted?: boolean;
  onlyDeleted?: boolean;
  page?: number;
  limit?: number;
}

export interface ActivityLogItem {
  id: string;
  userId: string;
  action: string;
  entity: string | null;
  entityId: string | null;
  ipAddress: string | null;
  userAgent: string | null;
  details: Record<string, unknown> | null;
  createdAt: Date;
}

export interface GetActivityLogsOutput {
  logs: ActivityLogItem[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
    hasNextPage: boolean;
    hasPreviousPage: boolean;
  };
}

export interface IActivityService {
  logActivity(input: LogActivityInput): Promise<void>;
  getActivityLogs(input: GetActivityLogsInput): Promise<GetActivityLogsOutput>;
}

export class ActivityService implements IActivityService {
  private readonly unitOfWork: UnitOfWork;

  constructor(unitOfWork: UnitOfWork) {
    this.unitOfWork = unitOfWork;
  }

  async logActivity(input: LogActivityInput): Promise<void> {
    try {
      const activityData: NewUserActivityLog = {
        userId: input.userId,
        action: input.action,
        entity: input.entity || null,
        entityId: input.entityId || null,
        ipAddress: input.ipAddress || null,
        userAgent: input.userAgent || null,
        details: input.details ? JSON.stringify(input.details) : null,
      };

      await this.unitOfWork.activityLogs.create(activityData);
    } catch (error) {
      console.error('Failed to log activity:', error);
    }
  }

  async getActivityLogs(input: GetActivityLogsInput): Promise<GetActivityLogsOutput> {
    const page = Math.max(1, input.page || 1);
    const limit = Math.max(1, Math.min(100, input.limit || 10));

    // If userId is provided, use the optimized findByUserId method
    if (input.userId) {
      const [logs, total] = await Promise.all([
        this.unitOfWork.activityLogs.findByUserId(input.userId, { limit, offset: (page - 1) * limit }),
        this.unitOfWork.activityLogs.countByUserId(input.userId),
      ]);

      const totalPages = Math.ceil(total / limit);

      return {
        logs: logs.map(log => this.mapLogToItem(log as Record<string, unknown>)),
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

    // For non-userId queries, we'd need to implement a more complex query
    // For now, return empty result as this is typically not used without userId
    return {
      logs: [],
      pagination: {
        page,
        limit,
        total: 0,
        totalPages: 0,
        hasNextPage: false,
        hasPreviousPage: false,
      },
    };
  }

  private mapLogToItem(log: Record<string, unknown>): ActivityLogItem {
    return {
      id: log.id as string,
      userId: log.userId as string,
      action: log.action as string,
      entity: log.entity as string | null,
      entityId: log.entityId as string | null,
      ipAddress: log.ipAddress as string | null,
      userAgent: log.userAgent as string | null,
      details: this.parseDetails(log.details),
      createdAt: log.createdAt as Date,
    };
  }

  private parseDetails(details: unknown): Record<string, unknown> | null {
    if (!details) return null;
    if (typeof details === 'string') {
      try {
        return JSON.parse(details) as Record<string, unknown>;
      } catch {
        return null;
      }
    }
    return details as Record<string, unknown>;
  }
}
