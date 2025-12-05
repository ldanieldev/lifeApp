/**
 * Quick Add Item Component
 *
 * Inline form for quickly adding todo items.
 */

import { useState } from 'react';
import { Plus } from 'lucide-react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Button } from '@/components/shadcn/button';
import { Input } from '@/components/shadcn/input';
import { useCreateTodoItem } from '@/hooks/useTodos';
import { quickAddItemSchema, type QuickAddItemValues } from '@/lib/validations/todo';

interface QuickAddItemProps {
  listId: number;
  laneId?: number | null;
}

export function QuickAddItem({ listId, laneId }: QuickAddItemProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const createMutation = useCreateTodoItem();

  const form = useForm<QuickAddItemValues>({
    resolver: zodResolver(quickAddItemSchema),
    defaultValues: {
      title: '',
    },
  });

  const onSubmit = (data: QuickAddItemValues) => {
    createMutation.mutate(
      {
        title: data.title,
        todoListId: listId,
        kanbanLaneId: laneId,
      },
      {
        onSuccess: () => {
          form.reset();
          setIsExpanded(false);
        },
      }
    );
  };

  if (!isExpanded) {
    return (
      <Button onClick={() => setIsExpanded(true)} variant="outline" className="w-full justify-start">
        <Plus className="h-4 w-4 mr-2" />
        Add item
      </Button>
    );
  }

  return (
    <form onSubmit={form.handleSubmit(onSubmit)} className="flex gap-2">
      <Input
        {...form.register('title')}
        placeholder="What needs to be done?"
        autoFocus
        onBlur={() => {
          if (!form.getValues('title')) {
            setIsExpanded(false);
          }
        }}
        onKeyDown={(e) => {
          if (e.key === 'Escape') {
            setIsExpanded(false);
            form.reset();
          }
        }}
      />
      <Button type="submit" disabled={createMutation.isPending}>
        Add
      </Button>
      <Button
        type="button"
        variant="outline"
        onClick={() => {
          setIsExpanded(false);
          form.reset();
        }}
      >
        Cancel
      </Button>
    </form>
  );
}
