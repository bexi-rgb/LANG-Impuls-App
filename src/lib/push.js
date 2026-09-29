/*
 * Web-Push im Browser: Gerät registrieren, abmelden, Versand anstoßen.
 *
 * iOS: Push funktioniert nur in der Home-Screen-App (ab iOS 16.4), und die
 * Berechtigungsabfrage darf nur nach einem Tippen des Nutzers kommen —
 * deshalb gibt es einen expliziten "Aktivieren"-Button (PushPrompt).
 */

import { supabase, isSupabaseConfigured } from './supabase.js';

const VAPID_PUBLIC_KEY = import.meta.env.VITE_VAPID_PUBLIC_KEY;

function urlBase64ToUint8Array(base64) {
  const padding = '='.repeat((4 - (base64.length % 4)) % 4);
  const raw = atob((base64 + padding).replace(/-/g, '+').replace(/_/g, '/'));
  return Uint8Array.from(raw, (c) => c.charCodeAt(0));
}

const isIOS = () => /iPad|iPhone|iPod/.test(navigator.userAgent)
  || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
const isStandalone = () => navigator.standalone === true
  || window.matchMedia?.('(display-mode: standalone)').matches;

/**
 * 'unsupported' | 'needs-install' | 'default' | 'granted' | 'denied'
 */
export function pushState() {
  if (!isSupabaseConfigured || !VAPID_PUBLIC_KEY) return 'unsupported';
  if (isIOS() && !isStandalone()) return 'needs-install';
  if (!('serviceWorker' in navigator) || !('PushManager' in window) || !('Notification' in window)) return 'unsupported';
  return Notification.permission;
}

async function saveSubscription(userId) {
  const reg = await navigator.serviceWorker.ready;
  let sub = await reg.pushManager.getSubscription();
  if (!sub) {
    sub = await reg.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY),
    });
  }
  const json = sub.toJSON();
  const { error } = await supabase
    .from('push_subscriptions')
    .upsert({ endpoint: json.endpoint, traveler_id: userId, subscription: json }, { onConflict: 'endpoint' });
  if (error) throw error;
}

/** Nach Tippen auf "Aktivieren": Berechtigung anfragen + Gerät registrieren. */
export async function enablePush(userId) {
  const permission = await Notification.requestPermission();
  if (permission !== 'granted') return permission;
  await saveSubscription(userId);
  return 'granted';
}

/** Beim App-Start: bereits erlaubte Geräte stillschweigend (neu) registrieren. */
export async function syncPush(userId) {
  if (pushState() !== 'granted') return;
  try { await saveSubscription(userId); } catch (e) { console.warn('[push] sync', e.message); }
}

/** Beim Logout: Gerät abmelden, damit der nächste Nutzer keine fremden Pushes bekommt. */
export async function disablePush() {
  if (!('serviceWorker' in navigator) || !isSupabaseConfigured) return;
  try {
    const reg = await navigator.serviceWorker.getRegistration();
    const sub = await reg?.pushManager.getSubscription();
    if (!sub) return;
    await supabase.from('push_subscriptions').delete().eq('endpoint', sub.endpoint);
    await sub.unsubscribe();
  } catch (e) {
    console.warn('[push] disable', e.message);
  }
}

/** Versand anstoßen (fire-and-forget) — Server liest Inhalt + Empfänger selbst aus der DB. */
export async function triggerPush(kind, id, extra = {}) {
  if (!isSupabaseConfigured || !id) return;
  try {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return;
    await fetch('/api/send-push', {
      method: 'POST',
      keepalive: true,
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${session.access_token}` },
      body: JSON.stringify({ kind, id, ...extra }),
    });
  } catch (e) {
    console.warn('[push] trigger', e.message);
  }
}
