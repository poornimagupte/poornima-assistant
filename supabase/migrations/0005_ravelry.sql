-- Add external source tracking to crochet_items so Ravelry-imported items
-- can be upserted cleanly without creating duplicates on re-sync.
alter table crochet_items add column if not exists external_id     text;
alter table crochet_items add column if not exists external_source text; -- e.g. 'ravelry'

alter table crochet_items
  add constraint crochet_external_unique unique (user_id, external_source, external_id);
