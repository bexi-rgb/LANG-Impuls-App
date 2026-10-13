/*
 * Vercel Serverless Function: Live-Flugdaten über AviationStack.
 *
 * GET /api/flight?tile=<home_tiles.id>  (mit Bearer-Token eines eingeloggten Users)
 *
 * Flugnummer, Abflugdatum und -zeit lesen wir selbst aus der Kachel in der
 * Datenbank — der Client kann also keine beliebigen Flüge abfragen und das
 * Kontingent (Free-Plan: 100 Requests/Monat) verbrauchen.
 *
 * Abfragen passieren nur zu festen Zeitpunkten relativ zum geplanten Abflug
 * (Ortszeit des Abflughafens), siehe buildSlots(). Das Ergebnis wird in
 * app_config unter 'flight:<tileId>' gecacht und an alle Clients ausgeliefert;
 * egal wie viele Reisende die App offen haben, pro Zeitpunkt gibt es genau
 * einen API-Call.
 *
 * Env-Vars (Vercel): VITE_SUPABASE_URL, VITE_SUPABASE_ANON_KEY,
 * SUPABASE_SERVICE_ROLE_KEY, AVIATIONSTACK_KEY
 */

import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.VITE_SUPABASE_URL;
const ANON_KEY = process.env.VITE_SUPABASE_ANON_KEY;
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const AVIATIONSTACK_KEY = process.env.AVIATIONSTACK_KEY;

const MIN = 60 * 1000;
const HOUR = 60 * MIN;

// Abfrage-Plan relativ zum geplanten Abflug
const EARLY_CHECKS = [8 * HOUR, 4 * HOUR];  // z.B. 10:35-Abflug → 02:35, 06:35
const FREQUENT_FROM = 3.5 * HOUR;            // ab dann alle 15 Min bis zum Abflug
const FREQUENT_EVERY = 15 * MIN;
const MAX_DELAY_EXTENSION = 3 * HOUR;        // bei Verspätung weiter bis zum neuen Abflug, max. +3 h
const ARRIVAL_CHECK_AFTER = 15 * MIN;        // eine Abfrage kurz nach der geplanten Landung
const MAX_CALLS_PER_FLIGHT = 40;             // harte Obergrenze pro Kachel

const AIRPORT_TZ = {
  FRA: 'Europe/Berlin', MUC: 'Europe/Berlin', BER: 'Europe/Berlin', DUS: 'Europe/Berlin',
  HAM: 'Europe/Berlin', STR: 'Europe/Berlin', CGN: 'Europe/Berlin', NUE: 'Europe/Berlin',
  ZRH: 'Europe/Zurich', VIE: 'Europe/Vienna', AMS: 'Europe/Amsterdam', CDG: 'Europe/Paris',
  LHR: 'Europe/London', IST: 'Europe/Istanbul', DXB: 'Asia/Dubai', DOH: 'Asia/Qatar',
  TPE: 'Asia/Taipei', TSA: 'Asia/Taipei', KHH: 'Asia/Taipei', HKG: 'Asia/Hong_Kong',
  SIN: 'Asia/Singapore', BKK: 'Asia/Bangkok', NRT: 'Asia/Tokyo', HND: 'Asia/Tokyo', ICN: 'Asia/Seoul',
};

const MONTHS = {
  jan: 1, feb: 2, mär: 3, mar: 3, apr: 4, mai: 5, may: 5, jun: 6, jul: 7,
  aug: 8, sep: 9, okt: 10, oct: 10, nov: 11, dez: 12, dec: 12,
};

/** "05. Nov 2026" | "05.11.2026" | "2026-11-05" → [y, m, d] */
function parseDate(s) {
  if (!s) return null;
  let m = s.match(/(\d{4})-(\d{1,2})-(\d{1,2})/);
  if (m) return [+m[1], +m[2], +m[3]];
  m = s.match(/(\d{1,2})\.(\d{1,2})\.(\d{4})/);
  if (m) return [+m[3], +m[2], +m[1]];
  m = s.match(/(\d{1,2})\.?\s*([a-zäA-ZÄ]{3})[a-zäA-Z]*\.?\s*(\d{4})/);
  if (m && MONTHS[m[2].toLowerCase()]) return [+m[3], MONTHS[m[2].toLowerCase()], +m[1]];
  return null;
}

/** Offset einer Zeitzone (ms) zum Zeitpunkt ts */
function tzOffset(ts, tz) {
  const p = Object.fromEntries(
    new Intl.DateTimeFormat('en-US', {
      timeZone: tz, hourCycle: 'h23',
      year: 'numeric', month: 'numeric', day: 'numeric', hour: 'numeric', minute: 'numeric', second: 'numeric',
    }).formatToParts(new Date(ts)).map((x) => [x.type, x.value]),
  );
  return Date.UTC(p.year, p.month - 1, p.day, p.hour, p.minute, p.second) - ts;
}

/** Ortszeit (Datum + "HH:MM") am Flughafen → UTC-Timestamp, oder null */
function airportTime(code, date, time) {
  const tz = AIRPORT_TZ[(code || '').trim().toUpperCase()];
  const ymd = parseDate(date);
  const hm = (time || '').match(/(\d{1,2}):(\d{2})/);
  if (!tz || !ymd || !hm) return null;
  const guess = Date.UTC(ymd[0], ymd[1] - 1, ymd[2], +hm[1], +hm[2]);
  return guess - tzOffset(guess - tzOffset(guess, tz), tz);
}

/** Alle geplanten Abfragezeitpunkte (UTC-ms, aufsteigend) */
function buildSlots(dep, arr, estimatedDep) {
  const slots = EARLY_CHECKS.map((d) => dep - d);
  const until = Math.max(dep, Math.min(estimatedDep || dep, dep + MAX_DELAY_EXTENSION));
  for (let t = dep - FREQUENT_FROM; t <= until; t += FREQUENT_EVERY) slots.push(t);
  if (arr) slots.push(arr + ARRIVAL_CHECK_AFTER);
  return [...new Set(slots)].sort((a, b) => a - b);
}

/** "CI 062" → "CI62" (AviationStack-Format) */
const toIata = (n) => (n || '').replace(/\s+/g, '').toUpperCase().replace(/^([A-Z0-9]{2})0+(\d)/, '$1$2');

// AviationStack liefert Ortszeiten mit (falschem) "+00:00"-Suffix → Uhrzeit direkt ausschneiden
const hhmm = (s) => (s ? s.slice(11, 16) : null);

async function fetchAviationStack(tile) {
  const url = new URL('http://api.aviationstack.com/v1/flights'); // Free-Plan: nur HTTP
  url.searchParams.set('access_key', AVIATIONSTACK_KEY);
  url.searchParams.set('flight_iata', toIata(tile.number));
  const res = await fetch(url);
  const body = await res.json().catch(() => ({}));
  if (!res.ok || body.error) throw new Error(body.error?.message || `AviationStack ${res.status}`);

  // Mehrere Tage möglich → den Flug am geplanten Abflugtag nehmen
  const ymd = parseDate(tile.fromDate);
  const wanted = ymd && `${ymd[0]}-${String(ymd[1]).padStart(2, '0')}-${String(ymd[2]).padStart(2, '0')}`;
  const flight = (body.data || []).find((f) => f.flight_date === wanted);
  if (!flight) throw new Error(`Flug ${tile.number} am ${wanted} (noch) nicht gefunden`);

  const dep = flight.departure || {};
  const arr = flight.arrival || {};
  const delay = dep.delay || 0;
  const status = {
    scheduled: delay > 0 ? 'DELAYED' : 'ON_TIME',
    active: 'DEPARTED', landed: 'ARRIVED',
    cancelled: 'CANCELLED', incident: 'CANCELLED', diverted: 'DELAYED',
  }[flight.flight_status];

  // Nur gesetzte Felder zurückgeben — der Rest kommt weiter aus der Kachel
  const out = {
    status,
    fromTerminal: dep.terminal,
    fromGate: dep.gate,
    fromEstimated: hhmm(dep.estimated),
    toTerminal: arr.terminal,
    toEstimated: hhmm(arr.estimated),
    delayMinutes: delay,
  };
  return Object.fromEntries(Object.entries(out).filter(([, v]) => v != null && v !== ''));
}

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    res.status(405).json({ error: 'Method not allowed' });
    return;
  }
  if (!SUPABASE_URL || !ANON_KEY || !SERVICE_ROLE_KEY || !AVIATIONSTACK_KEY) {
    res.status(200).json({ live: false, reason: 'AVIATIONSTACK_KEY / Service-Role-Key fehlen in Vercel.' });
    return;
  }

  const token = (req.headers.authorization || '').replace(/^Bearer\s+/i, '');
  if (!token) { res.status(401).json({ error: 'Nicht angemeldet.' }); return; }
  const callerClient = createClient(SUPABASE_URL, ANON_KEY, {
    global: { headers: { Authorization: `Bearer ${token}` } },
  });
  const { data: userData, error: userErr } = await callerClient.auth.getUser(token);
  if (userErr || !userData?.user) { res.status(401).json({ error: 'Ungültige Sitzung.' }); return; }

  const tileId = req.query.tile;
  if (!tileId) { res.status(400).json({ error: 'tile ist erforderlich.' }); return; }

  const admin = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);
  const { data: row } = await admin.from('home_tiles').select('type, data').eq('id', tileId).single();
  if (!row || row.type !== 'flight') { res.status(404).json({ error: 'Flug-Kachel nicht gefunden.' }); return; }
  const tile = row.data || {};

  const dep = airportTime(tile.fromCode, tile.fromDate, tile.fromScheduled);
  if (!tile.number || !dep) {
    res.status(200).json({ live: false, reason: 'Flugnummer, Abflughafen, -datum oder -zeit fehlen oder sind unbekannt.' });
    return;
  }
  const arr = airportTime(tile.toCode, tile.toDate, tile.toScheduled);

  // Cache gilt nur für genau diesen Flug — ändert der Admin Nummer/Datum/Zeit, fängt er neu an
  const cacheKey = `flight:${tileId}`;
  const flightKey = `${toIata(tile.number)}@${dep}`;
  const { data: cacheRow } = await admin.from('app_config').select('value').eq('key', cacheKey).maybeSingle();
  let cache = cacheRow?.value?.flightKey === flightKey ? cacheRow.value : null;

  const now = Date.now();
  const estDep = cache?.data?.fromEstimated && cache.data.status !== 'DEPARTED' && cache.data.status !== 'ARRIVED'
    ? airportTime(tile.fromCode, tile.fromDate, cache.data.fromEstimated)
    : null;
  // Abflug nach Mitternacht verschoben → Folgetag
  const estimatedDep = estDep && estDep < dep - 12 * HOUR ? estDep + 24 * HOUR : estDep;
  const slots = buildSlots(dep, arr, estimatedDep);
  const dueSlot = slots.filter((t) => t <= now).pop() ?? null;
  const nextSlot = slots.find((t) => t > now) ?? null;

  const respond = (c) => res.status(200).json({
    live: true,
    data: c?.data || null,
    fetchedAt: c?.fetchedAt || null,
    error: c?.error || null,
    nextCheckAt: nextSlot ? new Date(nextSlot).toISOString() : null,
  });

  const calls = cache?.calls || 0;
  if (dueSlot === null || (cache && cache.slot >= dueSlot) || calls >= MAX_CALLS_PER_FLIGHT) {
    respond(cache);
    return;
  }

  // Slot "reservieren", damit parallele Aufrufe nicht mehrfach die API anfragen
  const claimed = { ...(cache || {}), flightKey, slot: dueSlot, calls: calls + 1 };
  if (cacheRow) {
    const { data: upd } = await admin.from('app_config')
      .update({ value: claimed, updated_at: new Date().toISOString() })
      .eq('key', cacheKey)
      .filter('value->>slot', cacheRow.value?.slot == null ? 'is' : 'eq', cacheRow.value?.slot ?? null)
      .select('key');
    if (!upd?.length) { respond(cache); return; }
  } else {
    const { error } = await admin.from('app_config').insert({ key: cacheKey, value: claimed });
    if (error) { respond(cache); return; }
  }

  let next;
  try {
    next = { ...claimed, data: await fetchAviationStack(tile), fetchedAt: new Date().toISOString(), error: null };
  } catch (err) {
    console.warn('[flight]', err.message);
    next = { ...claimed, error: err.message };
  }
  await admin.from('app_config').update({ value: next, updated_at: new Date().toISOString() }).eq('key', cacheKey);
  respond(next);
}
