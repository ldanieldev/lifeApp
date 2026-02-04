/**
 * Vehicle Dashboard Component
 *
 * Main dashboard view for a selected vehicle showing overview,
 * service records, reminders, and notes.
 */

import { useState } from 'react';
import { ArrowLeft, Car, Gauge, DollarSign, Wrench, Bell, AlertTriangle, Edit, Settings } from 'lucide-react';
import { Button } from '@/components/shadcn/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/shadcn/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/shadcn/tabs';
import { Badge } from '@/components/shadcn/badge';
import { Skeleton } from '@/components/shadcn/skeleton';
import { Input } from '@/components/shadcn/input';
import { Label } from '@/components/shadcn/label';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/shadcn/dialog';
import { ServiceRecordList } from './ServiceRecordList';
import { ReminderList } from './ReminderList';
import { NoteList } from './NoteList';
import { VehicleFormDialog } from './VehicleFormDialog';
import { useVehicle, useVehicleDashboard, useUpdateVehicleOdometer } from '@/hooks/useMaintenance';

interface VehicleDashboardProps {
  vehicleId: number;
  onBack?: () => void;
}

export function VehicleDashboard({ vehicleId, onBack }: VehicleDashboardProps) {
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [odometerDialogOpen, setOdometerDialogOpen] = useState(false);
  const [newOdometer, setNewOdometer] = useState('');

  const { data: vehicle, isLoading: vehicleLoading, error: vehicleError } = useVehicle(vehicleId);
  const { data: dashboard, isLoading: dashboardLoading } = useVehicleDashboard(vehicleId);
  const updateOdometerMutation = useUpdateVehicleOdometer();

  const handleUpdateOdometer = () => {
    const odometer = parseInt(newOdometer, 10);
    if (isNaN(odometer) || odometer < 0) return;

    updateOdometerMutation.mutate(
      { id: vehicleId, data: { odometer } },
      {
        onSuccess: () => {
          setOdometerDialogOpen(false);
          setNewOdometer('');
        },
      }
    );
  };

  if (vehicleError) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-center">
        <p className="text-destructive">Failed to load vehicle</p>
        <p className="text-sm text-muted-foreground">{vehicleError.message}</p>
        <Button onClick={onBack} variant="outline" className="mt-4">
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back to Vehicles
        </Button>
      </div>
    );
  }

  if (vehicleLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-10 w-48" />
        <Skeleton className="h-[200px] rounded-lg" />
        <div className="grid gap-4 md:grid-cols-4">
          {[1, 2, 3, 4].map((i) => (
            <Skeleton key={i} className="h-[100px] rounded-lg" />
          ))}
        </div>
      </div>
    );
  }

  if (!vehicle) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-center">
        <p className="text-muted-foreground">Vehicle not found</p>
        <Button onClick={onBack} variant="outline" className="mt-4">
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back to Vehicles
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button onClick={onBack} variant="ghost" size="icon">
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div className="flex items-center gap-3">
            {vehicle.photoUrl ? (
              <img src={vehicle.photoUrl} alt={vehicle.displayName} className="h-14 w-14 rounded-lg object-cover" />
            ) : (
              <div className="flex h-14 w-14 items-center justify-center rounded-lg bg-muted">
                <Car className="h-7 w-7 text-muted-foreground" />
              </div>
            )}
            <div>
              <h1 className="text-2xl font-bold">{vehicle.displayName}</h1>
              <p className="text-muted-foreground">
                {vehicle.year} {vehicle.make} {vehicle.model}
                {vehicle.trim && ` ${vehicle.trim}`}
              </p>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={() => setEditDialogOpen(true)}>
            <Edit className="mr-2 h-4 w-4" />
            Edit
          </Button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card
          className="cursor-pointer hover:shadow-md"
          onClick={() => {
            setNewOdometer(vehicle.currentOdometer.toString());
            setOdometerDialogOpen(true);
          }}
        >
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Current Mileage</CardTitle>
            <Gauge className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{vehicle.currentOdometer.toLocaleString()}</div>
            <p className="text-xs text-muted-foreground">miles</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Spent</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            {dashboardLoading ? (
              <Skeleton className="h-8 w-24" />
            ) : (
              <>
                <div className="text-2xl font-bold">
                  ${parseFloat(dashboard?.totalSpent || '0').toLocaleString(undefined, { minimumFractionDigits: 2 })}
                </div>
                <p className="text-xs text-muted-foreground">all time</p>
              </>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Service Records</CardTitle>
            <Wrench className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            {dashboardLoading ? (
              <Skeleton className="h-8 w-16" />
            ) : (
              <>
                <div className="text-2xl font-bold">{dashboard?.recentServices?.length ?? 0}</div>
                <p className="text-xs text-muted-foreground">recent records</p>
              </>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Reminders</CardTitle>
            <Bell className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            {dashboardLoading ? (
              <Skeleton className="h-8 w-16" />
            ) : (
              <>
                <div className="flex items-center gap-2">
                  <span className="text-2xl font-bold">
                    {(dashboard?.overdueReminders?.length ?? 0) + (dashboard?.upcomingReminders?.length ?? 0)}
                  </span>
                  {(dashboard?.overdueReminders?.length ?? 0) > 0 && (
                    <Badge variant="destructive" className="flex items-center gap-1">
                      <AlertTriangle className="h-3 w-3" />
                      {dashboard?.overdueReminders?.length} overdue
                    </Badge>
                  )}
                </div>
                <p className="text-xs text-muted-foreground">active reminders</p>
              </>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Vehicle Details */}
      {(vehicle.vin || vehicle.licensePlate || vehicle.engine) && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Settings className="h-4 w-4" />
              Vehicle Details
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 sm:grid-cols-3">
              {vehicle.vin && (
                <div>
                  <p className="text-xs font-medium text-muted-foreground">VIN</p>
                  <p className="font-mono text-sm">{vehicle.vin}</p>
                </div>
              )}
              {vehicle.licensePlate && (
                <div>
                  <p className="text-xs font-medium text-muted-foreground">License Plate</p>
                  <p className="text-sm">{vehicle.licensePlate}</p>
                </div>
              )}
              {vehicle.engine && (
                <div>
                  <p className="text-xs font-medium text-muted-foreground">Engine</p>
                  <p className="text-sm">{vehicle.engine}</p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Tabs for Service Records, Reminders, Notes */}
      <Tabs defaultValue="service-history" className="space-y-4">
        <TabsList>
          <TabsTrigger value="service-history">Service History</TabsTrigger>
          <TabsTrigger value="reminders">
            Reminders
            {(dashboard?.overdueReminders?.length ?? 0) > 0 && (
              <Badge variant="destructive" className="ml-2">
                {dashboard?.overdueReminders?.length}
              </Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="notes">Journal</TabsTrigger>
        </TabsList>

        <TabsContent value="service-history">
          <ServiceRecordList vehicleId={vehicleId} currentOdometer={vehicle.currentOdometer} />
        </TabsContent>

        <TabsContent value="reminders">
          <ReminderList vehicleId={vehicleId} />
        </TabsContent>

        <TabsContent value="notes">
          <NoteList vehicleId={vehicleId} currentOdometer={vehicle.currentOdometer} />
        </TabsContent>
      </Tabs>

      {/* Edit Vehicle Dialog */}
      <VehicleFormDialog open={editDialogOpen} onOpenChange={setEditDialogOpen} vehicle={vehicle} />

      {/* Update Odometer Dialog */}
      <Dialog open={odometerDialogOpen} onOpenChange={setOdometerDialogOpen}>
        <DialogContent className="sm:max-w-[400px]">
          <DialogHeader>
            <DialogTitle>Update Odometer</DialogTitle>
            <DialogDescription>Enter the current odometer reading for this vehicle.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="odometer">Current Odometer (miles)</Label>
              <Input
                id="odometer"
                type="number"
                value={newOdometer}
                onChange={(e) => setNewOdometer(e.target.value)}
                placeholder="Enter current mileage"
              />
            </div>
            <div className="flex justify-end gap-3">
              <Button variant="outline" onClick={() => setOdometerDialogOpen(false)}>
                Cancel
              </Button>
              <Button onClick={handleUpdateOdometer} disabled={updateOdometerMutation.isPending || !newOdometer}>
                {updateOdometerMutation.isPending ? 'Updating...' : 'Update'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
