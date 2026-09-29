-- ═══════════════════════════════════════════════════════════════════
-- IMPULS · Emoji-Reaktionen im Chat
-- ═══════════════════════════════════════════════════════════════════
-- In Supabase: SQL Editor → New Query → einfügen → "Run".
-- Entspricht 002_message_reactions.sql, kann aber gefahrlos mehrfach
-- ausgeführt werden (auch wenn 002 schon gelaufen ist).
-- ═══════════════════════════════════════════════════════════════════

alter table messages add column if not exists reactions jsonb not null default '{}'::jsonb;

-- Jeder eingeloggte User darf Nachrichten aktualisieren (für Reaktionen).
drop policy if exists messages_update_reactions on messages;
create policy messages_update_reactions on messages for update
  using (auth.uid() is not null) with check (auth.uid() is not null);
