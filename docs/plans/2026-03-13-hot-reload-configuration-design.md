# Hot Reload Configuration Design Document

> **Document Version:** 1.0.0
> **Last Updated:** 2026-03-13
> **Author:** Development Team
> **Status:** Design Phase

---

## Table of Contents

1. [Overview](#overview)
2. [Architecture](#architecture)
3. [File Structure](#file-structure)
4. [Implementation Details](#implementation-details)
5. [Development Workflow](#development-workflow)
6. [Testing Strategy](#testing-strategy)
7. [Usage Examples](#usage-examples)
8. [Success Criteria](#success-criteria)
9. [Migration Guide](#migration-guide)
10. [Troubleshooting](#troubleshooting)

---

## 1. Overview

### 1.1 Purpose

This document outlines the design and implementation of a comprehensive Hot Module Replacement (HMR) and watch mode configuration for the Bun + Elysia + PASETO monolith REST API boilerplate. The feature enables rapid development cycles by providing instant feedback when code changes are made.

### 1.2 Goals

- Enable fast development with Bun's native watch mode
- Implement Hot Module Replacement for routes, middleware, and plugins
- Provide environment-based activation (development only)
- Leverage Bun's speed for fast restarts when full reload is needed
- Maintain clean separation between development and production configurations
- Provide clear visual feedback during development

### 1.3 Non-Goals

- Runtime code patching in production (development only feature)
- Complex state preservation during reloads (simple restart preferred)
- Integration with external build tools (Bun-native only)

### 1.4 Key Benefits

| Benefit                  | Description                                                                        |
| ------------------------ | ---------------------------------------------------------------------------------- |
| **Rapid Feedback Loop**  | See changes immediately without manual restart                                     |
| **Bun-Native**           | Leverages Bun's built-in watch mode for optimal performance                        |
| **Smart Reloading**      | Distinguishes between configuration changes (full restart) and route changes (HMR) |
| **Developer Experience** | Clear console output and status indicators                                         |
| **Zero Configuration**   | Works out of the box with sensible defaults                                        |

---

## 2. Architecture

### 2.1 System Architecture Diagram

```
┌─────────────────────────────────────────────────────────────────┐
│                     Development Environment                     │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  ┌───────────────────────────────────────────────────────────┐  │
│  │                   Bun Watch Process                        │  │
│  │  - Monitors file system changes                            │  │
│  │  - Triggers reload on .ts file changes                     │  │
│  │  - Ignores node_modules and build artifacts                │  │
│  └───────────────────────────────────────────────────────────┘  │
│                           │                                      │
│                           ▼                                      │
│  ┌───────────────────────────────────────────────────────────┐  │
│  │              HMR Plugin System                             │  │
│  │  ┌─────────────────────────────────────────────────────┐  │  │
│  │  │ Route Registry                                      │  │  │
│  │  │ - Tracks loaded routes                              │  │  │
│  │  │ - Enables hot swapping                              │  │  │
│  │  └─────────────────────────────────────────────────────┘  │  │
│  │  ┌─────────────────────────────────────────────────────┐  │  │
│  │  │ Middleware Registry                                 │  │  │
│  │  │ - Tracks middleware chain                           │  │  │
│  │  │ - Allows dynamic updates                            │  │  │
│  │  └─────────────────────────────────────────────────────┘  │  │
│  │  ┌─────────────────────────────────────────────────────┐  │  │
│  │  │ Plugin Registry                                     │  │  │
│  │  │ - Manages loaded plugins                            │  │  │
│  │  │ - Supports hot reload                               │  │  │
│  │  └─────────────────────────────────────────────────────┘  │  │
│  └───────────────────────────────────────────────────────────┘  │
│                           │                                      │
│                           ▼                                      │
│  ┌───────────────────────────────────────────────────────────┐  │
│  │                   Elysia App Instance                      │  │
│  │  - Receives updated modules                               │  │
│  │  - Reconstructs route graph                                │  │
│  │  - Maintains server connection                            │  │
│  └───────────────────────────────────────────────────────────┘  │
│                           │                                      │
│                           ▼                                      │
│  ┌───────────────────────────────────────────────────────────┐  │
│  │              HTTP Server (Bun.serve)                       │  │
│  │  - Persistent during HMR                                   │  │
│  │  - Restarted on config changes                             │  │
│  └───────────────────────────────────────────────────────────┘  │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

### 2.2 Reload Strategy Matrix

| Change Type         | Strategy     | Rationale                                        |
| ------------------- | ------------ | ------------------------------------------------ |
| **Route Files**     | HMR          | Routes are stateless, safe to hot swap           |
| **Middleware**      | HMR          | Middleware can be rebuilt without server restart |
| **Controllers**     | HMR          | Controllers are stateless request handlers       |
| **Services**        | Full Restart | Services may hold in-memory state                |
| **Repositories**    | Full Restart | Database connections need reinitialization       |
| **Config Files**    | Full Restart | Environment changes require process restart      |
| **Database Schema** | Full Restart | Schema changes invalidate connections            |

### 2.3 Component Interaction

```
File Change Detected
         │
         ▼
┌─────────────────┐
│ Determine Type  │
└────────┬────────┘
         │
    ┌────┴────┐
    │         │
    ▼         ▼
┌──────┐  ┌──────────┐
│ Config│  │  Code    │
│ Change│  │  Change  │
└───┬───┘  └─────┬────┘
    │            │
    ▼            ▼
┌─────────┐  ┌────────────┐
│ Full    │  │ Selective  │
│ Restart │  │ Reload     │
└─────────┘  └────────────┘
```

---

## 3. File Structure

### 3.1 Modified Files

```
src/
├── server.ts                      # [MODIFIED] Enhanced with watch mode
├── app.ts                         # [MODIFIED] HMR plugin integration
├── config/
│   ├── index.ts                   # [MODIFIED] HMR configuration
│   ├── env.schema.ts              # [MODIFIED] Add HMR env vars
│   └── hot-reload.config.ts       # [NEW] HMR configuration
├── plugins/
│   ├── index.ts                   # [MODIFIED] Register HMR plugin
│   └── hot-reload.plugin.ts       # [NEW] HMR implementation
└── core/
    └── dev/
        ├── hmr-registry.ts        # [NEW] Module tracking
        ├── reload-manager.ts      # [NEW] Reload orchestration
        └── file-watcher.ts        # [NEW] File change detection

package.json                       # [MODIFIED] Enhanced dev scripts
tsconfig.json                      # [MODIFIED] HMR-specific options
bunfig.toml                        # [NEW] Bun configuration
```

### 3.2 New Files Detailed Specification

#### `src/config/hot-reload.config.ts`

Configuration object for HMR behavior:

```typescript
interface HotReloadConfig {
  enabled: boolean;
  port: number;
  host: string;
  watchPaths: string[];
  ignorePaths: string[];
  reloadDelay: number;
  verbose: boolean;
  clearConsoleOnReload: boolean;
  showReloadNotification: boolean;
}
```

#### `src/plugins/hot-reload.plugin.ts`

Main HMR plugin implementation:

```typescript
export function hotReloadPlugin(config: HotReloadConfig): ElysiaPlugin;
```

#### `src/core/dev/hmr-registry.ts`

Registry for tracking reloadable modules:

```typescript
class HMRRegistry {
  registerRoute(path: string, handler: RouteHandler): void;
  registerMiddleware(name: string, middleware: Middleware): void;
  getRoutes(): Map<string, RouteHandler>;
  getMiddlewares(): Map<string, Middleware>;
  clear(): void;
}
```

---

## 4. Implementation Details

### 4.1 Enhanced Environment Configuration

**File: `src/config/env.schema.ts`**

Add the following environment variables to the existing schema:

```typescript
const envSchema = z.object({
  // ... existing fields ...

  // Hot Reload Configuration (Development Only)
  HOT_RELOAD_ENABLED: z
    .enum(['true', 'false'])
    .transform(v => v === 'true')
    .default('true'),
  HOT_RELOAD_PORT: z.coerce.number().default(3001),
  HOT_RELOAD_HOST: z.string().default('localhost'),
  HOT_RELOAD_VERBOSE: z
    .enum(['true', 'false'])
    .transform(v => v === 'true')
    .default('true'),
  HOT_RELOAD_CLEAR_CONSOLE: z
    .enum(['true', 'false'])
    .transform(v => v === 'true')
    .default('false'),
  HOT_RELOAD_DELAY_MS: z.coerce.number().default(100),
});

export type Env = z.infer<typeof envSchema>;
```

### 4.2 Hot Reload Configuration Module

**File: `src/config/hot-reload.config.ts`**

```typescript
import { getConfig } from './index';
import { join } from 'node:path';

interface HotReloadConfig {
  enabled: boolean;
  port: number;
  host: string;
  watchPaths: string[];
  ignorePaths: RegExp[];
  reloadDelay: number;
  verbose: boolean;
  clearConsoleOnReload: boolean;
  showReloadNotification: boolean;
  debounceMs: number;
}

export function getHotReloadConfig(): HotReloadConfig {
  const env = getConfig();

  return {
    enabled: env.NODE_ENV === 'development' && env.HOT_RELOAD_ENABLED,
    port: env.HOT_RELOAD_PORT,
    host: env.HOT_RELOAD_HOST,
    watchPaths: [join(process.cwd(), 'src'), join(process.cwd(), 'tests')],
    ignorePaths: [/node_modules/, /\.test\.ts$/, /\.spec\.ts$/, /dist/, /\.git/, /coverage/],
    reloadDelay: env.HOT_RELOAD_DELAY_MS,
    verbose: env.HOT_RELOAD_VERBOSE,
    clearConsoleOnReload: env.HOT_RELOAD_CLEAR_CONSOLE,
    showReloadNotification: true,
    debounceMs: 50,
  };
}

export type { HotReloadConfig };
```

### 4.3 HMR Registry Implementation

**File: `src/core/dev/hmr-registry.ts`**

```typescript
import { Elysia } from 'elysia';

type RouteHandler = unknown;
type Middleware = unknown;

interface RouteEntry {
  path: string;
  method: string;
  handler: RouteHandler;
  timestamp: number;
}

interface MiddlewareEntry {
  name: string;
  middleware: Middleware;
  timestamp: number;
}

/**
 * HMR Registry
 *
 * Tracks reloadable modules and manages their lifecycle during hot reload.
 * Ensures proper cleanup and prevents memory leaks during development.
 */
export class HMRRegistry {
  private routes: Map<string, RouteEntry> = new Map();
  private middlewares: Map<string, MiddlewareEntry> = new Map();
  private plugins: Map<string, unknown> = new Map();

  /**
   * Register a route handler for hot reloading
   */
  registerRoute(path: string, method: string, handler: RouteHandler): void {
    const key = `${method}:${path}`;
    this.routes.set(key, {
      path,
      method,
      handler,
      timestamp: Date.now(),
    });

    if (this.verbose) {
      console.log(`[HMR] Registered route: ${method} ${path}`);
    }
  }

  /**
   * Register a middleware for hot reloading
   */
  registerMiddleware(name: string, middleware: Middleware): void {
    this.middlewares.set(name, {
      name,
      middleware,
      timestamp: Date.now(),
    });

    if (this.verbose) {
      console.log(`[HMR] Registered middleware: ${name}`);
    }
  }

  /**
   * Register a plugin for hot reloading
   */
  registerPlugin(name: string, plugin: unknown): void {
    this.plugins.set(name, plugin);
  }

  /**
   * Get all registered routes
   */
  getRoutes(): Map<string, RouteEntry> {
    return new Map(this.routes);
  }

  /**
   * Get all registered middlewares
   */
  getMiddlewares(): Map<string, MiddlewareEntry> {
    return new Map(this.middlewares);
  }

  /**
   * Get all registered plugins
   */
  getPlugins(): Map<string, unknown> {
    return new Map(this.plugins);
  }

  /**
   * Clear all registrations (for full reload)
   */
  clear(): void {
    const routeCount = this.routes.size;
    const middlewareCount = this.middlewares.size;
    const pluginCount = this.plugins.size;

    this.routes.clear();
    this.middlewares.clear();
    this.plugins.clear();

    console.log(`[HMR] Cleared ${routeCount} routes, ${middlewareCount} middlewares, ${pluginCount} plugins`);
  }

  /**
   * Remove a specific route
   */
  removeRoute(path: string, method: string): boolean {
    const key = `${method}:${path}`;
    return this.routes.delete(key);
  }

  /**
   * Remove a specific middleware
   */
  removeMiddleware(name: string): boolean {
    return this.middlewares.delete(name);
  }

  /**
   * Get registry statistics
   */
  getStats() {
    return {
      routes: this.routes.size,
      middlewares: this.middlewares.size,
      plugins: this.plugins.size,
    };
  }

  /**
   * Enable verbose logging
   */
  get verbose(): boolean {
    return process.env.HOT_RELOAD_VERBOSE === 'true';
  }
}

// Global registry instance
export const hmrRegistry = new HMRRegistry();
```

### 4.4 Reload Manager Implementation

**File: `src/core/dev/reload-manager.ts`**

```typescript
import { getHotReloadConfig } from '@/config/hot-reload.config';
import { hmrRegistry } from './hmr-registry';

type ReloadType = 'full' | 'routes' | 'middleware' | 'config';
type ReloadReason = 'route-change' | 'middleware-change' | 'config-change' | 'manual';

interface ReloadEvent {
  type: ReloadType;
  reason: ReloadReason;
  filePath: string;
  timestamp: number;
}

/**
 * Reload Manager
 *
 * Orchestrates the reload process based on file changes.
 * Determines whether to perform a full restart or selective hot reload.
 */
export class ReloadManager {
  private config = getHotReloadConfig();
  private reloadHistory: ReloadEvent[] = [];
  private debounceTimer: Timer | null = null;
  private pendingFiles = new Set<string>();

  /**
   * Process a file change event
   */
  async handleChange(filePath: string): Promise<void> {
    // Add to pending files
    this.pendingFiles.add(filePath);

    // Clear existing timer
    if (this.debounceTimer) {
      clearTimeout(this.debounceTimer);
    }

    // Set new debounce timer
    this.debounceTimer = setTimeout(() => {
      this.processPendingChanges();
    }, this.config.debounceMs);
  }

  /**
   * Process all pending file changes
   */
  private async processPendingChanges(): Promise<void> {
    if (this.pendingFiles.size === 0) return;

    const files = Array.from(this.pendingFiles);
    this.pendingFiles.clear();

    // Analyze changes to determine reload strategy
    const reloadStrategy = this.analyzeChanges(files);

    // Log reload decision
    this.logReloadDecision(reloadStrategy, files);

    // Execute reload
    await this.executeReload(reloadStrategy, files[0]);
  }

  /**
   * Analyze file changes to determine reload type
   */
  private analyzeChanges(files: string[]): { type: ReloadType; reason: ReloadReason } {
    for (const file of files) {
      // Config changes always require full reload
      if (file.includes('config') || file.includes('.env')) {
        return { type: 'full', reason: 'config-change' };
      }

      // Database schema changes require full reload
      if (file.includes('database/schema')) {
        return { type: 'full', reason: 'config-change' };
      }

      // Service layer changes require full reload (stateful)
      if (file.includes('services/')) {
        return { type: 'full', reason: 'config-change' };
      }

      // Repository changes require full reload (connections)
      if (file.includes('repositories/')) {
        return { type: 'full', reason: 'config-change' };
      }
    }

    // Route and middleware changes can be hot reloaded
    for (const file of files) {
      if (file.includes('routes/')) {
        return { type: 'routes', reason: 'route-change' };
      }

      if (file.includes('middlewares/')) {
        return { type: 'middleware', reason: 'middleware-change' };
      }

      if (file.includes('controllers/')) {
        return { type: 'routes', reason: 'route-change' };
      }
    }

    // Default to full reload for unknown files
    return { type: 'full', reason: 'config-change' };
  }

  /**
   * Log reload decision
   */
  private logReloadDecision(strategy: { type: ReloadType; reason: ReloadReason }, files: string[]): void {
    const timestamp = new Date().toISOString();
    console.log(`\n[${timestamp}] [HMR] File change detected:`);
    files.forEach(file => console.log(`  - ${file}`));
    console.log(`[HMR] Reload strategy: ${strategy.type.toUpperCase()} (${strategy.reason})`);
  }

  /**
   * Execute the reload
   */
  private async executeReload(strategy: { type: ReloadType; reason: ReloadReason }, triggerFile: string): Promise<void> {
    const event: ReloadEvent = {
      type: strategy.type,
      reason: strategy.reason,
      filePath: triggerFile,
      timestamp: Date.now(),
    };

    // Record event
    this.reloadHistory.push(event);

    // Clear console if configured
    if (this.config.clearConsoleOnReload) {
      console.clear();
    }

    // Show notification
    if (this.config.showReloadNotification) {
      this.showNotification(strategy.type);
    }

    // Execute reload based on type
    switch (strategy.type) {
      case 'full':
        await this.fullReload();
        break;

      case 'routes':
        await this.hotReloadRoutes();
        break;

      case 'middleware':
        await this.hotReloadMiddleware();
        break;

      case 'config':
        await this.fullReload();
        break;
    }
  }

  /**
   * Perform a full server restart
   */
  private async fullReload(): Promise<void> {
    console.log('[HMR] Initiating full server restart...');

    // Clear registry
    hmrRegistry.clear();

    // Trigger process restart (Bun will handle this)
    console.log('[HMR] Server restart complete. Ready for new requests.');
  }

  /**
   * Hot reload routes
   */
  private async hotReloadRoutes(): Promise<void> {
    console.log('[HMR] Hot reloading routes...');

    // Import updated route modules
    // This is handled by Bun's module cache invalidation

    console.log('[HMR] Routes reloaded successfully.');
    this.displayReloadStats();
  }

  /**
   * Hot reload middleware
   */
  private async hotReloadMiddleware(): Promise<void> {
    console.log('[HMR] Hot reloading middleware...');

    // Import updated middleware modules
    // This is handled by Bun's module cache invalidation

    console.log('[HMR] Middleware reloaded successfully.');
    this.displayReloadStats();
  }

  /**
   * Show reload notification
   */
  private showNotification(type: ReloadType): void {
    const emoji = type === 'full' ? '🔄' : '⚡';
    const message = type === 'full' ? 'Full Restart' : 'Hot Reload';
    console.log(`\n${emoji} [HMR] ${message} ${emoji}\n`);
  }

  /**
   * Display reload statistics
   */
  private displayReloadStats(): void {
    const stats = hmrRegistry.getStats();
    console.log(`[HMR] Registry Stats: ${stats.routes} routes, ${stats.middlewares} middlewares`);
  }

  /**
   * Get reload history
   */
  getHistory(): ReloadEvent[] {
    return [...this.reloadHistory];
  }

  /**
   * Clear reload history
   */
  clearHistory(): void {
    this.reloadHistory = [];
  }
}

// Global reload manager instance
export const reloadManager = new ReloadManager();
```

### 4.5 File Watcher Implementation

**File: `src/core/dev/file-watcher.ts`**

```typescript
import { watch } from 'node:fs';
import { getHotReloadConfig } from '@/config/hot-reload.config';
import { reloadManager } from './reload-manager';

/**
 * File Watcher
 *
 * Monitors the file system for changes and triggers appropriate reload actions.
 * Uses Node.js native fs.watch for efficient file monitoring.
 */
export class FileWatcher {
  private config = getHotReloadConfig();
  private watchers: Array<ReturnType<typeof watch>> = [];
  private isRunning = false;

  /**
   * Start watching files
   */
  start(): void {
    if (this.isRunning) {
      console.log('[HMR] File watcher already running');
      return;
    }

    if (!this.config.enabled) {
      console.log('[HMR] Hot reload is disabled');
      return;
    }

    console.log('[HMR] Starting file watcher...');
    console.log(`[HMR] Watch paths: ${this.config.watchPaths.join(', ')}`);

    // Watch each configured path
    for (const watchPath of this.config.watchPaths) {
      const watcher = watch(watchPath, { recursive: true }, (eventType, filename) => this.handleFileChange(eventType, filename));

      this.watchers.push(watcher);
    }

    this.isRunning = true;
    console.log(`[HMR] File watcher started with ${this.watchers.length} watchers`);
  }

  /**
   * Stop watching files
   */
  stop(): void {
    if (!this.isRunning) return;

    console.log('[HMR] Stopping file watcher...');

    for (const watcher of this.watchers) {
      watcher.close();
    }

    this.watchers = [];
    this.isRunning = false;

    console.log('[HMR] File watcher stopped');
  }

  /**
   * Handle file change event
   */
  private async handleFileChange(eventType: string, filename: string | null): Promise<void> {
    if (!filename) return;

    // Skip if file matches ignore patterns
    if (this.shouldIgnore(filename)) {
      if (this.config.verbose) {
        console.log(`[HMR] Ignoring: ${filename}`);
      }
      return;
    }

    // Only process TypeScript files
    if (!filename.endsWith('.ts') && !filename.endsWith('.tsx')) {
      return;
    }

    // Get full file path
    const fullPath = this.getFullPath(filename);

    if (this.config.verbose) {
      console.log(`[HMR] ${eventType.toUpperCase()}: ${fullPath}`);
    }

    // Trigger reload
    await reloadManager.handleChange(fullPath);
  }

  /**
   * Check if file should be ignored
   */
  private shouldIgnore(filename: string): boolean {
    for (const pattern of this.config.ignorePaths) {
      if (pattern.test(filename)) {
        return true;
      }
    }
    return false;
  }

  /**
   * Get full file path
   */
  private getFullPath(filename: string): string {
    // Convert backslashes to forward slashes on Windows
    const normalizedFilename = filename.replace(/\\/g, '/');

    // Check if already absolute
    if (normalizedFilename.startsWith('/')) {
      return normalizedFilename;
    }

    // Make relative to current working directory
    return `${process.cwd()}/${normalizedFilename}`;
  }

  /**
   * Check if watcher is running
   */
  isActive(): boolean {
    return this.isRunning;
  }
}

// Global file watcher instance
export const fileWatcher = new FileWatcher();
```

### 4.6 HMR Plugin Implementation

**File: `src/plugins/hot-reload.plugin.ts`**

````typescript
import { Elysia } from 'elysia';
import { getHotReloadConfig } from '@/config/hot-reload.config';
import { hmrRegistry } from '@/core/dev/hmr-registry';
import { fileWatcher } from '@/core/dev/file-watcher';

/**
 * Hot Reload Plugin Configuration
 */
export interface HotReloadPluginConfig {
  enabled?: boolean;
  verbose?: boolean;
  clearConsoleOnReload?: boolean;
}

/**
 * Hot Reload Plugin
 *
 * Enables hot module replacement for rapid development.
 * Automatically watches for file changes and reloads modules as needed.
 *
 * @example
 * ```typescript
 * import { hotReloadPlugin } from '@/plugins';
 *
 * const app = new Elysia()
 *   .use(hotReloadPlugin());
 * ```
 */
export function hotReloadPlugin(config: HotReloadPluginConfig = {}): Elysia {
  const hmrConfig = getHotReloadConfig();
  const enabled = config.enabled ?? hmrConfig.enabled;

  if (!enabled) {
    return new Elysia();
  }

  console.log('[HMR] Initializing hot reload plugin...');

  // Start file watcher
  fileWatcher.start();

  // Register plugin in registry
  hmrRegistry.registerPlugin('hot-reload', {
    name: 'hot-reload',
    version: '1.0.0',
    config: hmrConfig,
  });

  // Return a plugin that adds HMR endpoints
  return new Elysia()
    .get('/hmr/stats', () => {
      return {
        enabled: true,
        registry: hmrRegistry.getStats(),
        config: {
          watchPaths: hmrConfig.watchPaths,
          ignorePaths: hmrConfig.ignorePaths.map(p => p.toString()),
        },
        timestamp: new Date().toISOString(),
      };
    })
    .post('/hmr/reload', async () => {
      await fileWatcher.stop();
      hmrRegistry.clear();
      fileWatcher.start();
      return {
        success: true,
        message: 'Manual reload triggered',
        timestamp: new Date().toISOString(),
      };
    })
    .get('/hmr/health', () => ({
      status: 'ok',
      active: fileWatcher.isActive(),
    }));
}
````

### 4.7 Enhanced Server with Watch Mode

**File: `src/server.ts`**

```typescript
/**
 * Server Bootstrap
 *
 * Entry point for the application server.
 * Initializes and starts the Elysia server with Bun's native HTTP server.
 * Includes hot reload support for development mode.
 *
 * @module Server
 */

import { createApp } from './app';
import { logger } from './core/logging/logger';
import { getConfig } from './config';
import { getHotReloadConfig } from './config/hot-reload.config';
import { fileWatcher } from './core/dev/file-watcher';

// Type for server with hot reload support
interface ServerInstance {
  server: ReturnType<typeof Bun.serve>;
  app: ReturnType<typeof createApp>;
  hmrEnabled: boolean;
}

/**
 * Create and start the server
 */
function createServer(): ServerInstance {
  // Create and configure the application
  const app = createApp();

  // Get configuration
  const config = getConfig();
  const hmrConfig = getHotReloadConfig();

  // Start the server
  const server = Bun.serve({
    fetch: app.fetch,
    port: config.PORT,
    hostname: config.HOST,
  });

  logger.info(`🚀 Server started on http://${server.hostname}:${server.port}`);
  logger.info(`📚 Swagger documentation available at http://${server.hostname}:${server.port}/swagger`);
  logger.info(`💚 Health check available at http://${server.hostname}:${server.port}/health`);

  // Log HMR status
  if (hmrConfig.enabled) {
    logger.info(`🔥 Hot reload enabled`);
    logger.info(`📊 HMR stats available at http://${server.hostname}:${server.port}/hmr/stats`);
    logger.info(`🔄 Manual reload: POST http://${server.hostname}:${server.port}/hmr/reload`);
  }

  return {
    server,
    app,
    hmrEnabled: hmrConfig.enabled,
  };
}

// Create server instance
const serverInstance = createServer();

// Handle graceful shutdown
const shutdown = async (signal: string) => {
  logger.info(`Received ${signal}, shutting down gracefully...`);

  // Stop HMR if enabled
  if (serverInstance.hmrEnabled) {
    fileWatcher.stop();
  }

  // Stop server
  serverInstance.server.stop();

  logger.info('Server shut down complete');
  process.exit(0);
};

// Register shutdown handlers
process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT', () => shutdown('SIGINT'));

// Export for potential testing or module usage
export { app, server, serverInstance };
```

### 4.8 Enhanced Plugin Registration

**File: `src/plugins/index.ts`**

````typescript
import { Elysia } from 'elysia';
import { healthPlugin } from './health.plugin';
import { hotReloadPlugin } from './hot-reload.plugin';

/**
 * Plugin configuration interface
 */
export interface PluginConfig {
  /**
   * Enable health check plugin (default: true)
   */
  health?: boolean;

  /**
   * Enable hot reload plugin (default: auto-detected)
   */
  hotReload?: boolean;
}

/**
 * Register plugins with an Elysia application
 *
 * @param app - The Elysia application instance
 * @param config - Plugin configuration options
 * @returns The configured Elysia application instance
 *
 * @example
 * ```typescript
 * import { Elysia } from 'elysia';
 * import { registerPlugins } from '@/plugins';
 *
 * const app = new Elysia();
 * registerPlugins(app, {
 *   health: true,
 *   hotReload: true  // Enable in development
 * });
 * ```
 */
export function registerPlugins(app: Elysia, config: PluginConfig = {}): Elysia {
  // Health check plugin is enabled by default
  if (config.health !== false) {
    app.use(healthPlugin());
  }

  // Hot reload plugin - auto-detect in development
  const isDevelopment = process.env.NODE_ENV === 'development';
  const enableHMR = config.hotReload ?? isDevelopment;

  if (enableHMR) {
    app.use(hotReloadPlugin());
  }

  return app;
}

// Export individual plugins
export * from './health.plugin';
export * from './hot-reload.plugin';
````

### 4.9 Enhanced App Integration

**File: `src/app.ts`**

Add HMR-aware initialization:

```typescript
import { Elysia } from 'elysia';
import { cors } from '@elysiajs/cors';
import { swagger } from '@elysia/swagger';
import { logger } from './core/logging/logger';
import { loggingPlugin } from './core/logging/middleware';
import { getConnection } from './database/connection';
import { UnitOfWork } from './repositories/unit-of-work';
import { PasswordService } from './core/crypto/password.service';
import { PasetoService } from './core/paseto/paseto.service';
import { AuthService } from './services/auth.service';
import { UsersService } from './services/users.service';
import { ProductsService } from './services/products.service';
import { createAuthRoutes } from './routes/auth.routes';
import { createUsersRoutes } from './routes/users.routes';
import { createProductsRoutes } from './routes/products.routes';
import { AppError } from './core/errors/app-error';
import { registerPlugins } from './plugins';
import { requestId } from './middlewares/request-id.middleware';
import { errorResponse } from './core/http/response';
import { hmrRegistry } from './core/dev/hmr-registry';
import { getHotReloadConfig } from './config/hot-reload.config';

export function createApp() {
  const hmrConfig = getHotReloadConfig();
  const db = getConnection();
  const unitOfWork = new UnitOfWork(db);
  const passwordService = new PasswordService();
  const pasetoService = new PasetoService({
    issuer: 'bun-elysia-paseto-boilerplate',
    audience: 'bun-elysia-paseto-api',
    symmetricKey: process.env.PASETO_LOCAL_KEY!,
    publicKey: process.env.PASETO_PUBLIC_KEY!,
    secretKey: process.env.PASETO_SECRET_KEY!,
    accessTokenExpiryMinutes: Number(process.env.ACCESS_TOKEN_EXPIRY_MINUTES) || 15,
    refreshTokenExpiryDays: Number(process.env.REFRESH_TOKEN_EXPIRY_DAYS) || 7,
  });

  const authService = new AuthService(unitOfWork, pasetoService, passwordService);
  const usersService = new UsersService(unitOfWork, passwordService);
  const productsService = new ProductsService(unitOfWork);

  const app = new Elysia()
    .use(
      cors({
        origin: process.env.CORS_ORIGIN || '*',
        credentials: process.env.CORS_CREDENTIALS === 'true',
        methods: (process.env.CORS_METHODS || 'GET,POST,PUT,DELETE,PATCH').split(','),
        allowedHeaders: (process.env.CORS_ALLOWED_HEADERS || 'Content-Type,Authorization,X-Request-ID').split(','),
      })
    )
    .use(requestId())
    .use(loggingPlugin)
    .use(registerPlugins)
    .onError(ctx => {
      const { error, set, request } = ctx;
      const requestId =
        typeof (ctx as { requestId?: unknown }).requestId === 'string' ? ((ctx as { requestId?: string }).requestId as string) : undefined;

      logger.error('Unhandled error', error);

      if (error instanceof AppError) {
        set.status = error.status;
        return errorResponse(request, error.code, error.message, error.details, requestId);
      }

      if (error instanceof Error) {
        set.status = 500;
        return errorResponse(
          request,
          'INTERNAL_ERROR',
          'An unexpected error occurred',
          process.env.NODE_ENV === 'development' ? error.message : undefined,
          requestId
        );
      }

      set.status = 500;
      return errorResponse(request, 'INTERNAL_ERROR', 'An unexpected error occurred', undefined, requestId);
    })
    .group('/api/v1', api => {
      // Register routes with HMR if enabled
      const authRoutes = createAuthRoutes(new Elysia(), authService, usersService, pasetoService);
      const usersRoutes = createUsersRoutes(new Elysia(), usersService, authService, pasetoService);
      const productsRoutes = createProductsRoutes(new Elysia(), productsService, authService, pasetoService);

      // Track routes in HMR registry
      if (hmrConfig.enabled) {
        // Route tracking would be done here
        logger.info('HMR enabled: Tracking routes for hot reload');
      }

      return api.use(authRoutes).use(usersRoutes).use(productsRoutes);
    })
    .use(
      swagger({
        documentation: {
          info: {
            title: 'Bun Elysia PASETO API',
            version: '1.0.0',
            description: 'Monolith REST API with PASETO authentication',
          },
          tags: [
            { name: 'Authentication', description: 'User authentication endpoints' },
            { name: 'Users', description: 'User management endpoints' },
            { name: 'Products', description: 'Product management endpoints' },
          ],
        },
      })
    )
    .all('*', ctx => {
      const { set, request } = ctx;
      set.status = 404;
      const requestId =
        typeof (ctx as { requestId?: unknown }).requestId === 'string' ? ((ctx as { requestId?: string }).requestId as string) : undefined;
      return errorResponse(request, 'NOT_FOUND', 'Route not found', undefined, requestId);
    });

  logger.info('Application created successfully');

  return app;
}
```

### 4.10 Package.json Scripts

**File: `package.json`**

Update the scripts section:

```json
{
  "scripts": {
    "dev": "bun run --watch src/server.ts",
    "dev:hmr": "NODE_ENV=development HOT_RELOAD_ENABLED=true bun run --watch src/server.ts",
    "dev:verbose": "NODE_ENV=development HOT_RELOAD_VERBOSE=true bun run --watch src/server.ts",
    "start": "bun run src/server.ts",
    "test": "bun test",
    "test:coverage": "bash -lc 'set -o pipefail; bun test --coverage tests/unit tests/middlewares/request-id.middleware.test.ts 2>&1 | tee /tmp/bun-elysia-paseto-coverage.txt; status=${PIPESTATUS[0]}; bun -e \"import fs from \\\"node:fs\\\"; const text = fs.readFileSync(\\\"/tmp/bun-elysia-paseto-coverage.txt\\\", \\\"utf8\\\"); const line = text.split(\\\"\\\\n\\\").find(l => l.includes(\\\"All files\\\")); if (line) { const parts = line.split(\\\"|\\\").map(s => s.trim()); const funcs = parts[1]; const lines = parts[2]; console.log(\\\"\\\\nCoverage Summary\\\\n- Overall Functions Coverage: \\\" + funcs + \\\"%\\\\n- Overall Lines Coverage: \\\" + lines + \\\"%\\\"); }\"; exit $status'",
    "test:coverage:lcov": "bash -lc 'set -o pipefail; bun test --coverage --coverage-reporter=lcov tests/unit tests/middlewares/request-id.middleware.test.ts 2>&1 | tee /tmp/bun-elysia-paseto-coverage.txt; status=${PIPESTATUS[0]}; bun -e \"import fs from \\\"node:fs\\\"; const text = fs.readFileSync(\\\"/tmp/bun-elysia-paseto-coverage.txt\\\", \\\"utf8\\\"); const line = text.split(\\\"\\\\n\\\").find(l => l.includes(\\\"All files\\\")); if (line) { const parts = line.split(\\\"|\\\").map(s => s.trim()); const funcs = parts[1]; const lines = parts[2]; console.log(\\\"\\\\nCoverage Summary\\\\n- Overall Functions Coverage: \\\" + funcs + \\\"%\\\\n- Overall Lines Coverage: \\\" + lines + \\\"%\\\"); }\"; exit $status'",
    "test:unit": "bun test tests/unit tests/middlewares/request-id.middleware.test.ts",
    "test:integration": "bun test tests/app.test.ts",
    "lint": "eslint src scripts drizzle.config.ts",
    "lint:fix": "eslint src scripts drizzle.config.ts --fix",
    "format": "prettier --write .",
    "format:check": "prettier --check .",
    "db:check": "drizzle-kit check:pg",
    "db:generate": "drizzle-kit generate:pg",
    "db:migrate": "bun run src/scripts/migrate.ts",
    "db:create": "bun run src/scripts/create-db.ts",
    "db:drop": "bun run src/scripts/drop-db.ts",
    "db:setup": "bun run db:create && bun run db:migrate",
    "db:reset": "bun run db:drop && bun run db:setup",
    "db:push": "drizzle-kit push:pg",
    "db:studio": "drizzle-kit studio",
    "db:seed": "bun run src/scripts/seed.ts",
    "generate:paseto-keys": "bun run scripts/generate-paseto-keys.ts",
    "prepare": "husky install"
  }
}
```

### 4.11 Bun Configuration

**File: `bunfig.toml`**

Create a Bun configuration file:

```toml
# Bun Configuration File
# https://bun.sh/docs/runtime/bunfig

[install]
# Cache installed dependencies in ~/.bun/install/cache
cache = true
# Install packages as devDependencies
dev = true
# Lockfile format
lockfile = "yarn"

[run]
# Shell to use for bun run
shell = "zsh"

[test]
# Test preload files
preload = []

[build]
# Build target
target = "bun"

# Watch mode configuration
[watch]
# Paths to ignore
ignore = [
  "node_modules",
  ".git",
  "dist",
  "coverage",
  "*.test.ts",
  "*.spec.ts"
]
```

---

## 5. Development Workflow

### 5.1 Initial Setup

```bash
# Clone the repository
git clone <repository-url>
cd bun-elysia-paseto-boilerplate

# Install dependencies
bun install

# Set up environment
cp .env.example .env

# Generate PASETO keys
bun run generate:paseto-keys

# Set up database
bun run db:setup
bun run db:seed
```

### 5.2 Development with Hot Reload

```bash
# Start development server with hot reload
bun run dev

# Or with explicit HMR
bun run dev:hmr

# Or with verbose logging
bun run dev:verbose
```

### 5.3 Typical Development Session

```
1. Start dev server
   $ bun run dev

2. Make code changes
   - Edit route files → Hot reload (fast)
   - Edit middleware → Hot reload (fast)
   - Edit services → Full restart (automatic)

3. View changes
   - Refresh browser
   - Check console for reload messages

4. Test changes
   - Use Swagger UI at /swagger
   - Run tests in another terminal

5. Commit changes
   $ git add .
   $ git commit -m "feat: add new endpoint"
```

### 5.4 Hot Reload Console Output

```
[HMR] Starting file watcher...
[HMR] Watch paths: /app/src, /app/tests
[HMR] File watcher started with 2 watchers
🔥 Hot reload enabled
📊 HMR stats available at http://localhost:3000/hmr/stats
🔄 Manual reload: POST http://localhost:3000/hmr/reload

[2026-03-13T10:30:45.123Z] [HMR] File change detected:
  - /app/src/routes/products.routes.ts
[HMR] Reload strategy: ROUTES (route-change)
⚡ [HMR] Hot Reload ⚡
[HMR] Hot reloading routes...
[HMR] Routes reloaded successfully.
[HMR] Registry Stats: 15 routes, 4 middlewares
```

### 5.5 Manual Reload Workflow

```bash
# Trigger manual reload via curl
curl -X POST http://localhost:3000/hmr/reload

# Check HMR status
curl http://localhost:3000/hmr/stats

# Check HMR health
curl http://localhost:3000/hmr/health
```

---

## 6. Testing Strategy

### 6.1 Unit Tests

#### HMR Registry Tests

```typescript
import { describe, it, expect, beforeEach } from 'bun:test';
import { HMRRegistry } from '@/core/dev/hmr-registry';

describe('HMRRegistry', () => {
  let registry: HMRRegistry;

  beforeEach(() => {
    registry = new HMRRegistry();
  });

  it('should register routes', () => {
    const handler = () => ({ message: 'test' });
    registry.registerRoute('/test', 'GET', handler);

    const routes = registry.getRoutes();
    expect(routes.size).toBe(1);
    expect(routes.has('GET:/test')).toBe(true);
  });

  it('should register middleware', () => {
    const middleware = () => {};
    registry.registerMiddleware('test', middleware);

    const middlewares = registry.getMiddlewares();
    expect(middlewares.size).toBe(1);
    expect(middlewares.has('test')).toBe(true);
  });

  it('should clear all registrations', () => {
    registry.registerRoute('/test', 'GET', () => ({}));
    registry.registerMiddleware('test', () => {});

    registry.clear();

    expect(registry.getRoutes().size).toBe(0);
    expect(registry.getMiddlewares().size).toBe(0);
  });

  it('should return correct stats', () => {
    registry.registerRoute('/test1', 'GET', () => ({}));
    registry.registerRoute('/test2', 'POST', () => ({}));
    registry.registerMiddleware('test', () => {});

    const stats = registry.getStats();
    expect(stats.routes).toBe(2);
    expect(stats.middlewares).toBe(1);
    expect(stats.plugins).toBe(0);
  });
});
```

#### Reload Manager Tests

```typescript
import { describe, it, expect, beforeEach } from 'bun:test';
import { ReloadManager } from '@/core/dev/reload-manager';

describe('ReloadManager', () => {
  let manager: ReloadManager;

  beforeEach(() => {
    manager = new ReloadManager();
  });

  it('should analyze route changes correctly', async () => {
    const strategy = manager['analyzeChanges'](['/app/src/routes/test.routes.ts']);

    expect(strategy.type).toBe('routes');
    expect(strategy.reason).toBe('route-change');
  });

  it('should analyze middleware changes correctly', async () => {
    const strategy = manager['analyzeChanges'](['/app/src/middlewares/test.middleware.ts']);

    expect(strategy.type).toBe('middleware');
    expect(strategy.reason).toBe('middleware-change');
  });

  it('should analyze config changes correctly', async () => {
    const strategy = manager['analyzeChanges'](['/app/src/config/index.ts']);

    expect(strategy.type).toBe('full');
    expect(strategy.reason).toBe('config-change');
  });

  it('should maintain reload history', async () => {
    await manager.handleChange('/app/src/routes/test.ts');
    await manager.handleChange('/app/src/middlewares/test.ts');

    const history = manager.getHistory();
    expect(history.length).toBeGreaterThanOrEqual(2);
  });
});
```

### 6.2 Integration Tests

```typescript
import { describe, it, expect, beforeAll, afterAll } from 'bun:test';
import { createApp } from '@/app';
import { getHotReloadConfig } from '@/config/hot-reload.config';

describe('Hot Reload Integration', () => {
  let app: ReturnType<typeof createApp>;

  beforeAll(() => {
    process.env.NODE_ENV = 'development';
    process.env.HOT_RELOAD_ENABLED = 'true';
    app = createApp();
  });

  afterAll(() => {
    process.env.HOT_RELOAD_ENABLED = 'false';
  });

  it('should provide HMR stats endpoint', async () => {
    const response = await app.handle(new Request('http://localhost/hmr/stats')).then(r => r.json());

    expect(response.enabled).toBe(true);
    expect(response.registry).toBeDefined();
    expect(response.config).toBeDefined();
  });

  it('should provide HMR health endpoint', async () => {
    const response = await app.handle(new Request('http://localhost/hmr/health')).then(r => r.json());

    expect(response.status).toBe('ok');
    expect(typeof response.active).toBe('boolean');
  });

  it('should support manual reload', async () => {
    const response = await app.handle(new Request('http://localhost/hmr/reload', { method: 'POST' })).then(r => r.json());

    expect(response.success).toBe(true);
    expect(response.message).toBe('Manual reload triggered');
  });
});
```

### 6.3 E2E Tests

```bash
# Test hot reload in a real development environment
bun test tests/e2e/hot-reload.test.ts
```

---

## 7. Usage Examples

### 7.1 Basic Development

```bash
# Start with default settings
bun run dev
```

### 7.2 Custom HMR Configuration

```typescript
// src/config/hot-reload.config.ts
export function getHotReloadConfig(): HotReloadConfig {
  return {
    enabled: true,
    port: 3001,
    host: 'localhost',
    watchPaths: [join(process.cwd(), 'src'), join(process.cwd(), 'tests')],
    ignorePaths: [/node_modules/, /\.test\.ts$/, /\.spec\.ts$/],
    reloadDelay: 100,
    verbose: true,
    clearConsoleOnReload: false,
    showReloadNotification: true,
    debounceMs: 50,
  };
}
```

### 7.3 Environment Variables

```bash
# .env
NODE_ENV=development
HOT_RELOAD_ENABLED=true
HOT_RELOAD_PORT=3001
HOT_RELOAD_HOST=localhost
HOT_RELOAD_VERBOSE=true
HOT_RELOAD_CLEAR_CONSOLE=false
HOT_RELOAD_DELAY_MS=100
```

### 7.4 Programmatic Usage

```typescript
import { fileWatcher } from '@/core/dev/file-watcher';
import { reloadManager } from '@/core/dev/reload-manager';

// Start watching manually
fileWatcher.start();

// Trigger manual reload
await reloadManager.handleChange('/app/src/routes/test.ts');

// Stop watching
fileWatcher.stop();
```

### 7.5 Route Development Workflow

```typescript
// 1. Create new route file
// src/routes/orders.routes.ts

import { Elysia, t } from 'elysia';

export function createOrdersRoutes(app: Elysia) {
  return app.group('/orders', (app) =>
    app
      .get('/', () => ({ orders: [] }))
      .post('/', ({ body }) => ({ created: true, data: body }), {
        body: t.Object({
          productId: t.String(),
          quantity: t.Number(),
        }),
      })
  );
}

// 2. Register in app.ts
import { createOrdersRoutes } from './routes/orders.routes';

// Inside createApp()
app.group('/api/v1', api =>
  api
    .use(createAuthRoutes(...))
    .use(createUsersRoutes(...))
    .use(createProductsRoutes(...))
    .use(createOrdersRoutes(...))  // Hot reload picks this up
);

// 3. Save file - HMR automatically reloads routes
// 4. Test immediately in browser or Swagger UI
```

---

## 8. Success Criteria

### 8.1 Functional Requirements

- [ ] Bun's watch mode automatically detects TypeScript file changes
- [ ] Route changes trigger hot reload without server restart
- [ ] Middleware changes trigger hot reload without server restart
- [ ] Configuration changes trigger full server restart
- [ ] Service layer changes trigger full server restart
- [ ] HMR is only active in development environment
- [ ] HMR is disabled in production
- [ ] Console provides clear feedback during reload events
- [ ] HMR stats endpoint returns accurate information
- [ ] Manual reload endpoint works correctly

### 8.2 Performance Requirements

- [ ] Hot reload completes within 500ms for route changes
- [ ] Full restart completes within 2 seconds
- [ ] File watching does not impact request handling performance
- [ ] Memory usage does not increase continuously during development
- [ ] Debouncing prevents excessive reloads during rapid saves

### 8.3 Developer Experience Requirements

- [ ] Clear console messages indicate what was reloaded
- [ ] Visual indicators distinguish hot reload from full restart
- [ ] HMR can be disabled via environment variable
- [ ] Verbose mode provides detailed reload information
- [ ] Optional console clearing before each reload
- [ ] Easy access to HMR statistics and health endpoints

### 8.4 Testing Requirements

- [ ] Unit tests for HMRRegistry
- [ ] Unit tests for ReloadManager
- [ ] Unit tests for FileWatcher
- [ ] Integration tests for HMR plugin
- [ ] E2E tests for complete reload workflow
- [ ] All tests pass with HMR enabled

---

## 9. Migration Guide

### 9.1 For Existing Projects

#### Step 1: Add HMR Configuration Files

```bash
# Create HMR config
touch src/config/hot-reload.config.ts

# Create HMR core files
mkdir -p src/core/dev
touch src/core/dev/hmr-registry.ts
touch src/core/dev/reload-manager.ts
touch src/core/dev/file-watcher.ts

# Create HMR plugin
touch src/plugins/hot-reload.plugin.ts
```

#### Step 2: Update Environment Schema

Add HMR variables to `src/config/env.schema.ts` (see section 4.1).

#### Step 3: Update Server

Modify `src/server.ts` to include HMR support (see section 4.7).

#### Step 4: Update Plugin Registration

Modify `src/plugins/index.ts` to register HMR plugin (see section 4.8).

#### Step 5: Update Package Scripts

Update `package.json` scripts (see section 4.10).

#### Step 6: Test

```bash
bun run dev
# Make a change to a route file
# Verify hot reload works
```

### 9.2 Rollback Procedure

If issues occur:

1. Disable HMR via environment variable:

   ```bash
   HOT_RELOAD_ENABLED=false bun run dev
   ```

2. Remove HMR plugin from `src/plugins/index.ts`

3. Revert `src/server.ts` to original version

4. Remove HMR files if needed

---

## 10. Troubleshooting

### 10.1 Common Issues

#### Issue: HMR Not Working

**Symptoms:** Changes to files don't trigger reload

**Solutions:**

1. Check that `NODE_ENV=development`
2. Verify `HOT_RELOAD_ENABLED=true`
3. Ensure file paths are in `watchPaths`
4. Check that files don't match `ignorePaths`
5. Check console for error messages

**Debug Commands:**

```bash
# Check HMR status
curl http://localhost:3000/hmr/health

# Check HMR stats
curl http://localhost:3000/hmr/stats

# Enable verbose logging
HOT_RELOAD_VERBOSE=true bun run dev
```

#### Issue: Continuous Reload Loop

**Symptoms:** Server keeps restarting automatically

**Solutions:**

1. Increase debounce time: `HOT_RELOAD_DELAY_MS=200`
2. Check for log files being created in watched directories
3. Verify no test files are being watched
4. Check `ignorePaths` configuration

#### Issue: Routes Not Updating

**Symptoms:** Route changes don't appear after hot reload

**Solutions:**

1. Check if route file is in `watchPaths`
2. Verify route is properly registered in `app.ts`
3. Try full restart instead of hot reload
4. Check for import caching issues

**Manual Reload:**

```bash
curl -X POST http://localhost:3000/hmr/reload
```

#### Issue: Memory Leak During Development

**Symptoms:** Memory usage increases over time

**Solutions:**

1. Check that old routes are being cleared
2. Verify middleware is properly disposed
3. Restart dev server periodically
4. Check for event listener leaks

**Check Registry:**

```bash
curl http://localhost:3000/hmr/stats
```

### 10.2 Performance Issues

#### Slow Reloads

**Diagnosis:**

```
[HMR] Reload strategy: ROUTES (route-change)
[HMR] Hot reloading routes...
[Long pause here]
[HMR] Routes reloaded successfully.
```

**Solutions:**

1. Reduce number of watched files
2. Optimize route initialization
3. Check database connection pooling
4. Profile the reload process

#### High CPU Usage

**Diagnosis:**

- File watcher using excessive CPU
- Continuous file system polling

**Solutions:**

1. Increase debounce time
2. Reduce number of `watchPaths`
3. Exclude more paths in `ignorePaths`
4. Check for infinite loops in reload logic

### 10.3 Environment-Specific Issues

#### Windows-Specific Issues

**Problem:** File path inconsistencies

**Solution:**

```typescript
// Always normalize paths
const normalizedPath = path.replace(/\\/g, '/');
```

#### Docker-Specific Issues

**Problem:** File watching doesn't work in containers

**Solution:**

```dockerfile
# Use polling in Docker
ENV HOT_RELOAD_DELAY_MS=500
ENV CHOKIDAR_USEPOLLING=true
```

#### WSL-Specific Issues

**Problem:** Slow file watching on Windows Subsystem for Linux

**Solution:**

```bash
# Place project files in WSL filesystem, not Windows filesystem
# Use /home/user/projects instead of /mnt/c/projects
```

---

## 11. Future Enhancements

### 11.1 Planned Features

1. **State Preservation**
   - Preserve application state during hot reload
   - Implement intelligent state serialization

2. **Route Diffing**
   - Show which routes were added/removed
   - Display detailed change summary

3. **Browser Integration**
   - WebSocket-based client notifications
   - Automatic browser refresh on full restart

4. **Performance Monitoring**
   - Track reload times
   - Identify slow-loading modules

5. **Smart Reloading**
   - Reload only changed modules
   - Implement dependency graph analysis

### 11.2 Experimental Features

1. **Runtime Type Checking**
   - Verify types during hot reload
   - Prevent type errors from reaching runtime

2. **Schema Migration**
   - Auto-run migrations on schema changes
   - Rollback on migration failure

3. **Test Runner Integration**
   - Run relevant tests on file change
   - Show test results in console

---

## 12. References

### 12.1 Documentation

- [Bun Watch Mode](https://bun.sh/docs/cli/watch)
- [Elysia Documentation](https://elysiajs.com/)
- [PASETO Specification](https://github.com/paseto-standard/paseto-spec)

### 12.2 Related Design Documents

- [Architecture Standards](/docs/standardization/ARCHITECTURE_STANDARDS.md)
- [API Design Standards](/docs/standardization/API_DESIGN_STANDARDS.md)
- [Testing Standards](/docs/standardization/TESTING_STANDARDS.md)

### 12.3 Tools and Libraries

- [Bun](https://bun.sh/)
- [Elysia](https://elysiajs.com/)
- [Zod](https://zod.dev/)
- [TypeScript](https://www.typescriptlang.org/)

---

## Appendix A: Configuration Reference

### A.1 Environment Variables

| Variable                   | Type    | Default     | Description                      |
| -------------------------- | ------- | ----------- | -------------------------------- |
| `HOT_RELOAD_ENABLED`       | boolean | `true`      | Enable hot reload in development |
| `HOT_RELOAD_PORT`          | number  | `3001`      | Port for HMR endpoints           |
| `HOT_RELOAD_HOST`          | string  | `localhost` | Host for HMR endpoints           |
| `HOT_RELOAD_VERBOSE`       | boolean | `true`      | Enable verbose logging           |
| `HOT_RELOAD_CLEAR_CONSOLE` | boolean | `false`     | Clear console on reload          |
| `HOT_RELOAD_DELAY_MS`      | number  | `100`       | Delay before reload trigger      |

### A.2 HMR Endpoints

| Endpoint      | Method | Description             |
| ------------- | ------ | ----------------------- |
| `/hmr/stats`  | GET    | Get HMR statistics      |
| `/hmr/health` | GET    | Check HMR health status |
| `/hmr/reload` | POST   | Trigger manual reload   |

### A.3 Console Output Reference

| Message                               | Meaning                   |
| ------------------------------------- | ------------------------- |
| `[HMR] Starting file watcher...`      | File watcher initializing |
| `[HMR] File change detected:`         | File change detected      |
| `[HMR] Reload strategy: ROUTES`       | Hot reloading routes      |
| `[HMR] Reload strategy: FULL`         | Full server restart       |
| `[HMR] Routes reloaded successfully.` | Hot reload completed      |
| `[HMR] Server restart complete.`      | Full restart completed    |

---

**Document Status:** Ready for Implementation

**Next Steps:**

1. Review and approve design document
2. Implement HMR configuration module
3. Implement HMR core components
4. Implement HMR plugin
5. Update server and app initialization
6. Write comprehensive tests
7. Update documentation
8. Release to development team

---

_For questions or feedback about this design document, please contact the development team or open an issue in the project repository._
