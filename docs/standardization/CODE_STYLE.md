# Code Style Guide

> 🎨 **Comprehensive guide to maintaining consistent code formatting and style across the project**

This project uses Prettier and ESLint to maintain consistent code formatting and enforce best practices across all files.

---

## Table of Contents

- [Formatting Rules](#formatting-rules)
- [TypeScript Standards](#typescript-standards)
- [Naming Conventions](#naming-conventions)
- [Code Organization](#code-organization)
- [Best Practices](#best-practices)
- [Setup](#setup)
- [Usage](#usage)
- [Troubleshooting](#troubleshooting)

---

## Formatting Rules

### Prettier Configuration

```json
{
  "semi": true,
  "trailingComma": "es5",
  "singleQuote": true,
  "printWidth": 100,
  "tabWidth": 2,
  "useTabs": false,
  "arrowParens": "avoid",
  "endOfLine": "lf"
}
```

### Rules Summary

| Rule                | Value          | Description                                |
| ------------------- | -------------- | ------------------------------------------ |
| **Indentation**     | 2 spaces       | Consistent indentation across files        |
| **Quotes**          | Single quotes  | `'string'` instead of `"string"`           |
| **Semicolons**      | Required       | Always terminate statements                |
| **Trailing Commas** | ES5            | Multi-line structures have trailing commas |
| **Line Width**      | 100 characters | Maximum line length for readability        |
| **Arrow Params**    | Omit parens    | `x => x` instead of `(x) => x`             |
| **End of Line**     | LF             | Unix-style line endings                    |

---

## TypeScript Standards

### Type Safety

```typescript
// ✅ Good: Explicit types for function signatures
function getUserById(id: string): Promise<User | null> {
  return userRepository.findById(id);
}

// ✅ Good: Type inference for obvious cases
const users = await userRepository.findAll();

// ❌ Bad: Any type
function getUserById(id: any): any {
  return userRepository.findById(id);
}

// ✅ Good: Unknown with type guard
function processData(data: unknown): User {
  if (isUser(data)) {
    return data;
  }
  throw new Error('Invalid user data');
}
```

### Interface vs Type

```typescript
// ✅ Use interfaces for public API
interface IUserService {
  getUserById(id: string): Promise<User | null>;
  createUser(dto: CreateUserDto): Promise<User>;
}

// ✅ Use types for unions, intersections, mapped types
type UserRole = 'ADMIN' | 'USER';
type UserResponse = User & { metadata: ResponseMetadata };
type PartialUser = Partial<User>;

// ✅ Use types for utility types
type CreateUserDto = Pick<User, 'email' | 'name'>;
type UpdateUserDto = Partial<CreateUserDto>;
```

### Strict Mode Compliance

```typescript
// tsconfig.json strict mode requirements

// ✅ Good: Handle undefined/null explicitly
function getUserName(user: User | null): string {
  return user?.name ?? 'Unknown';
}

// ❌ Bad: Assume non-null
function getUserNameBad(user: User | null): string {
  return user.name; // TypeScript error in strict mode
}

// ✅ Good: Explicit return types
async function fetchUser(id: string): Promise<User> {
  const user = await db.findOne(id);
  if (!user) throw new Error('User not found');
  return user;
}

// ✅ Good: Type assertions with validation
const value = data as string;
if (typeof value !== 'string') {
  throw new Error('Invalid string');
}
```

---

## Naming Conventions

### General Rules

| Type                   | Convention                 | Example           | Bad Example      |
| ---------------------- | -------------------------- | ----------------- | ---------------- |
| **Files**              | kebab-case                 | `auth.service.ts` | `AuthService.ts` |
| **Classes**            | PascalCase                 | `AuthService`     | `authService`    |
| **Interfaces**         | PascalCase with `I` prefix | `IAuthService`    | `AuthService`    |
| **Types**              | PascalCase                 | `UserDto`         | `userDto`        |
| **Functions**          | camelCase                  | `getUserById`     | `GetUserById`    |
| **Constants**          | SCREAMING_SNAKE_CASE       | `MAX_RETRIES`     | `maxRetries`     |
| **Private Properties** | camelCase                  | `private userId`  | `private UserId` |
| **Enums**              | PascalCase                 | `UserRole`        | `userRole`       |
| **Enum Values**        | SCREAMING_SNAKE_CASE       | `ADMIN_ROLE`      | `AdminRole`      |

### Domain-Specific Naming

```typescript
// ✅ Good: Clear, descriptive names
interface UserRepository {
  findById(id: string): Promise<User | null>;
  findByEmail(email: string): Promise<User | null>;
  create(user: NewUser): Promise<User>;
}

// ❌ Bad: Ambiguous abbreviations
interface UserRepo {
  get(id: string): Promise<User>;
  crt(user: NewUser): Promise<User>;
}

// ✅ Good: Boolean methods with is/has/can prefix
interface User {
  isActive: boolean;
  hasPermission(permission: string): boolean;
  canAccessResource(resource: string): boolean;
}

// ✅ Good: Async methods with clear naming
interface UserService {
  // Use "create" not "createAsync"
  createUser(dto: CreateUserDto): Promise<User>;

  // Use "find" not "findAsync"
  findById(id: string): Promise<User | null>;

  // Return type indicates async, no need for suffix
}
```

---

## Code Organization

### File Structure

```
src/
├── core/              # Core utilities (framework-agnostic)
│   ├── paseto/       # PASETO implementation
│   ├── crypto/       # Cryptographic utilities
│   ├── logging/      # Logging infrastructure
│   └── validation/   # Shared validation schemas
├── database/         # Database layer
│   ├── schema/       # Drizzle schemas
│   └── migrations/   # Migration files
├── repositories/     # Data access layer
├── services/         # Business logic layer
├── controllers/      # Request/response handling
├── routes/          # API routes
└── middlewares/     # Elysia middleware
```

### Import Order

```typescript
// 1. Node.js built-ins
import { setTimeout } from 'node:timers/promises';

// 2. External dependencies
import { Elysia } from 'elysia';
import pino from 'pino';

// 3. Internal imports (grouped by path)
import { config } from '@config';
import { getPasetoService } from '@core/paseto';
import { UserRepository } from '@repositories/users.repository';

// 4. Type imports (if needed)
import type { Context } from 'elysia';
import type { User } from '@database/schema';

// 5. Relative imports (avoid when possible)
import { localHelper } from './helpers';
```

### Class Organization

```typescript
// ✅ Good: Consistent class structure
export class UserService implements IUserService {
  // 1. Public properties
  public readonly serviceName: string = 'UserService';

  // 2. Private properties
  private cache: Map<string, User> = new Map();

  // 3. Constructor
  constructor(@inject(RepositoryTokens.UserRepository) private userRepository: UserRepository) {}

  // 4. Public methods (CRUD operations first)
  async findById(id: string): Promise<User | null> {
    // Implementation
  }

  async create(dto: CreateUserDto): Promise<User> {
    // Implementation
  }

  // 5. Protected methods
  protected validateUser(user: User): void {
    // Implementation
  }

  // 6. Private methods
  private hashPassword(password: string): string {
    // Implementation
  }
}
```

---

## Best Practices

### Error Handling

```typescript
// ✅ Good: Specific error types
try {
  const user = await this.userService.findById(id);
} catch (error) {
  if (error instanceof UserNotFoundError) {
    throw new AppError('User not found', 'USER_NOT_FOUND', 404);
  }
  if (error instanceof DatabaseError) {
    throw new AppError('Database error', 'DATABASE_ERROR', 500);
  }
  throw new AppError('Unexpected error', 'INTERNAL_ERROR', 500);
}

// ❌ Bad: Generic catch-all
try {
  const user = await this.userService.findById(id);
} catch (error) {
  throw new Error('Something went wrong'); // Loses context
}
```

### Async/Await

```typescript
// ✅ Good: Use async/await for readability
async function getUserWithPosts(id: string): Promise<UserWithPosts> {
  const user = await this.userRepository.findById(id);
  if (!user) {
    throw new UserNotFoundError(id);
  }

  const posts = await this.postRepository.findByUserId(id);
  return { ...user, posts };
}

// ✅ Good: Parallel operations with Promise.all
async function getUserData(id: string): Promise<UserData> {
  const [user, posts, settings] = await Promise.all([
    this.userRepository.findById(id),
    this.postRepository.findByUserId(id),
    this.settingsRepository.findByUserId(id),
  ]);

  return { user, posts, settings };
}

// ❌ Bad: Sequential independent operations
async function getUserDataBad(id: string): Promise<UserData> {
  const user = await this.userRepository.findById(id);
  const posts = await this.postRepository.findByUserId(id); // Waits unnecessarily
  const settings = await this.settingsRepository.findByUserId(id); // Waits unnecessarily

  return { user, posts, settings };
}
```

### Null/Undefined Handling

```typescript
// ✅ Good: Optional chaining
const email = user?.profile?.email ?? 'Not provided';

// ✅ Good: Nullish coalescing
const timeout = config?.timeout ?? 5000;

// ✅ Good: Explicit null checks
function getUserSafe(id: string): User | null {
  const user = userRepository.findById(id);
  return user ?? null;
}

// ❌ Bad: Force non-null assertion
const email = user.profile.email!; // Crash if undefined
```

### Immutability

```typescript
// ✅ Good: Immutable updates
const updatedUser = {
  ...user,
  lastLoginAt: new Date(),
};

// ✅ Good: Immutable array operations
const activeUsers = users.filter(u => u.isActive);
const usersWithRole = users.map(u => ({ ...u, role: 'USER' }));

// ❌ Bad: Mutating objects directly
user.lastLoginAt = new Date();
users.push(newUser); // Mutates original array
```

### Constants vs Configuration

```typescript
// ✅ Good: Constants for fixed values
const MAX_LOGIN_ATTEMPTS = 5;
const TOKEN_EXPIRY_MINUTES = 15;
const DEFAULT_PAGE_SIZE = 20;

// ✅ Good: Configuration for environment-specific values
const config = {
  maxRetries: env.MAX_RETRIES ?? 3,
  timeout: env.TIMEOUT ?? 5000,
};

// ❌ Bad: Magic numbers
function shouldLockout(attempts: number): boolean {
  return attempts > 5; // What is 5?
}

// ✅ Good: Named constants
function shouldLockout(attempts: number): boolean {
  return attempts > MAX_LOGIN_ATTEMPTS;
}
```

---

## Setup

### 1. Install Dependencies

```bash
bun install
```

### 2. Editor Setup

#### VSCode

Install the recommended extensions from `.vscode/extensions.json`:

```json
{
  "recommendations": ["esbenp.prettier-vscode", "dbaeumer.vscode-eslint", "bun-typescript.vscode-bun"]
}
```

The project includes `.vscode/settings.json` which automatically configures:

```json
{
  "editor.formatOnSave": true,
  "editor.defaultFormatter": "esbenp.prettier-vscode",
  "editor.codeActionsOnSave": {
    "source.fixAll.eslint": true
  },
  "typescript.tsdk": "node_modules/typescript/lib",
  "typescript.enablePromptUseWorkspaceTsdk": true
}
```

### 3. Git Hooks

Set up pre-commit hooks to automatically check formatting:

```bash
bun run prepare
```

This configures Husky to run formatting checks before commits.

---

## Usage

### Format All Files

```bash
bun run format
```

### Check Formatting Without Changes

```bash
bun run format:check
```

### Lint Code

```bash
bun run lint
```

### Fix Linting Issues

```bash
bun run lint:fix
```

### Run All Checks

```bash
bun run lint && bun run format:check
```

---

## File Exclusions

Files excluded from formatting (defined in `.prettierignore`):

```
# Dependencies
node_modules/

# Build outputs
dist/
build/

# Generated files
*.generated.ts
*.generated.js

# Environment files
.env*
!.env.example

# Logs
*.log

# Database files
*.db
*.sqlite

# IDE files
.vscode/
.idea/

# OS files
.DS_Store
Thumbs.db

# Lock files
package-lock.json
yarn.lock

# Coverage
coverage/
.nyc_output/

# Temporary files
tmp/
temp/

# Minified files
*.min.js
*.min.css
```

---

## Why Consistent Formatting Matters

### Benefits

1. **Reduced Cognitive Load** 🧠
   - Developers don't need to think about formatting
   - Focus on code logic, not style

2. **Cleaner Diffs** 📊
   - Changes in code reviews show only functional changes
   - No whitespace noise in pull requests

3. **Automated Enforcement** 🤖
   - Pre-commit hooks ensure consistency
   - No manual code reviews needed for style

4. **Team Consistency** 👥
   - All developers follow the same style
   - Regardless of personal preferences

5. **Easier Onboarding** 🚀
   - New developers adapt quickly
   - Clear style guide to follow

6. **Better Code Navigation** 📍
   - Consistent naming makes code searchable
   - Predictable file organization

---

## Troubleshooting

### Prettier Not Formatting Files

**Problem:** Files not being formatted automatically.

**Solutions:**

1. Check if Prettier extension is installed

```bash
code --list-extensions | grep prettier
```

2. Verify file extension is included

```bash
# Check package.json format script
cat package.json | grep format
```

3. Ensure file is not in `.prettierignore`

```bash
cat .prettierignore
```

4. Reload VSCode window

```bash
# In VSCode: Developer > Reload Window
```

### Conflicts with ESLint

**Problem:** ESLint and Prettier rules conflict.

**Solutions:**

1. Use `eslint-config-prettier` to disable conflicting rules

```bash
bun add -D eslint-config-prettier
```

2. Update `.eslintrc.json`

```json
{
  "extends": [
    "eslint:recommended",
    "plugin:@typescript-eslint/recommended",
    "prettier" // Must be last
  ]
}
```

3. Run Prettier after ESLint

```bash
bun run lint:fix && bun run format
```

### Editor-Specific Issues

**VSCode:**

1. Install recommended extensions
2. Check workspace settings are applied
3. Reload window after config changes
4. Check for workspace-specific overrides

**Other Editors:**

- Refer to editor's Prettier integration documentation
- Ensure `.prettierrc` is being loaded
- Check file associations for `.ts`, `.js` files

### Git Hooks Not Running

**Problem:** Pre-commit hooks not executing.

**Solutions:**

1. Verify Husky is installed

```bash
ls .husky/pre-commit
```

2. Reinstall hooks

```bash
bun run prepare
```

3. Check git configuration

```bash
git config core.hooksPath
```

4. Manually test hook

```bash
./.husky/pre-commit
```

---

## Additional Resources

- [Prettier Documentation](https://prettier.io/docs/en/)
- [ESLint Documentation](https://eslint.org/docs/latest/)
- [TypeScript Style Guide](https://typescript-eslint.io/rules/)
- [Bun TypeScript Guide](https://bun.sh/docs/typescript)

---

## Quick Reference

```bash
# Format code
bun run format

# Check formatting
bun run format:check

# Lint code
bun run lint

# Fix linting
bun run lint:fix

# Setup hooks
bun run prepare
```

---

**Last Updated:** 2025-03-09

**Version:** 1.0.0
