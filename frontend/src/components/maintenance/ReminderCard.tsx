/**
 * Reminder Card Component
 *
 * Displays a maintenance reminder with status indicator.
 */

import { format } from 'date-fns';
import { MoreHorizontal, Edit, Trash2, CheckCircle, AlertTriangle, Clock } from 'lucide-react';
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
import type { ReminderSummary, ReminderDetail } from '@/types/maintenance';

// Accept either ReminderSummary or ReminderDetail
type ReminderCardData = ReminderSummary | ReminderDetail;

interface ReminderCardProps {
  reminder: ReminderCardData;
  onEdit?: (reminderId: number) => void;
  onDelete?: (reminderId: number) => void;
  onComplete?: (reminderId: number) => void;
}

const statusConfig = {
  overdue: {
    icon: AlertTriangle,
    label: 'Overdue',
    variant: 'destructive' as const,
    bgColor: 'bg-destructive/10',
    iconColor: 'text-destructive',
  },
  due_soon: {
    icon: Clock,
    label: 'Due Soon',
    variant: 'outline' as const,
    bgColor: 'bg-yellow-500/10',
    iconColor: 'text-yellow-600',
  },
  upcoming: {
    icon: CheckCircle,
    label: 'Upcoming',
    variant: 'secondary' as const,
    bgColor: 'bg-green-500/10',
    iconColor: 'text-green-600',
  },
};

export function ReminderCard({ reminder, onEdit, onDelete, onComplete }: ReminderCardProps) {
  const status = statusConfig[reminder.status] || statusConfig.upcoming;
  const StatusIcon = status.icon;

  // Get service type name - could be nested object (ReminderDetail) or just id (ReminderSummary)
  const serviceTypeName =
    typeof reminder.serviceType === 'object'
      ? reminder.serviceType?.name
      : (reminder as ReminderSummary).serviceTypeName || 'Reminder';

  // Get last completed info (only in ReminderDetail)
  const lastCompletedDate = 'lastCompletedDate' in reminder ? reminder.lastCompletedDate : null;
  const lastCompletedOdometer = 'lastCompletedOdometer' in reminder ? reminder.lastCompletedOdometer : null;

  const formatInterval = () => {
    const parts: string[] = [];
    if (reminder.mileageInterval) {
      parts.push(`Every ${reminder.mileageInterval.toLocaleString()} miles`);
    }
    if (reminder.timeIntervalMonths) {
      parts.push(`Every ${reminder.timeIntervalMonths} month${reminder.timeIntervalMonths !== 1 ? 's' : ''}`);
    }
    return parts.join(' or ');
  };

  return (
    <Card className={`transition-all hover:shadow-md ${reminder.status === 'overdue' ? 'border-destructive/50' : ''}`}>
      <CardContent className="p-4">
        <div className="flex items-start justify-between">
          <div className="flex items-start gap-3">
            <div className={`flex h-10 w-10 items-center justify-center rounded-lg ${status.bgColor}`}>
              <StatusIcon className={`h-5 w-5 ${status.iconColor}`} />
            </div>
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <h4 className="font-semibold">{serviceTypeName}</h4>
                <Badge variant={status.variant}>{status.label}</Badge>
              </div>
              <p className="text-sm text-muted-foreground">{formatInterval()}</p>

              {lastCompletedDate && (
                <p className="text-xs text-muted-foreground">
                  Last service: {format(new Date(lastCompletedDate), 'MMM d, yyyy')}
                  {lastCompletedOdometer && ` at ${lastCompletedOdometer.toLocaleString()} mi`}
                </p>
              )}

              {reminder.nextDueDate && (
                <p className="text-xs text-muted-foreground">
                  Next due: {format(new Date(reminder.nextDueDate), 'MMM d, yyyy')}
                  {reminder.nextDueOdometer && ` or ${reminder.nextDueOdometer.toLocaleString()} mi`}
                </p>
              )}
            </div>
          </div>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="h-8 w-8">
                <MoreHorizontal className="h-4 w-4" />
                <span className="sr-only">Open menu</span>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              {(reminder.status === 'overdue' || reminder.status === 'due_soon') && (
                <>
                  <DropdownMenuItem onClick={() => onComplete?.(reminder.id)}>
                    <CheckCircle className="mr-2 h-4 w-4" />
                    Mark Complete
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                </>
              )}
              <DropdownMenuItem onClick={() => onEdit?.(reminder.id)}>
                <Edit className="mr-2 h-4 w-4" />
                Edit
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                onClick={() => onDelete?.(reminder.id)}
                className="text-destructive focus:text-destructive"
              >
                <Trash2 className="mr-2 h-4 w-4" />
                Delete
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </CardContent>
    </Card>
  );
}
