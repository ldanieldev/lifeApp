/**
 * Service Worker for Push Notifications
 *
 * This service worker handles:
 * - Receiving push notifications from the server
 * - Displaying notifications to the user
 * - Handling notification clicks to navigate to relevant pages
 */

self.addEventListener('push', (event) => {
  const data = event.data?.json() || {};

  const title = data.title || 'Notification';
  const options = {
    body: data.body || '',
    icon: '/icon-192.png',
    badge: '/badge-72.png',
    tag: data.data?.type || 'default',
    data: data.data || {},
    requireInteraction: false,
  };

  event.waitUntil(self.registration.showNotification(title, options));
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();

  const data = event.notification.data;
  let url = '/';

  // Route based on notification type
  if (data.type === 'habit_reminder') {
    url = `/habits/${data.habit_id}`;
  } else if (data.type === 'todo_due') {
    url = `/todos/${data.todo_id}`;
  } else if (data.type === 'fitness_reminder') {
    url = `/fitness/${data.fitness_id}`;
  } else if (data.url) {
    url = data.url;
  }

  event.waitUntil(
    clients.matchAll({ type: 'window' }).then((clientList) => {
      // Focus existing window if available
      for (const client of clientList) {
        if (client.url.includes(self.location.origin) && 'focus' in client) {
          client.navigate(url);
          return client.focus();
        }
      }
      // Open new window
      if (clients.openWindow) {
        return clients.openWindow(url);
      }
    })
  );
});
