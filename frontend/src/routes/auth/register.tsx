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
    formState: { errors },
  } = useForm<RegisterFormData>({
    resolver: zodResolver(registerSchema),
  });

  const onSubmit = async (data: RegisterFormData) => {
    setIsLoading(true);
    try {
      await registerUser(data);
      toast.success('Registration successful');
      navigate({ to: '/' });
    } catch (error: any) {
      const errorMessage =
        error?.response?.data?.fieldErrors?.nonFieldErrors?.[0] ||
        error?.response?.data?.message ||
        'Registration failed';
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
      await signupWithPasskey(passkeyEmail, 'Primary Device');
      toast.success('Account created! Please login with your passkey.');
      navigate({ to: '/auth/login', search: { redirect: '/' } });
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
                    value={passkeyEmail}
                    onChange={(e) => setPasskeyEmail(e.target.value)}
                  />
                </div>

                <Button onClick={handlePasskeySignup} className="w-full" disabled={passkeyLoading || !passkeyEmail}>
                  <Fingerprint className="mr-2 h-4 w-4" />
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
              <div className="grid grid-cols-2 gap-4">
                <div className="grid gap-2">
                  <Label htmlFor="firstName">First name</Label>
                  <Input
                    id="firstName"
                    placeholder="John"
                    {...register('firstName')}
                    aria-invalid={!!errors.firstName}
                  />
                  {errors.firstName && <p className="text-sm text-destructive">{errors.firstName.message}</p>}
                </div>

                <div className="grid gap-2">
                  <Label htmlFor="lastName">Last name</Label>
                  <Input id="lastName" placeholder="Doe" {...register('lastName')} aria-invalid={!!errors.lastName} />
                  {errors.lastName && <p className="text-sm text-destructive">{errors.lastName.message}</p>}
                </div>
              </div>

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
                <Label htmlFor="password">Password</Label>
                <Input id="password" type="password" {...register('password')} aria-invalid={!!errors.password} />
                {errors.password && <p className="text-sm text-destructive">{errors.password.message}</p>}
                <p className="text-xs text-muted-foreground">
                  8-16 characters with letters, numbers, and special characters (!@#$%^&*)
                </p>
              </div>

              <Button type="submit" className="w-full" disabled={isLoading || passkeyLoading}>
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
