// Run with: node scripts/run-cohunt-migration.mjs
import { createClient } from '@supabase/supabase-js'

const SUPABASE_URL = 'https://kirgpeovueddvqtjxioj.supabase.co'
const SERVICE_ROLE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImtpcmdwZW92dWVkZHZxdGp4aW9qIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3MTYzMjk4MywiZXhwIjoyMDg3MjA4OTgzfQ.bDlDgvsoMWYA8WjA6WOquEDCcJlvhVrmp3MZ4WJZEPc'

const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
  auth: { persistSession: false }
})

// Use pg directly via the Supabase SQL API (available via service key)
async function sql(query) {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/`, {
    method: 'POST',
    headers: {
      'apikey': SERVICE_ROLE_KEY,
      'Authorization': `Bearer ${SERVICE_ROLE_KEY}`,
      'Content-Type': 'application/json',
      'Prefer': 'params=single-object'
    },
    body: JSON.stringify({ query })
  })
  const text = await res.text()
  return { ok: res.ok, status: res.status, text }
}

// The real way: use supabase-js to test table existence, then report what needs to be done
const checks = [
  { name: 'co_hunts table', table: 'co_hunts' },
  { name: 'notification_settings.hunt_alerts_enabled', table: 'notification_settings', col: 'hunt_alerts_enabled' },
  { name: 'notification_settings.hunt_alert_min_score', table: 'notification_settings', col: 'hunt_alert_min_score' },
]

console.log('\n🔍 Checking migration status...\n')

for (const check of checks) {
  const select = check.col ? check.col : 'id'
  const { error } = await supabase.from(check.table).select(select).limit(1)
  const exists = !error
  console.log(`${exists ? '✅' : '❌'} ${check.name}: ${exists ? 'EXISTS' : 'NEEDS CREATING'}`)
}

console.log('\n📋 SQL to run in Supabase Dashboard → SQL Editor:\n')
console.log(`-- Paste this at: https://supabase.com/dashboard/project/kirgpeovueddvqtjxioj/sql/new\n`)
console.log(`CREATE TABLE IF NOT EXISTS co_hunts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_a uuid REFERENCES users(id) ON DELETE CASCADE NOT NULL,
  user_b uuid REFERENCES users(id) ON DELETE CASCADE NOT NULL,
  match_id uuid REFERENCES matches(id) ON DELETE CASCADE,
  chain text NOT NULL DEFAULT 'base',
  status text DEFAULT 'active' CHECK (status IN ('invited', 'active', 'ended')),
  started_at timestamptz DEFAULT now(),
  ended_at timestamptz,
  user_a_tokens jsonb DEFAULT '[]',
  user_b_tokens jsonb DEFAULT '[]',
  shared_tokens jsonb DEFAULT '[]',
  created_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_co_hunts_user_a ON co_hunts(user_a);
CREATE INDEX IF NOT EXISTS idx_co_hunts_user_b ON co_hunts(user_b);

ALTER TABLE co_hunts ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='co_hunts' AND policyname='co_hunt_select') THEN
    CREATE POLICY co_hunt_select ON co_hunts FOR SELECT USING (auth.uid() = user_a OR auth.uid() = user_b);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='co_hunts' AND policyname='co_hunt_service') THEN
    CREATE POLICY co_hunt_service ON co_hunts USING (true) WITH CHECK (true);
  END IF;
END $$;

ALTER TABLE notification_settings ADD COLUMN IF NOT EXISTS hunt_alerts_enabled boolean DEFAULT true;
ALTER TABLE notification_settings ADD COLUMN IF NOT EXISTS hunt_alert_min_score integer DEFAULT 75;`)
