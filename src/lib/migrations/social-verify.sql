CREATE TABLE IF NOT EXISTS social_verifications (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  platform text NOT NULL CHECK (platform IN ('instagram', 'x')),
  handle text NOT NULL,
  verification_code text NOT NULL,
  verified boolean DEFAULT false,
  verified_at timestamptz,
  created_at timestamptz DEFAULT now(),
  UNIQUE(user_id, platform)
);

ALTER TABLE agent_profiles
  ADD COLUMN IF NOT EXISTS instagram_handle text,
  ADD COLUMN IF NOT EXISTS instagram_verified boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS x_handle text,
  ADD COLUMN IF NOT EXISTS x_verified boolean DEFAULT false;
