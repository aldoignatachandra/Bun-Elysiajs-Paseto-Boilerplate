import { vi } from 'bun:test';

export type MockDb = {
  select: ReturnType<typeof vi.fn>;
  insert: ReturnType<typeof vi.fn>;
  update: ReturnType<typeof vi.fn>;
  delete: ReturnType<typeof vi.fn>;
  query: ReturnType<typeof vi.fn>;
};

export function createMockDb(): MockDb {
  return {
    select: vi.fn(),
    insert: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
    query: vi.fn(),
  };
}

export function createMockQueryBuilder() {
  return {
    from: vi.fn().mockReturnThis(),
    where: vi.fn().mockReturnThis(),
    orderBy: vi.fn().mockReturnThis(),
    limit: vi.fn().mockReturnThis(),
    offset: vi.fn().mockReturnThis(),
    leftJoin: vi.fn().mockReturnThis(),
    rightJoin: vi.fn().mockReturnThis(),
    innerJoin: vi.fn().mockReturnThis(),
    returning: vi.fn(),
    execute: vi.fn(),
    values: vi.fn().mockReturnThis(),
    set: vi.fn().mockReturnThis(),
  };
}
