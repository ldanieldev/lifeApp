/**
 * Kanban Lane Form Dialog Component
 *
 * Modal form for creating/editing kanban lanes.
 */

import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/shadcn/dialog';
import { Button } from '@/components/shadcn/button';
import { Input } from '@/components/shadcn/input';
import { Label } from '@/components/shadcn/label';
import { useCreateKanbanLane, useUpdateKanbanLane } from '@/hooks/useTodos';
import { kanbanLaneFormSchema, type KanbanLaneFormValues } from '@/lib/validations/todo';
import { LANE_COLORS } from '@/types/todo';
import type { KanbanLane } from '@/types/todo';

interface KanbanLaneFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  listId: number;
  lane?: KanbanLane;
}

export function KanbanLaneFormDialog({ open, onOpenChange, listId, lane }: KanbanLaneFormDialogProps) {
  const isEdit = !!lane;

  const createMutation = useCreateKanbanLane();
  const updateMutation = useUpdateKanbanLane();

  const form = useForm<KanbanLaneFormValues>({
    resolver: zodResolver(kanbanLaneFormSchema),
    defaultValues: {
      name: lane?.name || '',
      color: lane?.color || '#6B7280',
    },
  });

  const onSubmit = async (data: KanbanLaneFormValues) => {
    if (isEdit) {
      updateMutation.mutate(
        { id: lane.id, data },
        {
          onSuccess: () => {
            onOpenChange(false);
            form.reset();
          },
        }
      );
    } else {
      createMutation.mutate(
        { ...data, todoListId: listId },
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
      <DialogContent className="sm:max-w-[450px]">
        <DialogHeader>
          <DialogTitle>{isEdit ? 'Edit Lane' : 'Create Lane'}</DialogTitle>
          <DialogDescription>
            {isEdit ? 'Update your lane details.' : 'Create a new lane for your kanban board.'}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
          {/* Name */}
          <div className="space-y-2">
            <Label htmlFor="lane-name">
              Name <span className="text-destructive">*</span>
            </Label>
            <Input id="lane-name" {...form.register('name')} placeholder="e.g., In Progress" autoFocus />
            {form.formState.errors.name && (
              <p className="text-sm text-destructive">{form.formState.errors.name.message}</p>
            )}
          </div>

          {/* Color Picker */}
          <div className="space-y-2">
            <Label>Color</Label>
            <div className="flex gap-2">
              {LANE_COLORS.map((color) => (
                <button
                  key={color}
                  type="button"
                  onClick={() => form.setValue('color', color)}
                  className={`h-10 w-10 rounded-md transition-transform hover:scale-110 ${
                    form.watch('color') === color ? 'ring-2 ring-offset-2 ring-primary scale-110' : ''
                  }`}
                  style={{ backgroundColor: color }}
                  aria-label={`Select color ${color}`}
                />
              ))}
            </div>
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
                  : 'Create Lane'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
