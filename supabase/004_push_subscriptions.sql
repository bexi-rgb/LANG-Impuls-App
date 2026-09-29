-- ═══════════════════════════════════════════════════════════════════
-- IMPULS · Push-Benachrichtigungen
-- ═══════════════════════════════════════════════════════════════════
-- In Supabase: SQL Editor → New Query → einfügen → "Run".
-- Speichert pro Gerät die Web-Push-Registrierung. Versendet wird von der
-- Vercel-Funktion /api/send-push (mit Service-Role-Key, umgeht RLS).
-- ═══════════════════════════════════════════════════════════════════

create table if not exists push_subscriptions (
  endpoint     text primary key,           -- eindeutig pro Gerät/Browser
  traveler_id  uuid not null references travelers(id) on delete cascade,
  subscription jsonb not null,             -- { endpoint, keys: { p256dh, auth } }
  created_at   timestamptz not null default now()
);

create index if not exists push_subscriptions_traveler_idx on push_subscriptions(traveler_id);

alter table push_subscriptions enable row level security;

-- Jeder verwaltet nur die eigenen Geräte
create policy push_subs_select on push_subscriptions for select using (traveler_id = auth.uid());
create policy push_subs_insert on push_subscriptions for insert with check (traveler_id = auth.uid());
create policy push_subs_update on push_subscriptions for update using (traveler_id = auth.uid()) with check (traveler_id = auth.uid());
create policy push_subs_delete on push_subscriptions for delete using (traveler_id = auth.uid());
