/**
 * Service Dependency Injection Tokens
 *
 * Constants used for dependency injection with TSyringe.
 * These tokens allow for type-safe dependency resolution.
 */

export const REPOSITORY_TOKENS = {
  USER_REPOSITORY: 'USER_REPOSITORY',
  SESSION_REPOSITORY: 'SESSION_REPOSITORY',
  UNIT_OF_WORK: 'UNIT_OF_WORK',
} as const;

export const SERVICE_TOKENS = {
  AUTH_SERVICE: 'AUTH_SERVICE',
  USER_SERVICE: 'USER_SERVICE',
  PRODUCT_SERVICE: 'PRODUCT_SERVICE',
} as const;

export const CORE_TOKENS = {
  PASSWORD_SERVICE: 'PASSWORD_SERVICE',
  PASETO_SERVICE: 'PASETO_SERVICE',
  LOGGER: 'LOGGER',
} as const;

export const INFRASTRUCTURE_TOKENS = {
  DATABASE: 'DATABASE',
  REDIS: 'REDIS',
} as const;
