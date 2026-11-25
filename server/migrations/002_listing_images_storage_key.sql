-- Photos and documents move from base64 in PostgreSQL to the private bucket.
-- Additive only: existing base64 rows keep working; new rows store a bucket key instead.
ALTER TABLE listing_images ADD COLUMN IF NOT EXISTS storage_key TEXT;
