/*
 * Vercel Serverless Function: bearbeitet oder löscht einen Reisenden-Account.
 *
 *   PATCH  { id, name?, email?, password? }  → Name / Login / Passwort ändern
 *   DELETE { id }                             → Account komplett löschen
 *
 * Läuft wie create-traveler.js nur serverseitig mit dem Service-Role-Key,
 * weil Login-Daten (auth.users) nur mit Admin-Rechten änderbar sind.
 * Der Aufrufer muss eingeloggt und in der travelers-Tabelle 'admin' sein.
 *
 * Beim Löschen entfernt Supabase per "on delete cascade" auch den
 * travelers-Eintrag samt Nachrichten, Fotos und persönlichen Dokumenten.
 */

import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.VITE_SUPABASE_URL;
const ANON_KEY = process.env.VITE_SUPABASE_ANON_KEY;
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

export default async function handler(req, res) {
  if (req.method !== 'PATCH' && req.method !== 'DELETE') {
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
    res.status(403).json({ error: 'Nur Admins dürfen Reisende bearbeiten.' });
    return;
  }

  const { id, name, email, password } = req.body || {};
  if (!id) {
    res.status(400).json({ error: 'Reisenden-ID fehlt.' });
    return;
  }
  if (id === userData.user.id) {
    res.status(400).json({ error: 'Den eigenen Admin-Account bitte nicht hier ändern.' });
    return;
  }

  const adminClient = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);

  if (req.method === 'DELETE') {
    const { error } = await adminClient.auth.admin.deleteUser(id);
    if (error) {
      res.status(400).json({ error: error.message });
      return;
    }
    // Falls kein Cascade greift (ältere Schemas): travelers-Eintrag sicher entfernen.
    await adminClient.from('travelers').delete().eq('id', id);
    res.status(200).json({ ok: true });
    return;
  }

  // PATCH
  const authPatch = {};
  const profilePatch = {};
  if (name?.trim()) {
    authPatch.user_metadata = { name: name.trim() };
    profilePatch.name = name.trim();
  }
  if (email?.trim()) {
    authPatch.email = email.trim().toLowerCase();
    authPatch.email_confirm = true;
    profilePatch.email = authPatch.email;
  }
  if (password) {
    if (password.length < 6) {
      res.status(400).json({ error: 'Passwort muss mindestens 6 Zeichen haben.' });
      return;
    }
    authPatch.password = password;
  }
  if (!Object.keys(authPatch).length) {
    res.status(400).json({ error: 'Keine Änderungen übergeben.' });
    return;
  }

  const { error: authErr } = await adminClient.auth.admin.updateUserById(id, authPatch);
  if (authErr) {
    res.status(400).json({ error: authErr.message });
    return;
  }
  if (Object.keys(profilePatch).length) {
    const { error: dbErr } = await adminClient.from('travelers').update(profilePatch).eq('id', id);
    if (dbErr) {
      res.status(400).json({ error: dbErr.message });
      return;
    }
  }

  res.status(200).json({ ok: true });
}
