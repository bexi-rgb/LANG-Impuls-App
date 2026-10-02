-- ═══════════════════════════════════════════════════════════════════
-- IMPULS · Bilder im Chat
-- ═══════════════════════════════════════════════════════════════════
-- In Supabase: SQL Editor → New Query → einfügen → "Run".
-- Kann gefahrlos mehrfach ausgeführt werden.
-- Die Bilder selbst liegen im bestehenden Bucket 'photos' unter chat/<user-id>/.
-- ═══════════════════════════════════════════════════════════════════

alter table messages add column if not exists image_path text;
