-- ══════════════════════════════════════════════════════
-- MIGRATION: Wallet-First Authentication
-- Run AFTER schema-final.sql
-- ══════════════════════════════════════════════════════

-- 1. Make email nullable (wallet is now primary identity)
ALTER TABLE public.users ALTER COLUMN email DROP NOT NULL;

-- 2. Ensure wallet_address has a unique index
CREATE UNIQUE INDEX IF NOT EXISTS idx_users_wallet_address ON public.users(wallet_address) WHERE wallet_address IS NOT NULL;

-- 3. Connected accounts table (social links post-signup)
CREATE TABLE IF NOT EXISTS public.connected_accounts (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  provider TEXT NOT NULL CHECK (provider IN ('twitter', 'instagram', 'email', 'google', 'discord', 'telegram')),
  provider_id TEXT NOT NULL,                     -- Provider's user ID
  provider_username TEXT DEFAULT '',             -- Display name (e.g. @handle)
  provider_avatar TEXT DEFAULT '',               -- Avatar URL from provider
  provider_email TEXT DEFAULT '',                -- Email from provider (if applicable)
  access_token_encrypted TEXT,                   -- Encrypted OAuth token (for posting)
  refresh_token_encrypted TEXT,                  -- Encrypted refresh token
  token_expires_at TIMESTAMPTZ,
  connected_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, provider),                     -- One connection per provider per user
  UNIQUE(provider, provider_id)                  -- One user per provider account
);

-- 4. Indexes
CREATE INDEX IF NOT EXISTS idx_connected_accounts_user ON public.connected_accounts(user_id);
CREATE INDEX IF NOT EXISTS idx_connected_accounts_provider ON public.connected_accounts(provider, provider_id);

-- 5. SIWE nonce tracking (prevent replay attacks)
CREATE TABLE IF NOT EXISTS public.siwe_nonces (
  nonce TEXT PRIMARY KEY,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  used BOOLEAN DEFAULT false
);

-- Auto-cleanup expired nonces (older than 10 minutes)
CREATE OR REPLACE FUNCTION cleanup_expired_nonces() RETURNS void AS $$
  DELETE FROM public.siwe_nonces WHERE created_at < NOW() - INTERVAL '10 minutes';
$$ LANGUAGE sql;

-- 6. RLS policies
ALTER TABLE public.connected_accounts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own connected accounts"
  ON public.connected_accounts FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can manage own connected accounts"
  ON public.connected_accounts FOR ALL
  USING (auth.uid() = user_id);

-- 7. Grant permissions
GRANT SELECT, INSERT, UPDATE, DELETE ON public.connected_accounts TO authenticated;
GRANT SELECT ON public.connected_accounts TO anon;

-- 8. Update users table — add auth_method tracking
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS auth_method TEXT DEFAULT 'wallet' CHECK (auth_method IN ('wallet', 'wallet_generated', 'legacy_email'));
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS last_signed_in TIMESTAMPTZ DEFAULT NOW();
