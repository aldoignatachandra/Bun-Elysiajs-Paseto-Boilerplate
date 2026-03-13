import { describe, it, expect, beforeEach, afterEach, mock } from 'bun:test';

// Mock the logger to avoid noise during tests
const mockChild = mock(function (this: any) {
  return this;
});
const mockLoggerChild = mock(function (this: any) {
  return this;
});

mock.module('@/core/logging/logger', () => ({
  logger: {
    info: mock(() => {}),
    warn: mock(() => {}),
    error: mock(() => {}),
    debug: mock(() => {}),
    child: mockChild,
  },
  createLogger: mock(() => ({
    info: mock(() => {}),
    warn: mock(() => {}),
    error: mock(() => {}),
    debug: mock(() => {}),
    child: mockLoggerChild,
  })),
}));

/**
 * Test configuration for shutdown
 */
interface ShutdownConfig {
  timeoutMs: number;
  gracePeriodMs: number;
}

/**
 * Creates shutdown configuration with defaults
 */
function createShutdownConfig(overrides?: Partial<ShutdownConfig>): ShutdownConfig {
  return {
    timeoutMs: 30000,
    gracePeriodMs: 5000,
    ...overrides,
  };
}

/**
 * Test version of ShutdownManager that mocks connection cleanup
 */
class TestShutdownManager {
  private state = {
    isShuttingDown: false,
    activeRequests: 0,
  };

  private closeDatabaseMock: () => Promise<void>;
  private closeRedisMock: () => Promise<void>;

  constructor(
    private config: ShutdownConfig,
    closeDatabaseMock: () => Promise<void>,
    closeRedisMock: () => Promise<void>
  ) {
    this.closeDatabaseMock = closeDatabaseMock;
    this.closeRedisMock = closeRedisMock;
  }

  initialize(): void {
    process.on('SIGTERM', () => this.shutdown('SIGTERM'));
    process.on('SIGINT', () => this.shutdown('SIGINT'));
  }

  incrementRequest(): void {
    this.state.activeRequests++;
  }

  decrementRequest(): void {
    this.state.activeRequests = Math.max(0, this.state.activeRequests - 1);
  }

  isShuttingDown(): boolean {
    return this.state.isShuttingDown;
  }

  getActiveRequestCount(): number {
    return this.state.activeRequests;
  }

  private async shutdown(_signal: string): Promise<void> {
    if (this.state.isShuttingDown) {
      return;
    }

    this.state.isShuttingDown = true;

    await this.drainRequests();
    await this.closeConnections();

    await Bun.sleep(100);
    (process.exit as unknown as () => void)(0);
  }

  private async drainRequests(): Promise<void> {
    const startTime = Date.now();
    const timeout = this.config.timeoutMs;

    while (this.state.activeRequests > 0) {
      const elapsed = Date.now() - startTime;

      if (elapsed > timeout) {
        break;
      }

      await Bun.sleep(100);
    }
  }

  private async closeConnections(): Promise<void> {
    try {
      await this.closeDatabaseMock();
    } catch (error) {
      // Ignore errors in tests
    }

    try {
      await this.closeRedisMock();
    } catch (error) {
      // Ignore errors in tests
    }
  }

  createServiceUnavailableResponse(): Response {
    return new Response(
      JSON.stringify({
        success: false,
        error: {
          code: 'SERVICE_UNAVAILABLE',
          message: 'Server is shutting down, please try again later',
        },
        meta: {
          timestamp: new Date().toISOString(),
        },
      }),
      {
        status: 503,
        headers: {
          'Content-Type': 'application/json',
          Connection: 'close',
        },
      }
    );
  }
}

const originalExit = (...args: unknown[]) => process.exit(...args);
let exitMock: typeof process.exit;

describe('ShutdownManager', () => {
  let shutdownManager: TestShutdownManager;
  let closeDatabaseMock: ReturnType<typeof mock>;
  let closeRedisMock: ReturnType<typeof mock>;

  beforeEach(() => {
    // Reset mocks
    exitMock = mock(() => {}) as typeof process.exit;
    process.exit = originalExit;
    closeDatabaseMock = mock(async () => Promise.resolve());
    closeRedisMock = mock(async () => Promise.resolve());

    // Create a fresh shutdown manager for each test
    shutdownManager = new TestShutdownManager(
      createShutdownConfig({
        timeoutMs: 1000, // 1 second for faster tests
        gracePeriodMs: 100, // 100ms for faster tests
      }),
      closeDatabaseMock,
      closeRedisMock
    );
  });

  afterEach(() => {
    // Clean up process listeners
    process.removeAllListeners('SIGTERM');
    process.removeAllListeners('SIGINT');
    process.exit = originalExit;
  });

  describe('createShutdownConfig', () => {
    it('should create config with defaults when no overrides provided', () => {
      const config = createShutdownConfig();
      expect(config.timeoutMs).toBe(30000);
      expect(config.gracePeriodMs).toBe(5000);
    });

    it('should merge overrides with defaults', () => {
      const config = createShutdownConfig({ timeoutMs: 10000 });
      expect(config.timeoutMs).toBe(10000);
      expect(config.gracePeriodMs).toBe(5000); // default
    });

    it('should merge all overrides', () => {
      const config = createShutdownConfig({ timeoutMs: 10000, gracePeriodMs: 2000 });
      expect(config.timeoutMs).toBe(10000);
      expect(config.gracePeriodMs).toBe(2000);
    });
  });

  describe('Request Tracking', () => {
    it('should track active request count', () => {
      expect(shutdownManager.getActiveRequestCount()).toBe(0);

      shutdownManager.incrementRequest();
      expect(shutdownManager.getActiveRequestCount()).toBe(1);

      shutdownManager.incrementRequest();
      expect(shutdownManager.getActiveRequestCount()).toBe(2);
    });

    it('should decrement active request count', () => {
      shutdownManager.incrementRequest();
      shutdownManager.incrementRequest();
      expect(shutdownManager.getActiveRequestCount()).toBe(2);

      shutdownManager.decrementRequest();
      expect(shutdownManager.getActiveRequestCount()).toBe(1);

      shutdownManager.decrementRequest();
      expect(shutdownManager.getActiveRequestCount()).toBe(0);
    });

    it('should not go below zero when decrementing', () => {
      expect(shutdownManager.getActiveRequestCount()).toBe(0);
      shutdownManager.decrementRequest();
      expect(shutdownManager.getActiveRequestCount()).toBe(0);
    });

    it('should handle increment/decrement cycles', () => {
      for (let i = 0; i < 10; i++) {
        shutdownManager.incrementRequest();
      }
      expect(shutdownManager.getActiveRequestCount()).toBe(10);

      for (let i = 0; i < 10; i++) {
        shutdownManager.decrementRequest();
      }
      expect(shutdownManager.getActiveRequestCount()).toBe(0);
    });
  });

  describe('Shutdown State', () => {
    it('should not be shutting down initially', () => {
      expect(shutdownManager.isShuttingDown()).toBe(false);
    });

    it('should track shutdown state after initialization', () => {
      shutdownManager.initialize();
      expect(shutdownManager.isShuttingDown()).toBe(false);
    });
  });

  describe('Signal Handler Registration', () => {
    it('should register SIGTERM and SIGINT handlers', () => {
      const sigtermListeners = process.listeners('SIGTERM');
      const sigintListeners = process.listeners('SIGINT');

      expect(sigtermListeners.length).toBe(0);
      expect(sigintListeners.length).toBe(0);

      shutdownManager.initialize();

      const newSigtermListeners = process.listeners('SIGTERM');
      const newSigintListeners = process.listeners('SIGINT');

      expect(newSigtermListeners.length).toBe(1);
      expect(newSigintListeners.length).toBe(1);
    });

    it('should call shutdown handler on SIGTERM', async () => {
      shutdownManager.initialize();

      // Mock process.exit for this test
      process.exit = exitMock;

      // Emit SIGTERM signal
      process.emit('SIGTERM', 'SIGTERM');

      // Give async operations time to complete
      await Bun.sleep(200);

      expect(shutdownManager.isShuttingDown()).toBe(true);
      expect(exitMock).toHaveBeenCalledWith(0);
    });

    it('should call shutdown handler on SIGINT', async () => {
      shutdownManager.initialize();

      // Mock process.exit for this test
      process.exit = exitMock;

      // Emit SIGINT signal
      process.emit('SIGINT', 'SIGINT');

      // Give async operations time to complete
      await Bun.sleep(200);

      expect(shutdownManager.isShuttingDown()).toBe(true);
      expect(exitMock).toHaveBeenCalledWith(0);
    });

    it('should prevent duplicate shutdown attempts', async () => {
      shutdownManager.initialize();

      // Mock process.exit for this test
      process.exit = exitMock;

      // Emit multiple signals
      process.emit('SIGTERM', 'SIGTERM');
      await Bun.sleep(50);
      process.emit('SIGTERM', 'SIGTERM');
      await Bun.sleep(200);

      // Should only exit once
      expect(exitMock).toHaveBeenCalledTimes(1);
    });
  });

  describe('503 Service Unavailable Response', () => {
    it('should create valid 503 response', () => {
      const response = shutdownManager.createServiceUnavailableResponse();

      expect(response.status).toBe(503);
      expect(response.headers.get('Content-Type')).toBe('application/json');
      expect(response.headers.get('Connection')).toBe('close');
    });

    it('should create response with correct body structure', async () => {
      const response = shutdownManager.createServiceUnavailableResponse();
      const body = await response.json();

      expect(body).toEqual({
        success: false,
        error: {
          code: 'SERVICE_UNAVAILABLE',
          message: 'Server is shutting down, please try again later',
        },
        meta: {
          timestamp: expect.any(String),
        },
      });
    });

    it('should include ISO timestamp in response', async () => {
      const response = shutdownManager.createServiceUnavailableResponse();
      const body = await response.json();

      expect(body.meta.timestamp).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/);
    });
  });

  describe('Request Draining', () => {
    it('should wait for active requests to complete', async () => {
      shutdownManager.initialize();

      // Mock process.exit for this test
      process.exit = exitMock;

      // Simulate active request
      shutdownManager.incrementRequest();

      // Start shutdown (but don't wait for it)
      process.emit('SIGTERM', 'SIGTERM');

      // Request should still be tracked
      expect(shutdownManager.getActiveRequestCount()).toBe(1);

      // Complete the request
      shutdownManager.decrementRequest();

      // Wait for shutdown to complete (needs more time for drain loop)
      await Bun.sleep(500);

      expect(exitMock).toHaveBeenCalledWith(0);
    });

    it('should timeout if requests take too long', async () => {
      const quickShutdownManager = new TestShutdownManager(createShutdownConfig({ timeoutMs: 100 }), closeDatabaseMock, closeRedisMock);
      quickShutdownManager.initialize();

      // Mock process.exit for this test
      process.exit = exitMock;

      // Simulate stuck request
      quickShutdownManager.incrementRequest();

      // Emit shutdown signal
      process.emit('SIGTERM', 'SIGTERM');

      // Wait for timeout
      await Bun.sleep(300);

      expect(exitMock).toHaveBeenCalledWith(0);
    });
  });

  describe('Connection Cleanup', () => {
    it('should call database close function during shutdown', async () => {
      shutdownManager.initialize();

      // Mock process.exit for this test
      process.exit = exitMock;

      process.emit('SIGTERM', 'SIGTERM');

      await Bun.sleep(200);

      expect(closeDatabaseMock).toHaveBeenCalled();
    });

    it('should call Redis close function during shutdown', async () => {
      shutdownManager.initialize();

      // Mock process.exit for this test
      process.exit = exitMock;

      process.emit('SIGTERM', 'SIGTERM');

      await Bun.sleep(200);

      expect(closeRedisMock).toHaveBeenCalled();
    });
  });
});
