import { QueryClient } from '@tanstack/react-query';
import { ReactQueryDevtools } from '@tanstack/react-query-devtools';
import { createRootRouteWithContext, Link, Outlet } from '@tanstack/react-router';
import { TanStackRouterDevtools } from '@tanstack/react-router-devtools';

export const Route = createRootRouteWithContext<{ queryClient: QueryClient }>()({
  component: () => (
    <>
      <div className="p-2 flex gap-2">
        <Link to="/" className="[&.active]:font-bold">
          Home
        </Link>{' '}
        <Link to="/about" className="[&.active]:font-bold">
          About
        </Link>
      </div>
      <hr />
      <Outlet />
      <TanStackRouterDevtools initialIsOpen={false} />
      <ReactQueryDevtools initialIsOpen={false} />
    </>
  ),
  pendingComponent: () => <div>Loading...</div>,
  errorComponent: ({ error }) => <div>Root route error: {error.message}</div>,
  notFoundComponent: () => <div>404: Page Not Found</div>,
  shellComponent: ({ children }) => (
    <div style={{ border: '2px solid blue' }} className="p-2">
      {children}
    </div>
  ),
});
