# 🚨 URGENT AMENDMENT — Phase 1 Spec Update

**Read this NOW. This supersedes any chain/wallet decisions in BLINK_REBRAND_PHASE1.md.**

## CRITICAL CHANGE: BLINK = ETHEREUM MAINNET ONLY

MishMesh supported Ethereum + Bitcoin + Solana. **BLINK does not.** BLINK is **100% Ethereum-only.**

### KILL all references to Bitcoin and Solana
Find and remove ALL of the following from user-facing UI:

#### Bitcoin (BTC)
- Token symbol: `BTC`
- Anywhere "Bitcoin" or "BTC" appears in user-facing copy
- Bitcoin logo/icon references
- BTC wallet addresses in display
- BTC balance UI
- BTC chain options in selectors
- BTC currency conversions
- `bip122:p2wpkh` references in UI
- `bc1q...` style addresses

#### Solana (SOL)
- Token symbol: `SOL`
- Anywhere "Solana" or "SOL" appears in user-facing copy
- Solana logo/icon references
- SOL wallet addresses in display
- SOL balance UI
- SOL chain options in selectors
- SOL currency conversions
- Phantom wallet integration UI (if any references)
- `solana:` style addresses

### KEEP: Ethereum + Base (if there's existing Base support)
- ETH on Ethereum mainnet (primary)
- ERC-20 tokens
- ETH wallet (MetaMask, WalletConnect, RainbowKit, etc.)
- 0x... addresses

**Note:** If MishMesh had Base/L2 support, leave that for now (BLINK might use Base in Phase 2 for low-fee operations, but mainnet is the headline chain).

### Files likely affected
- `ChainSelector.tsx` — remove BTC + SOL options, keep ETH
- `WalletCard.tsx` / `WalletModal.tsx` / `WalletConnect.tsx` — ETH only
- `OrbMarker.tsx` (if it shows chain icons) — ETH only
- Any page showing balances — ETH only
- `/wallet`, `/market`, `/messages` pages — ETH only
- `.env.example` and any env vars naming non-ETH chains — annotate as deprecated/unused
- Smart contract / API references — keep but flag non-ETH ones as unused

### What to do with non-ETH code
- **DO NOT delete the code yet.** Just hide it from UI. We may resurrect it on day far in the future for L2s.
- **Comment it out OR feature-flag it** with `// BLINK: ETH-only — disabled` comments
- **Remove from chain selectors / UI lists** so users never see BTC or SOL
- **Remove from copy** ("Trade BTC, SOL, ETH" → "Trade ETH")

### Lore/Copy update
Where MishMesh said things like "multi-chain hunting":
- New BLINK copy: "Built on Ethereum"
- "The Eye watches on Ethereum mainnet"
- Avoid claims of multi-chain anywhere

### Action
Continue Phase 1 work as planned. WHEN you reach any chain-selector / wallet / balance UI, apply this amendment.

Add a section to `BLINK_REBRAND_CHANGELOG.md` titled "ETH-Only Migration" listing every file where you removed BTC/SOL from user-facing UI.

Confirm at the end: "ETH-only migration complete. Verified no BTC/SOL strings remain in user-facing components."

— Pasquale (BLINK founder), via Ares (24:00 UTC instruction)
