# MishMesh Web App — Full Rebuild Instructions

## OBJECTIVE
Rebuild the Next.js web app at this repo to match the iOS app at /Users/pasqualeceli/Projects/mishmesh/rork-mishmesh 1:1.
The app already builds (verified). Your job is to fill gaps and make every screen match the iOS version.

## CRITICAL RULES
1. **Inline styles ONLY** — zero Tailwind classes anywhere. Use `style={{ }}` on every element.
2. **No emojis in UI** — text only, icons from lucide-react
3. **No mock/demo data** — all real from Supabase
4. **Color palette:**
   - bg: #0a0a0f
   - surface: #0d0d14
   - surface2: #1a1a24
   - indigo: #6366f1
   - cyan: #06b6d4
   - gold: #F59E0B
   - text: #ffffff
   - muted: #9ca3af
5. **Fee wallets (10% on ALL transactions):**
   - ETH: 0x00468c1B22451ed9Fabc9DA32E6aEa28DC03a216
   - SOL: FYxEmF7VKHpp1781aKFMWYc23kwgsD5j4foyCa2SKji7
   - BTC: bc1q7tw2jnmj3v483vatwts8h8nrradct0yfpaj64

## iOS APP STRUCTURE (tabs from MainTabView.swift)
The iOS app has 5 main tabs:
1. **Hunt** (map icon) → HomeMapView — full-screen map with orb markers
2. **Live Feed** (radio waves icon) → LiveMomentsFeedView — social feed
3. **Drop** (flame icon) → LaunchOrbFlowView — create/drop orbs
4. **Messages** (bubbles icon) → MessagesView — real-time chat
5. **Profile** (person icon) → ProfileView — user profile

Plus a top PortfolioBar that opens WalletView as a sheet.

## WHAT EXISTS (already built, may need polish)
- `/` landing page (846 lines)
- `/auth/signin` (459 lines)
- `/hunt` (316 lines)
- `/wallet` (463 lines)
- `/drop` (972 lines)
- `/leaderboard` (569 lines)
- `/messages` and `/messages/[id]`
- `/profile` and `/profile/[id]`
- `/crack/[id]` (54 lines — stub only)
- `/onboarding`
- `/live`
- Various API routes in /src/app/api/
- Components: AppShell, BottomNav, HuntMap, OrbDetailSheet, etc.

## WHAT'S MISSING (must build)
- `/auth/signup` — full signup flow with wallet creation
- `/missions` — daily/weekly missions
- `/tasks` — P2P task marketplace
- `/squads` — create/join squads
- `/orb/[code]` — gift orb landing page

## WORK ORDER

### Phase 1: Read & Understand
Read these iOS files to understand the UI and business logic:
- All files in /ios/MishMesh/Views/ (especially HomeMapView, WalletView, ProfileView, LeaderboardView)
- All files in /ios/MishMesh/Services/ (especially OrbService, WalletService, EscrowService, FeeWaterfallEngine, PlatformFeeConfig)
- All files in /ios/MishMesh/Models/
- Current web app src/ to understand what exists

### Phase 2: Fix Existing Pages
Go through each existing page and ensure it matches the iOS counterpart:

#### 2a. Landing Page (/)
- Read /ios/MishMesh/Views/Onboarding/HeroSplashScreen.swift, ParticleFieldView.swift
- Animated orb with particle effects
- Dark theme #0a0a0f background
- Clean CTA to sign up

#### 2b. Auth (/auth/signin + create /auth/signup)
- Read /ios/MishMesh/Views/Onboarding/EmailSignupScreen.swift, WalletSignupScreen.swift, WalletCreatedScreen.swift
- Email/password with Supabase auth
- On signup: auto-create ETH wallet (ethers.js) and SOL wallet (@solana/web3.js)
- Encrypt private keys with WALLET_ENCRYPTION_KEY env var
- Store encrypted keys in Supabase wallets table

#### 2c. Hunt Map (/hunt)
- Read /ios/MishMesh/Views/Home/HomeMapView.swift, NearbyOrbsSheet.swift, OrbDetailSheet.swift
- Full-screen Leaflet map (already has leaflet dep)
- Load real orbs from Supabase via /api/orbs/active
- User GPS location with blue dot
- Orb markers with rarity-based glow colors:
  - Common: #9ca3af (gray)
  - Rare: #6366f1 (indigo) 
  - Epic: #06b6d4 (cyan)
  - Legendary: #F59E0B (gold)
- Proximity pulse: >500m=slow dim, <100m=fast bright, <50m=bounce
- Tap orb → detail sheet with Crack button
- H3 hex overlay for territories

#### 2d. Crack (/crack/[id])
- Read /ios/MishMesh/Views/Crack/CrackExperienceView.swift
- Currently a 54-line stub — needs full rebuild
- GPS proximity check (must be within 50m)
- Cinematic crack animation: orb shatters, particles fly, value revealed
- On crack: crypto sent to cracker minus 10% platform fee
- Streak multiplier: 3d=1.1x, 7d=1.25x, 30d=1.5x
- Update Supabase: mark orb claimed, record transaction, record fee

#### 2e. Drop (/drop)
- Read /ios/MishMesh/Views/Launch/LaunchOrbFlowView.swift, OrbContentsView.swift, PlaceOrbMapView.swift
- Multi-step flow: select crypto → enter amount → choose rarity → place on map → confirm
- 10% platform fee deducted upfront
- Real crypto transfer to escrow
- Save orb to Supabase with GPS coords

#### 2f. Wallet (/wallet)
- Read /ios/MishMesh/Views/Wallet/WalletView.swift, ChainSectionView.swift, OrbLocksSection.swift, ReferralEarningsCard.swift
- Real ETH/SOL/BTC balances from blockchain
- Portfolio summary bar
- Send/Receive crypto modals
- Orb locks section (pending orbs user dropped)
- Referral earnings card
- NFT collection view

#### 2g. Leaderboard (/leaderboard)
- Read /ios/MishMesh/Views/Leaderboard/LeaderboardView.swift
- Weekly / All-time tabs
- Real data from Supabase
- Weekly prize countdown
- Rank badges with colors

#### 2h. Profile (/profile)
- Read /ios/MishMesh/Views/Profile/ProfileView.swift, EditProfileView.swift, PublicProfileView.swift
- Stats: orbs cracked, orbs dropped, total earnings
- Avatar upload
- Social follow/unfollow
- Reputation badge
- Edit profile flow

#### 2i. Messages (/messages)
- Read /ios/MishMesh/Views/Messages/MessagesView.swift, ChatView.swift
- Conversation list with last message preview
- Real-time chat via Supabase realtime subscriptions
- Message input with send button

### Phase 3: Build Missing Pages

#### 3a. Missions (/missions)
- Read /ios/MishMesh/Views/Missions/MissionsView.swift
- Daily/weekly mission cards
- Progress bars
- Claim rewards button
- Data from Supabase missions table

#### 3b. Tasks (/tasks)
- Read /ios/MishMesh/Views/Tasks/TasksFeedView.swift, CreateTaskView.swift, TaskDetailView.swift
- Task feed with filter tabs
- Create task form (title, description, crypto reward, deadline)
- Task detail with apply button
- 10% platform fee on completion
- /tasks/create and /tasks/[id] routes

#### 3c. Squads (/squads)
- Read /ios/MishMesh/Views/Squads/SquadView.swift
- Squad list / create squad
- Squad detail with members
- Squad leaderboard
- /squads/[id] route

#### 3d. Gift Orb (/orb/[code])
- Read /ios/MishMesh/Views/Gift/GiftOrbLandingView.swift, GiftLandingView.swift
- Public page (no auth required)
- Animated orb with rarity glow
- Shows orb value and who sent it
- CTA to sign up and claim

### Phase 4: Navigation & Layout
- Bottom nav matching iOS tabs: Hunt, Live, Drop, Messages, Profile
- PortfolioBar at top (links to /wallet)
- AppShell wrapper with both

### Phase 5: Database Migrations
Create SQL migrations in supabase/migrations/ for any missing tables:
- missions, mission_progress
- tasks, task_applications
- squads, squad_members
- gift_orbs
- Ensure platform_fees, transactions, orbs, wallets, profiles tables exist

### Phase 6: Build & Verify
Run `npx next build` and fix ALL errors until it builds clean.

## STYLE GUIDE (applied to every component)
```jsx
// Page container
<div style={{ minHeight: '100vh', backgroundColor: '#0a0a0f', color: '#ffffff' }}>

// Card
<div style={{ backgroundColor: '#0d0d14', borderRadius: 16, padding: 20, border: '1px solid #1a1a24' }}>

// Primary button
<button style={{ 
  backgroundColor: '#6366f1', color: '#fff', border: 'none', 
  borderRadius: 12, padding: '14px 28px', fontSize: 16, fontWeight: 600,
  cursor: 'pointer', width: '100%' 
}}>

// Secondary/outline button
<button style={{
  backgroundColor: 'transparent', color: '#6366f1', 
  border: '1px solid #6366f1', borderRadius: 12, padding: '12px 24px'
}}>

// Input field
<input style={{
  backgroundColor: '#1a1a24', color: '#fff', border: '1px solid #2a2a34',
  borderRadius: 12, padding: '14px 16px', fontSize: 16, width: '100%',
  outline: 'none'
}} />

// Muted text
<span style={{ color: '#9ca3af', fontSize: 14 }}>

// Gold accent
<span style={{ color: '#F59E0B' }}>

// Cyan accent
<span style={{ color: '#06b6d4' }}>
```

## API ROUTES NEEDED
Verify these exist and work:
- POST /api/auth/signup — create user + wallet
- POST /api/auth/signin — sign in
- GET /api/orbs/active — get active orbs for map
- POST /api/orbs/drop — create orb with fee
- POST /api/orbs/crack — crack orb with fee
- POST /api/orbs/cancel — cancel/reclaim orb
- GET /api/wallet/balance — get real blockchain balances
- POST /api/wallet/setup — create wallet for user
- GET /api/leaderboard — get leaderboard data
- GET /api/activity — get activity feed
- POST /api/missions — get/claim missions
- POST /api/tasks — CRUD for tasks
- POST /api/squads — CRUD for squads

## REMEMBER
- INLINE STYLES ONLY (style={{ }})
- NO Tailwind classes
- NO emojis in the UI
- Dark theme everywhere
- All data from Supabase
- 10% fee on every transaction
- Must build clean with `npx next build`
