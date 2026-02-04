/**
 * Reminder Form Dialog Component
 *
 * Modal form for creating/editing maintenance reminders.
 */

import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/shadcn/dialog';
import { Button } from '@/components/shadcn/button';
import { Input } from '@/components/shadcn/input';
import { Label } from '@/components/shadcn/label';
import { Textarea } from '@/components/shadcn/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/shadcn/select';
import { useCreateReminder, useUpdateReminder, useServiceTypes } from '@/hooks/useMaintenance';
import { reminderSchema, type ReminderFormValues } from '@/lib/validations/maintenance';
import type { ReminderDetail, CreateReminderRequest, UpdateReminderRequest } from '@/types/maintenance';

interface ReminderFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  vehicleId: number;
  reminder?: ReminderDetail;
}

export function ReminderFormDialog({ open, onOpenChange, vehicleId, reminder }: ReminderFormDialogProps) {
  const isEdit = !!reminder;

  const { data: serviceTypesData } = useServiceTypes();
  const createMutation = useCreateReminder();
  const updateMutation = useUpdateReminder();

  const form = useForm<ReminderFormValues>({
    resolver: zodResolver(reminderSchema),
    defaultValues: {
      serviceTypeId: reminder?.serviceType?.id ?? 0,
      mileageInterval: reminder?.mileageInterval ?? null,
      timeIntervalMonths: reminder?.timeIntervalMonths ?? null,
      notes: reminder?.notes ?? '',
    },
  });

  useEffect(() => {
    if (open) {
      form.reset({
        serviceTypeId: reminder?.serviceType?.id ?? 0,
        mileageInterval: reminder?.mileageInterval ?? null,
        timeIntervalMonths: reminder?.timeIntervalMonths ?? null,
        notes: reminder?.notes ?? '',
      });
    }
  }, [open, reminder, form]);

  const onSubmit = async (data: ReminderFormValues) => {
    if (isEdit) {
      const payload: UpdateReminderRequest = {
        vehicle: vehicleId,
        serviceType: data.serviceTypeId,
        mileageInterval: data.mileageInterval,
        timeIntervalMonths: data.timeIntervalMonths,
        notes: data.notes,
      };
      updateMutation.mutate(
        { id: reminder.id, data: payload },
        {
          onSuccess: () => {
            onOpenChange(false);
            form.reset();
          },
        }
      );
    } else {
      const payload: CreateReminderRequest = {
        vehicle: vehicleId,
        serviceType: data.serviceTypeId,
        mileageInterval: data.mileageInterval,
        timeIntervalMonths: data.timeIntervalMonths,
        notes: data.notes,
      };
      createMutation.mutate(payload, {
        onSuccess: () => {
          onOpenChange(false);
          form.reset();
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
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>{isEdit ? 'Edit Reminder' : 'Add Reminder'}</DialogTitle>
          <DialogDescription>
            {isEdit ? 'Update the reminder settings.' : 'Set up a maintenance reminder based on time or mileage.'}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
          {/* Service Type */}
          <div className="space-y-2">
            <Label>
              Service Type <span className="text-destructive">*</span>
            </Label>
            <Select
              value={form.watch('serviceTypeId')?.toString() || ''}
              onValueChange={(value) => form.setValue('serviceTypeId', parseInt(value, 10))}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select a service type" />
              </SelectTrigger>
              <SelectContent>
                {serviceTypesData?.results.map((type) => (
                  <SelectItem key={type.id} value={type.id.toString()}>
                    {type.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {form.formState.errors.serviceTypeId && (
              <p className="text-sm text-destructive">{form.formState.errors.serviceTypeId.message}</p>
            )}
          </div>

          {/* Intervals */}
          <div className="space-y-4">
            <div className="rounded-lg border p-4">
              <h4 className="mb-3 font-medium">Reminder Intervals</h4>
              <p className="mb-4 text-sm text-muted-foreground">
                Set at least one interval. Reminder will trigger when either condition is met.
              </p>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="mileageInterval">Every X miles</Label>
                  <Input
                    id="mileageInterval"
                    type="number"
                    {...form.register('mileageInterval', {
                      setValueAs: (v) => (v === '' || v === null ? null : parseInt(v, 10)),
                    })}
                    placeholder="e.g., 5000"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="timeIntervalMonths">Every X months</Label>
                  <Input
                    id="timeIntervalMonths"
                    type="number"
                    {...form.register('timeIntervalMonths', {
                      setValueAs: (v) => (v === '' || v === null ? null : parseInt(v, 10)),
                    })}
                    placeholder="e.g., 6"
                  />
                </div>
              </div>

              {form.formState.errors.mileageInterval && (
                <p className="mt-2 text-sm text-destructive">{form.formState.errors.mileageInterval.message}</p>
              )}
            </div>
          </div>

          {/* Notes */}
          <div className="space-y-2">
            <Label htmlFor="notes">Notes</Label>
            <Textarea
              id="notes"
              {...form.register('notes')}
              placeholder="Additional notes about this reminder..."
              rows={2}
            />
            {form.formState.errors.notes && (
              <p className="text-sm text-destructive">{form.formState.errors.notes.message}</p>
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
                  : 'Add Reminder'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
