/**
 * Vehicle Card Component
 *
 * Displays a vehicle in a card format with quick actions.
 */

import { Car, MoreHorizontal, Archive, Trash2, Edit, Gauge } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/shadcn/card';
import { Button } from '@/components/shadcn/button';
import { Badge } from '@/components/shadcn/badge';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/shadcn/dropdown-menu';
import type { Vehicle } from '@/types/maintenance';

interface VehicleCardProps {
  vehicle: Vehicle;
  onClick?: () => void;
  onEdit?: (vehicle: Vehicle) => void;
  onArchive?: (vehicleId: number) => void;
  onDelete?: (vehicleId: number) => void;
}

export function VehicleCard({ vehicle, onClick, onEdit, onArchive, onDelete }: VehicleCardProps) {
  const handleCardClick = (e: React.MouseEvent) => {
    // Don't trigger card click when clicking the menu
    if ((e.target as HTMLElement).closest('[data-menu-trigger]')) {
      return;
    }
    onClick?.();
  };

  return (
    <Card
      className={`cursor-pointer transition-all hover:shadow-md ${vehicle.isArchived ? 'opacity-60' : ''}`}
      onClick={handleCardClick}
    >
      <CardHeader className="flex flex-row items-start justify-between space-y-0 pb-2">
        <div className="flex items-center gap-3">
          {vehicle.photoUrl ? (
            <img src={vehicle.photoUrl} alt={vehicle.displayName} className="h-12 w-12 rounded-lg object-cover" />
          ) : (
            <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-muted">
              <Car className="h-6 w-6 text-muted-foreground" />
            </div>
          )}
          <div>
            <CardTitle className="text-lg">{vehicle.displayName}</CardTitle>
            <p className="text-sm text-muted-foreground">
              {vehicle.year} {vehicle.make} {vehicle.model}
            </p>
          </div>
        </div>

        <DropdownMenu>
          <DropdownMenuTrigger asChild data-menu-trigger>
            <Button variant="ghost" size="icon" className="h-8 w-8">
              <MoreHorizontal className="h-4 w-4" />
              <span className="sr-only">Open menu</span>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={() => onEdit?.(vehicle)}>
              <Edit className="mr-2 h-4 w-4" />
              Edit
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => onArchive?.(vehicle.id)}>
              <Archive className="mr-2 h-4 w-4" />
              {vehicle.isArchived ? 'Unarchive' : 'Archive'}
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              onClick={() => onDelete?.(vehicle.id)}
              className="text-destructive focus:text-destructive"
            >
              <Trash2 className="mr-2 h-4 w-4" />
              Delete
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </CardHeader>

      <CardContent>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Gauge className="h-4 w-4" />
            <span>{vehicle.currentOdometer.toLocaleString()} miles</span>
          </div>

          {vehicle.isArchived && <Badge variant="secondary">Archived</Badge>}
        </div>
      </CardContent>
    </Card>
  );
}
