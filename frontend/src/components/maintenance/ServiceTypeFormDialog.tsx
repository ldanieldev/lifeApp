/**
 * Service Type Form Dialog Component
 *
 * Modal form for creating/editing custom service types.
 */

import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/shadcn/dialog';
import { Button } from '@/components/shadcn/button';
import { Input } from '@/components/shadcn/input';
import { Label } from '@/components/shadcn/label';
import { Textarea } from '@/components/shadcn/textarea';
import { useCreateServiceType, useUpdateServiceType } from '@/hooks/useMaintenance';
import { serviceTypeSchema, type ServiceTypeFormValues } from '@/lib/validations/maintenance';
import type { ServiceType } from '@/types/maintenance';

interface ServiceTypeFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  serviceType?: ServiceType;
  onSuccess?: (serviceType: ServiceType) => void;
}

export function ServiceTypeFormDialog({ open, onOpenChange, serviceType, onSuccess }: ServiceTypeFormDialogProps) {
  const isEdit = !!serviceType;

  const createMutation = useCreateServiceType();
  const updateMutation = useUpdateServiceType();

  const form = useForm<ServiceTypeFormValues>({
    resolver: zodResolver(serviceTypeSchema),
    defaultValues: {
      name: serviceType?.name || '',
      description: serviceType?.description || '',
    },
  });

  useEffect(() => {
    if (open) {
      form.reset({
        name: serviceType?.name || '',
        description: serviceType?.description || '',
      });
    }
  }, [open, serviceType, form]);

  const onSubmit = async (data: ServiceTypeFormValues) => {
    if (isEdit && serviceType) {
      updateMutation.mutate(
        { id: serviceType.id, data },
        {
          onSuccess: (updated) => {
            onOpenChange(false);
            form.reset();
            onSuccess?.(updated);
          },
        }
      );
    } else {
      createMutation.mutate(data, {
        onSuccess: (created) => {
          onOpenChange(false);
          form.reset();
          onSuccess?.(created);
        },
      });
    }
  };

  const handleOpenChange = (newOpen: boolean) => {
    onOpenChange(newOpen);
    if (!newOpen) {
      form.reset();
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>{isEdit ? 'Edit Service Type' : 'Add Custom Service Type'}</DialogTitle>
          <DialogDescription>
            {isEdit
              ? 'Update the service type details.'
              : 'Create a custom service type for services not in the predefined list.'}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="name">
              Name <span className="text-destructive">*</span>
            </Label>
            <Input id="name" {...form.register('name')} placeholder="e.g., Windshield Repair, Replace Alternator" />
            {form.formState.errors.name && (
              <p className="text-sm text-destructive">{form.formState.errors.name.message}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              {...form.register('description')}
              placeholder="Optional description of this service type..."
              rows={3}
            />
            {form.formState.errors.description && (
              <p className="text-sm text-destructive">{form.formState.errors.description.message}</p>
            )}
          </div>

          <div className="flex justify-end gap-3 pt-2">
            <Button type="button" variant="outline" onClick={() => handleOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={createMutation.isPending || updateMutation.isPending}>
              {createMutation.isPending || updateMutation.isPending ? 'Saving...' : isEdit ? 'Save Changes' : 'Create'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
