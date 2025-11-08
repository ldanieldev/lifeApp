import { createFileRoute, Link, useNavigate } from '@tanstack/react-router';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useState } from 'react';
import { toast } from 'sonner';
import { Loader2, WifiOff } from 'lucide-react';
import { Button } from '@/components/shadcn/button';
import { Input } from '@/components/shadcn/input';
import { Label } from '@/components/shadcn/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/shadcn/card';
import { authAPI } from '@/api/allauth';
import { passwordResetRequestSchema, type PasswordResetRequestFormData } from '@/lib/validations/auth';

export const Route = createFileRoute('/auth/password/reset/')({
  component: PasswordResetPage,
});

function PasswordResetPage() {
  const navigate = useNavigate();
  const [isLoading, setIsLoading] = useState(false);
  const [emailSent, setEmailSent] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<PasswordResetRequestFormData>({
    resolver: zodResolver(passwordResetRequestSchema),
  });

  const onSubmit = async (data: PasswordResetRequestFormData) => {
    setIsLoading(true);
    try {
      const response = await authAPI.requestPasswordReset(data);

      // Check if request failed (allauth returns errors in status field)
      if (response.data.status === 400) {
        // For error responses, allauth doesn't use the data field
        toast.error('Failed to send reset email. Please check your email address.');
        return;
      }

      setEmailSent(true);
      toast.success('Password reset email sent');
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
        errorMessage = 'Too many reset requests. Please wait a few minutes and try again.';
      } else if (status >= 500) {
        errorMessage = 'Server error. Please try again in a moment.';
      } else {
        errorMessage =
          errors?.[0]?.message || error?.response?.data?.message || 'Failed to send reset email. Please try again.';
      }

      toast.error(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  if (emailSent) {
    return (
      <div className="flex min-h-svh items-center justify-center bg-muted p-6 md:p-10">
        <div className="w-full max-w-sm">
          <Card>
            <CardHeader className="text-center">
              <CardTitle className="text-2xl">Check your email</CardTitle>
              <CardDescription>
                We've sent you a password reset link. Please check your email and follow the instructions.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid gap-4">
                <Button onClick={() => navigate({ to: '/auth/login', search: { redirect: '/' } })} className="w-full">
                  Back to Login
                </Button>
                <Button variant="outline" onClick={() => setEmailSent(false)} className="w-full">
                  Resend Email
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-svh items-center justify-center bg-muted p-6 md:p-10">
      <div className="w-full max-w-sm">
        <Card>
          <CardHeader className="text-center">
            <CardTitle className="text-2xl">Reset Password</CardTitle>
            <CardDescription>Enter your email address and we'll send you a reset link</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit(onSubmit)} className="grid gap-4">
              <div className="grid gap-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="m@example.com"
                  autoFocus
                  disabled={isLoading}
                  {...register('email')}
                  aria-invalid={!!errors.email}
                  aria-describedby={errors.email ? 'email-error' : undefined}
                />
                {errors.email && (
                  <p id="email-error" className="text-sm text-destructive" role="alert">
                    {errors.email.message}
                  </p>
                )}
              </div>

              <Button type="submit" className="w-full" disabled={isLoading}>
                {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                {isLoading ? 'Sending...' : 'Send Reset Link'}
              </Button>

              <div className="text-center text-sm">
                Remember your password?{' '}
                <Link to="/auth/login" search={{ redirect: '/' }} className="underline underline-offset-4">
                  Sign in
                </Link>
              </div>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
