/**
 * Bulk Action Bar Component
 *
 * Fixed bottom bar for bulk operations on selected items.
 */

import { CheckCircle2, Trash2, X } from 'lucide-react';
import { Button } from '@/components/shadcn/button';
import { Card } from '@/components/shadcn/card';

interface BulkActionBarProps {
  selectedCount: number;
  onComplete?: () => void;
  onDelete?: () => void;
  onCancel?: () => void;
}

export function BulkActionBar({ selectedCount, onComplete, onDelete, onCancel }: BulkActionBarProps) {
  return (
    <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 animate-in slide-in-from-bottom-4">
      <Card className="shadow-lg">
        <div className="flex items-center gap-4 p-4">
          <span className="text-sm font-medium">
            {selectedCount} item{selectedCount !== 1 ? 's' : ''} selected
          </span>

          <div className="flex gap-2">
            {onComplete && (
              <Button onClick={onComplete} size="sm" variant="default">
                <CheckCircle2 className="h-4 w-4 mr-2" />
                Complete
              </Button>
            )}

            {onDelete && (
              <Button onClick={onDelete} size="sm" variant="destructive">
                <Trash2 className="h-4 w-4 mr-2" />
                Delete
              </Button>
            )}

            {onCancel && (
              <Button onClick={onCancel} size="sm" variant="outline">
                <X className="h-4 w-4 mr-2" />
                Cancel
              </Button>
            )}
          </div>
        </div>
      </Card>
    </div>
  );
}
