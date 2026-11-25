-- Craft design: likes, comments, listing features, and solicitor handover per deal.
-- Additive only.

ALTER TABLE listings ADD COLUMN IF NOT EXISTS features TEXT[] NOT NULL DEFAULT '{}';

CREATE TABLE IF NOT EXISTS listing_likes (
  listing_id UUID NOT NULL REFERENCES listings(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (listing_id, user_id)
);

CREATE TABLE IF NOT EXISTS listing_comments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  listing_id UUID NOT NULL REFERENCES listings(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  body TEXT NOT NULL CHECK (char_length(body) BETWEEN 1 AND 300),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_listing_comments_listing ON listing_comments(listing_id, created_at);

-- Each side of an accepted offer names their solicitor or conveyancer.
CREATE TABLE IF NOT EXISTS offer_solicitors (
  offer_id UUID NOT NULL REFERENCES offers(id) ON DELETE CASCADE,
  side VARCHAR(10) NOT NULL CHECK (side IN ('seller', 'buyer')),
  name VARCHAR(255) NOT NULL,
  firm VARCHAR(255),
  email VARCHAR(255) NOT NULL,
  phone VARCHAR(50),
  licence VARCHAR(100),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (offer_id, side)
);

-- Settlement checklist ticks (identity, AML, disclosure, contract, conditions, settlement).
CREATE TABLE IF NOT EXISTS offer_checklist (
  offer_id UUID NOT NULL REFERENCES offers(id) ON DELETE CASCADE,
  item_key VARCHAR(40) NOT NULL,
  done_by UUID REFERENCES users(id) ON DELETE SET NULL,
  done_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (offer_id, item_key)
);

ALTER TABLE offers ADD COLUMN IF NOT EXISTS handover_at TIMESTAMPTZ;
