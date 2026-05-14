CREATE TABLE IF NOT EXISTS virtual_locations (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE UNIQUE,
  latitude numeric(10,6) NOT NULL,
  longitude numeric(11,6) NOT NULL,
  city text,
  country text,
  set_at timestamptz DEFAULT now(),
  expires_at timestamptz,
  last_location_lat numeric(10,6),
  last_location_lng numeric(11,6),
  last_hop_at timestamptz
);
