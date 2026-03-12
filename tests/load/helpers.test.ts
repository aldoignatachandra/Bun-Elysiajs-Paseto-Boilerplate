import { afterEach, describe, expect, it } from 'bun:test';
import { waitForServer } from './helpers';

const startedServers: Array<ReturnType<typeof Bun.serve>> = [];

afterEach(() => {
  for (const server of startedServers) {
    server.stop();
  }
  startedServers.length = 0;
});

describe('waitForServer', () => {
  it('should treat a reachable server as ready even when health status is degraded', async () => {
    const server = Bun.serve({
      port: 4011,
      hostname: 'localhost',
      fetch: () => new Response('degraded', { status: 503 }),
    });

    startedServers.push(server);

    await expect(waitForServer('http://localhost:4011/health', 2, 10)).resolves.toBeUndefined();
  });
});
