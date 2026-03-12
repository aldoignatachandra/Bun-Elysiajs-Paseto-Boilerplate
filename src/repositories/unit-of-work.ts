import type { Database } from './base.repository';
import type { NewProduct, NewSession, NewUser, Product, Session, User } from '../database/schema';
import type { ProductCreateWithVariantsInput, ProductUpdateWithVariantsInput, ProductView } from './products.repository';
import { logger } from '../core/logging/logger';
import { ProductRepository } from './products.repository';
import { SessionRepository } from './sessions.repository';
import { UserRepository } from './users.repository';

export interface IUserRepository {
  findAll(options?: { limit?: number; offset?: number; search?: string; includeDeleted?: boolean; onlyDeleted?: boolean }): Promise<User[]>;
  findById(id: string, includeDeleted?: boolean): Promise<User | null>;
  findByEmail(email: string): Promise<User | null>;
  create(user: NewUser): Promise<User>;
  update(id: string, data: Partial<User>): Promise<User | null>;
  setActive(id: string, active: boolean): Promise<boolean>;
  softDelete(id: string): Promise<boolean>;
  restore(id: string): Promise<boolean>;
  delete(id: string): Promise<boolean>;
}

export interface ISessionRepository {
  findById(id: string): Promise<Session | null>;
  findByTokenId(tokenId: string): Promise<Session | null>;
  create(session: NewSession): Promise<Session>;
  revoke(id: string): Promise<boolean>;
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
  private transactionActive = false;
  private _users: IUserRepository | null = null;
  private _sessions: ISessionRepository | null = null;
  private _products: IProductRepository | null = null;

  constructor(private db: Database) {}

  get users(): IUserRepository {
    if (!this._users) {
      this._users = new UserRepository(this.db);
    }

    return this._users;
  }

  get sessions(): ISessionRepository {
    if (!this._sessions) {
      this._sessions = new SessionRepository(this.db);
    }

    return this._sessions;
  }

  get products(): IProductRepository {
    if (!this._products) {
      this._products = new ProductRepository(this.db);
    }

    return this._products;
  }

  beginTransaction(): void {
    if (this.transactionActive) {
      throw new Error('Transaction already started');
    }

    this.transactionActive = true;
  }

  commit(): void {
    if (!this.transactionActive) {
      throw new Error('No active transaction');
    }

    this.transactionActive = false;
  }

  rollback(): void {
    if (!this.transactionActive) {
      throw new Error('No active transaction');
    }

    this.transactionActive = false;
    logger.warn('Transaction rolled back');
  }

  [Symbol.asyncDispose](): Promise<void> {
    if (this.transactionActive) {
      this.rollback();
    }

    return Promise.resolve();
  }
}

export function createUnitOfWork(db: Database): UnitOfWork {
  return new UnitOfWork(db);
}
