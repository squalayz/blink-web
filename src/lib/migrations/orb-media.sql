ALTER TABLE orbs ADD COLUMN IF NOT EXISTS media_url text;
ALTER TABLE orbs ADD COLUMN IF NOT EXISTS media_type text CHECK (media_type IN ('text', 'video'));
