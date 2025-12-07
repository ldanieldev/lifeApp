/**
 * Notifications API Client
 *
 * API client for notification preferences, push subscriptions, and notification history.
 */

import { lifeAppApi } from '@/lib/axios';

// ============================================================================
// Types
// ============================================================================

export interface NotificationPreferences {
  emailEnabled: boolean;
  pushEnabled: boolean;
}

export interface PushSubscriptionRequest {
  endpoint: string;
  p256dhKey: string;
  authKey: string;
  userAgent?: string;
}

export interface NotificationLog {
  id: number;
  channel: 'email' | 'push' | 'sms';
  status: 'pending' | 'sent' | 'failed';
  title: string;
  body: string;
  createdAt: string;
  sentAt: string | null;
}

export interface VapidKeyResponse {
  publicKey: string;
}

// ============================================================================
// API Functions
// ============================================================================

const NOTIFICATIONS_BASE = '/notifications';

/**
 * Get current notification preferences
 */
export async function getNotificationPreferences(): Promise<NotificationPreferences> {
  const response = await lifeAppApi.get<NotificationPreferences>(`${NOTIFICATIONS_BASE}/preferences/`);
  return response.data;
}

/**
 * Update notification preferences
 */
export async function updateNotificationPreferences(
  data: Partial<NotificationPreferences>
): Promise<NotificationPreferences> {
  const response = await lifeAppApi.patch<NotificationPreferences>(`${NOTIFICATIONS_BASE}/preferences/`, data);
  return response.data;
}

/**
 * Get VAPID public key for push subscription
 */
export async function getVapidPublicKey(): Promise<string> {
  const response = await lifeAppApi.get<VapidKeyResponse>(`${NOTIFICATIONS_BASE}/push/vapid-key/`);
  return response.data.publicKey;
}

/**
 * Subscribe to push notifications
 */
export async function subscribeToPush(data: PushSubscriptionRequest): Promise<{ status: string }> {
  const response = await lifeAppApi.post<{ status: string }>(`${NOTIFICATIONS_BASE}/push/subscribe/`, data);
  return response.data;
}

/**
 * Unsubscribe from push notifications
 */
export async function unsubscribeFromPush(endpoint: string): Promise<void> {
  await lifeAppApi.delete(`${NOTIFICATIONS_BASE}/push/subscribe/`, {
    data: { endpoint },
  });
}

/**
 * Get notification history
 */
export async function getNotificationHistory(): Promise<NotificationLog[]> {
  const response = await lifeAppApi.get<NotificationLog[]>(`${NOTIFICATIONS_BASE}/history/`);
  return response.data;
}
