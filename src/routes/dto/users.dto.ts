/* eslint-disable @typescript-eslint/no-unsafe-assignment */
/* eslint-disable @typescript-eslint/no-unsafe-call */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */
import { z } from 'zod';
import { emailSchema, nameSchema, paginationSchema, passwordSchema, uuidSchema, usernameSchema } from '../../core/validation/common.schema';

export const updateProfileSchema = z.object({
  name: nameSchema.optional(),
  username: usernameSchema.optional(),
});

export type UpdateProfileDTO = z.infer<typeof updateProfileSchema>;

export const getUsersQuerySchema = paginationSchema.extend({
  search: z.string().optional(),
  include_deleted: z.coerce.boolean().optional().default(false),
  only_deleted: z.coerce.boolean().optional().default(false),
});

export type GetUsersQueryDTO = z.infer<typeof getUsersQuerySchema>;

export const activityQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(10),
  user_id: z
    .string()
    .transform(val => (val === '' ? undefined : val))
    .pipe(uuidSchema.optional())
    .optional(),
  action: z
    .string()
    .transform(val => (val === '' ? undefined : val))
    .optional(),
  resource: z
    .string()
    .transform(val => (val === '' ? undefined : val))
    .optional(),
});

export type ActivityQueryDTO = z.infer<typeof activityQuerySchema>;

export const userIdParamSchema = z.object({
  id: uuidSchema,
});

export type UserIdParamDTO = z.infer<typeof userIdParamSchema>;

export const deleteUserQuerySchema = z.object({
  force: z.string().optional(),
});

export type DeleteUserQueryDTO = z.infer<typeof deleteUserQuerySchema>;

export const updatePasswordSchema = z.object({
  currentPassword: z.string().min(1, 'Current password is required'),
  newPassword: passwordSchema,
});

export type UpdatePasswordDTO = z.infer<typeof updatePasswordSchema>;

export const createUserSchema = z.object({
  email: emailSchema,
  username: usernameSchema,
  password: passwordSchema,
  name: nameSchema.optional(),
  role: z.string().optional(),
});

export type CreateUserDTO = z.infer<typeof createUserSchema>;

export const updateUserSchema = z.object({
  email: emailSchema.optional(),
  username: usernameSchema.optional(),
  name: nameSchema.optional(),
  role: z.string().optional(),
});

export type UpdateUserDTO = z.infer<typeof updateUserSchema>;
