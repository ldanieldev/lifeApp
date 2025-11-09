import { authAPI } from '@/api/allauth';
import type { AllauthError } from '@/api/allauth.types';
import { PasswordInput } from '@/components/passwordInput';
import { PasswordStrengthIndicator } from '@/components/passwordStrengthIndicator';
import { Button } from '@/components/shadcn/button';
import { Label } from '@/components/shadcn/label';
import { zodResolver } from '@hookform/resolvers/zod';
import { isAxiosError } from 'axios';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { toast } from 'sonner';
import { z } from 'zod';

// Validation schema
const passwordChangeSchema = z
  .object({
    currentPassword: z.string().min(1, 'Current password is required'),
    newPassword: z
      .string()
      .min(8, 'Must be at least 8 characters')
      .regex(/[!@#$%^&*(),.?":{}|<>]/, 'Must contain a special character'),
    confirmPassword: z.string(),
  })
  .refine((data) => data.newPassword !== data.currentPassword, {
    message: 'New password must be different from current password',
    path: ['newPassword'],
  })
  .refine((data) => data.newPassword === data.confirmPassword, {
    message: "Passwords don't match",
    path: ['confirmPassword'],
  });

type PasswordChangeFormData = z.infer<typeof passwordChangeSchema>;

export function PasswordChangeForm() {
  const [isLoading, setIsLoading] = useState(false);

  const {
    register,
    handleSubmit,
    watch,
    reset,
    setError,
    formState: { errors },
  } = useForm<PasswordChangeFormData>({
    resolver: zodResolver(passwordChangeSchema),
  });

  const newPassword = watch('newPassword', '');

  const onSubmit = async (data: PasswordChangeFormData) => {
    setIsLoading(true);
    try {
      await authAPI.changePassword({
        currentPassword: data.currentPassword,
        newPassword: data.newPassword,
      });
      toast.success('Password changed successfully');
      reset();
    } catch (error: unknown) {
      // Handle allauth error format: { errors: [{ message, code, param? }] }
      if (isAxiosError(error)) {
        const errors = error.response?.data?.errors as AllauthError[] | undefined;

        if (errors && Array.isArray(errors)) {
          // Map backend errors to form fields
          errors.forEach((err) => {
            if (err.param === 'currentPassword' || err.param === 'current_password') {
              setError('currentPassword', { message: err.message });
            } else if (err.param === 'newPassword' || err.param === 'new_password' || err.param === 'password') {
              setError('newPassword', { message: err.message });
            } else {
              // Generic error, show as toast
              toast.error(err.message || 'Failed to change password');
            }
          });
        } else {
          // Axios error but unexpected format
          toast.error('Failed to change password. Please try again.');
        }
      } else {
        // Network error or unexpected error
        toast.error('Failed to change password. Please try again.');
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
      {/* Current Password */}
      <div className="space-y-2">
        <Label htmlFor="currentPassword">Current Password</Label>
        <PasswordInput id="currentPassword" {...register('currentPassword')} aria-invalid={!!errors.currentPassword} />
        {errors.currentPassword && <p className="text-sm text-destructive">{errors.currentPassword.message}</p>}
      </div>

      {/* New Password */}
      <div className="space-y-2">
        <Label htmlFor="newPassword">New Password</Label>
        <PasswordInput id="newPassword" {...register('newPassword')} aria-invalid={!!errors.newPassword} />
        {errors.newPassword && <p className="text-sm text-destructive">{errors.newPassword.message}</p>}

        {/* Password Strength Indicator */}
        {newPassword && <PasswordStrengthIndicator password={newPassword} />}
      </div>

      {/* Confirm Password */}
      <div className="space-y-2">
        <Label htmlFor="confirmPassword">Confirm New Password</Label>
        <PasswordInput id="confirmPassword" {...register('confirmPassword')} aria-invalid={!!errors.confirmPassword} />
        {errors.confirmPassword && <p className="text-sm text-destructive">{errors.confirmPassword.message}</p>}
      </div>

      {/* Form Actions */}
      <div className="flex gap-3">
        <Button type="submit" disabled={isLoading}>
          {isLoading ? 'Changing Password...' : 'Change Password'}
        </Button>
        <Button type="button" variant="outline" onClick={() => reset()} disabled={isLoading}>
          Cancel
        </Button>
      </div>
    </form>
  );
}
