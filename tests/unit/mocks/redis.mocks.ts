import { vi } from 'bun/test';

interface RedisData {
  [key: string]: { value: string; expiry?: number };
}

export class MockRedis {
  private data: RedisData = {};
  private callbacks: Map<string, () => void> = new Map();

  get = vi.fn(async (key: string) => {
    const item = this.data[key];
    if (!item) return null;
    if (item.expiry && item.expiry < Date.now()) {
      delete this.data[key];
      return null;
    }
    return item.value;
  });

  set = vi.fn(async (key: string, value: string, options?: { EX?: number; PX?: number }) => {
    const expiry = options?.EX ? Date.now() + options.EX * 1000 : options?.PX ? Date.now() + options.PX : undefined;
    this.data[key] = { value, expiry };
    return 'OK';
  });

  setex = vi.fn(async (key: string, seconds: number, value: string) => this.set(key, value, { EX: seconds }));

  del = vi.fn(async (key: string) => {
    const existed = key in this.data;
    delete this.data[key];
    return existed ? 1 : 0;
  });

  incr = vi.fn(async (key: string) => {
    const current = parseInt((await this.get(key)) || '0', 10);
    const newValue = current + 1;
    await this.set(key, newValue.toString());
    return newValue;
  });

  incrby = vi.fn(async (key: string, increment: number) => {
    const current = parseInt((await this.get(key)) || '0', 10);
    const newValue = current + increment;
    await this.set(key, newValue.toString());
    return newValue;
  });

  expire = vi.fn(async (key: string, seconds: number) => {
    const item = this.data[key];
    if (!item) return 0;
    item.expiry = Date.now() + seconds * 1000;
    return 1;
  });

  ttl = vi.fn(async (key: string) => {
    const item = this.data[key];
    if (!item) return -2;
    if (!item.expiry) return -1;
    const remaining = Math.floor((item.expiry - Date.now()) / 1000);
    return remaining > 0 ? remaining : -2;
  });

  flushall = vi.fn(async () => {
    this.data = {};
    return 'OK';
  });

  keys = vi.fn(async (pattern: string) => {
    const regex = new RegExp(pattern.replace(/\*/g, '.*'));
    return Object.keys(this.data).filter(key => regex.test(key));
  });

  on = vi.fn((event: string, callback: () => void) => {
    this.callbacks.set(event, callback);
  });

  disconnect = vi.fn(async () => {
    this.callbacks.clear();
  });

  connect = vi.fn(async () => 'OK');

  // Helper for testing
  _clear() {
    this.data = {};
  }

  _size() {
    return Object.keys(this.data).length;
  }
}

export function createMockRedis(): MockRedis {
  return new MockRedis();
}
