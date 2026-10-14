-- ═══════════════════════════════════════════════════════════════════
-- IMPULS · Fakten-Box ("Fakt") an Programmpunkten
-- ═══════════════════════════════════════════════════════════════════
-- In Supabase: SQL Editor → New Query → einfügen → "Run".
-- Kann gefahrlos mehrfach ausgeführt werden.
-- fact_text: eine Zeile pro Punkt (eine Zeile = Highlight, mehrere = Liste).
-- Das Bild liegt im bestehenden Bucket 'photos' unter schedule/.
-- ═══════════════════════════════════════════════════════════════════

alter table schedule add column if not exists fact_text text;
alter table schedule add column if not exists fact_image_path text;
