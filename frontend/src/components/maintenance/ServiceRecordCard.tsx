/**
 * Service Record Card Component
 *
 * Displays a service record in a card/list item format.
 */

import { format } from 'date-fns';
import { Wrench, MoreHorizontal, Edit, Trash2, MapPin, DollarSign, Paperclip, Eye } from 'lucide-react';
import { Card, CardContent } from '@/components/shadcn/card';
import { Button } from '@/components/shadcn/button';
import { Badge } from '@/components/shadcn/badge';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/shadcn/dropdown-menu';
import type { ServiceRecord, ServiceRecordDetail } from '@/types/maintenance';

// Accept either ServiceRecord or ServiceRecordDetail
type ServiceRecordCardData = ServiceRecord | ServiceRecordDetail;

interface ServiceRecordCardProps {
  record: ServiceRecordCardData;
  onView?: (recordId: number) => void;
  onEdit?: (recordId: number) => void;
  onDelete?: (recordId: number) => void;
}

export function ServiceRecordCard({ record, onView, onEdit, onDelete }: ServiceRecordCardProps) {
  const totalCost = parseFloat(record.totalCost || '0');

  // Get service type name - could be nested object or just serviceTypeName
  const serviceTypeName =
    'serviceType' in record && typeof record.serviceType === 'object'
      ? record.serviceType?.name
      : (record as ServiceRecord).serviceTypeName || 'Service';

  // Get shop name - could be nested object or locationDisplay
  const shopName =
    'shop' in record && typeof record.shop === 'object' && record.shop
      ? record.shop.name
      : record.locationDisplay || null;

  return (
    <Card className="transition-all hover:shadow-md">
      <CardContent className="p-4">
        <div className="flex items-start justify-between">
          <div className="flex items-start gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
              <Wrench className="h-5 w-5 text-primary" />
            </div>
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <h4 className="font-semibold">{serviceTypeName}</h4>
                <Badge variant="outline" className="text-xs">
                  {record.odometer.toLocaleString()} mi
                </Badge>
              </div>
              <p className="text-sm text-muted-foreground">{format(new Date(record.date), 'PPP')}</p>

              {shopName && (
                <div className="flex items-center gap-1 text-sm text-muted-foreground">
                  <MapPin className="h-3 w-3" />
                  <span>{shopName}</span>
                </div>
              )}

              {record.notes && <p className="mt-2 text-sm text-muted-foreground line-clamp-2">{record.notes}</p>}
            </div>
          </div>

          <div className="flex items-start gap-2">
            {/* Attachment count indicator */}
            {'attachmentCount' in record && record.attachmentCount > 0 && (
              <div
                className="flex items-center gap-1 text-sm text-muted-foreground"
                title={`${record.attachmentCount} attachment${record.attachmentCount > 1 ? 's' : ''}`}
              >
                <Paperclip className="h-4 w-4" />
                <span>{record.attachmentCount}</span>
              </div>
            )}

            {totalCost > 0 && (
              <div className="flex items-center gap-1 text-sm font-medium">
                <DollarSign className="h-4 w-4 text-muted-foreground" />
                <span>${totalCost.toFixed(2)}</span>
              </div>
            )}

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="h-8 w-8">
                  <MoreHorizontal className="h-4 w-4" />
                  <span className="sr-only">Open menu</span>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={() => onView?.(record.id)}>
                  <Eye className="mr-2 h-4 w-4" />
                  View Details
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => onEdit?.(record.id)}>
                  <Edit className="mr-2 h-4 w-4" />
                  Edit
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  onClick={() => onDelete?.(record.id)}
                  className="text-destructive focus:text-destructive"
                >
                  <Trash2 className="mr-2 h-4 w-4" />
                  Delete
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
