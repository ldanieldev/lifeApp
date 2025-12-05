/**
 * Todo List Form Dialog Component
 *
 * Modal form for creating/editing todo lists.
 */

import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/shadcn/dialog';
import { Button } from '@/components/shadcn/button';
import { Input } from '@/components/shadcn/input';
import { Textarea } from '@/components/shadcn/textarea';
import { Label } from '@/components/shadcn/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/shadcn/select';
import { useCreateTodoList, useUpdateTodoList } from '@/hooks/useTodos';
import { todoListFormSchema, type TodoListFormValues } from '@/lib/validations/todo';
import type { TodoList } from '@/types/todo';

interface TodoListFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  projectId?: number | null;
  list?: Pick<TodoList, 'id' | 'name' | 'description' | 'viewMode' | 'projectId'>;
}

export function TodoListFormDialog({ open, onOpenChange, projectId, list }: TodoListFormDialogProps) {
  const isEdit = !!list;

  const createMutation = useCreateTodoList();
  const updateMutation = useUpdateTodoList();

  const form = useForm<TodoListFormValues>({
    resolver: zodResolver(todoListFormSchema),
    defaultValues: {
      name: list?.name || '',
      description: list?.description || '',
      viewMode: list?.viewMode || 'list',
      projectId: projectId || list?.projectId || null,
    },
  });

  const onSubmit = async (data: TodoListFormValues) => {
    if (isEdit) {
      updateMutation.mutate(
        { id: list.id, data },
        {
          onSuccess: () => {
            onOpenChange(false);
            form.reset();
          },
        }
      );
    } else {
      createMutation.mutate(data, {
        onSuccess: () => {
          onOpenChange(false);
          form.reset();
        },
      });
    }
  };

  const handleOpenChange = (newOpen: boolean) => {
    onOpenChange(newOpen);
    if (!newOpen) {
      form.reset();
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>{isEdit ? 'Edit List' : 'Create List'}</DialogTitle>
          <DialogDescription>
            {isEdit ? 'Update your list details.' : 'Create a new list to organize your tasks.'}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
          {/* Name */}
          <div className="space-y-2">
            <Label htmlFor="list-name">
              Name <span className="text-destructive">*</span>
            </Label>
            <Input id="list-name" {...form.register('name')} placeholder="e.g., Sprint Tasks" autoFocus />
            {form.formState.errors.name && (
              <p className="text-sm text-destructive">{form.formState.errors.name.message}</p>
            )}
          </div>

          {/* Description */}
          <div className="space-y-2">
            <Label htmlFor="list-description">Description</Label>
            <Textarea
              id="list-description"
              {...form.register('description')}
              placeholder="Optional description..."
              rows={3}
            />
            {form.formState.errors.description && (
              <p className="text-sm text-destructive">{form.formState.errors.description.message}</p>
            )}
          </div>

          {/* View Mode */}
          <div className="space-y-2">
            <Label htmlFor="viewMode">View Mode</Label>
            <Select
              value={form.watch('viewMode')}
              onValueChange={(value: 'list' | 'kanban') => form.setValue('viewMode', value)}
            >
              <SelectTrigger id="viewMode">
                <SelectValue placeholder="Select view mode" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="list">List (Simple checklist)</SelectItem>
                <SelectItem value="kanban">Kanban (Board view)</SelectItem>
              </SelectContent>
            </Select>
            {form.formState.errors.viewMode && (
              <p className="text-sm text-destructive">{form.formState.errors.viewMode.message}</p>
            )}
          </div>

          {/* Actions */}
          <div className="flex justify-end gap-3">
            <Button type="button" variant="outline" onClick={() => handleOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={createMutation.isPending || updateMutation.isPending}>
              {createMutation.isPending || updateMutation.isPending
                ? 'Saving...'
                : isEdit
                  ? 'Save Changes'
                  : 'Create List'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
