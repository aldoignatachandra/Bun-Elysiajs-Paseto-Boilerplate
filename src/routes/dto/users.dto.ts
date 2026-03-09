/**
 * Users DTOs
 *
 * Data Transfer Objects with Zod validation schemas for user management endpoints.
 * These schemas ensure type safety and validate request/response data.
 *
 * @module UsersDTO
 */

import { z } from 'zod';
import {
  emailSchema,
  passwordSchema,
  nameSchema,
  paginationSchema,
} from '../../core/validation/common.schema';

/**
 * Update Profile Request DTO
 *
 * Schema for updating user profile.
 * Only firstName and lastName can be updated.
 */
export const updateProfileSchema = z.object({
  firstName: nameSchema.optional(),
  lastName: nameSchema.optional(),
});

export type UpdateProfileDTO = z.infer<typeof updateProfileSchema>;

/**
 * Update Password Request DTO
 *
 * Schema for updating user password.
 * Requires current password and new password.
 */
export const updatePasswordSchema = z.object({
  currentPassword: z.string().min(1, 'Current password is required'),
  newPassword: passwordSchema,
});

export type UpdatePasswordDTO = z.infer<typeof updatePasswordSchema>;

/**
 * User List Query DTO
 *
 * Schema for user list query parameters.
 * Supports pagination, sorting, and search.
 */
export const getUsersQuerySchema = paginationSchema.extend({
  search: z.string().optional(),
});

export type GetUsersQueryDTO = z.infer<typeof getUsersQuerySchema>;

/**
 * Create User Request DTO (Admin)
 *
 * Schema for creating a new user (admin function).
 */
export const createUserSchema = z.object({
  email: emailSchema,
  password: passwordSchema,
  firstName: nameSchema,
  lastName: nameSchema,
  isActive: z.boolean().optional(),
  emailVerified: z.boolean().optional(),
});

export type CreateUserDTO = z.infer<typeof createUserSchema>;

/**
 * Update User Request DTO (Admin)
 *
 * Schema for updating a user (admin function).
 * All fields are optional.
 */
export const updateUserSchema = z.object({
  email: emailSchema.optional(),
  firstName: nameSchema.optional(),
  lastName: nameSchema.optional(),
  isActive: z.boolean().optional(),
  emailVerified: z.boolean().optional(),
});

export type UpdateUserDTO = z.infer<typeof updateUserSchema>;

/**
 * User Response DTO
 *
 * Schema for user data in responses.
 */
export const userResponseSchema = z.object({
  id: z.string().uuid(),
  email: z.string().email(),
  firstName: z.string(),
  lastName: z.string(),
  isActive: z.boolean(),
  emailVerified: z.boolean(),
  createdAt: z.date(),
  updatedAt: z.date(),
  lastLoginAt: z.date().nullable(),
});

export type UserResponse = z.infer<typeof userResponseSchema>;

/**
 * User List Item Response DTO
 *
 * Schema for user list items (lighter version).
 */
export const userListItemSchema = z.object({
  id: z.string().uuid(),
  email: z.string().email(),
  firstName: z.string(),
  lastName: z.string(),
  isActive: z.boolean(),
  emailVerified: z.boolean(),
  createdAt: z.date(),
  lastLoginAt: z.date().nullable(),
});

export type UserListItem = z.infer<typeof userListItemSchema>;

/**
 * Pagination Metadata DTO
 *
 * Schema for pagination metadata in list responses.
 */
export const paginationMetaSchema = z.object({
  page: z.number().int().positive(),
  limit: z.number().int().positive(),
  total: z.number().int().nonnegative(),
  totalPages: z.number().int().nonnegative(),
  hasNext: z.boolean(),
  hasPrev: z.boolean(),
});

export type PaginationMeta = z.infer<typeof paginationMetaSchema>;

/**
 * Users List Response DTO
 *
 * Schema for paginated users list response.
 */
export const usersListResponseSchema = z.object({
  users: z.array(userListItemSchema),
  pagination: paginationMetaSchema,
});

export type UsersListResponse = z.infer<typeof usersListResponseSchema>;

/**
 * Update Profile Response DTO
 *
 * Schema for profile update response.
 */
export const updateProfileResponseSchema = userResponseSchema;

export type UpdateProfileResponse = z.infer<typeof updateProfileResponseSchema>;

/**
 * Update Password Response DTO
 *
 * Schema for password update response.
 */
export const updatePasswordResponseSchema = z.object({
  message: z.string(),
});

export type UpdatePasswordResponse = z.infer<typeof updatePasswordResponseSchema>;

/**
 * Create User Response DTO (Admin)
 *
 * Schema for user creation response.
 */
export const createUserResponseSchema = userResponseSchema;

export type CreateUserResponse = z.infer<typeof createUserResponseSchema>;

/**
 * Update User Response DTO (Admin)
 *
 * Schema for user update response.
 */
export const updateUserResponseSchema = userResponseSchema;

export type UpdateUserResponse = z.infer<typeof updateUserResponseSchema>;

/**
 * Delete User Response DTO
 *
 * Schema for user deletion response.
 */
export const deleteUserResponseSchema = z.object({
  message: z.string(),
});

export type DeleteUserResponse = z.infer<typeof deleteUserResponseSchema>;

/**
 * User Stats Response DTO
 *
 * Schema for user statistics response.
 */
export const userStatsResponseSchema = z.object({
  totalUsers: z.number().int().nonnegative(),
  activeUsers: z.number().int().nonnegative(),
  verifiedUsers: z.number().int().nonnegative(),
  newUsersThisMonth: z.number().int().nonnegative(),
  newUsersThisWeek: z.number().int().nonnegative(),
});

export type UserStatsResponse = z.infer<typeof userStatsResponseSchema>;
