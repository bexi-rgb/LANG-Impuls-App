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
      },
    })
  : null;

// ═══════════════════════════════════════════════════════════════════
// AUTH
// ═══════════════════════════════════════════════════════════════════

/**
 * React-Hook für die aktuelle Auth-Session.
 * Rendert nach Anmeldung/Abmeldung automatisch neu.
 * Gibt zusätzlich das verknüpfte Traveler-Profil zurück.
 */
export function useSession() {
  const [session, setSession] = useState(null);
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!supabase) { setLoading(false); return; }

    // Aktuelle Session holen
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session);
      if (!data.session) setLoading(false);
    });

    // Auf Änderungen hören (Login, Logout, Token-Refresh)
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_evt, sess) => {
      setSession(sess);
      if (!sess) { setProfile(null); setLoading(false); }
    });

    return () => subscription.unsubscribe();
  }, []);

  // Bei jeder Session-Änderung: Profil aus travelers-Tabelle laden
  useEffect(() => {
    if (!session?.user?.id || !supabase) return;
    let cancelled = false;
    (async () => {
      const { data, error } = await supabase
        .from('travelers')
        .select('*')
        .eq('id', session.user.id)
        .single();
      if (!cancelled) {
        if (error) console.warn('[supabase] Profil-Load-Fehler:', error.message);
        setProfile(data || null);
        setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [session?.user?.id]);

  return { session, profile, loading, user: session?.user || null };
}

/**
 * Magic-Link an eine E-Mail schicken. Der User klickt den Link, landet zurück
 * in der App, ist eingeloggt. Keine Passwörter zu merken.
 */
export async function sendMagicLink(email, redirectTo = window.location.origin) {
  if (!supabase) throw new Error('Supabase nicht konfiguriert');
  const { error } = await supabase.auth.signInWithOtp({
    email,
    options: { emailRedirectTo: redirectTo },
  });
  if (error) throw error;
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
