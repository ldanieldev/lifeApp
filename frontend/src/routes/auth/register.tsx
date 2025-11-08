import { createFileRoute, Link, useNavigate } from '@tanstack/react-router';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useState } from 'react';
import { toast } from 'sonner';
import { Fingerprint, Loader2, WifiOff } from 'lucide-react';
import { Button } from '@/components/shadcn/button';
import { Input } from '@/components/shadcn/input';
import { PasswordInput } from '@/components/passwordInput';
import { PasswordStrengthIndicator } from '@/components/passwordStrengthIndicator';
import { Label } from '@/components/shadcn/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/shadcn/card';
import { SocialLoginButtons } from '@/components/socialLoginButtons';
import { useAuth } from '@/providers/authProvider';
import { usePasskey } from '@/hooks/usePasskey';
import { registerSchema, type RegisterFormData } from '@/lib/validations/auth';

export const Route = createFileRoute('/auth/register')({
  component: RegisterPage,
});

function RegisterPage() {
  const navigate = useNavigate();
  const { register: registerUser } = useAuth();
  const { isSupported, signupWithPasskey, isLoading: passkeyLoading } = usePasskey();
  const [isLoading, setIsLoading] = useState(false);
  const [showPasskeySignup, setShowPasskeySignup] = useState(false);
  const [passkeyEmail, setPasskeyEmail] = useState('');

  const {
    register,
    handleSubmit,
    watch,
    formState: { errors },
  } = useForm<RegisterFormData>({
    resolver: zodResolver(registerSchema),
  });

  const password = watch('password', '');

  const onSubmit = async (data: RegisterFormData) => {
    setIsLoading(true);
    try {
      const sessionData = await registerUser({ email: data.email, password: data.password });

      // Check if registration failed (allauth returns errors in status field)
      if (sessionData.status === 400) {
        // Validation error (e.g., email already exists, weak password)
        const errors = sessionData.data?.errors;
        const errorMessage = errors?.[0]?.message || 'Registration failed. Please check your information.';
        toast.error(errorMessage);
        return;
      }

      // Check if email verification is needed (status 401 with verify_email flow)
      if (sessionData.status === 401) {
        const flows = sessionData.data?.flows || [];
        const verifyEmailFlow = flows.find((flow: any) => flow.id === 'verify_email');

        if (verifyEmailFlow?.isPending) {
          toast.success('Please check your email for verification code.');
          navigate({ to: '/auth/verify-email', search: { email: data.email } });
          return;
        }
      }

      // Success - registration complete
      toast.success('Registration successful! Please check your email for verification code.');
      navigate({ to: '/auth/verify-email', search: { email: data.email } });
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
        // Rate limited
        errorMessage = 'Too many registration attempts. Please wait a few minutes and try again.';
      } else if (status >= 500) {
        // Server error
        errorMessage = 'Server error. Please try again in a moment.';
      } else {
        // Use server-provided message or fallback
        errorMessage =
          errors?.[0]?.message || error?.response?.data?.message || 'Registration failed. Please try again.';
      }

      toast.error(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  const handlePasskeySignup = async () => {
    if (!passkeyEmail) {
      toast.error('Please enter your email');
      return;
    }

    try {
      const result = await signupWithPasskey(passkeyEmail);

      if (result.needsEmailVerification) {
        // Redirect to email verification page
        // After verifying email, user will be redirected to create passkey
        navigate({ to: '/auth/verify-email', search: { email: passkeyEmail } });
      } else {
        // This shouldn't happen with passkey signup, but handle just in case
        navigate({ to: '/' });
      }
    } catch (error) {
      // Error already handled in hook
    }
  };

  if (showPasskeySignup) {
    return (
      <div className="flex min-h-svh items-center justify-center bg-muted p-6 md:p-10">
        <div className="w-full max-w-sm">
          <Card>
            <CardHeader className="text-center">
              <CardTitle className="text-2xl">Sign up with Passkey</CardTitle>
              <CardDescription>Create a passwordless account using a passkey</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid gap-4">
                <div className="grid gap-2">
                  <Label htmlFor="passkey-email">Email</Label>
                  <Input
                    id="passkey-email"
                    type="email"
                    placeholder="m@example.com"
                    autoFocus
                    disabled={passkeyLoading}
                    value={passkeyEmail}
                    onChange={(e) => setPasskeyEmail(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && passkeyEmail) {
                        handlePasskeySignup();
                      }
                    }}
                  />
                </div>

                <Button onClick={handlePasskeySignup} className="w-full" disabled={passkeyLoading || !passkeyEmail}>
                  {passkeyLoading ? (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  ) : (
                    <Fingerprint className="mr-2 h-4 w-4" />
                  )}
                  {passkeyLoading ? 'Creating account...' : 'Create Account with Passkey'}
                </Button>

                <Button
                  variant="outline"
                  onClick={() => setShowPasskeySignup(false)}
                  className="w-full"
                  disabled={passkeyLoading}
                >
                  Back to Email/Password
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
            <CardTitle className="text-2xl">Create an account</CardTitle>
            <CardDescription>Enter your information to get started</CardDescription>
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
                <Label htmlFor="password">Password</Label>
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

                {/* Password Strength Indicator */}
                {password && <PasswordStrengthIndicator password={password} />}
              </div>

              <Button type="submit" className="w-full" disabled={isLoading || passkeyLoading}>
                {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                {isLoading ? 'Creating account...' : 'Create Account'}
              </Button>

              {isSupported && (
                <>
                  <div className="relative my-2">
                    <div className="absolute inset-0 flex items-center">
                      <span className="w-full border-t" />
                    </div>
                    <div className="relative flex justify-center text-xs uppercase">
                      <span className="bg-background px-2 text-muted-foreground">Or</span>
                    </div>
                  </div>

                  <Button
                    type="button"
                    variant="outline"
                    className="w-full"
                    disabled={isLoading || passkeyLoading}
                    onClick={() => setShowPasskeySignup(true)}
                  >
                    <Fingerprint className="mr-2 h-4 w-4" />
                    Sign up with Passkey
                  </Button>
                </>
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
                Already have an account?{' '}
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
