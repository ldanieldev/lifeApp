import { createFileRoute, useNavigate } from '@tanstack/react-router';
import { useEffect } from 'react';
import { toast } from 'sonner';
import { setAccessToken } from '@/lib/axios';
import { useQueryClient } from '@tanstack/react-query';

export const Route = createFileRoute('/auth/callback/$provider')({
  component: OAuthCallback,
  validateSearch: (search: Record<string, unknown>) => {
    return {
      code: (search.code as string) || '',
      state: (search.state as string) || '',
      error: (search.error as string) || '',
    };
  },
});

function OAuthCallback() {
  const navigate = useNavigate();
  const { provider } = Route.useParams();
  const { code, error } = Route.useSearch();
  const queryClient = useQueryClient();

  useEffect(() => {
    const handleCallback = async () => {
      if (error) {
        toast.error(`${provider} authentication failed: ${error}`);
        navigate({ to: '/auth/login', search: { redirect: '/' } });
        return;
      }

      if (!code) {
        toast.error('No authorization code received');
        navigate({ to: '/auth/login', search: { redirect: '/' } });
        return;
      }

      try {
        // The backend will handle the OAuth callback and set the refresh token cookie
        const response = await fetch(`/api/auth/providers/${provider}/callback?code=${code}`, {
          method: 'POST',
          credentials: 'include',
        });

        if (!response.ok) {
          throw new Error('Authentication failed');
        }

        const data = await response.json();

        // Set access token in memory
        setAccessToken(data.accessToken);

        // Set user data in query cache
        queryClient.setQueryData(['currentUser'], data.user);

        toast.success(`Successfully logged in with ${provider}`);
        navigate({ to: '/' });
      } catch (error: any) {
        console.error('OAuth callback error:', error);
        toast.error(error?.message || 'Authentication failed');
        navigate({ to: '/auth/login', search: { redirect: '/' } });
      }
    };

    handleCallback();
  }, [code, error, provider, navigate, queryClient]);

  return (
    <div className="flex min-h-svh items-center justify-center">
      <div className="text-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
        <p className="mt-4 text-muted-foreground">Authenticating with {provider}...</p>
      </div>
    </div>
  );
}
