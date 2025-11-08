import { z } from 'zod';

// Password requirements matching backend Django validators + special character requirement
// - Min 8 characters
// - Must contain at least one special character (!@#$%^&*(),.?":{}|<>)
const passwordValidation = z
  .string()
  .min(8, 'Must be at least 8 characters')
  .regex(/[!@#$%^&*(),.?":{}|<>]/, 'Must contain a special character');

export const loginSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(1, 'Password is required'),
});

export const registerSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: passwordValidation,
});

export const passwordResetRequestSchema = z.object({
  email: z.string().email('Invalid email address'),
});

export const passwordResetConfirmSchema = z
  .object({
    password: passwordValidation,
    confirmPassword: z.string(),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: 'Passwords do not match',
    path: ['confirmPassword'],
  });

export const passwordChangeSchema = z
  .object({
    oldPassword: z.string().min(1, 'Current password is required'),
    newPassword: passwordValidation,
    confirmPassword: z.string(),
  })
  .refine((data) => data.newPassword === data.confirmPassword, {
    message: 'Passwords do not match',
    path: ['confirmPassword'],
  });

export const userProfileUpdateSchema = z.object({
  firstName: z.string().min(1, 'First name is required').max(150, 'First name is too long'),
  lastName: z.string().min(1, 'Last name is required').max(150, 'Last name is too long'),
  sex: z.enum(['M', 'F', 'O', 'N', '']).optional(),
});

export type LoginFormData = z.infer<typeof loginSchema>;
export type RegisterFormData = z.infer<typeof registerSchema>;
export type PasswordResetRequestFormData = z.infer<typeof passwordResetRequestSchema>;
export type PasswordResetConfirmFormData = z.infer<typeof passwordResetConfirmSchema>;
export type PasswordChangeFormData = z.infer<typeof passwordChangeSchema>;
export type UserProfileUpdateFormData = z.infer<typeof userProfileUpdateSchema>;
