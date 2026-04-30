import type { SupabaseClient } from "@supabase/supabase-js";

const RANK_THRESHOLDS = [0, 300, 800, 2000, 5000, 12000, 30000];

function getRankIdx(totalXp: number): number {
  let r = 0;
  for (let i = RANK_THRESHOLDS.length - 1; i >= 0; i--) {
    if (totalXp >= RANK_THRESHOLDS[i]) { r = i; break; }
  }
  return r;
}

// Call after any XP-earning event. Checks all badge criteria and inserts newly earned badges.
// Returns array of newly earned badge names (empty if none).
export async function awardBadges(
  wallet: string,
  db: SupabaseClient
): Promise<string[]> {
  const w = wallet.toLowerCase();

  const [
    { count: campaignCount },
    { data: xpRow },
    { count: bountyCount },
    { data: memberRow },
    { data: existingBadges },
    { data: allBadges },
  ] = await Promise.all([
    db.from("campaign_claims").select("*", { count: "exact", head: true }).eq("wallet_address", w),
    db.from("hunter_xp").select("checkin_streak, total_xp").eq("wallet_address", w).single(),
    db.from("bounty_submissions").select("*", { count: "exact", head: true })
      .eq("wallet_address", w).eq("status", "approved"),
    db.from("squad_members").select("role").eq("wallet_address", w).maybeSingle(),
    db.from("hunter_badges").select("badge_id").eq("wallet_address", w),
    db.from("badges").select("*"),
  ]);

  if (!allBadges?.length) return [];

  const alreadyEarned = new Set((existingBadges ?? []).map(b => b.badge_id));
  const streak  = xpRow?.checkin_streak ?? 0;
  const rankIdx = getRankIdx(xpRow?.total_xp ?? 0);

  const toAward: string[] = [];

  for (const badge of allBadges) {
    if (alreadyEarned.has(badge.id)) continue;

    let earned = false;
    switch (badge.criteria_type) {
      case "campaign_count": earned = (campaignCount ?? 0) >= badge.criteria_value; break;
      case "streak_days":    earned = streak >= badge.criteria_value; break;
      case "rank_reached":   earned = rankIdx >= badge.criteria_value; break;
      case "bounty_count":   earned = (bountyCount ?? 0) >= badge.criteria_value; break;
      case "squad_role":     earned = memberRow?.role === "owner"; break;
    }

    if (earned) toAward.push(badge.id);
  }

  if (toAward.length) {
    await db.from("hunter_badges").insert(
      toAward.map(badge_id => ({ wallet_address: w, badge_id }))
    );
  }

  return allBadges
    .filter(b => toAward.includes(b.id))
    .map(b => b.name);
}
