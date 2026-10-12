-- ═══════════════════════════════════════════════════════════════════
-- IMPULS · Menükarte + Sponsor-Logo an Programmpunkten
-- ═══════════════════════════════════════════════════════════════════
-- In Supabase: SQL Editor → New Query → einfügen → "Run".
-- Kann gefahrlos mehrfach ausgeführt werden.
-- Die Bilder selbst liegen im bestehenden Bucket 'photos' unter schedule/.
-- ═══════════════════════════════════════════════════════════════════

alter table schedule add column if not exists menu_path text;
alter table schedule add column if not exists sponsor_name text;
alter table schedule add column if not exists sponsor_logo_path text;
