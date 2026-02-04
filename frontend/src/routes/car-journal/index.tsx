/**
 * Car Journal Index Route
 *
 * Main page showing all vehicles.
 * Route: /car-journal (index)
 */

import { useState } from 'react';
import { createFileRoute } from '@tanstack/react-router';
import { VehicleList, VehicleDashboard } from '@/components/maintenance';

function CarJournalPage() {
  const [selectedVehicleId, setSelectedVehicleId] = useState<number | null>(null);

  if (selectedVehicleId) {
    return <VehicleDashboard vehicleId={selectedVehicleId} onBack={() => setSelectedVehicleId(null)} />;
  }

  return <VehicleList onVehicleClick={(id) => setSelectedVehicleId(id)} />;
}

export const Route = createFileRoute('/car-journal/')({
  component: CarJournalPage,
});
