/*
 * Push-Handler für den Service Worker.
 * Wird vom generierten Workbox-SW per importScripts geladen (vite.config.js).
 * Payload (von /api/send-push): { title, body, tab, tag, channel?, sender? }
 */

const MAX_LINES = 4; // so viele letzte Nachrichten zeigt eine gebündelte Benachrichtigung

self.addEventListener('push', (event) => {
  let data = {};
  try { data = event.data ? event.data.json() : {}; } catch { data = { body: event.data?.text() }; }

  event.waitUntil((async () => {
    let title = data.title || 'IMPULS';
    let body = data.body || '';
    const isGroup = data.channel === 'group';
    const line = isGroup && data.sender ? `${data.sender}: ${body}` : body;
    let count = 1;
    let lines = [line];

    // Chat-Nachrichten bündeln: noch sichtbare Benachrichtigungen derselben Unterhaltung
    // einsammeln, schließen und als eine zusammengefasste Benachrichtigung neu zeigen.
    // (Android ersetzt per `tag` ohnehin — iOS stapelt sonst jede Nachricht einzeln.)
    if (data.tag && data.sender) {
      const previous = await self.registration.getNotifications({ tag: data.tag }).catch(() => []);
      for (const n of previous) {
        count += n.data?.count || 1;
        lines = [...(n.data?.lines || [n.body]), ...lines];
        n.close();
      }
      if (count > 1) {
        title = isGroup ? `Gruppenchat · ${count} neue Nachrichten` : `${data.sender} · ${count} neue Nachrichten`;
        body = lines.slice(-MAX_LINES).join('\n');
      } else if (isGroup) {
        body = line;
        title = 'Gruppenchat';
      }
    }

    await self.registration.showNotification(title, {
      body,
      icon: '/icon-192.png',
      badge: '/icon-192.png',
      tag: data.tag,          // gleiche Unterhaltung → ersetzt statt stapelt
      renotify: !!data.tag,
      data: { tab: data.tab || 'home', channel: data.channel || null, count, lines: lines.slice(-MAX_LINES) },
    });
  })());
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const tab = event.notification.data?.tab || 'home';
  const channel = event.notification.data?.channel || null; // z.B. 'group' | 'direct:<id>'
  event.waitUntil((async () => {
    // App wird geöffnet → alle übrigen IMPULS-Benachrichtigungen wegräumen
    const open = await self.registration.getNotifications().catch(() => []);
    open.forEach((n) => n.close());

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
