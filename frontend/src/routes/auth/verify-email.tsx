import { createFileRoute, Link, useNavigate } from '@tanstack/react-router';
import { useState } from 'react';
import { toast } from 'sonner';
import { Button } from '@/components/shadcn/button';
import { Input } from '@/components/shadcn/input';
import { Label } from '@/components/shadcn/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/shadcn/card';
import { authAPI } from '@/api/allauth';
import type { AuthFlow } from '@/api/allauth.types';
import { useAuth } from '@/providers/authProvider';

export const Route = createFileRoute('/auth/verify-email')({
  component: VerifyEmailPage,
  validateSearch: (search: Record<string, unknown>) => {
    return {
      email: (search.email as string) || '',
    };
  },
});

function VerifyEmailPage() {
  const navigate = useNavigate();
  const { email } = Route.useSearch();
  const { refetchUser } = useAuth();
  const [code, setCode] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isResending, setIsResending] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!code.trim()) {
      toast.error('Please enter the verification code');
      return;
    }

    setIsLoading(true);
    try {
      await authAPI.verifyEmail(code.trim());

      // Refresh user session to get authenticated state
      const session = await refetchUser();

      toast.success('Email verified successfully!');

      // Check if there's a pending passkey signup flow
      const flows = session?.data?.flows || [];
      const passkeySignupFlow = flows.find((flow: AuthFlow) => flow.id === 'mfa_signup_webauthn' && flow.isPending);

      if (passkeySignupFlow) {
        // Email verified, now need to create passkey
        navigate({ to: '/auth/create-passkey' });
      } else {
        // Regular email verification, user is logged in
        navigate({ to: '/' });
      }
    } catch (error: any) {
      // Check if this is a 401 with pending passkey signup flow
      if (error?.response?.status === 401) {
        const flows = error?.response?.data?.data?.flows || [];
        const passkeySignupFlow = flows.find((flow: AuthFlow) => flow.id === 'mfa_signup_webauthn' && flow.isPending);

        if (passkeySignupFlow) {
          // Email verified successfully, now need to create passkey
          toast.success('Email verified! Now create your passkey.');
          navigate({ to: '/auth/create-passkey' });
          return;
        }
      }

      // Handle other errors
      const errors = error?.response?.data?.errors;
      const errorMessage =
        errors?.[0]?.message || error?.response?.data?.message || 'Invalid or expired verification code';
      toast.error(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  const handleResendCode = async () => {
    setIsResending(true);
    try {
      await authAPI.resendEmailVerificationCode();
      toast.success('Verification code sent! Please check your email.');
    } catch (error: any) {
      // Handle allauth error format: { errors: [{ message, code, param? }] }
      const errors = error?.response?.data?.errors;
      const errorMessage =
        errors?.[0]?.message ||
        error?.response?.data?.message ||
        'Failed to resend verification code. Please try again.';
      toast.error(errorMessage);
    } finally {
      setIsResending(false);
    }
  };

  return (
    <div className="flex min-h-svh items-center justify-center bg-muted p-6 md:p-10">
      <div className="w-full max-w-sm">
        <Card>
          <CardHeader className="text-center">
            <CardTitle className="text-2xl">Verify your email</CardTitle>
            <CardDescription>
              We've sent a verification code to <strong>{email}</strong>. Please enter it below.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="grid gap-4">
              <div className="grid gap-2">
                <Label htmlFor="code">Verification Code</Label>
                <Input
                  id="code"
                  type="text"
                  placeholder="Enter 6-digit code"
                  value={code}
                  onChange={(e) => setCode(e.target.value)}
                  maxLength={6}
                  autoComplete="one-time-code"
                  autoFocus
                />
              </div>

              <Button type="submit" className="w-full" disabled={isLoading}>
                {isLoading ? 'Verifying...' : 'Verify Email'}
              </Button>

              <div className="text-center text-sm space-y-2">
                <div>
                  Didn't receive the code?{' '}
                  <button
                    type="button"
                    onClick={handleResendCode}
                    disabled={isResending}
                    className="underline underline-offset-4 hover:text-primary disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {isResending ? 'Sending...' : 'Resend'}
                  </button>
                </div>
                <div>
                  <Link to="/auth/login" search={{ redirect: '/' }} className="underline underline-offset-4">
                    Back to Login
                  </Link>
                </div>
              </div>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
