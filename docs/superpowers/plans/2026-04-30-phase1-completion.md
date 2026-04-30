# Phase 1 Completion Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Close the Phase 1 gaps — bounty campaign type, public platform stats, project analytics tab, reputation score foundation, and hunter profile skill/badge/squad additions.

**Architecture:** All new features are additive — new DB tables, new API routes, and new UI sections bolted onto existing pages. No existing routes are broken. DB changes run first (migrations in `supabase/schema.sql`), then API routes, then frontend.

**Tech Stack:** Next.js 15 App Router, Supabase (PostgreSQL + RLS), TypeScript, Tailwind v4, wagmi/viem, React

---

## Scope: 7 independent tasks (after Task 1 DB migrations)

1. DB migrations (everything depends on this — do first)
2. TypeScript type updates
3. Stats API + homepage update
4. Bounty campaign type (API + wizard)
5. Reputation score API
6. Project analytics tab
7. Hunter profile additions (skills, badges placeholder, squad placeholder)

---

## Task 1: DB Migrations

**Files:**
- Modify: `supabase/schema.sql`

Run these SQL statements in the **Supabase Dashboard → SQL Editor → New query → Run**. Then append them to `supabase/schema.sql` so the file stays the source of truth.

- [ ] **Step 1: Add bounty + creator_campaign to campaign_type enum**

Run in Supabase SQL Editor:
```sql
ALTER TYPE campaign_type ADD VALUE IF NOT EXISTS 'bounty';
ALTER TYPE campaign_type ADD VALUE IF NOT EXISTS 'creator_campaign';
```

- [ ] **Step 2: Add reputation columns to hunter_xp**

```sql
ALTER TABLE hunter_xp
  ADD COLUMN IF NOT EXISTS reputation_score     int  NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS reputation_breakdown jsonb NOT NULL DEFAULT '{}';
```

- [ ] **Step 3: Create bounty_submissions table**

```sql
CREATE TABLE IF NOT EXISTS bounty_submissions (
  id              uuid        PRIMARY KEY DEFAULT uuid_generate_v4(),
  campaign_id     uuid        NOT NULL REFERENCES campaigns(id) ON DELETE CASCADE,
  wallet_address  text        NOT NULL,
  content_url     text,
  submission_text text,
  status          text        NOT NULL DEFAULT 'pending',
  reviewer_notes  text,
  xp_awarded      int         NOT NULL DEFAULT 0,
  paid_at         timestamptz,
  created_at      timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT bounty_submissions_status_check CHECK (status IN ('pending','approved','rejected'))
);
CREATE INDEX IF NOT EXISTS bs_campaign_idx ON bounty_submissions (campaign_id);
CREATE INDEX IF NOT EXISTS bs_wallet_idx   ON bounty_submissions (wallet_address);
ALTER TABLE bounty_submissions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "bs_service_all" ON bounty_submissions FOR ALL USING (true) WITH CHECK (true);
```

- [ ] **Step 4: Create hunter_profiles table**

```sql
CREATE TABLE IF NOT EXISTS hunter_profiles (
  wallet_address  text        PRIMARY KEY,
  skills          text[]      NOT NULL DEFAULT '{}',
  availability    text        NOT NULL DEFAULT 'not_looking',
  region          text,
  timezone        text,
  portfolio_links text[]      NOT NULL DEFAULT '{}',
  updated_at      timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT hp_availability_check CHECK (availability IN ('available','open_to_offers','not_looking'))
);
ALTER TABLE hunter_profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "hp_public_read" ON hunter_profiles FOR SELECT USING (true);
CREATE POLICY "hp_service_all" ON hunter_profiles FOR ALL USING (true) WITH CHECK (true);
```

- [ ] **Step 5: Append all migrations to schema.sql**

Append the following block at the end of `supabase/schema.sql`:

```sql
-- ─── Phase 1 Completion Migrations ───────────────────────────────────────────

-- Extend campaign_type enum
ALTER TYPE campaign_type ADD VALUE IF NOT EXISTS 'bounty';
ALTER TYPE campaign_type ADD VALUE IF NOT EXISTS 'creator_campaign';

-- Reputation score on hunter_xp
ALTER TABLE hunter_xp
  ADD COLUMN IF NOT EXISTS reputation_score     int  NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS reputation_breakdown jsonb NOT NULL DEFAULT '{}';

-- Bounty submissions
CREATE TABLE IF NOT EXISTS bounty_submissions (
  id              uuid        PRIMARY KEY DEFAULT uuid_generate_v4(),
  campaign_id     uuid        NOT NULL REFERENCES campaigns(id) ON DELETE CASCADE,
  wallet_address  text        NOT NULL,
  content_url     text,
  submission_text text,
  status          text        NOT NULL DEFAULT 'pending',
  reviewer_notes  text,
  xp_awarded      int         NOT NULL DEFAULT 0,
  paid_at         timestamptz,
  created_at      timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT bounty_submissions_status_check CHECK (status IN ('pending','approved','rejected'))
);
CREATE INDEX IF NOT EXISTS bs_campaign_idx ON bounty_submissions (campaign_id);
CREATE INDEX IF NOT EXISTS bs_wallet_idx   ON bounty_submissions (wallet_address);
ALTER TABLE bounty_submissions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "bs_service_all" ON bounty_submissions FOR ALL USING (true) WITH CHECK (true);

-- Hunter profiles (skills, availability, region for Talents)
CREATE TABLE IF NOT EXISTS hunter_profiles (
  wallet_address  text        PRIMARY KEY,
  skills          text[]      NOT NULL DEFAULT '{}',
  availability    text        NOT NULL DEFAULT 'not_looking',
  region          text,
  timezone        text,
  portfolio_links text[]      NOT NULL DEFAULT '{}',
  updated_at      timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT hp_availability_check CHECK (availability IN ('available','open_to_offers','not_looking'))
);
ALTER TABLE hunter_profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "hp_public_read"  ON hunter_profiles FOR SELECT USING (true);
CREATE POLICY "hp_service_all"  ON hunter_profiles FOR ALL USING (true) WITH CHECK (true);
```

- [ ] **Step 6: Verify in Supabase Table Editor**

Confirm all 4 changes exist:
- `campaigns` type column accepts `bounty` and `creator_campaign`
- `hunter_xp` has `reputation_score` (int) and `reputation_breakdown` (jsonb) columns
- `bounty_submissions` table exists with correct columns
- `hunter_profiles` table exists with correct columns

- [ ] **Step 7: Commit schema**

```bash
git add supabase/schema.sql
git commit -m "feat: phase 1 db migrations — bounty type, rep score, bounty_submissions, hunter_profiles"
```

---

## Task 2: TypeScript Types

**Files:**
- Modify: `web/lib/supabase.ts`

- [ ] **Step 1: Update CampaignType union**

In `web/lib/supabase.ts`, find the line:
```typescript
export type CampaignType   = "whitelist" | "raffle" | "token_drop" | "nft_mint" | "quest";
```
Replace with:
```typescript
export type CampaignType   = "whitelist" | "raffle" | "token_drop" | "nft_mint" | "quest" | "bounty" | "creator_campaign";
```

- [ ] **Step 2: Update Campaign interface to include reputation fields on hunter_xp**

After the `CampaignClaim` interface at the bottom of `web/lib/supabase.ts`, add:

```typescript
export interface BountySubmission {
  id: string;
  campaign_id: string;
  wallet_address: string;
  content_url: string | null;
  submission_text: string | null;
  status: "pending" | "approved" | "rejected";
  reviewer_notes: string | null;
  xp_awarded: number;
  paid_at: string | null;
  created_at: string;
}

export interface HunterProfile {
  wallet_address: string;
  skills: string[];
  availability: "available" | "open_to_offers" | "not_looking";
  region: string | null;
  timezone: string | null;
  portfolio_links: string[];
  updated_at: string;
}

export interface HunterXP {
  id: string;
  wallet_address: string;
  total_xp: number;
  entries_xp: number;
  wins_xp: number;
  checkin_xp: number;
  quest_xp: number;
  reputation_score: number;
  reputation_breakdown: Record<string, number>;
  last_checkin_at: string | null;
  checkin_streak: number;
  updated_at: string;
}

export interface PlatformStats {
  hunters: number;
  campaigns: number;
  total_xp: number;
  rewards_paid: number;
  projects: number;
}

export const HUNTER_SKILLS = [
  "meme_creator", "designer", "writer", "community_mod",
  "ambassador", "developer", "qa_tester", "translator",
  "video_editor", "growth_lead",
] as const;
export type HunterSkill = typeof HUNTER_SKILLS[number];

export const HUNTER_SKILL_LABELS: Record<HunterSkill, string> = {
  meme_creator:  "Meme Creator",
  designer:      "Designer",
  writer:        "Writer",
  community_mod: "Community Mod",
  ambassador:    "Ambassador",
  developer:     "Developer",
  qa_tester:     "QA Tester",
  translator:    "Translator",
  video_editor:  "Video Editor",
  growth_lead:   "Growth Lead",
};
```

- [ ] **Step 3: Commit**

```bash
git add web/lib/supabase.ts
git commit -m "feat: add BountySubmission, HunterProfile, HunterXP, PlatformStats types"
```

---

## Task 3: Stats API + Homepage Update

**Files:**
- Create: `web/app/api/stats/route.ts`
- Modify: `web/app/page.tsx` (update the existing STATS BAR section)

- [ ] **Step 1: Create stats API route**

Create `web/app/api/stats/route.ts`:

```typescript
import { createServerClient } from "@/lib/supabase";

export const runtime = "nodejs";
export const revalidate = 300; // 5 minutes

// GET /api/stats — public platform stats
export async function GET() {
  const db = createServerClient();

  const [
    { count: hunters },
    { count: campaigns },
    { data: xpData },
    { count: rewards_paid },
    { count: projects },
  ] = await Promise.all([
    db.from("hunter_xp").select("*", { count: "exact", head: true }),
    db.from("campaigns").select("*", { count: "exact", head: true })
      .not("status", "eq", "cancelled"),
    db.from("hunter_xp").select("total_xp"),
    db.from("entries").select("*", { count: "exact", head: true })
      .eq("status", "won"),
    db.from("projects").select("*", { count: "exact", head: true }),
  ]);

  const total_xp = (xpData ?? []).reduce((sum, row) => sum + (row.total_xp ?? 0), 0);

  return Response.json({
    hunters:      hunters ?? 0,
    campaigns:    campaigns ?? 0,
    total_xp,
    rewards_paid: rewards_paid ?? 0,
    projects:     projects ?? 0,
  }, {
    headers: { "Cache-Control": "public, s-maxage=300, stale-while-revalidate=60" },
  });
}
```

- [ ] **Step 2: Verify API works**

Start the dev server and test:
```bash
cd web && npm run dev
```
In a new terminal:
```bash
curl http://localhost:3000/api/stats
```
Expected response (values will vary):
```json
{"hunters":42,"campaigns":15,"total_xp":18500,"rewards_paid":37,"projects":8}
```

- [ ] **Step 3: Update homepage stats section to use /api/stats**

In `web/app/page.tsx`, find the `useEffect` that fetches hunter/campaign counts (around line 330-343):
```typescript
  useEffect(() => {
    const db = createBrowserClient();
    db.from("hunter_xp")
      .select("wallet_address, total_xp")
      .order("total_xp", { ascending: false })
      .limit(5)
      .then(({ data }) => { if (data?.length) setTopHunters(data); });
    db.from("hunter_xp")
      .select("wallet_address")
      .then(({ data }) => { setHunterCount(data?.length ?? 0); });
    db.from("campaigns")
      .select("id")
      .then(({ data }) => { setTotalCampaignCount(data?.length ?? 0); });
  }, []);
```

Replace with:
```typescript
  useEffect(() => {
    const db = createBrowserClient();
    db.from("hunter_xp")
      .select("wallet_address, total_xp")
      .order("total_xp", { ascending: false })
      .limit(5)
      .then(({ data }) => { if (data?.length) setTopHunters(data); });
    fetch("/api/stats")
      .then(r => r.json())
      .then((s: { hunters: number; campaigns: number }) => {
        setHunterCount(s.hunters);
        setTotalCampaignCount(s.campaigns);
      })
      .catch(() => {});
  }, []);
```

- [ ] **Step 4: Update the STATS BAR section with 5 stats**

In `web/app/page.tsx`, add `totalXP` and `rewardsPaid` state variables near the other state declarations (around line 281-282):
```typescript
  const [totalXP,         setTotalXP]         = useState<number | null>(null);
  const [rewardsPaid,     setRewardsPaid]      = useState<number | null>(null);
```

Update the fetch in the useEffect to capture all 5 stats:
```typescript
    fetch("/api/stats")
      .then(r => r.json())
      .then((s: { hunters: number; campaigns: number; total_xp: number; rewards_paid: number }) => {
        setHunterCount(s.hunters);
        setTotalCampaignCount(s.campaigns);
        setTotalXP(s.total_xp);
        setRewardsPaid(s.rewards_paid);
      })
      .catch(() => {});
```

Find the STATS BAR section (around line 570-589) and replace the 4-stat grid with 5 stats:
```tsx
      <section className="bg-white" style={{ borderTop: "1px solid rgba(0,0,0,0.07)", borderBottom: "1px solid rgba(0,0,0,0.07)" }}>
        <div className="max-w-7xl mx-auto px-6">
          <div className="grid grid-cols-2 sm:grid-cols-5 divide-x divide-black/[0.06]">
            {[
              { num: totalMinted !== undefined ? Number(totalMinted) : null, label: "IDs on Base",       blue: false },
              { num: hunterCount,       label: "Hunters ranked",     blue: false },
              { num: totalCampaignCount, label: "Campaigns run",     blue: true  },
              { num: totalXP,           label: "XP distributed",     blue: false },
              { num: rewardsPaid,       label: "Rewards paid out",   blue: false },
            ].map(({ num, label, blue }) => (
              <div key={label} className="px-6 py-10 first:pl-0 last:pr-0">
                <p className="font-black text-4xl sm:text-5xl tabular-nums leading-none"
                  style={{ ...D, color: blue ? "#0052FF" : "#000" }}>
                  <AnimatedCounter value={num} />
                </p>
                <p className="text-gray-400 text-xs uppercase tracking-[0.2em] mt-3" style={D}>{label}</p>
              </div>
            ))}
          </div>
        </div>
      </section>
```

- [ ] **Step 5: Verify homepage stats render**

Visit `http://localhost:3000` — stats bar should show 5 animated counters all with real data.

- [ ] **Step 6: Commit**

```bash
git add web/app/api/stats/route.ts web/app/page.tsx
git commit -m "feat: add /api/stats endpoint and expand homepage stats bar to 5 metrics"
```

---

## Task 4: Bounty Campaign Type

**Files:**
- Create: `web/app/api/campaigns/[id]/submit/route.ts`
- Create: `web/app/api/campaigns/[id]/review/route.ts`
- Modify: `web/app/projects/[address]/new/CreateCampaignWizard.tsx`

### 4A — Submit API

- [ ] **Step 1: Create submit route**

Create `web/app/api/campaigns/[id]/submit/route.ts`:

```typescript
import { createServerClient } from "@/lib/supabase";
import { isAddress } from "viem";

export const runtime = "nodejs";

// POST /api/campaigns/[id]/submit — submit a bounty entry
export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await req.json() as {
      wallet_address?: string;
      content_url?: string;
      submission_text?: string;
    };

    if (!body.wallet_address || !isAddress(body.wallet_address)) {
      return Response.json({ error: "wallet_address required" }, { status: 400 });
    }
    if (!body.content_url && !body.submission_text) {
      return Response.json({ error: "content_url or submission_text required" }, { status: 400 });
    }

    const db = createServerClient();

    // Verify campaign exists and is a bounty type
    const { data: campaign } = await db
      .from("campaigns")
      .select("id, type, status")
      .eq("id", id)
      .single();

    if (!campaign) return Response.json({ error: "Campaign not found" }, { status: 404 });
    if (campaign.type !== "bounty") return Response.json({ error: "Not a bounty campaign" }, { status: 400 });
    if (campaign.status !== "active") return Response.json({ error: "Campaign is not active" }, { status: 400 });

    // Check for duplicate submission
    const { data: existing } = await db
      .from("bounty_submissions")
      .select("id")
      .eq("campaign_id", id)
      .eq("wallet_address", body.wallet_address.toLowerCase())
      .single();

    if (existing) return Response.json({ error: "Already submitted to this bounty" }, { status: 409 });

    const { data: submission, error } = await db
      .from("bounty_submissions")
      .insert({
        campaign_id:     id,
        wallet_address:  body.wallet_address.toLowerCase(),
        content_url:     body.content_url ?? null,
        submission_text: body.submission_text ?? null,
        status:          "pending",
      })
      .select()
      .single();

    if (error) return Response.json({ error: error.message }, { status: 500 });

    return Response.json({ submission }, { status: 201 });
  } catch {
    return Response.json({ error: "Invalid request body" }, { status: 400 });
  }
}
```

### 4B — Review API

- [ ] **Step 2: Create review route**

Create `web/app/api/campaigns/[id]/review/route.ts`:

```typescript
import { createServerClient } from "@/lib/supabase";
import { isAddress } from "viem";

export const runtime = "nodejs";

// POST /api/campaigns/[id]/review — project owner approves/rejects a bounty submission
export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await req.json() as {
      reviewer_address?: string;
      submission_id?: string;
      action?: "approve" | "reject";
      reviewer_notes?: string;
      xp_awarded?: number;
    };

    if (!body.reviewer_address || !isAddress(body.reviewer_address)) {
      return Response.json({ error: "reviewer_address required" }, { status: 400 });
    }
    if (!body.submission_id) return Response.json({ error: "submission_id required" }, { status: 400 });
    if (!body.action || !["approve", "reject"].includes(body.action)) {
      return Response.json({ error: "action must be 'approve' or 'reject'" }, { status: 400 });
    }

    const db = createServerClient();

    // Verify the reviewer owns the campaign
    const { data: campaign } = await db
      .from("campaigns")
      .select("id, partner_address, xp_reward")
      .eq("id", id)
      .single();

    if (!campaign) return Response.json({ error: "Campaign not found" }, { status: 404 });
    if (campaign.partner_address.toLowerCase() !== body.reviewer_address.toLowerCase()) {
      return Response.json({ error: "Not authorized — not the campaign owner" }, { status: 403 });
    }

    // Verify submission belongs to this campaign
    const { data: submission } = await db
      .from("bounty_submissions")
      .select("id, wallet_address, status")
      .eq("id", body.submission_id)
      .eq("campaign_id", id)
      .single();

    if (!submission) return Response.json({ error: "Submission not found" }, { status: 404 });
    if (submission.status !== "pending") {
      return Response.json({ error: "Submission already reviewed" }, { status: 409 });
    }

    const xpToAward = body.action === "approve" ? (body.xp_awarded ?? campaign.xp_reward ?? 0) : 0;

    // Update submission status
    const { error: updateErr } = await db
      .from("bounty_submissions")
      .update({
        status:         body.action === "approve" ? "approved" : "rejected",
        reviewer_notes: body.reviewer_notes ?? null,
        xp_awarded:     xpToAward,
      })
      .eq("id", body.submission_id);

    if (updateErr) return Response.json({ error: updateErr.message }, { status: 500 });

    // If approved, award XP to the hunter
    if (body.action === "approve" && xpToAward > 0) {
      const wallet = submission.wallet_address;
      const { data: xpRow } = await db
        .from("hunter_xp")
        .select("quest_xp, total_xp")
        .eq("wallet_address", wallet)
        .single();

      if (xpRow) {
        await db.from("hunter_xp").update({
          quest_xp:   (xpRow.quest_xp ?? 0) + xpToAward,
          total_xp:   (xpRow.total_xp ?? 0) + xpToAward,
          updated_at: new Date().toISOString(),
        }).eq("wallet_address", wallet);
      }
    }

    return Response.json({ success: true, action: body.action, xp_awarded: xpToAward });
  } catch {
    return Response.json({ error: "Invalid request body" }, { status: 400 });
  }
}
```

### 4C — Campaign Wizard Update

- [ ] **Step 3: Add bounty and creator_campaign to CAMPAIGN_TYPES in wizard**

In `web/app/projects/[address]/new/CreateCampaignWizard.tsx`, find `CAMPAIGN_TYPES` array (line 15) and add after the existing entries:

```typescript
const CAMPAIGN_TYPES: { value: CampaignType; label: string; desc: string; example: string; icon: string; color: string }[] = [
  { value: "quest",            label: "Quest",            desc: "Everyone who completes all tasks earns XP",        example: "e.g. Follow us + hold Based ID → earn 200 XP",       icon: "⚡", color: "green"  },
  { value: "raffle",           label: "Raffle",           desc: "Random draw from all qualified entrants",           example: "e.g. 5 winners get a free NFT mint",                 icon: "🎲", color: "purple" },
  { value: "whitelist",        label: "Whitelist",        desc: "Grant allowlist spots to selected wallets",         example: "e.g. 100 WL spots for your upcoming mint",           icon: "📋", color: "blue"   },
  { value: "nft_mint",         label: "NFT Mint",         desc: "Reserve free or discounted mint slots",             example: "e.g. Free mint for 50 Based ID holders",             icon: "🖼️", color: "blue"   },
  { value: "token_drop",       label: "Token Drop",       desc: "Distribute tokens to selected wallets",             example: "e.g. 1,000 $XYZ split among 20 winners",             icon: "🪙", color: "blue"   },
  { value: "bounty",           label: "Bounty",           desc: "Users submit work — you review and reward the best", example: "e.g. Design a meme, write a thread, report a bug", icon: "🏆", color: "orange" },
  { value: "creator_campaign", label: "Creator Campaign", desc: "Influencer/creator campaign with full task suite",  example: "e.g. Share a cast, tag a friend, earn XP",           icon: "🎬", color: "pink"   },
];
```

- [ ] **Step 4: Add bounty submission fields to Step 1 of the wizard**

In `web/app/projects/[address]/new/CreateCampaignWizard.tsx`, find the Step 1 state declarations (around line 64) and add `submissionType` state:

```typescript
  const [submissionType, setSubmissionType] = useState<"link" | "text" | "file">("link");
```

Then in the Step 1 JSX, after the XP/winner count fields, add a conditional block that shows only when `campaignType === "bounty"`:

```tsx
{campaignType === "bounty" && (
  <div className="space-y-2">
    <FieldLabel label="Submission type" hint="What should hunters submit?" required />
    <div className="grid grid-cols-3 gap-2">
      {(["link", "text", "file"] as const).map(t => (
        <button key={t} type="button"
          onClick={() => setSubmissionType(t)}
          className={`py-2.5 rounded-xl border text-sm font-medium transition-all capitalize ${
            submissionType === t
              ? "border-blue-500/40 bg-blue-500/10 text-blue-400"
              : "border-white/[0.08] text-zinc-400 hover:border-white/20"
          }`}>
          {t === "link" ? "🔗 Link" : t === "text" ? "📝 Text" : "📎 File"}
        </button>
      ))}
    </div>
  </div>
)}
```

In the Step 1 → Step 2 submit body, add `submission_type` to `prize_details` when bounty:
```typescript
prize_details: campaignType === "bounty"
  ? { submission_type: submissionType }
  : { description: prizeDesc },
```

- [ ] **Step 5: Verify bounty campaign creation**

1. Start dev server: `cd web && npm run dev`
2. Navigate to `http://localhost:3000/projects/[your-wallet-address]/new`
3. Select "Bounty" campaign type — should appear as an option
4. Complete the wizard and submit
5. Check Supabase Dashboard → campaigns table → verify a row with `type = 'bounty'` exists

- [ ] **Step 6: Commit**

```bash
git add web/app/api/campaigns/[id]/submit/route.ts web/app/api/campaigns/[id]/review/route.ts web/app/projects/[address]/new/CreateCampaignWizard.tsx
git commit -m "feat: bounty campaign type — submit and review API routes, wizard support"
```

---

## Task 5: Reputation Score API

**Files:**
- Create: `web/app/api/hunters/reputation/route.ts`

- [ ] **Step 1: Create reputation route**

Create `web/app/api/hunters/reputation/route.ts`:

```typescript
import { createServerClient } from "@/lib/supabase";

export const runtime = "nodejs";

// GET /api/hunters/reputation?wallet=0x...
// Computes and stores reputation score, returns score + breakdown
export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const wallet = searchParams.get("wallet")?.toLowerCase();
  if (!wallet) return Response.json({ error: "wallet required" }, { status: 400 });

  const db = createServerClient();

  // Fetch all signals in parallel
  const [
    { data: xpRow },
    { count: campaignCount },
    { count: bountyCount },
    { count: memeWarCount },
    { data: twitterRow },
  ] = await Promise.all([
    db.from("hunter_xp").select("*").eq("wallet_address", wallet).single(),
    db.from("campaign_claims").select("*", { count: "exact", head: true }).eq("wallet_address", wallet),
    db.from("bounty_submissions").select("*", { count: "exact", head: true })
      .eq("wallet_address", wallet).eq("status", "approved"),
    db.from("entries").select("*", { count: "exact", head: true }).eq("wallet_address", wallet),
    db.from("twitter_verifications").select("wallet_address").eq("wallet_address", wallet).single(),
  ]);

  if (!xpRow) return Response.json({ error: "Hunter not found" }, { status: 404 });

  const breakdown: Record<string, number> = {};
  let score = 0;

  // Based ID ownership (all hunters who have hunter_xp hold a Based ID)
  breakdown.based_id_ownership = 50;
  score += 50;

  // Completed campaigns (×5, capped at 200)
  const campaignXp = Math.min((campaignCount ?? 0) * 5, 200);
  breakdown.campaign_completions = campaignXp;
  score += campaignXp;

  // Approved bounties (×15, uncapped)
  const bountyXp = (bountyCount ?? 0) * 15;
  breakdown.approved_bounties = bountyXp;
  score += bountyXp;

  // Campaign entries (proxy for Meme War entries until Phase 2 — ×1, capped at 60)
  const entryXp = Math.min((memeWarCount ?? 0) * 1, 60);
  breakdown.platform_entries = entryXp;
  score += entryXp;

  // 7-day streak completions (×2, capped at 60)
  const streakCompletions = Math.floor((xpRow.checkin_streak ?? 0) / 7);
  const streakXp = Math.min(streakCompletions * 2, 60);
  breakdown.streak_completions = streakXp;
  score += streakXp;

  // Twitter verified (+20)
  if (twitterRow) {
    breakdown.twitter_verified = 20;
    score += 20;
  }

  // Store updated score
  await db.from("hunter_xp").update({
    reputation_score:     score,
    reputation_breakdown: breakdown,
    updated_at:           new Date().toISOString(),
  }).eq("wallet_address", wallet);

  return Response.json({ wallet, score, breakdown });
}
```

- [ ] **Step 2: Verify reputation API**

```bash
curl "http://localhost:3000/api/hunters/reputation?wallet=0xYOUR_WALLET_HERE"
```
Expected:
```json
{
  "wallet": "0x...",
  "score": 70,
  "breakdown": {
    "based_id_ownership": 50,
    "campaign_completions": 20,
    "approved_bounties": 0,
    "platform_entries": 0,
    "streak_completions": 0,
    "twitter_verified": 0
  }
}
```
Check Supabase → `hunter_xp` table → `reputation_score` column updated for that wallet.

- [ ] **Step 3: Commit**

```bash
git add web/app/api/hunters/reputation/route.ts
git commit -m "feat: reputation score API — compute and store score with breakdown"
```

---

## Task 6: Project Analytics Tab

**Files:**
- Create: `web/app/api/projects/[address]/analytics/route.ts`
- Create: `web/app/projects/[address]/AnalyticsTab.tsx`
- Modify: `web/app/projects/[address]/OwnerControls.tsx`

### 6A — Analytics API

- [ ] **Step 1: Create analytics route**

Create `web/app/api/projects/[address]/analytics/route.ts`:

```typescript
import { createServerClient } from "@/lib/supabase";

export const runtime = "nodejs";

// GET /api/projects/[address]/analytics
// Returns per-campaign analytics for the project owner
export async function GET(
  req: Request,
  { params }: { params: Promise<{ address: string }> }
) {
  const { address } = await params;
  const db = createServerClient();

  // Get all campaigns for this project
  const { data: campaigns, error } = await db
    .from("campaigns")
    .select("id, title, type, status, xp_reward, winner_count, starts_at, ends_at")
    .eq("partner_address", address.toLowerCase())
    .order("created_at", { ascending: false });

  if (error) return Response.json({ error: error.message }, { status: 500 });
  if (!campaigns?.length) return Response.json({ campaigns: [] });

  const ids = campaigns.map(c => c.id);

  // Fetch counts in parallel
  const [
    { data: entries },
    { data: claims },
    { data: bountyData },
  ] = await Promise.all([
    db.from("entries").select("campaign_id, status").in("campaign_id", ids),
    db.from("campaign_claims").select("campaign_id").in("campaign_id", ids),
    db.from("bounty_submissions").select("campaign_id, status").in("campaign_id", ids),
  ]);

  // Aggregate by campaign
  const entryMap: Record<string, { total: number; won: number }> = {};
  for (const e of entries ?? []) {
    if (!entryMap[e.campaign_id]) entryMap[e.campaign_id] = { total: 0, won: 0 };
    entryMap[e.campaign_id].total++;
    if (e.status === "won") entryMap[e.campaign_id].won++;
  }

  const claimMap: Record<string, number> = {};
  for (const c of claims ?? []) {
    claimMap[c.campaign_id] = (claimMap[c.campaign_id] ?? 0) + 1;
  }

  const bountyMap: Record<string, { total: number; approved: number; rejected: number; pending: number }> = {};
  for (const b of bountyData ?? []) {
    if (!bountyMap[b.campaign_id]) bountyMap[b.campaign_id] = { total: 0, approved: 0, rejected: 0, pending: 0 };
    bountyMap[b.campaign_id].total++;
    bountyMap[b.campaign_id][b.status as "approved" | "rejected" | "pending"]++;
  }

  const result = campaigns.map(c => {
    const e = entryMap[c.id] ?? { total: 0, won: 0 };
    const claims_count = claimMap[c.id] ?? 0;
    const b = bountyMap[c.id];
    return {
      id:              c.id,
      title:           c.title,
      type:            c.type,
      status:          c.status,
      entries:         e.total,
      winners:         e.won,
      claims:          claims_count,
      completion_rate: e.total > 0 ? Math.round((claims_count / e.total) * 100) : 0,
      bounty:          b ?? null,
    };
  });

  return Response.json({ campaigns: result });
}
```

### 6B — Analytics UI Component

- [ ] **Step 2: Create AnalyticsTab component**

Create `web/app/projects/[address]/AnalyticsTab.tsx`:

```tsx
"use client";

import { useEffect, useState } from "react";

const D = { fontFamily: "var(--font-display), system-ui, sans-serif" };

interface CampaignAnalytic {
  id: string;
  title: string;
  type: string;
  status: string;
  entries: number;
  winners: number;
  claims: number;
  completion_rate: number;
  bounty: { total: number; approved: number; rejected: number; pending: number } | null;
}

export function AnalyticsTab({ address }: { address: string }) {
  const [data, setData] = useState<CampaignAnalytic[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch(`/api/projects/${address}/analytics`)
      .then(r => r.json())
      .then(d => { setData(d.campaigns ?? []); setLoading(false); })
      .catch(() => setLoading(false));
  }, [address]);

  if (loading) {
    return (
      <div className="py-16 text-center">
        <div className="w-6 h-6 border-2 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto" />
      </div>
    );
  }

  if (!data.length) {
    return (
      <div className="py-16 text-center text-zinc-500 text-sm">
        No campaigns yet. Create your first campaign to see analytics.
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <h3 className="text-white font-black text-lg" style={D}>Campaign Analytics</h3>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-white/[0.06]">
              {["Campaign", "Type", "Status", "Entries", "Claims", "Completion %", "Winners"].map(h => (
                <th key={h} className="text-left py-3 pr-6 text-zinc-500 font-medium text-xs uppercase tracking-wider">
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-white/[0.04]">
            {data.map(c => (
              <tr key={c.id} className="hover:bg-white/[0.02] transition-colors">
                <td className="py-3 pr-6 text-white font-medium max-w-[200px] truncate" title={c.title}>
                  {c.title}
                </td>
                <td className="py-3 pr-6 text-zinc-400 capitalize">{c.type.replace("_", " ")}</td>
                <td className="py-3 pr-6">
                  <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${
                    c.status === "active"   ? "bg-green-500/15 text-green-400" :
                    c.status === "ended"    ? "bg-zinc-500/15 text-zinc-400"   :
                    c.status === "drawn"    ? "bg-blue-500/15 text-blue-400"   :
                    "bg-zinc-800 text-zinc-500"
                  }`}>
                    {c.status}
                  </span>
                </td>
                <td className="py-3 pr-6 text-white tabular-nums">{c.entries.toLocaleString()}</td>
                <td className="py-3 pr-6 text-white tabular-nums">{c.claims.toLocaleString()}</td>
                <td className="py-3 pr-6">
                  <div className="flex items-center gap-2">
                    <div className="w-16 h-1.5 rounded-full bg-white/[0.08] overflow-hidden">
                      <div className="h-full rounded-full bg-blue-500" style={{ width: `${c.completion_rate}%` }} />
                    </div>
                    <span className="text-zinc-300 tabular-nums text-xs">{c.completion_rate}%</span>
                  </div>
                </td>
                <td className="py-3 pr-6 text-white tabular-nums">{c.winners.toLocaleString()}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Bounty sub-table if any bounty campaigns */}
      {data.some(c => c.bounty) && (
        <div className="mt-6 space-y-2">
          <h4 className="text-zinc-400 text-xs font-bold uppercase tracking-wider">Bounty Submissions</h4>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-white/[0.06]">
                  {["Campaign", "Total", "Pending", "Approved", "Rejected", "Approval Rate"].map(h => (
                    <th key={h} className="text-left py-3 pr-6 text-zinc-500 font-medium text-xs uppercase tracking-wider">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-white/[0.04]">
                {data.filter(c => c.bounty).map(c => (
                  <tr key={c.id}>
                    <td className="py-3 pr-6 text-white font-medium max-w-[200px] truncate">{c.title}</td>
                    <td className="py-3 pr-6 text-zinc-300">{c.bounty!.total}</td>
                    <td className="py-3 pr-6 text-yellow-400">{c.bounty!.pending}</td>
                    <td className="py-3 pr-6 text-green-400">{c.bounty!.approved}</td>
                    <td className="py-3 pr-6 text-red-400">{c.bounty!.rejected}</td>
                    <td className="py-3 pr-6 text-zinc-300">
                      {c.bounty!.total > 0
                        ? `${Math.round((c.bounty!.approved / c.bounty!.total) * 100)}%`
                        : "—"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
```

### 6C — Wire into OwnerControls

- [ ] **Step 3: Read existing OwnerControls**

Read `web/app/projects/[address]/OwnerControls.tsx` to understand the current tab structure before modifying it.

- [ ] **Step 4: Add Analytics tab to OwnerControls**

In `web/app/projects/[address]/OwnerControls.tsx`, import `AnalyticsTab`:
```typescript
import { AnalyticsTab } from "./AnalyticsTab";
```

Find the tabs array/state and add an "Analytics" tab option. The pattern will depend on what's there — add `"analytics"` to the tab list alongside the existing tabs, and render `<AnalyticsTab address={address} />` when that tab is active. The tab should only show if `isOwner` (connected wallet matches project address).

- [ ] **Step 5: Verify analytics tab**

1. Navigate to `http://localhost:3000/projects/[your-wallet-address]`
2. Connect your wallet
3. Analytics tab should appear in owner controls
4. Tab should show a table with per-campaign stats

- [ ] **Step 6: Commit**

```bash
git add web/app/api/projects/[address]/analytics/route.ts web/app/projects/[address]/AnalyticsTab.tsx web/app/projects/[address]/OwnerControls.tsx
git commit -m "feat: project analytics tab — per-campaign entries, completions, completion rate, bounty stats"
```

---

## Task 7: Hunter Profile Additions

**Files:**
- Create: `web/app/api/hunters/profile/route.ts`
- Modify: `web/app/profile/[address]/page.tsx`

### 7A — Hunter Profile API

- [ ] **Step 1: Create hunter profile API**

Create `web/app/api/hunters/profile/route.ts`:

```typescript
import { createServerClient } from "@/lib/supabase";
import { isAddress } from "viem";

export const runtime = "nodejs";

// GET /api/hunters/profile?wallet=0x... — fetch hunter profile (skills, availability, etc.)
export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const wallet = searchParams.get("wallet")?.toLowerCase();
  if (!wallet) return Response.json({ error: "wallet required" }, { status: 400 });

  const db = createServerClient();
  const { data } = await db
    .from("hunter_profiles")
    .select("*")
    .eq("wallet_address", wallet)
    .single();

  return Response.json({ profile: data ?? null });
}

// POST /api/hunters/profile — upsert hunter profile
export async function POST(req: Request) {
  try {
    const body = await req.json() as {
      wallet_address?: string;
      skills?: string[];
      availability?: string;
      region?: string;
      timezone?: string;
      portfolio_links?: string[];
    };

    if (!body.wallet_address || !isAddress(body.wallet_address)) {
      return Response.json({ error: "wallet_address required" }, { status: 400 });
    }

    const VALID_AVAILABILITY = ["available", "open_to_offers", "not_looking"];
    if (body.availability && !VALID_AVAILABILITY.includes(body.availability)) {
      return Response.json({ error: "Invalid availability value" }, { status: 400 });
    }

    const VALID_SKILLS = [
      "meme_creator","designer","writer","community_mod","ambassador",
      "developer","qa_tester","translator","video_editor","growth_lead",
    ];
    const skills = (body.skills ?? []).filter(s => VALID_SKILLS.includes(s));

    const portfolioLinks = (body.portfolio_links ?? [])
      .slice(0, 3)
      .filter(l => l.startsWith("http"));

    const db = createServerClient();
    const { data, error } = await db
      .from("hunter_profiles")
      .upsert({
        wallet_address:  body.wallet_address.toLowerCase(),
        skills,
        availability:    body.availability ?? "not_looking",
        region:          body.region?.trim() ?? null,
        timezone:        body.timezone?.trim() ?? null,
        portfolio_links: portfolioLinks,
        updated_at:      new Date().toISOString(),
      }, { onConflict: "wallet_address" })
      .select()
      .single();

    if (error) return Response.json({ error: error.message }, { status: 500 });
    return Response.json({ profile: data });
  } catch {
    return Response.json({ error: "Invalid request body" }, { status: 400 });
  }
}
```

### 7B — Profile Page Additions

- [ ] **Step 2: Read the current profile page**

Read `web/app/profile/[address]/page.tsx` fully to understand its current structure before modifying.

- [ ] **Step 3: Add skills/availability edit form + badges/squad placeholders to profile page**

In `web/app/profile/[address]/page.tsx`:

1. Import `HUNTER_SKILLS`, `HUNTER_SKILL_LABELS`, `HunterProfile` from `@/lib/supabase`
2. Add `hunterProfile` state: `const [hunterProfile, setHunterProfile] = useState<HunterProfile | null>(null)`
3. Fetch hunter profile in `useEffect`:
```typescript
fetch(`/api/hunters/profile?wallet=${address.toLowerCase()}`)
  .then(r => r.json())
  .then(d => setHunterProfile(d.profile));
```
4. Add **Badges placeholder section** (empty state for Phase 2) — add this as a new card/section on the profile page:
```tsx
{/* Badges — Phase 2 */}
<div className="rounded-2xl border border-white/[0.06] bg-white/[0.02] p-6 space-y-3">
  <h3 className="text-white font-black text-base" style={D}>Badges</h3>
  <div className="py-8 text-center">
    <p className="text-zinc-600 text-sm">No badges yet</p>
    <p className="text-zinc-700 text-xs mt-1">Complete campaigns and streaks to earn badges</p>
  </div>
</div>
```

5. Add **Squad placeholder section**:
```tsx
{/* Squad — Phase 2 */}
<div className="rounded-2xl border border-white/[0.06] bg-white/[0.02] p-6 space-y-3">
  <h3 className="text-white font-black text-base" style={D}>Squad</h3>
  <div className="py-8 text-center">
    <p className="text-zinc-600 text-sm">Not in a squad yet</p>
    <p className="text-zinc-700 text-xs mt-1">Squads launching in Phase 2</p>
  </div>
</div>
```

6. Add **Skills section** (editable only when `address === connectedWallet`). Show read-only display when viewing others, inline edit form when it's your own profile:
```tsx
{/* Skills & Profile */}
<div className="rounded-2xl border border-white/[0.06] bg-white/[0.02] p-6 space-y-4">
  <div className="flex items-center justify-between">
    <h3 className="text-white font-black text-base" style={D}>Hunter Profile</h3>
    {isOwner && !editingProfile && (
      <button onClick={() => setEditingProfile(true)}
        className="text-xs text-zinc-400 hover:text-white transition-colors border border-white/[0.08] px-3 py-1.5 rounded-lg">
        Edit
      </button>
    )}
  </div>

  {editingProfile && isOwner ? (
    <ProfileEditForm
      profile={hunterProfile}
      onSave={async (updated) => {
        const res = await fetch("/api/hunters/profile", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ wallet_address: address, ...updated }),
        });
        const data = await res.json();
        if (data.profile) { setHunterProfile(data.profile); setEditingProfile(false); }
      }}
      onCancel={() => setEditingProfile(false)}
    />
  ) : (
    <ProfileReadView profile={hunterProfile} />
  )}
</div>
```

7. Add `ProfileEditForm` and `ProfileReadView` as inline components in the same file:

```tsx
function ProfileReadView({ profile }: { profile: HunterProfile | null }) {
  if (!profile || (!profile.skills.length && !profile.region && !profile.availability)) {
    return <p className="text-zinc-600 text-sm">No profile info yet.</p>;
  }
  return (
    <div className="space-y-3">
      {profile.availability !== "not_looking" && (
        <span className={`inline-block px-2.5 py-1 rounded-full text-xs font-bold ${
          profile.availability === "available" ? "bg-green-500/15 text-green-400" : "bg-yellow-500/15 text-yellow-400"
        }`}>
          {profile.availability === "available" ? "Open to work" : "Open to offers"}
        </span>
      )}
      {profile.skills.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {profile.skills.map(s => (
            <span key={s} className="px-2.5 py-1 rounded-full bg-blue-500/10 border border-blue-500/20 text-blue-300 text-xs font-medium">
              {HUNTER_SKILL_LABELS[s as keyof typeof HUNTER_SKILL_LABELS] ?? s}
            </span>
          ))}
        </div>
      )}
      {profile.region && <p className="text-zinc-400 text-sm">📍 {profile.region}</p>}
      {profile.portfolio_links?.length > 0 && (
        <div className="space-y-1">
          {profile.portfolio_links.map(l => (
            <a key={l} href={l} target="_blank" rel="noopener noreferrer"
              className="block text-blue-400 text-xs hover:underline truncate">
              {l}
            </a>
          ))}
        </div>
      )}
    </div>
  );
}

function ProfileEditForm({
  profile, onSave, onCancel
}: {
  profile: HunterProfile | null;
  onSave: (data: Partial<HunterProfile>) => Promise<void>;
  onCancel: () => void;
}) {
  const [skills,   setSkills]   = useState<string[]>(profile?.skills ?? []);
  const [avail,    setAvail]    = useState(profile?.availability ?? "not_looking");
  const [region,   setRegion]   = useState(profile?.region ?? "");
  const [timezone, setTimezone] = useState(profile?.timezone ?? "");
  const [links,    setLinks]    = useState<string[]>(profile?.portfolio_links ?? [""]);
  const [saving,   setSaving]   = useState(false);

  const toggleSkill = (s: string) =>
    setSkills(prev => prev.includes(s) ? prev.filter(x => x !== s) : [...prev, s]);

  return (
    <div className="space-y-4">
      {/* Availability */}
      <div className="space-y-1.5">
        <label className="text-zinc-400 text-xs font-medium uppercase tracking-wider">Availability</label>
        <div className="grid grid-cols-3 gap-2">
          {[
            { v: "available",     l: "Open to work"  },
            { v: "open_to_offers",l: "Open to offers"},
            { v: "not_looking",   l: "Not looking"   },
          ].map(({ v, l }) => (
            <button key={v} type="button" onClick={() => setAvail(v)}
              className={`py-2 rounded-lg border text-xs font-medium transition-all ${
                avail === v
                  ? "border-blue-500/40 bg-blue-500/10 text-blue-400"
                  : "border-white/[0.08] text-zinc-500 hover:border-white/20"
              }`}>
              {l}
            </button>
          ))}
        </div>
      </div>

      {/* Skills */}
      <div className="space-y-1.5">
        <label className="text-zinc-400 text-xs font-medium uppercase tracking-wider">Skills</label>
        <div className="flex flex-wrap gap-1.5">
          {HUNTER_SKILLS.map(s => (
            <button key={s} type="button" onClick={() => toggleSkill(s)}
              className={`px-2.5 py-1 rounded-full border text-xs font-medium transition-all ${
                skills.includes(s)
                  ? "border-blue-500/40 bg-blue-500/10 text-blue-300"
                  : "border-white/[0.06] text-zinc-500 hover:border-white/20"
              }`}>
              {HUNTER_SKILL_LABELS[s]}
            </button>
          ))}
        </div>
      </div>

      {/* Region */}
      <div className="space-y-1.5">
        <label className="text-zinc-400 text-xs font-medium uppercase tracking-wider">Region</label>
        <input value={region} onChange={e => setRegion(e.target.value)}
          placeholder="e.g. Philippines, NYC, London"
          className="w-full bg-white/[0.03] border border-white/[0.08] rounded-xl px-4 py-2.5 text-white text-sm placeholder-zinc-600 outline-none focus:border-blue-500/40 transition-all" />
      </div>

      {/* Portfolio links */}
      <div className="space-y-1.5">
        <label className="text-zinc-400 text-xs font-medium uppercase tracking-wider">Portfolio Links (up to 3)</label>
        {[0,1,2].map(i => (
          <input key={i} value={links[i] ?? ""} onChange={e => setLinks(prev => { const n = [...prev]; n[i] = e.target.value; return n; })}
            placeholder={`https://...`}
            className="w-full bg-white/[0.03] border border-white/[0.08] rounded-xl px-4 py-2.5 text-white text-sm placeholder-zinc-600 outline-none focus:border-blue-500/40 transition-all" />
        ))}
      </div>

      <div className="flex gap-2 pt-2">
        <button onClick={async () => {
          setSaving(true);
          await onSave({ skills, availability: avail, region, timezone, portfolio_links: links.filter(Boolean) });
          setSaving(false);
        }} disabled={saving}
          className="flex-1 py-2.5 rounded-xl bg-blue-600 text-white text-sm font-bold disabled:opacity-50 hover:bg-blue-500 transition-colors">
          {saving ? "Saving…" : "Save Profile"}
        </button>
        <button onClick={onCancel}
          className="px-4 py-2.5 rounded-xl border border-white/[0.08] text-zinc-400 text-sm hover:text-white hover:border-white/20 transition-colors">
          Cancel
        </button>
      </div>
    </div>
  );
}
```

8. Add `editingProfile` state: `const [editingProfile, setEditingProfile] = useState(false)`
9. Add `isOwner` check: `const isOwner = address?.toLowerCase() === connectedAddress?.toLowerCase()`

- [ ] **Step 4: Verify profile additions**

1. Navigate to `http://localhost:3000/profile/[your-wallet-address]` with wallet connected
2. Should see: Badges placeholder, Squad placeholder, Hunter Profile section with Edit button
3. Click Edit → fill in skills, region, portfolio link → Save
4. Refresh → saved data persists
5. Visit `/profile/[different-wallet]` → should show read-only view (no Edit button)

- [ ] **Step 5: Commit**

```bash
git add web/app/api/hunters/profile/route.ts web/app/profile/[address]/page.tsx
git commit -m "feat: hunter profile additions — skills/availability editor, badges placeholder, squad placeholder"
```

---

## Self-Review Notes

- **DB first**: Task 1 must run before all others — all API routes depend on the new columns/tables.
- **Reputation score inputs**: Phase 1 score omits Meme War entries (not built yet) and wallet age/tx count (requires external chain data). These are added in Phase 3. The current score uses campaign completions, bounties, entries, streaks, and Twitter verification as the available signals.
- **Bounty review authorization**: The review API checks `partner_address` matches `reviewer_address`. This relies on the frontend sending the connected wallet — do not trust the body alone in production; consider adding a signature verification layer in Phase 3.
- **Stats route caching**: The `/api/stats` route uses `revalidate = 300` (5 min). The homepage fetches it client-side (no cache on that fetch), so it updates on every page load.
- **Profile page**: Step 3 says to read the profile page before modifying — the exact JSX location to inject sections will depend on the current structure; don't skip the read step.

---

## Plan complete and saved to `docs/superpowers/plans/2026-04-30-phase1-completion.md`.

Two execution options:

**1. Subagent-Driven (recommended)** — Fresh subagent per task, review between tasks, fast iteration

**2. Inline Execution** — Execute tasks in this session using executing-plans, batch execution with checkpoints
