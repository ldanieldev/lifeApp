/**
 * Attachment List Component
 *
 * Displays and manages attachments for a service record.
 * Supports viewing, downloading, and deleting attachments.
 */

import { useState } from 'react';
import { FileText, Image, Paperclip, Trash2, ExternalLink, Upload } from 'lucide-react';
import { Button } from '@/components/shadcn/button';
import { Card, CardContent } from '@/components/shadcn/card';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/shadcn/alert-dialog';
import { useServiceRecordAttachments, useDeleteServiceRecordAttachment } from '@/hooks/useMaintenance';
import type { ServiceRecordAttachment } from '@/types/maintenance';

interface AttachmentListProps {
  serviceRecordId: number;
  onAddAttachment?: () => void;
  readonly?: boolean;
}

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

function AttachmentItem({
  attachment,
  serviceRecordId,
  readonly,
}: {
  attachment: ServiceRecordAttachment;
  serviceRecordId: number;
  readonly?: boolean;
}) {
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const deleteMutation = useDeleteServiceRecordAttachment();

  const FileIcon = getFileIcon(attachment.contentType);
  const isImage = attachment.contentType.startsWith('image/');

  const handleDelete = () => {
    deleteMutation.mutate(
      { serviceRecordId, attachmentId: attachment.id },
      {
        onSuccess: () => setDeleteDialogOpen(false),
      }
    );
  };

  return (
    <>
      <div className="flex items-center gap-3 rounded-lg border p-3">
        {isImage ? (
          <div className="h-12 w-12 flex-shrink-0 overflow-hidden rounded bg-muted">
            <img src={attachment.fileUrl} alt={attachment.fileName} className="h-full w-full object-cover" />
          </div>
        ) : (
          <div className="flex h-12 w-12 flex-shrink-0 items-center justify-center rounded bg-muted">
            <FileIcon className="h-6 w-6 text-muted-foreground" />
          </div>
        )}

        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-medium">{attachment.fileName}</p>
          <p className="text-xs text-muted-foreground">{formatFileSize(attachment.fileSize)}</p>
        </div>

        <div className="flex items-center gap-1">
          <Button variant="ghost" size="icon" asChild className="h-8 w-8">
            <a href={attachment.fileUrl} target="_blank" rel="noopener noreferrer" title="Open file">
              <ExternalLink className="h-4 w-4" />
            </a>
          </Button>
          {!readonly && (
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 text-destructive hover:text-destructive"
              onClick={() => setDeleteDialogOpen(true)}
              title="Delete attachment"
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          )}
        </div>
      </div>

      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Attachment</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete "{attachment.fileName}"? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {deleteMutation.isPending ? 'Deleting...' : 'Delete'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}

export function AttachmentList({ serviceRecordId, onAddAttachment, readonly }: AttachmentListProps) {
  const { data, isLoading } = useServiceRecordAttachments(serviceRecordId);

  if (isLoading) {
    return (
      <div className="space-y-2">
        <div className="h-[72px] animate-pulse rounded-lg bg-muted" />
        <div className="h-[72px] animate-pulse rounded-lg bg-muted" />
      </div>
    );
  }

  const attachments = data?.results || [];

  if (attachments.length === 0 && !onAddAttachment) {
    return null;
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h4 className="text-sm font-medium">Attachments {attachments.length > 0 && `(${attachments.length})`}</h4>
        {onAddAttachment && !readonly && (
          <Button variant="outline" size="sm" onClick={onAddAttachment}>
            <Upload className="mr-2 h-4 w-4" />
            Add File
          </Button>
        )}
      </div>

      {attachments.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-6 text-center">
            <Paperclip className="mb-2 h-8 w-8 text-muted-foreground" />
            <p className="text-sm text-muted-foreground">No attachments yet</p>
            {onAddAttachment && !readonly && (
              <Button variant="link" size="sm" onClick={onAddAttachment} className="mt-2">
                Add your first attachment
              </Button>
            )}
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-2">
          {attachments.map((attachment) => (
            <AttachmentItem
              key={attachment.id}
              attachment={attachment}
              serviceRecordId={serviceRecordId}
              readonly={readonly}
            />
          ))}
        </div>
      )}
    </div>
  );
}
