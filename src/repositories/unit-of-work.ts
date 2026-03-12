import type { Database } from './base.repository';
import type { User, Session, Product, NewUser, NewSession, NewProduct } from '../database/schema';
import { logger } from '../core/logging/logger';
import { UserRepository } from './users.repository';
import { SessionRepository } from './sessions.repository';
import { ProductRepository } from './products.repository';

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
  findAll(options?: {
    limit?: number;
    offset?: number;
    search?: string;
    status?: 'ACTIVE' | 'INACTIVE';
    includeDeleted?: boolean;
    onlyDeleted?: boolean;
  }): Promise<Product[]>;
  findById(id: string, includeDeleted?: boolean): Promise<Product | null>;
  create(data: NewProduct): Promise<Product>;
  update(id: string, data: Partial<Product>): Promise<Product | null>;
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
