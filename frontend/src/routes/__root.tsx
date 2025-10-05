import AppShell from '@/components/appShell';
import { Error404Page, Error500Page } from '@/components/errorPages';
import { AuthProvider } from '@/providers/authProvider';
import { ThemeProvider } from '@/providers/themeProvider';
import { useAuth } from '@/hooks/useAuth';
import { QueryClient } from '@tanstack/react-query';
import { ReactQueryDevtools } from '@tanstack/react-query-devtools';
import { createRootRouteWithContext, Outlet, useRouter, useRouterState } from '@tanstack/react-router';
import { TanStackRouterDevtools } from '@tanstack/react-router-devtools';
import { Toaster } from '@/components/shadcn/sonner';
import { useEffect } from 'react';

function RootComponent() {
  const { isAuthenticated, isLoading, isLoggingOut } = useAuth();
  const router = useRouter();
  const currentPath = useRouterState({ select: (s) => s.location.pathname });
  const isAuthRoute = currentPath.startsWith('/auth');

  // Redirect unauthenticated users from protected routes to login
  useEffect(() => {
    if (!isLoading && !isAuthenticated && !isAuthRoute) {
      router.navigate({ to: '/auth/login', search: { redirect: currentPath }, replace: true });
    }
  }, [isAuthenticated, isLoading, isAuthRoute, currentPath, router]);

  // Redirect authenticated users from auth routes to home
  useEffect(() => {
    if (!isLoading && isAuthenticated && isAuthRoute) {
      router.navigate({ to: '/', replace: true });
    }
  }, [isAuthenticated, isLoading, isAuthRoute, router]);

  // Show logout overlay to prevent white flash
  if (isLoggingOut) {
    return (
      <div className="fixed inset-0 z-50 bg-background flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
          <p className="mt-4 text-muted-foreground">Logging out...</p>
        </div>
      </div>
    );
  }

  // Auth routes don't use AppShell (they have their own layout)
  // Render auth routes immediately, even during loading
  if (isAuthRoute) {
    return (
      <>
        <Outlet />
        <TanStackRouterDevtools initialIsOpen={false} position="bottom-right" />
        <ReactQueryDevtools initialIsOpen={false} />
      </>
    );
  }

  // Show loading spinner for protected routes while checking auth
  if (isLoading) {
    return (
      <div className="flex min-h-svh items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
          <p className="mt-4 text-muted-foreground">Loading...</p>
        </div>
      </div>
    );
  }

  // Protected routes use AppShell
  if (!isAuthenticated) {
    // Don't render anything while redirecting to avoid flashing protected content
    return (
      <div className="flex min-h-svh items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
          <p className="mt-4 text-muted-foreground">Redirecting...</p>
        </div>
      </div>
    );
  }

  return (
    <AppShell>
      <Outlet />
      <TanStackRouterDevtools initialIsOpen={false} position="bottom-right" />
      <ReactQueryDevtools initialIsOpen={false} />
    </AppShell>
  );
}

export const Route = createRootRouteWithContext<{ queryClient: QueryClient }>()({
  pendingComponent: () => <div>Loading...</div>,
  errorComponent: ({ error }) => <Error500Page errorMsg={error.message} />,
  notFoundComponent: () => <Error404Page />,
  component: () => (
    <ThemeProvider>
      <AuthProvider>
        <RootComponent />
        <Toaster />
      </AuthProvider>
    </ThemeProvider>
  ),
});
