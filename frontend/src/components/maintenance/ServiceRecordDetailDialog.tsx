/**
 * Service Record Detail Dialog Component
 *
 * Modal for viewing service record details including attachments.
 * Allows managing attachments (upload/delete).
 */

import { useState } from 'react';
import { format } from 'date-fns';
import { Wrench, MapPin, DollarSign, Calendar, Gauge } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/shadcn/dialog';
import { Badge } from '@/components/shadcn/badge';
import { Separator } from '@/components/shadcn/separator';
import { Skeleton } from '@/components/shadcn/skeleton';
import { useServiceRecord } from '@/hooks/useMaintenance';
import { AttachmentList } from './AttachmentList';
import { AttachmentUploadDialog } from './AttachmentUploadDialog';

interface ServiceRecordDetailDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  serviceRecordId: number | null;
}

export function ServiceRecordDetailDialog({ open, onOpenChange, serviceRecordId }: ServiceRecordDetailDialogProps) {
  const [uploadDialogOpen, setUploadDialogOpen] = useState(false);
  const { data: record, isLoading } = useServiceRecord(serviceRecordId ?? 0);

  if (!serviceRecordId) return null;

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="sm:max-w-[600px]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Wrench className="h-5 w-5" />
              Service Record Details
            </DialogTitle>
          </DialogHeader>

          {isLoading ? (
            <div className="space-y-4">
              <Skeleton className="h-6 w-48" />
              <Skeleton className="h-4 w-32" />
              <Skeleton className="h-20 w-full" />
            </div>
          ) : record ? (
            <div className="space-y-6">
              {/* Header info */}
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <h3 className="text-lg font-semibold">{record.serviceType.name}</h3>
                  {record.isDiy && (
                    <Badge variant="secondary" className="text-xs">
                      DIY
                    </Badge>
                  )}
                </div>

                <div className="flex flex-wrap gap-4 text-sm text-muted-foreground">
                  <div className="flex items-center gap-1">
                    <Calendar className="h-4 w-4" />
                    <span>{format(new Date(record.date), 'PPP')}</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <Gauge className="h-4 w-4" />
                    <span>{record.odometer.toLocaleString()} mi</span>
                  </div>
                  {record.shop && (
                    <div className="flex items-center gap-1">
                      <MapPin className="h-4 w-4" />
                      <span>{record.shop.name}</span>
                    </div>
                  )}
                </div>
              </div>

              <Separator />

              {/* Costs */}
              <div className="grid grid-cols-3 gap-4">
                <div className="space-y-1">
                  <p className="text-sm text-muted-foreground">Parts</p>
                  <p className="flex items-center gap-1 font-medium">
                    <DollarSign className="h-4 w-4 text-muted-foreground" />
                    {parseFloat(record.partsCost).toFixed(2)}
                  </p>
                </div>
                <div className="space-y-1">
                  <p className="text-sm text-muted-foreground">Labor</p>
                  <p className="flex items-center gap-1 font-medium">
                    <DollarSign className="h-4 w-4 text-muted-foreground" />
                    {parseFloat(record.laborCost).toFixed(2)}
                  </p>
                </div>
                <div className="space-y-1">
                  <p className="text-sm text-muted-foreground">Total</p>
                  <p className="flex items-center gap-1 font-semibold text-primary">
                    <DollarSign className="h-4 w-4" />
                    {parseFloat(record.totalCost).toFixed(2)}
                  </p>
                </div>
              </div>

              {/* Notes */}
              {record.notes && (
                <>
                  <Separator />
                  <div className="space-y-2">
                    <h4 className="text-sm font-medium">Notes</h4>
                    <p className="whitespace-pre-wrap text-sm text-muted-foreground">{record.notes}</p>
                  </div>
                </>
              )}

              <Separator />

              {/* Attachments */}
              <AttachmentList serviceRecordId={serviceRecordId} onAddAttachment={() => setUploadDialogOpen(true)} />
            </div>
          ) : (
            <p className="text-center text-muted-foreground">Service record not found</p>
          )}
        </DialogContent>
      </Dialog>

      {/* Upload Dialog */}
      <AttachmentUploadDialog
        open={uploadDialogOpen}
        onOpenChange={setUploadDialogOpen}
        serviceRecordId={serviceRecordId}
      />
    </>
  );
}
