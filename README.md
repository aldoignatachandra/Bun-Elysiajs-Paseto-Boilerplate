# Bun Elysia PASETO Boilerplate

> Production-ready monolith REST API boilerplate with PASETO v4 authentication

## Features

- 🔐 **PASETO v4 Authentication** - Hybrid approach: v4.local (encrypted access) + v4.public (signed refresh)
- 🏗️ **Clean Architecture** - Routes → Controllers → Services → Repositories
- 📊 **Type-Safe** - Full TypeScript with Zod validation
- 🚀 **Bun Runtime** - Fast TypeScript runtime
- 🗄️ **PostgreSQL** - With Drizzle ORM
- 📦 **Redis** - For rate limiting and caching
- ✅ **Testing** - Built-in test framework
- 🔒 **Security** - SQL injection safe, IDOR prevention

## Quick Start

### Prerequisites

- **Bun** >= 1.0.0
- **PostgreSQL** >= 16
- **Redis** >= 7.2

### Installation

```bash
# Install dependencies
bun install

# Generate PASETO keys
bun run generate:paseto-keys

# Copy environment template
cp .env.example .env
# Edit .env with your configuration

# Run migrations
bun run db:migrate

# Start development server
bun run dev
```

### Available Scripts

```bash
bun run dev          # Start development server
bun run start        # Start production server
bun run test         # Run all tests
bun run lint         # Lint code
bun run format       # Format code
```

## Project Structure

```
src/
├── app.ts              # Elysia app setup
├── server.ts           # Server bootstrap
├── config/             # Configuration
├── core/               # Core utilities
├── database/           # Database layer
├── repositories/       # Data access
├── services/           # Business logic
├── controllers/        # Request handling
├── routes/             # API routes
└── middlewares/        # Middleware
```

## License

MIT
