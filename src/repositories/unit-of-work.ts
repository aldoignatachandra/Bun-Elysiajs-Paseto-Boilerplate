import type { Database } from './base.repository';
import type { User, Session, Product, NewUser, NewSession, NewProduct } from '../database/schema';
import { logger } from '../core/logging/logger';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
let UserRepositoryClass: any = null;
// eslint-disable-next-line @typescript-eslint/no-explicit-any
let SessionRepositoryClass: any = null;
// eslint-disable-next-line @typescript-eslint/no-explicit-any
let ProductRepositoryClass: any = null;

function getUserRepositoryClass() {
  if (!UserRepositoryClass) {
    // eslint-disable-next-line @typescript-eslint/no-var-requires, @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access
    UserRepositoryClass = require('./users.repository').UserRepository;
  }
  return UserRepositoryClass;
}

function getSessionRepositoryClass() {
  if (!SessionRepositoryClass) {
    // eslint-disable-next-line @typescript-eslint/no-var-requires, @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access
    SessionRepositoryClass = require('./sessions.repository').SessionRepository;
  }
  return SessionRepositoryClass;
}

function getProductRepositoryClass() {
  if (!ProductRepositoryClass) {
    // eslint-disable-next-line @typescript-eslint/no-var-requires, @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access
    ProductRepositoryClass = require('./products.repository').ProductRepository;
  }
  return ProductRepositoryClass;
}

export interface IUserRepository {
  findAll(options?: {
    limit?: number;
    offset?: number;
    search?: string;
    includeDeleted?: boolean;
    onlyDeleted?: boolean;
  }): Promise<User[]>;
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
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private transaction: any = null;
  // eslint-disable-next-line @typescript-eslint/no-redundant-type-constituents
  private _users: InstanceType<ReturnType<typeof getUserRepositoryClass>> | null = null;
  // eslint-disable-next-line @typescript-eslint/no-redundant-type-constituents
  private _sessions: InstanceType<ReturnType<typeof getSessionRepositoryClass>> | null = null;
  // eslint-disable-next-line @typescript-eslint/no-redundant-type-constituents
  private _products: InstanceType<ReturnType<typeof getProductRepositoryClass>> | null = null;

  constructor(private db: Database) {}

  get users(): InstanceType<ReturnType<typeof getUserRepositoryClass>> {
    if (!this._users) {
      // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
      const UserRepoClass = getUserRepositoryClass();
      // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-call
      this._users = new UserRepoClass(this.db);
    }
    return this._users;
  }

  get sessions(): InstanceType<ReturnType<typeof getSessionRepositoryClass>> {
    if (!this._sessions) {
      // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
      const SessionRepoClass = getSessionRepositoryClass();
      // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-call
      this._sessions = new SessionRepoClass(this.db);
    }
    return this._sessions;
  }

  get products(): InstanceType<ReturnType<typeof getProductRepositoryClass>> {
    if (!this._products) {
      // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
      const ProductRepoClass = getProductRepositoryClass();
      // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-call
      this._products = new ProductRepoClass(this.db);
    }
    return this._products;
  }

  beginTransaction(): void {
    if (this.transaction) {
      throw new Error('Transaction already started');
    }
  }

  commit(): void {
    if (!this.transaction) {
      throw new Error('No active transaction');
    }
  }

  rollback(): void {
    if (!this.transaction) {
      throw new Error('No active transaction');
    }
    logger.warn('Transaction rolled back');
  }

  async [Symbol.asyncDispose](): Promise<void> {
    if (this.transaction) {
      this.rollback();
    }
  }
}

export function createUnitOfWork(db: Database): UnitOfWork {
  return new UnitOfWork(db);
}
