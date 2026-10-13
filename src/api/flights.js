/*
 * Flug-Integration.
 *
 * Live-Daten kommen über die Serverless Function api/flight.js (AviationStack,
 * Key nur serverseitig als AVIATIONSTACK_KEY in Vercel). Die Funktion fragt
 * nur zu festen Zeitpunkten rund um den Abflug ab und cacht das Ergebnis für
 * alle Reisenden. Der Client fragt nur die Funktion — und zwar erneut erst
 * zum nächsten geplanten Abfragezeitpunkt (nextCheckAt).
 *
 * Ohne Supabase/Key, vor dem ersten Abfragezeitpunkt oder bei Fehlern zeigt
 * die Kachel einfach die im Admin-Modus gepflegten Daten.
 */

import { useState, useEffect } from 'react';
import { supabase, isSupabaseConfigured } from '../lib/supabase.js';

const RECHECK_BUFFER_MS = 30 * 1000; // kurz nach dem Slot fragen, damit der Server schon fertig ist

function formatAgo(iso) {
  if (!iso) return null;
  const min = Math.round((Date.now() - new Date(iso).getTime()) / 60000);
  if (min < 1) return 'gerade eben';
  if (min < 60) return `vor ${min} Min`;
  const h = Math.round(min / 60);
  return h < 24 ? `vor ${h} Std` : new Date(iso).toLocaleString('de-DE', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' });
}

async function fetchLive(tileId) {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) return null;
  const res = await fetch(`/api/flight?tile=${encodeURIComponent(tileId)}`, {
    headers: { Authorization: `Bearer ${session.access_token}` },
  });
  if (!res.ok) return null;
  return res.json();
}

/**
 * Liefert die Kachel-Daten, überlagert mit Live-Daten sobald vorhanden.
 * live: Server ist konfiguriert; nextCheckAt: nächste geplante Abfrage.
 */
export function useFlight(tileId, tileData) {
  const [live, setLive] = useState(null);
  const [, setTick] = useState(0); // für "vor X Min"

  useEffect(() => {
    if (!isSupabaseConfigured || !tileId) return;
    let cancelled = false;
    let timer;
    const load = async () => {
      clearTimeout(timer);
      try {
        const r = await fetchLive(tileId);
        if (cancelled || !r) return;
        setLive(r);
        if (r.nextCheckAt) {
          const wait = new Date(r.nextCheckAt).getTime() - Date.now() + RECHECK_BUFFER_MS;
          timer = setTimeout(load, Math.min(Math.max(wait, RECHECK_BUFFER_MS), 2 ** 31 - 1));
        }
      } catch (err) {
        console.warn('[flights]', err.message);
      }
    };
    load();
    // Handy aus dem Standby → Timer können verpasst sein, einmal nachfragen
    const onVisible = () => { if (document.visibilityState === 'visible') load(); };
    document.addEventListener('visibilitychange', onVisible);
    const tick = setInterval(() => setTick((n) => n + 1), 60 * 1000);
    return () => {
      cancelled = true;
      clearTimeout(timer);
      clearInterval(tick);
      document.removeEventListener('visibilitychange', onVisible);
    };
  }, [tileId, tileData.number, tileData.fromDate, tileData.fromScheduled, tileData.fromCode]);

  const hasLive = !!live?.data;
  return {
    data: {
      ...tileData,
      ...(live?.data || {}),
      lastUpdated: hasLive ? formatAgo(live.fetchedAt) : tileData.lastUpdated,
    },
    live: !!live?.live,
    hasLive,
    nextCheckAt: live?.nextCheckAt || null,
  };
}
