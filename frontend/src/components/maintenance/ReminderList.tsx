/**
 * Reminder List Component
 *
 * Displays a list of maintenance reminders for a vehicle.
 */

import { useState } from 'react';
import { Plus, Bell } from 'lucide-react';
import { Button } from '@/components/shadcn/button';
import { Skeleton } from '@/components/shadcn/skeleton';
import { ReminderCard } from './ReminderCard';
import { ReminderFormDialog } from './ReminderFormDialog';
import { useReminders, useReminder, useDeleteReminder, useCompleteReminder } from '@/hooks/useMaintenance';

interface ReminderListProps {
  vehicleId: number;
}

export function ReminderList({ vehicleId }: ReminderListProps) {
  const [formDialogOpen, setFormDialogOpen] = useState(false);
  const [editingReminderId, setEditingReminderId] = useState<number | null>(null);

  const { data, isLoading, error } = useReminders({ vehicle: vehicleId });
  const { data: editingReminder } = useReminder(editingReminderId ?? 0);
  const deleteMutation = useDeleteReminder();
  const completeMutation = useCompleteReminder();

  const handleEdit = (reminderId: number) => {
    setEditingReminderId(reminderId);
    setFormDialogOpen(true);
  };

  const handleDelete = (reminderId: number) => {
    if (confirm('Are you sure you want to delete this reminder?')) {
      deleteMutation.mutate(reminderId);
    }
  };

  const handleComplete = (reminderId: number) => {
    completeMutation.mutate(reminderId);
  };

  const handleFormClose = (open: boolean) => {
    setFormDialogOpen(open);
    if (!open) {
      setEditingReminderId(null);
    }
  };

  // Sort reminders: overdue first, then due_soon, then upcoming
  const sortedReminders = data?.results
    ? [...data.results].sort((a, b) => {
        const order: Record<string, number> = { overdue: 0, due_soon: 1, upcoming: 2 };
        return (order[a.status] ?? 3) - (order[b.status] ?? 3);
      })
    : [];

  const overdueCount = sortedReminders.filter((r) => r.status === 'overdue').length;
  const dueSoonCount = sortedReminders.filter((r) => r.status === 'due_soon').length;

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center py-8 text-center">
        <p className="text-destructive">Failed to load reminders</p>
        <p className="text-sm text-muted-foreground">{error.message}</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold">Maintenance Reminders</h3>
          <p className="text-sm text-muted-foreground">
            {data?.count ?? 0} reminder{data?.count !== 1 ? 's' : ''}
            {overdueCount > 0 && <span className="ml-2 text-destructive">({overdueCount} overdue)</span>}
            {dueSoonCount > 0 && <span className="ml-2 text-yellow-600">({dueSoonCount} due soon)</span>}
          </p>
        </div>
        <Button onClick={() => setFormDialogOpen(true)} size="sm">
          <Plus className="mr-2 h-4 w-4" />
          Add Reminder
        </Button>
      </div>

      {/* Reminders List */}
      {isLoading ? (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-[100px] rounded-lg" />
          ))}
        </div>
      ) : sortedReminders.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-8 text-center">
          <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-muted">
            <Bell className="h-6 w-6 text-muted-foreground" />
          </div>
          <h4 className="font-semibold">No reminders set</h4>
          <p className="mb-4 text-sm text-muted-foreground">Set up reminders to stay on top of maintenance</p>
          <Button onClick={() => setFormDialogOpen(true)} size="sm">
            <Plus className="mr-2 h-4 w-4" />
            Add First Reminder
          </Button>
        </div>
      ) : (
        <div className="space-y-3">
          {sortedReminders.map((reminder) => (
            <ReminderCard
              key={reminder.id}
              reminder={reminder}
              onEdit={handleEdit}
              onDelete={handleDelete}
              onComplete={handleComplete}
            />
          ))}
        </div>
      )}

      {/* Form Dialog */}
      <ReminderFormDialog
        open={formDialogOpen}
        onOpenChange={handleFormClose}
        vehicleId={vehicleId}
        reminder={editingReminder}
      />
    </div>
  );
}
