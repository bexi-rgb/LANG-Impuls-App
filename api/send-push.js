/*
 * Vercel Serverless Function: verschickt Push-Benachrichtigungen.
 *
 * Wird vom Client direkt nach dem Speichern einer Chat-Nachricht bzw. eines
 * Broadcasts aufgerufen: POST { kind: 'message' | 'broadcast' | 'reaction' | 'comment', id }.
 * Den Inhalt lesen wir selbst aus der Datenbank (nicht aus dem Request), und
 * prüfen, dass der Aufrufer auch der Absender ist — so kann niemand über
 * diesen Endpunkt beliebige Texte an alle schicken.
 *
 * Env-Vars (Vercel): VITE_SUPABASE_URL, VITE_SUPABASE_ANON_KEY,
 * SUPABASE_SERVICE_ROLE_KEY, VITE_VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY
 */

import { createClient } from '@supabase/supabase-js';
import webpush from 'web-push';

const SUPABASE_URL = process.env.VITE_SUPABASE_URL;
const ANON_KEY = process.env.VITE_SUPABASE_ANON_KEY;
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const VAPID_PUBLIC = process.env.VITE_VAPID_PUBLIC_KEY;
const VAPID_PRIVATE = process.env.VAPID_PRIVATE_KEY;

const truncate = (s, n) => (s.length > n ? `${s.slice(0, n - 1)}…` : s);

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Method not allowed' });
    return;
  }
  if (!SUPABASE_URL || !ANON_KEY || !SERVICE_ROLE_KEY || !VAPID_PUBLIC || !VAPID_PRIVATE) {
    res.status(500).json({ error: 'Push ist serverseitig nicht konfiguriert (VAPID-Keys / Service-Role-Key fehlen in Vercel).' });
    return;
  }

  const token = (req.headers.authorization || '').replace(/^Bearer\s+/i, '');
  if (!token) {
    res.status(401).json({ error: 'Nicht angemeldet.' });
    return;
  }
  const callerClient = createClient(SUPABASE_URL, ANON_KEY, {
    global: { headers: { Authorization: `Bearer ${token}` } },
  });
  const { data: userData, error: userErr } = await callerClient.auth.getUser(token);
  if (userErr || !userData?.user) {
    res.status(401).json({ error: 'Ungültige Sitzung.' });
    return;
  }
  const callerId = userData.user.id;

  const { kind, id, emoji } = req.body || {};
  if (!id || !['message', 'broadcast', 'reaction', 'comment'].includes(kind)) {
    res.status(400).json({ error: 'kind und id sind erforderlich.' });
    return;
  }

  const admin = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);
  const { data: travelers, error: travErr } = await admin.from('travelers').select('id, name, role');
  if (travErr) {
    res.status(500).json({ error: travErr.message });
    return;
  }
  const byId = Object.fromEntries(travelers.map((t) => [t.id, t]));
  const caller = byId[callerId];

  let recipients = [];
  let payload;
  // Mehrere Empfängergruppen mit unterschiedlichem Text (z.B. Foto-Autor vs. Mitkommentierende)
  const batches = [];

  if (kind === 'message') {
    const { data: msg, error } = await admin.from('messages').select('channel, sender_id, text').eq('id', id).single();
    if (error || !msg) { res.status(404).json({ error: 'Nachricht nicht gefunden.' }); return; }
    if (msg.sender_id !== callerId) { res.status(403).json({ error: 'Nicht der Absender.' }); return; }

    const senderName = caller?.name || 'Jemand';
    if (msg.channel === 'group') {
      recipients = travelers.filter((t) => t.id !== callerId).map((t) => t.id);
      payload = { title: `Gruppenchat · ${senderName}`, body: truncate(msg.text || '📷 Foto', 180), tab: 'chat', channel: 'group', tag: 'group', sender: senderName };
    } else if (msg.channel.startsWith('direct:')) {
      const travelerId = msg.channel.slice('direct:'.length);
      // Reisender schreibt → an alle Admins; Admin schreibt → an den Reisenden
      recipients = travelerId === callerId
        ? travelers.filter((t) => t.role === 'admin' && t.id !== callerId).map((t) => t.id)
        : [travelerId];
      payload = { title: senderName, body: truncate(msg.text || '📷 Foto', 180), tab: 'chat', channel: msg.channel, tag: msg.channel, sender: senderName };
    }
  } else if (kind === 'reaction') {
    const { data: msg, error } = await admin.from('messages').select('channel, sender_id, text, reactions').eq('id', id).single();
    if (error || !msg) { res.status(404).json({ error: 'Nachricht nicht gefunden.' }); return; }
    // Nur echte, gespeicherte Reaktionen des Aufrufers melden
    if (!emoji || !(msg.reactions?.[emoji] || []).includes(callerId)) { res.status(403).json({ error: 'Reaktion nicht gefunden.' }); return; }
    if (msg.sender_id !== callerId) {
      const firstName = (caller?.name || 'Jemand').split(' ')[0];
      recipients = [msg.sender_id];
      payload = {
        title: `${firstName} hat reagiert ${emoji}`,
        body: `${firstName} hat mit ${emoji} auf deine Nachricht reagiert: „${truncate(msg.text || 'Foto', 120)}“`,
        tab: 'chat', channel: msg.channel, tag: `reaction-${id}`,
      };
    }
  } else if (kind === 'comment') {
    const { data: c, error } = await admin.from('photo_comments').select('photo_id, author_id, text').eq('id', id).single();
    if (error || !c) { res.status(404).json({ error: 'Kommentar nicht gefunden.' }); return; }
    if (c.author_id !== callerId) { res.status(403).json({ error: 'Nicht der Verfasser.' }); return; }
    const { data: photo, error: photoErr } = await admin.from('photos').select('author_id, title').eq('id', c.photo_id).single();
    if (photoErr || !photo) { res.status(404).json({ error: 'Foto nicht gefunden.' }); return; }
    const { data: others } = await admin.from('photo_comments').select('author_id').eq('photo_id', c.photo_id);

    const firstName = (caller?.name || 'Jemand').split(' ')[0];
    const text = truncate(c.text, 140);
    const tag = `comment-${c.photo_id}`; // weitere Kommentare zum selben Foto ersetzen die alte Meldung
    if (photo.author_id !== callerId) {
      batches.push({
        recipients: [photo.author_id],
        payload: { title: `${firstName} hat dein Foto kommentiert`, body: `„${text}“`, tab: 'photos', tag },
      });
    }
    // Alle, die das Foto schon kommentiert haben — außer Aufrufer und Foto-Autor
    const commenters = [...new Set((others || []).map((o) => o.author_id))]
      .filter((uid) => uid !== callerId && uid !== photo.author_id && byId[uid]);
    if (commenters.length) {
      batches.push({
        recipients: commenters,
        payload: { title: `${firstName} hat auch kommentiert`, body: `Zum Foto „${truncate(photo.title, 40)}“: „${text}“`, tab: 'photos', tag },
      });
    }
  } else {
    if (caller?.role !== 'admin') { res.status(403).json({ error: 'Nur Admins.' }); return; }
    const { data: n, error } = await admin.from('notifications').select('text, recipient_id').eq('id', id).single();
    if (error || !n) { res.status(404).json({ error: 'Benachrichtigung nicht gefunden.' }); return; }
    recipients = n.recipient_id ? [n.recipient_id] : travelers.filter((t) => t.id !== callerId).map((t) => t.id);
    payload = { title: 'IMPULS · Update', body: truncate(n.text.replace(/^BROADCAST:\s*/, ''), 180), tab: 'home', tag: `broadcast-${id}` };
  }

  if (recipients.length && payload) batches.push({ recipients, payload });
  const allRecipients = batches.flatMap((b) => b.recipients);
  if (!allRecipients.length) {
    res.status(200).json({ sent: 0 });
    return;
  }

  const { data: subs, error: subsErr } = await admin
    .from('push_subscriptions')
    .select('endpoint, traveler_id, subscription')
    .in('traveler_id', allRecipients);
  if (subsErr) {
    res.status(500).json({ error: subsErr.message });
    return;
  }

  webpush.setVapidDetails('mailto:rebekka.gingell@lang-ag.com', VAPID_PUBLIC, VAPID_PRIVATE);
  const bodyFor = (travelerId) => {
    const batch = batches.find((b) => b.recipients.includes(travelerId));
    return JSON.stringify(batch.payload);
  };
  const results = await Promise.allSettled(
    subs.map((s) => webpush.sendNotification(s.subscription, bodyFor(s.traveler_id), { TTL: 60 * 60 * 24, urgency: 'high' }))
  );

  // Abgelaufene Registrierungen (Gerät hat Push widerrufen / App gelöscht) aufräumen
  const gone = subs
    .filter((_, i) => results[i].status === 'rejected' && [404, 410].includes(results[i].reason?.statusCode))
    .map((s) => s.endpoint);
  if (gone.length) await admin.from('push_subscriptions').delete().in('endpoint', gone);

  const sent = results.filter((r) => r.status === 'fulfilled').length;
  res.status(200).json({ sent, failed: results.length - sent, removed: gone.length });
}
