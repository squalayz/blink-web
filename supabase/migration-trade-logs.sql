-- Migration: trade_logs + agent_performance tables
-- For "The Buzz" live command center dashboard tab

-- ═══ TRADE LOGS ═══
-- Every buy/sell/signal event from the trading engine
create table if not exists trade_logs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references users(id) on delete cascade not null,
  agent_id uuid,
  action text not null check (action in ('buy','sell','signal')),
  token_symbol text not null,
  token_address text,
  amount numeric not null default 0,
  price numeric not null default 0,
  pnl numeric default 0,
  grade text,
  trade_score numeric default 0,
  gas_cost numeric default 0,
  tx_hash text,
  reasoning text,
  confidence integer,
  timestamp timestamptz default now()
);

-- Indexes for fast queries
create index if not exists idx_trade_logs_user_id on trade_logs(user_id);
create index if not exists idx_trade_logs_timestamp on trade_logs(user_id, timestamp desc);
create index if not exists idx_trade_logs_action on trade_logs(user_id, action);

-- RLS
alter table trade_logs enable row level security;

create policy "Users can view own trade logs"
  on trade_logs for select
  using (auth.uid() = user_id);

create policy "Service role can insert trade logs"
  on trade_logs for insert
  with check (true);

-- ═══ AGENT PERFORMANCE ═══
-- Aggregated performance stats per user, updated after each trade
create table if not exists agent_performance (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references users(id) on delete cascade not null unique,
  total_trades int default 0,
  winning_trades int default 0,
  total_pnl numeric default 0,
  best_trade_pnl numeric default 0,
  worst_trade_pnl numeric default 0,
  sharpe_ratio numeric default 0,
  current_grade text default 'C',
  api_costs_total numeric default 0,
  last_updated timestamptz default now()
);

create index if not exists idx_agent_performance_user on agent_performance(user_id);

-- RLS
alter table agent_performance enable row level security;

create policy "Users can view own performance"
  on agent_performance for select
  using (auth.uid() = user_id);

create policy "Service role can upsert performance"
  on agent_performance for all
  with check (true);
