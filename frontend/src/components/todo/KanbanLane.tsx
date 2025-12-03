/**
 * Kanban Lane Component
 *
 * Single kanban lane with items and quick add.
 * NOTE: Full drag-and-drop implementation would require @dnd-kit integration.
 * This is a simplified version showing the structure.
 */

import { useState } from 'react';
import { MoreVertical, Pencil, Trash2 } from 'lucide-react';
import { useDroppable } from '@dnd-kit/core';
import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { motion } from 'framer-motion';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/shadcn/card';
import { Button } from '@/components/shadcn/button';
import { Badge } from '@/components/shadcn/badge';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/shadcn/dropdown-menu';
import { ScrollArea } from '@/components/shadcn/scroll-area';
import { cn } from '@/lib/utils';
import { useDeleteKanbanLane, useCompleteTodoItem, useUncompleteTodoItem } from '@/hooks/useTodos';
import { SortableTodoItem } from './SortableTodoItem';
import { QuickAddItem } from './QuickAddItem';
import { KanbanLaneFormDialog } from './KanbanLaneFormDialog';
import type { KanbanLane as KanbanLaneType, TodoItem as TodoItemType } from '@/types/todo';

interface KanbanLaneProps {
  lane: KanbanLaneType;
  items: TodoItemType[];
  listId: number;
}

export function KanbanLane({ lane, items, listId }: KanbanLaneProps) {
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const deleteMutation = useDeleteKanbanLane();
  const completeMutation = useCompleteTodoItem();
  const uncompleteMutation = useUncompleteTodoItem();

  // Make this lane a droppable zone
  const { setNodeRef, isOver } = useDroppable({ id: lane.id });

  const handleDelete = () => {
    if (lane.isDefault) {
      return; // Cannot delete default lane
    }
    deleteMutation.mutate(lane.id);
  };

  const handleToggleComplete = (itemId: number) => {
    const item = items.find((i) => i.id === itemId);
    if (!item) return;

    if (item.status === 'completed') {
      uncompleteMutation.mutate(itemId);
    } else {
      completeMutation.mutate(itemId);
    }
  };

  return (
    <>
      <div className="relative">
        {/* Moving Border Effect on Drag Over */}
        {isOver && (
          <motion.div
            className="absolute inset-0 z-0 rounded-lg pointer-events-none"
            style={{
              background:
                'linear-gradient(90deg, hsl(var(--primary) / 0.3), hsl(var(--primary)), hsl(var(--primary) / 0.3))',
              backgroundSize: '200% 200%',
              animation: 'moving-border 2s ease infinite',
              padding: '2px',
            }}
            initial={{ opacity: 0, scale: 0.98 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.98 }}
            transition={{ duration: 0.2 }}
          >
            <div className="w-full h-full bg-background rounded-lg" />
          </motion.div>
        )}

        <Card
          ref={setNodeRef}
          className={cn(
            'w-[350px] flex flex-col h-[calc(100vh-16rem)] flex-shrink-0 relative overflow-hidden',
            isOver && 'scale-[1.02] transition-transform duration-200'
          )}
        >
          <CardHeader className="pb-3 flex-shrink-0">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 flex-1 min-w-0">
                <CardTitle className="text-base truncate">{lane.name}</CardTitle>
                {/* Color Badge */}
                <div
                  className="w-3 h-3 rounded-full flex-shrink-0"
                  style={{ backgroundColor: lane.color }}
                  title={`Lane color: ${lane.color}`}
                />
                <Badge variant="secondary" className="flex-shrink-0">
                  {items.length}
                </Badge>
              </div>

              {/* Actions Menu */}
              {!lane.isDefault && (
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="icon" className="h-8 w-8">
                      <MoreVertical className="h-4 w-4" />
                      <span className="sr-only">Open menu</span>
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem onClick={() => setIsEditDialogOpen(true)}>
                      <Pencil className="h-4 w-4 mr-2" />
                      Edit
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={handleDelete} className="text-destructive focus:text-destructive">
                      <Trash2 className="h-4 w-4 mr-2" />
                      Delete
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              )}
            </div>
          </CardHeader>

          <CardContent className="flex-1 flex flex-col min-h-0 pb-3 overflow-hidden">
            {/* Quick Add */}
            <div className="mb-3 flex-shrink-0">
              <QuickAddItem listId={listId} laneId={lane.id} />
            </div>

            {/* Items List */}
            <div className="flex-1 min-h-0 overflow-hidden">
              <ScrollArea className="h-full">
                <SortableContext items={items.map((i) => i.id)} strategy={verticalListSortingStrategy}>
                  <div className="space-y-2 pr-3">
                    {items.length === 0 ? (
                      <div className="text-center py-8 text-sm text-muted-foreground">No items in this lane</div>
                    ) : (
                      items.map((item) => (
                        <SortableTodoItem key={item.id} item={item} onComplete={handleToggleComplete} />
                      ))
                    )}
                  </div>
                </SortableContext>
              </ScrollArea>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Edit Lane Dialog */}
      <KanbanLaneFormDialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen} listId={listId} lane={lane} />
    </>
  );
}
