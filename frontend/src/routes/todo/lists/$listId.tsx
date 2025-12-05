/**
 * List Detail Route
 *
 * Displays todo list in either list or kanban view mode.
 * Route: /todo/lists/:listId?view=list|kanban
 */

import { createFileRoute } from '@tanstack/react-router';
import { z } from 'zod';
import { ListDetailView } from '@/components/todo/ListDetailView';

// Search params validation
const listSearchSchema = z.object({
  view: z.enum(['list', 'kanban']).optional(),
  showCompleted: z.boolean().optional().default(false),
  search: z.string().optional(),
  sort: z.enum(['displayOrder', 'dueDate', 'priority', 'createdAt']).optional().default('displayOrder'),
});

export const Route = createFileRoute('/todo/lists/$listId')({
  validateSearch: listSearchSchema,
  component: ListDetailView,
});
