/**
 * Projects List Route
 *
 * Displays grid of projects with completion stats.
 * Route: /todo/projects
 */

import { createFileRoute } from '@tanstack/react-router';
import { z } from 'zod';
import { ProjectDashboard } from '@/components/todo/ProjectDashboard';

// Search params validation
const projectsSearchSchema = z.object({
  archived: z.boolean().optional(),
  search: z.string().optional(),
});

export const Route = createFileRoute('/todo/projects/')({
  validateSearch: projectsSearchSchema,
  component: ProjectDashboard,
});
