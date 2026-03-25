import type { Database } from './base.repository';
import type { NewProduct, NewUserSession, NewUser, Product, UserSession, User } from '../database/schema';
import type { ProductCreateWithVariantsInput, ProductUpdateWithVariantsInput, ProductView } from './products.repository';
import { logger } from '../core/logging/logger';
import { ProductRepository } from './products.repository';
import { SessionRepository } from './sessions.repository';
import { UserRepository } from './users.repository';
import { eq, count } from 'drizzle-orm';
import { userActivityLogs } from '../database/schema';

/**
 * Unit of Work Pattern Implementation
 *
 * Provides a way to manage database transactions and repository instances.
 * Supports both direct database operations and transactional operations.
 *
 * Usage:
 * ```typescript
 * const uow = new UnitOfWork(db);
 *
 * // With transaction (recommended for multi-step operations)
 * await uow.withTransaction(async (tx) => {
 *   await uow.users.create(userData);
 *   await uow.sessions.create(sessionData);
 * });
 *
 * // Or without transaction (for single operations)
 * const user = await uow.users.findByEmail('test@example.com');
 * ```
 */

export interface IUserRepository {
  findAll(options?: { limit?: number; offset?: number; search?: string; includeDeleted?: boolean; onlyDeleted?: boolean }): Promise<User[]>;
  findById(id: string, includeDeleted?: boolean): Promise<User | null>;
  findByEmail(email: string): Promise<User | null>;
  findByUsername(username: string): Promise<User | null>;
  create(user: NewUser): Promise<User>;
  update(id: string, data: Partial<User>): Promise<User | null>;
  setActive(id: string, active: boolean): Promise<boolean>;
  softDelete(id: string): Promise<boolean>;
  restore(id: string): Promise<boolean>;
  delete(id: string): Promise<boolean>;
  count(includeDeleted?: boolean): Promise<number>;
  countSince(date: Date): Promise<number>;
}

export interface ISessionRepository {
  findById(id: string): Promise<UserSession | null>;
  findByToken(token: string): Promise<UserSession | null>;
  findByTokenId(tokenId: string): Promise<UserSession | null>;
  findByUserId(userId: string): Promise<UserSession[]>;
  create(session: NewUserSession): Promise<UserSession>;
  revoke(id: string): Promise<boolean>;
  revokeAllForUser(userId: string): Promise<boolean>;
  deleteByUserId(userId: string): Promise<boolean>;
  deleteExpired(): Promise<number>;
}

export interface IProductRepository {
  findAll(options?: { limit?: number; offset?: number; includeDeleted?: boolean }): Promise<Product[]>;
  findWithFilters(options: {
    limit?: number;
    offset?: number;
    search?: string;
    includeDeleted?: boolean;
    onlyDeleted?: boolean;
    hasVariant?: boolean;
    inStock?: boolean;
    minPrice?: number;
    maxPrice?: number;
    includeVariants?: boolean;
  }): Promise<{ data: ProductView[]; total: number }>;
  findById(id: string, includeDeleted?: boolean): Promise<Product | null>;
  findByIdWithVariants(id: string, includeDeleted?: boolean): Promise<ProductView | null>;
  create(data: NewProduct): Promise<Product>;
  createWithVariants(data: ProductCreateWithVariantsInput): Promise<ProductView>;
  update(id: string, data: Partial<Product>): Promise<Product | null>;
  updateWithVariants(id: string, data: ProductUpdateWithVariantsInput): Promise<ProductView | null>;
  updateStock(id: string, stock: number): Promise<Product | null>;
  softDelete(id: string): Promise<boolean>;
  restore(id: string): Promise<boolean>;
  delete(id: string): Promise<boolean>;
}

export class UnitOfWork {
  private _db: Database;
  private _users: IUserRepository | null = null;
  private _sessions: ISessionRepository | null = null;
  private _products: IProductRepository | null = null;
  private _activityLogs: {
    create(data: {
      userId: string;
      action: string;
      entity?: string | null;
      entityId?: string | null;
      details?: Record<string, unknown> | null;
      ipAddress?: string | null;
      userAgent?: string | null;
    }): Promise<void>;
    findByUserId(userId: string, options?: { limit?: number; offset?: number }): Promise<unknown[]>;
    countByUserId(userId: string): Promise<number>;
  } | null = null;

  constructor(db: Database) {
    this._db = db;
  }

  get users(): IUserRepository {
    if (!this._users) {
      this._users = new UserRepository(this._db);
    }
    return this._users;
  }

  get sessions(): ISessionRepository {
    if (!this._sessions) {
      this._sessions = new SessionRepository(this._db);
    }
    return this._sessions;
  }

  get products(): IProductRepository {
    if (!this._products) {
      this._products = new ProductRepository(this._db);
    }
    return this._products;
  }

  get activityLogs() {
    if (!this._activityLogs) {
      this._activityLogs = {
        create: async (data: {
          userId: string;
          action: string;
          entity?: string | null;
          entityId?: string | null;
          details?: Record<string, unknown> | null;
          ipAddress?: string | null;
          userAgent?: string | null;
        }): Promise<void> => {
          await this._db.insert(userActivityLogs).values(data).returning();
        },
        findByUserId: (userId: string, options: { limit?: number; offset?: number } = {}) =>
          this._db
            .select()
            .from(userActivityLogs)
            .where(eq(userActivityLogs.userId, userId))
            .orderBy(userActivityLogs.createdAt)
            .limit(options.limit ?? 50)
            .offset(options.offset ?? 0),
        countByUserId: async (userId: string) => {
          const result = await this._db.select({ count: count() }).from(userActivityLogs).where(eq(userActivityLogs.userId, userId));
          return result[0]?.count ?? 0;
        },
      };
    }
    return this._activityLogs;
  }

  /**
   * Execute operations within a database transaction
   *
   * This is the recommended way to perform multi-step database operations.
   * The transaction will automatically commit if the callback succeeds,
   * or rollback if it throws an error.
   *
   * @param fn - Callback function that receives a transaction unit of work
   * @returns The result of the callback function
   * @throws Re-throws any error from the callback after rolling back
   *
   * @example
   * ```typescript
   * await uow.withTransaction(async (txUow) => {
   *   const user = await txUow.users.create(userData);
   *   await txUow.sessions.create(sessionData);
   *   return user;
   * });
   * ```
   */
  async withTransaction<T>(fn: (txUow: TransactionUnitOfWork) => Promise<T>): Promise<T> {
    logger.debug('Starting transaction');

    try {
      // Use Drizzle's transaction API directly
      // The callback receives the transaction object (tx) which should be used
      // for all database operations within the transaction
      // eslint-disable-next-line @typescript-eslint/no-unsafe-return
      return (await this._db.transaction(async tx => {
        // Create new repository instances with transaction
        const txUsers = new UserRepository(tx as Database);
        const txSessions = new SessionRepository(tx as Database);
        const txProducts = new ProductRepository(tx as Database);
        const txActivityLogs = {
          create: async (data: {
            userId: string;
            action: string;
            entity?: string | null;
            entityId?: string | null;
            details?: Record<string, unknown> | null;
            ipAddress?: string | null;
            userAgent?: string | null;
          }): Promise<void> => {
            await tx.insert(userActivityLogs).values(data).returning();
          },
          findByUserId: (userId: string, options: { limit?: number; offset?: number } = {}) =>
            tx
              .select()
              .from(userActivityLogs)
              .where(eq(userActivityLogs.userId, userId))
              .orderBy(userActivityLogs.createdAt)
              .limit(options.limit ?? 50)
              .offset(options.offset ?? 0),
          countByUserId: async (userId: string) => {
            const result = await tx.select({ count: count() }).from(userActivityLogs).where(eq(userActivityLogs.userId, userId));
            return result[0]?.count ?? 0;
          },
        };

        // Create a new UnitOfWork with transaction context
        const txUow = new TransactionUnitOfWork(tx as Database, txUsers, txSessions, txProducts, txActivityLogs);

        // Execute the callback with the transaction-aware unit of work
        // eslint-disable-next-line @typescript-eslint/no-unsafe-return
        return await fn(txUow);
      })) as T;
    } catch (error) {
      logger.error('Transaction failed', { message: error instanceof Error ? error.message : 'Unknown error' });
      throw error;
    }
  }
}

/**
 * Transaction-aware Unit of Work
 *
 * Used internally during transactions to provide repository instances
 * that use the transaction client instead of the main database connection.
 * Exported for type annotations in service callbacks.
 */
export class TransactionUnitOfWork {
  private _users: IUserRepository;
  private _sessions: ISessionRepository;
  private _products: IProductRepository;
  private _activityLogs: {
    create(data: {
      userId: string;
      action: string;
      entity?: string | null;
      entityId?: string | null;
      details?: Record<string, unknown> | null;
      ipAddress?: string | null;
      userAgent?: string | null;
    }): Promise<void>;
    findByUserId(userId: string, options?: { limit?: number; offset?: number }): Promise<unknown[]>;
    countByUserId(userId: string): Promise<number>;
  };

  constructor(
    _db: Database,
    users: IUserRepository,
    sessions: ISessionRepository,
    products: IProductRepository,
    activityLogs: {
      create(data: {
        userId: string;
        action: string;
        entity?: string | null;
        entityId?: string | null;
        details?: Record<string, unknown> | null;
        ipAddress?: string | null;
        userAgent?: string | null;
      }): Promise<void>;
      findByUserId(userId: string, options?: { limit?: number; offset?: number }): Promise<unknown[]>;
      countByUserId(userId: string): Promise<number>;
    }
  ) {
    this._users = users;
    this._sessions = sessions;
    this._products = products;
    this._activityLogs = activityLogs;
  }

  get users(): IUserRepository {
    return this._users;
  }

  get sessions(): ISessionRepository {
    return this._sessions;
  }

  get products(): IProductRepository {
    return this._products;
  }

  get activityLogs() {
    return this._activityLogs;
  }

  /**
   * Execute callback within existing transaction context
   *
   * Since we're already in a transaction, this just executes the callback directly
   * with the current transaction context.
   */
  async withTransaction<T>(fn: (uow: TransactionUnitOfWork) => Promise<T>): Promise<T> {
    // We're already in a transaction, just execute the callback
    return await fn(this);
  }
}

export function createUnitOfWork(db: Database): UnitOfWork {
  return new UnitOfWork(db);
}
