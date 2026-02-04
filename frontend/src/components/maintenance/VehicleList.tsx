/**
 * Vehicle List Component
 *
 * Displays a list of vehicles with filtering and actions.
 */

import { useState } from 'react';
import { Plus, Car } from 'lucide-react';
import { Button } from '@/components/shadcn/button';
import { Skeleton } from '@/components/shadcn/skeleton';
import { Checkbox } from '@/components/shadcn/checkbox';
import { Label } from '@/components/shadcn/label';
import { VehicleCard } from './VehicleCard';
import { VehicleFormDialog } from './VehicleFormDialog';
import {
  useVehicles,
  useVehicle,
  useArchiveVehicle,
  useUnarchiveVehicle,
  useDeleteVehicle,
} from '@/hooks/useMaintenance';
import type { Vehicle } from '@/types/maintenance';

interface VehicleListProps {
  onVehicleClick?: (vehicleId: number) => void;
}

export function VehicleList({ onVehicleClick }: VehicleListProps) {
  const [showArchived, setShowArchived] = useState(false);
  const [formDialogOpen, setFormDialogOpen] = useState(false);
  const [editingVehicleId, setEditingVehicleId] = useState<number | null>(null);

  const { data, isLoading, error } = useVehicles({
    isArchived: showArchived ? undefined : false,
  });

  // Fetch vehicle detail when editing
  const { data: editingVehicle } = useVehicle(editingVehicleId ?? 0);

  const archiveMutation = useArchiveVehicle();
  const unarchiveMutation = useUnarchiveVehicle();
  const deleteMutation = useDeleteVehicle();

  const handleEdit = (vehicle: Vehicle) => {
    setEditingVehicleId(vehicle.id);
    setFormDialogOpen(true);
  };

  const handleArchive = (vehicleId: number) => {
    const vehicle = data?.results.find((v) => v.id === vehicleId);
    if (vehicle?.isArchived) {
      unarchiveMutation.mutate(vehicleId);
    } else {
      archiveMutation.mutate(vehicleId);
    }
  };

  const handleDelete = (vehicleId: number) => {
    if (confirm('Are you sure you want to delete this vehicle? This action cannot be undone.')) {
      deleteMutation.mutate(vehicleId);
    }
  };

  const handleFormClose = (open: boolean) => {
    setFormDialogOpen(open);
    if (!open) {
      setEditingVehicleId(null);
    }
  };

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-center">
        <p className="text-destructive">Failed to load vehicles</p>
        <p className="text-sm text-muted-foreground">{error.message}</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Vehicles</h2>
          <p className="text-muted-foreground">Manage your vehicles and track maintenance</p>
        </div>
        <Button onClick={() => setFormDialogOpen(true)}>
          <Plus className="mr-2 h-4 w-4" />
          Add Vehicle
        </Button>
      </div>

      {/* Filters */}
      <div className="flex items-center gap-4">
        <div className="flex items-center space-x-2">
          <Checkbox
            id="show-archived"
            checked={showArchived}
            onCheckedChange={(checked) => setShowArchived(checked === true)}
          />
          <Label htmlFor="show-archived" className="text-sm font-normal">
            Show archived vehicles
          </Label>
        </div>
      </div>

      {/* Vehicle Grid */}
      {isLoading ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-[140px] rounded-lg" />
          ))}
        </div>
      ) : data?.results.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-12 text-center">
          <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-muted">
            <Car className="h-8 w-8 text-muted-foreground" />
          </div>
          <h3 className="text-lg font-semibold">No vehicles yet</h3>
          <p className="mb-4 text-muted-foreground">Add your first vehicle to start tracking maintenance</p>
          <Button onClick={() => setFormDialogOpen(true)}>
            <Plus className="mr-2 h-4 w-4" />
            Add Vehicle
          </Button>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {data?.results.map((vehicle) => (
            <VehicleCard
              key={vehicle.id}
              vehicle={vehicle}
              onClick={() => onVehicleClick?.(vehicle.id)}
              onEdit={handleEdit}
              onArchive={handleArchive}
              onDelete={handleDelete}
            />
          ))}
        </div>
      )}

      {/* Form Dialog */}
      <VehicleFormDialog open={formDialogOpen} onOpenChange={handleFormClose} vehicle={editingVehicle} />
    </div>
  );
}
