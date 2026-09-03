/*
 * Vercel Serverless Function: legt einen neuen Reisenden-Account an.
 *
 * Läuft NUR serverseitig — der Service-Role-Key hat vollen Admin-Zugriff auf
 * Supabase (umgeht Row-Level-Security komplett) und darf niemals ins
 * Browser-Bundle gelangen. Deshalb: kein VITE_-Präfix auf der Env-Var, und
 * diese Datei liegt in /api, nicht in /src.
 *
 * Sicherheit: Der Aufrufer muss ein gültiges Supabase-Session-Token mitschicken
 * (Authorization: Bearer <token>). Wir prüfen damit, dass der Aufrufer
 * eingeloggt UND in der travelers-Tabelle als 'admin' markiert ist, bevor wir
 * mit dem Service-Role-Key einen neuen Auth-User anlegen.
 */

import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.VITE_SUPABASE_URL;
const ANON_KEY = process.env.VITE_SUPABASE_ANON_KEY;
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Method not allowed' });
    return;
  }
  if (!SUPABASE_URL || !ANON_KEY || !SERVICE_ROLE_KEY) {
    res.status(500).json({ error: 'Supabase ist serverseitig nicht konfiguriert (SUPABASE_SERVICE_ROLE_KEY fehlt in Vercel).' });
    return;
  }

  const token = (req.headers.authorization || '').replace(/^Bearer\s+/i, '');
  if (!token) {
    res.status(401).json({ error: 'Nicht angemeldet.' });
    return;
  }

  // Client im Namen des Aufrufers — respektiert RLS, kann also nur bestätigen,
  // wer der Aufrufer ist und ob er laut travelers-Tabelle Admin ist.
  const callerClient = createClient(SUPABASE_URL, ANON_KEY, {
    global: { headers: { Authorization: `Bearer ${token}` } },
  });

  const { data: userData, error: userErr } = await callerClient.auth.getUser(token);
  if (userErr || !userData?.user) {
    res.status(401).json({ error: 'Ungültige Sitzung.' });
    return;
  }

  const { data: callerProfile, error: profileErr } = await callerClient
    .from('travelers')
    .select('role')
    .eq('id', userData.user.id)
    .single();
  if (profileErr || callerProfile?.role !== 'admin') {
    res.status(403).json({ error: 'Nur Admins dürfen Reisende anlegen.' });
    return;
  }

  const { name, email, password } = req.body || {};
  if (!name?.trim() || !email?.trim() || !password) {
    res.status(400).json({ error: 'Name, Benutzername und Passwort sind erforderlich.' });
    return;
  }

  const adminClient = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);
  const { data: created, error: createErr } = await adminClient.auth.admin.createUser({
    email: email.trim().toLowerCase(),
    password,
    email_confirm: true, // kein Bestätigungs-Mail nötig
    user_metadata: { name: name.trim() },
  });

  if (createErr) {
    res.status(400).json({ error: createErr.message });
    return;
  }

  res.status(200).json({ id: created.user.id, email: created.user.email });
}
