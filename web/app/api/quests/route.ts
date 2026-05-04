import { createServerClient } from "@/lib/supabase";
import { createPublicClient, http } from "viem";
import { base, baseSepolia } from "viem/chains";
import { BASED_ID_ADDRESS, BASED_ID_ABI, HUNTERS_ADDRESS, HUNTERS_ABI } from "@/lib/contracts";

export const runtime = "nodejs";

const isMainnet = process.env.NEXT_PUBLIC_CHAIN_ID === "8453";
const chain     = isMainnet ? base : baseSepolia;
const rpcUrl    = isMainnet ? "https://mainnet.base.org" : "https://sepolia.base.org";

export type QuestType     = "milestone" | "daily";
export type QuestCategory = "onchain" | "hunters" | "drops";
export type QuestStatus   = "locked" | "claimable" | "claimed" | "in_progress";

export interface Quest {
  id: string;
  title: string;
  description: string;
  xp: number;
  type: QuestType;
  category: QuestCategory;
}

export interface QuestWithStatus extends Quest {
  status: QuestStatus;
  progress?: { current: number; total: number };
}

type Stats = {
  holdsBasedId: boolean;
  hasClaimed: boolean;
  entryCount: number;
  winCount: number;
  baseXp: number;
  enteredToday: boolean;
};

const QUESTS: Array<Quest & { check: (s: Stats) => boolean; progress?: (s: Stats) => { current: number; total: number } }> = [
  // ── Onboarding milestones ──────────────────────────────────────
  {
    id: "first_id",
    title: "Mint a Based ID",
    description: "Get your permanent on-chain identity to unlock the ecosystem.",
    xp: 100,
    type: "milestone",
    category: "onchain",
    check: (s) => s.holdsBasedId,
  },
  {
    id: "claim_hunter",
    title: "Claim Based Hunter",
    description: "Claim your free soulbound Hunter License NFT.",
    xp: 100,
    type: "milestone",
    category: "hunters",
    check: (s) => s.hasClaimed,
  },

  // ── Drop entry milestones ──────────────────────────────────────
  {
    id: "first_entry",
    title: "Enter your first drop",
    description: "Enter any active drop to start your Hunter journey.",
    xp: 50,
    type: "milestone",
    category: "drops",
    check: (s) => s.entryCount >= 1,
    progress: (s) => ({ current: Math.min(s.entryCount, 1), total: 1 }),
  },
  {
    id: "enter_5",
    title: "Enter 5 drops",
    description: "Show up consistently across the Based ecosystem.",
    xp: 100,
    type: "milestone",
    category: "drops",
    check: (s) => s.entryCount >= 5,
    progress: (s) => ({ current: Math.min(s.entryCount, 5), total: 5 }),
  },
  {
    id: "enter_25",
    title: "Enter 25 drops",
    description: "A dedicated Based Hunter.",
    xp: 250,
    type: "milestone",
    category: "drops",
    check: (s) => s.entryCount >= 25,
    progress: (s) => ({ current: Math.min(s.entryCount, 25), total: 25 }),
  },
  {
    id: "enter_50",
    title: "Enter 50 drops",
    description: "Elite participation — top tier.",
    xp: 500,
    type: "milestone",
    category: "drops",
    check: (s) => s.entryCount >= 50,
    progress: (s) => ({ current: Math.min(s.entryCount, 50), total: 50 }),
  },

  // ── Win milestones ─────────────────────────────────────────────
  {
    id: "first_win",
    title: "Win a drop",
    description: "Claim your first victory in a Based raffle.",
    xp: 200,
    type: "milestone",
    category: "drops",
    check: (s) => s.winCount >= 1,
    progress: (s) => ({ current: Math.min(s.winCount, 1), total: 1 }),
  },
  {
    id: "win_3",
    title: "Win 3 drops",
    description: "Triple winner — not just lucky.",
    xp: 300,
    type: "milestone",
    category: "drops",
    check: (s) => s.winCount >= 3,
    progress: (s) => ({ current: Math.min(s.winCount, 3), total: 3 }),
  },

  // ── Rank milestones ────────────────────────────────────────────
  {
    id: "rank_d",
    title: "Reach D-Rank",
    description: "Earn 300 XP to achieve D-Rank Hunter.",
    xp: 50,
    type: "milestone",
    category: "hunters",
    check: (s) => s.baseXp >= 300,
    progress: (s) => ({ current: Math.min(s.baseXp, 300), total: 300 }),
  },
  {
    id: "rank_c",
    title: "Reach C-Rank",
    description: "Earn 800 XP to achieve C-Rank Hunter.",
    xp: 100,
    type: "milestone",
    category: "hunters",
    check: (s) => s.baseXp >= 800,
    progress: (s) => ({ current: Math.min(s.baseXp, 800), total: 800 }),
  },
  {
    id: "rank_b",
    title: "Reach B-Rank",
    description: "Earn 2,000 XP to achieve B-Rank Hunter.",
    xp: 200,
    type: "milestone",
    category: "hunters",
    check: (s) => s.baseXp >= 2000,
    progress: (s) => ({ current: Math.min(s.baseXp, 2000), total: 2000 }),
  },
  {
    id: "rank_a",
    title: "Reach A-Rank",
    description: "Earn 5,000 XP to achieve A-Rank Hunter.",
    xp: 300,
    type: "milestone",
    category: "hunters",
    check: (s) => s.baseXp >= 5000,
    progress: (s) => ({ current: Math.min(s.baseXp, 5000), total: 5000 }),
  },

  // ── Daily ──────────────────────────────────────────────────────
  {
    id: "daily_entry",
    title: "Enter a drop today",
    description: "Enter at least one active drop to earn daily bonus XP.",
    xp: 15,
    type: "daily",
    category: "drops",
    check: (s) => s.enteredToday,
  },
];

async function buildStats(wallet: string, db: ReturnType<typeof createServerClient>): Promise<Stats> {
  const client = createPublicClient({ chain, transport: http(rpcUrl, { timeout: 8_000 }) });
  const w = wallet.toLowerCase();
  const today = new Date().toISOString().slice(0, 10); // YYYY-MM-DD

  const [entriesRes, winsRes, todayRes, idBal, hunterTok] = await Promise.all([
    db.from("entries").select("id", { count: "exact" }).eq("wallet_address", w).in("status", ["entered", "won", "lost"]),
    db.from("entries").select("id", { count: "exact" }).eq("wallet_address", w).eq("status", "won"),
    db.from("entries").select("id", { count: "exact" }).eq("wallet_address", w).gte("created_at", `${today}T00:00:00Z`),
    client.readContract({ address: BASED_ID_ADDRESS, abi: BASED_ID_ABI, functionName: "balanceOf", args: [wallet as `0x${string}`] }).catch(() => BigInt(0)),
    HUNTERS_ADDRESS !== "0x0000000000000000000000000000000000000000"
      ? client.readContract({ address: HUNTERS_ADDRESS, abi: HUNTERS_ABI, functionName: "tokenOf", args: [wallet as `0x${string}`] }).catch(() => BigInt(0))
      : Promise.resolve(BigInt(0)),
  ]);

  const xpRow = await db.from("hunter_xp").select("entries_xp, wins_xp, checkin_xp").eq("wallet_address", w).single();
  const baseXp = (xpRow.data?.entries_xp ?? 0) + (xpRow.data?.wins_xp ?? 0) + (xpRow.data?.checkin_xp ?? 0);

  return {
    holdsBasedId: (idBal as bigint) > BigInt(0),
    hasClaimed:   (hunterTok as bigint) > BigInt(0),
    entryCount:   entriesRes.count ?? 0,
    winCount:     winsRes.count   ?? 0,
    enteredToday: (todayRes.count ?? 0) > 0,
    baseXp,
  };
}

// GET /api/quests?wallet=0x...
export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const wallet = searchParams.get("wallet");
  if (!wallet) return Response.json({ error: "wallet required" }, { status: 400 });

  const db    = createServerClient();
  const stats = await buildStats(wallet, db);

  const { data: completions } = await db
    .from("quest_completions")
    .select("quest_id, period")
    .eq("wallet_address", wallet.toLowerCase());

  const claimedSet   = new Set<string>();
  const today        = new Date().toISOString().slice(0, 10);
  for (const c of completions ?? []) {
    if (c.period === "once") claimedSet.add(c.quest_id);
    if (c.period === today)  claimedSet.add(`${c.quest_id}:${today}`);
  }

  const quests: QuestWithStatus[] = QUESTS.map((q) => {
    const claimKey  = q.type === "daily" ? `${q.id}:${today}` : q.id;
    const isClaimed = claimedSet.has(claimKey);
    const isDone    = q.check(stats);
    let status: QuestStatus;

    if (isClaimed)      status = "claimed";
    else if (isDone)    status = "claimable";
    else                status = "in_progress";

    return {
      id:          q.id,
      title:       q.title,
      description: q.description,
      xp:          q.xp,
      type:        q.type,
      category:    q.category,
      status,
      progress:    q.progress ? q.progress(stats) : undefined,
    };
  });

  return Response.json({ quests, stats });
}

// POST /api/quests — claim a quest's XP
export async function POST(req: Request) {
  const { wallet, questId } = await req.json() as { wallet?: string; questId?: string };
  if (!wallet || !questId) return Response.json({ error: "wallet and questId required" }, { status: 400 });

  const quest = QUESTS.find(q => q.id === questId);
  if (!quest) return Response.json({ error: "Unknown quest" }, { status: 404 });

  const db    = createServerClient();
  const stats = await buildStats(wallet, db);
  const today = new Date().toISOString().slice(0, 10);
  const period = quest.type === "daily" ? today : "once";

  if (!quest.check(stats)) return Response.json({ error: "Quest condition not yet met" }, { status: 400 });

  // Attempt to insert (unique constraint prevents double-claim)
  const { error: insertErr } = await db.from("quest_completions").insert({
    wallet_address: wallet.toLowerCase(),
    quest_id: questId,
    earned_xp: quest.xp,
    period,
  });

  if (insertErr) {
    if (insertErr.code === "23505") return Response.json({ error: "Already claimed" }, { status: 409 });
    return Response.json({ error: insertErr.message }, { status: 500 });
  }

  const { data: xpRow } = await db
    .from("hunter_xp")
    .select("total_xp, entries_xp, wins_xp, checkin_xp, quest_xp")
    .eq("wallet_address", wallet.toLowerCase())
    .maybeSingle();

  const questXp = (xpRow?.quest_xp ?? 0) + quest.xp;
  const totalXp = (xpRow?.total_xp ?? 0) + quest.xp;

  // Upsert hunter_xp with the new quest and total XP
  await db.from("hunter_xp").upsert({
    wallet_address: wallet.toLowerCase(),
    entries_xp: xpRow?.entries_xp ?? 0,
    wins_xp: xpRow?.wins_xp ?? 0,
    checkin_xp: xpRow?.checkin_xp ?? 0,
    quest_xp: questXp,
    total_xp: totalXp,
    updated_at: new Date().toISOString(),
  }, { onConflict: "wallet_address" });

  return Response.json({ earned_xp: quest.xp, quest_xp: questXp, total_xp: totalXp });
}
