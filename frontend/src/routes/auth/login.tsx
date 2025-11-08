import { createFileRoute, Link, useNavigate } from '@tanstack/react-router';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useState } from 'react';
import { toast } from 'sonner';
import { Fingerprint, Loader2, WifiOff } from 'lucide-react';
import { Button } from '@/components/shadcn/button';
import { Input } from '@/components/shadcn/input';
import { PasswordInput } from '@/components/passwordInput';
import { Label } from '@/components/shadcn/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/shadcn/card';
import { SocialLoginButtons } from '@/components/socialLoginButtons';
import { useAuth } from '@/providers/authProvider';
import { usePasskey } from '@/hooks/usePasskey';
import { loginSchema, type LoginFormData } from '@/lib/validations/auth';
import { getRouteForPendingFlow } from '@/lib/authFlows';

export const Route = createFileRoute('/auth/login')({
  component: LoginPage,
  validateSearch: (search: Record<string, unknown>) => {
    return {
      redirect: (search.redirect as string) || '/',
    };
  },
});

function LoginPage() {
  const navigate = useNavigate();
  const { redirect } = Route.useSearch();
  const { login } = useAuth();
  const { isSupported, authenticateWithPasskey, isLoading: passkeyLoading } = usePasskey();
  const [isLoading, setIsLoading] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginFormData>({
    resolver: zodResolver(loginSchema),
  });

  const onSubmit = async (data: LoginFormData) => {
    setIsLoading(true);
    try {
      const sessionData = await login(data);

      // Check if login failed (allauth returns errors in status field, not via HTTP errors)
      if (sessionData.status === 400) {
        // Invalid credentials or validation error
        const errors = sessionData.data?.errors;
        const errorMessage =
          errors?.[0]?.message || 'Email or password is incorrect. Please try again or reset your password.';
        toast.error(errorMessage);
        return;
      }

      // Check if user is fully authenticated or has pending flow
      const isFullyAuthenticated = sessionData.status === 200;

      if (isFullyAuthenticated) {
        // User is fully authenticated - redirect to destination
        toast.success('Login successful');
        const destination = redirect && !redirect.startsWith('/auth') ? redirect : '/';
        navigate({ to: destination });
      } else {
        // Check for pending authentication flows (e.g., passkey MFA)
        const pendingFlowRoute = getRouteForPendingFlow(sessionData.data.flows);

        if (pendingFlowRoute) {
          // User needs to complete additional authentication (e.g., passkey)
          toast.info('Please complete authentication');
          navigate({ to: pendingFlowRoute });
        } else {
          // Partial authentication but no pending flow - shouldn't happen
          console.error('Partial authentication without pending flow:', sessionData);
          toast.error('Authentication incomplete. Please try again.');
        }
      }
    } catch (error: any) {
      // Check for network errors
      // Network error if: no response, or 5xx with no response data (proxy can't reach backend)
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

      if (status === 401) {
        // Invalid credentials
        errorMessage = 'Email or password is incorrect. Please try again or reset your password.';
      } else if (status === 429) {
        // Rate limited
        errorMessage = 'Too many login attempts. Please wait a few minutes and try again.';
      } else if (status >= 500) {
        // Server error (backend responded but encountered an error)
        errorMessage = 'Server error. Please try again in a moment.';
      } else {
        // Use server-provided message or fallback
        errorMessage = errors?.[0]?.message || error?.response?.data?.message || 'Login failed. Please try again.';
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
            <CardTitle className="text-2xl">Login</CardTitle>
            <CardDescription>Enter your email and password to access your account</CardDescription>
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
                  disabled={isLoading || passkeyLoading}
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

              <div className="grid gap-2">
                <div className="flex items-center justify-between">
                  <Label htmlFor="password">Password</Label>
                  <Link to="/auth/password/reset" className="text-sm underline-offset-4 hover:underline">
                    Forgot password?
                  </Link>
                </div>
                <PasswordInput
                  id="password"
                  disabled={isLoading || passkeyLoading}
                  {...register('password')}
                  aria-invalid={!!errors.password}
                  aria-describedby={errors.password ? 'password-error' : undefined}
                />
                {errors.password && (
                  <p id="password-error" className="text-sm text-destructive" role="alert">
                    {errors.password.message}
                  </p>
                )}
              </div>

              <Button type="submit" className="w-full" disabled={isLoading || passkeyLoading}>
                {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                {isLoading ? 'Logging in...' : 'Login'}
              </Button>

              {isSupported && (
                <Button
                  type="button"
                  variant="outline"
                  className="w-full"
                  disabled={isLoading || passkeyLoading}
                  onClick={async () => {
                    try {
                      await authenticateWithPasskey();
                      // Redirect to intended destination, or home if redirect is an auth route
                      const destination = redirect && !redirect.startsWith('/auth') ? redirect : '/';
                      navigate({ to: destination });
                    } catch (error) {
                      // Error already handled in hook
                    }
                  }}
                >
                  {passkeyLoading ? (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  ) : (
                    <Fingerprint className="mr-2 h-4 w-4" />
                  )}
                  {passkeyLoading ? 'Authenticating...' : 'Login with Passkey'}
                </Button>
              )}

              <div className="relative my-2">
                <div className="absolute inset-0 flex items-center">
                  <span className="w-full border-t" />
                </div>
                <div className="relative flex justify-center text-xs uppercase">
                  <span className="bg-background px-2 text-muted-foreground">Or continue with</span>
                </div>
              </div>

              <SocialLoginButtons disabled={isLoading || passkeyLoading} />

              <div className="text-center text-sm">
                Don't have an account?{' '}
                <Link to="/auth/register" className="underline underline-offset-4">
                  Sign up
                </Link>
              </div>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
