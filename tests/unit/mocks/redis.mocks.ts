import { vi } from 'bun:test';

interface RedisDataItem {
  value: string;
  expiry?: number;
  score?: number;
}

interface RedisData {
  [key: string]: RedisDataItem | { value: string; expiry?: number };
}

export class MockRedis {
  private data: RedisData = {};
  private callbacks: Map<string, () => void> = new Map();
  // Sorted sets for rate limiting (key -> array of {score, member})
  private sortedSets: Map<string, Array<{ score: number; member: string }>> = new Map();

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
    this.sortedSets.clear();
    // Clear all mock call histories
    this.get.mockClear();
    this.set.mockClear();
    this.setex.mockClear();
    this.del.mockClear();
    this.incr.mockClear();
    this.incrby.mockClear();
    this.expire.mockClear();
    this.ttl.mockClear();
    this.flushall.mockClear();
    this.keys.mockClear();
    this.on.mockClear();
    this.disconnect.mockClear();
    this.connect.mockClear();
    this.zadd.mockClear();
    this.zcard.mockClear();
    this.zremrangebyscore.mockClear();
    this.multi.mockClear();
    this.ping.mockClear();
  }

  // Debug helper to check sorted set size
  _sortedSetSize(key: string): number {
    const set = this.sortedSets.get(key);
    return set ? set.length : 0;
  }

  _size() {
    return Object.keys(this.data).length;
  }

  // Sorted set methods for rate limiting
  zadd = vi.fn(async (key: string, score: number, member: string) => {
    if (!this.sortedSets.has(key)) {
      this.sortedSets.set(key, []);
    }
    const set = this.sortedSets.get(key)!;
    // Remove existing member if present
    const index = set.findIndex(item => item.member === member);
    if (index >= 0) {
      set.splice(index, 1);
    }
    set.push({ score, member });
    // Sort by score
    set.sort((a, b) => a.score - b.score);
    return 1;
  });

  zcard = vi.fn(async (key: string) => {
    const set = this.sortedSets.get(key);
    return set ? set.length : 0;
  });

  zremrangebyscore = vi.fn(async (key: string, min: number, max: number) => {
    const set = this.sortedSets.get(key);
    if (!set) return 0;
    const initialLength = set.length;
    // Remove elements with scores in range [min, max]
    const filtered = set.filter(item => item.score < min || item.score > max);
    this.sortedSets.set(key, filtered);
    return initialLength - filtered.length;
  });

  multi = vi.fn(function (this: MockRedis) {
    const commands: Array<{ name: string; args: unknown[] }> = [];

    const multiChain = {
      zremrangebyscore: (key: string, min: number, max: number) => {
        commands.push({ name: 'zremrangebyscore', args: [key, min, max] });
        return multiChain;
      },
      zadd: (key: string, score: number, member: string) => {
        commands.push({ name: 'zadd', args: [key, score, member] });
        return multiChain;
      },
      zcard: (key: string) => {
        commands.push({ name: 'zcard', args: [key] });
        return multiChain;
      },
      expire: (key: string, seconds: number) => {
        commands.push({ name: 'expire', args: [key, seconds] });
        return multiChain;
      },
      ttl: (key: string) => {
        commands.push({ name: 'ttl', args: [key] });
        return multiChain;
      },
      exec: async () => {
        const results: Array<[Error | null, unknown]> = [];

        for (const cmd of commands) {
          try {
            let result: unknown;
            switch (cmd.name) {
              case 'zremrangebyscore':
                result = await this.zremrangebyscore(cmd.args[0] as string, cmd.args[1] as number, cmd.args[2] as number);
                break;
              case 'zadd':
                result = await this.zadd(cmd.args[0] as string, cmd.args[1] as number, cmd.args[2] as string);
                break;
              case 'zcard':
                result = await this.zcard(cmd.args[0] as string);
                break;
              case 'expire':
                result = await this.expire(cmd.args[0] as string, cmd.args[1] as number);
                break;
              case 'ttl':
                result = await this.ttl(cmd.args[0] as string);
                break;
              default:
                result = null;
            }
            results.push([null, result]);
          } catch (error) {
            results.push([error as Error, null]);
          }
        }

        return results;
      },
    };

    return multiChain;
  });

  ping = vi.fn(async () => 'PONG');
}

export function createMockRedis(): MockRedis {
  return new MockRedis();
}
