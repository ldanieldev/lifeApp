/**
 * Undo Toast Component
 *
 * Toast notification with undo button for recently completed items.
 */

import { useEffect } from 'react';
import { Undo2 } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/shadcn/button';
import { useTodoItem } from '@/hooks/useTodos';

interface UndoToastProps {
  itemId: number;
  onUndo: () => void;
  onDismiss: () => void;
}

export function UndoToast({ itemId, onUndo, onDismiss }: UndoToastProps) {
  const { data: item } = useTodoItem(itemId);

  useEffect(() => {
    if (item) {
      const toastId = toast.success(`Completed: ${item.title}`, {
        action: {
          label: 'Undo',
          onClick: onUndo,
        },
        duration: 5000,
        onDismiss: onDismiss,
        onAutoClose: onDismiss,
      });

      return () => {
        toast.dismiss(toastId);
      };
    }
  }, [item, onUndo, onDismiss]);

  return null;
}
