import { createFileRoute, useNavigate } from '@tanstack/react-router';
import { useState, useEffect } from 'react';
import { toast } from 'sonner';
import { Fingerprint } from 'lucide-react';
import { Button } from '@/components/shadcn/button';
import { Input } from '@/components/shadcn/input';
import { Label } from '@/components/shadcn/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/shadcn/card';
import { webAuthnAPI } from '@/api/allauth';
import { useAuth } from '@/providers/authProvider';
import { getAllauthErrors } from '@/lib/errors';
import type { AuthFlow } from '@/api/allauth.types';

export const Route = createFileRoute('/auth/create-passkey')({
  component: CreatePasskeyPage,
});

function CreatePasskeyPage() {
  const navigate = useNavigate();
  const { refetchUser, auth } = useAuth();
  const [passkeyName, setPasskeyName] = useState('Primary Device');
  const [isLoading, setIsLoading] = useState(false);

  // Check if we have a pending passkey signup flow
  const hasPendingPasskeySignup = auth?.data?.flows?.some(
    (flow: AuthFlow) => flow.id === 'mfa_signup_webauthn' && flow.isPending
  );

  // Redirect to signup if no pending passkey flow (use effect to avoid render-time navigation)
  useEffect(() => {
    if (!hasPendingPasskeySignup && !isLoading) {
      navigate({ to: '/auth/register' });
    }
  }, [hasPendingPasskeySignup, isLoading, navigate]);

  const handleCreatePasskey = async () => {
    if (!passkeyName.trim()) {
      toast.error('Please enter a name for your passkey');
      return;
    }

    setIsLoading(true);
    try {
      // Complete the passkey signup
      const response = await webAuthnAPI.completeSignupWithPasskey(passkeyName);

      console.log('Passkey creation response:', response);

      // Refresh session to get updated authentication state
      const sessionData = await refetchUser();

      console.log('Session after refetch:', sessionData);

      // Check if user is authenticated after refresh
      const isAuthenticated = sessionData?.status === 200 || sessionData?.meta?.isAuthenticated === true;

      if (isAuthenticated) {
        toast.success('Passkey created! Welcome to your account.');
        // Use window.location to force a full reload with the authenticated session
        // This avoids race conditions with React state updates
        window.location.href = '/';
      } else {
        // If not authenticated after passkey creation, something went wrong
        console.error('Not authenticated after passkey creation:', sessionData);
        toast.error('Passkey created but authentication failed. Please try logging in.');
        navigate({ to: '/auth/login', search: { redirect: '/' } });
      }
    } catch (error: unknown) {
      console.error('Create passkey error:', error);
      const errors = getAllauthErrors(error);
      const errorMessage = errors[0]?.message || (error instanceof Error ? error.message : 'Failed to create passkey');
      toast.error(errorMessage);
      setIsLoading(false);
    }
  };

  // Show loading or nothing while checking/redirecting
  if (!hasPendingPasskeySignup && !isLoading) {
    return null;
  }

  return (
    <div className="flex min-h-svh items-center justify-center bg-muted p-6 md:p-10">
      <div className="w-full max-w-sm">
        <Card>
          <CardHeader className="text-center">
            <CardTitle className="text-2xl">Create Your Passkey</CardTitle>
            <CardDescription>
              Complete your account setup by creating a passkey. You can add more passkeys later.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4">
              <div className="grid gap-2">
                <Label htmlFor="passkey-name">Passkey Name</Label>
                <Input
                  id="passkey-name"
                  type="text"
                  placeholder="e.g., iPhone, MacBook, YubiKey"
                  value={passkeyName}
                  onChange={(e) => setPasskeyName(e.target.value)}
                />
                <p className="text-xs text-muted-foreground">
                  Give your passkey a descriptive name to identify it later
                </p>
              </div>

              <Button onClick={handleCreatePasskey} className="w-full" disabled={isLoading || !passkeyName.trim()}>
                <Fingerprint className="mr-2 h-4 w-4" />
                {isLoading ? 'Creating passkey...' : 'Create Passkey'}
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
