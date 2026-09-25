/*
 * ═══════════════════════════════════════════════════════════════════
 * Supabase-Integration für IMPULS
 * ═══════════════════════════════════════════════════════════════════
 * Enthält:
 *   • Client-Initialisierung
 *   • Auth-Hooks (useSession, sendMagicLink, signOut)
 *   • useCollection: reaktiver Datenzugriff mit Realtime-Sync
 *   • uploadFile / getPublicUrl: Storage-Helper
 *
 * Voraussetzung: VITE_SUPABASE_URL und VITE_SUPABASE_ANON_KEY in .env.local
 * ═══════════════════════════════════════════════════════════════════
 */

import { createClient } from '@supabase/supabase-js';
import { useState, useEffect, useRef, useCallback } from 'react';
import { loadValue, saveValue, removeValue } from '../storage.js';

const CACHED_PROFILE_KEY = 'cachedProfile';

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY;

export const isSupabaseConfigured = !!(SUPABASE_URL && SUPABASE_ANON_KEY);

if (!isSupabaseConfigured) {
  console.warn(
    '[supabase] Nicht konfiguriert. Trage VITE_SUPABASE_URL und ' +
    'VITE_SUPABASE_ANON_KEY in .env.local ein. Fallback: LocalStorage.'
  );
}

export const supabase = isSupabaseConfigured
  ? createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: true,  // wichtig für Magic-Link-Redirect
        // Standardmäßig nutzt supabase-js die Web-Locks-API (navigator.locks),
        // um Session-Refreshes über mehrere Tabs zu koordinieren. Als PWA auf
        // iOS wird die App beim Wechsel in den Hintergrund oft mitten in
        // diesem Lock eingefroren/beendet — der Lock wird nie freigegeben,
        // und jeder künftige getSession()-Aufruf hängt für immer ("Lade
        // Sitzung..." ohne Ende). Diese App läuft nicht in mehreren Tabs
        // gleichzeitig, daher deaktivieren wir das Locking komplett.
        lock: async (_name, _acquireTimeout, fn) => fn(),
      },
    })
  : null;

// ═══════════════════════════════════════════════════════════════════
// AUTH
// ═══════════════════════════════════════════════════════════════════

/**
 * Prüft synchron, ob überhaupt eine Session im LocalStorage liegt, die es
 * sich zu restaurieren lohnt. Ohne das würde JEDER App-Start — auch der
 * ganz normale "ich bin ausgeloggt"-Fall — kurz den Lade-Screen zeigen.
 */
function hasPersistedSession() {
  try {
    return Object.keys(window.localStorage).some((k) => /^sb-.*-auth-token$/.test(k));
  } catch {
    return false;
  }
}

/**
 * React-Hook für die aktuelle Auth-Session.
 * Rendert nach Anmeldung/Abmeldung automatisch neu.
 * Gibt zusätzlich das verknüpfte Traveler-Profil zurück.
 */
export function useSession() {
  const [session, setSession] = useState(null);
  // Stale-while-revalidate: das zuletzt geladene Profil wird lokal gecacht.
  // Bei jedem App-Start zeigen wir es sofort (kein Warten auf Supabase),
  // während im Hintergrund still geprüft wird, ob Session/Profil noch
  // aktuell sind. Erst wenn sich dabei etwas ändert, aktualisiert sich die
  // Anzeige — normalerweise unbemerkt.
  const [profile, setProfile] = useState(() => (supabase ? loadValue(CACHED_PROFILE_KEY, null) : null));
  // Nur laden, wenn wir weder ein gecachtes Profil noch (bei Erstbesuch ohne
  // Cache) eine gespeicherte Session haben — sonst zeigen wir sofort etwas
  // an (gecachtes Profil oder Login), statt jedes Mal kurz "Lade Sitzung..."
  // aufflackern zu lassen.
  const [loading, setLoading] = useState(() => {
    if (!supabase) return false;
    if (loadValue(CACHED_PROFILE_KEY, null)) return false;
    return hasPersistedSession();
  });
  // Wird gesetzt, wenn das Laden ungewöhnlich lange dauert (schlechte
  // Verbindung o.ä.). WICHTIG: das fällt NIE automatisch auf den
  // Login-Screen zurück — eine bestehende Session einfach zu verwerfen,
  // nur weil das Netz gerade langsam ist, sieht für die Reisenden wie ein
  // ungewolltes Ausloggen aus. Stattdessen zeigen wir einen Hinweis mit
  // manuellem "Erneut versuchen".
  const [timedOut, setTimedOut] = useState(false);
  const [attempt, setAttempt] = useState(0);

  const retry = useCallback(() => {
    setTimedOut(false);
    setLoading(true);
    setAttempt((a) => a + 1);
  }, []);

  useEffect(() => {
    if (!supabase) { setLoading(false); return; }
    setTimedOut(false);

    const safetyTimeout = setTimeout(() => setTimedOut(true), 6000);

    // Aktuelle Session holen
    supabase.auth.getSession()
      .then(({ data }) => {
        setSession(data.session);
        if (!data.session) setLoading(false);
      })
      .catch((e) => {
        console.warn('[supabase] getSession-Fehler:', e.message);
        setLoading(false);
      });

    // Auf Änderungen hören (Login, Logout, Token-Refresh)
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_evt, sess) => {
      setSession(sess);
      if (!sess) { setProfile(null); removeValue(CACHED_PROFILE_KEY); setLoading(false); }
      setTimedOut(false);
    });

    return () => { subscription.unsubscribe(); clearTimeout(safetyTimeout); };
  }, [attempt]);

  // Bei jeder Session-Änderung: Profil aus travelers-Tabelle laden
  useEffect(() => {
    if (!session?.user?.id || !supabase) return;
    let cancelled = false;
    (async () => {
      try {
        const { data, error } = await supabase
          .from('travelers')
          .select('*')
          .eq('id', session.user.id)
          .single();
        if (cancelled) return;
        if (error) console.warn('[supabase] Profil-Load-Fehler:', error.message);
        setProfile(data || null);
        if (data) saveValue(CACHED_PROFILE_KEY, data); else removeValue(CACHED_PROFILE_KEY);
      } catch (e) {
        if (!cancelled) console.warn('[supabase] Profil-Load-Fehler:', e.message);
      } finally {
        if (!cancelled) { setLoading(false); setTimedOut(false); }
      }
    })();
    return () => { cancelled = true; };
  }, [session?.user?.id]);

  return { session, profile, loading, timedOut, retry, user: session?.user || null };
}

/**
 * Wandelt einen einfachen Benutzernamen in die dahinterliegende Login-E-Mail um.
 * "elena" → "elena@impuls.com". Enthält der Input bereits ein "@", wird er
 * unverändert übernommen (für echte E-Mail-Logins wie den Admin-Account).
 */
export function toLoginEmail(input) {
  const v = input.trim().toLowerCase();
  return v.includes('@') ? v : `${v.replace(/\s+/g, '.')}@impuls.com`;
}

/**
 * Login mit Benutzername/E-Mail + Passwort. Kein E-Mail-Versand nötig.
 */
export async function signInWithPassword(email, password) {
  if (!supabase) throw new Error('Supabase nicht konfiguriert');
  const { error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) throw error;
}

/**
 * Legt einen neuen Reisenden-Account an (nur für Admins). Läuft über die
 * serverlose Funktion api/create-traveler, die mit dem Service-Role-Key
 * arbeitet — der darf niemals im Browser-Bundle landen.
 */
export async function createTravelerAccount({ name, email, password }) {
  if (!supabase) throw new Error('Supabase nicht konfiguriert');
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) throw new Error('Nicht angemeldet');
  const res = await fetch('/api/create-traveler', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${session.access_token}` },
    body: JSON.stringify({ name, email, password }),
  });
  const body = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(body.error || 'Konto konnte nicht angelegt werden.');
  return body;
}

export async function signOut() {
  if (!supabase) return;
  await supabase.auth.signOut();
}

// ═══════════════════════════════════════════════════════════════════
// COLLECTIONS
// ═══════════════════════════════════════════════════════════════════

/**
 * React-Hook für eine ganze Tabelle mit Realtime-Sync.
 * Liefert `{data, loading, error}` zurück; die Daten aktualisieren sich
 * automatisch, wenn irgendjemand (Rebekka, andere Reisende) etwas ändert.
 *
 * @param {string} table  Tabellenname in Supabase (z.B. 'schedule')
 * @param {object} [opts] Optional: { orderBy: 'column', ascending: true, filter: (query) => query }
 */
export function useCollection(table, opts = {}) {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const optsRef = useRef(opts);
  optsRef.current = opts;

  useEffect(() => {
    if (!supabase) { setLoading(false); return; }
    let cancelled = false;

    const load = async () => {
      try {
        let q = supabase.from(table).select('*');
        if (optsRef.current.filter) q = optsRef.current.filter(q);
        if (optsRef.current.orderBy) {
          q = q.order(optsRef.current.orderBy, { ascending: optsRef.current.ascending !== false });
        }
        const { data: rows, error: err } = await q;
        if (cancelled) return;
        if (err) { setError(err.message); setLoading(false); return; }
        setData(rows || []);
        setError(null);
        setLoading(false);
      } catch (e) {
        if (!cancelled) { setError(e.message); setLoading(false); }
      }
    };
    load();

    // Realtime-Subscription: bei jeder Änderung neu laden.
    // (Für Chat könnte man optimistischer diff-mergen; für 20-Personen-Reisen ist Reload OK.)
    const channel = supabase
      .channel(`realtime:${table}`)
      .on('postgres_changes', { event: '*', schema: 'public', table }, () => load())
      .subscribe();

    return () => {
      cancelled = true;
      supabase.removeChannel(channel);
    };
  }, [table]);

  return { data, loading, error };
}

/**
 * Konvenienz-Wrapper für Einzeloperationen. Wirft bei Fehler.
 */
export async function insertRow(table, values) {
  const { data, error } = await supabase.from(table).insert(values).select().single();
  if (error) throw error;
  return data;
}

export async function updateRow(table, id, patch) {
  const { data, error } = await supabase.from(table).update(patch).eq('id', id).select().single();
  if (error) throw error;
  return data;
}

export async function deleteRow(table, id) {
  const { error } = await supabase.from(table).delete().eq('id', id);
  if (error) throw error;
}

/**
 * Öffentliche URL für eine Datei in einem öffentlichen Bucket (z.B. 'photos').
 * Für private Buckets (z.B. 'documents') stattdessen getSignedUrl verwenden.
 */
export function getPublicUrl(bucket, path) {
  if (!supabase || !path) return null;
  const { data } = supabase.storage.from(bucket).getPublicUrl(path);
  return data?.publicUrl || null;
}

/**
 * Einzelnen JSONB-Schlüssel aus app_config holen (für Ticker etc.).
 */
export async function getConfig(key, fallback = null) {
  if (!supabase) return fallback;
  const { data, error } = await supabase.from('app_config').select('value').eq('key', key).single();
  if (error || !data) return fallback;
  return data.value;
}

export async function setConfig(key, value) {
  const { error } = await supabase.from('app_config').upsert({ key, value, updated_at: new Date().toISOString() });
  if (error) throw error;
}

// ═══════════════════════════════════════════════════════════════════
// STORAGE (Datei-Uploads)
// ═══════════════════════════════════════════════════════════════════

/**
 * Datei in einen Bucket hochladen. Bucket muss vorher in Supabase-UI angelegt sein.
 *   • 'documents' → privater Bucket (nur eingeloggte User)
 *   • 'photos'    → öffentlicher Bucket (jeder mit Link kann anzeigen)
 *
 * @param {string} bucket    Name des Buckets
 * @param {File}   file      HTML-File-Objekt aus <input type="file">
 * @param {string} [prefix]  Optionaler Ordner-Präfix, z.B. Traveler-ID
 * @returns {Promise<{path: string, publicUrl: string|null}>}
 */
export async function uploadFile(bucket, file, prefix = '') {
  if (!supabase) throw new Error('Supabase nicht konfiguriert');
  const ext = file.name.split('.').pop();
  const path = `${prefix ? prefix + '/' : ''}${crypto.randomUUID()}.${ext}`;
  const { error } = await supabase.storage.from(bucket).upload(path, file, {
    cacheControl: '3600',
    upsert: false,
    contentType: file.type,
  });
  if (error) throw error;

  // Öffentliche URL nur bei öffentlichem Bucket sinnvoll
  const { data: pub } = supabase.storage.from(bucket).getPublicUrl(path);
  return { path, publicUrl: pub?.publicUrl || null };
}

/**
 * Signierte URL für einen privaten Bucket erzeugen (z.B. Reisepass-Kopie).
 * Läuft nach `expiresIn` Sekunden ab.
 */
export async function getSignedUrl(bucket, path, expiresIn = 3600) {
  if (!supabase) return null;
  const { data, error } = await supabase.storage.from(bucket).createSignedUrl(path, expiresIn);
  if (error) return null;
  return data.signedUrl;
}

export async function deleteFile(bucket, path) {
  if (!supabase) return;
  await supabase.storage.from(bucket).remove([path]);
}
