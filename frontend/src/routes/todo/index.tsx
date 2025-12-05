/**
 * Todo Index Route
 *
 * Redirects to /todo/projects by default.
 * Route: /todo (index)
 */

import { createFileRoute, redirect } from '@tanstack/react-router';

export const Route = createFileRoute('/todo/')({
  beforeLoad: () => {
    throw redirect({
      to: '/todo/projects',
      replace: true,
    });
  },
});
