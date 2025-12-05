/**
 * TodoItemWithSubtasks Component
 *
 * Renders a todo item with its nested subtasks (up to 2 levels deep).
 * Includes expand/collapse functionality and "Add Subtask" button.
 */

import { useState } from 'react';
import { ChevronRight, ChevronDown, Plus } from 'lucide-react';
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { Button } from '@/components/shadcn/button';
import { cn } from '@/lib/utils';
import type { TodoItem as TodoItemType } from '@/types/todo';
import { SortableTodoItem } from './SortableTodoItem';
import { TodoItemFormDialog } from './TodoItemFormDialog';
import { useReorderItems } from '@/hooks/useTodos';

interface TodoItemWithSubtasksProps {
  item: TodoItemType;
  listId: number;
  onComplete: (itemId: number) => void;
  isSelected: boolean;
  onSelectionChange?: (itemId: number, selected: boolean) => void;
  bulkMode?: boolean;
  isExpanded: boolean;
  onToggleExpand: (itemId: number) => void;
  depth?: number;
  showCompleted?: boolean;
}

export function TodoItemWithSubtasks({
  item,
  listId,
  onComplete,
  isSelected,
  onSelectionChange,
  bulkMode,
  isExpanded,
  onToggleExpand,
  depth = 0,
  showCompleted = false,
}: TodoItemWithSubtasksProps) {
  const [isAddSubtaskDialogOpen, setIsAddSubtaskDialogOpen] = useState(false);
  const [isHovered, setIsHovered] = useState(false);

  const reorderMutation = useReorderItems();

  // Drag-and-drop sensors
  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const hasSubtasks = item.subtasks && item.subtasks.length > 0;
  const canHaveSubtasks = depth < 2; // Max depth is 2

  // Filter subtasks based on showCompleted
  const visibleSubtasks = hasSubtasks
    ? item.subtasks.filter((subtask) => showCompleted || subtask.status === 'pending')
    : [];

  const indentClass = depth === 0 ? '' : depth === 1 ? 'ml-8' : 'ml-16';

  const handleSubtaskDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;

    if (over && active.id !== over.id) {
      const oldIndex = visibleSubtasks.findIndex((subtask) => subtask.id === active.id);
      const newIndex = visibleSubtasks.findIndex((subtask) => subtask.id === over.id);

      if (oldIndex !== -1 && newIndex !== -1) {
        // Reorder subtasks
        const reorderedSubtasks = arrayMove(visibleSubtasks, oldIndex, newIndex);
        const itemIds = reorderedSubtasks.map((subtask) => subtask.id);

        // Send reordered list to backend
        reorderMutation.mutate({ itemIds });
      }
    }
  };

  return (
    <div className="relative">
      <div
        className={cn('group relative', indentClass)}
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
      >
        {/* Connecting line for subtasks */}
        {depth > 0 && (
          <>
            {/* Vertical line */}
            <div className="absolute left-[-24px] top-0 bottom-0 w-px bg-border" />
            {/* Horizontal line */}
            <div className="absolute left-[-24px] top-[24px] w-[16px] h-px bg-border" />
          </>
        )}

        <div className="flex items-center gap-2">
          {/* Expand/Collapse Button */}
          {hasSubtasks && (
            <Button
              variant="ghost"
              size="icon"
              className="h-6 w-6 flex-shrink-0"
              onClick={() => onToggleExpand(item.id)}
            >
              {isExpanded ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
              <span className="sr-only">{isExpanded ? 'Collapse' : 'Expand'} subtasks</span>
            </Button>
          )}

          {/* Spacer if no subtasks */}
          {!hasSubtasks && <div className="w-6 flex-shrink-0" />}

          {/* Todo Item */}
          <div className="flex-1 min-w-0">
            <SortableTodoItem
              item={item}
              onComplete={onComplete}
              isSelected={isSelected}
              onSelectionChange={onSelectionChange}
              bulkMode={bulkMode}
            />
          </div>

          {/* Add Subtask Button (visible on hover, only if depth < 2) */}
          {canHaveSubtasks && isHovered && !bulkMode && (
            <Button
              variant="ghost"
              size="sm"
              className="h-8 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0"
              onClick={() => setIsAddSubtaskDialogOpen(true)}
            >
              <Plus className="h-4 w-4 mr-1" />
              Add Subtask
            </Button>
          )}
        </div>
      </div>

      {/* Nested Subtasks */}
      {hasSubtasks && isExpanded && (
        <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleSubtaskDragEnd}>
          <SortableContext items={visibleSubtasks.map((subtask) => subtask.id)} strategy={verticalListSortingStrategy}>
            <div className="space-y-2 mt-2">
              {visibleSubtasks.map((subtask) => {
                return (
                  <div key={subtask.id} className="relative">
                    {/* Vertical connecting line for all siblings */}
                    {depth === 0 && <div className="absolute left-[8px] top-0 bottom-0 w-px bg-border" />}
                    <TodoItemWithSubtasks
                      item={subtask}
                      listId={listId}
                      onComplete={onComplete}
                      isSelected={false}
                      onSelectionChange={onSelectionChange}
                      bulkMode={bulkMode}
                      isExpanded={isExpanded}
                      onToggleExpand={onToggleExpand}
                      depth={depth + 1}
                      showCompleted={showCompleted}
                    />
                  </div>
                );
              })}
            </div>
          </SortableContext>
        </DndContext>
      )}

      {/* Add Subtask Dialog */}
      <TodoItemFormDialog
        open={isAddSubtaskDialogOpen}
        onOpenChange={setIsAddSubtaskDialogOpen}
        listId={listId}
        parentItemId={item.id}
      />
    </div>
  );
}
