/**
 * Todo List View Component
 *
 * Displays items in simple checklist format with undo functionality.
 */

import { useState, useEffect } from 'react';
import { Search, SlidersHorizontal } from 'lucide-react';
import { useSearch, useNavigate } from '@tanstack/react-router';
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
import { Input } from '@/components/shadcn/input';
import { Checkbox } from '@/components/shadcn/checkbox';
import { Label } from '@/components/shadcn/label';
import { Separator } from '@/components/shadcn/separator';
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from '@/components/shadcn/sheet';
import {
  useCompleteTodoItem,
  useUncompleteTodoItem,
  useBulkCompleteItems,
  useBulkDeleteItems,
  useReorderItems,
} from '@/hooks/useTodos';
import { TodoItem } from './TodoItem';
import { SortableTodoItem } from './SortableTodoItem';
import { QuickAddItem } from './QuickAddItem';
import { BulkActionBar } from './BulkActionBar';
import { UndoToast } from './UndoToast';
import type { TodoListDetail } from '@/types/todo';

interface TodoListViewProps {
  list: TodoListDetail;
}

export function TodoListView({ list }: TodoListViewProps) {
  const navigate = useNavigate({ from: '/todo/lists/$listId' });
  const searchParams = useSearch({ from: '/todo/lists/$listId' });
  const [searchQuery, setSearchQuery] = useState(searchParams.search || '');
  const [selectedItemIds, setSelectedItemIds] = useState<Set<number>>(new Set());
  const [bulkMode, setBulkMode] = useState(false);
  const [undoItemId, setUndoItemId] = useState<number | null>(null);
  const [undoTimeoutId, setUndoTimeoutId] = useState<NodeJS.Timeout | null>(null);

  const completeMutation = useCompleteTodoItem();
  const uncompleteMutation = useUncompleteTodoItem();
  const bulkCompleteMutation = useBulkCompleteItems();
  const bulkDeleteMutation = useBulkDeleteItems();
  const reorderMutation = useReorderItems();

  // Drag-and-drop sensors
  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const showCompleted = searchParams.showCompleted ?? false;
  const sortBy = searchParams.sort || 'displayOrder';

  const items = list.items || [];

  // Filter and sort items
  const filteredItems = items
    .filter((item) => {
      // Filter by completion status
      if (!showCompleted && item.status === 'completed') return false;

      // Filter by search query
      if (searchQuery && !item.title.toLowerCase().includes(searchQuery.toLowerCase())) return false;

      return true;
    })
    .sort((a, b) => {
      switch (sortBy) {
        case 'dueDate':
          if (!a.dueDate) return 1;
          if (!b.dueDate) return -1;
          return new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime();
        case 'priority':
          return b.priority - a.priority;
        case 'createdAt':
          return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
        default:
          return a.displayOrder - b.displayOrder;
      }
    });

  const pendingItems = filteredItems.filter((item) => item.status === 'pending');
  const completedItems = filteredItems.filter((item) => item.status === 'completed');

  // Clear undo timeout on unmount
  useEffect(() => {
    return () => {
      if (undoTimeoutId) clearTimeout(undoTimeoutId);
    };
  }, [undoTimeoutId]);

  const handleToggleComplete = (itemId: number) => {
    const item = items.find((i) => i.id === itemId);
    if (!item) return;

    if (item.status === 'pending') {
      // Complete item and show undo
      completeMutation.mutate(itemId, {
        onSuccess: () => {
          setUndoItemId(itemId);
          // Auto-hide undo after 5 seconds
          const timeout = setTimeout(() => {
            setUndoItemId(null);
          }, 5000);
          setUndoTimeoutId(timeout);
        },
      });
    } else {
      // Uncomplete item
      uncompleteMutation.mutate(itemId);
    }
  };

  const handleUndo = () => {
    if (undoItemId) {
      uncompleteMutation.mutate(undoItemId);
      setUndoItemId(null);
      if (undoTimeoutId) {
        clearTimeout(undoTimeoutId);
        setUndoTimeoutId(null);
      }
    }
  };

  const handleSelect = (itemId: number, selected: boolean) => {
    setSelectedItemIds((prev) => {
      const newSet = new Set(prev);
      if (selected) {
        newSet.add(itemId);
      } else {
        newSet.delete(itemId);
      }
      return newSet;
    });
  };

  const handleBulkComplete = () => {
    bulkCompleteMutation.mutate(
      { itemIds: Array.from(selectedItemIds) },
      {
        onSuccess: () => {
          setSelectedItemIds(new Set());
          setBulkMode(false);
        },
      }
    );
  };

  const handleBulkDelete = () => {
    bulkDeleteMutation.mutate(
      { itemIds: Array.from(selectedItemIds) },
      {
        onSuccess: () => {
          setSelectedItemIds(new Set());
          setBulkMode(false);
        },
      }
    );
  };

  const toggleShowCompleted = () => {
    navigate({
      search: (prev) => ({ ...prev, showCompleted: !showCompleted }),
      replace: true,
    });
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;

    if (over && active.id !== over.id) {
      const oldIndex = pendingItems.findIndex((item) => item.id === active.id);
      const newIndex = pendingItems.findIndex((item) => item.id === over.id);

      if (oldIndex !== -1 && newIndex !== -1) {
        // Reorder within pending items
        const reorderedPending = arrayMove(pendingItems, oldIndex, newIndex);

        // Rebuild complete items list: reordered pending items + completed items
        // Pending items come first (in new order), then completed items (preserve their order)
        const allReorderedItems = [...reorderedPending, ...completedItems];
        const itemIds = allReorderedItems.map((item) => item.id);

        // Send complete reordered list to backend
        reorderMutation.mutate({ itemIds });
      }
    }
  };

  const handleSortChange = (newSort: string) => {
    navigate({
      search: (prev) => ({ ...prev, sort: newSort as any }),
      replace: true,
    });
  };

  return (
    <div className="space-y-6">
      {/* Quick Add */}
      <QuickAddItem listId={list.id} />

      {/* Filters and Search */}
      <div className="flex items-center gap-4">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            type="search"
            placeholder="Search items..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>

        {/* Filters Sheet */}
        <Sheet>
          <SheetTrigger asChild>
            <Button variant="outline">
              <SlidersHorizontal className="h-4 w-4 mr-2" />
              Filters
            </Button>
          </SheetTrigger>
          <SheetContent>
            <SheetHeader>
              <SheetTitle>Filters & Sorting</SheetTitle>
              <SheetDescription>Customize how your tasks are displayed</SheetDescription>
            </SheetHeader>

            <div className="space-y-6 mt-6">
              {/* Show Completed */}
              <div className="flex items-center space-x-2">
                <Checkbox id="showCompleted" checked={showCompleted} onCheckedChange={toggleShowCompleted} />
                <Label htmlFor="showCompleted">Show completed items</Label>
              </div>

              <Separator />

              {/* Sort By */}
              <div className="space-y-3">
                <Label>Sort by</Label>
                <div className="space-y-2">
                  {[
                    { value: 'displayOrder', label: 'Custom Order' },
                    { value: 'dueDate', label: 'Due Date' },
                    { value: 'priority', label: 'Priority' },
                    { value: 'createdAt', label: 'Created Date' },
                  ].map((option) => (
                    <div key={option.value} className="flex items-center space-x-2">
                      <Checkbox
                        id={option.value}
                        checked={sortBy === option.value}
                        onCheckedChange={() => handleSortChange(option.value)}
                      />
                      <Label htmlFor={option.value}>{option.label}</Label>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </SheetContent>
        </Sheet>

        {/* Bulk Select Toggle */}
        <Button variant={bulkMode ? 'default' : 'outline'} onClick={() => setBulkMode(!bulkMode)}>
          {bulkMode ? 'Exit' : 'Select'}
        </Button>
      </div>

      {/* Items List */}
      <div className="space-y-6">
        {/* Pending Items */}
        {pendingItems.length > 0 && (
          <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
            <SortableContext items={pendingItems.map((item) => item.id)} strategy={verticalListSortingStrategy}>
              <div className="space-y-2">
                {pendingItems.map((item) => (
                  <SortableTodoItem
                    key={item.id}
                    item={item}
                    onComplete={handleToggleComplete}
                    isSelected={selectedItemIds.has(item.id)}
                    onSelectionChange={bulkMode ? handleSelect : undefined}
                    bulkMode={bulkMode}
                  />
                ))}
              </div>
            </SortableContext>
          </DndContext>
        )}

        {/* Completed Items (if shown) */}
        {showCompleted && completedItems.length > 0 && (
          <div className="space-y-2">
            <h3 className="text-sm font-medium text-muted-foreground">Completed ({completedItems.length})</h3>
            <div className="space-y-2 opacity-60">
              {completedItems.map((item) => (
                <TodoItem
                  key={item.id}
                  item={item}
                  onToggle={handleToggleComplete}
                  isSelected={selectedItemIds.has(item.id)}
                  onSelect={bulkMode ? handleSelect : undefined}
                  viewMode="list"
                />
              ))}
            </div>
          </div>
        )}

        {/* Empty State */}
        {filteredItems.length === 0 && (
          <div className="text-center py-12">
            <p className="text-muted-foreground">
              {searchQuery ? 'No items match your search.' : 'No items yet. Add your first task above!'}
            </p>
          </div>
        )}
      </div>

      {/* Bulk Action Bar */}
      {bulkMode && selectedItemIds.size > 0 && (
        <BulkActionBar
          selectedCount={selectedItemIds.size}
          onComplete={handleBulkComplete}
          onDelete={handleBulkDelete}
          onCancel={() => {
            setSelectedItemIds(new Set());
            setBulkMode(false);
          }}
        />
      )}

      {/* Undo Toast */}
      {undoItemId && <UndoToast itemId={undoItemId} onUndo={handleUndo} onDismiss={() => setUndoItemId(null)} />}
    </div>
  );
}
