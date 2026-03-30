-- Add multi-chain wallet columns to users table
ALTER TABLE users ADD COLUMN IF NOT EXISTS sol_address TEXT;
ALTER TABLE users ADD COLUMN IF NOT EXISTS eth_address TEXT;
ALTER TABLE users ADD COLUMN IF NOT EXISTS btc_address TEXT;
ALTER TABLE users ADD COLUMN IF NOT EXISTS preferred_chain TEXT DEFAULT 'solana' CHECK (preferred_chain IN ('solana', 'ethereum', 'bitcoin'));

-- Add chain column to orbs table
ALTER TABLE orbs ADD COLUMN IF NOT EXISTS chain TEXT DEFAULT 'solana' CHECK (chain IN ('solana', 'ethereum', 'bitcoin'));
ALTER TABLE orbs ADD COLUMN IF NOT EXISTS currency TEXT DEFAULT 'SOL' CHECK (currency IN ('SOL', 'ETH', 'BTC', 'SPL', 'ERC20', 'NFT'));

-- Index for chain queries
CREATE INDEX IF NOT EXISTS idx_orbs_chain ON orbs(chain);
CREATE INDEX IF NOT EXISTS idx_users_sol_address ON users(sol_address);
CREATE INDEX IF NOT EXISTS idx_users_eth_address ON users(eth_address);
