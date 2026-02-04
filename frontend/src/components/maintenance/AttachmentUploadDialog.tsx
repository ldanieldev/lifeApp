/**
 * Attachment Upload Dialog Component
 *
 * Modal for uploading attachments to a service record.
 * Supports drag-and-drop and file picker.
 */

import { useState, useCallback } from 'react';
import { Upload, X, FileText, Image, Paperclip, Loader2 } from 'lucide-react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/shadcn/dialog';
import { Button } from '@/components/shadcn/button';
import { useUploadServiceRecordAttachment } from '@/hooks/useMaintenance';

interface AttachmentUploadDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  serviceRecordId: number;
}

const MAX_FILE_SIZE = 20 * 1024 * 1024; // 20MB
const ALLOWED_TYPES = [
  'image/jpeg',
  'image/png',
  'image/gif',
  'image/webp',
  'application/pdf',
  'text/plain',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
];

function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

function getFileIcon(contentType: string) {
  if (contentType.startsWith('image/')) {
    return Image;
  }
  if (contentType === 'application/pdf') {
    return FileText;
  }
  return Paperclip;
}

interface PendingFile {
  file: File;
  preview?: string;
  error?: string;
}

export function AttachmentUploadDialog({ open, onOpenChange, serviceRecordId }: AttachmentUploadDialogProps) {
  const [pendingFiles, setPendingFiles] = useState<PendingFile[]>([]);
  const [isDragOver, setIsDragOver] = useState(false);
  const uploadMutation = useUploadServiceRecordAttachment();

  const validateFile = (file: File): string | null => {
    if (file.size > MAX_FILE_SIZE) {
      return `File size exceeds ${MAX_FILE_SIZE / (1024 * 1024)}MB limit`;
    }
    if (!ALLOWED_TYPES.includes(file.type)) {
      return 'File type not supported';
    }
    return null;
  };

  const addFiles = useCallback((files: FileList | File[]) => {
    const newFiles: PendingFile[] = [];

    Array.from(files).forEach((file) => {
      const error = validateFile(file);
      const pendingFile: PendingFile = { file, error: error || undefined };

      // Create preview for images
      if (file.type.startsWith('image/') && !error) {
        pendingFile.preview = URL.createObjectURL(file);
      }

      newFiles.push(pendingFile);
    });

    setPendingFiles((prev) => [...prev, ...newFiles]);
  }, []);

  const removeFile = (index: number) => {
    setPendingFiles((prev) => {
      const file = prev[index];
      if (file.preview) {
        URL.revokeObjectURL(file.preview);
      }
      return prev.filter((_, i) => i !== index);
    });
  };

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setIsDragOver(false);
      if (e.dataTransfer.files) {
        addFiles(e.dataTransfer.files);
      }
    },
    [addFiles]
  );

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(true);
  };

  const handleDragLeave = () => {
    setIsDragOver(false);
  };

  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      addFiles(e.target.files);
    }
  };

  const handleUpload = async () => {
    const validFiles = pendingFiles.filter((pf) => !pf.error);

    for (const pendingFile of validFiles) {
      await uploadMutation.mutateAsync({
        serviceRecordId,
        file: pendingFile.file,
      });
    }

    // Clean up previews
    pendingFiles.forEach((pf) => {
      if (pf.preview) {
        URL.revokeObjectURL(pf.preview);
      }
    });

    setPendingFiles([]);
    onOpenChange(false);
  };

  const handleClose = () => {
    // Clean up previews
    pendingFiles.forEach((pf) => {
      if (pf.preview) {
        URL.revokeObjectURL(pf.preview);
      }
    });
    setPendingFiles([]);
    onOpenChange(false);
  };

  const validFileCount = pendingFiles.filter((pf) => !pf.error).length;

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Upload Attachments</DialogTitle>
          <DialogDescription>
            Add receipts, photos, or documents to this service record. Max 20MB per file.
          </DialogDescription>
        </DialogHeader>

        {/* Drop zone */}
        <div
          className={`relative rounded-lg border-2 border-dashed p-8 text-center transition-colors ${
            isDragOver ? 'border-primary bg-primary/5' : 'border-muted-foreground/25'
          }`}
          onDrop={handleDrop}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
        >
          <Upload className="mx-auto h-10 w-10 text-muted-foreground" />
          <p className="mt-2 text-sm text-muted-foreground">Drag and drop files here, or</p>
          <label>
            <input
              type="file"
              multiple
              accept={ALLOWED_TYPES.join(',')}
              onChange={handleFileInput}
              className="hidden"
            />
            <Button variant="link" className="mt-1" asChild>
              <span>browse files</span>
            </Button>
          </label>
          <p className="mt-2 text-xs text-muted-foreground">Supported: Images, PDF, Word documents</p>
        </div>

        {/* Pending files list */}
        {pendingFiles.length > 0 && (
          <div className="max-h-48 space-y-2 overflow-y-auto">
            {pendingFiles.map((pf, index) => {
              const FileIcon = getFileIcon(pf.file.type);
              return (
                <div
                  key={index}
                  className={`flex items-center gap-3 rounded-lg border p-2 ${
                    pf.error ? 'border-destructive bg-destructive/5' : ''
                  }`}
                >
                  {pf.preview ? (
                    <img src={pf.preview} alt={pf.file.name} className="h-10 w-10 rounded object-cover" />
                  ) : (
                    <div className="flex h-10 w-10 items-center justify-center rounded bg-muted">
                      <FileIcon className="h-5 w-5 text-muted-foreground" />
                    </div>
                  )}
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium">{pf.file.name}</p>
                    {pf.error ? (
                      <p className="text-xs text-destructive">{pf.error}</p>
                    ) : (
                      <p className="text-xs text-muted-foreground">{formatFileSize(pf.file.size)}</p>
                    )}
                  </div>
                  <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => removeFile(index)}>
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              );
            })}
          </div>
        )}

        {/* Actions */}
        <div className="flex justify-end gap-3">
          <Button variant="outline" onClick={handleClose}>
            Cancel
          </Button>
          <Button onClick={handleUpload} disabled={validFileCount === 0 || uploadMutation.isPending}>
            {uploadMutation.isPending ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Uploading...
              </>
            ) : (
              `Upload ${validFileCount > 0 ? `(${validFileCount})` : ''}`
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
