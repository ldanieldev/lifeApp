/**
 * Note Form Dialog Component
 *
 * Modal form for creating/editing vehicle notes with optional image attachment.
 */

import { useEffect, useState, useCallback } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { X, Loader2, ImageIcon } from 'lucide-react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/shadcn/dialog';
import { Button } from '@/components/shadcn/button';
import { Input } from '@/components/shadcn/input';
import { Label } from '@/components/shadcn/label';
import { Textarea } from '@/components/shadcn/textarea';
import { useCreateNote, useUpdateNote, useUploadNoteImage, useDeleteNoteImage } from '@/hooks/useMaintenance';
import { noteSchema, type NoteFormValues } from '@/lib/validations/maintenance';
import type { Note, CreateNoteRequest, UpdateNoteRequest } from '@/types/maintenance';
import { cn } from '@/lib/utils';

interface NoteFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  vehicleId: number;
  currentOdometer?: number;
  note?: Note;
}

export function NoteFormDialog({ open, onOpenChange, vehicleId, currentOdometer, note }: NoteFormDialogProps) {
  const isEdit = !!note;

  // For new notes, store file to upload after creation
  const [pendingImage, setPendingImage] = useState<File | null>(null);
  const [pendingImagePreview, setPendingImagePreview] = useState<string | null>(null);
  const [isUploadingImage, setIsUploadingImage] = useState(false);

  const createMutation = useCreateNote();
  const updateMutation = useUpdateNote();
  const uploadImageMutation = useUploadNoteImage();
  const deleteImageMutation = useDeleteNoteImage();

  const form = useForm<NoteFormValues>({
    resolver: zodResolver(noteSchema),
    defaultValues: {
      content: note?.content ?? '',
      odometer: note?.odometer ?? currentOdometer ?? null,
    },
  });

  useEffect(() => {
    if (open) {
      form.reset({
        content: note?.content ?? '',
        odometer: note?.odometer ?? currentOdometer ?? null,
      });
      // Clear pending image when dialog opens
      setPendingImage(null);
      setPendingImagePreview(null);
    }
  }, [open, note, currentOdometer, form]);

  // Cleanup preview URL on unmount
  useEffect(() => {
    return () => {
      if (pendingImagePreview) {
        URL.revokeObjectURL(pendingImagePreview);
      }
    };
  }, [pendingImagePreview]);

  const handleImageSelect = useCallback(
    async (file: File) => {
      // Validate file
      const allowedTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
      if (!allowedTypes.includes(file.type)) {
        return;
      }
      if (file.size > 10 * 1024 * 1024) {
        return;
      }

      if (isEdit && note) {
        // For existing notes, upload immediately
        setIsUploadingImage(true);
        try {
          await uploadImageMutation.mutateAsync({ id: note.id, file });
        } finally {
          setIsUploadingImage(false);
        }
      } else {
        // For new notes, store for later upload
        if (pendingImagePreview) {
          URL.revokeObjectURL(pendingImagePreview);
        }
        setPendingImage(file);
        setPendingImagePreview(URL.createObjectURL(file));
      }
    },
    [isEdit, note, uploadImageMutation, pendingImagePreview]
  );

  const handleRemoveImage = useCallback(async () => {
    if (isEdit && note?.imageUrl) {
      deleteImageMutation.mutate(note.id);
    } else if (pendingImagePreview) {
      URL.revokeObjectURL(pendingImagePreview);
      setPendingImage(null);
      setPendingImagePreview(null);
    }
  }, [isEdit, note, deleteImageMutation, pendingImagePreview]);

  const onSubmit = async (data: NoteFormValues) => {
    if (isEdit) {
      const payload: UpdateNoteRequest = {
        vehicle: vehicleId,
        content: data.content,
        odometer: data.odometer,
      };
      updateMutation.mutate(
        { id: note.id, data: payload },
        {
          onSuccess: () => {
            onOpenChange(false);
            form.reset();
          },
        }
      );
    } else {
      const payload: CreateNoteRequest = {
        vehicle: vehicleId,
        content: data.content,
        odometer: data.odometer,
      };
      createMutation.mutate(payload, {
        onSuccess: async (newNote) => {
          // Upload pending image if any
          if (pendingImage && newNote.id) {
            try {
              await uploadImageMutation.mutateAsync({ id: newNote.id, file: pendingImage });
            } catch {
              // Image upload failed but note was created
            }
          }
          onOpenChange(false);
          form.reset();
          setPendingImage(null);
          if (pendingImagePreview) {
            URL.revokeObjectURL(pendingImagePreview);
            setPendingImagePreview(null);
          }
        },
      });
    }
  };

  const handleOpenChange = (newOpen: boolean) => {
    onOpenChange(newOpen);
    if (!newOpen) {
      form.reset();
      if (pendingImagePreview) {
        URL.revokeObjectURL(pendingImagePreview);
      }
      setPendingImage(null);
      setPendingImagePreview(null);
    }
  };

  // Determine current image to display
  const currentImageUrl = isEdit ? note?.imageUrl : pendingImagePreview;
  const isImageLoading = isUploadingImage || uploadImageMutation.isPending || deleteImageMutation.isPending;

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>{isEdit ? 'Edit Note' : 'Add Note'}</DialogTitle>
          <DialogDescription>{isEdit ? 'Update your note.' : 'Add a note to your vehicle journal.'}</DialogDescription>
        </DialogHeader>

        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
          {/* Image Upload */}
          <div className="space-y-2">
            <Label>Image (optional)</Label>
            {currentImageUrl ? (
              <div className="relative aspect-video max-h-[200px] w-full overflow-hidden rounded-lg border bg-muted">
                <img src={currentImageUrl} alt="Note" className="h-full w-full object-cover" />
                <Button
                  type="button"
                  variant="destructive"
                  size="icon"
                  className="absolute right-2 top-2 h-7 w-7"
                  onClick={handleRemoveImage}
                  disabled={isImageLoading}
                >
                  {isImageLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <X className="h-4 w-4" />}
                </Button>
              </div>
            ) : (
              <label
                className={cn(
                  'flex aspect-video max-h-[200px] w-full cursor-pointer flex-col items-center justify-center rounded-lg border-2 border-dashed transition-colors hover:border-primary/50',
                  isImageLoading && 'pointer-events-none opacity-50'
                )}
              >
                <input
                  type="file"
                  accept="image/jpeg,image/png,image/gif,image/webp"
                  className="hidden"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) handleImageSelect(file);
                    e.target.value = '';
                  }}
                  disabled={isImageLoading}
                />
                {isImageLoading ? (
                  <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                ) : (
                  <>
                    <ImageIcon className="h-8 w-8 text-muted-foreground" />
                    <span className="mt-2 text-xs text-muted-foreground">Click to upload</span>
                  </>
                )}
              </label>
            )}
          </div>

          {/* Content */}
          <div className="space-y-2">
            <Label htmlFor="content">
              Note <span className="text-destructive">*</span>
            </Label>
            <Textarea id="content" {...form.register('content')} placeholder="Write your note here..." rows={5} />
            {form.formState.errors.content && (
              <p className="text-sm text-destructive">{form.formState.errors.content.message}</p>
            )}
          </div>

          {/* Odometer */}
          <div className="space-y-2">
            <Label htmlFor="odometer">Odometer (miles, optional)</Label>
            <Input
              id="odometer"
              type="number"
              {...form.register('odometer', {
                setValueAs: (v) => (v === '' || v === null ? null : parseInt(v, 10)),
              })}
              placeholder="Current mileage"
            />
            {form.formState.errors.odometer && (
              <p className="text-sm text-destructive">{form.formState.errors.odometer.message}</p>
            )}
          </div>

          {/* Actions */}
          <div className="flex justify-end gap-3">
            <Button type="button" variant="outline" onClick={() => handleOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={createMutation.isPending || updateMutation.isPending}>
              {createMutation.isPending || updateMutation.isPending
                ? 'Saving...'
                : isEdit
                  ? 'Save Changes'
                  : 'Add Note'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
