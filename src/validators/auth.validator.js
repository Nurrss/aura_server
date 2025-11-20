import { z } from 'zod';

// Password complexity rules
const passwordComplexity = z
  .string()
  .min(8, 'Password must be at least 8 characters')
  .max(100, 'Password too long')
  .regex(/[a-z]/, 'Password must contain at least one lowercase letter')
  .regex(/[A-Z]/, 'Password must contain at least one uppercase letter')
  .regex(/[0-9]/, 'Password must contain at least one number')
  .regex(
    /[^a-zA-Z0-9]/,
    'Password must contain at least one special character (!@#$%^&* etc.)'
  );

export const registerSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: passwordComplexity,
  name: z
    .string()
    .min(2, 'Name must be at least 2 characters')
    .max(100, 'Name too long')
    .optional(),
});

export const loginSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(1, 'Password is required'),
});

export const refreshSchema = z.object({
  refreshToken: z.string().min(1, 'Refresh token is required'),
});

export const forgotPasswordSchema = z.object({
  email: z.string().email('Invalid email address'),
});

export const resetPasswordSchema = z.object({
  token: z.string().min(1, 'Reset token is required'),
  newPassword: passwordComplexity,
});

export const changePasswordSchema = z.object({
  oldPassword: z.string().min(1, 'Old password is required'),
  newPassword: passwordComplexity,
});
