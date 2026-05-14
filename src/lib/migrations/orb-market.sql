CREATE TABLE IF NOT EXISTS crack_rights_listings (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  orb_id uuid NOT NULL REFERENCES orbs(id) ON DELETE CASCADE,
  seller_id uuid NOT NULL REFERENCES auth.users(id),
  asking_price numeric(18,8) NOT NULL,
  currency text NOT NULL DEFAULT 'SOL',
  status text NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'sold', 'expired', 'cancelled')),
  local_window_expires_at timestamptz NOT NULL,
  expires_at timestamptz NOT NULL,
  buyer_id uuid REFERENCES auth.users(id),
  sold_at timestamptz,
  platform_fee_pct numeric(4,2) DEFAULT 5.0,
  seller_royalty_pct numeric(4,2) DEFAULT 5.0,
  created_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS crack_rights_bids (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  listing_id uuid NOT NULL REFERENCES crack_rights_listings(id) ON DELETE CASCADE,
  bidder_id uuid NOT NULL REFERENCES auth.users(id),
  amount numeric(18,8) NOT NULL,
  currency text NOT NULL,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'rejected', 'withdrawn')),
  created_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS crack_passes (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  orb_id uuid NOT NULL REFERENCES orbs(id) ON DELETE CASCADE,
  holder_id uuid NOT NULL REFERENCES auth.users(id),
  listing_id uuid REFERENCES crack_rights_listings(id),
  expires_at timestamptz NOT NULL,
  used_at timestamptz,
  created_at timestamptz DEFAULT now(),
  UNIQUE(orb_id, holder_id)
);
