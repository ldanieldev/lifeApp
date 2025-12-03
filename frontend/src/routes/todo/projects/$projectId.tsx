/**
 * Project Detail Route
 *
 * Displays project drilldown view with nested lists.
 * Route: /todo/projects/:projectId
 */

import { createFileRoute } from '@tanstack/react-router';
import { ProjectDetailView } from '@/components/todo/ProjectDetailView';

export const Route = createFileRoute('/todo/projects/$projectId')({
  component: ProjectDetailView,
});
