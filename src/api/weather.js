/*
 * Wetter-Integration via Open-Meteo (kostenlos, kein API-Key nötig).
 *
 * Docs: https://open-meteo.com/en/docs
 * Lizenz: CC BY 4.0 (Attribution required)
 * Limit: 10.000 Requests/Tag für nicht-kommerzielle Nutzung
 * CORS: aktiviert, kann direkt aus dem Browser aufgerufen werden
 */

import { useState, useEffect, useRef } from 'react';

/** Vordefinierte Reise-Standorte. Beliebig erweiterbar. */
export const WEATHER_LOCATIONS = {
  taipei: { lat: 25.033, lon: 121.5654, name: 'Taipeh', tz: 'Asia/Taipei' },
  frankfurt: { lat: 50.11, lon: 8.68, name: 'Frankfurt', tz: 'Europe/Berlin' },
  taroko: { lat: 24.158, lon: 121.622, name: 'Taroko-Nationalpark', tz: 'Asia/Taipei' },
  jiufen: { lat: 25.109, lon: 121.844, name: 'Jiufen', tz: 'Asia/Taipei' },
};

/**
 * WMO-Wetter-Codes → Klartext + Kategorie für Icon-Auswahl.
 * Vollständige Liste: https://open-meteo.com/en/docs (Abschnitt Weather-Codes)
 */
const WEATHER_CODES = {
  0:  { text: 'Klarer Himmel', category: 'clear' },
  1:  { text: 'Überwiegend klar', category: 'mostly-clear' },
  2:  { text: 'Teilweise bewölkt', category: 'partly-cloudy' },
  3:  { text: 'Bedeckt', category: 'cloudy' },
  45: { text: 'Nebel', category: 'fog' },
  48: { text: 'Reifnebel', category: 'fog' },
  51: { text: 'Leichter Nieselregen', category: 'drizzle' },
  53: { text: 'Nieselregen', category: 'drizzle' },
  55: { text: 'Starker Nieselregen', category: 'drizzle' },
  56: { text: 'Gefrierender Nieselregen', category: 'drizzle' },
  57: { text: 'Starker gefrierender Nieselregen', category: 'drizzle' },
  61: { text: 'Leichter Regen', category: 'rain' },
  63: { text: 'Regen', category: 'rain' },
  65: { text: 'Starker Regen', category: 'rain' },
  66: { text: 'Gefrierender Regen', category: 'rain' },
  67: { text: 'Starker gefrierender Regen', category: 'rain' },
  71: { text: 'Leichter Schneefall', category: 'snow' },
  73: { text: 'Schneefall', category: 'snow' },
  75: { text: 'Starker Schneefall', category: 'snow' },
  77: { text: 'Schneekörner', category: 'snow' },
  80: { text: 'Leichte Regenschauer', category: 'rain' },
  81: { text: 'Regenschauer', category: 'rain' },
  82: { text: 'Heftige Regenschauer', category: 'rain' },
  85: { text: 'Leichte Schneeschauer', category: 'snow' },
  86: { text: 'Starke Schneeschauer', category: 'snow' },
  95: { text: 'Gewitter', category: 'thunderstorm' },
  96: { text: 'Gewitter mit Hagel', category: 'thunderstorm' },
  99: { text: 'Starkes Gewitter mit Hagel', category: 'thunderstorm' },
};

export function describeWeather(code) {
  return WEATHER_CODES[code] || { text: 'Unbekannt', category: 'clear' };
}

/**
 * Rohes Fetch — Current-Weather + 3-Tage-Forecast von Open-Meteo.
 * Wirft bei Netzwerk- oder API-Fehler.
 */
export async function fetchWeather(locationKey = 'taipei') {
  const loc = WEATHER_LOCATIONS[locationKey];
  if (!loc) throw new Error(`Unbekannter Standort: ${locationKey}`);

  const url = new URL('https://api.open-meteo.com/v1/forecast');
  url.searchParams.set('latitude', loc.lat);
  url.searchParams.set('longitude', loc.lon);
  url.searchParams.set('current', 'temperature_2m,weather_code,relative_humidity_2m,wind_speed_10m,apparent_temperature');
  url.searchParams.set('daily', 'temperature_2m_max,temperature_2m_min,weather_code,precipitation_probability_max');
  url.searchParams.set('timezone', loc.tz);
  url.searchParams.set('forecast_days', '4');

  const res = await fetch(url);
  if (!res.ok) throw new Error(`Open-Meteo antwortete mit ${res.status}`);
  const data = await res.json();

  return {
    location: loc.name,
    locationKey,
    fetchedAt: Date.now(),
    current: {
      temp: Math.round(data.current.temperature_2m),
      feelsLike: Math.round(data.current.apparent_temperature),
      code: data.current.weather_code,
      humidity: data.current.relative_humidity_2m,
      windSpeed: Math.round(data.current.wind_speed_10m),
    },
    forecast: (data.daily.time || []).map((date, i) => ({
      date,
      max: Math.round(data.daily.temperature_2m_max[i]),
      min: Math.round(data.daily.temperature_2m_min[i]),
      code: data.daily.weather_code[i],
      precipitationProbability: data.daily.precipitation_probability_max?.[i] ?? null,
    })),
  };
}

/**
 * React-Hook mit In-Memory-Cache und Auto-Refresh.
 * Cache verhindert dass mehrere Komponenten mit dem gleichen Standort
 * separate Requests auslösen und respektiert das Open-Meteo-Limit.
 */
const cache = new Map(); // locationKey → { data, promise }
const CACHE_TTL_MS = 15 * 60 * 1000; // 15 Min

export function useWeather(locationKey = 'taipei', refreshMs = 30 * 60 * 1000) {
  const [state, setState] = useState({ data: null, error: null, loading: true });
  const mounted = useRef(true);

  useEffect(() => {
    mounted.current = true;
    return () => { mounted.current = false; };
  }, []);

  useEffect(() => {
    let cancelled = false;

    const load = async () => {
      // Cache prüfen
      const cached = cache.get(locationKey);
      if (cached && Date.now() - cached.data.fetchedAt < CACHE_TTL_MS) {
        setState({ data: cached.data, error: null, loading: false });
        return;
      }
      // In-Flight-Request wiederverwenden
      if (cached?.promise) {
        try {
          const d = await cached.promise;
          if (!cancelled && mounted.current) setState({ data: d, error: null, loading: false });
        } catch (err) {
          if (!cancelled && mounted.current) setState({ data: null, error: err.message, loading: false });
        }
        return;
      }
      // Neuer Request
      setState((s) => ({ ...s, loading: true }));
      const promise = fetchWeather(locationKey);
      cache.set(locationKey, { data: cached?.data, promise });
      try {
        const d = await promise;
        cache.set(locationKey, { data: d });
        if (!cancelled && mounted.current) setState({ data: d, error: null, loading: false });
      } catch (err) {
        cache.set(locationKey, { data: cached?.data });
        if (!cancelled && mounted.current) setState({ data: cached?.data || null, error: err.message, loading: false });
      }
    };

    load();
    const id = setInterval(load, refreshMs);
    return () => { cancelled = true; clearInterval(id); };
  }, [locationKey, refreshMs]);

  return state;
}

/** Wetter-Alter in menschenlesbarer Form ("vor 3 Min"). */
export function formatFetchedAt(ts) {
  if (!ts) return '';
  const diffMs = Date.now() - ts;
  const mins = Math.round(diffMs / 60000);
  if (mins < 1) return 'gerade eben';
  if (mins < 60) return `vor ${mins} Min`;
  const hrs = Math.round(mins / 60);
  return `vor ${hrs} Std`;
}
