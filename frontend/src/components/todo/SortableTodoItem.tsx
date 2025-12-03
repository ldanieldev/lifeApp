/**
 * Sortable Todo Item Component
 *
 * Wraps TodoItem with drag-and-drop functionality using @dnd-kit.
 * Displays a drag handle for reordering items.
 */

import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { GripVertical } from 'lucide-react';
import { TodoItem } from './TodoItem';
import type { TodoItem as TodoItemType } from '@/types/todo';

interface SortableTodoItemProps {
  item: TodoItemType;
  onComplete?: (id: number) => void;
  onClick?: (item: TodoItemType) => void;
  isSelected?: boolean;
  onSelectionChange?: (id: number, selected: boolean) => void;
  bulkMode?: boolean;
}

export function SortableTodoItem({
  item,
  onComplete,
  onClick,
  isSelected,
  onSelectionChange,
  bulkMode,
}: SortableTodoItemProps) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: item.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  return (
    <div ref={setNodeRef} style={style} className="flex items-center gap-2">
      {/* Drag Handle */}
      <button
        {...attributes}
        {...listeners}
        className="cursor-grab active:cursor-grabbing p-1 hover:bg-muted rounded touch-none"
        aria-label="Drag to reorder"
      >
        <GripVertical className="h-4 w-4 text-muted-foreground" />
      </button>

      {/* Todo Item */}
      <div className="flex-1">
        <TodoItem
          item={item}
          onComplete={onComplete}
          onClick={onClick}
          isSelected={isSelected}
          onSelectionChange={onSelectionChange}
          bulkMode={bulkMode}
        />
      </div>
    </div>
  );
}
