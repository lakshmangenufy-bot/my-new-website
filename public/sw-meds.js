// StrokeCare AI — Medication Reminder Notification Service Worker
self.addEventListener('install', (event) => {
  event.waitUntil(self.skipWaiting());
});

self.addEventListener('activate', (event) => {
  event.waitUntil(self.clients.claim());
});

self.addEventListener('notificationclick', (event) => {
  const notification = event.notification;
  const action = event.action || 'open';
  const period = notification.data && notification.data.period ? notification.data.period : 'morning';

  notification.close();

  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      for (const client of clientList) {
        if ('focus' in client) {
          client.focus();
          client.postMessage({
            type: 'MED_ALERT_ACTION',
            action,
            period,
          });
          return;
        }
      }
      if (self.clients.openWindow) {
        return self.clients.openWindow('/#medicine-section');
      }
      return undefined;
    })
  );
});
