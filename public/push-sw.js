/*
 * Push-Handler für den Service Worker.
 * Wird vom generierten Workbox-SW per importScripts geladen (vite.config.js).
 * Payload (von /api/send-push): { title, body, tab, tag }
 */

self.addEventListener('push', (event) => {
  let data = {};
  try { data = event.data ? event.data.json() : {}; } catch { data = { body: event.data?.text() }; }

  const title = data.title || 'IMPULS';
  event.waitUntil(
    self.registration.showNotification(title, {
      body: data.body || '',
      icon: '/icon-192.png',
      badge: '/icon-192.png',
      tag: data.tag,          // gleiche Unterhaltung → ersetzt statt stapelt
      renotify: !!data.tag,
      data: { tab: data.tab || 'home', channel: data.channel || null },
    })
  );
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const tab = event.notification.data?.tab || 'home';
  const channel = event.notification.data?.channel || null; // z.B. 'group' | 'direct:<id>'
  event.waitUntil((async () => {
    const all = await self.clients.matchAll({ type: 'window', includeUncontrolled: true });
    const client = all[0];
    if (client) {
      client.postMessage({ type: 'open-tab', tab, channel });
      return client.focus();
    }
    const qs = `tab=${encodeURIComponent(tab)}${channel ? `&channel=${encodeURIComponent(channel)}` : ''}`;
    return self.clients.openWindow(`/?${qs}`);
  })());
});
