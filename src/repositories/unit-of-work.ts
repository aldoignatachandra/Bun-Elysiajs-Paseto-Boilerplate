import type { Database } from './base.repository';
import type { PgTransaction } from 'drizzle-orm/pg-core';
import type { NewProduct, NewUserSession, NewUser, Product, UserSession, User } from '../database/schema';
import type { ProductCreateWithVariantsInput, ProductUpdateWithVariantsInput, ProductView } from './products.repository';
import { logger } from '../core/logging/logger';
import { ProductRepository } from './products.repository';
import { SessionRepository } from './sessions.repository';
import { UserRepository } from './users.repository';
import { eq, count } from 'drizzle-orm';
import { userActivityLogs } from '../database/schema';

/* eslint-disable @typescript-eslint/no-explicit-any */
type AnyPgTransaction = PgTransaction<any, any, any>;
/* eslint-enable @typescript-eslint/no-explicit-any */

export type TransactionClient = AnyPgTransaction & {
  commit(): Promise<void>;
  rollback(err?: Error): Promise<void>;
};

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

export class UnitOfWork implements AsyncDisposable {
  private _db: Database;
  private _transaction: TransactionClient | null = null;
  private _users: IUserRepository | null = null;
  private _sessions: ISessionRepository | null = null;
  private _products: IProductRepository | null = null;
  private _activityLogs: {
    create(data: {
      userId: string;
      action: string;
      entity: string;
      entityId?: string;
      details?: Record<string, unknown>;
      ipAddress?: string;
      userAgent?: string;
    }): Promise<void>;
    findByUserId(userId: string, options?: { limit?: number; offset?: number }): Promise<unknown[]>;
    countByUserId(userId: string): Promise<number>;
  } | null = null;

  constructor(db: Database) {
    this._db = db;
  }

  private get client(): Database | TransactionClient {
    return this._transaction ?? this._db;
  }

  get users(): IUserRepository {
    if (!this._users) {
      this._users = new UserRepository(this.client as Database);
    }
    return this._users;
  }

  get sessions(): ISessionRepository {
    if (!this._sessions) {
      this._sessions = new SessionRepository(this.client as Database);
    }
    return this._sessions;
  }

  get products(): IProductRepository {
    if (!this._products) {
      this._products = new ProductRepository(this.client as Database);
    }
    return this._products;
  }

  get activityLogs() {
    if (!this._activityLogs) {
      this._activityLogs = {
        create: async (data: {
          userId: string;
          action: string;
          entity: string;
          entityId?: string;
          details?: Record<string, unknown>;
          ipAddress?: string;
          userAgent?: string;
        }): Promise<void> => {
          await this.client.insert(userActivityLogs).values(data).returning();
        },
        findByUserId: (userId: string, options: { limit?: number; offset?: number } = {}) =>
          this.client
            .select()
            .from(userActivityLogs)
            .where(eq(userActivityLogs.userId, userId))
            .orderBy(userActivityLogs.createdAt)
            .limit(options.limit ?? 50)
            .offset(options.offset ?? 0),
        countByUserId: async (userId: string) => {
          const result = await this.client.select({ count: count() }).from(userActivityLogs).where(eq(userActivityLogs.userId, userId));
          return result[0]?.count ?? 0;
        },
      };
    }
    return this._activityLogs;
  }

  async beginTransaction(): Promise<void> {
    if (this._transaction) {
      throw new Error('Transaction already started');
    }

    // eslint-disable-next-line @typescript-eslint/require-await
    this._transaction = (await this._db.transaction(async tx => tx)) as TransactionClient;

    this._users = null;
    this._sessions = null;
    this._products = null;
    this._activityLogs = null;

    logger.debug('Transaction started');
  }

  async commit(): Promise<void> {
    if (!this._transaction) {
      throw new Error('No active transaction');
    }

    try {
      await this._transaction.commit();
      logger.debug('Transaction committed');
    } catch (error) {
      this._transaction.rollback();
      throw error;
    } finally {
      this._transaction = null;
      this._users = null;
      this._sessions = null;
      this._products = null;
      this._activityLogs = null;
    }
  }

  // eslint-disable-next-line @typescript-eslint/require-await
  async rollback(): Promise<void> {
    if (!this._transaction) {
      throw new Error('No active transaction');
    }

    this._transaction.rollback();
    logger.warn('Transaction rolled back');

    this._transaction = null;
    this._users = null;
    this._sessions = null;
    this._products = null;
    this._activityLogs = null;
  }

  get isTransactionActive(): boolean {
    return this._transaction !== null;
  }

  async [Symbol.asyncDispose](): Promise<void> {
    if (this._transaction) {
      await this.rollback();
    }
  }

  async withTransaction<T>(fn: (unitOfWork: UnitOfWork) => Promise<T>): Promise<T> {
    // eslint-disable-next-line @typescript-eslint/no-unsafe-return
    if (this._transaction) {
      return fn(this);
    }

    await this.beginTransaction();
    try {
      const result = await fn(this);
      await this.commit();
      return result;
    } catch (error) {
      await this.rollback();
      throw error;
    }
  }
}

export function createUnitOfWork(db: Database): UnitOfWork {
  return new UnitOfWork(db);
}
