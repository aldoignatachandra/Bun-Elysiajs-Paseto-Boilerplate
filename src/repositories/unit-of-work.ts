import type { Database } from './base.repository';
import type { User, Session, NewUser, NewSession } from '../database/schema';
import { logger } from '../core/logging/logger';

// Lazy-load repository classes to avoid circular dependencies
// eslint-disable-next-line @typescript-eslint/no-explicit-any
let UserRepositoryClass: any = null;
// eslint-disable-next-line @typescript-eslint/no-explicit-any
let SessionRepositoryClass: any = null;

// eslint-disable-next-line @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-assignment
function getUserRepositoryClass() {
  if (!UserRepositoryClass) {
    // eslint-disable-next-line @typescript-eslint/no-var-requires, @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access
    UserRepositoryClass = require('./users.repository').UserRepository;
  }
  // eslint-disable-next-line @typescript-eslint/no-unsafe-return
  return UserRepositoryClass;
}

// eslint-disable-next-line @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-assignment
function getSessionRepositoryClass() {
  if (!SessionRepositoryClass) {
    // eslint-disable-next-line @typescript-eslint/no-var-requires, @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access
    SessionRepositoryClass = require('./sessions.repository').SessionRepository;
  }
  // eslint-disable-next-line @typescript-eslint/no-unsafe-return
  return SessionRepositoryClass;
}

export interface IUserRepository {
  findById(id: string): Promise<User | null>;
  findByEmail(email: string): Promise<User | null>;
  create(user: NewUser): Promise<User>;
  update(id: string, data: Partial<User>): Promise<User | null>;
  delete(id: string): Promise<boolean>;
}

export interface ISessionRepository {
  findById(id: string): Promise<Session | null>;
  findByTokenId(tokenId: string): Promise<Session | null>;
  create(session: NewSession): Promise<Session>;
  revoke(id: string): Promise<boolean>;
  deleteExpired(): Promise<number>;
}

export class UnitOfWork implements AsyncDisposable {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private transaction: any = null;
  // eslint-disable-next-line @typescript-eslint/no-redundant-type-constituents
  private _users: InstanceType<ReturnType<typeof getUserRepositoryClass>> | null = null;
  // eslint-disable-next-line @typescript-eslint/no-redundant-type-constituents
  private _sessions: InstanceType<ReturnType<typeof getSessionRepositoryClass>> | null = null;

  constructor(private db: Database) {}

  get users(): InstanceType<ReturnType<typeof getUserRepositoryClass>> {
    if (!this._users) {
      // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access
      const UserRepoClass = getUserRepositoryClass();
      // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-call
      this._users = new UserRepoClass(this.db);
    }
    // eslint-disable-next-line @typescript-eslint/no-unsafe-return
    return this._users;
  }

  get sessions(): InstanceType<ReturnType<typeof getSessionRepositoryClass>> {
    if (!this._sessions) {
      // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access
      const SessionRepoClass = getSessionRepositoryClass();
      // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-call
      this._sessions = new SessionRepoClass(this.db);
    }
    // eslint-disable-next-line @typescript-eslint/no-unsafe-return
    return this._sessions;
  }

  beginTransaction(): void {
    if (this.transaction) {
      throw new Error('Transaction already started');
    }
    // Drizzle transaction implementation
    // this.transaction = await this.db.transaction(...);
  }

  commit(): void {
    if (!this.transaction) {
      throw new Error('No active transaction');
    }
    // Commit logic
  }

  rollback(): void {
    if (!this.transaction) {
      throw new Error('No active transaction');
    }
    // Rollback logic
    logger.warn('Transaction rolled back');
  }

  // eslint-disable-next-line @typescript-eslint/require-await
  async [Symbol.asyncDispose](): Promise<void> {
    if (this.transaction) {
      this.rollback();
    }
  }
}

export function createUnitOfWork(db: Database): UnitOfWork {
  return new UnitOfWork(db);
}
