/**
 * Service Record List Component
 *
 * Displays a list of service records for a vehicle.
 */

import { useState } from 'react';
import { Plus, Wrench } from 'lucide-react';
import { Button } from '@/components/shadcn/button';
import { Skeleton } from '@/components/shadcn/skeleton';
import { ServiceRecordCard } from './ServiceRecordCard';
import { ServiceRecordFormDialog } from './ServiceRecordFormDialog';
import { ServiceRecordDetailDialog } from './ServiceRecordDetailDialog';
import { useServiceRecords, useServiceRecord, useDeleteServiceRecord } from '@/hooks/useMaintenance';

interface ServiceRecordListProps {
  vehicleId: number;
  currentOdometer?: number;
}

export function ServiceRecordList({ vehicleId, currentOdometer = 0 }: ServiceRecordListProps) {
  const [formDialogOpen, setFormDialogOpen] = useState(false);
  const [detailDialogOpen, setDetailDialogOpen] = useState(false);
  const [editingRecordId, setEditingRecordId] = useState<number | null>(null);
  const [viewingRecordId, setViewingRecordId] = useState<number | null>(null);

  const { data, isLoading, error } = useServiceRecords({ vehicle: vehicleId });
  const { data: editingRecord } = useServiceRecord(editingRecordId ?? 0);
  const deleteMutation = useDeleteServiceRecord();

  const handleView = (recordId: number) => {
    setViewingRecordId(recordId);
    setDetailDialogOpen(true);
  };

  const handleEdit = (recordId: number) => {
    setEditingRecordId(recordId);
    setFormDialogOpen(true);
  };

  const handleDelete = (recordId: number) => {
    if (confirm('Are you sure you want to delete this service record? This action cannot be undone.')) {
      deleteMutation.mutate(recordId);
    }
  };

  const handleFormClose = (open: boolean) => {
    setFormDialogOpen(open);
    if (!open) {
      setEditingRecordId(null);
    }
  };

  const handleDetailClose = (open: boolean) => {
    setDetailDialogOpen(open);
    if (!open) {
      setViewingRecordId(null);
    }
  };

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center py-8 text-center">
        <p className="text-destructive">Failed to load service records</p>
        <p className="text-sm text-muted-foreground">{error.message}</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold">Service History</h3>
          <p className="text-sm text-muted-foreground">
            {data?.count ?? 0} record{data?.count !== 1 ? 's' : ''}
          </p>
        </div>
        <Button onClick={() => setFormDialogOpen(true)} size="sm">
          <Plus className="mr-2 h-4 w-4" />
          Add Record
        </Button>
      </div>

      {/* Records List */}
      {isLoading ? (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-[100px] rounded-lg" />
          ))}
        </div>
      ) : data?.results.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-8 text-center">
          <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-muted">
            <Wrench className="h-6 w-6 text-muted-foreground" />
          </div>
          <h4 className="font-semibold">No service records</h4>
          <p className="mb-4 text-sm text-muted-foreground">Start tracking your maintenance history</p>
          <Button onClick={() => setFormDialogOpen(true)} size="sm">
            <Plus className="mr-2 h-4 w-4" />
            Add First Record
          </Button>
        </div>
      ) : (
        <div className="space-y-3">
          {data?.results.map((record) => (
            <ServiceRecordCard
              key={record.id}
              record={record}
              onView={handleView}
              onEdit={handleEdit}
              onDelete={handleDelete}
            />
          ))}
        </div>
      )}

      {/* Form Dialog */}
      <ServiceRecordFormDialog
        open={formDialogOpen}
        onOpenChange={handleFormClose}
        vehicleId={vehicleId}
        currentOdometer={currentOdometer}
        serviceRecord={editingRecord}
      />

      {/* Detail Dialog */}
      <ServiceRecordDetailDialog
        open={detailDialogOpen}
        onOpenChange={handleDetailClose}
        serviceRecordId={viewingRecordId}
      />
    </div>
  );
}
