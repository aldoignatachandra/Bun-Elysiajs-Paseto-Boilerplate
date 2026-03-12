import { z } from 'zod';
import { emailSchema, nameSchema, passwordSchema, usernameSchema } from '../../core/validation/common.schema';

export const registerRequestSchema = z
  .object({
    email: emailSchema,
    username: usernameSchema,
    password: passwordSchema,
    firstName: nameSchema.optional(),
    lastName: nameSchema.optional(),
    name: nameSchema.optional(),
  })
  .refine(value => Boolean((value.firstName && value.lastName) || value.name), {
    message: 'firstName and lastName or name is required',
  });

export type RegisterRequestDTO = z.infer<typeof registerRequestSchema>;

export const loginRequestSchema = z.object({
  email: z.string().min(1),
  password: z.string().min(1),
});

export type LoginRequestDTO = z.infer<typeof loginRequestSchema>;

export const refreshRequestSchema = z
  .object({
    token: z.string().optional(),
    refreshToken: z.string().optional(),
  })
  .refine(value => Boolean(value.token || value.refreshToken), {
    message: 'token or refreshToken is required',
  });

export type RefreshRequestDTO = z.infer<typeof refreshRequestSchema>;

export const changePasswordRequestSchema = z
  .object({
    old_password: z.string().optional(),
    new_password: z.string().optional(),
    currentPassword: z.string().optional(),
    newPassword: z.string().optional(),
  })
  .refine(value => Boolean(value.old_password || value.currentPassword), {
    message: 'old_password or currentPassword is required',
  })
  .refine(value => Boolean(value.new_password || value.newPassword), {
    message: 'new_password or newPassword is required',
  });

export type ChangePasswordRequestDTO = z.infer<typeof changePasswordRequestSchema>;

export const registerSchema = z.object({
  email: emailSchema,
  username: usernameSchema,
  password: passwordSchema,
  firstName: nameSchema,
  lastName: nameSchema,
});

export type RegisterDTO = z.infer<typeof registerSchema>;

export const loginSchema = z.object({
  email: z.string().min(1),
  password: z.string().min(1),
});

export type LoginDTO = z.infer<typeof loginSchema>;

export const refreshTokenSchema = z.object({
  refreshToken: z.string().min(1),
});

export type RefreshTokenDTO = z.infer<typeof refreshTokenSchema>;

export const userResponseSchema = z.object({
  id: z.string().uuid(),
  email: z.string().email(),
  name: z.string().nullable(),
  role: z.string(),
  createdAt: z.date(),
  lastLoginAt: z.date().nullable(),
  updatedAt: z.date(),
});

export type UserResponse = z.infer<typeof userResponseSchema>;

export const tokenResponseSchema = z.object({
  accessToken: z.string(),
  refreshToken: z.string(),
  expiresIn: z.number(),
});

export type TokenResponse = z.infer<typeof tokenResponseSchema>;

export const registerResponseSchema = z.object({
  user: z.object({
    id: z.string().uuid(),
    email: z.string().email(),
    name: z.string().nullable(),
    role: z.string(),
    createdAt: z.date(),
  }),
  tokens: tokenResponseSchema,
});

export type RegisterResponse = z.infer<typeof registerResponseSchema>;

export const loginResponseSchema = z.object({
  user: z.object({
    id: z.string().uuid(),
    email: z.string().email(),
    name: z.string().nullable(),
    role: z.string(),
    lastLoginAt: z.date().nullable(),
  }),
  tokens: tokenResponseSchema,
});

export type LoginResponse = z.infer<typeof loginResponseSchema>;

export const refreshTokenResponseSchema = z.object({
  tokens: tokenResponseSchema,
});

export type RefreshTokenResponse = z.infer<typeof refreshTokenResponseSchema>;

export const meResponseSchema = userResponseSchema;

export type MeResponse = z.infer<typeof meResponseSchema>;

export const errorResponseSchema = z.object({
  name: z.string(),
  code: z.string(),
  message: z.string(),
  status: z.number(),
  details: z.unknown().optional(),
});

export type ErrorResponse = z.infer<typeof errorResponseSchema>;
