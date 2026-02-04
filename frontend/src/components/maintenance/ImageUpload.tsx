/**
 * Image Upload Component
 *
 * Reusable component for uploading single images.
 * Used for vehicle photos and note attachments.
 */

import { useState, useCallback } from 'react';
import { X, Loader2, Image as ImageIcon } from 'lucide-react';
import { Button } from '@/components/shadcn/button';
import { cn } from '@/lib/utils';

interface ImageUploadProps {
  value?: string;
  onChange: (url: string | undefined) => void;
  onUpload: (file: File) => Promise<string>;
  disabled?: boolean;
  className?: string;
  placeholder?: string;
}

const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB
const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];

export function ImageUpload({
  value,
  onChange,
  onUpload,
  disabled,
  className,
  placeholder = 'Upload image',
}: ImageUploadProps) {
  const [isUploading, setIsUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isDragOver, setIsDragOver] = useState(false);

  const validateFile = (file: File): string | null => {
    if (file.size > MAX_FILE_SIZE) {
      return `File size exceeds ${MAX_FILE_SIZE / (1024 * 1024)}MB limit`;
    }
    if (!ALLOWED_TYPES.includes(file.type)) {
      return 'Only JPEG, PNG, GIF, and WebP images are allowed';
    }
    return null;
  };

  const handleUpload = useCallback(
    async (file: File) => {
      const validationError = validateFile(file);
      if (validationError) {
        setError(validationError);
        return;
      }

      setError(null);
      setIsUploading(true);

      try {
        const url = await onUpload(file);
        onChange(url);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Upload failed');
      } finally {
        setIsUploading(false);
      }
    },
    [onUpload, onChange]
  );

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setIsDragOver(false);

      if (disabled || isUploading) return;

      const file = e.dataTransfer.files?.[0];
      if (file) {
        handleUpload(file);
      }
    },
    [disabled, isUploading, handleUpload]
  );

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    if (!disabled && !isUploading) {
      setIsDragOver(true);
    }
  };

  const handleDragLeave = () => {
    setIsDragOver(false);
  };

  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      handleUpload(file);
    }
    // Reset input so same file can be selected again
    e.target.value = '';
  };

  const handleRemove = () => {
    onChange(undefined);
    setError(null);
  };

  if (value) {
    return (
      <div className={cn('relative', className)}>
        <div className="relative aspect-video overflow-hidden rounded-lg border bg-muted">
          <img src={value} alt="Uploaded" className="h-full w-full object-cover" />
          {!disabled && (
            <Button
              type="button"
              variant="destructive"
              size="icon"
              className="absolute right-2 top-2 h-8 w-8"
              onClick={handleRemove}
            >
              <X className="h-4 w-4" />
            </Button>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className={className}>
      <div
        className={cn(
          'relative flex aspect-video cursor-pointer flex-col items-center justify-center rounded-lg border-2 border-dashed transition-colors',
          isDragOver ? 'border-primary bg-primary/5' : 'border-muted-foreground/25',
          disabled && 'cursor-not-allowed opacity-50'
        )}
        onDrop={handleDrop}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
      >
        {isUploading ? (
          <div className="flex flex-col items-center gap-2">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            <p className="text-sm text-muted-foreground">Uploading...</p>
          </div>
        ) : (
          <label className="flex cursor-pointer flex-col items-center gap-2">
            <input
              type="file"
              accept={ALLOWED_TYPES.join(',')}
              onChange={handleFileInput}
              disabled={disabled}
              className="hidden"
            />
            <ImageIcon className="h-8 w-8 text-muted-foreground" />
            <p className="text-sm text-muted-foreground">{placeholder}</p>
            <p className="text-xs text-muted-foreground">Drag & drop or click to browse</p>
          </label>
        )}
      </div>
      {error && <p className="mt-2 text-sm text-destructive">{error}</p>}
    </div>
  );
}
