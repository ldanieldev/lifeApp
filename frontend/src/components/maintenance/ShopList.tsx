/**
 * Shop List Component
 *
 * Displays a list of service shops/locations.
 */

import { useState } from 'react';
import { Plus, Store } from 'lucide-react';
import { Button } from '@/components/shadcn/button';
import { Skeleton } from '@/components/shadcn/skeleton';
import { ShopCard } from './ShopCard';
import { ShopFormDialog } from './ShopFormDialog';
import { useShops, useDeleteShop } from '@/hooks/useMaintenance';
import type { Shop } from '@/types/maintenance';

export function ShopList() {
  const [formDialogOpen, setFormDialogOpen] = useState(false);
  const [editingShop, setEditingShop] = useState<Shop | undefined>(undefined);

  const { data, isLoading, error } = useShops();
  const deleteMutation = useDeleteShop();

  const handleEdit = (shop: Shop) => {
    setEditingShop(shop);
    setFormDialogOpen(true);
  };

  const handleDelete = (shopId: number) => {
    if (confirm('Are you sure you want to delete this shop? Service records using this shop will not be deleted.')) {
      deleteMutation.mutate(shopId);
    }
  };

  const handleFormClose = (open: boolean) => {
    setFormDialogOpen(open);
    if (!open) {
      setEditingShop(undefined);
    }
  };

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center py-8 text-center">
        <p className="text-destructive">Failed to load shops</p>
        <p className="text-sm text-muted-foreground">{error.message}</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold">Service Shops</h3>
          <p className="text-sm text-muted-foreground">
            {data?.count ?? 0} shop{data?.count !== 1 ? 's' : ''}
          </p>
        </div>
        <Button onClick={() => setFormDialogOpen(true)} size="sm">
          <Plus className="mr-2 h-4 w-4" />
          Add Shop
        </Button>
      </div>

      {/* Shops List */}
      {isLoading ? (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-[80px] rounded-lg" />
          ))}
        </div>
      ) : data?.results.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-8 text-center">
          <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-muted">
            <Store className="h-6 w-6 text-muted-foreground" />
          </div>
          <h4 className="font-semibold">No shops saved</h4>
          <p className="mb-4 text-sm text-muted-foreground">Save your favorite service shops for quick access</p>
          <Button onClick={() => setFormDialogOpen(true)} size="sm">
            <Plus className="mr-2 h-4 w-4" />
            Add First Shop
          </Button>
        </div>
      ) : (
        <div className="space-y-3">
          {data?.results.map((shop) => (
            <ShopCard key={shop.id} shop={shop} onEdit={handleEdit} onDelete={handleDelete} />
          ))}
        </div>
      )}

      {/* Form Dialog */}
      <ShopFormDialog open={formDialogOpen} onOpenChange={handleFormClose} shop={editingShop} />
    </div>
  );
}
