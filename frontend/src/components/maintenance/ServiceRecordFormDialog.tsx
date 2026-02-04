/**
 * Service Record Form Dialog Component
 *
 * Modal form for creating/editing service records with attachment support.
 */

import { useEffect, useState, useCallback } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { format } from 'date-fns';
import { CalendarIcon, Plus, X, Loader2, Paperclip, FileText, Image as ImageIcon } from 'lucide-react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/shadcn/dialog';
import { Button } from '@/components/shadcn/button';
import { Input } from '@/components/shadcn/input';
import { Label } from '@/components/shadcn/label';
import { Textarea } from '@/components/shadcn/textarea';
import { Calendar } from '@/components/shadcn/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/shadcn/popover';
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from '@/components/shadcn/select';
import {
  useCreateServiceRecord,
  useUpdateServiceRecord,
  useServiceTypes,
  useShops,
  useUploadServiceRecordAttachment,
  useDeleteServiceRecordAttachment,
  useServiceRecordAttachments,
} from '@/hooks/useMaintenance';
import { serviceRecordSchema, type ServiceRecordFormValues } from '@/lib/validations/maintenance';
import type {
  ServiceRecordDetail,
  CreateServiceRecordRequest,
  UpdateServiceRecordRequest,
  ServiceType,
  ServiceRecordAttachment,
} from '@/types/maintenance';
import { cn } from '@/lib/utils';
import { ServiceTypeFormDialog } from './ServiceTypeFormDialog';

interface PendingAttachment {
  id: string;
  file: File;
  preview?: string;
}

interface ServiceRecordFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  vehicleId: number;
  currentOdometer?: number;
  serviceRecord?: ServiceRecordDetail;
}

export function ServiceRecordFormDialog({
  open,
  onOpenChange,
  vehicleId,
  currentOdometer = 0,
  serviceRecord,
}: ServiceRecordFormDialogProps) {
  const isEdit = !!serviceRecord;
  const [serviceTypeDialogOpen, setServiceTypeDialogOpen] = useState(false);

  // For new service records, store files to upload after creation
  const [pendingAttachments, setPendingAttachments] = useState<PendingAttachment[]>([]);
  const [isUploadingAttachment, setIsUploadingAttachment] = useState(false);
  const [deletingAttachmentId, setDeletingAttachmentId] = useState<number | null>(null);

  const { data: serviceTypesData } = useServiceTypes();
  const { data: shopsData } = useShops();
  const { data: attachmentsData } = useServiceRecordAttachments(serviceRecord?.id ?? 0);
  const createMutation = useCreateServiceRecord();
  const updateMutation = useUpdateServiceRecord();
  const uploadAttachmentMutation = useUploadServiceRecordAttachment();
  const deleteAttachmentMutation = useDeleteServiceRecordAttachment();

  // Get existing attachments for edit mode
  const existingAttachments = attachmentsData?.results ?? [];

  // Separate system and custom service types for better organization
  const systemServiceTypes = serviceTypesData?.results.filter((t) => !t.isCustom) || [];
  const customServiceTypes = serviceTypesData?.results.filter((t) => t.isCustom) || [];

  const handleServiceTypeCreated = (newServiceType: ServiceType) => {
    // Select the newly created service type
    form.setValue('serviceTypeId', newServiceType.id);
  };

  const form = useForm<ServiceRecordFormValues>({
    resolver: zodResolver(serviceRecordSchema),
    defaultValues: {
      date: serviceRecord?.date ? new Date(serviceRecord.date) : new Date(),
      odometer: serviceRecord?.odometer ?? currentOdometer,
      serviceTypeId: serviceRecord?.serviceType?.id ?? 0,
      shopId: serviceRecord?.shop?.id ?? null,
      partsCost: serviceRecord?.partsCost ? parseFloat(serviceRecord.partsCost) : 0,
      laborCost: serviceRecord?.laborCost ? parseFloat(serviceRecord.laborCost) : 0,
      notes: serviceRecord?.notes ?? '',
    },
  });

  useEffect(() => {
    if (open) {
      form.reset({
        date: serviceRecord?.date ? new Date(serviceRecord.date) : new Date(),
        odometer: serviceRecord?.odometer ?? currentOdometer,
        serviceTypeId: serviceRecord?.serviceType?.id ?? 0,
        shopId: serviceRecord?.shop?.id ?? null,
        partsCost: serviceRecord?.partsCost ? parseFloat(serviceRecord.partsCost) : 0,
        laborCost: serviceRecord?.laborCost ? parseFloat(serviceRecord.laborCost) : 0,
        notes: serviceRecord?.notes ?? '',
      });
      // Clear pending attachments when dialog opens
      setPendingAttachments((prev) => {
        prev.forEach((att) => {
          if (att.preview) URL.revokeObjectURL(att.preview);
        });
        return [];
      });
    }
  }, [open, serviceRecord, currentOdometer, form]);

  // Cleanup preview URLs on unmount
  useEffect(() => {
    return () => {
      pendingAttachments.forEach((att) => {
        if (att.preview) URL.revokeObjectURL(att.preview);
      });
    };
  }, [pendingAttachments]);

  const cleanupPendingAttachments = useCallback(() => {
    pendingAttachments.forEach((att) => {
      if (att.preview) URL.revokeObjectURL(att.preview);
    });
    setPendingAttachments([]);
  }, [pendingAttachments]);

  const handleAttachmentSelect = useCallback(
    async (file: File) => {
      // Validate file size (10MB max)
      if (file.size > 10 * 1024 * 1024) {
        return;
      }

      if (isEdit && serviceRecord) {
        // For existing service records, upload immediately
        setIsUploadingAttachment(true);
        try {
          await uploadAttachmentMutation.mutateAsync({ serviceRecordId: serviceRecord.id, file });
        } finally {
          setIsUploadingAttachment(false);
        }
      } else {
        // For new service records, store for later upload
        const isImage = file.type.startsWith('image/');
        const attachment: PendingAttachment = {
          id: crypto.randomUUID(),
          file,
          preview: isImage ? URL.createObjectURL(file) : undefined,
        };
        setPendingAttachments((prev) => [...prev, attachment]);
      }
    },
    [isEdit, serviceRecord, uploadAttachmentMutation]
  );

  const handleRemovePendingAttachment = useCallback((id: string) => {
    setPendingAttachments((prev) => {
      const att = prev.find((a) => a.id === id);
      if (att?.preview) URL.revokeObjectURL(att.preview);
      return prev.filter((a) => a.id !== id);
    });
  }, []);

  const handleDeleteExistingAttachment = useCallback(
    async (attachmentId: number) => {
      if (!serviceRecord) return;
      setDeletingAttachmentId(attachmentId);
      try {
        await deleteAttachmentMutation.mutateAsync({ serviceRecordId: serviceRecord.id, attachmentId });
      } finally {
        setDeletingAttachmentId(null);
      }
    },
    [serviceRecord, deleteAttachmentMutation]
  );

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  const onSubmit = async (data: ServiceRecordFormValues) => {
    if (isEdit) {
      const payload: UpdateServiceRecordRequest = {
        vehicle: vehicleId,
        serviceType: data.serviceTypeId,
        shop: data.shopId,
        date: format(data.date, 'yyyy-MM-dd'),
        odometer: data.odometer,
        partsCost: data.partsCost.toFixed(2),
        laborCost: data.laborCost.toFixed(2),
        notes: data.notes,
      };
      updateMutation.mutate(
        { id: serviceRecord.id, data: payload },
        {
          onSuccess: () => {
            onOpenChange(false);
            form.reset();
          },
        }
      );
    } else {
      const payload: CreateServiceRecordRequest = {
        vehicle: vehicleId,
        serviceType: data.serviceTypeId,
        shop: data.shopId,
        date: format(data.date, 'yyyy-MM-dd'),
        odometer: data.odometer,
        partsCost: data.partsCost.toFixed(2),
        laborCost: data.laborCost.toFixed(2),
        notes: data.notes,
      };
      createMutation.mutate(payload, {
        onSuccess: async (newRecord) => {
          // Upload pending attachments if any
          if (pendingAttachments.length > 0 && newRecord.id) {
            for (const att of pendingAttachments) {
              try {
                await uploadAttachmentMutation.mutateAsync({ serviceRecordId: newRecord.id, file: att.file });
              } catch {
                // Attachment upload failed but record was created
              }
            }
          }
          onOpenChange(false);
          form.reset();
          cleanupPendingAttachments();
        },
      });
    }
  };

  const handleOpenChange = (newOpen: boolean) => {
    onOpenChange(newOpen);
    if (!newOpen) {
      form.reset();
      cleanupPendingAttachments();
    }
  };

  const isAttachmentLoading = isUploadingAttachment || uploadAttachmentMutation.isPending;

  const selectedDate = form.watch('date');

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle>{isEdit ? 'Edit Service Record' : 'Add Service Record'}</DialogTitle>
          <DialogDescription>
            {isEdit ? 'Update the service record details.' : 'Log a new service or maintenance.'}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
          {/* Date and Odometer Row */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>
                Date <span className="text-destructive">*</span>
              </Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={cn(
                      'w-full justify-start text-left font-normal',
                      !selectedDate && 'text-muted-foreground'
                    )}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {selectedDate ? format(selectedDate, 'PPP') : 'Pick a date'}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={selectedDate}
                    onSelect={(date: Date | undefined) => date && form.setValue('date', date)}
                    initialFocus
                  />
                </PopoverContent>
              </Popover>
              {form.formState.errors.date && (
                <p className="text-sm text-destructive">{form.formState.errors.date.message}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="odometer">
                Odometer (miles) <span className="text-destructive">*</span>
              </Label>
              <Input
                id="odometer"
                type="number"
                {...form.register('odometer', { valueAsNumber: true })}
                placeholder="0"
              />
              {form.formState.errors.odometer && (
                <p className="text-sm text-destructive">{form.formState.errors.odometer.message}</p>
              )}
            </div>
          </div>

          {/* Service Type */}
          <div className="space-y-2">
            <Label>
              Service Type <span className="text-destructive">*</span>
            </Label>
            <div className="flex gap-2">
              <Select
                value={form.watch('serviceTypeId')?.toString() || ''}
                onValueChange={(value) => form.setValue('serviceTypeId', parseInt(value, 10))}
              >
                <SelectTrigger className="flex-1">
                  <SelectValue placeholder="Select a service type" />
                </SelectTrigger>
                <SelectContent>
                  {/* System/Predefined Service Types */}
                  {systemServiceTypes.length > 0 && (
                    <SelectGroup>
                      <SelectLabel>Common Services</SelectLabel>
                      {systemServiceTypes.map((type) => (
                        <SelectItem key={type.id} value={type.id.toString()}>
                          {type.name}
                        </SelectItem>
                      ))}
                    </SelectGroup>
                  )}
                  {/* Custom Service Types */}
                  {customServiceTypes.length > 0 && (
                    <SelectGroup>
                      <SelectLabel>My Custom Types</SelectLabel>
                      {customServiceTypes.map((type) => (
                        <SelectItem key={type.id} value={type.id.toString()}>
                          {type.name}
                        </SelectItem>
                      ))}
                    </SelectGroup>
                  )}
                </SelectContent>
              </Select>
              <Button
                type="button"
                variant="outline"
                size="icon"
                onClick={() => setServiceTypeDialogOpen(true)}
                title="Add custom service type"
              >
                <Plus className="h-4 w-4" />
              </Button>
            </div>
            {form.formState.errors.serviceTypeId && (
              <p className="text-sm text-destructive">{form.formState.errors.serviceTypeId.message}</p>
            )}
          </div>

          {/* Shop */}
          <div className="space-y-2">
            <Label>Shop/Location</Label>
            <Select
              value={form.watch('shopId')?.toString() || 'none'}
              onValueChange={(value) => form.setValue('shopId', value === 'none' ? null : parseInt(value, 10))}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select a shop (optional)" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">No shop / DIY</SelectItem>
                {shopsData?.results.map((shop) => (
                  <SelectItem key={shop.id} value={shop.id.toString()}>
                    {shop.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Parts and Labor Cost Row */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="partsCost">Parts Cost ($)</Label>
              <Input
                id="partsCost"
                type="number"
                step="0.01"
                {...form.register('partsCost', { valueAsNumber: true })}
                placeholder="0.00"
              />
              {form.formState.errors.partsCost && (
                <p className="text-sm text-destructive">{form.formState.errors.partsCost.message}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="laborCost">Labor Cost ($)</Label>
              <Input
                id="laborCost"
                type="number"
                step="0.01"
                {...form.register('laborCost', { valueAsNumber: true })}
                placeholder="0.00"
              />
              {form.formState.errors.laborCost && (
                <p className="text-sm text-destructive">{form.formState.errors.laborCost.message}</p>
              )}
            </div>
          </div>

          {/* Notes */}
          <div className="space-y-2">
            <Label htmlFor="notes">Notes</Label>
            <Textarea
              id="notes"
              {...form.register('notes')}
              placeholder="Additional details about the service..."
              rows={3}
            />
            {form.formState.errors.notes && (
              <p className="text-sm text-destructive">{form.formState.errors.notes.message}</p>
            )}
          </div>

          {/* Attachments */}
          <div className="space-y-2">
            <Label>Attachments</Label>
            <div className="space-y-2">
              {/* Existing attachments (edit mode) */}
              {isEdit &&
                existingAttachments.map((att: ServiceRecordAttachment) => (
                  <div key={att.id} className="flex items-center gap-2 rounded-lg border bg-muted/50 p-2">
                    {att.contentType.startsWith('image/') ? (
                      <ImageIcon className="h-4 w-4 text-muted-foreground" />
                    ) : (
                      <FileText className="h-4 w-4 text-muted-foreground" />
                    )}
                    <a
                      href={att.fileUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex-1 truncate text-sm hover:underline"
                    >
                      {att.fileName}
                    </a>
                    <span className="text-xs text-muted-foreground">{formatFileSize(att.fileSize)}</span>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="h-6 w-6"
                      onClick={() => handleDeleteExistingAttachment(att.id)}
                      disabled={deletingAttachmentId === att.id}
                    >
                      {deletingAttachmentId === att.id ? (
                        <Loader2 className="h-3 w-3 animate-spin" />
                      ) : (
                        <X className="h-3 w-3" />
                      )}
                    </Button>
                  </div>
                ))}

              {/* Pending attachments (create mode) */}
              {pendingAttachments.map((att) => (
                <div key={att.id} className="flex items-center gap-2 rounded-lg border bg-muted/50 p-2">
                  {att.file.type.startsWith('image/') ? (
                    <ImageIcon className="h-4 w-4 text-muted-foreground" />
                  ) : (
                    <FileText className="h-4 w-4 text-muted-foreground" />
                  )}
                  <span className="flex-1 truncate text-sm">{att.file.name}</span>
                  <span className="text-xs text-muted-foreground">{formatFileSize(att.file.size)}</span>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="h-6 w-6"
                    onClick={() => handleRemovePendingAttachment(att.id)}
                  >
                    <X className="h-3 w-3" />
                  </Button>
                </div>
              ))}

              {/* Add attachment button */}
              <label
                className={cn(
                  'flex cursor-pointer items-center justify-center gap-2 rounded-lg border-2 border-dashed p-3 text-sm text-muted-foreground transition-colors hover:border-primary/50',
                  isAttachmentLoading && 'pointer-events-none opacity-50'
                )}
              >
                <input
                  type="file"
                  accept="image/*,.pdf,.doc,.docx,.txt"
                  className="hidden"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) handleAttachmentSelect(file);
                    e.target.value = '';
                  }}
                  disabled={isAttachmentLoading}
                />
                {isAttachmentLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Paperclip className="h-4 w-4" />}
                <span>Add receipt, invoice, or photo</span>
              </label>
            </div>
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
                  : 'Add Record'}
            </Button>
          </div>
        </form>
      </DialogContent>

      {/* Custom Service Type Dialog */}
      <ServiceTypeFormDialog
        open={serviceTypeDialogOpen}
        onOpenChange={setServiceTypeDialogOpen}
        onSuccess={handleServiceTypeCreated}
      />
    </Dialog>
  );
}
