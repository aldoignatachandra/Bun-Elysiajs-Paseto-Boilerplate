# Multi-stage production Dockerfile for Bun Elysia PASETO Boilerplate
# This Dockerfile creates an optimized production image with minimal attack surface

# Base stage - Use official Bun image with Alpine for minimal size
FROM oven/bun:1.1-alpine AS base
# Install build dependencies for native modules
RUN apk add --no-cache \
    libc6-compat \
    openssl3 \
    postgresql-client

# Dependencies stage - Install dependencies with cache layer
FROM base AS dependencies
# Set working directory
WORKDIR /app

# Copy package files
COPY package.json bun.lock* ./

# Install production dependencies only
RUN bun install --frozen-lockfile --production

# Build stage - Copy source and build the application
FROM base AS build
WORKDIR /app

# Copy package files and install all dependencies (including dev dependencies for build)
COPY package.json bun.lock* ./
RUN bun install --frozen-lockfile

# Copy source code
COPY . .

# Build the application (if build step is needed)
# For TypeScript, we could run: RUN bun run build
# Since this project uses direct TypeScript execution with Bun, no build step is needed

# Production stage - Create minimal production image
FROM base AS production
WORKDIR /app

# Create non-root user for security
RUN addgroup -g 1000 -S bun && \
    adduser -S -u 1000 bun

# Copy production dependencies from dependencies stage
COPY --from=dependencies --chown=bun:bun /app/node_modules ./node_modules

# Copy application files from build stage
COPY --from=build --chown=bun:bun /app/src ./src
COPY --from=build --chown=bun:bun /app/package.json ./
COPY --from=build --chown=bun:bun /app/drizzle.config.ts ./

# Create directories for runtime with proper permissions
RUN mkdir -p /app/logs /app/tmp && \
    chown -R bun:bun /app/logs /app/tmp

# Switch to non-root user
USER bun

# Expose application port
EXPOSE 3000

# Environment variables for production
ENV NODE_ENV=production \
    PORT=3000 \
    HOST=0.0.0.0

# Health check configuration
HEALTHCHECK --interval=30s --timeout=10s --start-period=40s --retries=3 \
    CMD bun --version && \
    wget --no-verbose --tries=1 --spider http://localhost:3000/health || exit 1

# Set stop signal for graceful shutdown
STOPSIGNAL SIGTERM

# Start the application
CMD ["bun", "run", "start"]
