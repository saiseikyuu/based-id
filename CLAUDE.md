# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Based ID is a Base-native reputation and contribution network — the combined Galxe + Layer3 + Alphabot for the Base ecosystem: "The Hunters of Base". Three layers:

1. **Smart contracts** (Foundry/Solidity) — `BasedID`, `AuctionHouse`, `BasedHunters`, `MemeWar` (Phase 2)
2. **Next.js frontend** (`web/`) — wallet-connected dapp with Tailwind v4, wagmi/viem, RainbowKit
3. **Supabase backend** — PostgreSQL database for campaigns, XP, squads, Meme Wars

## Commands

### Smart Contracts (Foundry)
```bash
forge test
forge test --match-path test/BasedID.t.sol -vv
forge test --match-test testMint -vv
forge build
forge script script/Deploy.s.sol --rpc-url base_sepolia
forge script script/Deploy.s.sol --rpc-url base_sepolia --broadcast --verify
```

### Frontend (`web/` directory)
```bash
cd web
npm run dev      # dev server on localhost:3000
npm run build    # production build
npm run lint     # ESLint
```

## Navigation (Final)

`Campaigns · Meme Wars · Squads · Talents · Projects · Hunters`

- `/campaigns` — unified browse page (all campaign types). Filter by type, rank gate, sort.
- `/campaigns/[id]` — campaign detail + entry/claim/submit flow
- `/meme-wars` — active + past Meme Wars browser (Phase 2)
- `/meme-wars/[id]` — war detail: entry grid, live leaderboard, vote flow (Phase 2)
- `/squads` — squad browser + global/regional leaderboard (Phase 2)
- `/squads/[id]` — squad profile + members + active campaigns (Phase 2)
- `/talents` — searchable hunter directory by skill/rank/region (Phase 3)
- `/hunters` — Hunter License claim, rank upgrade, daily check-in, auctions, Rankings tab (replaces /leaderboard)
- `/projects` — partner project directory
- `/projects/[address]` — public project space + owner controls (edit profile, analytics tab, discover hunters tab)
- `/projects/[address]/new` — campaign creation form (owner only)
- `/profile/[address]` — hunter identity page: rank, XP, rep score, badges, squad, skills

**Analytics:** Not a nav link — lives inside `/projects/[address]` as an owner-only tab.

**Leaderboard:** Merged into `/hunters` as a "Rankings" tab. `/leaderboard` route removed.

## Build Phases

### Phase 1 — Foundation (85% complete → close gaps)
Built: campaigns, hunters hub, profile, projects, leaderboard.

Gaps to close:
- `bounty` + `creator_campaign` campaign types (DB enum + form + review flow)
- Public platform stats on `/` homepage (`GET /api/stats`)
- Project analytics tab at `/projects/[address]` (`GET /api/projects/[address]/analytics`)
- Reputation Score foundation: `reputation_score` + `reputation_breakdown` columns in `hunter_xp`
- `hunter_profiles` table: skills, availability, region, timezone, portfolio_links
- Hunter profile: badges placeholder + squad placeholder (empty state)

### Phase 2 — Social Growth (not started)
- Squads/Guilds module + DB tables
- Meme Wars module + `MemeWar.sol` smart contract
- Badge system + `badges` + `hunter_badges` tables
- Nav updates: add Meme Wars + Squads links

### Phase 3 — Opportunity Layer (not started)
- Talents page (`/talents`) + filtering API
- `min_reputation_score` as campaign eligibility rule
- Project hunter shortlist feature

### Phase 4 — Distribution & Monetization (not started)
- Enhanced analytics (bot signals, CSV export, real-time)
- Farcaster frames (interactive: check-in, campaign join, Meme War vote, rank card)
- Revenue mechanics (featured campaigns, premium analytics gate)

## Architecture

### Smart Contracts (`src/`)

**`BasedID.sol`** — ERC721 identity NFT. Sequential IDs, $2 USDC flat mint. IDs #1–#100 are the auction reserve. Fully on-chain SVG metadata. Token weight follows `1e18 / sqrt(tokenId)`.

**`AuctionHouse.sol`** — English auctions for reserve IDs (#1–#100). USDC bids, 5% minimum increment, 15-minute anti-snipe extension.

**`BasedHunters.sol`** — Soulbound ERC721 "Hunter License". One per wallet. Requires holding a BasedID. Rank (E→D→C→B→A→S→National) updated via oracle signature from backend.

**`MemeWar.sol`** _(Phase 2)_ — On-chain Meme War contract. Creator deposits USDC prize pool. Voters pay USDC per vote. Platform takes 5% fee. Payout: 1st=70% vote pool + full prize, 2nd=20%, 3rd=10%. Winner settled by calling `settleWar(warId, [1st,2nd,3rd])` after war ends.

Deployment order: `BasedID` → `ownerMint` → `AuctionHouse` → `BasedHunters` → `MemeWar`.

### Frontend (`web/`)

**`web/lib/contracts.ts`** — ABIs, contract addresses (from env), constants (`RANK_XP_THRESHOLDS`, `RANK_COSTS_USDC`, `RANK_LABELS`). Update when contracts change.

**`web/lib/supabase.ts`** — Two clients: `createBrowserClient()` (anon key, RLS enforced) and `createServerClient()` (service key, bypasses RLS — API routes only). Contains all shared TypeScript types.

**`web/app/providers.tsx`** — WagmiProvider + RainbowKitProvider + QueryClient. Includes `WrongNetworkBanner`.

**`web/app/api/`** — Next.js route handlers. Key routes:
- `api/campaigns` — GET list (filter by status/tier/partner), POST create
- `api/campaigns/[id]/enter` — raffle entry with task verification
- `api/campaigns/[id]/claim` — quest XP claim (rank multiplier applied, double-claim blocked via `campaign_claims`)
- `api/campaigns/[id]/submit` — bounty submission (Phase 1)
- `api/campaigns/[id]/review` — bounty approve/reject by project owner (Phase 1)
- `api/campaigns/[id]/draw` — draw raffle winners (partner only)
- `api/campaigns/[id]/status` — campaign status updates
- `api/hunters/rank` — GET XP breakdown; POST compute rank + oracle-signed `updateRank` payload
- `api/hunters/checkin` — daily check-in XP
- `api/hunters/reputation` — compute + return reputation score (Phase 1)
- `api/hunters/badges/check` — check + award eligible badges (Phase 2)
- `api/projects` — POST upsert project profile
- `api/projects/[address]` — GET project by address
- `api/projects/[address]/analytics` — GET per-campaign analytics for owner (Phase 1)
- `api/projects/[address]/shortlist` — POST shortlist a hunter (Phase 3)
- `api/squads` — GET list + leaderboard, POST create (Phase 2)
- `api/squads/[id]` — GET detail, POST join/leave (Phase 2)
- `api/meme-wars` — GET list, POST create (Phase 2)
- `api/meme-wars/[id]` — GET detail, POST submit/vote/settle (Phase 2)
- `api/talents` — GET searchable hunter directory (Phase 3)
- `api/stats` — GET public platform stats (Phase 1)
- `api/upload` — image upload to Supabase Storage (`drop-images` bucket)

**`web/app/components/Nav.tsx`** — Shared sticky desktop nav. Final: 6 links (Campaigns, Meme Wars, Squads, Talents, Projects, Hunters).

**`web/app/components/MobileNav.tsx`** — Fixed bottom nav for mobile (5 icons: Campaigns, Meme Wars, Squads, Talents, Projects).

### Campaign System

All types require `hold_based_id` task by default:

| Type | Reward logic |
|------|-------------|
| **Quest** | Everyone who completes tasks earns XP (rank multiplier applied). No winner draw. |
| **Raffle / Whitelist / NFT Mint / Token Drop** | Users enter pool, partner draws random winners after end date. |
| **Bounty** _(Phase 1)_ | Users submit work (file/link/text). Project owner reviews, approves, awards XP. |
| **Creator Campaign** _(Phase 1)_ | Influencer-run campaigns using same infrastructure as above. |

XP rank multipliers applied at claim time:
```
E=1.0×  D=1.1×  C=1.25×  B=1.5×  A=1.75×  S=2.0×  National=2.5×
```

Task types: `follow_x`, `hold_nft`, `hold_based_id`, `min_hunter_rank`, `min_reputation_score` (Phase 3), `squad_id` (Phase 2).

Double-claim prevention: `campaign_claims` table has unique constraint on `(campaign_id, wallet_address)`.

### XP / Hunter Rank System

XP sources in `hunter_xp` table:
- `entries_xp` = campaign entries × 10
- `wins_xp` = raffle wins × 50
- `checkin_xp` = daily check-in accumulation (5 XP/day + streak bonuses)
- `quest_xp` = from `quest_completions` table

Oracle pattern: backend signs `keccak256(chainId, contract, wallet, newRank, nonce)`. Contract verifies in `updateRank`. Nonce = `currentRank + 1` fetched live.

Rank thresholds: E=0, D=300, C=800, B=2000, A=5000, S=12000, N=30000.

XP is a **pure reputation metric** — it never decreases and cannot be spent. A separate points/raffle-tickets currency is used for purchases and entries (future).

### Reputation Score

Separate from Hunter Rank. Computed off-chain by `GET /api/hunters/reputation`, stored in `hunter_xp.reputation_score`. Used as an anti-sybil/quality filter for campaign eligibility.

| Signal | Points |
|--------|--------|
| Holds Based ID | +50 |
| Wallet age 0–730 days on Base | 0 → +100 (linear) |
| Base tx count 0–500 | 0 → +100 (linear) |
| Completed campaigns × 5 (max +200) | up to +200 |
| Approved bounties × 15 | uncapped |
| Meme War entries × 3 (max +60) | up to +60 |
| 7-day streaks completed × 2 (max +60) | up to +60 |
| Farcaster verified | +30 |
| Twitter verified | +20 |
| Reports against wallet × -25 | negative |

Score is recomputed on-event (campaign claim, rank update, bounty approval) and refreshed daily.

### Squads System _(Phase 2)_

- One squad per hunter (leave to join another)
- Squad XP = sum of all members' `contribution_xp` (incremented when members earn XP while in squad)
- Projects can create squad-only campaigns via `squad_id` task type
- Regional leaderboards by self-declared `region` field

### Meme Wars System _(Phase 2)_

- On-chain USDC paid votes — no free votes
- Platform fee: 5% of total vote pool (taken in `MemeWar.sol` before payout)
- Payout: 1st=70% vote pool + full prize pool, 2nd=20%, 3rd=10%
- XP: submission=+10, 1st win=+100, 2nd=+50, 3rd=+25
- War settled by creator or platform admin calling settle API after `ends_at`

### Badge System _(Phase 2)_

Soulbound badges auto-awarded on events. Criteria types: `campaign_count`, `streak_days`, `meme_war_wins`, `rank_reached`, `bounty_count`, `squad_role`. Award check via `POST /api/hunters/badges/check` called after each relevant event.

### Database (Supabase)

Schema in `supabase/schema.sql`. Key tables:

**Phase 1 (existing):**
- `campaigns` — type enum: `quest|raffle|whitelist|nft_mint|token_drop|bounty|creator_campaign`. Status: `pending_payment → pending_review → active → ended → drawn/completed/cancelled`
- `tasks` — gating conditions per campaign
- `entries` + `task_completions` — raffle participation records
- `campaign_claims` — quest XP claims, unique `(campaign_id, wallet_address)`
- `hunter_xp` — XP + `reputation_score int` + `reputation_breakdown jsonb`
- `quest_completions` — legacy quest XP (wallet, quest_id, period, earned_xp)
- `projects` — partner profiles (address, name, logo_url, banner_url, twitter, discord, website, email)
- `twitter_verifications` — confirmed Twitter follows

**Phase 1 (new):**
- `bounty_submissions` — id, campaign_id, wallet_address, content_url, submission_text, status (pending/approved/rejected), reviewer_notes, xp_awarded, paid_at
- `hunter_profiles` — wallet_address (PK), skills text[], availability, region, timezone, portfolio_links text[]

**Phase 2 (new):**
- `squads` — id, name, slug, description, logo_url, region, type, owner_wallet, total_xp, member_count
- `squad_members` — squad_id, wallet_address, role (owner/officer/member), contribution_xp, joined_at
- `meme_wars` — id, contract_address, creator_wallet, title, theme, prize_pool_usdc, vote_cost_usdc, starts_at, ends_at, status, winner_entry_id
- `meme_entries` — id, meme_war_id, hunter_wallet, media_url, caption, vote_count, support_amt, rank
- `meme_votes` — id, entry_id, voter_wallet, vote_count, amount_paid, tx_hash
- `badges` — id, name, description, image_url, criteria_type, criteria_value, soulbound
- `hunter_badges` — id, wallet_address, badge_id, earned_at; unique (wallet_address, badge_id)

**Phase 3 (new):**
- `project_shortlists` — project_address, wallet_address, note

RLS is enabled. API routes use service key; browser uses anon key.

### Project Space (`/projects/[address]`)

Public view shows banner, logo, active/past campaigns. When connected wallet matches the project address, owner sees:
- **Edit Profile** — inline form to update name, description, logo, banner, socials
- **Create Campaign** button — links to `/projects/[address]/new`
- **Analytics tab** — per-campaign entries, completions, completion rate (Phase 1)
- **Discover Hunters tab** — shortlist talent from `/talents` (Phase 3)
- **Campaign list** — status, entry count, Draw Winners button for ended raffles

## Environment Variables

Foundry: `.env` at repo root. Frontend: `web/.env.local` — `NEXT_PUBLIC_*` vars exposed to browser.

- `NEXT_PUBLIC_CHAIN_ID` — `8453` mainnet, `84532` Sepolia
- `NEXT_PUBLIC_CONTRACT_ADDRESS` — BasedID
- `NEXT_PUBLIC_AUCTION_HOUSE_ADDRESS` — AuctionHouse
- `NEXT_PUBLIC_HUNTERS_ADDRESS` — BasedHunters
- `NEXT_PUBLIC_MEME_WAR_ADDRESS` — MemeWar (Phase 2)
- `HUNTERS_ORACLE_PK` — oracle signer private key (server-only)
- `NEXT_PUBLIC_SUPABASE_URL` / `NEXT_PUBLIC_SUPABASE_ANON_KEY` / `SUPABASE_SERVICE_KEY`
- `NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID`
