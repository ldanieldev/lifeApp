import AppShell from '@/components/appShell';
import { Error404Page, Error500Page } from '@/components/errorPages';
import { ThemeProvider } from '@/providers/themeProvider';
import { QueryClient } from '@tanstack/react-query';
import { ReactQueryDevtools } from '@tanstack/react-query-devtools';
import { createRootRouteWithContext, Outlet } from '@tanstack/react-router';
import { TanStackRouterDevtools } from '@tanstack/react-router-devtools';

export const Route = createRootRouteWithContext<{ queryClient: QueryClient }>()({
  pendingComponent: () => <div>Loading...</div>,
  errorComponent: ({ error }) => <Error500Page errorMsg={error.message} />,
  notFoundComponent: () => <Error404Page />,
  shellComponent: () => (
    <>
      <ThemeProvider>
        <AppShell>
          <Outlet />
          <TanStackRouterDevtools initialIsOpen={false} position="bottom-right" />
          <ReactQueryDevtools initialIsOpen={false} />
        </AppShell>
      </ThemeProvider>
    </>
  ),
});
