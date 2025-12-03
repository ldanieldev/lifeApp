/**
 * List Detail View Component
 *
 * Displays todo list in either list or kanban view mode.
 * Switches between TodoListView and KanbanBoard based on viewMode.
 */

import { motion } from 'framer-motion';
import { useNavigate, useParams, useSearch } from '@tanstack/react-router';
import { ArrowLeft, LayoutList, LayoutGrid } from 'lucide-react';
import { useTodoList, useSwitchViewMode } from '@/hooks/useTodos';
import { Button } from '@/components/shadcn/button';
import { ShimmerSkeleton, ShimmerListSkeleton } from '@/components/magicui/shimmer-skeleton';
import { Tabs, TabsList, TabsTrigger } from '@/components/shadcn/tabs';
import { TodoListView } from './TodoListView';
import { KanbanBoard } from './KanbanBoard';
import type { ViewMode } from '@/types/todo';

export function ListDetailView() {
  const { listId } = useParams({ from: '/todo/lists/$listId' });
  const navigate = useNavigate();
  const searchParams = useSearch({ from: '/todo/lists/$listId' });

  const { data: list, isLoading } = useTodoList(Number(listId));
  const switchViewMutation = useSwitchViewMode();

  const currentView = searchParams.view || list?.viewMode || 'list';

  const handleBackClick = () => {
    // Breadcrumb-style navigation: go up one level in the URL hierarchy
    // If list belongs to a project: /todo/lists/:id → /todo/projects/:projectId
    // If standalone list: /todo/lists/:id → /todo/lists (all lists)
    if (list?.projectId) {
      navigate({ to: '/todo/projects/$projectId', params: { projectId: String(list.projectId) } });
    } else {
      navigate({ to: '/todo/lists' });
    }
  };

  const handleViewChange = (newView: ViewMode) => {
    if (!list) return;

    // Prevent duplicate calls while mutation is in progress
    if (switchViewMutation.isPending) return;

    // Only call API if actually switching modes (not just URL param)
    if (list.viewMode !== newView) {
      switchViewMutation.mutate(
        { id: list.id, data: { viewMode: newView } },
        {
          onSuccess: () => {
            // Update URL only on success
            navigate({
              to: '/todo/lists/$listId',
              params: { listId },
              search: (prev) => ({ ...prev, view: newView }),
              replace: true,
            });
          },
          // Error already handled in hook with toast
        }
      );
    } else {
      // Just update URL if already in the correct mode
      navigate({
        to: '/todo/lists/$listId',
        params: { listId },
        search: (prev) => ({ ...prev, view: newView }),
        replace: true,
      });
    }
  };

  if (isLoading) {
    return (
      <div className="container mx-auto py-8 px-4 max-w-7xl">
        <ShimmerSkeleton className="h-10 w-32 mb-6" />
        <ShimmerSkeleton variant="card" className="h-20 mb-6" />
        <ShimmerListSkeleton count={5} />
      </div>
    );
  }

  if (!list) {
    return (
      <div className="container mx-auto py-8 px-4 text-center">
        <p className="text-muted-foreground">List not found</p>
        <Button onClick={handleBackClick} className="mt-4">
          <ArrowLeft className="h-4 w-4 mr-2" />
          Go Back
        </Button>
      </div>
    );
  }

  return (
    <motion.div
      className="container mx-auto py-8 px-4 max-w-7xl"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
    >
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-4">
          <Button variant="ghost" onClick={handleBackClick}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back
          </Button>

          <div>
            <h1 className="text-3xl font-bold">{list.name}</h1>
            {list.description && <p className="text-muted-foreground mt-1">{list.description}</p>}
          </div>
        </div>

        {/* View Mode Toggle */}
        <Tabs value={currentView} onValueChange={(value) => handleViewChange(value as ViewMode)}>
          <TabsList>
            <TabsTrigger value="list" className="flex items-center gap-2">
              <LayoutList className="h-4 w-4" />
              List
            </TabsTrigger>
            <TabsTrigger value="kanban" className="flex items-center gap-2">
              <LayoutGrid className="h-4 w-4" />
              Kanban
            </TabsTrigger>
          </TabsList>
        </Tabs>
      </div>

      {/* View Content */}
      {currentView === 'list' ? <TodoListView list={list} /> : <KanbanBoard list={list} />}
    </motion.div>
  );
}
