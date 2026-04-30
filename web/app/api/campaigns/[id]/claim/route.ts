import { createServerClient } from "@/lib/supabase";
import { isAddress } from "viem";

export const runtime = "nodejs";

const RANK_XP_THRESHOLDS = [0, 300, 800, 2000, 5000, 12000, 30000];
const RANK_MULTIPLIERS   = [1.0, 1.1, 1.25, 1.5, 1.75, 2.0, 2.5];

function xpToRank(xp: number): number {
  let rank = 0;
  for (let i = RANK_XP_THRESHOLDS.length - 1; i >= 0; i--) {
    if (xp >= RANK_XP_THRESHOLDS[i]) { rank = i; break; }
  }
  return rank;
}

// POST /api/campaigns/[id]/claim
// Body: { wallet_address: string }
export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const body = await req.json() as { wallet_address: string };

  if (!isAddress(body.wallet_address)) {
    return Response.json({ error: "Invalid wallet address" }, { status: 400 });
  }

  const db   = createServerClient();
  const addr = body.wallet_address.toLowerCase();

  const { data: campaign } = await db
    .from("campaigns")
    .select("*, tasks(*)")
    .eq("id", id)
    .single();

  if (!campaign) {
    return Response.json({ error: "Campaign not found" }, { status: 404 });
  }
  if (campaign.type !== "quest") {
    return Response.json({ error: "Claim is only available for quest campaigns" }, { status: 400 });
  }
  if (campaign.status !== "active" && campaign.status !== "ended") {
    return Response.json({ error: "Campaign is not claimable" }, { status: 400 });
  }

  const { data: entry } = await db
    .from("entries")
    .select("id")
    .eq("campaign_id", id)
    .eq("wallet_address", addr)
    .eq("status", "entered")
    .maybeSingle();

  if (!entry) {
    return Response.json({ error: "No qualifying entry found for this wallet" }, { status: 403 });
  }

  const { data: existingClaim } = await db
    .from("campaign_claims")
    .select("id")
    .eq("campaign_id", id)
    .eq("wallet_address", addr)
    .maybeSingle();

  if (existingClaim) {
    return Response.json({ error: "Already claimed" }, { status: 409 });
  }

  const requiredTaskIds = (campaign.tasks ?? []).map((t: { id: string }) => t.id);
  if (requiredTaskIds.length > 0) {
    const { data: completions } = await db
      .from("task_completions")
      .select("task_id")
      .eq("entry_id", entry.id);

    const completedIds = (completions ?? []).map((c: { task_id: string }) => c.task_id);
    const missing      = requiredTaskIds.filter((tid: string) => !completedIds.includes(tid));

    if (missing.length > 0) {
      return Response.json({
        error: "Not all tasks completed",
        missing_task_ids: missing,
      }, { status: 400 });
    }
  }

  const { data: xpRow } = await db
    .from("hunter_xp")
    .select("total_xp, entries_xp, wins_xp, checkin_xp, quest_xp")
    .eq("wallet_address", addr)
    .maybeSingle();

  const currentTotalXp = xpRow?.total_xp ?? 0;
  const rank           = xpToRank(currentTotalXp);
  const xpReward       = campaign.xp_reward ?? 0;
  const xpEarned       = Math.round(xpReward * RANK_MULTIPLIERS[rank]);

  const { error: claimErr } = await db
    .from("campaign_claims")
    .insert({ campaign_id: id, wallet_address: addr, xp_earned: xpEarned });

  if (claimErr) return Response.json({ error: claimErr.message }, { status: 500 });

  const newTotalXp = currentTotalXp + xpEarned;
  await db.from("hunter_xp").upsert({
    wallet_address: addr,
    entries_xp:     xpRow?.entries_xp  ?? 0,
    wins_xp:        xpRow?.wins_xp     ?? 0,
    checkin_xp:     xpRow?.checkin_xp  ?? 0,
    quest_xp:       xpRow?.quest_xp    ?? 0,
    total_xp:       newTotalXp,
    updated_at:     new Date().toISOString(),
  }, { onConflict: "wallet_address" });

  const newRank = xpToRank(newTotalXp);

  return Response.json({ xp_earned: xpEarned, total_xp: newTotalXp, rank: newRank });
}
