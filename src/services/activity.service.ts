import type { UnitOfWork } from '../repositories/unit-of-work';
import { ActivityLogRepository, type IActivityLogRepository, type ActivityLogListOptions } from '../repositories/activity.repository';
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
  private readonly activityLogRepository: IActivityLogRepository;

  constructor(unitOfWork: UnitOfWork) {
    this.activityLogRepository = new ActivityLogRepository(unitOfWork as unknown as ActivityLogRepository['db']);
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

      await this.activityLogRepository.create(activityData);
    } catch (error) {
      console.error('Failed to log activity:', error);
    }
  }

  async getActivityLogs(input: GetActivityLogsInput): Promise<GetActivityLogsOutput> {
    const page = Math.max(1, input.page || 1);
    const limit = Math.max(1, Math.min(100, input.limit || 10));
    const offset = (page - 1) * limit;

    const options: ActivityLogListOptions = {
      userId: input.userId,
      action: input.action,
      entity: input.entity,
      includeDeleted: input.includeDeleted,
      onlyDeleted: input.onlyDeleted,
      limit,
      offset,
    };

    const [logs, allLogs] = await Promise.all([
      this.activityLogRepository.findAll(options),
      this.activityLogRepository.findAll({
        userId: input.userId,
        action: input.action,
        entity: input.entity,
        includeDeleted: input.includeDeleted,
        onlyDeleted: input.onlyDeleted,
      }),
    ]);

    const total = allLogs.length;
    const totalPages = Math.ceil(total / limit);

    return {
      logs: logs.map(log => ({
        id: log.id,
        userId: log.userId,
        action: log.action,
        entity: log.entity,
        entityId: log.entityId,
        ipAddress: log.ipAddress,
        userAgent: log.userAgent,
        details: log.details as Record<string, unknown> | null,
        createdAt: log.createdAt,
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
}
