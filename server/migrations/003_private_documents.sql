-- Identity and rental-application documents are private: they are only served
-- through short-lived signed links issued to the owner, admin or landlord.
ALTER TABLE listing_images ADD COLUMN IF NOT EXISTS is_private BOOLEAN NOT NULL DEFAULT FALSE;

UPDATE listing_images li SET is_private = TRUE
FROM identity_verifications iv
WHERE iv.document_url LIKE '%/api/images/' || li.id::text
   OR iv.selfie_url LIKE '%/api/images/' || li.id::text;

UPDATE listing_images li SET is_private = TRUE
FROM rental_applications ra
WHERE ra.id_document_url LIKE '%/api/images/' || li.id::text;
