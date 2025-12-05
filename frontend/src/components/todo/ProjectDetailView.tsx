/**
 * Project Detail View Component
 *
 * Displays project overview with nested lists (tree/drilldown view).
 */

import { useState } from 'react';
import { useNavigate, useParams } from '@tanstack/react-router';
import { ArrowLeft, Plus, ChevronRight, ListTodo, LayoutGrid, MoreVertical, Pencil, Trash2 } from 'lucide-react';
import { useProject, useDeleteTodoList } from '@/hooks/useTodos';
import { Button } from '@/components/shadcn/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/shadcn/card';
import { Progress } from '@/components/shadcn/progress';
import { ShimmerSkeleton, ShimmerCardSkeleton } from '@/components/magicui/shimmer-skeleton';
import { Badge } from '@/components/shadcn/badge';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/shadcn/dropdown-menu';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/shadcn/alert-dialog';
import { TodoListFormDialog } from './TodoListFormDialog';
import type { TodoListSummary } from '@/types/todo';

export function ProjectDetailView() {
  const { projectId } = useParams({ from: '/todo/projects/$projectId' });
  const navigate = useNavigate();
  const [isCreateListDialogOpen, setIsCreateListDialogOpen] = useState(false);
  const [editingList, setEditingList] = useState<(TodoListSummary & { projectId: number }) | null>(null);
  const [deletingListId, setDeletingListId] = useState<number | null>(null);

  const { data: project, isLoading } = useProject(Number(projectId));
  const deleteMutation = useDeleteTodoList();

  const handleBackToDashboard = () => {
    navigate({ to: '/todo/projects' });
  };

  const handleListClick = (listId: number, viewMode: 'list' | 'kanban') => {
    navigate({
      to: '/todo/lists/$listId',
      params: { listId: String(listId) },
      search: { view: viewMode },
    });
  };

  const handleDeleteList = (e: React.MouseEvent, listId: number) => {
    e.stopPropagation();
    setDeletingListId(listId);
  };

  const confirmDelete = () => {
    if (deletingListId) {
      deleteMutation.mutate(deletingListId, {
        onSuccess: () => setDeletingListId(null),
      });
    }
  };

  if (isLoading) {
    return (
      <div className="container mx-auto py-8 px-4 max-w-5xl">
        <ShimmerSkeleton className="h-10 w-32 mb-6" />
        <ShimmerCardSkeleton className="mb-6 h-64" />
        <div className="space-y-4">
          {[...Array(3)].map((_, i) => (
            <ShimmerCardSkeleton key={i} className="h-24" />
          ))}
        </div>
      </div>
    );
  }

  if (!project) {
    return (
      <div className="container mx-auto py-8 px-4 text-center">
        <p className="text-muted-foreground">Project not found</p>
        <Button onClick={handleBackToDashboard} className="mt-4">
          Back to Dashboard
        </Button>
      </div>
    );
  }

  const lists = project.lists || [];

  return (
    <div className="container mx-auto py-8 px-4 max-w-5xl">
      {/* Back Button */}
      <Button variant="ghost" onClick={handleBackToDashboard} className="mb-6">
        <ArrowLeft className="h-4 w-4 mr-2" />
        Back to Projects
      </Button>

      {/* Project Header */}
      <Card className="mb-8">
        <CardHeader>
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-2">
                <CardTitle className="text-3xl">{project.name}</CardTitle>
                {/* Subtle color indicator */}
                <div
                  className="w-4 h-4 rounded-full flex-shrink-0"
                  style={{ backgroundColor: project.color }}
                  title={`Project color: ${project.color}`}
                />
              </div>
              {project.description && <CardDescription className="text-base">{project.description}</CardDescription>}
            </div>
            <Button onClick={() => setIsCreateListDialogOpen(true)} size="lg">
              <Plus className="h-4 w-4 mr-2" />
              New List
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">Overall Progress</span>
              <span className="font-medium">
                {project.completedCount} of {project.itemCount} tasks completed ({project.completionPercentage}%)
              </span>
            </div>
            <Progress value={project.completionPercentage} className="h-3" />
          </div>
        </CardContent>
      </Card>

      {/* Lists Section */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-2xl font-semibold">Lists</h2>
          <Badge variant="secondary">
            {lists.length} {lists.length === 1 ? 'list' : 'lists'}
          </Badge>
        </div>

        {lists.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center">
              <div className="rounded-full bg-muted p-6 mb-4 inline-flex">
                <ListTodo className="h-12 w-12 text-muted-foreground" />
              </div>
              <h3 className="text-xl font-semibold mb-2">No lists yet</h3>
              <p className="text-muted-foreground mb-6 max-w-sm mx-auto">
                Create your first list to start organizing tasks for this project.
              </p>
              <Button onClick={() => setIsCreateListDialogOpen(true)} size="lg">
                <Plus className="h-4 w-4 mr-2" />
                Create List
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-3">
            {lists.map((list, index) => (
              <div key={list.id}>
                <Card
                  className="group cursor-pointer hover:shadow-md transition-shadow"
                  onClick={() => handleListClick(list.id, list.viewMode)}
                >
                  <CardContent className="py-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3 flex-1 min-w-0">
                        {/* View Mode Icon */}
                        <div className="flex-shrink-0">
                          {list.viewMode === 'kanban' ? (
                            <LayoutGrid className="h-5 w-5 text-muted-foreground" />
                          ) : (
                            <ListTodo className="h-5 w-5 text-muted-foreground" />
                          )}
                        </div>

                        {/* List Info */}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <h3 className="font-medium truncate">{list.name}</h3>
                            <Badge variant="outline" className="text-xs">
                              {list.viewMode}
                            </Badge>
                          </div>
                          {list.description && (
                            <p className="text-sm text-muted-foreground truncate">{list.description}</p>
                          )}

                          {/* Progress */}
                          <div className="flex items-center gap-3 mt-2">
                            <Progress value={list.completionPercentage} className="h-1.5 flex-1 max-w-[200px]" />
                            <span className="text-xs text-muted-foreground whitespace-nowrap">
                              {list.completedCount}/{list.itemCount} ({list.completionPercentage}%)
                            </span>
                          </div>
                        </div>

                        {/* Actions Menu */}
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0"
                            >
                              <MoreVertical className="h-4 w-4" />
                              <span className="sr-only">Open menu</span>
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem
                              onClick={(e) => {
                                e.stopPropagation();
                                setEditingList({ ...list, projectId: project.id });
                              }}
                            >
                              <Pencil className="h-4 w-4 mr-2" />
                              Edit
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              onClick={(e) => handleDeleteList(e, list.id)}
                              className="text-destructive focus:text-destructive"
                            >
                              <Trash2 className="h-4 w-4 mr-2" />
                              Delete
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>

                        {/* Arrow Icon */}
                        <ChevronRight className="h-5 w-5 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0" />
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Create List Dialog */}
      <TodoListFormDialog
        open={isCreateListDialogOpen}
        onOpenChange={setIsCreateListDialogOpen}
        projectId={project.id}
      />

      {/* Edit List Dialog */}
      {editingList && (
        <TodoListFormDialog
          open={!!editingList}
          onOpenChange={(open) => !open && setEditingList(null)}
          projectId={project.id}
          list={editingList}
        />
      )}

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={!!deletingListId} onOpenChange={(open) => !open && setDeletingListId(null)}>
        <AlertDialogContent onClick={(e) => e.stopPropagation()}>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete List</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this list? This will also delete all items within this list. This action
              cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
