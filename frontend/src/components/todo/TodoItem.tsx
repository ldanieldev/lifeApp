/**
 * Todo Item Component
 *
 * Single todo item display (used in both list and kanban views).
 */

import { useState } from 'react';
import { Calendar, Flag, MoreVertical, Pencil, Trash2 } from 'lucide-react';
import { format } from 'date-fns';
import { Checkbox } from '@/components/shadcn/checkbox';
import { Badge } from '@/components/shadcn/badge';
import { Button } from '@/components/shadcn/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/shadcn/dropdown-menu';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/shadcn/tooltip';
import { cn } from '@/lib/utils';
import { PRIORITY_LABELS, PRIORITY_COLORS, type TodoItem as TodoItemType, type PriorityLevel } from '@/types/todo';
import { useDeleteTodoItem } from '@/hooks/useTodos';
import { TodoItemFormDialog } from './TodoItemFormDialog';

interface TodoItemProps {
  item: TodoItemType;
  onToggle?: (itemId: number) => void;
  onComplete?: (itemId: number) => void;
  onClick?: (item: TodoItemType) => void;
  isSelected?: boolean;
  onSelect?: (itemId: number, selected: boolean) => void;
  onSelectionChange?: (itemId: number, selected: boolean) => void;
  viewMode?: 'list' | 'kanban';
  bulkMode?: boolean;
}

export function TodoItem({
  item,
  onToggle,
  onComplete,
  isSelected,
  onSelect,
  onSelectionChange,
  viewMode = 'list',
}: TodoItemProps) {
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const deleteMutation = useDeleteTodoItem();

  const isCompleted = item.status === 'completed';

  const handleCheckboxChange = (checked: boolean) => {
    if (onSelect) {
      onSelect(item.id, checked);
    } else if (onSelectionChange) {
      onSelectionChange(item.id, checked);
    } else if (onToggle) {
      onToggle(item.id);
    } else if (onComplete) {
      onComplete(item.id);
    }
  };

  const handleDelete = () => {
    deleteMutation.mutate(item.id);
  };

  // Determine layout based on view mode and screen size
  const isKanbanView = viewMode === 'kanban';

  return (
    <TooltipProvider>
      <div
        className={cn(
          'group flex items-center gap-3 p-3 rounded-lg border bg-card hover:bg-accent/50 transition-colors',
          isCompleted && 'opacity-60',
          isSelected && 'ring-2 ring-primary bg-accent',
          isKanbanView ? 'flex-col items-start' : 'flex-row'
        )}
      >
        {/* Checkbox */}
        <Checkbox
          checked={isSelected || isCompleted}
          onCheckedChange={handleCheckboxChange}
          className={cn(isKanbanView ? 'self-start' : 'flex-shrink-0')}
          aria-label="Complete item"
        />

        {/* Desktop List View: 3-column layout (Title | Description | Meta+Actions) */}
        {!isKanbanView && (
          <div className="flex-1 grid grid-cols-1 md:grid-cols-[2fr_3fr_auto] gap-3 items-center min-w-0">
            {/* Column 1: Title */}
            <div className="min-w-0">
              <h4 className={cn('font-medium truncate', isCompleted && 'line-through text-muted-foreground')}>
                {item.title}
              </h4>
            </div>

            {/* Column 2: Description (with tooltip on truncate) */}
            <div className="min-w-0 hidden md:block">
              {item.description ? (
                <Tooltip>
                  <TooltipTrigger asChild>
                    <p className="text-sm text-muted-foreground truncate cursor-help">{item.description}</p>
                  </TooltipTrigger>
                  <TooltipContent side="bottom" className="max-w-md">
                    <p className="whitespace-pre-wrap">{item.description}</p>
                  </TooltipContent>
                </Tooltip>
              ) : (
                <p className="text-sm text-muted-foreground italic">No description</p>
              )}
            </div>

            {/* Column 3: Meta info + Actions */}
            <div className="flex items-center gap-2 flex-shrink-0">
              {/* Priority Badge */}
              {item.priority > 0 && (
                <Badge variant="outline" className="text-xs gap-1 flex-shrink-0">
                  <Flag className="h-3 w-3" style={{ color: PRIORITY_COLORS[item.priority as PriorityLevel] }} />
                  <span className="hidden lg:inline">{PRIORITY_LABELS[item.priority as PriorityLevel]}</span>
                </Badge>
              )}

              {/* Due Date */}
              {item.dueDate && (
                <Badge variant={item.isOverdue ? 'destructive' : 'secondary'} className="text-xs gap-1 flex-shrink-0">
                  <Calendar className="h-3 w-3" />
                  <span className="hidden lg:inline">{format(new Date(item.dueDate), 'MMM d')}</span>
                </Badge>
              )}

              {/* Actions Menu */}
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 flex-shrink-0 opacity-0 group-hover:opacity-100 transition-opacity"
                  >
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
            </div>
          </div>
        )}

        {/* Kanban View: Compact vertical card */}
        {isKanbanView && (
          <div className="flex-1 w-full min-w-0">
            <div className="flex items-start justify-between gap-2 mb-2">
              <h4
                className={cn(
                  'font-medium text-sm line-clamp-2 flex-1',
                  isCompleted && 'line-through text-muted-foreground'
                )}
              >
                {item.title}
              </h4>

              {/* Actions Menu */}
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7 flex-shrink-0 opacity-0 group-hover:opacity-100 transition-opacity"
                  >
                    <MoreVertical className="h-3 w-3" />
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
            </div>

            {/* Description (with tooltip) */}
            {item.description && (
              <Tooltip>
                <TooltipTrigger asChild>
                  <p className="text-xs text-muted-foreground line-clamp-2 mb-2 cursor-help">{item.description}</p>
                </TooltipTrigger>
                <TooltipContent side="right" className="max-w-xs">
                  <p className="whitespace-pre-wrap text-sm">{item.description}</p>
                </TooltipContent>
              </Tooltip>
            )}

            {/* Meta badges */}
            <div className="flex items-center gap-2 flex-wrap">
              {item.priority > 0 && (
                <Badge variant="outline" className="text-xs gap-1">
                  <Flag className="h-3 w-3" style={{ color: PRIORITY_COLORS[item.priority as PriorityLevel] }} />
                </Badge>
              )}

              {item.dueDate && (
                <Badge variant={item.isOverdue ? 'destructive' : 'secondary'} className="text-xs gap-1">
                  <Calendar className="h-3 w-3" />
                  <span className="text-xs">{format(new Date(item.dueDate), 'MMM d')}</span>
                </Badge>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Edit Dialog */}
      <TodoItemFormDialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen} listId={item.id} item={item} />
    </TooltipProvider>
  );
}
