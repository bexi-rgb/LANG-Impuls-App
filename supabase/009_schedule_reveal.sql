-- ═══════════════════════════════════════════════════════════════════
-- IMPULS · Programmpunkte "aufdecken" (zeitgesteuert oder manuell)
-- ═══════════════════════════════════════════════════════════════════
-- In Supabase: SQL Editor → New Query → einfügen → "Run".
-- Kann gefahrlos mehrfach ausgeführt werden.
--
-- hidden    = true  → versteckt, bis ein Admin "Jetzt freigeben" tippt
-- reveal_at = Zeit  → versteckt bis zu diesem Zeitpunkt, danach automatisch sichtbar
-- beides leer       → sofort sichtbar (wie bisher)
--
-- Die Sperre greift in der Datenbank (RLS): Reisende bekommen versteckte
-- Termine gar nicht erst ausgeliefert, Admins sehen alles.
-- ═══════════════════════════════════════════════════════════════════

alter table schedule add column if not exists hidden boolean not null default false;
alter table schedule add column if not exists reveal_at timestamptz;

drop policy if exists schedule_select_all on schedule;
drop policy if exists schedule_select_revealed on schedule;
create policy schedule_select_revealed on schedule for select using (
  auth.uid() is not null and (
    is_admin()
    or (not hidden and (reveal_at is null or reveal_at <= now()))
  )
);
