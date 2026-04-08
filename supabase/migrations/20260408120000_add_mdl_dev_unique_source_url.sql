-- Add unique constraint on source_url to enable upsert deduplication
ALTER TABLE mdl_developments ADD CONSTRAINT uq_mdl_dev_source_url UNIQUE (source_url);
