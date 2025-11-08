import { createFileRoute, useNavigate } from '@tanstack/react-router';
import { useState, useEffect } from 'react';
import { toast } from 'sonner';
import { Fingerprint } from 'lucide-react';
import { Button } from '@/components/shadcn/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/shadcn/card';
import { webAuthnAPI } from '@/api/allauth';
import { useAuth } from '@/providers/authProvider';

export const Route = createFileRoute('/auth/authenticate/webauthn')({
  component: AuthenticateWebAuthnPage,
});

// Use a module-level variable to track if authentication has been triggered
let authenticationTriggered = false;

function AuthenticateWebAuthnPage() {
  const navigate = useNavigate();
  const { refetchUser, auth } = useAuth();
  const [isLoading, setIsLoading] = useState(false);

  // Check if we have a pending MFA authentication flow
  const hasPendingMFAAuth = auth?.data?.flows?.some(
    (flow: any) => flow.id === 'mfa_authenticate' && flow.isPending && flow.types?.includes('webauthn')
  );

  // Redirect to login if no pending MFA flow (use effect to avoid render-time navigation)
  useEffect(() => {
    if (!hasPendingMFAAuth && !isLoading) {
      authenticationTriggered = false; // Reset since we're leaving
      navigate({ to: '/auth/login', search: { redirect: '/' } });
    }
  }, [hasPendingMFAAuth, isLoading, navigate]);

  const handleAuthenticate = async () => {
    // Prevent multiple simultaneous authentication attempts
    if (authenticationTriggered) {
      return;
    }
    authenticationTriggered = true;

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
        authenticationTriggered = false; // Allow retry
        navigate({ to: '/auth/login', search: { redirect: '/' } });
      }
    } catch (error: any) {
      console.error('WebAuthn authentication error:', error);
      const errorMessage =
        error?.response?.data?.errors?.[0]?.message || error?.message || 'Failed to authenticate with passkey';
      toast.error(errorMessage);
      authenticationTriggered = false; // Allow retry
      setIsLoading(false);
    }
  };

  // Auto-trigger passkey authentication on mount
  useEffect(() => {
    if (hasPendingMFAAuth && !authenticationTriggered) {
      handleAuthenticate();
    }
    // Note: We don't reset authenticationTriggered on unmount because:
    // 1. React StrictMode in dev would cause double-prompts
    // 2. We reset it on error/cancel to allow retry
    // 3. On success, we navigate away anyway
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
                    authenticationTriggered = false; // Reset on manual navigation
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
