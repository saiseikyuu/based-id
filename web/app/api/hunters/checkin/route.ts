import { createServerClient } from "@/lib/supabase";
import { awardBadges } from "@/lib/badges";

export const runtime = "nodejs";

const CHECKIN_XP        = 5;
const STREAK_7_BONUS    = 20;
const STREAK_30_BONUS   = 75;

// POST /api/hunters/checkin — awards daily XP. Max once per 24h.
export async function POST(req: Request) {
  const { wallet } = await req.json() as { wallet?: string };
  if (!wallet) return Response.json({ error: "wallet required" }, { status: 400 });

  const db  = createServerClient();
  const now = new Date();

  const { data: row } = await db
    .from("hunter_xp")
    .select("*")
    .eq("wallet_address", wallet.toLowerCase())
    .single();

  if (!row) {
    return Response.json({ error: "Claim your Hunter first before checking in" }, { status: 400 });
  }

  // Check 24h cooldown
  if (row.last_checkin_at) {
    const last      = new Date(row.last_checkin_at);
    const hoursSince = (now.getTime() - last.getTime()) / 3600000;
    if (hoursSince < 20) { // allow check-in after 20h (not strict 24h to avoid timezone drift issues)
      const nextCheckin = new Date(last.getTime() + 20 * 3600000);
      return Response.json({
        error: "Already checked in today",
        nextCheckin: nextCheckin.toISOString(),
        hoursUntilNext: Math.ceil(20 - hoursSince),
      }, { status: 400 });
    }
  }

  // Calculate streak
  let streak = row.checkin_streak ?? 0;
  if (row.last_checkin_at) {
    const last     = new Date(row.last_checkin_at);
    const daysSince = Math.floor((now.getTime() - last.getTime()) / 86400000);
    streak = daysSince <= 2 ? streak + 1 : 1; // reset if missed >1 day
  } else {
    streak = 1;
  }

  // Calculate XP earned this check-in
  let earned = CHECKIN_XP;
  if (streak % 30 === 0) earned += STREAK_30_BONUS;
  else if (streak % 7 === 0) earned += STREAK_7_BONUS;

  const newCheckinXp = (row.checkin_xp ?? 0) + earned;
  const newTotalXp   = (row.total_xp ?? 0) + earned;

  await db.from("hunter_xp").update({
    checkin_xp:     newCheckinXp,
    total_xp:       newTotalXp,
    last_checkin_at: now.toISOString(),
    checkin_streak: streak,
    updated_at:     now.toISOString(),
  }).eq("wallet_address", wallet.toLowerCase());

  // Award badges and increment squad contribution XP (fire and forget)
  Promise.all([
    awardBadges(wallet.toLowerCase(), db),
    (async () => {
      const { data: membership } = await db
        .from("squad_members")
        .select("squad_id, contribution_xp")
        .eq("wallet_address", wallet.toLowerCase())
        .maybeSingle();
      if (membership) {
        await db.from("squad_members").update({
          contribution_xp: membership.contribution_xp + earned,
        }).eq("squad_id", membership.squad_id).eq("wallet_address", wallet.toLowerCase());
        await db.rpc("increment_squad_xp", { squad_id_param: membership.squad_id, amount: earned });
      }
    })(),
  ]).catch(() => {});

  return Response.json({
    success: true,
    earned,
    streak,
    bonus: earned > CHECKIN_XP ? earned - CHECKIN_XP : 0,
    newCheckinXp,
    newTotalXp,
    message: streak % 30 === 0
      ? `30-day streak! +${earned} XP`
      : streak % 7 === 0
      ? `7-day streak! +${earned} XP`
      : `+${earned} XP`,
  });
}
