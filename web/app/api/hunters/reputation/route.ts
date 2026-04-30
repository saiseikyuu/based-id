import { createServerClient } from "@/lib/supabase";

export const runtime = "nodejs";

// GET /api/hunters/reputation?wallet=0x...
// Computes and stores reputation score, returns score + breakdown
export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const wallet = searchParams.get("wallet")?.toLowerCase();
  if (!wallet) return Response.json({ error: "wallet required" }, { status: 400 });

  const db = createServerClient();

  const [
    { data: xpRow },
    { count: campaignCount },
    { count: bountyCount },
    { count: entryCount },
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

  // Based ID ownership (all hunters in hunter_xp hold a Based ID)
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

  // Platform entries proxy (×1, capped at 60 — Meme War entries added in Phase 2)
  const entryXp = Math.min((entryCount ?? 0), 60);
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

  await db.from("hunter_xp").update({
    reputation_score:     score,
    reputation_breakdown: breakdown,
    updated_at:           new Date().toISOString(),
  }).eq("wallet_address", wallet);

  return Response.json({ wallet, score, breakdown });
}
