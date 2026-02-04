/**
 * Note List Component
 *
 * Displays a list of notes for a vehicle (journal).
 */

import { useState } from 'react';
import { Plus, BookOpen } from 'lucide-react';
import { Button } from '@/components/shadcn/button';
import { Skeleton } from '@/components/shadcn/skeleton';
import { NoteCard } from './NoteCard';
import { NoteFormDialog } from './NoteFormDialog';
import { useNotes, useNote, useDeleteNote } from '@/hooks/useMaintenance';

interface NoteListProps {
  vehicleId: number;
  currentOdometer?: number;
}

export function NoteList({ vehicleId, currentOdometer }: NoteListProps) {
  const [formDialogOpen, setFormDialogOpen] = useState(false);
  const [editingNoteId, setEditingNoteId] = useState<number | null>(null);

  const { data, isLoading, error } = useNotes({ vehicle: vehicleId });
  const { data: editingNote } = useNote(editingNoteId ?? 0);
  const deleteMutation = useDeleteNote();

  const handleEdit = (noteId: number) => {
    setEditingNoteId(noteId);
    setFormDialogOpen(true);
  };

  const handleDelete = (noteId: number) => {
    if (confirm('Are you sure you want to delete this note?')) {
      deleteMutation.mutate(noteId);
    }
  };

  const handleFormClose = (open: boolean) => {
    setFormDialogOpen(open);
    if (!open) {
      setEditingNoteId(null);
    }
  };

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center py-8 text-center">
        <p className="text-destructive">Failed to load notes</p>
        <p className="text-sm text-muted-foreground">{error.message}</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold">Vehicle Journal</h3>
          <p className="text-sm text-muted-foreground">
            {data?.count ?? 0} note{data?.count !== 1 ? 's' : ''}
          </p>
        </div>
        <Button onClick={() => setFormDialogOpen(true)} size="sm">
          <Plus className="mr-2 h-4 w-4" />
          Add Note
        </Button>
      </div>

      {/* Notes List */}
      {isLoading ? (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-[80px] rounded-lg" />
          ))}
        </div>
      ) : data?.results.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-8 text-center">
          <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-muted">
            <BookOpen className="h-6 w-6 text-muted-foreground" />
          </div>
          <h4 className="font-semibold">No notes yet</h4>
          <p className="mb-4 text-sm text-muted-foreground">Keep a journal of your vehicle's history</p>
          <Button onClick={() => setFormDialogOpen(true)} size="sm">
            <Plus className="mr-2 h-4 w-4" />
            Add First Note
          </Button>
        </div>
      ) : (
        <div className="space-y-3">
          {data?.results.map((note) => (
            <NoteCard key={note.id} note={note} onEdit={handleEdit} onDelete={handleDelete} />
          ))}
        </div>
      )}

      {/* Form Dialog */}
      <NoteFormDialog
        open={formDialogOpen}
        onOpenChange={handleFormClose}
        vehicleId={vehicleId}
        currentOdometer={currentOdometer}
        note={editingNote}
      />
    </div>
  );
}
