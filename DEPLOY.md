# MishMesh.ai — Production Deployment Guide

## Pre-Deploy Checklist

### 1. Environment Variables (Vercel)
```
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=
NEXTAUTH_SECRET=
WALLET_ENCRYPTION_KEY=
OPENAI_API_KEY=
NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID=
NEXT_PUBLIC_BASE_RPC_URL=https://mainnet.base.org
NFT_CONTRACT_ADDRESS=
FUSION_NFT_CONTRACT_ADDRESS=
TOKEN_LAUNCHER_ADDRESS=
TELEGRAM_BOT_TOKEN=
NEXT_PUBLIC_APP_URL=https://mishmesh.ai
```

### 2. Supabase: Run migrations in order
schema-final.sql → migration-wallet-auth.sql → migration-production.sql →
migration-ux-optimization.sql → migration-viral-mechanics.sql →
migration-ventures.sql → migration-fusions.sql → migration-tokens.sql

Enable: `CREATE EXTENSION IF NOT EXISTS vector;`
Enable: `CREATE EXTENSION IF NOT EXISTS "uuid-ossp";`

### 3. Deploy Contracts to Base
1. MishMeshMatch.sol (Match NFTs)
2. FusionNFT.sol (Fusion NFTs, 0.01 ETH)
3. TokenLauncher.sol → auto-deploys AgentToken + BondingCurve

All fees → 0xEe9D166D9620af58248F5A7b4e86d3177E96c280

### 4. Deploy: `vercel --prod`

### 5. Telegram Webhook
```
https://api.telegram.org/bot{TOKEN}/setWebhook?url=https://mishmesh.ai/api/telegram/webhook
```

## Revenue: 10% deposits, 1% trades, 1% token trades, 0.01 ETH NFT mints, 10% venture investments, tier subs
