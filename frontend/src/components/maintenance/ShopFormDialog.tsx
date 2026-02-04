/**
 * Shop Form Dialog Component
 *
 * Modal form for creating/editing shops/service locations.
 */

import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/shadcn/dialog';
import { Button } from '@/components/shadcn/button';
import { Input } from '@/components/shadcn/input';
import { Label } from '@/components/shadcn/label';
import { useCreateShop, useUpdateShop } from '@/hooks/useMaintenance';
import { shopSchema, type ShopFormValues } from '@/lib/validations/maintenance';
import type { Shop } from '@/types/maintenance';

interface ShopFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  shop?: Shop;
}

export function ShopFormDialog({ open, onOpenChange, shop }: ShopFormDialogProps) {
  const isEdit = !!shop;

  const createMutation = useCreateShop();
  const updateMutation = useUpdateShop();

  const form = useForm<ShopFormValues>({
    resolver: zodResolver(shopSchema),
    defaultValues: {
      name: shop?.name ?? '',
      address: shop?.address ?? '',
      phone: shop?.phone ?? '',
    },
  });

  useEffect(() => {
    if (open) {
      form.reset({
        name: shop?.name ?? '',
        address: shop?.address ?? '',
        phone: shop?.phone ?? '',
      });
    }
  }, [open, shop, form]);

  const onSubmit = async (data: ShopFormValues) => {
    if (isEdit) {
      updateMutation.mutate(
        { id: shop.id, data },
        {
          onSuccess: () => {
            onOpenChange(false);
            form.reset();
          },
        }
      );
    } else {
      createMutation.mutate(data, {
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
      <DialogContent className="sm:max-w-[450px]">
        <DialogHeader>
          <DialogTitle>{isEdit ? 'Edit Shop' : 'Add Shop'}</DialogTitle>
          <DialogDescription>
            {isEdit ? 'Update the shop details.' : 'Add a new service shop or location.'}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
          {/* Name */}
          <div className="space-y-2">
            <Label htmlFor="name">
              Shop Name <span className="text-destructive">*</span>
            </Label>
            <Input id="name" {...form.register('name')} placeholder="e.g., Joe's Auto Shop" />
            {form.formState.errors.name && (
              <p className="text-sm text-destructive">{form.formState.errors.name.message}</p>
            )}
          </div>

          {/* Address */}
          <div className="space-y-2">
            <Label htmlFor="address">Address</Label>
            <Input id="address" {...form.register('address')} placeholder="123 Main St, City, State" />
            {form.formState.errors.address && (
              <p className="text-sm text-destructive">{form.formState.errors.address.message}</p>
            )}
          </div>

          {/* Phone */}
          <div className="space-y-2">
            <Label htmlFor="phone">Phone</Label>
            <Input id="phone" {...form.register('phone')} placeholder="(555) 123-4567" />
            {form.formState.errors.phone && (
              <p className="text-sm text-destructive">{form.formState.errors.phone.message}</p>
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
                  : 'Add Shop'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
