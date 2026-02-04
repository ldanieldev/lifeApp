import { useAuth } from '@/providers/authProvider';
import { createFileRoute, Navigate, Outlet } from '@tanstack/react-router';

function IndexComponent() {
  const { isAuthenticated } = useAuth();

  if (isAuthenticated) {
    return <Navigate to="/todo" replace />;
  }

  return <Outlet />;
}

export const Route = createFileRoute('/')({
  component: IndexComponent,
});
