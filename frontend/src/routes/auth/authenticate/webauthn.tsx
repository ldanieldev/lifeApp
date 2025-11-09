import { createFileRoute, useNavigate } from '@tanstack/react-router';
import { useState, useEffect, useRef } from 'react';
import { toast } from 'sonner';
import { Fingerprint } from 'lucide-react';
import { Button } from '@/components/shadcn/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/shadcn/card';
import { webAuthnAPI } from '@/api/allauth';
import { useAuth } from '@/providers/authProvider';
import { getAllauthErrors } from '@/lib/errors';
import type { AuthFlow } from '@/api/allauth.types';

export const Route = createFileRoute('/auth/authenticate/webauthn')({
  component: AuthenticateWebAuthnPage,
});

function AuthenticateWebAuthnPage() {
  const navigate = useNavigate();
  const { refetchUser, auth } = useAuth();
  const [isLoading, setIsLoading] = useState(false);

  // Use a ref to track if authentication has been triggered (prevents double triggers in StrictMode)
  const authenticationTriggeredRef = useRef(false);

  // Check if we have a pending MFA authentication flow
  const hasPendingMFAAuth = auth?.data?.flows?.some(
    (flow: AuthFlow) => flow.id === 'mfa_authenticate' && flow.isPending && flow.types?.includes('webauthn')
  );

  // Redirect to login if no pending MFA flow (use effect to avoid render-time navigation)
  useEffect(() => {
    if (!hasPendingMFAAuth && !isLoading) {
      authenticationTriggeredRef.current = false; // Reset since we're leaving
      navigate({ to: '/auth/login', search: { redirect: '/' } });
    }
  }, [hasPendingMFAAuth, isLoading, navigate]);

  const handleAuthenticate = async () => {
    // Prevent multiple simultaneous authentication attempts
    if (authenticationTriggeredRef.current) {
      return;
    }
    authenticationTriggeredRef.current = true;

    setIsLoading(true);
    try {
      // Authenticate with passkey
      const response = await webAuthnAPI.authenticateWithPasskey();

      console.log('WebAuthn authentication response:', response);

      // Refresh session to get updated authentication state
      const sessionData = await refetchUser();

      console.log('Session after refetch:', sessionData);

      // Check if user is fully authenticated after MFA
      const isAuthenticated = sessionData?.status === 200;

      if (isAuthenticated) {
        toast.success('Authentication successful!');
        // Use window.location to force a full reload with the authenticated session
        // This avoids race conditions with React state updates
        window.location.href = '/';
      } else {
        // If not authenticated after MFA, something went wrong
        console.error('Not authenticated after MFA:', sessionData);
        toast.error('Authentication incomplete. Please try again.');
        authenticationTriggeredRef.current = false; // Allow retry
        navigate({ to: '/auth/login', search: { redirect: '/' } });
      }
    } catch (error: unknown) {
      console.error('WebAuthn authentication error:', error);
      const errors = getAllauthErrors(error);
      const errorMessage =
        errors?.[0]?.message || (error instanceof Error ? error.message : 'Failed to authenticate with passkey');
      toast.error(errorMessage);
      authenticationTriggeredRef.current = false; // Allow retry
      setIsLoading(false);
    }
  };

  // Auto-trigger passkey authentication on mount
  // Using useEffect with no state updates to schedule authentication
  useEffect(() => {
    if (hasPendingMFAAuth && !authenticationTriggeredRef.current) {
      // Schedule authentication to run after render completes
      // This avoids calling setState synchronously within the effect
      queueMicrotask(() => {
        handleAuthenticate();
      });
    }
    // Note: We don't reset authenticationTriggeredRef on unmount because:
    // 1. React StrictMode in dev would cause double-prompts
    // 2. We reset it on error/cancel to allow retry
    // 3. On success, we navigate away anyway
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hasPendingMFAAuth]);

  // Show loading or nothing while checking/redirecting
  if (!hasPendingMFAAuth && !isLoading) {
    return null;
  }

  return (
    <div className="flex min-h-svh items-center justify-center bg-muted p-6 md:p-10">
      <div className="w-full max-w-sm">
        <Card>
          <CardHeader className="text-center">
            <CardTitle className="text-2xl">Authenticate with Passkey</CardTitle>
            <CardDescription>
              {isLoading
                ? 'Follow your browser prompt to authenticate with your passkey...'
                : 'Your account requires passkey authentication.'}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4">
              {isLoading ? (
                <div className="text-center">
                  <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
                  <p className="mt-4 text-sm text-muted-foreground">Waiting for passkey...</p>
                </div>
              ) : (
                <Button onClick={handleAuthenticate} className="w-full">
                  <Fingerprint className="mr-2 h-4 w-4" />
                  Use Passkey
                </Button>
              )}

              <div className="text-center">
                <Button
                  variant="link"
                  className="text-sm text-muted-foreground"
                  onClick={() => {
                    authenticationTriggeredRef.current = false; // Reset on manual navigation
                    navigate({ to: '/auth/login', search: { redirect: '/' } });
                  }}
                  disabled={isLoading}
                >
                  Back to Login
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
