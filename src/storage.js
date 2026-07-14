/*
 * Persistenz-Schicht für IMPULS.
 *
 * Aktueller Adapter: LocalStorage (pro Gerät, offline, kein Backend).
 * Später austauschbar gegen Supabase/Firebase/eigenes API ohne UI-Änderungen –
 * die Komponenten sehen weiterhin `usePersistentState('key', fallback)`.
 *
 * Schema-Version bei Breaking Changes hochzählen: Alte LocalStorage-Daten
 * werden dann ignoriert und der Default (`fallback`) übernommen.
 */

import { useState, useEffect, useRef } from 'react';

const NAMESPACE = 'impuls';
const SCHEMA_VERSION = 1;
const PREFIX = `${NAMESPACE}:v${SCHEMA_VERSION}:`;

function isBrowser() {
  return typeof window !== 'undefined' && typeof window.localStorage !== 'undefined';
}

/** Wert lesen. Gibt bei Fehler oder leerem Slot den Fallback zurück. */
export function loadValue(key, fallback) {
  if (!isBrowser()) return fallback;
  try {
    const raw = window.localStorage.getItem(PREFIX + key);
    if (raw === null) return fallback;
    return JSON.parse(raw);
  } catch (err) {
    console.warn(`[storage] load "${key}" fehlgeschlagen:`, err);
    return fallback;
  }
}

/** Wert schreiben. Schluckt Fehler (z.B. Quota exceeded). */
export function saveValue(key, value) {
  if (!isBrowser()) return false;
  try {
    window.localStorage.setItem(PREFIX + key, JSON.stringify(value));
    return true;
  } catch (err) {
    console.warn(`[storage] save "${key}" fehlgeschlagen:`, err);
    return false;
  }
}

/** Einen Wert löschen. */
export function removeValue(key) {
  if (!isBrowser()) return;
  try { window.localStorage.removeItem(PREFIX + key); } catch {}
}

/** Alle IMPULS-Daten der aktuellen Schema-Version löschen (Reset). */
export function clearAll() {
  if (!isBrowser()) return false;
  try {
    Object.keys(window.localStorage)
      .filter((k) => k.startsWith(PREFIX))
      .forEach((k) => window.localStorage.removeItem(k));
    return true;
  } catch {
    return false;
  }
}

/**
 * Persistenter React-State.
 * Signatur identisch zu useState → 1:1 austauschbar.
 * Wenn wir später auf Supabase gehen, tauscht dieser Hook seine Interna aus,
 * die aufrufenden Komponenten bleiben unverändert.
 */
export function usePersistentState(key, initial) {
  const [state, setState] = useState(() => loadValue(key, initial));

  // Persist bei jeder Änderung (aber nicht beim ersten Mount, wenn der Wert
  // sowieso schon aus dem Storage kam – sonst schreiben wir alles direkt zurück,
  // was harmlos ist aber unnötige Writes verursacht).
  const first = useRef(true);
  useEffect(() => {
    if (first.current) { first.current = false; return; }
    saveValue(key, state);
  }, [key, state]);

  return [state, setState];
}

/**
 * Diagnose: Größe aller IMPULS-Werte in Bytes.
 * Nützlich für die Admin-Anzeige (LocalStorage hat ~5-10 MB Limit).
 */
export function storageSize() {
  if (!isBrowser()) return { bytes: 0, keys: 0 };
  let bytes = 0, keys = 0;
  try {
    for (const k of Object.keys(window.localStorage)) {
      if (!k.startsWith(PREFIX)) continue;
      keys += 1;
      const v = window.localStorage.getItem(k) || '';
      bytes += k.length + v.length;
    }
  } catch {}
  return { bytes, keys };
}

export function formatBytes(bytes) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / 1024 / 1024).toFixed(2)} MB`;
}
