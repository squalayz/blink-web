import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

// ONE-SHOT MIGRATION ENDPOINT — DELETE AFTER USE
// Protected by ADMIN_PIN env var

export async function POST(req: NextRequest) {
  const { pin } = await req.json();
  if (pin !== process.env.ADMIN_PIN) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  const sb = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  const results: string[] = [];

  // We can't run DDL directly via supabase-js REST
  // Instead: use upsert with new columns to force Supabase to reveal if they exist,
  // and create a migration tracking table to know what's been run.
  // Actual approach: use the Supabase Management API with a personal access token.
  
  // Fallback: check what columns exist right now
  const { data: sample } = await sb.from('profiles').select('*').limit(1);
  if (sample?.[0]) {
    const existing = Object.keys(sample[0]);
    const needed = ['claim_code','claim_password_hash','claimable_points','trainer_points','candy','trophy_rating','battles_won','battles_lost','total_claimed_tokens','last_claim_at','trainer_code'];
    const missing = needed.filter(c => !existing.includes(c));
    results.push(`Existing columns: ${existing.length}`);
    results.push(`Missing columns: ${missing.join(', ') || 'none'}`);
    
    if (missing.length === 0) {
      return NextResponse.json({ status: 'already_migrated', columns: existing.length });
    }
  }

  return NextResponse.json({ 
    status: 'needs_migration',
    results,
    message: 'Run the SQL below in Supabase dashboard SQL editor',
    sql: `
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS claim_code VARCHAR(10) UNIQUE;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS claim_password_hash TEXT;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS claimable_points INTEGER DEFAULT 0;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS trainer_points INTEGER DEFAULT 0;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS candy INTEGER DEFAULT 0;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS trophy_rating INTEGER DEFAULT 1000;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS battles_won INTEGER DEFAULT 0;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS battles_lost INTEGER DEFAULT 0;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS total_claimed_tokens NUMERIC DEFAULT 0;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS last_claim_at TIMESTAMPTZ;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS trainer_code VARCHAR(8) UNIQUE;
CREATE TABLE IF NOT EXISTS claim_ledger (id UUID PRIMARY KEY DEFAULT gen_random_uuid(), profile_id UUID REFERENCES profiles(id) ON DELETE CASCADE, claim_code VARCHAR(10) NOT NULL, points_redeemed INTEGER NOT NULL, tokens_sent NUMERIC NOT NULL, eth_address VARCHAR(42) NOT NULL, tx_hash VARCHAR(66), status VARCHAR(20) DEFAULT 'pending', created_at TIMESTAMPTZ DEFAULT now(), completed_at TIMESTAMPTZ);
CREATE TABLE IF NOT EXISTS battle_sessions (id UUID PRIMARY KEY DEFAULT gen_random_uuid(), challenger_id UUID REFERENCES profiles(id) ON DELETE CASCADE, opponent_id UUID REFERENCES profiles(id) ON DELETE CASCADE, wager_points INTEGER DEFAULT 0, wager_candy INTEGER DEFAULT 0, status VARCHAR(20) DEFAULT 'pending', winner_id UUID REFERENCES profiles(id), battle_type VARCHAR(20) DEFAULT 'live', channel_id VARCHAR(100), created_at TIMESTAMPTZ DEFAULT now(), completed_at TIMESTAMPTZ);
CREATE TABLE IF NOT EXISTS friends (id UUID PRIMARY KEY DEFAULT gen_random_uuid(), requester_id UUID REFERENCES profiles(id) ON DELETE CASCADE, recipient_id UUID REFERENCES profiles(id) ON DELETE CASCADE, status VARCHAR(20) DEFAULT 'pending', created_at TIMESTAMPTZ DEFAULT now(), UNIQUE(requester_id, recipient_id));
    `.trim()
  });
}
