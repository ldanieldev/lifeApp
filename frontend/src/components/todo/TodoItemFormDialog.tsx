/**
 * Todo Item Form Dialog Component
 *
 * Modal form for creating/editing todo items with full details.
 */

import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { format } from 'date-fns';
import { Calendar as CalendarIcon } from 'lucide-react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/shadcn/dialog';
import { Button } from '@/components/shadcn/button';
import { Input } from '@/components/shadcn/input';
import { Textarea } from '@/components/shadcn/textarea';
import { Label } from '@/components/shadcn/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/shadcn/select';
import { useCreateTodoItem, useUpdateTodoItem } from '@/hooks/useTodos';
import { todoItemFormSchema, type TodoItemFormValues } from '@/lib/validations/todo';
import { PRIORITY_LABELS, type TodoItem } from '@/types/todo';
import { cn } from '@/lib/utils';

interface TodoItemFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  listId: number;
  laneId?: number | null;
  item?: TodoItem;
}

export function TodoItemFormDialog({ open, onOpenChange, listId, laneId, item }: TodoItemFormDialogProps) {
  const isEdit = !!item;

  const createMutation = useCreateTodoItem();
  const updateMutation = useUpdateTodoItem();

  const form = useForm<TodoItemFormValues>({
    resolver: zodResolver(todoItemFormSchema),
    defaultValues: {
      title: item?.title || '',
      description: item?.description || '',
      priority: item?.priority || 0,
      dueDate: item?.dueDate ? new Date(item.dueDate) : null,
    },
  });

  // Reset form values when item changes (for edit mode)
  useEffect(() => {
    if (item && open) {
      form.reset({
        title: item.title || '',
        description: item.description || '',
        priority: item.priority || 0,
        dueDate: item.dueDate ? new Date(item.dueDate) : null,
      });
    } else if (!item && open) {
      // Clear form for create mode
      form.reset({
        title: '',
        description: '',
        priority: 0,
        dueDate: null,
      });
    }
  }, [item, open, form]);

  const onSubmit = async (data: TodoItemFormValues) => {
    if (isEdit) {
      updateMutation.mutate(
        {
          id: item.id,
          data: {
            ...data,
            dueDate: data.dueDate?.toISOString() || null,
          },
        },
        {
          onSuccess: () => {
            onOpenChange(false);
            form.reset();
          },
        }
      );
    } else {
      createMutation.mutate(
        {
          ...data,
          todoListId: listId,
          kanbanLaneId: laneId,
          dueDate: data.dueDate?.toISOString() || null,
        },
        {
          onSuccess: () => {
            onOpenChange(false);
            form.reset();
          },
        }
      );
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
          <DialogTitle>{isEdit ? 'Edit Item' : 'Add Item'}</DialogTitle>
          <DialogDescription>{isEdit ? 'Update your task details.' : 'Add a new task to your list.'}</DialogDescription>
        </DialogHeader>

        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
          {/* Title */}
          <div className="space-y-2">
            <Label htmlFor="item-title">
              Title <span className="text-destructive">*</span>
            </Label>
            <Input id="item-title" {...form.register('title')} placeholder="What needs to be done?" autoFocus />
            {form.formState.errors.title && (
              <p className="text-sm text-destructive">{form.formState.errors.title.message}</p>
            )}
          </div>

          {/* Description */}
          <div className="space-y-2">
            <Label htmlFor="item-description">Description</Label>
            <Textarea id="item-description" {...form.register('description')} placeholder="Add details..." rows={4} />
            {form.formState.errors.description && (
              <p className="text-sm text-destructive">{form.formState.errors.description.message}</p>
            )}
          </div>

          {/* Priority */}
          <div className="space-y-2">
            <Label htmlFor="priority">Priority</Label>
            <Select
              value={String(form.watch('priority'))}
              onValueChange={(value) => form.setValue('priority', Number(value))}
            >
              <SelectTrigger id="priority">
                <SelectValue placeholder="Select priority" />
              </SelectTrigger>
              <SelectContent>
                {Object.entries(PRIORITY_LABELS).map(([value, label]) => (
                  <SelectItem key={value} value={value}>
                    {label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Due Date */}
          <div className="space-y-2">
            <Label htmlFor="dueDate">Due Date</Label>
            <Input
              id="dueDate"
              type="date"
              value={form.watch('dueDate') ? format(form.watch('dueDate')!, 'yyyy-MM-dd') : ''}
              onChange={(e) => {
                const value = e.target.value;
                form.setValue('dueDate', value ? new Date(value) : null);
              }}
            />
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
                  : 'Add Item'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
