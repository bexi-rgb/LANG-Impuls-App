/*
 * Flug-Integration.
 *
 * Aktueller Adapter: MOCK — gibt die Tile-Daten unverändert zurück.
 * Alternative Adapter (mit API-Key aktivierbar):
 *   • AviationStack (100 Requests/Monat gratis, danach $50/Monat)
 *     https://aviationstack.com
 *   • AeroDataBox (~500 Requests gratis, danach ab $10/Monat)
 *     https://aerodatabox.com
 *   • FlightAware AeroAPI (kein Free-Tier, beste Datenqualität, $0.004/Request)
 *     https://flightaware.com/commercial/aeroapi
 *
 * Aktivierung eines Live-Adapters:
 *   1. Registrierung beim Anbieter, API-Key holen
 *   2. `.env.local` im Projekt-Root anlegen mit:
 *        VITE_FLIGHT_API_PROVIDER=aviationstack
 *        VITE_AVIATIONSTACK_KEY=dein_key
 *   3. Dev-Server neu starten
 *
 * WICHTIG: Die `.env.local` niemals ins Git-Repo einchecken (steht in .gitignore).
 * VITE_-Präfix macht Env-Variablen im Browser sichtbar — also NIE Secrets die
 * du wirklich privat halten musst. Für Production-Deployments den API-Call auf
 * ein Backend (Vercel Serverless Function o.Ä.) verlagern.
 */

import { useState, useEffect } from 'react';

const PROVIDER = import.meta.env.VITE_FLIGHT_API_PROVIDER || 'mock';

/**
 * Normalisiertes Flug-Objekt für die UI. Alle Adapter mappen ihre
 * Rohdaten auf dieses Format, damit FlightCard sich nicht ändert.
 */
function normalizeFlight(raw) {
  return {
    number: raw.number,
    airline: raw.airline,
    aircraft: raw.aircraft,
    status: raw.status,               // 'ON_TIME' | 'DELAYED' | 'BOARDING' | ...
    fromCode: raw.fromCode,
    fromCity: raw.fromCity,
    fromTerminal: raw.fromTerminal,
    fromGate: raw.fromGate,
    fromDate: raw.fromDate,
    fromScheduled: raw.fromScheduled,
    fromEstimated: raw.fromEstimated,
    toCode: raw.toCode,
    toCity: raw.toCity,
    toTerminal: raw.toTerminal,
    toDate: raw.toDate,
    toScheduled: raw.toScheduled,
    toEstimated: raw.toEstimated,
    delayMinutes: raw.delayMinutes || 0,
    lastUpdated: raw.lastUpdated || 'gerade eben',
  };
}

// ── MOCK-Adapter ──────────────────────────────────────────────────
async function fetchMock(flightNumber, tileData) {
  // Kein Netzwerk-Call, gibt einfach die Tile-Daten zurück.
  return normalizeFlight(tileData);
}

// ── AviationStack-Adapter (Skelett) ───────────────────────────────
async function fetchAviationStack(flightNumber, tileData) {
  const key = import.meta.env.VITE_AVIATIONSTACK_KEY;
  if (!key) throw new Error('VITE_AVIATIONSTACK_KEY nicht gesetzt');

  const url = new URL('https://api.aviationstack.com/v1/flights');
  url.searchParams.set('access_key', key);
  url.searchParams.set('flight_iata', flightNumber.replace(/\s+/g, ''));

  const res = await fetch(url);
  if (!res.ok) throw new Error(`AviationStack: ${res.status}`);
  const data = await res.json();
  const flight = data.data?.[0];
  if (!flight) throw new Error(`Flug ${flightNumber} nicht gefunden`);

  // Mapping von AviationStack-Feldern auf unser normalisiertes Format.
  const dep = flight.departure || {};
  const arr = flight.arrival || {};
  const statusMap = {
    scheduled: 'SCHEDULED', active: 'DEPARTED', landed: 'ARRIVED',
    cancelled: 'CANCELLED', incident: 'CANCELLED', diverted: 'DELAYED',
  };

  return normalizeFlight({
    ...tileData, // Fallbacks aus Tile-Daten übernehmen
    number: flightNumber,
    airline: flight.airline?.name || tileData.airline,
    status: statusMap[flight.flight_status] || 'SCHEDULED',
    fromTerminal: dep.terminal || tileData.fromTerminal,
    fromGate: dep.gate || tileData.fromGate,
    fromScheduled: dep.scheduled?.slice(11, 16) || tileData.fromScheduled,
    fromEstimated: dep.estimated?.slice(11, 16) || dep.scheduled?.slice(11, 16),
    toTerminal: arr.terminal || tileData.toTerminal,
    toScheduled: arr.scheduled?.slice(11, 16) || tileData.toScheduled,
    toEstimated: arr.estimated?.slice(11, 16) || arr.scheduled?.slice(11, 16),
    delayMinutes: dep.delay || 0,
    lastUpdated: 'gerade eben',
  });
}

// ── Adapter-Auswahl ───────────────────────────────────────────────
const ADAPTERS = {
  mock: fetchMock,
  aviationstack: fetchAviationStack,
};

export const CURRENT_PROVIDER = PROVIDER;
export const isLiveProvider = PROVIDER !== 'mock';

/**
 * Öffentliches API — sucht den Adapter für den aktuellen Provider aus.
 * Bei Fehler fällt es auf die Tile-Daten zurück, damit die UI nicht bricht.
 */
export async function fetchFlight(flightNumber, tileData) {
  const adapter = ADAPTERS[PROVIDER] || ADAPTERS.mock;
  try {
    return await adapter(flightNumber, tileData);
  } catch (err) {
    console.warn(`[flights] ${PROVIDER}-Adapter fehlgeschlagen, Fallback auf Tile-Daten:`, err.message);
    return normalizeFlight(tileData);
  }
}

/**
 * React-Hook — lädt einen Flug und refresht ihn periodisch.
 * Im MOCK-Modus deaktiviert (keine Netzwerk-Kosten), da die Daten
 * ohnehin aus dem lokalen State kommen.
 */
export function useFlight(flightNumber, tileData, refreshMs = 15 * 60 * 1000) {
  const [state, setState] = useState({
    data: normalizeFlight(tileData),
    error: null,
    loading: false,
    live: isLiveProvider,
  });

  useEffect(() => {
    // Bei geändertem tileData: sofort spiegeln, damit Editier-Modus reagiert
    setState((s) => ({ ...s, data: normalizeFlight(tileData) }));
  }, [JSON.stringify(tileData)]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (!isLiveProvider || !flightNumber) return;
    let cancelled = false;
    const load = async () => {
      setState((s) => ({ ...s, loading: true }));
      try {
        const d = await fetchFlight(flightNumber, tileData);
        if (!cancelled) setState({ data: d, error: null, loading: false, live: true });
      } catch (err) {
        if (!cancelled) setState((s) => ({ ...s, error: err.message, loading: false }));
      }
    };
    load();
    const id = setInterval(load, refreshMs);
    return () => { cancelled = true; clearInterval(id); };
  }, [flightNumber, refreshMs]); // eslint-disable-line react-hooks/exhaustive-deps

  return state;
}
