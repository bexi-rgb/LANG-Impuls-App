/*
 * Wechselkurs-Integration via exchangerate-api.com / open.er-api.com
 * (kostenlos, kein API-Key nötig).
 *
 * Docs: https://www.exchangerate-api.com/docs/free
 * Kurse werden von der Quelle einmal täglich aktualisiert.
 * CORS: aktiviert, kann direkt aus dem Browser aufgerufen werden
 */

import { useState, useEffect, useRef } from 'react';

/**
 * Rohes Fetch — aktuelle Wechselkurse relativ zu `base`.
 * Wirft bei Netzwerk- oder API-Fehler.
 */
export async function fetchExchangeRate(base = 'EUR') {
  const res = await fetch(`https://open.er-api.com/v6/latest/${base}`);
  if (!res.ok) throw new Error(`Kursdienst antwortete mit ${res.status}`);
  const data = await res.json();
  if (data.result !== 'success' || !data.rates) throw new Error('Kursdienst lieferte keine gültigen Daten');

  return {
    base,
    rates: data.rates,
    fetchedAt: Date.now(),
    sourceUpdatedAt: data.time_last_update_unix ? data.time_last_update_unix * 1000 : null,
  };
}

/**
 * React-Hook mit In-Memory-Cache und Auto-Refresh.
 * Kurse ändern sich nur ~täglich, daher großzügiges Cache-Fenster.
 */
const cache = new Map(); // base → { data, promise }
const CACHE_TTL_MS = 6 * 60 * 60 * 1000; // 6 Std

export function useExchangeRate(base = 'EUR', refreshMs = 6 * 60 * 60 * 1000) {
  const [state, setState] = useState({ data: null, error: null, loading: true });
  const mounted = useRef(true);

  useEffect(() => {
    mounted.current = true;
    return () => { mounted.current = false; };
  }, []);

  useEffect(() => {
    let cancelled = false;

    const load = async () => {
      const cached = cache.get(base);
      if (cached?.data && Date.now() - cached.data.fetchedAt < CACHE_TTL_MS) {
        setState({ data: cached.data, error: null, loading: false });
        return;
      }
      if (cached?.promise) {
        try {
          const d = await cached.promise;
          if (!cancelled && mounted.current) setState({ data: d, error: null, loading: false });
        } catch (err) {
          if (!cancelled && mounted.current) setState({ data: cached?.data || null, error: err.message, loading: false });
        }
        return;
      }
      setState((s) => ({ ...s, loading: true }));
      const promise = fetchExchangeRate(base);
      cache.set(base, { data: cached?.data, promise });
      try {
        const d = await promise;
        cache.set(base, { data: d });
        if (!cancelled && mounted.current) setState({ data: d, error: null, loading: false });
      } catch (err) {
        cache.set(base, { data: cached?.data });
        if (!cancelled && mounted.current) setState({ data: cached?.data || null, error: err.message, loading: false });
      }
    };

    load();
    const id = setInterval(load, refreshMs);
    return () => { cancelled = true; clearInterval(id); };
  }, [base, refreshMs]);

  return state;
}
