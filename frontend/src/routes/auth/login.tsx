import { createFileRoute, Link, useNavigate } from '@tanstack/react-router';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useState } from 'react';
import { toast } from 'sonner';
import { Fingerprint } from 'lucide-react';
import { Button } from '@/components/shadcn/button';
import { Input } from '@/components/shadcn/input';
import { Label } from '@/components/shadcn/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/shadcn/card';
import { SocialLoginButtons } from '@/components/socialLoginButtons';
import { useAuth } from '@/hooks/useAuth';
import { usePasskey } from '@/hooks/usePasskey';
import { loginSchema, type LoginFormData } from '@/lib/validations/auth';

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
      await login(data);
      toast.success('Login successful');
      // Redirect to intended destination, or home if redirect is an auth route
      const destination = redirect && !redirect.startsWith('/auth') ? redirect : '/';
      navigate({ to: destination });
    } catch (error: any) {
      const errorMessage =
        error?.response?.data?.fieldErrors?.nonFieldErrors?.[0] ||
        error?.response?.data?.message ||
        'Invalid email or password';
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
                  {...register('email')}
                  aria-invalid={!!errors.email}
                />
                {errors.email && <p className="text-sm text-destructive">{errors.email.message}</p>}
              </div>

              <div className="grid gap-2">
                <div className="flex items-center justify-between">
                  <Label htmlFor="password">Password</Label>
                  <Link to="/auth/password/reset" className="text-sm underline-offset-4 hover:underline">
                    Forgot password?
                  </Link>
                </div>
                <Input id="password" type="password" {...register('password')} aria-invalid={!!errors.password} />
                {errors.password && <p className="text-sm text-destructive">{errors.password.message}</p>}
              </div>

              <Button type="submit" className="w-full" disabled={isLoading || passkeyLoading}>
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
                  <Fingerprint className="mr-2 h-4 w-4" />
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
