import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-admin';

export async function GET(req: NextRequest) {
  const authHeader = req.headers.get('authorization');
  const cronSecret = process.env.CRON_SECRET;
  if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const now = new Date().toISOString();

  const { data: expiredOrbs, error } = await supabaseAdmin
    .from('orbs')
    .update({ status: 'expired', expired_at: now })
    .eq('status', 'pending')
    .lt('expires_at', now)
    .select('id');

  if (error) {
    return NextResponse.json({ error: 'Expiry failed', details: error.message }, { status: 500 });
  }

  // Release wallet locks for expired orbs
  const orbIds = (expiredOrbs || []).map(o => o.id);
  if (orbIds.length > 0) {
    await supabaseAdmin
      .from('wallet_locks')
      .update({ status: 'released', updated_at: now })
      .in('orb_id', orbIds)
      .eq('status', 'locked');
  }

  return NextResponse.json({ expired: orbIds.length });
}
