#!/bin/bash
# PostgreSQL Database Initialization Script
# Purpose: Initialize database with required extensions and schemas
# Execution: Runs automatically on container first start

set -e

echo "========================================"
echo "PostgreSQL Initialization Script"
echo "========================================"

# Database connection parameters
DB_USER=${POSTGRES_USER:-postgres}
DB_NAME=${POSTGRES_DB:-bun_elysia_paseto}
DB_HOST=${DB_HOST:-localhost}
DB_PORT=${DB_PORT:-5432}

echo "Database: $DB_NAME"
echo "User: $DB_USER"
echo "Host: $DB_HOST"
echo "Port: $DB_PORT"
echo ""

# Wait for PostgreSQL to be ready
echo "Waiting for PostgreSQL to be ready..."
until pg_isready -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER"; do
  echo "PostgreSQL is unavailable - sleeping"
  sleep 2
done

echo "PostgreSQL is ready!"
echo ""

# Execute SQL commands
echo "Running database initialization..."

psql -v ON_ERROR_STOP=1 --username "$DB_USER" --dbname "$DB_NAME" <<-EOSQL
  -- Enable required extensions
  CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
  CREATE EXTENSION IF NOT EXISTS "pgcrypto";
  CREATE EXTENSION IF NOT EXISTS "pg_stat_statements";

  -- Create custom schema if not exists
  CREATE SCHEMA IF NOT EXISTS app;

  -- Grant permissions
  GRANT ALL PRIVILEGES ON SCHEMA app TO "$DB_USER";
  GRANT ALL PRIVILEGES ON DATABASE "$DB_NAME" TO "$DB_USER";

  -- Create initial admin function for health checks
  CREATE OR REPLACE FUNCTION health_check()
  RETURNS TABLE (status text, timestamp timestamptz)
  AS \$\$
  BEGIN
    RETURN QUERY SELECT 'healthy'::text, now()::timestamptz;
  END;
  \$\$ LANGUAGE plpgsql;
EOSQL

echo "Database initialization completed successfully!"
echo ""

# Create additional schemas if needed
echo "Creating additional schemas..."

psql -v ON_ERROR_STOP=1 --username "$DB_USER" --dbname "$DB_NAME" <<-EOSQL
  -- Create schemas for multi-tenancy support (optional)
  CREATE SCHEMA IF NOT EXISTS tenant_1;
  CREATE SCHEMA IF NOT EXISTS tenant_2;

  -- Grant permissions on tenant schemas
  GRANT ALL PRIVILEGES ON SCHEMA tenant_1 TO "$DB_USER";
  GRANT ALL PRIVILEGES ON SCHEMA tenant_2 TO "$DB_USER";
EOSQL

echo "Schema creation completed!"
echo ""
echo "========================================"
echo "PostgreSQL initialization complete!"
echo "========================================"
