/* eslint-disable @typescript-eslint/no-explicit-any */
import { describe, it, expect, beforeEach, jest } from 'bun:test';
import { ActivityService } from '../../../src/services/activity.service';

describe('ActivityService', () => {
  let service: ActivityService;
  let mockUnitOfWork: any;

  const mockUserId = '123e4567-e89b-12d3-a456-426614174000';
  const mockActivityLog = {
    id: 'log-123',
    userId: mockUserId,
    action: 'user.logged_in',
    entity: 'users',
    entityId: mockUserId,
    ipAddress: '127.0.0.1',
    userAgent: 'Mozilla/5.0',
    details: { method: 'email_password' },
    createdAt: new Date(),
  };

  beforeEach(() => {
    mockUnitOfWork = {
      activityLogs: {
        create: jest.fn().mockResolvedValue([mockActivityLog]),
        findByUserId: jest.fn().mockResolvedValue([mockActivityLog]),
        countByUserId: jest.fn().mockResolvedValue(1),
      },
    };

    service = new ActivityService(mockUnitOfWork);
  });

  describe('logActivity', () => {
    it('should log activity successfully with all fields', async () => {
      const input = {
        userId: mockUserId,
        action: 'user.logged_in' as const,
        entity: 'users' as const,
        entityId: mockUserId,
        ipAddress: '127.0.0.1',
        userAgent: 'Mozilla/5.0',
        details: { method: 'email_password' },
      };

      await service.logActivity(input);

      expect(mockUnitOfWork.activityLogs.create).toHaveBeenCalledWith(
        expect.objectContaining({
          userId: mockUserId,
          action: 'user.logged_in',
          entity: 'users',
          entityId: mockUserId,
          ipAddress: '127.0.0.1',
          userAgent: 'Mozilla/5.0',
          details: JSON.stringify({ method: 'email_password' }),
        })
      );
    });

    it('should log activity successfully with only required fields', async () => {
      const input = {
        userId: mockUserId,
        action: 'user.logged_in' as const,
      };

      await service.logActivity(input);

      expect(mockUnitOfWork.activityLogs.create).toHaveBeenCalledWith(
        expect.objectContaining({
          userId: mockUserId,
          action: 'user.logged_in',
          entity: null,
          entityId: null,
          ipAddress: null,
          userAgent: null,
          details: null,
        })
      );
    });

    it('should handle missing optional fields gracefully', async () => {
      const input = {
        userId: mockUserId,
        action: 'user.profile_updated' as const,
        entity: 'users' as const,
      };

      await service.logActivity(input);

      expect(mockUnitOfWork.activityLogs.create).toHaveBeenCalledWith(
        expect.objectContaining({
          userId: mockUserId,
          action: 'user.profile_updated',
          entity: 'users',
        })
      );
    });

    it('should handle errors gracefully', async () => {
      const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
      mockUnitOfWork.activityLogs.create.mockRejectedValueOnce(new Error('Database error'));

      const input = {
        userId: mockUserId,
        action: 'user.logged_in' as const,
      };

      // Service catches errors and logs them, so it should resolve without throwing
      await service.logActivity(input);
      expect(consoleErrorSpy).toHaveBeenCalledWith('Failed to log activity:', expect.any(Error));

      consoleErrorSpy.mockRestore();
    });

    it('should serialize details object to JSON string', async () => {
      const input = {
        userId: mockUserId,
        action: 'product.created' as const,
        entity: 'products' as const,
        entityId: 'product-123',
        details: {
          productName: 'Test Product',
          price: 99.99,
          category: 'electronics',
        },
      };

      await service.logActivity(input);

      expect(mockUnitOfWork.activityLogs.create).toHaveBeenCalledWith(
        expect.objectContaining({
          details: JSON.stringify({
            productName: 'Test Product',
            price: 99.99,
            category: 'electronics',
          }),
        })
      );
    });
  });

  describe('getActivityLogs', () => {
    it('should retrieve activities with default pagination', async () => {
      mockUnitOfWork.activityLogs.findByUserId.mockResolvedValueOnce([mockActivityLog]);
      mockUnitOfWork.activityLogs.countByUserId.mockResolvedValueOnce(1);

      const result = await service.getActivityLogs({ userId: mockUserId });

      expect(result.logs).toHaveLength(1);
      expect(result.pagination).toEqual({
        page: 1,
        limit: 10,
        total: 1,
        totalPages: 1,
        hasNextPage: false,
        hasPreviousPage: false,
      });
    });

    it('should retrieve activities with custom pagination', async () => {
      const manyLogs = Array(10)
        .fill(null)
        .map((_, i) => ({
          ...mockActivityLog,
          id: `log-${i}`,
        }));
      mockUnitOfWork.activityLogs.findByUserId.mockResolvedValueOnce(manyLogs);
      mockUnitOfWork.activityLogs.countByUserId.mockResolvedValueOnce(25);

      const result = await service.getActivityLogs({ userId: mockUserId, page: 2, limit: 10 });

      expect(result.logs).toHaveLength(10);
      expect(result.pagination).toEqual({
        page: 2,
        limit: 10,
        total: 25,
        totalPages: 3,
        hasNextPage: true,
        hasPreviousPage: true,
      });
    });

    it('should limit pagination to maximum 100 per page', async () => {
      mockUnitOfWork.activityLogs.findByUserId.mockResolvedValueOnce([]);
      mockUnitOfWork.activityLogs.countByUserId.mockResolvedValueOnce(0);

      const result = await service.getActivityLogs({ userId: mockUserId, limit: 200 });

      expect(result.pagination.limit).toBe(100);
    });

    it('should enforce minimum page number of 1', async () => {
      mockUnitOfWork.activityLogs.findByUserId.mockResolvedValueOnce([]);
      mockUnitOfWork.activityLogs.countByUserId.mockResolvedValueOnce(0);

      const result = await service.getActivityLogs({ userId: mockUserId, page: 0 });

      expect(result.pagination.page).toBe(1);
    });

    it('should enforce minimum limit of 1', async () => {
      mockUnitOfWork.activityLogs.findByUserId.mockResolvedValueOnce([]);
      mockUnitOfWork.activityLogs.countByUserId.mockResolvedValueOnce(0);

      const result = await service.getActivityLogs({ userId: mockUserId, limit: 0 });

      expect(result.pagination.limit).toBeGreaterThanOrEqual(1);
    });

    it('should handle empty result set', async () => {
      mockUnitOfWork.activityLogs.findByUserId.mockResolvedValueOnce([]);
      mockUnitOfWork.activityLogs.countByUserId.mockResolvedValueOnce(0);

      const result = await service.getActivityLogs({ userId: 'nonexistent-user' });

      expect(result.logs).toHaveLength(0);
      expect(result.pagination.total).toBe(0);
      expect(result.pagination.totalPages).toBe(0);
    });

    it('should return empty result when userId is not provided', async () => {
      const result = await service.getActivityLogs({});

      expect(result.logs).toHaveLength(0);
      expect(result.pagination.total).toBe(0);
    });

    it('should parse details JSON string to object', async () => {
      const logWithDetails = {
        ...mockActivityLog,
        details: JSON.stringify({ key: 'value' }),
      };
      mockUnitOfWork.activityLogs.findByUserId.mockResolvedValueOnce([logWithDetails]);
      mockUnitOfWork.activityLogs.countByUserId.mockResolvedValueOnce(1);

      const result = await service.getActivityLogs({ userId: mockUserId });

      expect(result.logs[0].details).toEqual({ key: 'value' });
    });

    it('should handle invalid JSON in details gracefully', async () => {
      const logWithInvalidDetails = {
        ...mockActivityLog,
        details: 'not-valid-json',
      };
      mockUnitOfWork.activityLogs.findByUserId.mockResolvedValueOnce([logWithInvalidDetails]);
      mockUnitOfWork.activityLogs.countByUserId.mockResolvedValueOnce(1);

      const result = await service.getActivityLogs({ userId: mockUserId });

      expect(result.logs[0].details).toBeNull();
    });
  });
});
