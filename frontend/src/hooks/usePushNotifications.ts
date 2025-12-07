/**
 * Push Notifications Hook
 *
 * Custom hook for managing push notification subscriptions.
 * Handles browser permission, service worker registration, and subscription management.
 */

import { useCallback, useEffect, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import * as notificationsApi from '@/api/notifications';
import { isPushSupported, registerServiceWorker } from '@/lib/serviceWorker';

/**
 * Convert a base64 URL-encoded string to a Uint8Array
 * Required for the applicationServerKey in PushManager.subscribe()
 */
function urlBase64ToUint8Array(base64String: string): Uint8Array<ArrayBuffer> {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}

export function usePushNotifications() {
  const queryClient = useQueryClient();
  const [isSubscribed, setIsSubscribed] = useState(false);
  const [isSupported] = useState(isPushSupported);
  const [permissionState, setPermissionState] = useState<NotificationPermission>(
    typeof Notification !== 'undefined' ? Notification.permission : 'default'
  );

  // Fetch VAPID public key
  const { data: vapidKey, isLoading: isLoadingVapidKey } = useQuery({
    queryKey: ['vapidKey'],
    queryFn: notificationsApi.getVapidPublicKey,
    enabled: isSupported,
    staleTime: Infinity, // VAPID key doesn't change
  });

  // Check current subscription status on mount
  useEffect(() => {
    const checkSubscription = async () => {
      if (!isSupported) return;

      try {
        const registration = await navigator.serviceWorker.ready;
        const subscription = await registration.pushManager.getSubscription();
        setIsSubscribed(!!subscription);
      } catch (error) {
        console.error('Failed to check push subscription:', error);
      }
    };

    checkSubscription();
  }, [isSupported]);

  // Subscribe mutation
  const subscribeMutation = useMutation({
    mutationFn: async () => {
      if (!vapidKey) {
        throw new Error('VAPID key not available');
      }

      // Ensure service worker is registered
      await registerServiceWorker();
      const registration = await navigator.serviceWorker.ready;

      // Subscribe to push
      const subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(vapidKey),
      });

      // Extract keys from subscription
      const json = subscription.toJSON();
      if (!json.keys?.p256dh || !json.keys?.auth) {
        throw new Error('Failed to get push subscription keys');
      }

      // Send subscription to server
      await notificationsApi.subscribeToPush({
        endpoint: subscription.endpoint,
        p256dhKey: json.keys.p256dh,
        authKey: json.keys.auth,
        userAgent: navigator.userAgent,
      });

      return subscription;
    },
    onSuccess: () => {
      setIsSubscribed(true);
      toast.success('Push notifications enabled');
      queryClient.invalidateQueries({ queryKey: ['notificationPreferences'] });
    },
    onError: (error) => {
      console.error('Failed to subscribe to push:', error);
      toast.error('Failed to enable push notifications', {
        description: error instanceof Error ? error.message : 'Unknown error',
      });
    },
  });

  // Unsubscribe mutation
  const unsubscribeMutation = useMutation({
    mutationFn: async () => {
      const registration = await navigator.serviceWorker.ready;
      const subscription = await registration.pushManager.getSubscription();

      if (subscription) {
        // Notify server before unsubscribing
        await notificationsApi.unsubscribeFromPush(subscription.endpoint);
        // Unsubscribe from browser
        await subscription.unsubscribe();
      }
    },
    onSuccess: () => {
      setIsSubscribed(false);
      toast.success('Push notifications disabled');
      queryClient.invalidateQueries({ queryKey: ['notificationPreferences'] });
    },
    onError: (error) => {
      console.error('Failed to unsubscribe from push:', error);
      toast.error('Failed to disable push notifications');
    },
  });

  // Request notification permission
  const requestPermission = useCallback(async (): Promise<boolean> => {
    if (!isSupported) return false;

    try {
      const permission = await Notification.requestPermission();
      setPermissionState(permission);
      return permission === 'granted';
    } catch (error) {
      console.error('Failed to request notification permission:', error);
      return false;
    }
  }, [isSupported]);

  // Destructure mutate functions for stable references
  const { mutate: doSubscribe } = subscribeMutation;
  const { mutate: doUnsubscribe } = unsubscribeMutation;

  // Subscribe to push (with permission handling)
  const subscribe = useCallback(async () => {
    if (!isSupported) {
      toast.error('Push notifications not supported in this browser');
      return;
    }

    // Check permission
    if (permissionState !== 'granted') {
      const granted = await requestPermission();
      if (!granted) {
        toast.error('Notification permission denied');
        return;
      }
    }

    doSubscribe();
  }, [isSupported, permissionState, requestPermission, doSubscribe]);

  // Unsubscribe from push
  const unsubscribe = useCallback(() => {
    doUnsubscribe();
  }, [doUnsubscribe]);

  return {
    isSupported,
    isSubscribed,
    permissionState,
    isPending: subscribeMutation.isPending || unsubscribeMutation.isPending || isLoadingVapidKey,
    subscribe,
    unsubscribe,
    requestPermission,
  };
}
