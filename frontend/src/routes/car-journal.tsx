/**
 * Car Journal Layout Route
 *
 * Parent route for vehicle maintenance tracker.
 * Route: /car-journal
 */

import { createFileRoute, Outlet } from '@tanstack/react-router';

export const Route = createFileRoute('/car-journal')({
  component: () => <Outlet />,
});
