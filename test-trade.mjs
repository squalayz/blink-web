// Quick test of the trading pipeline for Squalay's account
import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://kirgpeovueddvqtjxioj.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImtpcmdwZW92dWVkZHZxdGp4aW9qIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3MTYzMjk4MywiZXhwIjoyMDg3MjA4OTgzfQ.bDlDgvsoMWYA8WjA6WOquEDCcJlvhVrmp3MZ4WJZEPc';
const supa = createClient(SUPABASE_URL, SUPABASE_KEY);
const USER_ID = '3ea0f601-f311-43be-9388-543f3fd66caa';

async function test() {
  // Step 1: Check agent_balances
  console.log('=== Step 1: Agent Balances ===');
  const { data: agent, error: ae } = await supa.from('agent_balances')
    .select('*').eq('user_id', USER_ID).single();
  if (ae) { console.log('ERROR:', ae.message); return; }
  console.log('trading_enabled:', agent?.trading_enabled, 'mode:', agent?.trading_mode);

  // Step 2: Check user has keys
  console.log('\n=== Step 2: User Keys ===');
  const { data: user } = await supa.from('users')
    .select('wallet_address, wallet_encrypted_key, ai_api_key_encrypted, ai_provider')
    .eq('id', USER_ID).single();
  console.log('wallet:', user?.wallet_address);
  console.log('has_enc_key:', !!user?.wallet_encrypted_key);
  console.log('has_ai_key:', !!user?.ai_api_key_encrypted);
  console.log('ai_provider:', user?.ai_provider);

  // Step 3: Check wallet balance
  console.log('\n=== Step 3: Wallet Balance ===');
  const balRes = await fetch('https://mainnet.base.org', {
    method: 'POST', headers: {'Content-Type':'application/json'},
    body: JSON.stringify({jsonrpc:'2.0',method:'eth_getBalance',params:[user.wallet_address,'latest'],id:1})
  });
  const balData = await balRes.json();
  const balEth = parseInt(balData.result, 16) / 1e18;
  console.log('balance:', balEth.toFixed(6), 'ETH');
  console.log('passes min 0.002?', balEth >= 0.002);

  // Step 4: Fetch tokens
  console.log('\n=== Step 4: Token Feed ===');
  const watchlist = [
    "0x940181a94A35A4569E4529A3CDfB74e38FD98631",
    "0x532f27101965dd16442E59d40670FaF5eBB142E4",
    "0x4ed4E862860beD51a9570b96d89aF5E1B0Efefed",
    "0xAC1Bd2486aAf3B5C0fc3Fd868558b082a531B2B4",
    "0x0b3e328455c4059EEb9e3f84b5543F74E24e7E1b",
  ];
  const tokRes = await fetch(`https://api.dexscreener.com/latest/dex/tokens/${watchlist.join(',')}`);
  const tokData = await tokRes.json();
  const pairs = (tokData.pairs || []).filter(p => p.chainId === 'base');
  const seen = new Set();
  const tokens = [];
  for (const p of pairs) {
    const addr = p.baseToken?.address?.toLowerCase();
    if (seen.has(addr)) continue;
    seen.add(addr);
    tokens.push({ symbol: p.baseToken.symbol, address: p.baseToken.address, price: parseFloat(p.priceUsd||'0'), volume24h: p.volume?.h24||0, liquidity: p.liquidity?.usd||0, priceChange1h: p.priceChange?.h1||0, priceChange24h: p.priceChange?.h24||0 });
  }
  console.log(`${tokens.length} unique tokens:`);
  tokens.forEach(t => console.log(`  ${t.symbol}: $${t.price} vol=$${(t.volume24h/1000).toFixed(0)}k liq=$${(t.liquidity/1000).toFixed(0)}k 1h=${t.priceChange1h}%`));

  // Step 5: Test AI call
  console.log('\n=== Step 5: AI Decision ===');
  const tokenData = tokens.slice(0,10).map(t =>
    `${t.symbol} ($${t.price.toFixed(6)}) | 1h:${t.priceChange1h>0?'+':''}${t.priceChange1h.toFixed(1)}% | 24h:${t.priceChange24h>0?'+':''}${t.priceChange24h.toFixed(1)}% | Vol:$${(t.volume24h/1000).toFixed(0)}k | Liq:$${(t.liquidity/1000).toFixed(0)}k`
  ).join('\n');

  const system = `You are an autonomous trading agent on Base L2.
STRATEGY: MEME SCOUT: Hunt trending meme tokens. Buy early, sell at 2-5x.
RISK: DEGEN
IMPORTANT: You are an ACTIVE trading agent. Always pick the BEST opportunity. Only hold if EVERY token looks dangerous.
Respond ONLY with JSON: {"action":"buy|sell|hold","token":"SYMBOL","tokenAddress":"0x...","confidence":0-100,"amountPct":5-25,"reasoning":"one sentence"}`;

  const userMsg = `PORTFOLIO:
- Balance: ${balEth.toFixed(4)} ETH ($${(balEth*1950).toFixed(0)})
- Open positions: 0
- Today's P&L: 0 ETH
- Win rate: N/A

TRENDING TOKENS:
${tokenData}

POSITIONS:
No open positions.

Your move?`;

  console.log('Calling OpenAI with key:', user.ai_api_key_encrypted?.slice(0,20) + '...');
  
  try {
    const aiRes = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${user.ai_api_key_encrypted}` },
      body: JSON.stringify({ model: 'gpt-4o-mini', messages: [{ role:'system', content: system }, { role:'user', content: userMsg }], max_tokens: 200 }),
    });
    const aiData = await aiRes.json();
    if (aiData.error) { console.log('AI ERROR:', JSON.stringify(aiData.error)); return; }
    const content = aiData.choices?.[0]?.message?.content;
    console.log('AI response:', content);
    
    const jsonMatch = content?.match(/\{[\s\S]*?\}/);
    if (jsonMatch) {
      const decision = JSON.parse(jsonMatch[0]);
      console.log('Parsed decision:', decision);
    }
  } catch (e) {
    console.log('AI call failed:', e.message);
  }
}

test().catch(e => console.error('FATAL:', e));
