# BLINK

**Don't blink. The Eye is open.**

Pokémon GO meets crypto. Players catch mystical BLINK creatures — Sprites, Cyclops, Cats, Oracles, and more — scattered on a real-world map. The Telegram bot [@TheEyeBlinkBot](https://t.me/blinkworldeth) announces spawns and catches in real time, 24/7.

## Phase 1 — what this codebase is

A Next.js 14 + Supabase web app:

- Watch the map for creatures spawning around you.
- Approach them in the real world (or virtually).
- Witness — catch them. Collect them. Climb The Council.
- $BLINK token rewards coming.

## Stack

- **Framework**: Next.js 14 (App Router, edge runtimes for OG/auth)
- **DB & Auth**: Supabase (Postgres + Auth + Storage)
- **Wallets**: viem / wagmi / ethers / @solana/web3.js / bitcoinjs-lib
- **Map**: Leaflet + Mapbox GL
- **Telegram bot**: grammy
- **Animations**: framer-motion + inline CSS

## Local dev

```bash
npm install
npm run dev
# http://localhost:3000
```

Required env vars are in `VERCEL-ENV-VARS.txt`. Set them via Vercel or a local `.env.local`.

## Routes

| Route | Purpose |
|---|---|
| `/` | Marketing landing — The Eye, the bestiary, The Council |
| `/watch` | The Eye Map — see creatures spawning around you |
| `/spawn` | Spawn a creature at a location |
| `/catch/[id]` | Catch / witness flow |
| `/council` | The Council — top Watchers |
| `/live` | Live activity feed |
| `/missions` | Missions / daily objectives |
| `/messages` | DMs |
| `/wallet` | Multi-chain wallet (SOL / ETH / BTC) |
| `/profile` | Watcher profile + stats |
| `/trails` | Curated paths |
| `/squads` | Watcher squads |

## Brand

- Primary green: `#00FF88`
- Secondary green: `#88FF00`
- Background: `#0a0a0f`
- Logo: `/public/blink-logo.png`
- Tagline: "Don't blink. The Eye is open."

## Telegram

- Group: https://t.me/blinkworldeth
- Bot: `@TheEyeBlinkBot`

## Phase 1 scope

Visual + textual rebrand only. Game logic (spawning, catching, wallet flows) is unchanged and stays at the same Supabase schema. See `BLINK_REBRAND_CHANGELOG.md` for the full diff.

Phase 2 will redesign the catch/witness experience and wire creature types end-to-end into the spawn/catch flow.
