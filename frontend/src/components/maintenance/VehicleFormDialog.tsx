/**
 * Vehicle Form Dialog Component
 *
 * Modal form for creating/editing vehicles with photo upload.
 */

import { useEffect, useState, useCallback } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { X, Loader2, ImageIcon } from 'lucide-react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/shadcn/dialog';
import { Button } from '@/components/shadcn/button';
import { Input } from '@/components/shadcn/input';
import { Label } from '@/components/shadcn/label';
import {
  useCreateVehicle,
  useUpdateVehicle,
  useUploadVehiclePhoto,
  useDeleteVehiclePhoto,
} from '@/hooks/useMaintenance';
import { vehicleSchema, type VehicleFormValues } from '@/lib/validations/maintenance';
import type { VehicleDetail } from '@/types/maintenance';
import { cn } from '@/lib/utils';

interface VehicleFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  vehicle?: VehicleDetail;
}

export function VehicleFormDialog({ open, onOpenChange, vehicle }: VehicleFormDialogProps) {
  const isEdit = !!vehicle;

  // For new vehicles, store file to upload after creation
  const [pendingPhoto, setPendingPhoto] = useState<File | null>(null);
  const [pendingPhotoPreview, setPendingPhotoPreview] = useState<string | null>(null);
  const [isUploadingPhoto, setIsUploadingPhoto] = useState(false);

  const createMutation = useCreateVehicle();
  const updateMutation = useUpdateVehicle();
  const uploadPhotoMutation = useUploadVehiclePhoto();
  const deletePhotoMutation = useDeleteVehiclePhoto();

  const form = useForm<VehicleFormValues>({
    resolver: zodResolver(vehicleSchema),
    defaultValues: {
      name: vehicle?.name || '',
      year: vehicle?.year || new Date().getFullYear(),
      make: vehicle?.make || '',
      model: vehicle?.model || '',
      vin: vehicle?.vin?.toUpperCase() || '',
      licensePlate: vehicle?.licensePlate?.toUpperCase() || '',
      engine: vehicle?.engine || '',
      trim: vehicle?.trim || '',
      currentOdometer: vehicle?.currentOdometer || 0,
    },
  });

  // Reset form when vehicle prop changes (for editing different vehicles)
  useEffect(() => {
    if (open) {
      form.reset({
        name: vehicle?.name || '',
        year: vehicle?.year || new Date().getFullYear(),
        make: vehicle?.make || '',
        model: vehicle?.model || '',
        vin: vehicle?.vin?.toUpperCase() || '',
        licensePlate: vehicle?.licensePlate?.toUpperCase() || '',
        engine: vehicle?.engine || '',
        trim: vehicle?.trim || '',
        currentOdometer: vehicle?.currentOdometer || 0,
      });
      // Clear pending photo when dialog opens
      setPendingPhoto(null);
      setPendingPhotoPreview(null);
    }
  }, [open, vehicle, form]);

  // Cleanup preview URL on unmount
  useEffect(() => {
    return () => {
      if (pendingPhotoPreview) {
        URL.revokeObjectURL(pendingPhotoPreview);
      }
    };
  }, [pendingPhotoPreview]);

  const handlePhotoSelect = useCallback(
    async (file: File) => {
      // Validate file
      const allowedTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
      if (!allowedTypes.includes(file.type)) {
        return;
      }
      if (file.size > 10 * 1024 * 1024) {
        return;
      }

      if (isEdit && vehicle) {
        // For existing vehicles, upload immediately
        setIsUploadingPhoto(true);
        try {
          await uploadPhotoMutation.mutateAsync({ id: vehicle.id, file });
        } finally {
          setIsUploadingPhoto(false);
        }
      } else {
        // For new vehicles, store for later upload
        if (pendingPhotoPreview) {
          URL.revokeObjectURL(pendingPhotoPreview);
        }
        setPendingPhoto(file);
        setPendingPhotoPreview(URL.createObjectURL(file));
      }
    },
    [isEdit, vehicle, uploadPhotoMutation, pendingPhotoPreview]
  );

  const handleRemovePhoto = useCallback(async () => {
    if (isEdit && vehicle?.photoUrl) {
      deletePhotoMutation.mutate(vehicle.id);
    } else if (pendingPhotoPreview) {
      URL.revokeObjectURL(pendingPhotoPreview);
      setPendingPhoto(null);
      setPendingPhotoPreview(null);
    }
  }, [isEdit, vehicle, deletePhotoMutation, pendingPhotoPreview]);

  const onSubmit = async (data: VehicleFormValues) => {
    // Convert VIN and license plate to uppercase before saving
    const normalizedData = {
      ...data,
      vin: data.vin?.toUpperCase() || '',
      licensePlate: data.licensePlate?.toUpperCase() || '',
    };

    if (isEdit) {
      updateMutation.mutate(
        { id: vehicle.id, data: normalizedData },
        {
          onSuccess: () => {
            onOpenChange(false);
            form.reset();
          },
        }
      );
    } else {
      createMutation.mutate(normalizedData, {
        onSuccess: async (newVehicle) => {
          // Upload pending photo if any
          if (pendingPhoto && newVehicle.id) {
            try {
              await uploadPhotoMutation.mutateAsync({ id: newVehicle.id, file: pendingPhoto });
            } catch {
              // Photo upload failed but vehicle was created
            }
          }
          onOpenChange(false);
          form.reset();
          setPendingPhoto(null);
          if (pendingPhotoPreview) {
            URL.revokeObjectURL(pendingPhotoPreview);
            setPendingPhotoPreview(null);
          }
        },
      });
    }
  };

  const handleOpenChange = (newOpen: boolean) => {
    onOpenChange(newOpen);
    if (!newOpen) {
      form.reset();
      if (pendingPhotoPreview) {
        URL.revokeObjectURL(pendingPhotoPreview);
      }
      setPendingPhoto(null);
      setPendingPhotoPreview(null);
    }
  };

  // Determine current photo to display
  const currentPhotoUrl = isEdit ? vehicle?.photoUrl : pendingPhotoPreview;
  const isPhotoLoading = isUploadingPhoto || uploadPhotoMutation.isPending || deletePhotoMutation.isPending;

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{isEdit ? 'Edit Vehicle' : 'Add Vehicle'}</DialogTitle>
          <DialogDescription>
            {isEdit ? 'Update your vehicle details.' : 'Add a new vehicle to track maintenance.'}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
          {/* Photo Upload */}
          <div className="space-y-2">
            <Label>Photo</Label>
            {currentPhotoUrl ? (
              <div className="relative aspect-video max-h-[200px] w-full overflow-hidden rounded-lg border bg-muted">
                <img src={currentPhotoUrl} alt="Vehicle" className="h-full w-full object-cover" />
                <Button
                  type="button"
                  variant="destructive"
                  size="icon"
                  className="absolute right-2 top-2 h-7 w-7"
                  onClick={handleRemovePhoto}
                  disabled={isPhotoLoading}
                >
                  {isPhotoLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <X className="h-4 w-4" />}
                </Button>
              </div>
            ) : (
              <label
                className={cn(
                  'flex aspect-video max-h-[200px] w-full cursor-pointer flex-col items-center justify-center rounded-lg border-2 border-dashed transition-colors hover:border-primary/50',
                  isPhotoLoading && 'pointer-events-none opacity-50'
                )}
              >
                <input
                  type="file"
                  accept="image/jpeg,image/png,image/gif,image/webp"
                  className="hidden"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) handlePhotoSelect(file);
                    e.target.value = '';
                  }}
                  disabled={isPhotoLoading}
                />
                {isPhotoLoading ? (
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

          {/* Nickname */}
          <div className="space-y-2">
            <Label htmlFor="name">Nickname</Label>
            <Input id="name" {...form.register('name')} placeholder="e.g., Daily Driver, Family Car" />
            {form.formState.errors.name && (
              <p className="text-sm text-destructive">{form.formState.errors.name.message}</p>
            )}
          </div>

          {/* Year, Make, Model Row */}
          <div className="grid grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label htmlFor="year">
                Year <span className="text-destructive">*</span>
              </Label>
              <Input id="year" type="number" {...form.register('year', { valueAsNumber: true })} placeholder="2024" />
              {form.formState.errors.year && (
                <p className="text-sm text-destructive">{form.formState.errors.year.message}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="make">
                Make <span className="text-destructive">*</span>
              </Label>
              <Input id="make" {...form.register('make')} placeholder="Toyota" />
              {form.formState.errors.make && (
                <p className="text-sm text-destructive">{form.formState.errors.make.message}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="model">
                Model <span className="text-destructive">*</span>
              </Label>
              <Input id="model" {...form.register('model')} placeholder="Camry" />
              {form.formState.errors.model && (
                <p className="text-sm text-destructive">{form.formState.errors.model.message}</p>
              )}
            </div>
          </div>

          {/* Trim and Engine Row */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="trim">Trim</Label>
              <Input id="trim" {...form.register('trim')} placeholder="SE, Limited, etc." />
              {form.formState.errors.trim && (
                <p className="text-sm text-destructive">{form.formState.errors.trim.message}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="engine">Engine</Label>
              <Input id="engine" {...form.register('engine')} placeholder="2.5L 4-Cylinder" />
              {form.formState.errors.engine && (
                <p className="text-sm text-destructive">{form.formState.errors.engine.message}</p>
              )}
            </div>
          </div>

          {/* VIN and License Plate Row */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="vin">VIN</Label>
              <Input
                id="vin"
                {...form.register('vin')}
                placeholder="17 characters"
                maxLength={17}
                className="uppercase"
                onChange={(e) => form.setValue('vin', e.target.value.toUpperCase())}
              />
              {form.formState.errors.vin && (
                <p className="text-sm text-destructive">{form.formState.errors.vin.message}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="licensePlate">License Plate</Label>
              <Input
                id="licensePlate"
                {...form.register('licensePlate')}
                placeholder="ABC-1234"
                className="uppercase"
                onChange={(e) => form.setValue('licensePlate', e.target.value.toUpperCase())}
              />
              {form.formState.errors.licensePlate && (
                <p className="text-sm text-destructive">{form.formState.errors.licensePlate.message}</p>
              )}
            </div>
          </div>

          {/* Current Odometer */}
          <div className="space-y-2">
            <Label htmlFor="currentOdometer">Current Odometer (miles)</Label>
            <Input
              id="currentOdometer"
              type="number"
              {...form.register('currentOdometer', { valueAsNumber: true })}
              placeholder="0"
            />
            {form.formState.errors.currentOdometer && (
              <p className="text-sm text-destructive">{form.formState.errors.currentOdometer.message}</p>
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
                  : 'Add Vehicle'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
