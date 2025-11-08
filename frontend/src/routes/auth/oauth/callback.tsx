import { createFileRoute, useNavigate } from '@tanstack/react-router';
import { useEffect } from 'react';
import { toast } from 'sonner';
import { useAuth } from '@/providers/authProvider';
import { getRouteForPendingFlow } from '@/lib/authFlows';

export const Route = createFileRoute('/auth/oauth/callback')({
  component: OAuthCallback,
  validateSearch: (search: Record<string, unknown>) => {
    return {
      error: (search.error as string) || '',
      error_description: (search.error_description as string) || '',
      returnTo: (search.returnTo as string) || '',
    };
  },
});

// Use a module-level variable to track if callback has been handled
let callbackHandled = false;

function OAuthCallback() {
  const navigate = useNavigate();
  const { error, error_description, returnTo } = Route.useSearch();
  const { refetchUser, isLoading } = useAuth();

  useEffect(() => {
    // Prevent multiple executions
    if (callbackHandled) {
      return;
    }

    const handleCallback = async () => {
      // Mark as handled immediately to prevent race conditions
      callbackHandled = true;

      // Check for OAuth errors (e.g., user denied access)
      if (error) {
        const message = error_description || `OAuth authentication failed: ${error}`;
        toast.error(message);
        navigate({ to: '/auth/login', search: { redirect: '/' } });
        return;
      }

      // Django-allauth handles the OAuth callback server-side and sets session cookie
      // The backend redirects here on success, so we need to:
      // 1. Refresh the user session to get the authenticated state
      // 2. Check if there's a pending flow (e.g., MFA authentication required)
      // 3. Redirect appropriately

      try {
        // Refetch user session - this will update auth state
        const sessionData = await refetchUser();

        // Check if user is fully authenticated
        const isFullyAuthenticated = sessionData?.status === 200;

        if (isFullyAuthenticated) {
          // User is fully authenticated - redirect to destination
          const destination = returnTo || '/';
          const isConnectFlow = returnTo === '/account';
          toast.success(isConnectFlow ? 'Provider connected successfully!' : 'Successfully logged in!');
          navigate({ to: destination });
        } else {
          // Check for pending authentication flows (e.g., passkey MFA)
          const pendingFlowRoute = getRouteForPendingFlow(sessionData?.data?.flows);

          if (pendingFlowRoute) {
            // User needs to complete additional authentication (e.g., passkey)
            toast.info('Please complete authentication');
            navigate({ to: pendingFlowRoute });
          } else {
            // Partial authentication but no pending flow - shouldn't happen
            console.error('Partial authentication without pending flow:', sessionData);
            toast.error('Authentication incomplete. Please try again.');
            navigate({ to: '/auth/login', search: { redirect: '/' } });
          }
        }
      } catch (error: any) {
        console.error('OAuth callback error:', error);
        // If session fetch failed, authentication didn't work
        toast.error('Authentication failed. Please try again.');
        navigate({ to: '/auth/login', search: { redirect: '/' } });
      }
    };

    handleCallback();
  }, [error, error_description, navigate, refetchUser]);

  return (
    <div className="flex min-h-svh items-center justify-center">
      <div className="text-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
        <p className="mt-4 text-muted-foreground">{isLoading ? 'Authenticating...' : 'Completing sign in...'}</p>
      </div>
    </div>
  );
}
