/**
 * Kanban Board Component
 *
 * Displays items in kanban board format with drag-and-drop between lanes.
 * Uses @dnd-kit for drag-and-drop functionality.
 */

import { useState } from 'react';
import { Plus } from 'lucide-react';
import {
  DndContext,
  DragOverlay,
  closestCorners,
  PointerSensor,
  KeyboardSensor,
  useSensor,
  useSensors,
  type DragStartEvent,
  type DragOverEvent,
} from '@dnd-kit/core';
import { sortableKeyboardCoordinates } from '@dnd-kit/sortable';
import { Button } from '@/components/shadcn/button';
import { KanbanLane } from './KanbanLane';
import { KanbanLaneFormDialog } from './KanbanLaneFormDialog';
import { TodoItem } from './TodoItem';
import { useMoveItemToLane } from '@/hooks/useTodos';
import type { TodoListDetail, TodoItem as TodoItemType } from '@/types/todo';

interface KanbanBoardProps {
  list: TodoListDetail;
}

export function KanbanBoard({ list }: KanbanBoardProps) {
  const [isCreateLaneDialogOpen, setIsCreateLaneDialogOpen] = useState(false);
  const [activeId, setActiveId] = useState<number | null>(null);

  const lanes = list.kanbanLanes || [];
  // In kanban view, items are nested within lanes, not at list level
  const items = lanes.flatMap((lane) => lane.items || []);
  const moveItemMutation = useMoveItemToLane();

  // Drag-and-drop sensors
  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  // Find item by ID
  const findItem = (id: number | string): TodoItemType | undefined => {
    return items.find((item) => item.id === Number(id));
  };

  // Find lane by ID (could be from droppable lane or from item being dragged over)
  const findLaneByDroppableId = (id: number | string): number | null => {
    const numId = Number(id);

    // First, check if it's a lane ID
    const lane = lanes.find((l) => l.id === numId);
    if (lane) {
      return lane.id;
    }

    // If not a lane, check if it's an item ID and return that item's lane
    const item = items.find((item) => item.id === numId);
    if (item && item.kanbanLaneId) {
      return item.kanbanLaneId;
    }

    return null;
  };

  const handleDragStart = (event: DragStartEvent) => {
    setActiveId(event.active.id as number);
  };

  const handleDragOver = (event: DragOverEvent) => {
    const { active, over } = event;

    if (!over) return;

    const activeItem = findItem(active.id);
    const overLaneId = findLaneByDroppableId(over.id);

    if (activeItem && overLaneId && activeItem.kanbanLaneId !== overLaneId) {
      // Optimistic update: move item to new lane
      moveItemMutation.mutate({
        id: activeItem.id,
        data: { kanbanLaneId: overLaneId },
      });
    }
  };

  const handleDragEnd = () => {
    setActiveId(null);
  };

  return (
    <div className="space-y-6">
      {/* Board Header */}
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-semibold">
          {lanes.length} {lanes.length === 1 ? 'lane' : 'lanes'}
        </h2>
        <Button onClick={() => setIsCreateLaneDialogOpen(true)} variant="outline">
          <Plus className="h-4 w-4 mr-2" />
          New Lane
        </Button>
      </div>

      {/* Kanban Board */}
      {lanes.length === 0 ? (
        <div className="text-center py-12 border-2 border-dashed rounded-lg">
          <h3 className="text-lg font-medium mb-2">No lanes yet</h3>
          <p className="text-muted-foreground mb-6">Create your first lane to organize tasks on the board.</p>
          <Button onClick={() => setIsCreateLaneDialogOpen(true)}>
            <Plus className="h-4 w-4 mr-2" />
            Create Lane
          </Button>
        </div>
      ) : (
        <DndContext
          sensors={sensors}
          collisionDetection={closestCorners}
          onDragStart={handleDragStart}
          onDragOver={handleDragOver}
          onDragEnd={handleDragEnd}
        >
          <div className="w-full overflow-x-auto">
            <div className="flex gap-6 pb-4" style={{ minWidth: 'max-content' }}>
              {lanes.map((lane) => {
                // Items are already nested within lanes from the API
                const laneItems = lane.items || [];
                return <KanbanLane key={lane.id} lane={lane} items={laneItems} listId={list.id} />;
              })}
            </div>
          </div>

          {/* Drag Overlay */}
          <DragOverlay>
            {activeId ? (
              <div className="opacity-50">
                <TodoItem item={findItem(activeId)!} viewMode="kanban" />
              </div>
            ) : null}
          </DragOverlay>
        </DndContext>
      )}

      {/* Create Lane Dialog */}
      <KanbanLaneFormDialog open={isCreateLaneDialogOpen} onOpenChange={setIsCreateLaneDialogOpen} listId={list.id} />
    </div>
  );
}
