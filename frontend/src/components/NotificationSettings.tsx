/**
 * Notification Settings Component
 *
 * Allows users to manage their notification preferences including
 * email notifications and push notifications.
 */

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Bell, BellOff, Mail, Smartphone } from 'lucide-react';
import { toast } from 'sonner';
import * as notificationsApi from '@/api/notifications';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/shadcn/card';
import { Label } from '@/components/shadcn/label';
import { Switch } from '@/components/shadcn/switch';
import { Skeleton } from '@/components/shadcn/skeleton';
import { usePushNotifications } from '@/hooks/usePushNotifications';

export function NotificationSettings() {
  const queryClient = useQueryClient();
  const { isSupported, isSubscribed, isPending: pushPending, subscribe, unsubscribe } = usePushNotifications();

  // Fetch notification preferences
  const {
    data: preferences,
    isLoading,
    error,
  } = useQuery({
    queryKey: ['notificationPreferences'],
    queryFn: notificationsApi.getNotificationPreferences,
  });

  // Update preferences mutation
  const updatePreferencesMutation = useMutation({
    mutationFn: notificationsApi.updateNotificationPreferences,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notificationPreferences'] });
    },
    onError: (error) => {
      toast.error('Failed to update preferences', {
        description: error instanceof Error ? error.message : 'Unknown error',
      });
    },
  });

  const handleEmailToggle = (enabled: boolean) => {
    updatePreferencesMutation.mutate({ emailEnabled: enabled });
  };

  const handlePushToggle = async (enabled: boolean) => {
    // Update preference on server
    updatePreferencesMutation.mutate({ pushEnabled: enabled });

    // Handle actual push subscription
    if (enabled) {
      await subscribe();
    } else {
      unsubscribe();
    }
  };

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Notifications</CardTitle>
          <CardDescription>Manage how you receive notifications</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <Skeleton className="h-4 w-32" />
              <Skeleton className="h-3 w-48" />
            </div>
            <Skeleton className="h-5 w-9" />
          </div>
          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <Skeleton className="h-4 w-32" />
              <Skeleton className="h-3 w-48" />
            </div>
            <Skeleton className="h-5 w-9" />
          </div>
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Notifications</CardTitle>
          <CardDescription>Manage how you receive notifications</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-2 text-destructive">
            <BellOff className="h-4 w-4" />
            <p className="text-sm">Failed to load notification preferences</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-2">
          <Bell className="h-5 w-5" />
          <div>
            <CardTitle>Notifications</CardTitle>
            <CardDescription>Manage how you receive notifications</CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Email Notifications */}
        <div className="flex items-center justify-between">
          <div className="flex items-start gap-3">
            <Mail className="h-5 w-5 text-muted-foreground mt-0.5" />
            <div className="space-y-1">
              <Label htmlFor="email-notifications" className="text-base font-medium">
                Email Notifications
              </Label>
              <p className="text-sm text-muted-foreground">Receive notifications via email</p>
            </div>
          </div>
          <Switch
            id="email-notifications"
            checked={preferences?.emailEnabled ?? true}
            onCheckedChange={handleEmailToggle}
            disabled={updatePreferencesMutation.isPending}
          />
        </div>

        {/* Push Notifications */}
        <div className="flex items-center justify-between">
          <div className="flex items-start gap-3">
            <Smartphone className="h-5 w-5 text-muted-foreground mt-0.5" />
            <div className="space-y-1">
              <Label htmlFor="push-notifications" className="text-base font-medium">
                Push Notifications
              </Label>
              <p className="text-sm text-muted-foreground">
                {isSupported ? 'Receive browser push notifications' : 'Not supported in this browser'}
              </p>
              {isSupported && isSubscribed && (
                <p className="text-xs text-green-600 dark:text-green-400">Push notifications are active</p>
              )}
            </div>
          </div>
          <Switch
            id="push-notifications"
            checked={preferences?.pushEnabled && isSubscribed}
            onCheckedChange={handlePushToggle}
            disabled={!isSupported || pushPending || updatePreferencesMutation.isPending}
          />
        </div>
      </CardContent>
    </Card>
  );
}
