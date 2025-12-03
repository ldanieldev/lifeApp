/**
 * All Lists Route
 *
 * Displays all todo lists (both standalone and within projects).
 * Route: /todo/lists
 */

import { createFileRoute } from '@tanstack/react-router';
import { z } from 'zod';
import { useState } from 'react';
import { useNavigate, useSearch } from '@tanstack/react-router';
import { Plus, Search, List, MoreVertical, Pencil, Trash2 } from 'lucide-react';
import { useTodoLists, useDeleteTodoList } from '@/hooks/useTodos';
import { Button } from '@/components/shadcn/button';
import { Input } from '@/components/shadcn/input';
import { Skeleton } from '@/components/shadcn/skeleton';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/shadcn/card';
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
import { TodoListFormDialog } from '@/components/todo/TodoListFormDialog';
import type { TodoList } from '@/types/todo';

// Search params validation
const listsSearchSchema = z.object({
  search: z.string().optional(),
  viewMode: z.enum(['list', 'kanban']).optional(),
  project: z.string().optional(),
});

function AllListsPage() {
  const navigate = useNavigate();
  const searchParams = useSearch({ from: '/todo/lists/' });
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState(searchParams.search || '');
  const [editingList, setEditingList] = useState<TodoList | null>(null);
  const [deletingListId, setDeletingListId] = useState<number | null>(null);

  // Fetch all lists
  const { data: listsData, isLoading } = useTodoLists({
    search: searchParams.search,
    viewMode: searchParams.viewMode,
    project: searchParams.project,
    ordering: 'displayOrder',
  });

  const deleteMutation = useDeleteTodoList();

  const lists = listsData?.results || [];

  const handleListClick = (list: TodoList) => {
    navigate({ to: '/todo/lists/$listId', params: { listId: String(list.id) } });
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

  const handleSearchChange = (value: string) => {
    setSearchQuery(value);
    const timer = setTimeout(() => {
      navigate({
        to: '/todo/lists',
        search: (prev) => ({ ...prev, search: value || undefined }),
        replace: true,
      });
    }, 300);
    return () => clearTimeout(timer);
  };

  return (
    <div className="container mx-auto py-8 px-4 max-w-7xl">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">All Lists</h1>
          <p className="text-muted-foreground mt-1">Manage all your todo lists in one place</p>
        </div>
        <Button onClick={() => setIsCreateDialogOpen(true)} size="lg">
          <Plus className="h-4 w-4 mr-2" />
          New List
        </Button>
      </div>

      {/* Search */}
      <div className="flex items-center gap-4 mb-6">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            type="search"
            placeholder="Search lists..."
            value={searchQuery}
            onChange={(e) => handleSearchChange(e.target.value)}
            className="pl-10"
          />
        </div>
      </div>

      {/* Lists Grid */}
      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[...Array(6)].map((_, i) => (
            <Skeleton key={i} className="h-40 rounded-lg" />
          ))}
        </div>
      ) : lists.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <div className="rounded-full bg-muted p-6 mb-4">
            <List className="h-12 w-12 text-muted-foreground" />
          </div>
          <h3 className="text-xl font-semibold mb-2">No lists yet</h3>
          <p className="text-muted-foreground mb-6 max-w-sm">
            {searchParams.search
              ? 'No lists match your search. Try a different query.'
              : 'Get started by creating your first todo list.'}
          </p>
          {!searchParams.search && (
            <Button onClick={() => setIsCreateDialogOpen(true)} size="lg">
              <Plus className="h-4 w-4 mr-2" />
              Create List
            </Button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {lists.map((list) => (
            <Card
              key={list.id}
              className="group cursor-pointer hover:shadow-lg transition-shadow"
              onClick={() => handleListClick(list)}
            >
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <CardTitle className="text-lg">{list.name}</CardTitle>
                    {list.description && (
                      <CardDescription className="mt-1 line-clamp-2">{list.description}</CardDescription>
                    )}
                  </div>

                  {/* Actions Menu */}
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 opacity-0 group-hover:opacity-100 transition-opacity"
                      >
                        <MoreVertical className="h-4 w-4" />
                        <span className="sr-only">Open menu</span>
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem
                        onClick={(e) => {
                          e.stopPropagation();
                          setEditingList(list);
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
                </div>
              </CardHeader>
              <CardContent>
                <div className="flex items-center justify-between text-sm">
                  <div className="flex items-center gap-2">
                    <Badge variant={list.viewMode === 'kanban' ? 'default' : 'secondary'}>
                      {list.viewMode === 'kanban' ? 'Kanban' : 'List'}
                    </Badge>
                    {list.project && (
                      <Badge variant="outline" className="text-xs">
                        In Project
                      </Badge>
                    )}
                  </div>
                  <div className="text-muted-foreground">
                    {list.completedCount}/{list.itemCount} done
                  </div>
                </div>
                {list.itemCount > 0 && (
                  <div className="mt-3">
                    <div className="flex items-center justify-between text-xs mb-1">
                      <span className="text-muted-foreground">Progress</span>
                      <span className="font-medium">{list.completionPercentage}%</span>
                    </div>
                    <div className="w-full bg-muted rounded-full h-2">
                      <div
                        className="bg-primary rounded-full h-2 transition-all"
                        style={{ width: `${list.completionPercentage}%` }}
                      />
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Create List Dialog */}
      <TodoListFormDialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen} />

      {/* Edit List Dialog */}
      {editingList && (
        <TodoListFormDialog
          open={!!editingList}
          onOpenChange={(open) => !open && setEditingList(null)}
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

export const Route = createFileRoute('/todo/lists/')({
  validateSearch: listsSearchSchema,
  component: AllListsPage,
});
