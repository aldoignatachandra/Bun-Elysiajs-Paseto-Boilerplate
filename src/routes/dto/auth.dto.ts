/**
 * Authentication DTOs
 *
 * Data Transfer Objects with Zod validation schemas for authentication endpoints.
 * These schemas ensure type safety and validate request/response data.
 *
 * @module AuthDTO
 */

import { z } from 'zod';
import { emailSchema, passwordSchema, nameSchema } from '../../core/validation/common.schema';

/**
 * Register Request DTO
 *
 * Schema for user registration requests.
 * Validates email, password, and name fields.
 */
export const registerSchema = z.object({
  email: emailSchema,
  password: passwordSchema,
  firstName: nameSchema,
  lastName: nameSchema,
});

export type RegisterDTO = z.infer<typeof registerSchema>;

/**
 * Login Request DTO
 *
 * Schema for user login requests.
 * Validates email and password credentials.
 */
export const loginSchema = z.object({
  email: emailSchema,
  password: z.string().min(1, 'Password is required'),
});

export type LoginDTO = z.infer<typeof loginSchema>;

/**
 * Refresh Token Request DTO
 *
 * Schema for token refresh requests.
 * Validates the refresh token.
 */
export const refreshTokenSchema = z.object({
  refreshToken: z.string().min(1, 'Refresh token is required'),
});

export type RefreshTokenDTO = z.infer<typeof refreshTokenSchema>;

/**
 * User Response DTO
 *
 * Schema for user data in responses.
 * Excludes sensitive information like password hash.
 */
export const userResponseSchema = z.object({
  id: z.string().uuid(),
  email: z.string().email(),
  firstName: z.string(),
  lastName: z.string(),
  isActive: z.boolean(),
  emailVerified: z.boolean(),
  createdAt: z.date(),
  lastLoginAt: z.date().nullable(),
  updatedAt: z.date(),
});

export type UserResponse = z.infer<typeof userResponseSchema>;

/**
 * Token Response DTO
 *
 * Schema for authentication token responses.
 */
export const tokenResponseSchema = z.object({
  accessToken: z.string(),
  refreshToken: z.string(),
  expiresIn: z.number(),
});

export type TokenResponse = z.infer<typeof tokenResponseSchema>;

/**
 * Register Response DTO
 *
 * Schema for successful registration response.
 * Includes user data and authentication tokens.
 */
export const registerResponseSchema = z.object({
  user: userResponseSchema,
  tokens: tokenResponseSchema,
});

export type RegisterResponse = z.infer<typeof registerResponseSchema>;

/**
 * Login Response DTO
 *
 * Schema for successful login response.
 * Includes user data and authentication tokens.
 */
export const loginResponseSchema = z.object({
  user: userResponseSchema,
  tokens: tokenResponseSchema,
});

export type LoginResponse = z.infer<typeof loginResponseSchema>;

/**
 * Refresh Token Response DTO
 *
 * Schema for successful token refresh response.
 * Includes new authentication tokens.
 */
export const refreshTokenResponseSchema = z.object({
  tokens: tokenResponseSchema,
});

export type RefreshTokenResponse = z.infer<typeof refreshTokenResponseSchema>;

/**
 * Me Response DTO
 *
 * Schema for current user endpoint response.
 * Returns user data without tokens.
 */
export const meResponseSchema = userResponseSchema;

export type MeResponse = z.infer<typeof meResponseSchema>;

/**
 * Error Response DTO
 *
 * Schema for error responses.
 * Provides consistent error structure across all endpoints.
 */
export const errorResponseSchema = z.object({
  name: z.string(),
  code: z.string(),
  message: z.string(),
  status: z.number(),
  details: z.unknown().optional(),
});

export type ErrorResponse = z.infer<typeof errorResponseSchema>;
