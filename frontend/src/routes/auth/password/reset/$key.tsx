import { createFileRoute, useNavigate } from '@tanstack/react-router';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useState } from 'react';
import { toast } from 'sonner';
import { Loader2, WifiOff } from 'lucide-react';
import { Button } from '@/components/shadcn/button';
import { PasswordInput } from '@/components/passwordInput';
import { PasswordStrengthIndicator } from '@/components/passwordStrengthIndicator';
import { Label } from '@/components/shadcn/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/shadcn/card';
import { authAPI } from '@/api/allauth';
import { passwordResetConfirmSchema, type PasswordResetConfirmFormData } from '@/lib/validations/auth';

export const Route = createFileRoute('/auth/password/reset/$key')({
  component: PasswordResetConfirmPage,
});

function PasswordResetConfirmPage() {
  const navigate = useNavigate();
  const { key } = Route.useParams();
  const [isLoading, setIsLoading] = useState(false);

  const {
    register,
    handleSubmit,
    watch,
    formState: { errors },
  } = useForm<PasswordResetConfirmFormData>({
    resolver: zodResolver(passwordResetConfirmSchema),
  });

  const password = watch('password', '');

  const onSubmit = async (data: PasswordResetConfirmFormData) => {
    setIsLoading(true);
    try {
      // Only send password once - frontend validates they match
      const response = await authAPI.resetPassword({
        key,
        password: data.password,
      });

      // Check if password reset failed (allauth returns errors in status field)
      if (response.data.status === 400) {
        // For error responses, allauth doesn't use the data field
        toast.error('Failed to reset password. The reset link may be invalid or expired.');
        return;
      }

      // Check for 401 with flows - this means success! (user not authenticated but password was reset)
      if (response.data.status === 401) {
        toast.success('Password reset successful! Please login with your new password.');
        navigate({ to: '/auth/login', search: { redirect: '/' } });
        return;
      }

      // Success - redirect to login
      toast.success('Password reset successful! Please login with your new password.');
      navigate({ to: '/auth/login', search: { redirect: '/' } });
    } catch (error: any) {
      // Check for network errors
      const status = error?.response?.status;
      const hasResponseData = error?.response?.data && Object.keys(error.response.data).length > 0;
      const isNetworkError = !error?.response || (status >= 500 && !hasResponseData);

      if (isNetworkError) {
        toast.error('Unable to connect to the server. Please check your internet connection and try again.', {
          icon: <WifiOff className="h-4 w-4" />,
          action: {
            label: 'Retry',
            onClick: () => handleSubmit(onSubmit)(),
          },
        });
        return;
      }

      // Handle server errors with better messages
      const errors = error?.response?.data?.errors;
      let errorMessage: string;

      if (status === 429) {
        errorMessage = 'Too many reset attempts. Please wait a few minutes and try again.';
      } else if (status >= 500) {
        errorMessage = 'Server error. Please try again in a moment.';
      } else {
        errorMessage =
          errors?.[0]?.message ||
          error?.response?.data?.message ||
          'Failed to reset password. The reset link may be invalid or expired.';
      }

      toast.error(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex min-h-svh items-center justify-center bg-muted p-6 md:p-10">
      <div className="w-full max-w-sm">
        <Card>
          <CardHeader className="text-center">
            <CardTitle className="text-2xl">Set New Password</CardTitle>
            <CardDescription>Enter your new password below</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit(onSubmit)} className="grid gap-4">
              <div className="grid gap-2">
                <Label htmlFor="password">New Password</Label>
                <PasswordInput
                  id="password"
                  autoFocus
                  disabled={isLoading}
                  {...register('password')}
                  aria-invalid={!!errors.password}
                  aria-describedby={errors.password ? 'password-error' : undefined}
                />
                {errors.password && (
                  <p id="password-error" className="text-sm text-destructive" role="alert">
                    {errors.password.message}
                  </p>
                )}

                {/* Password Strength Indicator */}
                {password && <PasswordStrengthIndicator password={password} />}
              </div>

              <div className="grid gap-2">
                <Label htmlFor="confirmPassword">Confirm Password</Label>
                <PasswordInput
                  id="confirmPassword"
                  disabled={isLoading}
                  {...register('confirmPassword')}
                  aria-invalid={!!errors.confirmPassword}
                  aria-describedby={errors.confirmPassword ? 'confirm-password-error' : undefined}
                />
                {errors.confirmPassword && (
                  <p id="confirm-password-error" className="text-sm text-destructive" role="alert">
                    {errors.confirmPassword.message}
                  </p>
                )}
              </div>

              <Button type="submit" className="w-full" disabled={isLoading}>
                {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                {isLoading ? 'Resetting...' : 'Reset Password'}
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
